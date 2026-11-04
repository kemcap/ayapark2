-- AYA PARK 2: atomic owner transfer, optionally retaining the former owner as tenant.
-- No financial ledger, charge, allocation, credit, or access-grant rows are modified.
CREATE OR REPLACE FUNCTION public.ay3_owner_transfer(p_site uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_req uuid := nullif(p_payload->>'request_id','')::uuid;
  v_old_id uuid := nullif(p_payload->>'id','')::uuid;
  v_unit uuid := nullif(p_payload->>'unit_id','')::uuid;
  v_new_owner uuid := nullif(p_payload->>'new_owner_id','')::uuid;
  v_effective date := nullif(p_payload->>'effective_on','')::date;
  v_keep boolean := coalesce((p_payload->>'keep_as_tenant')::boolean,false);
  v_new_person boolean := coalesce((p_payload->>'new_person')::boolean,false);
  v_old public.ay3_links;
  v_tenant_id uuid;
  v_owner_link uuid;
  v_prev jsonb;
  v_result jsonb;
  v_person public.ay3_persons;
  v_first text;
  v_last text;
BEGIN
  IF auth.uid() IS NULL OR NOT ay2_private.can(p_site,'people') THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';
  END IF;
  PERFORM ay2_private.require_task_action(p_site,'assignment_add',p_payload);
  IF v_req IS NULL OR v_old_id IS NULL OR v_unit IS NULL OR v_effective IS NULL
     OR NOT coalesce((p_payload->>'confirmation')::boolean,false) THEN
    RAISE EXCEPTION 'Gerekli bilgileri ve onayı kontrol edin.';
  END IF;
  IF v_effective > (now() AT TIME ZONE 'Europe/Istanbul')::date THEN
    RAISE EXCEPTION 'Gelecekteki mülkiyet değişimleri henüz kaydedilemez.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));

  SELECT details INTO v_prev FROM public.ay2_audit
   WHERE site_id=p_site AND action='assignment_owner_transfer'
     AND details->>'request_id'=v_req::text
   LIMIT 1;
  IF FOUND THEN
    IF v_prev->'payload' IS DISTINCT FROM p_payload THEN
      RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';
    END IF;
    RETURN v_prev->'result'||jsonb_build_object('already_recorded',true);
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=v_unit AND site_id=p_site) THEN
    RAISE EXCEPTION 'Daire bulunamadı.';
  END IF;
  SELECT * INTO v_old FROM public.ay3_links
   WHERE id=v_old_id AND site_id=p_site AND unit_id=v_unit AND role='owner' FOR UPDATE;
  IF NOT FOUND OR NOT v_old.active THEN RAISE EXCEPTION 'Güncel malik kaydı bulunamadı.'; END IF;
  IF (p_payload ? 'revision') AND (p_payload->>'revision')::bigint IS DISTINCT FROM v_old.revision THEN
    RAISE EXCEPTION 'Kayıt değişti. Görünümü yenileyip tekrar deneyin.';
  END IF;
  IF (SELECT count(*) FROM public.ay3_links
      WHERE site_id=p_site AND unit_id=v_unit AND role='owner' AND active)=1 THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Birden fazla malik var. Önce mülkiyet paylarını kontrol edin.';
  END IF;
  IF (v_old.starts_on IS NOT NULL AND v_old.starts_on >= v_effective)
     OR (v_old.ends_on IS NOT NULL AND v_old.ends_on < v_effective - 1) THEN
    RAISE EXCEPTION 'Devir tarihi önceki mülkiyet dönemi ile uyuşmuyor.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.ay3_persons
    WHERE id=v_old.person_id AND site_id=p_site AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'Önceki malik aktif kişi kaydında bulunamadı.';
  END IF;

  IF v_new_person THEN
    v_first:=btrim(coalesce(p_payload->>'first_name',''));
    v_last:=btrim(coalesce(p_payload->>'last_name',''));
    IF v_new_owner IS NOT NULL OR v_first='' OR v_last=''
       OR length(v_first)>75 OR length(v_last)>75
       OR length(coalesce(p_payload->>'phone',''))>60
       OR length(coalesce(p_payload->>'email',''))>254
       OR length(coalesce(p_payload->>'notes',''))>5000 THEN
      RAISE EXCEPTION 'Yeni malik bilgilerinde eksik veya geçersiz alan var.';
    END IF;
    INSERT INTO public.ay3_persons
      (site_id,first_name,last_name,full_name,phone,email,notes,language)
    VALUES (p_site,v_first,v_last,v_first||' '||v_last,
      coalesce(p_payload->>'phone',''),coalesce(p_payload->>'email',''),
      coalesce(p_payload->>'notes',''),'tr')
    RETURNING id INTO v_new_owner;
  ELSE
    SELECT * INTO v_person FROM public.ay3_persons
      WHERE id=v_new_owner AND site_id=p_site AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Yeni malik seçin.'; END IF;
  END IF;
  IF v_new_owner=v_old.person_id THEN
    RAISE EXCEPTION 'Eski ve yeni malik aynı kişi olamaz.';
  END IF;

  -- A completed ownership period remains available for audit and historic charges.
  UPDATE public.ay3_links
     SET active=false, ends_on=v_effective-1, ends_on_auto=false,
         archived_at=now(),archive_reason='ownership_transfer',
         archive_note='Devir tarihi: '||v_effective::text,
         updated_at=now(),revision=revision+1
   WHERE id=v_old.id AND site_id=p_site;
  INSERT INTO public.ay3_links
    (site_id,unit_id,person_id,role,starts_on,ends_on,active)
  VALUES (p_site,v_unit,v_new_owner,'owner',v_effective,NULL,true)
  RETURNING id INTO v_owner_link;

  IF v_keep THEN
    SELECT id INTO v_tenant_id FROM public.ay3_links
     WHERE site_id=p_site AND unit_id=v_unit AND person_id=v_old.person_id
       AND role='tenant' AND active
     ORDER BY starts_on NULLS FIRST, id LIMIT 1;
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.ay3_links
        (site_id,unit_id,person_id,role,starts_on,ends_on,active)
      VALUES (p_site,v_unit,v_old.person_id,'tenant',v_effective,NULL,true)
      RETURNING id INTO v_tenant_id;
    END IF;
  END IF;

  v_result:=jsonb_build_object('ok',true,'former_owner_id',v_old.person_id,
    'new_owner_id',v_new_owner,'new_owner_link_id',v_owner_link,
    'tenant_link_id',v_tenant_id,'effective_on',v_effective);
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
  VALUES (p_site,auth.uid(),'assignment_owner_transfer',v_owner_link,
    jsonb_build_object('request_id',v_req,'payload',p_payload,
      'old_owner_before',to_jsonb(v_old),'result',v_result));
  RETURN v_result;
END;
$function$;

-- This SECURITY DEFINER RPC is callable only by authenticated users and
-- always checks both site permission and task grant in the body.
REVOKE ALL ON FUNCTION public.ay3_owner_transfer(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ay3_owner_transfer(uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.ay3_owner_transfer(uuid,jsonb) TO authenticated;
