BEGIN;
SET LOCAL lock_timeout='5s';
GRANT USAGE ON SCHEMA ay2_private TO service_role;
CREATE TABLE ay2_private.phone_invitations (
 person_id uuid PRIMARY KEY REFERENCES public.ay3_persons(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 approved_units jsonb NOT NULL,
 phone text NOT NULL CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 approved_by uuid NOT NULL REFERENCES auth.users(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 window_started_at timestamptz NOT NULL DEFAULT now(), last_sent_at timestamptz, sends int NOT NULL DEFAULT 0, attempts int NOT NULL DEFAULT 0,
 verified_at timestamptz, revoked_at timestamptz
);
ALTER TABLE ay2_private.phone_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ay2_private.phone_invitations FROM PUBLIC,anon,authenticated;
GRANT ALL ON ay2_private.phone_invitations TO service_role;
CREATE FUNCTION ay2_private.normal_phone(v text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN n ~ '^05[0-9]{9}$' THEN '+90'||substr(n,2) WHEN n ~ '^5[0-9]{9}$' THEN '+90'||n WHEN n ~ '^90[0-9]{10}$' THEN '+'||n WHEN n LIKE '00%' THEN '+'||substr(n,3) ELSE n END FROM (SELECT regexp_replace(btrim(coalesce(v,'')),'[[:space:]().-]','','g') n) x;
$$;
CREATE FUNCTION ay2_private.ay_phone_target(p_actor uuid,p_person uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.ay3_persons; n text; u uuid; eu uuid; pu uuid;
BEGIN
 SELECT * INTO p FROM public.ay3_persons WHERE id=p_person;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=p.site_id AND user_id=p_actor AND role='manager') THEN RAISE EXCEPTION 'access_denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE person_id=p.id AND site_id=p.site_id AND active AND archived_at IS NULL AND role IN ('owner','tenant')) THEN RAISE EXCEPTION 'apartment_required'; END IF;
 n:=ay2_private.normal_phone(p.phone);
 IF n !~ '^\+[1-9][0-9]{7,14}$' THEN RAISE EXCEPTION 'invalid_phone'; END IF;
 IF EXISTS(SELECT 1 FROM public.ay3_persons WHERE id<>p.id AND ay2_private.normal_phone(phone)=n AND auth_user_id IS DISTINCT FROM p.auth_user_id) THEN RAISE EXCEPTION 'phone_conflict'; END IF;
 SELECT id INTO eu FROM auth.users WHERE lower(email)=lower(nullif(btrim(p.email),''));
 SELECT id INTO pu FROM auth.users WHERE phone=ltrim(n,'+');
 u:=coalesce(p.auth_user_id,eu,pu);
 IF (p.auth_user_id IS NOT NULL AND eu IS NOT NULL AND p.auth_user_id<>eu) OR (pu IS NOT NULL AND pu IS DISTINCT FROM coalesce(p.auth_user_id,eu) AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=pu AND phone_confirmed_at IS NULL AND raw_app_meta_data->>'ay_phone_pending_person'=p.id::text)) THEN RAISE EXCEPTION 'account_conflict'; END IF;
 IF u IS NOT NULL AND (EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=u) OR EXISTS(SELECT 1 FROM auth.users WHERE id=u AND nullif(phone,'') IS NOT NULL AND phone<>ltrim(n,'+'))) THEN RAISE EXCEPTION 'account_conflict'; END IF;
 IF p.auth_user_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay3_links l WHERE l.person_id=p.id AND l.site_id=p.site_id AND l.active AND l.archived_at IS NULL AND l.role IN ('owner','tenant') AND NOT EXISTS(SELECT 1 FROM public.site_resident_units r WHERE r.unit_id=l.unit_id AND r.user_id=p.auth_user_id AND r.role=l.role AND r.active)) THEN RAISE EXCEPTION 'existing_access_mismatch'; END IF;
 RETURN jsonb_build_object('person_id',p.id,'phone',n,'user_id',u);
END;$$;
CREATE FUNCTION ay2_private.ay_phone_issue(p_actor uuid,p_person uuid,p_user uuid,p_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t jsonb;
BEGIN
 PERFORM 1 FROM public.ay3_persons WHERE id=p_person FOR UPDATE;
 t:=public.ay_phone_target(p_actor,p_person);
 IF (t->>'user_id')::uuid IS DISTINCT FROM p_user OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND phone=ltrim(t->>'phone','+')) THEN RAISE EXCEPTION 'account_conflict'; END IF;
 INSERT INTO ay2_private.phone_invitations(person_id,user_id,phone,token_hash,approved_by,approved_units) VALUES(p_person,p_user,t->>'phone',p_hash,p_actor,(SELECT jsonb_agg(jsonb_build_object('unit_id',unit_id,'role',role) ORDER BY unit_id,role) FROM public.ay3_links WHERE person_id=p_person AND active AND archived_at IS NULL AND role IN ('owner','tenant')))
 ON CONFLICT(person_id) DO UPDATE SET user_id=excluded.user_id,phone=excluded.phone,token_hash=excluded.token_hash,approved_by=excluded.approved_by,approved_units=excluded.approved_units,window_started_at=now(),expires_at=now()+interval '7 days',last_sent_at=NULL,sends=0,attempts=0,verified_at=NULL,revoked_at=NULL;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) SELECT site_id,p_actor,'phone_invitation',id,'{}'::jsonb FROM public.ay3_persons WHERE id=p_person;
 RETURN true;
END;$$;
CREATE FUNCTION ay2_private.ay_phone_invitation(p_hash text,p_action text,p_user uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i ay2_private.phone_invitations; p public.ay3_persons; n text;
BEGIN
 SELECT * INTO i FROM ay2_private.phone_invitations WHERE token_hash=p_hash FOR UPDATE;
 SELECT * INTO p FROM public.ay3_persons WHERE id=i.person_id;
 n:=ay2_private.normal_phone(p.phone);
 IF i.person_id IS NULL OR i.verified_at IS NOT NULL OR i.revoked_at IS NOT NULL OR i.expires_at<=now() OR i.phone IS DISTINCT FROM n OR (p.auth_user_id IS NOT NULL AND p.auth_user_id<>i.user_id) OR NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=p.site_id AND user_id=i.approved_by AND role='manager') OR NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=p.site_id AND person_id=p.id AND active AND archived_at IS NULL AND role IN ('owner','tenant')) OR EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=i.user_id) OR i.approved_units IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_object('unit_id',unit_id,'role',role) ORDER BY unit_id,role) FROM public.ay3_links WHERE person_id=p.id AND active AND archived_at IS NULL AND role IN ('owner','tenant')) THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 IF p_action='send' THEN
  IF i.sends>=6 OR i.last_sent_at>now()-interval '60 seconds' THEN RAISE EXCEPTION 'rate_limited'; END IF;
  UPDATE ay2_private.phone_invitations SET sends=sends+1,last_sent_at=now() WHERE person_id=i.person_id;
 ELSIF p_action='attempt' THEN
  IF i.attempts>=10 OR i.last_sent_at IS NULL THEN RAISE EXCEPTION 'rate_limited'; END IF;
  UPDATE ay2_private.phone_invitations SET attempts=attempts+1 WHERE person_id=i.person_id;
 ELSIF p_action='complete' THEN
  IF p_user IS DISTINCT FROM i.user_id OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND phone=ltrim(i.phone,'+') AND phone_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'identity_mismatch'; END IF;
  UPDATE public.ay3_persons SET phone=i.phone,auth_user_id=p_user WHERE id=p.id AND (auth_user_id IS NULL OR auth_user_id=p_user);
  INSERT INTO public.site_resident_units(unit_id,user_id,role,active)
  SELECT unit_id,p_user,role,true FROM public.ay3_links WHERE site_id=p.site_id AND person_id=p.id AND active AND archived_at IS NULL AND role IN ('owner','tenant')
  ON CONFLICT(unit_id,user_id,role) DO NOTHING;
  IF i.verified_at IS NULL THEN
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p.site_id,p_user,'phone_activation',p.id,'{}'::jsonb);
  END IF;
  UPDATE ay2_private.phone_invitations SET verified_at=coalesce(verified_at,now()) WHERE person_id=i.person_id;
 ELSIF p_action<>'resolve' THEN RAISE EXCEPTION 'invalid_request'; END IF;
 RETURN jsonb_build_object('phone',i.phone,'user_id',i.user_id);
END;$$;
-- Only service_role may reach the privileged private implementation. Caller identity
-- is checked by the Edge Function before forwarding the verified actor UUID.
CREATE FUNCTION public.ay_phone_target(p_actor uuid,p_person uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.ay_phone_target(p_actor,p_person); $$;
CREATE FUNCTION public.ay_phone_issue(p_actor uuid,p_person uuid,p_user uuid,p_hash text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.ay_phone_issue(p_actor,p_person,p_user,p_hash); $$;
CREATE FUNCTION public.ay_phone_invitation(p_hash text,p_action text,p_user uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.ay_phone_invitation(p_hash,p_action,p_user); $$;
REVOKE ALL ON FUNCTION ay2_private.ay_phone_target(uuid,uuid),ay2_private.ay_phone_issue(uuid,uuid,uuid,text),ay2_private.ay_phone_invitation(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.ay_phone_target(uuid,uuid),ay2_private.ay_phone_issue(uuid,uuid,uuid,text),ay2_private.ay_phone_invitation(text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.ay_phone_target(uuid,uuid),public.ay_phone_issue(uuid,uuid,uuid,text),public.ay_phone_invitation(text,text,uuid),ay2_private.normal_phone(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay_phone_target(uuid,uuid),public.ay_phone_issue(uuid,uuid,uuid,text),public.ay_phone_invitation(text,text,uuid),ay2_private.normal_phone(text) TO service_role;
CREATE FUNCTION public.ay_phone_revoke(p_actor uuid,p_person uuid) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM public.ay_phone_target(p_actor,p_person);
 UPDATE ay2_private.phone_invitations SET revoked_at=now() WHERE person_id=p_person;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) SELECT site_id,p_actor,'phone_invitation_revoked',id,'{}'::jsonb FROM public.ay3_persons WHERE id=p_person;
 RETURN true;
END;$$;
CREATE FUNCTION public.ay_phone_login(p_phone text,p_action text DEFAULT 'resolve') RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE i ay2_private.phone_invitations;
BEGIN
 SELECT v.* INTO i FROM ay2_private.phone_invitations v JOIN public.ay3_persons p ON p.id=v.person_id
 WHERE v.phone=p_phone AND v.verified_at IS NOT NULL AND v.revoked_at IS NULL AND p.auth_user_id=v.user_id AND ay2_private.normal_phone(p.phone)=v.phone
 AND NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=v.user_id)
 AND EXISTS(SELECT 1 FROM public.ay3_links WHERE person_id=p.id AND site_id=p.site_id AND active AND archived_at IS NULL AND role IN ('owner','tenant')) LIMIT 1 FOR UPDATE OF v;
 IF i.person_id IS NULL THEN RAISE EXCEPTION 'invalid_invitation'; END IF;
 IF i.window_started_at<now()-interval '24 hours' THEN
  UPDATE ay2_private.phone_invitations SET sends=0,attempts=0,window_started_at=now() WHERE person_id=i.person_id;
  i.sends:=0;i.attempts:=0;
 END IF;
 IF p_action='send' THEN
  IF i.sends>=6 OR i.last_sent_at>now()-interval '60 seconds' THEN RAISE EXCEPTION 'rate_limited'; END IF;
  UPDATE ay2_private.phone_invitations SET sends=sends+1,last_sent_at=now() WHERE person_id=i.person_id;
 ELSIF p_action='attempt' THEN
  IF i.attempts>=10 OR i.last_sent_at IS NULL THEN RAISE EXCEPTION 'rate_limited'; END IF;
  UPDATE ay2_private.phone_invitations SET attempts=attempts+1 WHERE person_id=i.person_id;
 ELSIF p_action<>'resolve' THEN RAISE EXCEPTION 'invalid_request';END IF;
 RETURN jsonb_build_object('phone',i.phone,'user_id',i.user_id);
END;$$;
REVOKE ALL ON FUNCTION public.ay_phone_login(text,text),public.ay_phone_revoke(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay_phone_login(text,text),public.ay_phone_revoke(uuid,uuid) TO service_role;
COMMIT;
