-- Atomic, dated ownership/tenancy changes. Existing debt ownership is never rewritten.
CREATE TABLE IF NOT EXISTS public.ay3_occupancy_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 site_id uuid NOT NULL REFERENCES public.site_sites(id),
 unit_id uuid NOT NULL,
 effective_on date NOT NULL,
 status text NOT NULL CHECK(status IN ('occupied','vacant','unknown')),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(unit_id,site_id) REFERENCES public.site_units(id,site_id),
 UNIQUE(site_id,unit_id,effective_on)
);
ALTER TABLE public.ay3_occupancy_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ay3_occupancy_changes FROM anon,authenticated;
GRANT SELECT ON public.ay3_occupancy_changes TO authenticated;
DROP POLICY IF EXISTS occupancy_read ON public.ay3_occupancy_changes;
CREATE POLICY occupancy_read ON public.ay3_occupancy_changes FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.site_units u WHERE u.id=unit_id AND u.site_id=ay3_occupancy_changes.site_id)
);
CREATE INDEX IF NOT EXISTS ay3_occupancy_changes_unit_idx ON public.ay3_occupancy_changes(unit_id,site_id);

CREATE OR REPLACE FUNCTION ay2_private.record_occupancy(s uuid,u uuid,d date,v text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 IF d IS NULL OR v IS NULL OR v NOT IN ('occupied','vacant','unknown') THEN RAISE EXCEPTION 'Geçerli bir kullanım durumu seçin.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 INSERT INTO public.ay3_occupancy_changes(site_id,unit_id,effective_on,status,created_by)
 VALUES(s,u,d,v,auth.uid()) ON CONFLICT(site_id,unit_id,effective_on)
 DO UPDATE SET status=excluded.status,created_by=excluded.created_by,created_at=now();
END;$$;
REVOKE ALL ON FUNCTION ay2_private.record_occupancy(uuid,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.record_occupancy(uuid,uuid,date,text) TO authenticated;

CREATE OR REPLACE FUNCTION ay2_private.change_relationship(s uuid,p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 k text:=p->>'kind';u uuid:=nullif(p->>'unit_id','')::uuid;
 req uuid:=nullif(p->>'request_id','')::uuid;pid uuid;ident uuid;
 l public.ay3_links;old public.ay3_links;x public.ay3_links;ownerlink public.ay3_links;
 day date;finish date;coverage datemultirange;target daterange;
 snapshot jsonb;cached jsonb;result jsonb;expected text;newrole text;
 changed uuid[]:=ARRAY[]::uuid[];occupancy text:=p->>'occupancy';
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 IF req IS NULL THEN RAISE EXCEPTION 'İstek kimliği gerekli.';END IF;
 SELECT details INTO cached FROM public.ay2_audit WHERE site_id=s AND action='relationship_change' AND details->>'request_id'=req::text LIMIT 1;
 IF FOUND THEN
  IF cached->'payload' IS DISTINCT FROM p THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';END IF;
  RETURN cached->'result'||jsonb_build_object('already_recorded',true);
 END IF;
 IF k IS NULL OR k NOT IN ('owner_change','owner_to_tenant','tenant_change','moveout','tenant_to_owner','correction','add') THEN RAISE EXCEPTION 'Değişiklik türünü seçin.';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE site_id=s AND id=u) THEN RAISE EXCEPTION 'Daire bulunamadı.';END IF;
 IF occupancy IS NULL OR occupancy NOT IN ('keep','occupied','vacant') THEN RAISE EXCEPTION 'Geçerli bir kullanım durumu seçin.';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO snapshot FROM public.ay3_links t WHERE site_id=s AND unit_id=u;
 IF k<>'add' THEN
  SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND unit_id=u AND id=nullif(p->>'link_id','')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Değiştirilecek kaydı seçin.';END IF;old:=l;
  -- Compare structured JSON, not whitespace-dependent serialization.
  IF nullif(p->>'expected','') IS NULL OR (p->>'expected')::jsonb IS DISTINCT FROM jsonb_build_array(l.id,l.person_id,l.unit_id,l.role,l.starts_on,l.ends_on) THEN RAISE EXCEPTION 'Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.';END IF;
  IF k<>'correction' AND l.ends_on IS NOT NULL THEN RAISE EXCEPTION 'Bu ilişki zaten sona ermiş veya bitişi planlanmış. Tarihi düzeltmek için Hatalı kaydı düzelt seçin.';END IF;
  IF k IN ('owner_change','owner_to_tenant') AND l.role<>'owner' OR k IN ('tenant_change','moveout','tenant_to_owner') AND l.role<>'tenant' THEN RAISE EXCEPTION 'Seçilen kayıt bu değişiklik için uygun değil.';END IF;
 END IF;
 IF k='correction' THEN
  day:=nullif(p->>'starts_on','')::date;finish:=nullif(p->>'ends_on','')::date;newrole:=p->>'role';
  IF coalesce((p->>'start_unknown')::boolean,false) THEN day:=NULL;END IF;
  IF day IS NULL AND NOT coalesce((p->>'start_unknown')::boolean,false) THEN RAISE EXCEPTION 'Başlangıç tarihini girin veya bilinmiyor seçin.';END IF;
  IF finish<day THEN RAISE EXCEPTION 'Bitiş tarihi başlangıç tarihinden önce olamaz.';END IF;
  IF length(btrim(coalesce(p->>'reason','')))<3 OR length(p->>'reason')>500 THEN RAISE EXCEPTION 'Düzeltme nedenini yazın.';END IF;
  IF newrole IS NULL OR newrole NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
  UPDATE public.ay3_links SET role=newrole,starts_on=day,ends_on=finish WHERE id=l.id AND site_id=s;
  changed:=array_append(changed,l.id);ident:=l.id;
 ELSE
  day:=nullif(p->>'effective_on','')::date;
  IF day IS NULL THEN RAISE EXCEPTION 'Geçerli bir değişiklik tarihi girin.';END IF;
  IF l.starts_on IS NOT NULL AND day<=l.starts_on THEN RAISE EXCEPTION 'Değişiklik mevcut başlangıçtan sonra olmalı. Yanlış kayıt için Hatalı kaydı düzelt seçin.';END IF;
  IF k IN ('owner_change','owner_to_tenant','tenant_change','add') THEN
   IF coalesce((p->>'new_person')::boolean,false) THEN
    IF length(btrim(coalesce(p->>'first_name','')))=0 OR length(btrim(coalesce(p->>'last_name','')))=0 THEN RAISE EXCEPTION 'Ad ve soyad gerekli.';END IF;
    IF length(p->>'first_name')>75 OR length(p->>'last_name')>75 OR length(coalesce(p->>'phone',''))>60 OR length(coalesce(p->>'email',''))>254 THEN RAISE EXCEPTION 'Kişi bilgileri çok uzun.';END IF;
    INSERT INTO public.ay3_persons(site_id,first_name,last_name,full_name,phone,email,language,notes)
    VALUES(s,p->>'first_name',p->>'last_name',btrim((p->>'first_name')||' '||(p->>'last_name')),coalesce(p->>'phone',''),coalesce(p->>'email',''),'tr','') RETURNING id INTO pid;
   ELSE
    pid:=nullif(p->>'person_id','')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.ay3_persons WHERE id=pid AND site_id=s) THEN RAISE EXCEPTION 'Kişi seçin.';END IF;
   END IF;
   IF pid=l.person_id THEN RAISE EXCEPTION 'Yeni kişi önceki kişiyle aynı olamaz. Rol değişimi veya hatalı kaydı düzelt seçeneğini kullanın.';END IF;
  END IF;
  IF k='tenant_to_owner' THEN
   SELECT * INTO ownerlink FROM public.ay3_links WHERE site_id=s AND unit_id=u AND id=nullif(p->>'owner_link_id','')::uuid AND role='owner' AND ends_on IS NULL FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Biten ev sahipliği kaydını seçin.';END IF;
   IF nullif(p->>'owner_expected','') IS NULL OR (p->>'owner_expected')::jsonb IS DISTINCT FROM jsonb_build_array(ownerlink.id,ownerlink.person_id,ownerlink.unit_id,ownerlink.role,ownerlink.starts_on,ownerlink.ends_on) THEN RAISE EXCEPTION 'Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.';END IF;
   IF ownerlink.starts_on IS NOT NULL AND day<=ownerlink.starts_on THEN RAISE EXCEPTION 'Değişiklik mevcut başlangıçtan sonra olmalı. Yanlış kayıt için Hatalı kaydı düzelt seçin.';END IF;
   UPDATE public.ay3_links SET ends_on=day-1 WHERE id=ownerlink.id AND site_id=s;
  END IF;
  IF k<>'add' THEN UPDATE public.ay3_links SET ends_on=day-1 WHERE id=l.id AND site_id=s;ident:=l.id;END IF;
  IF k IN ('owner_change','owner_to_tenant','tenant_change','add','tenant_to_owner') THEN
   newrole:=CASE WHEN k IN ('owner_change','owner_to_tenant','tenant_to_owner') THEN 'owner' WHEN k='tenant_change' THEN 'tenant' ELSE p->>'role' END;
   IF newrole IS NULL OR newrole NOT IN ('owner','tenant','representative') THEN RAISE EXCEPTION 'Geçerli bir rol seçin.';END IF;
   IF k='tenant_to_owner' THEN pid:=l.person_id;END IF;
   INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on) VALUES(s,u,pid,newrole,day) RETURNING id INTO ident;
   changed:=array_append(changed,ident);
  END IF;
  IF k='owner_to_tenant' THEN
   INSERT INTO public.ay3_links(site_id,unit_id,person_id,role,starts_on) VALUES(s,u,l.person_id,'tenant',day) RETURNING id INTO ident;
   changed:=array_append(changed,ident);
  END IF;
 END IF;
 SELECT range_agg(daterange(starts_on,ends_on,'[]')) INTO coverage FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='owner';
 FOR x IN SELECT * FROM public.ay3_links WHERE site_id=s AND unit_id=u AND id=ANY(changed) LOOP
  IF EXISTS(SELECT 1 FROM public.ay3_links y WHERE y.site_id=s AND y.unit_id=u AND y.id<>x.id AND (y.person_id=x.person_id AND y.role=x.role OR y.role='tenant' AND x.role='tenant') AND daterange(y.starts_on,y.ends_on,'[]')&&daterange(x.starts_on,x.ends_on,'[]')) THEN RAISE EXCEPTION 'Bu dönemde çakışan bir kayıt var. Kiracı değişimi seçin veya tarihleri düzeltin.';END IF;
  IF x.role='tenant' AND NOT coalesce(coverage @> daterange(x.starts_on,x.ends_on,'[]'),false) THEN RAISE EXCEPTION 'Bu dönemin tamamı için ev sahibi kaydı gerekli. Önce ev sahibi bilgisini kontrol edin.';END IF;
 END LOOP;
 IF old.role='owner' OR k='tenant_to_owner' THEN
  FOR x IN SELECT * FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='tenant' LOOP
   IF k='correction' THEN target:=daterange(x.starts_on,x.ends_on,'[]');
   ELSE
    IF x.ends_on<day THEN CONTINUE;END IF;
    target:=daterange(greatest(x.starts_on,day),x.ends_on,'[]');
   END IF;
   IF NOT coalesce(coverage @> target,false) THEN RAISE EXCEPTION 'Değişiklik devam eden kiracı veya temsilciyi ev sahibisiz bırakıyor. Yeni ev sahibini aynı işlemde belirtin.';END IF;
  END LOOP;
 END IF;
 IF occupancy<>'keep' THEN
  IF k='correction' THEN day:=(now() at time zone 'Europe/Istanbul')::date;END IF;
  IF occupancy='vacant' AND EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=u AND role='tenant' AND (starts_on IS NULL OR starts_on<=day) AND (ends_on IS NULL OR ends_on>=day)) THEN RAISE EXCEPTION 'Bu tarihte kiracı kaydı devam ediyor. Önce kiracı çıkışını kaydedin veya Dolu seçin.';END IF;
  PERFORM ay2_private.record_occupancy(s,u,day,occupancy);
 END IF;
 result:=jsonb_build_object('ok',true,'id',ident);
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),'relationship_change',ident,jsonb_build_object('request_id',req,'payload',p,'before',snapshot,'result',result));
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION ay2_private.change_relationship(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.change_relationship(uuid,jsonb) TO authenticated;

-- Preserve all unrelated command and workspace implementations with guarded patches.
DO $patch$
DECLARE def text;needle text;
BEGIN
 def:=pg_get_functiondef('public.ay2_command(uuid,text,jsonb)'::regprocedure);
 IF strpos(def,'ay2_private.change_relationship')=0 THEN
  needle:='select ay2_private.command(p_site,p_action,p_payload);';
  IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected public command wrapper; review migration';END IF;
  EXECUTE $ddl$CREATE OR REPLACE FUNCTION public.ay2_command(p_site uuid,p_action text,p_payload jsonb)
  RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $body$
  DECLARE result jsonb;
  BEGIN
   IF p_action='relationship_change' THEN RETURN ay2_private.change_relationship(p_site,p_payload);END IF;
   result:=ay2_private.command(p_site,p_action,p_payload);
   IF p_action='occupancy' THEN PERFORM ay2_private.record_occupancy(p_site,(p_payload->>'unit_id')::uuid,(now() at time zone 'Europe/Istanbul')::date,p_payload->>'status');END IF;
   RETURN result;
  END;$body$;$ddl$;
 END IF;
 def:=pg_get_functiondef('public.ay2_workspace(uuid)'::regprocedure);
 IF strpos(def,'''occupancy_changes''')=0 THEN
  needle:='''people'',''[]''::jsonb,';
  IF strpos(def,needle)=0 THEN RAISE EXCEPTION 'Unexpected workspace; review migration';END IF;
  EXECUTE replace(def,needle,$new$'occupancy_changes',coalesce((select jsonb_agg(t order by effective_on desc) from public.ay3_occupancy_changes t where site_id=p_site),'[]'::jsonb),
 'people','[]'::jsonb,$new$);
 END IF;
END;$patch$;
