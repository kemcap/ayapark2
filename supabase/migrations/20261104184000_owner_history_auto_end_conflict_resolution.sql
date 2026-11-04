-- AYA PARK 2: ownership periods are inferred from successor start dates.
-- Financial charges and allocations are never rewritten here.
-- Historical duplicates are preserved as inactive, annotated records after explicit confirmation.
ALTER TABLE public.ay3_links ADD COLUMN IF NOT EXISTS ends_on_auto boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.ay3_add_historical_assignment(p_site uuid,p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_person uuid;v_unit uuid;v_role text;v_id uuid;v_first text;v_last text;
 v_start date;v_end date;v_successor date;v_updated integer:=0;v_end_auto boolean:=false;
BEGIN
 IF NOT ay2_private.can(p_site,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 v_unit:=nullif(p_payload->>'unit_id','')::uuid;v_role:=p_payload->>'role';
 IF v_role NOT IN('owner','tenant','representative') OR v_role IS NULL THEN RAISE EXCEPTION 'Geçerli geçmiş rolü seçin.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=v_unit AND site_id=p_site) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 v_start:=nullif(p_payload->>'starts_on','')::date;v_end:=nullif(p_payload->>'ends_on','')::date;
 IF v_start IS NOT NULL AND v_end IS NOT NULL AND v_end<v_start THEN RAISE EXCEPTION 'Tarihleri kontrol edin.';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 IF coalesce((p_payload->>'new_person')::boolean,false) THEN
  v_first:=btrim(coalesce(p_payload->>'first_name',''));v_last:=btrim(coalesce(p_payload->>'last_name',''));
  IF v_first='' OR v_last='' OR length(v_first)>75 OR length(v_last)>75 THEN RAISE EXCEPTION 'Ad ve soyadı kontrol edin.';END IF;
  INSERT INTO public.ay3_persons(site_id,full_name,first_name,last_name,phone,email,notes)
  VALUES(p_site,v_first||' '||v_last,v_first,v_last,left(coalesce(p_payload->>'phone',''),60),left(coalesce(p_payload->>'email',''),254),left(coalesce(p_payload->>'notes',''),5000)) RETURNING id INTO v_person;
 ELSE
  v_person:=nullif(p_payload->>'person_id','')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.ay3_persons WHERE id=v_person AND site_id=p_site AND archived_at IS NULL) THEN RAISE EXCEPTION 'Kişi bulunamadı.';END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=p_site AND unit_id=v_unit AND person_id=v_person AND role=v_role AND active=true) THEN
  RAISE EXCEPTION 'Bu kişinin aynı dairede güncel rolü var.';
 END IF;
 -- Never create the same historical relationship twice, regardless of the previous end-date value.
 IF EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=p_site AND unit_id=v_unit AND person_id=v_person AND role=v_role
  AND starts_on IS NOT DISTINCT FROM v_start AND archive_reason IN('historical_import','duplicate_history')) THEN
  RAISE EXCEPTION 'Dieser historische Eintrag existiert bereits. Bitte den Eigentümerverlauf prüfen und korrigieren.' USING errcode='P0001';
 END IF;
 IF v_role='owner' AND v_start IS NOT NULL THEN
  SELECT min(n.starts_on) INTO v_successor FROM public.ay3_links n
  WHERE n.site_id=p_site AND n.unit_id=v_unit AND n.role='owner' AND n.person_id<>v_person
    AND n.starts_on>v_start AND n.archive_reason IS DISTINCT FROM 'duplicate_history';
  IF v_successor IS NOT NULL THEN
   IF v_end IS NOT NULL AND v_end>=v_successor THEN
    RAISE EXCEPTION 'Eigentumszeitraum überlappt den folgenden Eigentümer. Bitte Zeitraum korrigieren.' USING errcode='P0001';
   END IF;
   IF v_end IS NULL THEN v_end:=v_successor-1;v_end_auto:=true;END IF;
  END IF;
 END IF;
 INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,active,archived_at,archive_reason,archive_note,starts_on,ends_on,ends_on_auto,primary_contact,mandates)
 VALUES(p_site,v_unit,v_person,v_role,false,now(),'historical_import',left(coalesce(p_payload->>'archive_note',''),500),v_start,v_end,v_end_auto,false,'{}')
 RETURNING id INTO v_id;
 -- Only unset ends on imported, archived owner rows are filled. Never alter a manually supplied end.
 IF v_role='owner' AND v_start IS NOT NULL THEN
  WITH following AS (
   SELECT h.id,min(n.starts_on)-1 AS inferred_end
   FROM public.ay3_links h JOIN public.ay3_links n ON n.site_id=h.site_id AND n.unit_id=h.unit_id
     AND n.role='owner' AND n.person_id<>h.person_id AND n.starts_on>h.starts_on
     AND n.archive_reason IS DISTINCT FROM 'duplicate_history'
   WHERE h.site_id=p_site AND h.unit_id=v_unit AND h.role='owner' AND h.archive_reason='historical_import'
     AND h.active=false AND h.starts_on IS NOT NULL AND h.ends_on IS NULL
   GROUP BY h.id
  )
  UPDATE public.ay3_links h SET ends_on=f.inferred_end,ends_on_auto=true,updated_at=now(),revision=h.revision+1
  FROM following f WHERE h.id=f.id AND f.inferred_end IS NOT NULL;
  GET DIAGNOSTICS v_updated=ROW_COUNT;
 END IF;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES
 (p_site,auth.uid(),'historical_assignment_add',v_id,jsonb_build_object('unit_id',v_unit,'person_id',v_person,'role',v_role,'starts_on',v_start,'ends_on',v_end,'auto_end_updates',v_updated));
 RETURN jsonb_build_object('ok',true,'id',v_id,'person_id',v_person,'ends_on',v_end,'auto_end_updates',v_updated);
END
$function$;

CREATE OR REPLACE FUNCTION public.ay3_reconcile_owner_history(p_site uuid,p_unit uuid,p_apply boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 v_auto integer:=0;v_dup integer:=0;v_blocked integer:=0;v_overlap integer:=0;
 v_changed_ends integer:=0;v_changed_dupes integer:=0;v_ambiguous integer:=0;
BEGIN
 IF NOT ay2_private.can(p_site,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=p_unit AND site_id=p_site) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 -- Safe automatic end dates for imported historical owners with an identified later owner.
 WITH periods AS (
  SELECT h.id,h.ends_on,min(n.starts_on) AS successor
  FROM public.ay3_links h LEFT JOIN public.ay3_links n ON n.site_id=h.site_id AND n.unit_id=h.unit_id
    AND n.role='owner' AND n.person_id<>h.person_id AND n.starts_on>h.starts_on
    AND n.archive_reason IS DISTINCT FROM 'duplicate_history'
  WHERE h.site_id=p_site AND h.unit_id=p_unit AND h.role='owner'
    AND h.active=false AND h.archive_reason='historical_import' AND h.starts_on IS NOT NULL
  GROUP BY h.id,h.ends_on
 )
 SELECT count(*) FILTER(WHERE ends_on IS NULL AND successor IS NOT NULL)::int,
        count(*) FILTER(WHERE ends_on IS NOT NULL AND successor IS NOT NULL AND ends_on>=successor)::int
 INTO v_auto,v_overlap FROM periods;
 -- Same person / same apartment / same historical start: keep earliest and flag extras.
 WITH duplicates AS (
  SELECT l.id,row_number() OVER(PARTITION BY l.person_id,l.starts_on ORDER BY l.archived_at NULLS LAST,l.id) AS rn
  FROM public.ay3_links l WHERE l.site_id=p_site AND l.unit_id=p_unit AND l.role='owner'
    AND l.active=false AND l.archive_reason='historical_import' AND l.starts_on IS NOT NULL
 )
 SELECT count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.ay2_charges c WHERE c.link_id=d.id))::int,
        count(*) FILTER(WHERE EXISTS(SELECT 1 FROM public.ay2_charges c WHERE c.link_id=d.id))::int
 INTO v_dup,v_blocked FROM duplicates d WHERE d.rn>1;
 SELECT count(*)::int INTO v_ambiguous FROM (
  SELECT l.starts_on FROM public.ay3_links l
  WHERE l.site_id=p_site AND l.unit_id=p_unit AND l.role='owner' AND l.starts_on IS NOT NULL
    AND l.archive_reason IS DISTINCT FROM 'duplicate_history'
  GROUP BY l.starts_on HAVING count(DISTINCT l.person_id)>1
 ) ambiguous_starts;
 IF p_apply THEN
  WITH duplicates AS (
   SELECT l.id,row_number() OVER(PARTITION BY l.person_id,l.starts_on ORDER BY l.archived_at NULLS LAST,l.id) AS rn
   FROM public.ay3_links l WHERE l.site_id=p_site AND l.unit_id=p_unit AND l.role='owner'
     AND l.active=false AND l.archive_reason='historical_import' AND l.starts_on IS NOT NULL
  )
  UPDATE public.ay3_links l SET archive_reason='duplicate_history',
    archive_note='Identischer historischer Eigentümereintrag; beim bestätigten Abgleich ausgeblendet.',
    updated_at=now(),revision=l.revision+1
  FROM duplicates d WHERE d.id=l.id AND d.rn>1
    AND NOT EXISTS(SELECT 1 FROM public.ay2_charges c WHERE c.link_id=l.id);
  GET DIAGNOSTICS v_changed_dupes=ROW_COUNT;
  WITH following AS (
   SELECT h.id,min(n.starts_on)-1 AS inferred_end
   FROM public.ay3_links h JOIN public.ay3_links n ON n.site_id=h.site_id AND n.unit_id=h.unit_id
    AND n.role='owner' AND n.person_id<>h.person_id AND n.starts_on>h.starts_on
    AND n.archive_reason IS DISTINCT FROM 'duplicate_history'
   WHERE h.site_id=p_site AND h.unit_id=p_unit AND h.role='owner'
     AND h.active=false AND h.archive_reason='historical_import'
     AND h.starts_on IS NOT NULL AND h.ends_on IS NULL
   GROUP BY h.id
  )
  UPDATE public.ay3_links h SET ends_on=f.inferred_end,ends_on_auto=true,updated_at=now(),revision=h.revision+1
  FROM following f WHERE h.id=f.id AND f.inferred_end IS NOT NULL;
  GET DIAGNOSTICS v_changed_ends=ROW_COUNT;
  IF v_changed_dupes+v_changed_ends>0 THEN
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES
   (p_site,auth.uid(),'owner_history_reconciled',p_unit,jsonb_build_object('unit_id',p_unit,'auto_ends',v_changed_ends,'duplicate_links_hidden',v_changed_dupes,'unresolved',v_overlap+v_blocked+v_ambiguous));
  END IF;
 END IF;
 RETURN jsonb_build_object('ok',true,'automatic_ends',v_auto,'duplicates',v_dup,
   'unresolved',v_overlap+v_blocked+v_ambiguous,'overlaps',v_overlap,
   'blocked_duplicates',v_blocked,'ambiguous_starts',v_ambiguous,
   'applied',p_apply,'changed_ends',v_changed_ends,'changed_duplicates',v_changed_dupes);
END
$function$;

REVOKE ALL ON FUNCTION public.ay3_add_historical_assignment(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_add_historical_assignment(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.ay3_reconcile_owner_history(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_reconcile_owner_history(uuid,uuid,boolean) TO authenticated;
