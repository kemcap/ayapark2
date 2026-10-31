-- Extend only the language allowlist. No saved settings or personal data are changed.
DO $$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.ay3_preferences(jsonb)'::regprocedure);
 IF position('ARRAY[''de'',''tr'',''en'']' IN def)=0 THEN
  IF position('ARRAY[''de'',''tr'']' IN def)=0 THEN RAISE EXCEPTION 'Unexpected language validator; review before migration'; END IF;
  def:=replace(def,'ARRAY[''de'',''tr'']','ARRAY[''de'',''tr'',''en'']'); EXECUTE def;
 END IF;
END;$$;
