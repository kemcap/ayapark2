-- Applied to production on 2026-10-29 (migration 20261029171432).
CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND ay2_private.view_site(s) THEN
  coalesce((
   SELECT jsonb_agg(jsonb_build_object(
     'id',p.id,
     'full_name',p.full_name,
     'is_self',coalesce(p.auth_user_id=auth.uid(),false),
     'unit_roles',coalesce((
       SELECT jsonb_agg(jsonb_build_object('unit_id',l.unit_id,'role',l.role))
       FROM public.ay3_links l
       WHERE l.site_id=s AND l.person_id=p.id AND l.active AND l.archived_at IS NULL
         AND l.role IN ('owner','tenant')
         AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND ay2_private.can_view_unit_debts(s,l.unit_id)
     ),'[]'::jsonb)
   ))
   FROM public.ay3_persons p
   WHERE p.site_id=s AND (
     ay2_private.can(s,'finance') OR ay2_private.own_person(p.id)
     OR EXISTS(SELECT 1 FROM public.ay2_charges c
        WHERE c.site_id=s AND c.person_id=p.id AND ay2_private.can_view_unit_debts(s,c.unit_id))
   )
  ),'[]'::jsonb)
 ELSE '[]'::jsonb END;
$$;
