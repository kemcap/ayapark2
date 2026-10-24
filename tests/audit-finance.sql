-- Isolated clone ONLY. Never run this fixture suite on production.
BEGIN;
SET LOCAL statement_timeout='15s';
CREATE TEMP TABLE qa_finance_result(test text,passed boolean);
GRANT SELECT,INSERT ON qa_finance_result TO authenticated;
INSERT INTO public.site_blocks(id,site_id,code) VALUES('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','A');
INSERT INTO public.site_units(id,site_id,block_id,number,code) VALUES('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',1,'A-1');
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE s uuid:='20000000-0000-0000-0000-000000000001';u uuid:='40000000-0000-0000-0000-000000000001';
 actor uuid:='10000000-0000-0000-0000-000000000001';resident uuid:='10000000-0000-0000-0000-000000000003';
 r jsonb; p jsonb; link uuid; person uuid; charge uuid; entry uuid; credit uuid; request uuid:=gen_random_uuid(); rejected boolean; val bigint; cat text;
BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
 PERFORM public.ay2_command(s,'settings','{"opening_date":"2026-01-01","opening_cents":0}');
 r:=public.ay2_command(s,'assignment_add',jsonb_build_object('request_id',gen_random_uuid(),'unit_id',u,'new_person',true,'first_name','QA','last_name','Tenant','role','tenant'));
 link:=(r->>'id')::uuid;SELECT person_id INTO person FROM public.ay3_links WHERE id=link;
 FOREACH cat IN ARRAY ARRAY['Aidat','Havuz','Demirbaş'] LOOP
  r:=public.ay2_command(s,'charge',jsonb_build_object('unit_id',u,'link_id',link,'category',cat,'label','QA category','cents',10000,'due_on','2026-10-01','payer','tenant','reference','qa:'||cat));
  INSERT INTO qa_finance_result SELECT cat||' debtor and amount preserved',cents=10000 AND person_id=person AND link_id=link FROM public.ay2_charges WHERE id=(r->>'id')::uuid;
 END LOOP;
 charge:=(r->>'id')::uuid;
 r:=public.ay2_command(s,'entry',jsonb_build_object('request_id',gen_random_uuid(),'date','2026-10-10','desc','QA income','category','Aidat','cents',15000));entry:=(r->>'id')::uuid;
 p:=jsonb_build_object('request_id',request,'entry_id',entry,'charge_id',charge,'cents',3000);
 r:=public.ay2_command(s,'allocate',p);
 INSERT INTO qa_finance_result SELECT 'partial payment leaves 7000',c.cents-sum(a.cents)=7000 FROM public.ay2_charges c JOIN public.ay2_allocations a ON a.charge_id=c.id WHERE c.id=charge GROUP BY c.cents;
 r:=public.ay2_command(s,'allocate',p);
 INSERT INTO qa_finance_result VALUES('allocation retry without credit idempotent',(r->>'already_recorded')::boolean);
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'allocate',p||'{"cents":3001}');EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 INSERT INTO qa_finance_result VALUES('same request with changed amount rejected',rejected);
 PERFORM public.ay2_command(s,'allocate',p||jsonb_build_object('request_id',gen_random_uuid(),'cents',7000));
 INSERT INTO qa_finance_result SELECT 'full payment leaves zero',c.cents-sum(a.cents)=0 FROM public.ay2_charges c JOIN public.ay2_allocations a ON a.charge_id=c.id WHERE c.id=charge GROUP BY c.cents;
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'allocate',p||jsonb_build_object('request_id',gen_random_uuid(),'cents',1));EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 INSERT INTO qa_finance_result VALUES('over-allocation rejected',rejected);
 r:=public.ay2_command(s,'credit',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',entry,'unit_id',u,'person_id',person,'cents',5000));credit:=(r->>'id')::uuid;
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'allocate',p);EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 INSERT INTO qa_finance_result VALUES('KNOWN BUG: allocation retry remains idempotent after credit',NOT rejected);
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'credit',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',entry,'unit_id',u,'person_id',person,'cents',1));EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 INSERT INTO qa_finance_result VALUES('payment cannot be consumed twice',rejected);
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'reverse',jsonb_build_object('id',entry,'reason','QA reversal'));EXCEPTION WHEN raise_exception THEN rejected:=true;END;
 INSERT INTO qa_finance_result VALUES('allocated/credited payment cannot be reversed',rejected);
 PERFORM public.ay2_command(s,'assignment_remove',jsonb_build_object('request_id',gen_random_uuid(),'id',link,'reason','ended','revision',1));
 INSERT INTO qa_finance_result SELECT 'archiving role preserves historical debtor',person_id=person AND link_id=link FROM public.ay2_charges WHERE id=charge;
 -- Separate unallocated income and reversal: cash net is unchanged, gross must agree.
 r:=public.ay2_command(s,'entry',jsonb_build_object('request_id',gen_random_uuid(),'date','2026-10-10','desc','QA reverse me','category','Aidat','cents',2000));
 PERFORM public.ay2_command(s,'reverse',jsonb_build_object('id',r->>'id','reason','QA reversal'));
 -- Keep this fixture independent of the date the suite is rerun.
 RESET ROLE;
 UPDATE public.ay2_entries SET booked_on='2026-10-11' WHERE site_id=s AND reversal_of=(r->>'id')::uuid;
 SET LOCAL ROLE authenticated;
 PERFORM public.ay2_command(s,'publish_report','{"period":"2026-10-01"}');
 INSERT INTO qa_finance_result SELECT 'published closing balance equals live summary',closing_cents=(public.ay3_financial_summary(s)->>'balance_cents')::bigint FROM public.ay2_reports WHERE site_id=s;
 INSERT INTO qa_finance_result SELECT 'KNOWN BUG: published gross income agrees with live summary',income_cents=(SELECT sum((v->>'income_cents')::bigint) FROM jsonb_array_elements(public.ay3_financial_summary(s)->'days') v) FROM public.ay2_reports WHERE site_id=s;
 -- Switch to a genuinely distinct unrelated identity.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',resident,'role','authenticated')::text,true);
 INSERT INTO qa_finance_result SELECT 'unrelated account sees no charges',count(*)=0 FROM public.ay2_charges;
 INSERT INTO qa_finance_result SELECT 'unrelated account gets no workspace',public.ay2_workspace(s) IS NULL;
 rejected:=false;BEGIN PERFORM public.ay2_command(s,'allocate',p);EXCEPTION WHEN insufficient_privilege THEN rejected:=true;WHEN raise_exception THEN rejected:=false;END;
 INSERT INTO qa_finance_result VALUES('KNOWN BUG: unrelated allocation rejected before finance details',rejected);
END;$qa$;
RESET ROLE;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed IS TRUE),'results',jsonb_agg(to_jsonb(r))) FROM qa_finance_result r;
ROLLBACK;
