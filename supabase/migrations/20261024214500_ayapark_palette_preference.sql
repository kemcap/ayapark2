-- Expand only the appearance allowlist. Existing preferences, RLS and function grants remain intact.
DO $$ DECLARE def text; BEGIN
 def:=pg_get_functiondef('public.ay3_preferences(jsonb)'::regprocedure);
 IF position('''ayapark''' IN def)=0 THEN
  IF position('ARRAY[''classic'',''ocean'',''slate'',''plum'',''sand'']' IN def)=0 THEN RAISE EXCEPTION 'Unexpected preference validator; review before migration';END IF;
  def:=replace(def,'ARRAY[''classic'',''ocean'',''slate'',''plum'',''sand'']','ARRAY[''classic'',''ocean'',''slate'',''plum'',''sand'',''ayapark'']');EXECUTE def;
 END IF;
END;$$;
