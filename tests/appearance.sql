-- Only existing actor's own preferences, rolled back; no auth/account or finance changes.
BEGIN;
DO $$BEGIN PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT user_id FROM public.site_staff_memberships WHERE role='manager' LIMIT 1),'role','authenticated')::text,true);END;$$;
SET LOCAL ROLE authenticated;
DO $$DECLARE p text;c text;v jsonb;BEGIN
 FOREACH p IN ARRAY ARRAY['classic','ocean','slate','plum','sand','ayapark'] LOOP
  FOREACH c IN ARRAY ARRAY['normal','high'] LOOP
   v:=jsonb_build_object('palette',p,'contrast',c,'font','normal','loader','ring','density','comfortable','motion','system','hideAmounts',false,'language','tr','theme','system');
   IF public.ay3_preferences(v) IS DISTINCT FROM v OR public.ay3_preferences() IS DISTINCT FROM v THEN RAISE EXCEPTION 'Appearance preference roundtrip failed';END IF;
  END LOOP;
 END LOOP;
END;$$;
SELECT '12 palette/contrast combinations persisted and read correctly' AS result;
ROLLBACK;
