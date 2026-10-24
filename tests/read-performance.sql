BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
-- Restore the reviewed baseline inside this transaction, then roll back everything.
CREATE OR REPLACE FUNCTION ay2_private.review_sources(s uuid)
 RETURNS TABLE(kind text, source_id uuid, fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT 'stage',t.id,md5(to_jsonb(t)::text) FROM public.ay2_staged_charges t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce((SELECT jsonb_agg(a ORDER BY a.id)::text FROM public.ay2_allocations a WHERE a.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(c ORDER BY c.id)::text FROM public.ay3_credits c WHERE c.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(r ORDER BY r.id)::text FROM public.ay2_entries r WHERE r.reversal_of=t.id),'[]'))
 FROM public.ay2_entries t WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$
;
ALTER POLICY ay2_entries_read ON public.ay2_entries USING (ay2_private.can(site_id, 'finance'::text));
ALTER POLICY ay2_audit_read ON public.ay2_audit USING (ay2_private.can(site_id, 'admin'::text));
ALTER POLICY review_read ON public.ay3_review_receipts USING (ay2_private.can(site_id, 'finance'::text));

CREATE TEMP TABLE qa_context AS SELECT id site_id FROM public.site_sites WHERE slug='aya-park-2';
CREATE TEMP TABLE qa_actors AS SELECT role||row_number() over(order by role,user_id)::text tag,user_id FROM public.site_staff_memberships WHERE site_id=(SELECT site_id FROM qa_context);
INSERT INTO qa_actors VALUES ('outsider',gen_random_uuid()),('anonymous',NULL);
CREATE TEMP TABLE qa_expected(tag text,item text,value jsonb);
CREATE TEMP TABLE qa_results(test text,passed boolean);
CREATE TEMP TABLE qa_hashes(tablename text PRIMARY KEY,digest text);
DO $q$ DECLARE t record;v text;BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]'')::text) FROM public.%I t',t.tablename) INTO v;
  INSERT INTO qa_hashes VALUES(t.tablename,v);
 END LOOP;
END;$q$;
GRANT SELECT ON qa_context,qa_actors TO authenticated;
GRANT SELECT,INSERT ON qa_expected,qa_results TO authenticated;
DO $q$ BEGIN EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated',(SELECT nspname FROM pg_namespace WHERE oid=pg_my_temp_schema())); END;$q$;
CREATE FUNCTION pg_temp.canonical(j jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
 SELECT jsonb_object_agg(key,CASE WHEN jsonb_typeof(value)='array' THEN coalesce((SELECT jsonb_agg(v ORDER BY v::text) FROM jsonb_array_elements(value) v),'[]') ELSE value END) FROM jsonb_each(j);
$$;
CREATE FUNCTION pg_temp.capture(s uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE j jsonb;v jsonb;
BEGIN
 j:=jsonb_build_object('workspace',pg_temp.canonical(public.ay2_workspace(s)),'review',pg_temp.canonical(public.ay3_review_state(s)),
 'entries',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.ay2_entries t),
 'audit_rows',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.ay2_audit t),
 'receipts',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY source_id),'[]') FROM public.ay3_review_receipts t),
 'charges',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.ay2_charges t),
 'persons',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM public.ay3_persons t));
 BEGIN v:=public.ay3_audit_page(s,10,0);EXCEPTION WHEN insufficient_privilege THEN v:=jsonb_build_object('error',SQLSTATE);END;
 j:=j||jsonb_build_object('audit_page',v);
 BEGIN v:=public.ay3_financial_summary(s);EXCEPTION WHEN insufficient_privilege THEN v:=jsonb_build_object('error',SQLSTATE);END;
 RETURN j||jsonb_build_object('summary',v);
END;$$;
DO $q$ DECLARE a record;j jsonb;kv record;s uuid;BEGIN
 SELECT site_id INTO s FROM qa_context;
 FOR a IN SELECT * FROM qa_actors LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a.user_id,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  j:=pg_temp.capture(s);
  RESET ROLE;
  FOR kv IN SELECT * FROM jsonb_each(j) LOOP INSERT INTO qa_expected VALUES(a.tag,kv.key,kv.value);END LOOP;
 END LOOP;
END;$q$;
-- Ayapark V3.15: read performance, no data edits or privilege expansion.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='20s';
DO $guard$
DECLARE p record;definition text;
BEGIN
 IF md5(pg_get_functiondef('ay2_private.review_sources(uuid)'::regprocedure)) NOT IN ('432bcf771aebdde919782d5999d4bcbc','2dcb94fe16f7115fdd00108d844340b8') THEN
  RAISE EXCEPTION 'review_sources changed since this migration was reviewed; rebase before applying';
 END IF;
 FOR p IN SELECT * FROM (VALUES
('ay2_entries','ay2_entries_read','ay2_private.can(site_id, ''finance''::text)','(site_id = ANY (( SELECT COALESCE(array_agg(s.id), ''{}''::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, ''finance''::text))::uuid[]))'),
('ay2_audit','ay2_audit_read','ay2_private.can(site_id, ''admin''::text)','(site_id = ANY (( SELECT COALESCE(array_agg(s.id), ''{}''::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, ''admin''::text))::uuid[]))'),
('ay3_review_receipts','review_read','ay2_private.can(site_id, ''finance''::text)','(site_id = ANY (( SELECT COALESCE(array_agg(s.id), ''{}''::uuid[]) AS "coalesce"
   FROM site_sites s
  WHERE ay2_private.can(s.id, ''finance''::text))::uuid[]))')
 ) expected(table_name,policy_name,old_qual,new_qual) LOOP
  SELECT qual INTO definition FROM pg_policies WHERE schemaname='public' AND tablename=p.table_name AND policyname=p.policy_name;
  IF definition IS NULL OR definition NOT IN(p.old_qual,p.new_qual) THEN RAISE EXCEPTION 'Policy % changed; rebase before applying',p.policy_name;END IF;
 END LOOP;
END;$guard$;

ALTER POLICY ay2_entries_read ON public.ay2_entries USING (site_id = ANY ((SELECT coalesce(array_agg(s.id),'{}'::uuid[]) FROM public.site_sites s WHERE ay2_private.can(s.id,'finance'))::uuid[]));
ALTER POLICY ay2_audit_read ON public.ay2_audit USING (site_id = ANY ((SELECT coalesce(array_agg(s.id),'{}'::uuid[]) FROM public.site_sites s WHERE ay2_private.can(s.id,'admin'))::uuid[]));
ALTER POLICY review_read ON public.ay3_review_receipts USING (site_id = ANY ((SELECT coalesce(array_agg(s.id),'{}'::uuid[]) FROM public.site_sites s WHERE ay2_private.can(s.id,'finance'))::uuid[]));
CREATE OR REPLACE FUNCTION ay2_private.review_sources(s uuid)
RETURNS TABLE(kind text,source_id uuid,fingerprint text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
 WITH allocations AS MATERIALIZED (
  SELECT a.entry_id,jsonb_agg(a ORDER BY a.id)::text payload
  FROM public.ay2_allocations a WHERE a.site_id=s GROUP BY a.entry_id
 ), credits AS MATERIALIZED (
  SELECT c.entry_id,jsonb_agg(c ORDER BY c.id)::text payload
  FROM public.ay3_credits c WHERE c.site_id=s GROUP BY c.entry_id
 ), reversals AS MATERIALIZED (
  SELECT r.reversal_of,jsonb_agg(r ORDER BY r.id)::text payload
  FROM public.ay2_entries r WHERE r.site_id=s AND r.reversal_of IS NOT NULL GROUP BY r.reversal_of
 )
 SELECT 'stage',t.id,md5(to_jsonb(t)::text)
 FROM public.ay2_staged_charges t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce(a.payload,'[]')||coalesce(c.payload,'[]')||coalesce(r.payload,'[]'))
 FROM public.ay2_entries t
 LEFT JOIN allocations a ON a.entry_id=t.id
 LEFT JOIN credits c ON c.entry_id=t.id
 LEFT JOIN reversals r ON r.reversal_of=t.id
 WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$;
DO $q$ DECLARE a record;j jsonb;kv record;s uuid;v text;t record;BEGIN
 SELECT site_id INTO s FROM qa_context;
 FOR a IN SELECT * FROM qa_actors LOOP
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a.user_id,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  j:=pg_temp.capture(s);
  RESET ROLE;
  FOR kv IN SELECT * FROM jsonb_each(j) LOOP
   INSERT INTO qa_results SELECT a.tag||': '||kv.key||' unchanged',e.value IS NOT DISTINCT FROM kv.value FROM qa_expected e WHERE e.tag=a.tag AND e.item=kv.key;
  END LOOP;
  IF a.tag IN ('anonymous','outsider') THEN
   INSERT INTO qa_results VALUES(a.tag||': protected data denied',j->'entries'='[]'::jsonb AND j->'audit_rows'='[]'::jsonb AND j->'receipts'='[]'::jsonb AND j->'workspace'='null'::jsonb AND j->'summary'->>'error'='42501');
  END IF;
 END LOOP;
 FOR t IN SELECT * FROM qa_hashes LOOP
  EXECUTE format('SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]'')::text) FROM public.%I t',t.tablename) INTO v;
  INSERT INTO qa_results VALUES(t.tablename||': production rows unchanged',v=t.digest);
 END LOOP;
 IF EXISTS(SELECT 1 FROM qa_results WHERE NOT coalesce(passed,false)) THEN RAISE EXCEPTION 'Read performance regression: %',(SELECT string_agg(test,', ') FROM qa_results WHERE NOT coalesce(passed,false));END IF;
END;$q$;
SELECT count(*) assertions,bool_and(passed) all_passed FROM qa_results;
ROLLBACK;