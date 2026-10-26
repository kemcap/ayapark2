-- Applied via Supabase migration 20261023220604.
-- Erroneous role assignments can be deleted without deleting people or money records.
CREATE OR REPLACE FUNCTION ay2_private.unlink_relationship(s uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 req uuid:=nullif(p->>'request_id','')::uuid;
 l public.ay3_links;
 cached jsonb; result jsonb;
 coverage datemultirange;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(s,'people') THEN
  RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 IF req IS NULL THEN RAISE EXCEPTION 'İstek kimliği gerekli.'; END IF;
 IF coalesce((p->>'confirmation')::boolean,false) IS NOT TRUE OR length(btrim(coalesce(p->>'reason',''))) NOT BETWEEN 3 AND 500 THEN
  RAISE EXCEPTION 'En az üç karakterlik gerekçe yazın ve kaldırmayı onaylayın.';
 END IF;
 SELECT details INTO cached FROM public.ay2_audit
 WHERE site_id=s AND action='unlink' AND details->>'request_id'=req::text LIMIT 1;
 IF FOUND THEN
  IF cached->'payload' IS DISTINCT FROM p THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.'; END IF;
  RETURN cached->'result'||jsonb_build_object('already_recorded',true);
 END IF;
 SELECT * INTO l FROM public.ay3_links
 WHERE site_id=s AND id=nullif(p->>'id','')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Kayıt bulunamadı.'; END IF;
 IF nullif(p->>'expected','') IS NULL OR
    (p->>'expected')::jsonb IS DISTINCT FROM jsonb_build_array(l.id,l.person_id,l.unit_id,l.role,l.starts_on,l.ends_on) THEN
  RAISE EXCEPTION 'Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.ay2_charges c WHERE c.site_id=s AND c.link_id=l.id) THEN
  RAISE EXCEPTION 'Bu role bağlı borç var. Geçmişi korumak için bağlantıyı bitirin.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ay3_links z
               WHERE z.site_id=s AND z.unit_id=l.unit_id AND z.person_id=l.person_id AND z.id<>l.id) THEN
  IF EXISTS(SELECT 1 FROM public.ay3_credits c
            WHERE c.site_id=s AND c.unit_id=l.unit_id AND c.person_id=l.person_id)
     OR EXISTS(SELECT 1 FROM public.ay3_match_rules m
               WHERE m.site_id=s AND m.unit_id=l.unit_id AND m.person_id=l.person_id) THEN
   RAISE EXCEPTION 'Bu kişiye bağlı ödeme kaydı var. Bunun yerine bağlantıyı bitirin.';
  END IF;
 END IF;
 IF l.role='owner' THEN
  SELECT range_agg(daterange(o.starts_on,o.ends_on,'[]')) INTO coverage
  FROM public.ay3_links o WHERE o.site_id=s AND o.unit_id=l.unit_id AND o.role='owner' AND o.id<>l.id;
  IF EXISTS(SELECT 1 FROM public.ay3_links t
            WHERE t.site_id=s AND t.unit_id=l.unit_id AND t.role='tenant'
              AND daterange(t.starts_on,t.ends_on,'[]') && daterange(l.starts_on,l.ends_on,'[]')
              AND NOT coalesce(coverage @> daterange(t.starts_on,t.ends_on,'[]'),false)) THEN
   RAISE EXCEPTION 'Kiracı varken ev sahibi bağlantısını kaldıramazsınız.';
  END IF;
 END IF;
 DELETE FROM public.ay3_links WHERE site_id=s AND id=l.id;
 result:=jsonb_build_object('ok',true,'id',l.id);
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
 VALUES(s,auth.uid(),'unlink',l.id,
  jsonb_build_object('request_id',req,'payload',p,'before',to_jsonb(l),'reason',p->>'reason','result',result));
 RETURN result;
END;$function$;
REVOKE ALL ON FUNCTION ay2_private.unlink_relationship(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.unlink_relationship(uuid,jsonb) TO authenticated;

DO $patch$
DECLARE def text;anchor text:='IF p_action=''relationship_change'' THEN RETURN ay2_private.change_relationship(p_site,p_payload);END IF;';
BEGIN
 def:=pg_get_functiondef('public.ay2_command(uuid,text,jsonb)'::regprocedure);
 IF strpos(def,'ay2_private.unlink_relationship')=0 THEN
  IF strpos(def,anchor)=0 THEN RAISE EXCEPTION 'Unexpected command wrapper, cannot patch safely';END IF;
  EXECUTE replace(def,anchor,anchor||E'\n   IF p_action=''unlink'' THEN RETURN ay2_private.unlink_relationship(p_site,p_payload);END IF;');
 END IF;
END;$patch$;
