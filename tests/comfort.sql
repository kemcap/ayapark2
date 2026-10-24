-- All tests are synthetic and rolled back. No auth.users changes or emails.
BEGIN;
CREATE TEMP TABLE qa_comfort(k text PRIMARY KEY,v uuid);
CREATE TEMP TABLE qa_comfort_results(name text,passed boolean);
GRANT ALL ON qa_comfort,qa_comfort_results TO authenticated;
INSERT INTO qa_comfort VALUES('actor',(SELECT user_id FROM public.site_staff_memberships WHERE role='manager' LIMIT 1)),('site',gen_random_uuid()),('block',gen_random_uuid()),('unit',gen_random_uuid()),('stage',gen_random_uuid());
INSERT INTO public.site_sites(id,slug,name) SELECT v,'qa-comfort-'||v,'QA rolled-back comfort' FROM qa_comfort WHERE k='site';
INSERT INTO public.site_blocks(id,site_id,code) SELECT b.v,s.v,'A' FROM qa_comfort b,qa_comfort s WHERE b.k='block' AND s.k='site';
INSERT INTO public.site_units(id,site_id,block_id,number,code,occupancy_status) SELECT u.v,s.v,b.v,1,'A-1','vacant' FROM qa_comfort u,qa_comfort s,qa_comfort b WHERE u.k='unit' AND s.k='site' AND b.k='block';
INSERT INTO public.site_staff_memberships(site_id,user_id,role) SELECT s.v,a.v,'manager' FROM qa_comfort s,qa_comfort a WHERE s.k='site' AND a.k='actor';
INSERT INTO public.ay2_staged_charges(id,site_id,source,source_key,person_label,unit_hint,cents,as_of) SELECT t.v,s.v,'Synthetic','qa','QA Person','A-1',10000,'2026-10-01' FROM qa_comfort t,qa_comfort s WHERE t.k='stage' AND s.k='site';
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid;a uuid;u uuid;tid uuid;f text;items jsonb;before jsonb;r jsonb;denied boolean;settings jsonb;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_comfort WHERE k='site';SELECT v INTO a FROM pg_temp.qa_comfort WHERE k='actor';SELECT v INTO u FROM pg_temp.qa_comfort WHERE k='unit';SELECT v INTO tid FROM pg_temp.qa_comfort WHERE k='stage';
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 settings:='{"palette":"ocean","loader":"dots","font":"large","contrast":"high","density":"compact","motion":"reduce","hideAmounts":true,"language":"de","theme":"dark"}';
 r:=public.ay3_preferences(settings);INSERT INTO pg_temp.qa_comfort_results VALUES('preferences save and read',r=settings AND public.ay3_preferences()=settings);
 denied:=false;BEGIN PERFORM public.ay3_preferences(settings||'{"palette":"untrusted"}');EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('unknown preference rejected',denied);
 denied:=false;BEGIN PERFORM public.ay3_preferences(settings-'font');EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('incomplete preference rejected',denied);
 SELECT fingerprint INTO f FROM ay2_private.review_sources(s) WHERE source_id=tid;items:=jsonb_build_array(jsonb_build_object('unit_id',u,'kind','stage','source_id',tid,'fingerprint',f));
 SELECT to_jsonb(t) INTO before FROM public.ay2_staged_charges t WHERE id=tid;
 r:=public.ay3_review_selected(s,items);INSERT INTO pg_temp.qa_comfort_results VALUES('review records exactly one receipt',(r->>'count')::int=1);
 INSERT INTO pg_temp.qa_comfort_results SELECT 'review does not confirm, ignore or change debt source',to_jsonb(t)=before FROM public.ay2_staged_charges t WHERE id=tid;
 r:=public.ay3_review_selected(s,items);INSERT INTO pg_temp.qa_comfort_results VALUES('review retry is idempotent',(r->>'count')::int=0);
 INSERT INTO pg_temp.qa_comfort_results SELECT 'receipt records actor and timestamp',actor=a AND reviewed_at IS NOT NULL FROM public.ay3_review_receipts WHERE site_id=s;
 INSERT INTO pg_temp.qa_comfort_results SELECT 'review is audited',count(*)=1 FROM public.ay2_audit WHERE site_id=s AND action='review_checked';
 denied:=false;BEGIN PERFORM public.ay3_review_selected(s,jsonb_build_array(jsonb_build_object('unit_id',u,'kind','charge','source_id',tid,'fingerprint',f)));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('required correction cannot be bulk dismissed',denied);
 denied:=false;BEGIN PERFORM public.ay3_review_selected(s,jsonb_build_array(jsonb_build_object('unit_id',gen_random_uuid(),'kind','stage','source_id',tid,'fingerprint',f)));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('foreign apartment rejected',denied);
 r:=public.ay3_audit_page(s,10,0);INSERT INTO pg_temp.qa_comfort_results VALUES('audit defaults support true pagination',jsonb_array_length(r->'rows')=1 AND (r->>'total')::int=1);
 INSERT INTO pg_temp.qa_comfort_results VALUES('audit offset applies',jsonb_array_length(public.ay3_audit_page(s,10,10)->'rows')=0);
 denied:=false;BEGIN PERFORM public.ay3_audit_page(s,500,0);EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('audit page limit bounded',denied);
 INSERT INTO pg_temp.qa_comfort_results VALUES('staff directory available to manager',jsonb_array_length(public.ay3_staff_directory(s))=1);
END;$qa$;
RESET ROLE;
UPDATE public.ay2_staged_charges SET cents=cents+1 WHERE site_id=(SELECT v FROM qa_comfort WHERE k='site');
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid;a uuid;u uuid;tid uuid;old_f text;new_f text;denied boolean;before_count integer;
BEGIN
 SELECT v INTO s FROM pg_temp.qa_comfort WHERE k='site';SELECT v INTO a FROM pg_temp.qa_comfort WHERE k='actor';SELECT v INTO u FROM pg_temp.qa_comfort WHERE k='unit';SELECT v INTO tid FROM pg_temp.qa_comfort WHERE k='stage';
 SELECT fingerprint INTO old_f FROM public.ay3_review_receipts WHERE site_id=s;
 SELECT fingerprint INTO new_f FROM ay2_private.review_sources(s) WHERE source_id=tid;
 INSERT INTO pg_temp.qa_comfort_results VALUES('source changes invalidate previous receipt',old_f<>new_f);
 denied:=false;BEGIN PERFORM public.ay3_review_selected(s,jsonb_build_array(jsonb_build_object('unit_id',u,'kind','stage','source_id',tid,'fingerprint',old_f)));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('stale batch rejected',denied);
 SELECT count(*) INTO before_count FROM public.ay3_review_receipts WHERE site_id=s;
 denied:=false;BEGIN PERFORM public.ay3_review_selected(s,jsonb_build_array(jsonb_build_object('unit_id',u,'kind','stage','source_id',tid,'fingerprint',new_f),jsonb_build_object('unit_id',u,'kind','stage','source_id',gen_random_uuid(),'fingerprint','stale')));EXCEPTION WHEN raise_exception THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results SELECT 'mixed stale batch rolls back every selected item',denied AND count(*)=before_count FROM public.ay3_review_receipts WHERE site_id=s;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
 INSERT INTO pg_temp.qa_comfort_results SELECT 'other user cannot read preferences',count(*)=0 FROM public.ay3_user_preferences;
 denied:=false;BEGIN PERFORM public.ay3_review_selected(s,'[]');EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('unrelated user cannot confirm reviews',denied);
 denied:=false;BEGIN PERFORM public.ay3_staff_directory(s);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('staff directory protected',denied);
 denied:=false;BEGIN PERFORM public.ay3_audit_page(s);EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO pg_temp.qa_comfort_results VALUES('audit history protected',denied);
END;$qa$;
RESET ROLE;
-- Provisioning internals are service-only; use the existing actor identity only in this rolled-back synthetic site.
DO $qa$
DECLARE s uuid;a uuid;p uuid;em text;target jsonb;denied boolean;
BEGIN
 SELECT v INTO s FROM qa_comfort WHERE k='site';SELECT v INTO a FROM qa_comfort WHERE k='actor';SELECT email INTO em FROM auth.users WHERE id=a;
 p:=public.ay3_prepare_access_person(a,s,'QA','External',em);
 target:=public.ay3_access_target(a,p,'manager');
 INSERT INTO qa_comfort_results VALUES('normal email accepted for external access',target->>'email'=lower(em));
 PERFORM public.ay3_provision_access(a,p,a,'manager');
 INSERT INTO qa_comfort_results SELECT 'external management needs no apartment',auth_user_id=a AND NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE person_id=p) FROM public.ay3_persons WHERE id=p;
 INSERT INTO qa_comfort_results VALUES('external creation retry reuses person',public.ay3_prepare_access_person(a,s,'QA','External',em)=p);
 INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,active) VALUES(s,(SELECT v FROM qa_comfort WHERE k='unit'),p,'tenant',true);
 PERFORM public.ay3_provision_access(a,p,a,'manager');
 INSERT INTO qa_comfort_results SELECT 'linked access does not violate legacy person FK',count(*)=1 FROM public.site_resident_units WHERE unit_id=(SELECT v FROM qa_comfort WHERE k='unit') AND user_id=a AND person_id IS NULL;
 denied:=false;BEGIN PERFORM public.ay3_access_target(gen_random_uuid(),p,'deputy');EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO qa_comfort_results VALUES('external access still requires real manager',denied);
 INSERT INTO qa_comfort_results VALUES('anonymous cannot provision',NOT has_function_privilege('anon','public.ay3_provision_access(uuid,uuid,uuid,text)','EXECUTE'));
 INSERT INTO qa_comfort_results VALUES('authenticated cannot impersonate provisioning actor',NOT has_function_privilege('authenticated','public.ay3_prepare_access_person(uuid,uuid,text,text,text)','EXECUTE'));
END;$qa$;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed),'results',jsonb_agg(to_jsonb(r))) FROM qa_comfort_results r;
ROLLBACK;
