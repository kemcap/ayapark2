-- Additive resident invitations. Apply only after review; no historical finance changes.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE ay2_private.resident_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), person_id uuid NOT NULL REFERENCES public.ay3_persons(id),
 site_id uuid NOT NULL REFERENCES public.site_sites(id), user_id uuid NOT NULL REFERENCES auth.users(id),
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 mode text NOT NULL CHECK(mode IN ('email','manual')),
 status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','requested','approved','consumed','revoked')),
 units jsonb NOT NULL, email text NOT NULL, created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 request_hash text, comparison_code text, requested_at timestamptz, approved_by uuid REFERENCES auth.users(id),
 completed_at timestamptz, last_sent_at timestamptz, sends int NOT NULL DEFAULT 0, attempts int NOT NULL DEFAULT 0
);
CREATE INDEX resident_invites_person ON ay2_private.resident_invites(person_id,created_at DESC);
ALTER TABLE ay2_private.resident_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ay2_private.resident_invites FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA ay2_private TO service_role;
-- Privileged Auth lookup is kept outside the exposed schema. Only the checked
-- server endpoint can call it, with an actor ID verified via Auth.getUser().
CREATE FUNCTION ay2_private.resident_invite_target(actor uuid,person uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.ay3_persons; u uuid; eu uuid; mail text; links jsonb;
BEGIN
 SELECT * INTO p FROM public.ay3_persons WHERE id=person;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=p.site_id AND user_id=actor AND role='manager') THEN RAISE EXCEPTION 'access_denied';END IF;
 SELECT jsonb_agg(jsonb_build_object('unit_id',unit_id,'role',role) ORDER BY unit_id,role) INTO links FROM public.ay3_links WHERE person_id=p.id AND site_id=p.site_id AND active AND archived_at IS NULL AND role IN ('owner','tenant');
 IF links IS NULL THEN RAISE EXCEPTION 'apartment_required';END IF;
 mail:=lower(nullif(btrim(p.email),''));
 SELECT id INTO eu FROM auth.users WHERE lower(email)=mail;
 IF p.auth_user_id IS NOT NULL AND eu IS NOT NULL AND p.auth_user_id<>eu THEN RAISE EXCEPTION 'account_conflict';END IF;
 u:=coalesce(p.auth_user_id,eu);
 IF u IS NULL THEN SELECT id INTO u FROM auth.users WHERE email='resident-'||p.id::text||'@access.ayapark.invalid' AND raw_app_meta_data->>'ay_resident_person'=p.id::text;END IF;
 IF EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=u) OR EXISTS(SELECT 1 FROM public.ay3_persons WHERE id<>p.id AND site_id=p.site_id AND auth_user_id=u) THEN RAISE EXCEPTION 'account_conflict';END IF;
 IF p.auth_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_to_recordset(links) AS l(unit_id uuid,role text) WHERE NOT EXISTS(SELECT 1 FROM public.site_resident_units r WHERE r.user_id=u AND r.unit_id=l.unit_id AND r.role=l.role AND r.active)) THEN RAISE EXCEPTION 'existing_access_mismatch';END IF;
 RETURN jsonb_build_object('person_id',p.id,'site_id',p.site_id,'user_id',u,'email',mail,'units',links);
END;$$;
CREATE FUNCTION ay2_private.resident_invite_command(action text,p jsonb,actor uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i ay2_private.resident_invites; person public.ay3_persons; target jsonb; roles jsonb; uid uuid;
BEGIN
 IF action IN ('issue','status','approve','revoke') THEN
  SELECT * INTO person FROM public.ay3_persons WHERE id=(p->>'person_id')::uuid FOR UPDATE;
  IF person.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=person.site_id AND user_id=actor AND role='manager') THEN RAISE EXCEPTION 'access_denied';END IF;
  IF action='status' THEN
   SELECT * INTO i FROM ay2_private.resident_invites WHERE person_id=person.id ORDER BY created_at DESC,id DESC LIMIT 1;
   RETURN jsonb_build_object('status',CASE WHEN i.status IS NULL THEN CASE WHEN person.auth_user_id IS NULL THEN 'none' ELSE 'active' END WHEN i.status='consumed' THEN 'active' WHEN i.expires_at<=now() THEN 'expired' ELSE i.status END,'id',i.id,'mode',i.mode,'code',i.comparison_code,'requested_at',i.requested_at,'expires_at',i.expires_at);
  END IF;
  IF action='issue' THEN
   target:=ay2_private.resident_invite_target(actor,person.id);uid:=(p->>'user_id')::uuid;
   IF (target->>'user_id')::uuid IS DISTINCT FROM uid OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND lower(email)=lower(p->>'email')) OR (p->>'mode'='email' AND (target->>'email' IS NULL OR target->>'email'<>p->>'email')) THEN RAISE EXCEPTION 'account_conflict';END IF;
   IF p->>'mode'='manual' AND target->>'email' IS NOT NULL AND (SELECT lower(email) FROM auth.users WHERE id=uid)<>target->>'email' THEN RAISE EXCEPTION 'account_conflict';END IF;
   UPDATE ay2_private.resident_invites SET status='revoked' WHERE person_id=person.id AND status IN ('invited','requested','approved');
   INSERT INTO ay2_private.resident_invites(person_id,site_id,user_id,token_hash,mode,units,email,created_by) VALUES(person.id,person.site_id,uid,p->>'hash',p->>'mode',target->'units',p->>'email',actor) RETURNING * INTO i;
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(i.site_id,actor,'resident_invitation',person.id,jsonb_build_object('invitation_id',i.id,'mode',i.mode));
   RETURN jsonb_build_object('id',i.id,'expires_at',i.expires_at);
  END IF;
  SELECT * INTO i FROM ay2_private.resident_invites WHERE id=(p->>'id')::uuid AND person_id=person.id FOR UPDATE;
  IF action='revoke' THEN
   IF i.id IS NULL OR i.status='consumed' THEN RAISE EXCEPTION 'invalid_invitation';END IF;
   UPDATE ay2_private.resident_invites SET status='revoked' WHERE id=i.id;
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(i.site_id,actor,'resident_invitation_revoked',person.id,jsonb_build_object('invitation_id',i.id));
   RETURN jsonb_build_object('ok',true);
  END IF;
 ELSE
  SELECT * INTO i FROM ay2_private.resident_invites WHERE token_hash=p->>'hash';
  SELECT * INTO person FROM public.ay3_persons WHERE id=i.person_id FOR UPDATE;
  SELECT * INTO i FROM ay2_private.resident_invites WHERE token_hash=p->>'hash' FOR UPDATE;
 END IF;
 IF i.id IS NULL OR i.status IN ('consumed','revoked') OR i.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=i.site_id AND user_id=i.created_by AND role='manager') OR (person.auth_user_id IS NOT NULL AND person.auth_user_id<>i.user_id) OR EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=i.user_id) THEN RAISE EXCEPTION 'invalid_invitation';END IF;
 SELECT jsonb_agg(jsonb_build_object('unit_id',unit_id,'role',role) ORDER BY unit_id,role) INTO roles FROM public.ay3_links WHERE person_id=person.id AND site_id=i.site_id AND active AND archived_at IS NULL AND role IN ('owner','tenant');
 IF roles IS DISTINCT FROM i.units OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=i.user_id AND lower(email)=lower(i.email)) OR (i.mode='email' AND lower(btrim(person.email)) IS DISTINCT FROM i.email) THEN RAISE EXCEPTION 'assignment_changed';END IF;
 IF action='resolve' THEN RETURN jsonb_build_object('mode',i.mode,'status',i.status,'email',CASE WHEN i.mode='email' THEN left(i.email,1)||'•••@'||split_part(i.email,'@',2) ELSE NULL END);
 ELSIF action='request' THEN
  IF i.mode<>'manual' OR coalesce(p->>'request_hash','') !~ '^[a-f0-9]{64}$' OR coalesce(p->>'code','') !~ '^[A-F0-9]{8}$' THEN RAISE EXCEPTION 'invalid_request';END IF;
  IF i.status='invited' THEN UPDATE ay2_private.resident_invites SET request_hash=p->>'request_hash',comparison_code=p->>'code',requested_at=now(),status='requested' WHERE id=i.id;
  ELSIF i.request_hash IS DISTINCT FROM p->>'request_hash' THEN RAISE EXCEPTION 'request_already_pending';END IF;
  RETURN jsonb_build_object('ok',true);
 ELSIF action='approve' THEN
  IF i.mode<>'manual' OR i.status<>'requested' OR i.comparison_code IS DISTINCT FROM p->>'code' OR i.requested_at<now()-interval '30 minutes' OR coalesce(p->>'confirmed','false')<>'true' THEN RAISE EXCEPTION 'identity_check_required';END IF;
  UPDATE ay2_private.resident_invites SET status='approved',approved_by=actor WHERE id=i.id;
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(i.site_id,actor,'resident_identity_approved',person.id,jsonb_build_object('invitation_id',i.id));
  RETURN jsonb_build_object('ok',true);
 ELSIF action IN ('send','attempt') THEN
  IF i.mode<>'email' THEN RAISE EXCEPTION 'invalid_request';END IF;
  IF action='send' THEN
   IF i.sends>=5 OR i.last_sent_at>now()-interval '60 seconds' THEN RAISE EXCEPTION 'rate_limited';END IF;
   UPDATE ay2_private.resident_invites SET sends=sends+1,last_sent_at=now() WHERE id=i.id;
  ELSE
   IF i.attempts>=10 OR i.last_sent_at IS NULL THEN RAISE EXCEPTION 'rate_limited';END IF;
   UPDATE ay2_private.resident_invites SET attempts=attempts+1 WHERE id=i.id;
  END IF;
  RETURN jsonb_build_object('email',i.email,'user_id',i.user_id);
 ELSIF action IN ('ready','complete') THEN
  IF i.mode='manual' THEN
   IF i.status<>'approved' OR i.request_hash IS DISTINCT FROM p->>'request_hash' OR i.requested_at<now()-interval '30 minutes' OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=i.site_id AND user_id=i.approved_by AND role='manager') THEN RAISE EXCEPTION 'approval_required';END IF;
  ELSIF action='ready' THEN RAISE EXCEPTION 'email_verification_required';END IF;
  IF action='ready' THEN RETURN jsonb_build_object('email',i.email,'user_id',i.user_id);END IF;
  IF (p->>'user_id')::uuid IS DISTINCT FROM i.user_id THEN RAISE EXCEPTION 'identity_mismatch';END IF;
  IF i.mode='email' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=i.user_id AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'email_verification_required';END IF;
  -- Existing accounts retain all previous permissions; inactive memberships are
  -- never silently reactivated by enrollment.
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(i.units) AS l(unit_id uuid,role text) JOIN public.site_resident_units r ON r.unit_id=l.unit_id AND r.user_id=i.user_id AND r.role=l.role WHERE NOT r.active) THEN RAISE EXCEPTION 'existing_access_mismatch';END IF;
  UPDATE public.ay3_persons SET auth_user_id=i.user_id WHERE id=person.id AND (auth_user_id IS NULL OR auth_user_id=i.user_id);
  INSERT INTO public.site_resident_units(unit_id,user_id,role,active) SELECT l.unit_id,i.user_id,l.role,true FROM jsonb_to_recordset(i.units) AS l(unit_id uuid,role text) ON CONFLICT(unit_id,user_id,role) DO NOTHING;
  UPDATE ay2_private.resident_invites SET status='consumed',completed_at=now(),request_hash=NULL WHERE id=i.id;
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(i.site_id,coalesce(actor,i.user_id),'resident_activated',person.id,jsonb_build_object('invitation_id',i.id,'mode',i.mode));
  RETURN jsonb_build_object('ok',true);
 END IF;
 RAISE EXCEPTION 'invalid_request';
END;$$;
CREATE FUNCTION public.ay_resident_invite_target(p_actor uuid,p_person uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.resident_invite_target(p_actor,p_person); $$;
CREATE FUNCTION public.ay_resident_invite_command(p_action text,p_payload jsonb,p_actor uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.resident_invite_command(p_action,p_payload,p_actor); $$;
REVOKE ALL ON FUNCTION ay2_private.resident_invite_target(uuid,uuid),ay2_private.resident_invite_command(text,jsonb,uuid),public.ay_resident_invite_target(uuid,uuid),public.ay_resident_invite_command(text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.resident_invite_target(uuid,uuid),ay2_private.resident_invite_command(text,jsonb,uuid),public.ay_resident_invite_target(uuid,uuid),public.ay_resident_invite_command(text,jsonb,uuid) TO service_role;
COMMIT;
