BEGIN;
SET LOCAL lock_timeout='5s';
-- Keep published expired notices readable under exactly the existing audience rules.
-- Acknowledgement, unread badges and pop-ups still require an active notice.
CREATE OR REPLACE FUNCTION ay2_private.ay5_receives(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_announcements a WHERE a.id=aid AND ay2_private.view_site(a.site_id) AND (ay2_private.can(a.site_id,'announcements') OR (a.published AND (a.starts_at IS NULL OR a.starts_at<=now()) AND (a.target_kind='all' OR EXISTS(
 SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id JOIN public.site_units u ON u.id=l.unit_id JOIN public.site_blocks b ON b.id=u.block_id
 WHERE l.site_id=a.site_id AND p.auth_user_id=auth.uid() AND l.role IN ('owner','tenant','representative') AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date) AND (
 (a.target_kind='owners' AND (l.role='owner' OR l.role='representative' AND 'owners'=ANY(l.mandates))) OR
 (a.target_kind='residents' AND (l.role='tenant' OR l.role='representative' AND 'residents'=ANY(l.mandates))) OR
 (a.target_kind='representatives' AND l.role='representative') OR
 (a.target_kind='units' AND l.unit_id=ANY(a.target_units)) OR (a.target_kind='blocks' AND b.code=ANY(a.target_blocks)))))))); $function$;

COMMIT;
