-- Approved admin-only recovery of orphaned Auth accounts. Existing people, accounting and preferences are preserved.
-- Only the Edge Function service role can run the recovery RPCs.
ALTER TABLE public.ay3_invite_tokens
 ADD COLUMN IF NOT EXISTS recovery_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS recovery_approved_at timestamptz,
 ADD COLUMN IF NOT EXISTS recovery_approved_by uuid,
 ADD COLUMN IF NOT EXISTS recovery_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.ay_auth_claim_orphan_recovery(p_token_hash text, p_user uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE ticket public.ay3_invite_tokens%ROWTYPE;
BEGIN
 IF coalesce(p_token_hash,'')='' OR p_user IS NULL THEN RETURN false; END IF;
 SELECT * INTO ticket FROM public.ay3_invite_tokens
  WHERE token_hash=p_token_hash FOR UPDATE;
 IF NOT FOUND OR ticket.recovery_user_id IS DISTINCT FROM p_user
 OR ticket.recovery_approved_at IS NULL OR ticket.recovery_started_at IS NOT NULL
 OR ticket.consumed_at IS NOT NULL OR ticket.revoked_at IS NOT NULL OR ticket.expires_at<=now()
 OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=ticket.site_id AND user_id=ticket.recovery_approved_by AND role='manager')
 OR NOT EXISTS(SELECT 1 FROM public.ay3_persons
   WHERE id=ticket.person_id AND auth_user_id IS NULL AND archived_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.ay3_persons WHERE auth_user_id=p_user)
 OR EXISTS(SELECT 1 FROM public.site_resident_units WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM public.ayapark_admins WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM ay_auth_private.phone_contacts WHERE user_id=p_user AND active)
 OR NOT EXISTS(SELECT 1 FROM auth.users
   WHERE id=p_user AND deleted_at IS NULL
   AND lower(email)=lower(coalesce(ticket.email,'resident-'||substring(ticket.phone_e164 from 2)||'@ayapark2.invalid')))
 THEN RETURN false; END IF;
 UPDATE public.ay3_invite_tokens SET recovery_started_at=now() WHERE id=ticket.id;
 RETURN true;
END $function$
;

CREATE OR REPLACE FUNCTION public.ay_auth_orphan_candidate(p_actor uuid, p_person uuid, p_contact text, p_token_hash text DEFAULT NULL::text, p_approve boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 target public.ay3_persons%ROWTYPE;
 account auth.users%ROWTYPE;
 ticket public.ay3_invite_tokens%ROWTYPE;
 active_unit boolean;
 contact text:=lower(btrim(coalesce(p_contact,'')));
BEGIN
 IF p_actor IS NULL OR p_person IS NULL OR contact='' THEN
  RAISE EXCEPTION 'Invalid recovery request' USING ERRCODE='42501';
 END IF;
 SELECT * INTO target FROM public.ay3_persons WHERE id=p_person;
 IF NOT FOUND OR target.archived_at IS NOT NULL OR target.auth_user_id IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships
      WHERE user_id=p_actor AND site_id=target.site_id AND role='manager') THEN
   RAISE EXCEPTION 'Recovery unavailable' USING ERRCODE='42501';
 END IF;
 SELECT EXISTS(SELECT 1 FROM public.ay3_links l WHERE l.person_id=p_person
  AND l.site_id=target.site_id AND l.active AND l.archived_at IS NULL
  AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
  AND ay2_private.invitable_link(l)) INTO active_unit;
 IF NOT active_unit THEN RAISE EXCEPTION 'No current unit membership' USING ERRCODE='42501'; END IF;

 SELECT * INTO account FROM auth.users WHERE lower(email)=contact AND deleted_at IS NULL;
 IF NOT FOUND THEN
  IF EXISTS(SELECT 1 FROM auth.users WHERE lower(email)=contact) THEN
    RETURN jsonb_build_object('state','conflict');
  END IF;
  RETURN jsonb_build_object('state','new');
 END IF;

 -- No automatic takeover of a linked person, admin, tenant elsewhere or an active phone binding.
 IF EXISTS(SELECT 1 FROM public.ay3_persons WHERE auth_user_id=account.id)
 OR EXISTS(SELECT 1 FROM public.site_resident_units WHERE user_id=account.id)
 OR EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=account.id)
 OR EXISTS(SELECT 1 FROM public.ayapark_admins WHERE user_id=account.id)
 OR EXISTS(SELECT 1 FROM ay_auth_private.phone_contacts WHERE user_id=account.id AND active)
 OR account.banned_until > now()
 OR account.is_sso_user IS TRUE
 THEN RETURN jsonb_build_object('state','conflict'); END IF;

 IF p_approve IS TRUE THEN
   IF coalesce(p_token_hash,'')='' THEN RAISE EXCEPTION 'Invite hash required'; END IF;
   SELECT * INTO ticket FROM public.ay3_invite_tokens
    WHERE token_hash=p_token_hash AND person_id=p_person AND site_id=target.site_id
     AND issued_by=p_actor AND consumed_at IS NULL AND revoked_at IS NULL
     AND expires_at>now() FOR UPDATE;
   IF NOT FOUND OR lower(coalesce(ticket.email,
          'resident-'||substring(ticket.phone_e164 from 2)||'@ayapark2.invalid'))<>contact
   THEN RAISE EXCEPTION 'Invalid recovery invitation'; END IF;
   UPDATE public.ay3_invite_tokens SET recovery_user_id=account.id,
      recovery_approved_at=now(),recovery_approved_by=p_actor
     WHERE id=ticket.id;
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
    VALUES(target.site_id,p_actor,'orphan_recovery_approved',p_person,
       jsonb_build_object('invite_id',ticket.id));
 END IF;
 RETURN jsonb_build_object('state','recoverable','user_id',account.id);
END $function$
;

REVOKE ALL ON FUNCTION public.ay_auth_orphan_candidate(uuid,uuid,text,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.ay_auth_claim_orphan_recovery(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay_auth_orphan_candidate(uuid,uuid,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ay_auth_claim_orphan_recovery(text,uuid) TO service_role;
