-- Compute fresh source fingerprints once per batch rather than once per selected row.
DO $$DECLARE def text;BEGIN
 def:=pg_get_functiondef('ay2_private.review_selected(uuid,jsonb)'::regprocedure);
 def:=replace(def,'affected uuid;total integer:=0;','affected uuid;total integer:=0;sources jsonb;');
 def:=replace(def,'FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP', 'SELECT jsonb_object_agg(kind||'':''||source_id,fingerprint) INTO sources FROM ay2_private.review_sources(s); FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP');
 def:=replace(def,'SELECT fingerprint INTO f FROM ay2_private.review_sources(s) WHERE kind=item->>''kind'' AND source_id=sid;', 'f:=sources->>((item->>''kind'')||'':''||sid);');
 EXECUTE def;
END;$$;
