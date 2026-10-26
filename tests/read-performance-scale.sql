-- Synthetic fixtures in temporary tables only; no production table writes.
BEGIN;
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE qa_entries(id uuid PRIMARY KEY,site_id uuid,cents bigint,reversal_of uuid,description text);
CREATE TEMP TABLE qa_allocations(id uuid PRIMARY KEY,site_id uuid,entry_id uuid,cents bigint,void_reason text);
CREATE TEMP TABLE qa_credits(LIKE qa_allocations INCLUDING ALL);
CREATE TEMP TABLE qa_stages(id uuid PRIMARY KEY,site_id uuid,confirmed_charge uuid,ignored_reason text,cents bigint);
INSERT INTO qa_entries SELECT md5(i::text)::uuid,md5((i%2)::text||'site')::uuid,CASE WHEN i%3=0 THEN -1000 ELSE 1000 END,NULL,'fixture only' FROM generate_series(1,10000)i;
INSERT INTO qa_entries SELECT md5('r'||id)::uuid,site_id,-cents,id,'reversal fixture' FROM qa_entries WHERE right(id::text,1)='0';
INSERT INTO qa_allocations SELECT md5('a'||t.id||n)::uuid,site_id,t.id,50,CASE WHEN n%2=0 THEN 'void fixture' END FROM qa_entries t CROSS JOIN generate_series(1,3)n WHERE t.reversal_of IS NULL;
INSERT INTO qa_credits SELECT md5('c'||t.id||n)::uuid,site_id,t.id,25,CASE WHEN n%2=0 THEN 'void fixture' END FROM qa_entries t CROSS JOIN generate_series(1,2)n WHERE t.reversal_of IS NULL;
INSERT INTO qa_stages SELECT md5('s'||i)::uuid,md5((i%2)::text||'site')::uuid,CASE WHEN i%3=0 THEN md5('q'||i)::uuid END,CASE WHEN i%4=0 THEN 'ignored fixture' END,1000 FROM generate_series(1,40)i;
CREATE INDEX ON qa_allocations(entry_id);
CREATE INDEX ON qa_credits(entry_id);
CREATE INDEX ON qa_entries(reversal_of);
ANALYZE qa_entries; ANALYZE qa_allocations; ANALYZE qa_credits;ANALYZE qa_stages;
CREATE OR REPLACE FUNCTION pg_temp.qa_old_sources(s uuid)
 RETURNS TABLE(kind text, source_id uuid, fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT 'stage',t.id,md5(to_jsonb(t)::text) FROM pg_temp.qa_stages t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce((SELECT jsonb_agg(a ORDER BY a.id)::text FROM pg_temp.qa_allocations a WHERE a.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(c ORDER BY c.id)::text FROM pg_temp.qa_credits c WHERE c.entry_id=t.id),'[]')||coalesce((SELECT jsonb_agg(r ORDER BY r.id)::text FROM pg_temp.qa_entries r WHERE r.reversal_of=t.id),'[]'))
 FROM pg_temp.qa_entries t WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$
;
CREATE OR REPLACE FUNCTION pg_temp.qa_new_sources(s uuid)
RETURNS TABLE(kind text,source_id uuid,fingerprint text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $function$
 WITH allocations AS MATERIALIZED (
  SELECT a.entry_id,jsonb_agg(a ORDER BY a.id)::text payload
  FROM pg_temp.qa_allocations a WHERE a.site_id=s GROUP BY a.entry_id
 ), credits AS MATERIALIZED (
  SELECT c.entry_id,jsonb_agg(c ORDER BY c.id)::text payload
  FROM pg_temp.qa_credits c WHERE c.site_id=s GROUP BY c.entry_id
 ), reversals AS MATERIALIZED (
  SELECT r.reversal_of,jsonb_agg(r ORDER BY r.id)::text payload
  FROM pg_temp.qa_entries r WHERE r.site_id=s AND r.reversal_of IS NOT NULL GROUP BY r.reversal_of
 )
 SELECT 'stage',t.id,md5(to_jsonb(t)::text)
 FROM pg_temp.qa_stages t WHERE t.site_id=s AND t.confirmed_charge IS NULL AND t.ignored_reason IS NULL
 UNION ALL
 SELECT 'payment',t.id,md5(to_jsonb(t)::text||coalesce(a.payload,'[]')||coalesce(c.payload,'[]')||coalesce(r.payload,'[]'))
 FROM pg_temp.qa_entries t
 LEFT JOIN allocations a ON a.entry_id=t.id
 LEFT JOIN credits c ON c.entry_id=t.id
 LEFT JOIN reversals r ON r.reversal_of=t.id
 WHERE t.site_id=s AND t.cents>0 AND t.reversal_of IS NULL;
$function$;
CREATE TEMP TABLE qa_old AS SELECT * FROM pg_temp.qa_old_sources(md5('0site')::uuid) UNION ALL SELECT * FROM pg_temp.qa_old_sources(md5('1site')::uuid);
CREATE TEMP TABLE qa_new AS SELECT * FROM pg_temp.qa_new_sources(md5('0site')::uuid) UNION ALL SELECT * FROM pg_temp.qa_new_sources(md5('1site')::uuid);
DO $q$ BEGIN
 IF EXISTS((SELECT * FROM qa_old EXCEPT SELECT * FROM qa_new) UNION ALL (SELECT * FROM qa_new EXCEPT SELECT * FROM qa_old)) THEN RAISE EXCEPTION 'Fingerprint mismatch'; END IF;
 IF EXISTS(SELECT * FROM pg_temp.qa_new_sources(gen_random_uuid())) THEN RAISE EXCEPTION 'Other site leaked';END IF;
END;$q$;
SELECT (SELECT count(*) FROM qa_entries) entries,(SELECT count(*) FROM qa_allocations) allocations,(SELECT count(*) FROM qa_credits) credits,(SELECT count(*) FROM qa_new) compared_fingerprints,true identical;
ROLLBACK;
