-- Isolated clone only: prove the exposure, then verify the restrictive fix.
BEGIN;
CREATE TEMP TABLE qa_legacy(test text,passed boolean);
GRANT SELECT,INSERT ON qa_legacy TO anon,authenticated;
INSERT INTO public.ayapark_claims(id,amount,sort_order,person_kind,followup_kind) VALUES('QA-only',100,1,'M','general');
SET LOCAL ROLE anon;
INSERT INTO qa_legacy SELECT 'baseline exposes legacy claim to anonymous role',count(*)=1 FROM public.ayapark_claims;
RESET ROLE;
-- APPLY_RESTRICT_LEGACY_READS

SET LOCAL ROLE anon;
DO $qa$ DECLARE denied boolean:=false;BEGIN
 BEGIN PERFORM count(*) FROM public.ayapark_claims;EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 INSERT INTO qa_legacy VALUES('anonymous read denied after hardening',denied);
END;$qa$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $qa$ DECLARE s uuid:='20000000-0000-0000-0000-000000000001';BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 INSERT INTO qa_legacy SELECT 'manager retains legacy read',count(*)=1 FROM public.ayapark_claims;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
 INSERT INTO qa_legacy SELECT 'ordinary authenticated account sees zero claims',count(*)=0 FROM public.ayapark_claims;
 RESET ROLE;
 INSERT INTO public.site_staff_memberships(site_id,user_id,role) VALUES(s,'10000000-0000-0000-0000-000000000002','deputy');
 SET LOCAL ROLE authenticated;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
 INSERT INTO qa_legacy SELECT 'deputy without finance sees zero legacy claims',count(*)=0 FROM public.ayapark_claims;
 RESET ROLE;
 INSERT INTO public.ay2_permissions(site_id,user_id,capabilities) VALUES(s,'10000000-0000-0000-0000-000000000002',ARRAY['finance']);
 SET LOCAL ROLE authenticated;
 INSERT INTO qa_legacy SELECT 'deputy with finance retains legacy read',count(*)=1 FROM public.ayapark_claims;
 RESET ROLE;
 INSERT INTO public.ayapark_admins(user_id) VALUES('10000000-0000-0000-0000-000000000003');
 SET LOCAL ROLE authenticated;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
 INSERT INTO qa_legacy SELECT 'existing legacy administrator retains read',count(*)=1 FROM public.ayapark_claims;
 RESET ROLE;
 INSERT INTO qa_legacy SELECT 'legacy financial row unchanged',amount=100 AND id='QA-only' FROM public.ayapark_claims;
END;$qa$;
SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE passed IS TRUE),'results',jsonb_agg(to_jsonb(r))) FROM qa_legacy r;
ROLLBACK;
