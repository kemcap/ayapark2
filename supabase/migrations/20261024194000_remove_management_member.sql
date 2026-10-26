-- Remove management rights without deleting Auth users, apartment links, or accounting history.
-- Only an authenticated manager can revoke another member's staff access.
CREATE OR REPLACE FUNCTION public.ay3_remove_staff_member(
 p_site uuid, p_user uuid, p_confirm boolean, p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
 v_actor uuid := auth.uid();
 v_role text;
 v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
 IF v_actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.site_staff_memberships
   WHERE site_id=p_site AND user_id=v_actor AND role='manager'
 ) THEN
  RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING ERRCODE='42501';
 END IF;
 IF p_confirm IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Devam etmek için onay kutusunu işaretleyin.' USING ERRCODE='P0001';
 END IF;
 IF p_user IS NULL OR p_user=v_actor THEN
  RAISE EXCEPTION 'Kendi yönetim erişiminizi kaldıramazsınız.' USING ERRCODE='P0001';
 END IF;
 IF char_length(v_reason)<3 OR char_length(v_reason)>500 THEN
  RAISE EXCEPTION 'En az üç karakterlik gerekçe yazın.' USING ERRCODE='P0001';
 END IF;
 -- Serialize management changes for this site to protect its last manager.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_site::text, 20261024));
 SELECT role INTO v_role
 FROM public.site_staff_memberships
 WHERE site_id=p_site AND user_id=p_user
 FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Yönetim üyesi bulunamadı.' USING ERRCODE='P0001';
 END IF;
 IF v_role='manager' AND (
   SELECT count(*) FROM public.site_staff_memberships
   WHERE site_id=p_site AND role='manager'
 )<=1 THEN
  RAISE EXCEPTION 'Son Süper Admin kaldırılamaz.' USING ERRCODE='P0001';
 END IF;
 DELETE FROM public.ay2_permissions WHERE site_id=p_site AND user_id=p_user;
 DELETE FROM public.site_staff_memberships WHERE site_id=p_site AND user_id=p_user;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
 VALUES(p_site,v_actor,'staff_remove',p_user,
   jsonb_build_object('old_role',v_role,'reason',v_reason,'scope','management_only'));
 RETURN jsonb_build_object('ok',true,'user_id',p_user);
END;
$$;
REVOKE ALL ON FUNCTION public.ay3_remove_staff_member(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay3_remove_staff_member(uuid,uuid,boolean,text) TO authenticated;
