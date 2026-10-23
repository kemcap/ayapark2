-- Preserve periods even when the responsible person is assigned later.
-- This correction may already be installed; do not replace unrelated logic.
DO $patch$
DECLARE
 definition text := pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
 previous text := $previous$   if found then update public.ay2_charges set person_id=l.person_id,link_id=l.id,period_from=nullif(p->>'period_from','')::date,period_to=nullif(p->>'period_to','')::date where id=ident;end if;$previous$;
 corrected text := $corrected$   start_date:=nullif(p->>'period_from','')::date;
   end_date:=nullif(p->>'period_to','')::date;
   if (start_date is null) <> (end_date is null) or end_date<start_date then
    raise exception 'Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.';
   end if;
   update public.ay2_charges set period_from=start_date,period_to=end_date where id=ident and site_id=s;
   if l.id is not null then update public.ay2_charges set person_id=l.person_id,link_id=l.id where id=ident and site_id=s;end if;$corrected$;
BEGIN
 IF strpos(definition,corrected)>0 THEN RETURN; END IF;
 IF strpos(definition,previous)=0 THEN
  RAISE EXCEPTION 'Unexpected command implementation; review before applying charge-period.sql';
 END IF;
 EXECUTE replace(definition,previous,corrected);
END;
$patch$;
