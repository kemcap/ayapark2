-- Personal preferences, explicit review receipts and safe access provisioning.
CREATE TABLE IF NOT EXISTS public.ay3_user_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ay3_user_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ay3_user_preferences FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ay3_user_preferences TO authenticated;
CREATE POLICY preferences_own ON public.ay3_user_preferences FOR ALL TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE OR REPLACE FUNCTION public.ay3_preferences(p_settings jsonb DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF p_settings IS NOT NULL THEN
  IF jsonb_typeof(p_settings)<>'object' OR p_settings-'palette'-'loader'-'font'-'contrast'-'density'-'motion'-'hideAmounts'-'language'-'theme'<>'{}'::jsonb
   OR NOT (p_settings->>'palette'=ANY(ARRAY['classic','ocean','slate','plum','sand']))
   OR NOT (p_settings->>'loader'=ANY(ARRAY['ring','dots','bar','pulse','wave']))
   OR NOT (p_settings->>'font'=ANY(ARRAY['normal','large','xlarge']))
   OR NOT (p_settings->>'contrast'=ANY(ARRAY['normal','high']))
   OR NOT (p_settings->>'density'=ANY(ARRAY['compact','comfortable']))
   OR NOT (p_settings->>'motion'=ANY(ARRAY['system','reduce']))
   OR NOT (p_settings->>'language'=ANY(ARRAY['de','tr']))
   OR NOT (p_settings->>'theme'=ANY(ARRAY['system','light','dark']))
   OR jsonb_typeof(p_settings->'hideAmounts') IS DISTINCT FROM 'boolean'
   OR (SELECT count(*) FROM jsonb_object_keys(p_settings))<>10 THEN RAISE EXCEPTION 'Invalid preferences'; END IF;
  INSERT INTO public.ay3_user_preferences(user_id,settings) VALUES(auth.uid(),p_settings)
  ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,updated_at=now();
 END IF;
 SELECT settings INTO v FROM public.ay3_user_preferences WHERE user_id=auth.uid();RETURN coalesce(v,'{}'::jsonb);
END;$$;
REVOKE ALL ON FUNCTION public.ay3_preferences(jsonb) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.ay3_preferences(jsonb) TO authenticated;

CREATE TABLE public.ay3_review_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),site_id uuid NOT NULL REFERENCES public.site_sites(id),
 unit_id uuid NOT NULL REFERENCES public.site_units(id),kind text NOT NULL CHECK(kind IN ('stage','payment')),
 source_id uuid NOT NULL,fingerprint text NOT NULL,actor uuid NOT NULL REFERENCES auth.users(id),reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(site_id,unit_id,kind,source_id,fingerprint)
);
CREATE INDEX ay3_review_receipts_unit_idx ON public.ay3_review_receipts(unit_id);
CREATE INDEX ay3_review_receipts_actor_idx ON public.ay3_review_receipts(actor);
ALTER TABLE public.ay3_review_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ay3_review_receipts FROM anon,authenticated;
GRANT SELECT ON public.ay3_review_receipts TO authenticated;
CREATE POLICY review_read ON public.ay3_review_receipts FOR SELECT TO authenticated USING(ay2_private.can(site_id,'finance'));
CREATE OR REPLACE FUNCTION ay2_private.review_sources(s uuid) RETURNS TABLE(kind text,source_id uuid,fingerprint text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT 'stage',t.id,md5(to_jsonb(t)::text) FROM public.ay2_staged_charges t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce((SELECT jsonb_agg(a ORDER BY a.id)::text FROM public.ay2_allocations a WHERE a.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(c ORDER BY c.id)::text FROM public.ay3_credits c WHERE c.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(r ORDER BY r.id)::text FROM public.ay2_entries r WHERE r.reversal_of=t.id),'[]'))
 FROM public.ay2_entries t WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$$;
REVOKE ALL ON FUNCTION ay2_private.review_sources(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION ay2_private.review_sources(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay3_review_state(p_site uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.can(p_site,'finance') THEN RETURN jsonb_build_object('sources','[]'::jsonb,'receipts','[]'::jsonb);END IF;
 RETURN jsonb_build_object('sources',coalesce((SELECT jsonb_agg(t) FROM ay2_private.review_sources(p_site) t),'[]'::jsonb),'receipts',coalesce((SELECT jsonb_agg(t ORDER BY reviewed_at DESC) FROM public.ay3_review_receipts t WHERE site_id=p_site),'[]'::jsonb));
END;$$;
REVOKE ALL ON FUNCTION public.ay3_review_state(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.ay3_review_state(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION ay2_private.review_selected(s uuid,items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb;f text;uid uuid;sid uuid;affected uuid;total integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'finance') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(items)<>'array' OR jsonb_array_length(items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Select 1 to 100 items';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  uid:=(item->>'unit_id')::uuid;sid:=(item->>'source_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=uid AND site_id=s) THEN RAISE EXCEPTION 'Invalid apartment';END IF;
  SELECT fingerprint INTO f FROM ay2_private.review_sources(s) WHERE kind=item->>'kind' AND source_id=sid;
  IF f IS NULL OR f IS DISTINCT FROM item->>'fingerprint' THEN RAISE EXCEPTION 'Kayıt değişti. Yenileyip tekrar kontrol edin.';END IF;
  INSERT INTO public.ay3_review_receipts(site_id,unit_id,kind,source_id,fingerprint,actor) VALUES(s,uid,item->>'kind',sid,f,auth.uid()) ON CONFLICT DO NOTHING RETURNING id INTO affected;
  IF affected IS NOT NULL THEN
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),'review_checked',affected,jsonb_build_object('kind',item->>'kind','source_id',sid,'unit_id',uid,'fingerprint',f));total:=total+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'count',total);
END;$$;
REVOKE ALL ON FUNCTION ay2_private.review_selected(uuid,jsonb) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION ay2_private.review_selected(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay3_review_selected(p_site uuid,p_items jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.review_selected(p_site,p_items); $$;
REVOKE ALL ON FUNCTION public.ay3_review_selected(uuid,jsonb) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.ay3_review_selected(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION ay2_private.staff_directory(s uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'admin') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',coalesce(p.full_name,nullif(u.raw_user_meta_data->>'full_name',''),''),'email',u.email) ORDER BY m.role,m.user_id)
 FROM public.site_staff_memberships m JOIN auth.users u ON u.id=m.user_id LEFT JOIN LATERAL(SELECT full_name FROM public.ay3_persons WHERE site_id=s AND auth_user_id=m.user_id ORDER BY created_at,id LIMIT 1) p ON true WHERE m.site_id=s),'[]'::jsonb);
END;$$;
REVOKE ALL ON FUNCTION ay2_private.staff_directory(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION ay2_private.staff_directory(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay3_staff_directory(p_site uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.staff_directory(p_site); $$;
REVOKE ALL ON FUNCTION public.ay3_staff_directory(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.ay3_staff_directory(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay3_audit_page(p_site uuid,p_limit integer DEFAULT 10,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';END IF;
 IF p_limit NOT IN (10,50,100) OR p_offset<0 THEN RAISE EXCEPTION 'Invalid page';END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM public.ay2_audit WHERE site_id=p_site),'rows',coalesce((SELECT jsonb_agg(t ORDER BY id DESC) FROM (SELECT * FROM public.ay2_audit WHERE site_id=p_site ORDER BY id DESC LIMIT p_limit OFFSET p_offset) t),'[]'::jsonb));
END;$$;
REVOKE ALL ON FUNCTION public.ay3_audit_page(uuid,integer,integer) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.ay3_audit_page(uuid,integer,integer) TO authenticated;
CREATE INDEX IF NOT EXISTS ay2_audit_site_page_idx ON public.ay2_audit(site_id,id DESC);
-- Fix the overescaped email pattern without weakening the actor/role checks.
DO $$DECLARE def text;BEGIN
 def:=pg_get_functiondef('ay2_private.access_target(uuid,uuid,text)'::regprocedure);
 def:=replace(def,chr(92)||chr(92)||'.','[.]');EXECUTE def;
 def:=pg_get_functiondef('public.ay3_provision_access(uuid,uuid,uuid,text)'::regprocedure);
 -- person_id references legacy site_people. Current identity is linked through ay3_persons.auth_user_id.
 def:=replace(def,'select unit_id,p_user,role,p.id,true','select unit_id,p_user,role,NULL,true');
 def:=replace(def,'do update set person_id=excluded.person_id,active=true','do update set active=true');EXECUTE def;
 -- Audit history is requested through a paged endpoint instead of transferred on every refresh.
 def:=pg_get_functiondef('public.ay2_workspace(uuid)'::regprocedure);
 def:=replace(def,$needle$'audit',coalesce((select jsonb_agg(t order by id desc) from (select * from public.ay2_audit where site_id=p_site order by id desc limit 100) t),'[]'::jsonb)$needle$,$replacement$'audit','[]'::jsonb$replacement$);EXECUTE def;
END;$$;
CREATE OR REPLACE FUNCTION ay2_private.prepare_access_person(p_actor uuid,s uuid,first_name text,last_name text,email text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ident uuid;em text:=lower(btrim(email));
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=s AND user_id=p_actor AND role='manager') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';END IF;
 IF length(btrim(first_name)) NOT BETWEEN 1 AND 75 OR length(btrim(last_name)) NOT BETWEEN 1 AND 75 OR length(em)>254 OR em !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Person or role incomplete';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT id INTO ident FROM public.ay3_persons p WHERE p.site_id=s AND lower(btrim(p.email))=em ORDER BY p.created_at,p.id LIMIT 1;
 IF ident IS NULL THEN
  INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,email) VALUES(s,btrim(first_name),btrim(last_name),btrim(first_name)||' '||btrim(last_name),em) RETURNING id INTO ident;
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,p_actor,'person',ident,jsonb_build_object('source','user_access'));
 END IF;RETURN ident;
END;$$;
REVOKE ALL ON FUNCTION ay2_private.prepare_access_person(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION ay2_private.prepare_access_person(uuid,uuid,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.ay3_prepare_access_person(p_actor uuid,p_site uuid,p_first_name text,p_last_name text,p_email text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.prepare_access_person(p_actor,p_site,p_first_name,p_last_name,p_email); $$;
REVOKE ALL ON FUNCTION public.ay3_prepare_access_person(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION public.ay3_prepare_access_person(uuid,uuid,text,text,text) TO service_role;
