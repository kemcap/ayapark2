-- Run via the administrative SQL connection. Every fixture is rolled back.
BEGIN;
CREATE TEMP TABLE qa_period_vars(k text PRIMARY KEY,v uuid);
CREATE TEMP TABLE qa_period_results(name text,passed boolean);
GRANT SELECT ON qa_period_vars TO authenticated;
GRANT SELECT,INSERT ON qa_period_results TO authenticated;
INSERT INTO qa_period_vars VALUES
 ('actor',(SELECT user_id FROM public.site_staff_memberships WHERE role='manager' LIMIT 1)),
 ('site',gen_random_uuid()),('block',gen_random_uuid()),('unit',gen_random_uuid());
INSERT INTO public.site_sites(id,slug,name) SELECT v,'qa-period-'||v,'QA transaction only' FROM qa_period_vars WHERE k='site';
INSERT INTO public.site_blocks(id,site_id,code) SELECT b.v,s.v,'A' FROM qa_period_vars b,qa_period_vars s WHERE b.k='block' AND s.k='site';
INSERT INTO public.site_units(id,site_id,block_id,number,code) SELECT u.v,s.v,b.v,1,'A-1' FROM qa_period_vars u,qa_period_vars s,qa_period_vars b WHERE u.k='unit' AND s.k='site' AND b.k='block';
INSERT INTO public.site_staff_memberships(site_id,user_id,role) SELECT s.v,a.v,'manager' FROM qa_period_vars s,qa_period_vars a WHERE s.k='site' AND a.k='actor';
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid;a uuid;u uuid;p jsonb;r jsonb;pid uuid;lid uuid;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_period_vars WHERE k='site';
 SELECT v INTO a FROM pg_temp.qa_period_vars WHERE k='actor';
 SELECT v INTO u FROM pg_temp.qa_period_vars WHERE k='unit';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 p:=jsonb_build_object('unit_id',u,'category','Aidat','label','QA period','cents',1000,'due_on','2026-10-01','payer','review','reference','QA-unbound','period_from','2026-10-01','period_to','2026-10-31');
 r:=public.ay2_command(s,'charge',p);
 INSERT INTO pg_temp.qa_period_results SELECT 'unbound charge keeps both period dates',period_from='2026-10-01'::date AND period_to='2026-10-31'::date AND person_id IS NULL FROM public.ay2_charges WHERE id=(r->>'id')::uuid;
 r:=public.ay2_command(s,'person',jsonb_build_object('first_name','QA','last_name','Owner'));pid:=(r->>'id')::uuid;
 r:=public.ay2_command(s,'link',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'person_id',pid,'role','owner','starts_on','2026-01-01'));lid:=(r->>'id')::uuid;
 r:=public.ay2_command(s,'charge',p||jsonb_build_object('reference','QA-bound','link_id',lid));
 INSERT INTO pg_temp.qa_period_results SELECT 'bound charge keeps dates and person',period_from='2026-10-01'::date AND period_to='2026-10-31'::date AND person_id=pid AND link_id=lid FROM public.ay2_charges WHERE id=(r->>'id')::uuid;
 r:=public.ay2_command(s,'charge',p||jsonb_build_object('reference','QA-empty','period_from',null,'period_to',null));
 INSERT INTO pg_temp.qa_period_results SELECT 'period remains optional when both dates omitted',period_from IS NULL AND period_to IS NULL FROM public.ay2_charges WHERE id=(r->>'id')::uuid;
 BEGIN
  PERFORM public.ay2_command(s,'charge',p||jsonb_build_object('reference','QA-reversed','period_from','2026-10-31','period_to','2026-10-01'));
  INSERT INTO pg_temp.qa_period_results VALUES('inverted dates rejected',false);
 EXCEPTION WHEN raise_exception THEN INSERT INTO pg_temp.qa_period_results VALUES('inverted dates rejected',true); END;
 BEGIN
  PERFORM public.ay2_command(s,'charge',p||jsonb_build_object('reference','QA-missing','period_to',null));
  INSERT INTO pg_temp.qa_period_results VALUES('incomplete period rejected',false);
 EXCEPTION WHEN raise_exception THEN INSERT INTO pg_temp.qa_period_results VALUES('incomplete period rejected',true); END;
 INSERT INTO pg_temp.qa_period_results SELECT 'invalid periods left no partial charge',count(*)=0 FROM public.ay2_charges WHERE site_id=s AND reference IN ('QA-reversed','QA-missing');
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 BEGIN
  PERFORM public.ay2_command(s,'charge',p||jsonb_build_object('reference','QA-denied'));
  INSERT INTO pg_temp.qa_period_results VALUES('unrelated user cannot create period charge',false);
 EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.qa_period_results VALUES('unrelated user cannot create period charge',true); END;
END;
$qa$;
RESET ROLE;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed IS TRUE),'results',jsonb_agg(to_jsonb(r))) FROM qa_period_results r;
ROLLBACK;
