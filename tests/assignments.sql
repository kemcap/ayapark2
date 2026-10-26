-- Synthetic site only; all fixtures, finance records and test memberships roll back.
BEGIN;
CREATE TEMP TABLE qa_simple_vars(k text PRIMARY KEY,v uuid);
CREATE TEMP TABLE qa_simple_results(name text,passed boolean);
GRANT SELECT,INSERT ON qa_simple_vars TO authenticated;
GRANT SELECT,INSERT ON qa_simple_results TO authenticated;
INSERT INTO qa_simple_vars VALUES('actor',(SELECT user_id FROM public.site_staff_memberships WHERE role='manager' LIMIT 1)),('site',gen_random_uuid()),('block',gen_random_uuid());
INSERT INTO qa_simple_vars SELECT names.k,v FROM qa_simple_vars CROSS JOIN (VALUES('staff'),('resident')) names(k) WHERE qa_simple_vars.k='actor';
INSERT INTO public.site_sites(id,slug,name) SELECT v,'qa-simple-'||v,'QA rolled-back site' FROM qa_simple_vars WHERE k='site';
INSERT INTO public.site_blocks(id,site_id,code) SELECT b.v,s.v,'A' FROM qa_simple_vars b,qa_simple_vars s WHERE b.k='block' AND s.k='site';
INSERT INTO public.site_units(site_id,block_id,number,code,occupancy_status) SELECT s.v,b.v,n,'A-'||n,'vacant' FROM qa_simple_vars s,qa_simple_vars b,generate_series(1,10) n WHERE s.k='site' AND b.k='block';
INSERT INTO public.site_staff_memberships(site_id,user_id,role) SELECT s.v,a.v,'manager' FROM qa_simple_vars s,qa_simple_vars a WHERE s.k='site' AND a.k='actor';
INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,auth_user_id)
 SELECT s.v,'QA','Resident','QA Resident',r.v FROM qa_simple_vars s,qa_simple_vars r WHERE s.k='site' AND r.k='resident';
INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,active)
 SELECT p.site_id,u.id,p.id,'tenant',true FROM public.ay3_persons p JOIN public.site_units u ON u.site_id=p.site_id AND u.code='A-9' WHERE p.site_id=(SELECT v FROM qa_simple_vars WHERE k='site') AND p.full_name='QA Resident';
INSERT INTO public.site_resident_units(unit_id,user_id,role,person_id,active)
 SELECT unit_id,p.auth_user_id,'tenant',NULL,true FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id WHERE p.site_id=(SELECT v FROM qa_simple_vars WHERE k='site') AND p.full_name='QA Resident';
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid;actor uuid;staff uuid;resident uuid;u uuid;a1 uuid;pid uuid;pid2 uuid;lid uuid;ownerid uuid;rep uuid;r jsonb;p jsonb;before jsonb;charge uuid;entry uuid;count_before int;denied boolean;reason text;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_simple_vars WHERE k='site';SELECT v INTO actor FROM pg_temp.qa_simple_vars WHERE k='actor';SELECT v INTO staff FROM pg_temp.qa_simple_vars WHERE k='staff';SELECT v INTO resident FROM pg_temp.qa_simple_vars WHERE k='resident';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND code='A-7';SELECT id INTO a1 FROM public.site_units WHERE site_id=s AND code='A-1';
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'new_person',true,'first_name','QA','last_name','Tenant','role','tenant');
 r:=public.ay2_command(s,'assignment_add',p);lid:=(r->>'id')::uuid;SELECT person_id INTO pid FROM public.ay3_links WHERE id=lid;
 INSERT INTO pg_temp.qa_simple_results SELECT 'A-7 tenant without owner or dates',active AND starts_on IS NULL AND ends_on IS NULL FROM public.ay3_links WHERE id=lid;
 INSERT INTO pg_temp.qa_simple_results SELECT 'new person needs no contact fields',phone='' AND email='' FROM public.ay3_persons WHERE id=pid;
 r:=public.ay2_command(s,'assignment_add',p);
 INSERT INTO pg_temp.qa_simple_results SELECT 'retry does not duplicate person or role',count(*)=1 AND (r->>'already_recorded')::boolean FROM public.ay3_persons WHERE site_id=s AND full_name='QA Tenant';
 r:=public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'person_id',pid,'role','owner'));ownerid:=(r->>'id')::uuid;
 INSERT INTO pg_temp.qa_simple_results SELECT 'owner without dates and second role allowed',active AND starts_on IS NULL FROM public.ay3_links WHERE id=ownerid;
 r:=public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'new_person',true,'first_name','QA','last_name','Second','role','tenant'));SELECT person_id INTO pid2 FROM public.ay3_links WHERE id=(r->>'id')::uuid;
 PERFORM public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'person_id',pid2,'role','owner'));
 INSERT INTO pg_temp.qa_simple_results SELECT 'multiple owners and tenants accepted',count(*)=4 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND active;
 r:=public.ay2_command(s,'charge',jsonb_build_object('unit_id',u,'link_id',lid,'category','Aidat','label','QA protected debt','cents',10000,'due_on','2026-10-01','payer','tenant','reference','QA debt'));charge:=(r->>'id')::uuid;
 PERFORM public.ay2_command(s,'settings',jsonb_build_object('opening_date','2026-01-01','opening_cents',0));
 r:=public.ay2_command(s,'entry',jsonb_build_object('request_id',gen_random_uuid(),'date','2026-10-24','desc','QA payment','category','Aidat','cents',3000,'reference','QA entry'));entry:=(r->>'id')::uuid;
 PERFORM public.ay2_command(s,'allocate',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',entry,'charge_id',charge,'cents',1000));
 PERFORM public.ay2_command(s,'credit',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',entry,'unit_id',u,'person_id',pid,'cents',2000));
 SELECT jsonb_build_object('charge',(SELECT to_jsonb(t) FROM public.ay2_charges t WHERE id=charge),'entry',(SELECT to_jsonb(t) FROM public.ay2_entries t WHERE id=entry),'allocation',(SELECT jsonb_agg(t) FROM public.ay2_allocations t WHERE entry_id=entry),'credit',(SELECT jsonb_agg(t) FROM public.ay3_credits t WHERE entry_id=entry)) INTO before;
 PERFORM public.ay2_command(s,'assignment_edit',jsonb_build_object('request_id',gen_random_uuid(),'id',lid,'revision',1,'role','representative','additional_role','owner','first_name','QA','last_name','Tenant','phone','555','email','','notes','Updated note'));
 INSERT INTO pg_temp.qa_simple_results SELECT 'direct role edit archives original debt link',NOT active AND role='tenant' AND archive_reason='role_changed' FROM public.ay3_links WHERE id=lid;
 INSERT INTO pg_temp.qa_simple_results SELECT 'additional owner role is retained without duplication',count(*)=1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role='owner' AND active;
 INSERT INTO pg_temp.qa_simple_results SELECT 'contact and note edited centrally',phone='555' AND notes='Updated note' FROM public.ay3_persons WHERE id=pid;
 SELECT id INTO rep FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role='representative' AND active;
 PERFORM public.ay2_command(s,'assignment_edit',jsonb_build_object('request_id',gen_random_uuid(),'id',rep,'revision',1,'role','tenant','starts_on','2010-01-01','ends_on','2011-01-01'));
 INSERT INTO pg_temp.qa_simple_results SELECT 'past annotation does not disable current role',active AND ends_on='2011-01-01' FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role='tenant' AND active;
 -- All removal reasons are allowed; no date or free-text justification is mandatory.
 FOREACH reason IN ARRAY ARRAY['mistake','ended','other'] LOOP
  r:=public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',a1,'person_id',pid,'role','representative'));rep:=(r->>'id')::uuid;
  PERFORM public.ay2_command(s,'assignment_remove',jsonb_build_object('request_id',gen_random_uuid(),'id',rep,'revision',1,'reason',reason));
  INSERT INTO pg_temp.qa_simple_results SELECT 'A-1 wrong representative removed: '||reason,NOT active AND starts_on IS NULL AND ends_on IS NULL AND archived_at IS NOT NULL AND archive_reason=reason FROM public.ay3_links WHERE id=rep;
 END LOOP;
 PERFORM public.ay2_command(s,'assignment_restore',jsonb_build_object('request_id',gen_random_uuid(),'id',rep,'revision',2));
 INSERT INTO pg_temp.qa_simple_results SELECT 'restore retains archive and creates one current role',(SELECT NOT active FROM public.ay3_links WHERE id=rep) AND count(*)=1 FROM public.ay3_links WHERE site_id=s AND unit_id=a1 AND person_id=pid AND active;
 PERFORM public.ay2_command(s,'assignment_remove',jsonb_build_object('request_id',gen_random_uuid(),'id',ownerid,'reason','ended'));
 INSERT INTO pg_temp.qa_simple_results SELECT 'owner can be removed while tenants remain',NOT active FROM public.ay3_links WHERE id=ownerid;
 INSERT INTO pg_temp.qa_simple_results SELECT 'person and other unit/roles retained',EXISTS(SELECT 1 FROM public.ay3_persons WHERE id=pid) AND EXISTS(SELECT 1 FROM public.ay3_links WHERE person_id=pid AND unit_id=u AND active);
 INSERT INTO pg_temp.qa_simple_results SELECT 'financial records byte-identical',before=jsonb_build_object('charge',(SELECT to_jsonb(t) FROM public.ay2_charges t WHERE id=charge),'entry',(SELECT to_jsonb(t) FROM public.ay2_entries t WHERE id=entry),'allocation',(SELECT jsonb_agg(t) FROM public.ay2_allocations t WHERE entry_id=entry),'credit',(SELECT jsonb_agg(t) FROM public.ay3_credits t WHERE entry_id=entry));
 INSERT INTO pg_temp.qa_simple_results SELECT 'occupancy never changed',occupancy_status='vacant' AND NOT EXISTS(SELECT 1 FROM public.ay3_occupancy_changes WHERE site_id=s) FROM public.site_units WHERE id=u;
 INSERT INTO pg_temp.qa_simple_results SELECT 'removal and role-change history logged',count(*)>=4 FROM public.ay2_audit WHERE site_id=s AND action IN ('assignment_remove','assignment_edit') AND details->'before' IS NOT NULL;
 denied:=false;BEGIN PERFORM public.ay2_command(s,'assignment_edit',jsonb_build_object('request_id',gen_random_uuid(),'id',lid,'revision',1,'role','owner'));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_simple_results VALUES('stale edit rejected without data loss',denied);
 denied:=false;BEGIN PERFORM public.ay2_command(s,'assignment_remove',jsonb_build_object('request_id',gen_random_uuid(),'id',gen_random_uuid(),'reason','mistake'));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_simple_results VALUES('foreign or absent ID rejected',denied);
 INSERT INTO pg_temp.qa_simple_vars VALUES('person2',pid2),('unit1',a1);
END;$qa$;
RESET ROLE;
UPDATE public.site_staff_memberships SET role='deputy' WHERE site_id=(SELECT v FROM qa_simple_vars WHERE k='site');
INSERT INTO public.ay2_permissions(site_id,user_id,capabilities) SELECT s.v,a.v,ARRAY['people']::text[] FROM qa_simple_vars s,qa_simple_vars a WHERE s.k='site' AND a.k='actor';
SET LOCAL ROLE authenticated;
DO $staff$
DECLARE s uuid;a uuid;r jsonb;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_simple_vars WHERE k='site';SELECT v INTO a FROM pg_temp.qa_simple_vars WHERE k='actor';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 r:=public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',(SELECT v FROM pg_temp.qa_simple_vars WHERE k='unit1'),'person_id',(SELECT v FROM pg_temp.qa_simple_vars WHERE k='person2'),'role','representative'));
 INSERT INTO pg_temp.qa_simple_results VALUES('authorized management can assign people',coalesce((r->>'ok')::boolean,false));
 INSERT INTO pg_temp.qa_simple_vars VALUES('staff_assignment',(r->>'id')::uuid);
END;$staff$;
RESET ROLE;
DELETE FROM public.site_staff_memberships WHERE site_id=(SELECT v FROM qa_simple_vars WHERE k='site');
SET LOCAL ROLE authenticated;
DO $resident$
DECLARE s uuid;a uuid;denied boolean;p jsonb;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_simple_vars WHERE k='site';SELECT v INTO a FROM pg_temp.qa_simple_vars WHERE k='actor';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 denied:=false;BEGIN PERFORM public.ay2_command(s,'assignment_remove',jsonb_build_object('request_id',gen_random_uuid(),'id',(SELECT v FROM pg_temp.qa_simple_vars WHERE k='staff_assignment'),'reason','mistake'));EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO pg_temp.qa_simple_results VALUES('resident cannot modify assignments',denied);
 INSERT INTO pg_temp.qa_simple_results SELECT 'resident reads own role but not other unit roles',count(*)=1 FROM public.ay3_links WHERE site_id=s;
 INSERT INTO pg_temp.qa_simple_results SELECT 'resident workspace excludes management audit',jsonb_array_length(public.ay2_workspace(s)->'audit')=0;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 INSERT INTO pg_temp.qa_simple_results SELECT 'unrelated user sees no assignment data',count(*)=0 FROM public.ay3_links WHERE site_id=s;
 PERFORM set_config('request.jwt.claims','{}',true);
 denied:=false;BEGIN PERFORM public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid()));EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO pg_temp.qa_simple_results VALUES('anonymous cannot assign people',denied);
END;$resident$;
RESET ROLE;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed),'results',jsonb_agg(to_jsonb(r))) FROM qa_simple_results r;
ROLLBACK;
