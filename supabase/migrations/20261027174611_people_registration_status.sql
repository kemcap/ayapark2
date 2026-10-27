-- Narrow, authorized projection; no Auth contacts, hashes or invite secrets leave this function.
CREATE OR REPLACE FUNCTION ay2_private.person_access(s uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND ay2_private.can(s,'people')
 THEN coalesce((SELECT jsonb_object_agg(p.id,jsonb_build_object(
 'registered',coalesce(u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (coalesce(u.encrypted_password,'')<>'' OR u.last_sign_in_at IS NOT NULL) AND (u.email_confirmed_at IS NOT NULL OR u.phone_confirmed_at IS NOT NULL),false),
 'provisional',coalesce(u.id IS NOT NULL AND (coalesce(u.encrypted_password,'')='' OR (u.email_confirmed_at IS NULL AND u.phone_confirmed_at IS NULL)) AND u.last_sign_in_at IS NULL AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) AND NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=u.id),false),
 'invite_expires_at',(SELECT max(i.expires_at) FROM public.ay3_invite_tokens i
 WHERE i.site_id=s AND i.person_id=p.id AND i.consumed_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now())))
 FROM public.ay3_persons p LEFT JOIN auth.users u ON u.id=p.auth_user_id WHERE p.site_id=s),'{}'::jsonb)
 ELSE '{}'::jsonb END;
$$;
REVOKE ALL ON FUNCTION ay2_private.person_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.person_access(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay5_workspace(p_site uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
 result:=public.ay2_workspace(p_site);IF result IS NULL THEN RETURN NULL; END IF;
 result:=result||jsonb_build_object('exceptions',coalesce((SELECT jsonb_agg(x ORDER BY created_at DESC) FROM public.ay5_monthly_exceptions x WHERE site_id=p_site),'[]'::jsonb),'budget',(SELECT to_jsonb(x) FROM public.ay5_budget x WHERE site_id=p_site),'v5',true);
 IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('entries',ay2_private.ay5_payments(p_site)); END IF;
 result:=result||jsonb_build_object('person_access',ay2_private.person_access(p_site));
 RETURN result;
END; $function$;
