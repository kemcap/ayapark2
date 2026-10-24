-- Consistent owner history coverage for all direct tenant and owner date edits.
CREATE OR REPLACE FUNCTION ay2_private.assert_tenant_owner_coverage(p_site uuid,p_unit uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $verify$
DECLARE owner_periods datemultirange;
BEGIN
 SELECT range_agg(daterange(starts_on,ends_on,'[]')) INTO owner_periods
 FROM public.ay3_links WHERE site_id=p_site AND unit_id=p_unit AND role='owner';
 IF EXISTS(SELECT 1 FROM public.ay3_links t
  WHERE t.site_id=p_site AND t.unit_id=p_unit AND t.role='tenant'
  AND NOT coalesce(owner_periods @> daterange(t.starts_on,t.ends_on,'[]'),false)) THEN
  RAISE EXCEPTION 'Bu dönemin tamamı için ev sahibi kaydı gerekli. Önce ev sahibi bilgisini kontrol edin.';
 END IF;
END;$verify$;
REVOKE ALL ON FUNCTION ay2_private.assert_tenant_owner_coverage(uuid,uuid) FROM PUBLIC,anon,authenticated;

DO $patch$
DECLARE
 definition text;
 old_guard text:='  if p->>''role''=''tenant'' and not exists(select 1 from public.ay3_links where site_id=s and unit_id=uid and role=''owner'' and (starts_on is null or start_date is null or starts_on<=start_date) and (ends_on is null or ends_on>=coalesce(end_date,start_date,(now() at time zone ''Europe/Istanbul'')::date))) then raise exception ''Önce ev sahibini ekleyin.'';end if;';
 edit_anchor text:='  ident:=l.id;'||E'\n'||' elsif act=''person'' then';
 link_anchor text:='  insert into public.ay3_links(site_id,person_id,unit_id,role,starts_on,ends_on,responsibility,primary_contact) values(s,pid,uid,p->>''role'',start_date,end_date,coalesce(p->>''responsibility'',''''),coalesce((p->>''primary_contact'')::boolean,false)) returning id into ident;'||E'\n'||' elsif act=''end_link'' then';
BEGIN
 definition:=pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
 IF strpos(definition,old_guard)=0 OR strpos(definition,edit_anchor)=0 OR strpos(definition,link_anchor)=0 THEN
  RAISE EXCEPTION 'Command source changed; refusing unsafe automatic patch';
 END IF;
 definition:=replace(definition,old_guard,'');
 definition:=replace(definition,edit_anchor,'  if l.role in (''owner'',''tenant'') then perform ay2_private.assert_tenant_owner_coverage(s,l.unit_id);end if;'||E'\n'||edit_anchor);
 definition:=replace(definition,link_anchor,replace(link_anchor,E'\n elsif act=''end_link'' then',E'\n  if p->>''role''=''tenant'' then perform ay2_private.assert_tenant_owner_coverage(s,uid);end if;'||E'\n elsif act=''end_link'' then'));
 EXECUTE definition;
END;$patch$;
