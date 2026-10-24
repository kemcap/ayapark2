BEGIN;SET LOCAL lock_timeout='2s';SET LOCAL statement_timeout='30s';
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
CREATE TEMP TABLE qa_timings(phase text,query_name text,iteration int,ms numeric);
GRANT SELECT,INSERT ON qa_timings TO authenticated;
CREATE FUNCTION pg_temp.bench(phase text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE q record;i int;started timestamptz;v jsonb;
BEGIN
 FOR q IN SELECT * FROM (VALUES ('workspace','select public.ay2_workspace((select id from public.site_sites where slug=''aya-park-2''))'),('review','select public.ay3_review_state((select id from public.site_sites where slug=''aya-park-2''))'),('summary','select public.ay3_financial_summary((select id from public.site_sites where slug=''aya-park-2''))'),('audit','select public.ay3_audit_page((select id from public.site_sites where slug=''aya-park-2''),10,0)')) t(name,sql) LOOP
  FOR i IN 1..5 LOOP started:=clock_timestamp();EXECUTE q.sql INTO v;INSERT INTO qa_timings VALUES(phase,q.name,i,extract(epoch from clock_timestamp()-started)*1000);END LOOP;
 END LOOP;
END;$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.site_staff_memberships where role='manager' order by created_at limit 1),'role','authenticated')::text,true); set local role authenticated;SELECT pg_temp.bench('before');RESET ROLE;-- Ayapark V3.15: read performance, no data edits or privilege expansion.
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
$function$;select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.site_staff_memberships where role='manager' order by created_at limit 1),'role','authenticated')::text,true); set local role authenticated;SELECT pg_temp.bench('after');RESET ROLE;SELECT phase,query_name,round(percentile_cont(0.5) within group(order by ms)::numeric,2) median_ms,round(min(ms),2) min_ms,round(max(ms),2) max_ms FROM qa_timings group by phase,query_name order by query_name,phase;ROLLBACK;