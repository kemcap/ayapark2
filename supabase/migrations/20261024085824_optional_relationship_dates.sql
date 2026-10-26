-- Dates may be omitted in person/role forms. Missing starts are unknown, not a fabricated historic date.
-- Actual changes without a supplied date are effective today in Istanbul; move-out takes effect tomorrow.
-- The migration changes only procedures; it neither rewrites existing relationships nor financial data.
DO $patch$
DECLARE definition text;
  from_text text;
BEGIN
 definition:=pg_get_functiondef('ay2_private.change_relationship(uuid,jsonb)'::regprocedure);
 from_text:='  IF day IS NULL AND NOT coalesce((p->>''start_unknown'')::boolean,false) THEN RAISE EXCEPTION ''Başlangıç tarihini girin veya bilinmiyor seçin.'';END IF;';
 IF strpos(definition,from_text)=0 THEN RAISE EXCEPTION 'Missing correction date condition'; END IF;
 definition:=replace(definition,from_text,'  -- Empty corrected start means unknown (NULL).');
 from_text:='  IF day IS NULL THEN RAISE EXCEPTION ''Geçerli bir değişiklik tarihi girin.'';END IF;';
 IF strpos(definition,from_text)=0 THEN RAISE EXCEPTION 'Missing change date condition'; END IF;
 definition:=replace(definition,from_text,
  '  IF day IS NULL AND k<>''add'' THEN day:=(now() at time zone ''Europe/Istanbul'')::date + CASE WHEN k=''moveout'' THEN 1 ELSE 0 END; END IF;');
 from_text:='  IF k=''correction'' THEN day:=(now() at time zone ''Europe/Istanbul'')::date;END IF;';
 IF strpos(definition,from_text)=0 THEN RAISE EXCEPTION 'Missing occupancy default date condition'; END IF;
 definition:=replace(definition,from_text,
  '  IF k=''correction'' OR day IS NULL THEN day:=(now() at time zone ''Europe/Istanbul'')::date;END IF;');
 EXECUTE definition;
END;$patch$;

DO $patch$
DECLARE definition text; old_guard text;
BEGIN
 definition:=pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
 old_guard:='  if start_date is null and not coalesce((p->>''start_unknown'')::boolean,false) then raise exception ''Başlangıç tarihini girin veya bilinmiyor seçin.'';end if;';
 IF (length(definition)-length(replace(definition,old_guard,'')))/length(old_guard)<>2 THEN RAISE EXCEPTION 'Expected two legacy start guards'; END IF;
 definition:=replace(definition,old_guard,'  -- Empty start is intentionally unknown.');
 old_guard:='  if nullif(p->>''ends_on'','''') is null then raise exception ''Çıkış tarihi gerekli.'';end if;';
 IF strpos(definition,old_guard)=0 THEN RAISE EXCEPTION 'Missing direct end-link guard'; END IF;
 definition:=replace(definition,old_guard,
  '  end_date:=coalesce(nullif(p->>''ends_on'','''')::date,(now() at time zone ''Europe/Istanbul'')::date);');
 -- Change end_link branch only, not an edit or other action.
 definition:=replace(definition,
   '  if l.starts_on is not null and (p->>''ends_on'')::date<l.starts_on then raise exception ''Çıkış tarihi başlangıç tarihinden önce olamaz.'';end if;',
   '  if l.starts_on is not null and end_date<l.starts_on then raise exception ''Çıkış tarihi başlangıç tarihinden önce olamaz.'';end if;');
 definition:=replace(definition,
  'and (t.ends_on is null or t.ends_on>(p->>''ends_on'')::date))',
  'and (t.ends_on is null or t.ends_on>end_date))');
 definition:=replace(definition,
  'and o.starts_on<=(p->>''ends_on'')::date+1 and o.ends_on is null)',
  'and o.starts_on<=end_date+1 and o.ends_on is null)');
 definition:=replace(definition,
  '  update public.ay3_links set ends_on=(p->>''ends_on'')::date where site_id=s and id=(p->>''id'')::uuid returning id into ident;',
  '  update public.ay3_links set ends_on=end_date where site_id=s and id=(p->>''id'')::uuid returning id into ident;');
 old_guard:='  end_date:=(p->>''ends_on'')::date;start_date:=(p->>''starts_on'')::date;';
 IF strpos(definition,old_guard)=0 THEN RAISE EXCEPTION 'Missing direct tenant switch dates';END IF;
 definition:=replace(definition,old_guard,
  '  end_date:=coalesce(nullif(p->>''ends_on'','''')::date,(now() at time zone ''Europe/Istanbul'')::date);start_date:=coalesce(nullif(p->>''starts_on'','''')::date,end_date+1);');
 old_guard:='  res:=ay2_private.command(s,''link'',p||jsonb_build_object(''role'',''tenant'',''unit_id'',l.unit_id,''ends_on'',null));';
 IF strpos(definition,old_guard)=0 THEN RAISE EXCEPTION 'Missing tenant link creation';END IF;
 definition:=replace(definition,old_guard,
  '  res:=ay2_private.command(s,''link'',p||jsonb_build_object(''role'',''tenant'',''unit_id'',l.unit_id,''ends_on'',null,''starts_on'',start_date,''start_unknown'',false));');
 EXECUTE definition;
END;$patch$;
