-- Applied to Supabase migration history as 20261023212834.
-- Permit Wohnungsvertreter without full ownership history.
-- Owner/tenant coverage rules and financial records remain unchanged.
DO $patch_representative$
DECLARE
  definition text;
  old_rule text;
  new_rule text;
BEGIN
  definition := pg_get_functiondef('ay2_private.change_relationship(uuid,jsonb)'::regprocedure);
  old_rule := 'IF x.role IN (''tenant'',''representative'') AND NOT coalesce(coverage @> daterange(x.starts_on,x.ends_on,''[]''),false)';
  new_rule := 'IF x.role=''tenant'' AND NOT coalesce(coverage @> daterange(x.starts_on,x.ends_on,''[]''),false)';
  IF strpos(definition,old_rule)=0 THEN RAISE EXCEPTION 'Relationship coverage rule changed unexpectedly; refusing patch'; END IF;
  definition := replace(definition,old_rule,new_rule);
  old_rule := 'AND role IN (''tenant'',''representative'') LOOP';
  new_rule := 'AND role=''tenant'' LOOP';
  IF strpos(definition,old_rule)=0 THEN RAISE EXCEPTION 'Relationship owner-loop changed unexpectedly; refusing patch'; END IF;
  EXECUTE replace(definition,old_rule,new_rule);

  definition := pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
  old_rule := 'if p->>''role'' in (''tenant'',''representative'') and not exists';
  new_rule := 'if p->>''role''=''tenant'' and not exists';
  IF strpos(definition,old_rule)=0 THEN RAISE EXCEPTION 'Legacy link rule changed unexpectedly; refusing patch'; END IF;
  definition := replace(definition,old_rule,new_rule);
  old_rule := 'and t.role in (''tenant'',''representative'') and (t.ends_on';
  new_rule := 'and t.role=''tenant'' and (t.ends_on';
  IF strpos(definition,old_rule)=0 THEN RAISE EXCEPTION 'Legacy end-link rule changed unexpectedly; refusing patch'; END IF;
  EXECUTE replace(definition,old_rule,new_rule);
END;
$patch_representative$;
