-- Current apartment roles are explicit. Dates are optional annotations, not authorization.
-- All debt/person/link references and all application memberships remain untouched.
DO $migration$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ay3_links' AND column_name='active') THEN
  ALTER TABLE public.ay3_links ADD COLUMN active boolean;
  UPDATE public.ay3_links SET active=(starts_on IS NULL OR starts_on<=(now() at time zone 'Europe/Istanbul')::date) AND (ends_on IS NULL OR ends_on>=(now() at time zone 'Europe/Istanbul')::date);
  ALTER TABLE public.ay3_links ALTER COLUMN active SET DEFAULT true,ALTER COLUMN active SET NOT NULL;
 END IF;
END;$migration$;
ALTER TABLE public.ay3_links
 ADD COLUMN IF NOT EXISTS archived_at timestamptz,
 ADD COLUMN IF NOT EXISTS archive_reason text,
 ADD COLUMN IF NOT EXISTS archive_note text,
 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS ay3_links_current_idx ON public.ay3_links(site_id,unit_id,person_id,role) WHERE active;

CREATE OR REPLACE FUNCTION ay2_private.manage_assignment(s uuid,act text,p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 req uuid:=nullif(p->>'request_id','')::uuid;l public.ay3_links;old public.ay3_links;
 pid uuid;u uuid;ident uuid;existing uuid;r text;extra text;d1 date;d2 date;
 cached jsonb;result jsonb;before_person jsonb;role_changed boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 IF act NOT IN ('assignment_add','assignment_edit','assignment_remove','assignment_restore') OR act IS NULL THEN RAISE EXCEPTION 'Geçersiz kişi işlemi.';END IF;
 IF req IS NULL THEN RAISE EXCEPTION 'İstek kimliği gerekli.';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT details INTO cached FROM public.ay2_audit WHERE site_id=s AND action=act AND details->>'request_id'=req::text LIMIT 1;
 IF FOUND THEN
  IF cached->'payload' IS DISTINCT FROM p THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';END IF;
  RETURN cached->'result'||jsonb_build_object('already_recorded',true);
 END IF;
 IF act<>'assignment_add' THEN
  SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=nullif(p->>'id','')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kayıt bulunamadı.';END IF;old:=l;pid:=l.person_id;u:=l.unit_id;ident:=l.id;
  IF p ? 'revision' AND (p->>'revision')::bigint IS DISTINCT FROM l.revision THEN RAISE EXCEPTION 'Kayıt değişti. Görünümü yenileyip tekrar deneyin.';END IF;
 ELSE u:=nullif(p->>'unit_id','')::uuid;pid:=nullif(p->>'person_id','')::uuid;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 IF act='assignment_edit' AND NOT l.active THEN RAISE EXCEPTION 'Bu rol arşivde. Önce geri getirin.';END IF;
 IF act='assignment_remove' THEN
  IF coalesce(p->>'reason','') NOT IN ('mistake','ended','other') THEN RAISE EXCEPTION 'Kaldırma nedenini seçin.';END IF;
  IF length(coalesce(p->>'note',''))>500 THEN RAISE EXCEPTION 'Not en fazla 500 karakter olabilir.';END IF;
  UPDATE public.ay3_links SET active=false,archived_at=now(),archive_reason=p->>'reason',archive_note=coalesce(p->>'note',''),updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
 ELSE
  IF act='assignment_restore' THEN r:=l.role;d1:=l.starts_on;d2:=l.ends_on;
  ELSE
   r:=coalesce(nullif(p->>'role',''),l.role);d1:=CASE WHEN p ? 'starts_on' THEN nullif(p->>'starts_on','')::date ELSE l.starts_on END;d2:=CASE WHEN p ? 'ends_on' THEN nullif(p->>'ends_on','')::date ELSE l.ends_on END;
   IF d2<d1 THEN RAISE EXCEPTION 'Bitiş tarihi başlangıç tarihinden önce olamaz.';END IF;
   IF r IS NULL OR r NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
   IF act='assignment_add' AND coalesce((p->>'new_person')::boolean,false) THEN
    IF length(btrim(coalesce(p->>'first_name','')))=0 OR length(btrim(coalesce(p->>'last_name','')))=0 THEN RAISE EXCEPTION 'Ad ve soyad gerekli.';END IF;
    IF length(p->>'first_name')>75 OR length(p->>'last_name')>75 OR length(coalesce(p->>'phone',''))>60 OR length(coalesce(p->>'email',''))>254 OR length(coalesce(p->>'notes',''))>5000 THEN RAISE EXCEPTION 'Kişi bilgileri çok uzun.';END IF;
    INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,phone,email,notes,language)
    VALUES(s,btrim(p->>'first_name'),btrim(p->>'last_name'),btrim(p->>'first_name')||' '||btrim(p->>'last_name'),coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'notes',''),'tr') RETURNING id INTO pid;
   END IF;
   SELECT to_jsonb(t) INTO before_person FROM public.ay3_persons t WHERE id=pid AND site_id=s FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Kişi seçin.';END IF;
   IF act='assignment_edit' AND (p ? 'first_name' OR p ? 'last_name' OR p ? 'phone' OR p ? 'email' OR p ? 'notes') THEN
    IF length(btrim(coalesce(p->>'first_name',before_person->>'first_name')))=0 OR length(btrim(coalesce(p->>'last_name',before_person->>'last_name')))=0 THEN RAISE EXCEPTION 'Ad ve soyad gerekli.';END IF;
    IF length(coalesce(p->>'first_name',''))>75 OR length(coalesce(p->>'last_name',''))>75 OR length(coalesce(p->>'phone',''))>60 OR length(coalesce(p->>'email',''))>254 OR length(coalesce(p->>'notes',''))>5000 THEN RAISE EXCEPTION 'Kişi bilgileri çok uzun.';END IF;
    UPDATE public.ay3_persons SET first_name=btrim(coalesce(p->>'first_name',first_name)),last_name=btrim(coalesce(p->>'last_name',last_name)),
     full_name=btrim(coalesce(p->>'first_name',first_name))||' '||btrim(coalesce(p->>'last_name',last_name)),
     phone=coalesce(p->>'phone',phone),email=coalesce(p->>'email',email),notes=coalesce(p->>'notes',notes) WHERE id=pid AND site_id=s;
   END IF;
  END IF;
  IF act='assignment_edit' AND l.role=r THEN
   UPDATE public.ay3_links SET starts_on=d1,ends_on=d2,updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
  ELSE
   IF act='assignment_edit' THEN
    IF NOT l.active THEN RAISE EXCEPTION 'Bu rol arşivde. Önce geri getirin.';END IF;
    UPDATE public.ay3_links SET active=false,archived_at=now(),archive_reason='role_changed',updated_at=now(),revision=revision+1 WHERE id=l.id AND site_id=s;
   END IF;
   SELECT id INTO existing FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role=r AND active ORDER BY id LIMIT 1;
   IF existing IS NOT NULL THEN ident:=existing;
   ELSE
    INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on,ends_on,active,responsibility,primary_contact)
    VALUES(s,u,pid,r,d1,d2,true,coalesce(l.responsibility,''),coalesce(l.primary_contact,false)) RETURNING id INTO ident;
   END IF;
  END IF;
  extra:=nullif(p->>'additional_role','');
  IF extra IS NOT NULL THEN
   IF extra NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
   IF NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND person_id=pid AND role=extra AND active) THEN
    INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on,ends_on,active) VALUES(s,u,pid,extra,d1,d2,true);
   END IF;
  END IF;
 END IF;
 result:=jsonb_build_object('ok',true,'id',ident);
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),act,ident,jsonb_build_object('request_id',req,'payload',p,'before',to_jsonb(old),'person_before',before_person,'result',result));
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION ay2_private.manage_assignment(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.manage_assignment(uuid,text,jsonb) TO authenticated;

-- Retired clients cannot execute an old multi-step transfer on the new state model.
CREATE OR REPLACE FUNCTION ay2_private.change_relationship(s uuid,p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 RAISE EXCEPTION 'Eski form artık kullanılmıyor. Sayfayı yenileyip Kişi ekle veya Düzenle seçin.';
END;$$;
CREATE OR REPLACE FUNCTION ay2_private.unlink_relationship(s uuid,p jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT ay2_private.manage_assignment(s,'assignment_remove',(p-'reason')||jsonb_build_object('reason','mistake','note',p->>'reason'));
$$;
-- Existing command implementation remains intact for all unrelated operations.
DO $patch$
DECLARE def text;needle text;replacement text;
BEGIN
 def:=pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
 needle:=' if act=''acknowledge'' then';
 replacement:=$new$ if act in ('assignment_add','assignment_edit','assignment_remove','assignment_restore') then return ay2_private.manage_assignment(s,act,p);end if;
 if act='link' then return ay2_private.manage_assignment(s,'assignment_add',p);end if;
 if act='edit_link' then return ay2_private.manage_assignment(s,'assignment_edit',p);end if;
 if act='end_link' then return ay2_private.manage_assignment(s,'assignment_remove',p||jsonb_build_object('reason','ended'));end if;
 if act='unlink' then return ay2_private.unlink_relationship(s,p);end if;
 if act in ('relationship_change','switch_tenant') then return ay2_private.change_relationship(s,p);end if;
 if act='acknowledge' then$new$;
 IF strpos(def,'ay2_private.manage_assignment')=0 THEN
  IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected command; review active-assignment migration';END IF;
  EXECUTE replace(def,needle,replacement);
 END IF;
 -- Future monthly charges must never select an archived relationship. Existing charges are untouched.
 def:=pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure);
 def:=replace(def,'where site_id=s and unit_id=c.unit_id and role=case c.payer','where site_id=s and unit_id=c.unit_id and active and role=case c.payer');
 def:=replace(def,'where site_id=s and unit_id=c.unit_id and role=l.role and starts_on','where site_id=s and unit_id=c.unit_id and active and role=l.role and starts_on');
 EXECUTE def;
END;$patch$;
-- Access provisioning now recognizes explicit active roles; no memberships are changed here.
DO $patch$
DECLARE def text;needle text;
BEGIN
 FOR def IN SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='ay2_private' AND p.proname='access_target') OR (n.nspname='public' AND p.proname='ay3_provision_access') LOOP
  needle:='and (starts_on is null or starts_on<=(now() at time zone ''Europe/Istanbul'')::date) and (ends_on is null or ends_on>=(now() at time zone ''Europe/Istanbul'')::date)';
  IF strpos(def,needle)>0 THEN EXECUTE replace(def,needle,'and active');
  ELSIF strpos(def,'and active')=0 THEN RAISE EXCEPTION 'Unexpected access provisioning implementation';END IF;
 END LOOP;
END;$patch$;
