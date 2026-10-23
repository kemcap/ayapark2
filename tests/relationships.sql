-- Isolated integration fixtures; no resident or accounting data is retained.
BEGIN;
CREATE TEMP TABLE qa_relationship_vars(k text PRIMARY KEY,v uuid);
CREATE TEMP TABLE qa_relationship_results(name text,passed boolean);
GRANT SELECT ON qa_relationship_vars TO authenticated;
GRANT SELECT,INSERT ON qa_relationship_results TO authenticated;
INSERT INTO qa_relationship_vars VALUES('actor',(SELECT user_id FROM public.site_staff_memberships WHERE role='manager' LIMIT 1)),('site',gen_random_uuid()),('block',gen_random_uuid());
INSERT INTO public.site_sites(id,slug,name) SELECT v,'qa-relationships-'||v,'QA transaction only' FROM qa_relationship_vars WHERE k='site';
INSERT INTO public.site_blocks(id,site_id,code) SELECT b.v,s.v,'A' FROM qa_relationship_vars b,qa_relationship_vars s WHERE b.k='block' AND s.k='site';
INSERT INTO public.site_units(site_id,block_id,number,code,occupancy_status) SELECT s.v,b.v,n,'A-'||n,'occupied' FROM qa_relationship_vars s,qa_relationship_vars b,generate_series(1,8) n WHERE s.k='site' AND b.k='block';
INSERT INTO public.site_staff_memberships(site_id,user_id,role) SELECT s.v,a.v,'manager' FROM qa_relationship_vars s,qa_relationship_vars a WHERE s.k='site' AND a.k='actor';
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid;a uuid;u uuid;o uuid;b uuid;t uuid;lid uuid;tid uuid;r jsonb;p jsonb;before_count int;charge uuid;failed boolean;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_relationship_vars WHERE k='site';SELECT v INTO a FROM pg_temp.qa_relationship_vars WHERE k='actor';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 r:=public.ay2_command(s,'person','{"first_name":"QA","last_name":"Owner"}');o:=(r->>'id')::uuid;
 r:=public.ay2_command(s,'person','{"first_name":"QA","last_name":"Buyer"}');b:=(r->>'id')::uuid;
 r:=public.ay2_command(s,'person','{"first_name":"QA","last_name":"Tenant"}');t:=(r->>'id')::uuid;
 FOR u IN SELECT id FROM public.site_units WHERE site_id=s AND number<>5 LOOP
  PERFORM public.ay2_command(s,'link',jsonb_build_object('unit_id',u,'person_id',o,'role','owner','starts_on','2022-01-01'));
 END LOOP;
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=1;
 SELECT id INTO lid FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner';
 r:=public.ay2_command(s,'charge',jsonb_build_object('unit_id',u,'link_id',lid,'category','Aidat','label','QA existing debt','cents',1000,'due_on','2026-10-01','payer','owner','reference','QA-preserved'));charge:=(r->>'id')::uuid;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','owner_to_tenant','link_id',lid,'expected',jsonb_build_array(lid,o,u,'owner','2022-01-01',null)::text,'effective_on','2026-11-01','person_id',b,'occupancy','occupied');
 r:=public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'seller remains tenant and buyer becomes owner',count(*)=2 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND starts_on='2026-11-01' AND ((person_id=o AND role='tenant') OR (person_id=b AND role='owner'));
 INSERT INTO pg_temp.qa_relationship_results SELECT 'previous ownership ends on day before transfer',ends_on='2026-10-31' FROM public.ay3_links WHERE id=lid;
 INSERT INTO pg_temp.qa_relationship_results SELECT 'existing debt keeps original person and link',person_id=o AND link_id=lid AND cents=1000 FROM public.ay2_charges WHERE id=charge;
 r:=public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'retry is idempotent',count(*)=3 AND coalesce((r->>'already_recorded')::boolean,false) FROM public.ay3_links WHERE site_id=s AND unit_id=u;
 INSERT INTO pg_temp.qa_relationship_results SELECT 'workspace includes future occupancy record',EXISTS(SELECT 1 FROM jsonb_array_elements(public.ay2_workspace(s)->'occupancy_changes') c WHERE c->>'unit_id'=u::text AND c->>'effective_on'='2026-11-01');
 -- Tenant collision must roll back every part, including a newly created buyer.
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=2;
 SELECT id INTO lid FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner';
 r:=public.ay2_command(s,'link',jsonb_build_object('unit_id',u,'person_id',t,'role','tenant','starts_on','2026-01-01'));tid:=(r->>'id')::uuid;
 SELECT count(*) INTO before_count FROM public.ay3_persons WHERE site_id=s;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','owner_to_tenant','link_id',lid,'expected',jsonb_build_array(lid,o,u,'owner','2022-01-01',null)::text,'effective_on','2026-11-01','new_person',true,'first_name','Rollback','last_name','Buyer','occupancy','occupied');
 failed:=false;BEGIN PERFORM public.ay2_command(s,'relationship_change',p);EXCEPTION WHEN raise_exception THEN failed:=sqlerrm='Bu dönemde çakışan bir kayıt var. Kiracı değişimi seçin veya tarihleri düzeltin.';END;
 INSERT INTO pg_temp.qa_relationship_results SELECT 'tenant conflict is specific and atomic',failed AND count(*)=before_count AND (SELECT ends_on IS NULL FROM public.ay3_links WHERE id=lid) AND NOT EXISTS(SELECT 1 FROM public.ay3_occupancy_changes WHERE unit_id=u) FROM public.ay3_persons WHERE site_id=s;
 -- Ownership change works with a continuing tenant and unknown historical start.
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','owner_change','link_id',lid,'expected',jsonb_build_array(lid,o,u,'owner','2022-01-01',null)::text,'effective_on','2026-11-01','person_id',b,'occupancy','keep');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'owner transfer keeps existing tenant',ends_on IS NULL AND person_id=t FROM public.ay3_links WHERE id=tid;
 -- Tenant replacement, then sale to the new tenant.
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','tenant_change','link_id',tid,'expected',jsonb_build_array(tid,t,u,'tenant','2026-01-01',null)::text,'effective_on','2026-12-01','person_id',o,'occupancy','occupied');
 r:=public.ay2_command(s,'relationship_change',p);tid:=(r->>'id')::uuid;
 SELECT id INTO lid FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner' AND ends_on IS NULL;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','tenant_to_owner','link_id',tid,'expected',jsonb_build_array(tid,o,u,'tenant','2026-12-01',null)::text,'owner_link_id',lid,'owner_expected',jsonb_build_array(lid,b,u,'owner','2026-11-01',null)::text,'effective_on','2027-01-01','occupancy','occupied');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'tenant purchase ends tenancy and prior ownership',(SELECT ends_on='2026-12-31' FROM public.ay3_links WHERE id=tid) AND (SELECT ends_on='2026-12-31' FROM public.ay3_links WHERE id=lid) AND EXISTS(SELECT 1 FROM public.ay3_links WHERE unit_id=u AND person_id=o AND role='owner' AND starts_on='2027-01-01');
 -- Correct erroneous role, preserve historical debtor.
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=3;
 r:=public.ay2_command(s,'link',jsonb_build_object('unit_id',u,'person_id',t,'role','representative','starts_on','2026-01-01'));tid:=(r->>'id')::uuid;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','correction','link_id',tid,'expected',jsonb_build_array(tid,t,u,'representative','2026-01-01',null)::text,'role','tenant','starts_on','2026-01-01','reason','Incorrect role','occupancy','keep');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'correction changes role and writes before snapshot',role='tenant' AND EXISTS(SELECT 1 FROM public.ay2_audit WHERE site_id=s AND action='relationship_change' AND details->>'request_id'=p->>'request_id' AND jsonb_array_length(details->'before')=2) FROM public.ay3_links WHERE id=tid;
 failed:=false;BEGIN PERFORM public.ay2_command(s,'relationship_change',p||jsonb_build_object('request_id',gen_random_uuid()));EXCEPTION WHEN raise_exception THEN failed:=sqlerrm='Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.';END;
 INSERT INTO pg_temp.qa_relationship_results VALUES('stale edit is rejected',failed);
 SELECT id INTO lid FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner';
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','correction','link_id',lid,'expected',jsonb_build_array(lid,o,u,'owner','2022-01-01',null)::text,'role','representative','starts_on','2022-01-01','reason','Invalid correction','occupancy','keep');
 failed:=false;BEGIN PERFORM public.ay2_command(s,'relationship_change',p);EXCEPTION WHEN raise_exception THEN failed:=true;END;
 INSERT INTO pg_temp.qa_relationship_results SELECT 'correction cannot remove required owner',failed AND role='owner' FROM public.ay3_links WHERE id=lid;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','moveout','link_id',tid,'expected',jsonb_build_array(tid,t,u,'tenant','2026-01-01',null)::text,'effective_on','2026-11-01','occupancy','vacant');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'future departure keeps dated occupancy history',ends_on='2026-10-31' AND EXISTS(SELECT 1 FROM public.ay3_occupancy_changes WHERE unit_id=u AND effective_on='2026-11-01' AND status='vacant') FROM public.ay3_links WHERE id=tid;
 PERFORM public.ay2_command(s,'occupancy',jsonb_build_object('unit_id',u,'status','occupied'));
 INSERT INTO pg_temp.qa_relationship_results SELECT 'manual occupancy also updates dated history',count(*)=1 FROM public.ay3_occupancy_changes WHERE unit_id=u AND effective_on=(now() at time zone 'Europe/Istanbul')::date AND status='occupied';
 -- New person and owner can be created together from either UI direction.
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=4;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','add','new_person',true,'first_name','Added','last_name','Representative','role','representative','effective_on','2026-11-01','occupancy','keep');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'new person and relationship are saved together',count(*)=1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id WHERE l.unit_id=u AND p.full_name='Added Representative' AND l.role='representative';
 -- A representative is a contact role and may be recorded before any owner history.
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=5;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','add','person_id',t,'role','representative','effective_on','2026-01-01','occupancy','keep');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'representative without owner succeeds',
   EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=t AND role='representative')
   AND NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner');
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','add','person_id',b,'role','tenant','effective_on','2026-01-01','occupancy','keep');
 failed:=false;BEGIN PERFORM public.ay2_command(s,'relationship_change',p);EXCEPTION WHEN raise_exception THEN failed:=true;END;
 INSERT INTO pg_temp.qa_relationship_results VALUES('tenant without owner still rejected',failed);
 -- Exact regression: tenant recorded from 09.10.2026 becomes a representative with unknown start.
 SELECT id INTO u FROM public.site_units WHERE site_id=s AND number=6;
 SELECT id INTO lid FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner';
 PERFORM public.ay2_command(s,'edit_link',jsonb_build_object('id',lid,'starts_on','2026-10-09'));
 r:=public.ay2_command(s,'link',jsonb_build_object('unit_id',u,'person_id',t,'role','tenant','starts_on','2026-10-09'));tid:=(r->>'id')::uuid;
 p:=jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'kind','correction','link_id',tid,'expected',jsonb_build_array(tid,t,u,'tenant','2026-10-09',null)::text,'role','representative','starts_on',null,'start_unknown',true,'ends_on',null,'reason','Correct representative role','occupancy','keep');
 PERFORM public.ay2_command(s,'relationship_change',p);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'tenant to representative with unknown start preserves owner',
   EXISTS(SELECT 1 FROM public.ay3_links WHERE id=tid AND role='representative' AND starts_on IS NULL)
   AND EXISTS(SELECT 1 FROM public.ay3_links WHERE id=lid AND role='owner' AND starts_on='2026-10-09' AND ends_on IS NULL);
 -- Site isolation and permission checks are enforced by the server.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 failed:=false;BEGIN PERFORM public.ay2_command(s,'relationship_change',p||jsonb_build_object('request_id',gen_random_uuid()));EXCEPTION WHEN insufficient_privilege THEN failed:=true;END;
 INSERT INTO pg_temp.qa_relationship_results VALUES('unrelated user cannot change relationships',failed);
 INSERT INTO pg_temp.qa_relationship_results SELECT 'unrelated user cannot read occupancy',count(*)=0 FROM public.ay3_occupancy_changes WHERE site_id=s;
END;$qa$;
RESET ROLE;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed IS TRUE),'results',jsonb_agg(to_jsonb(r))) FROM qa_relationship_results r;
ROLLBACK;
