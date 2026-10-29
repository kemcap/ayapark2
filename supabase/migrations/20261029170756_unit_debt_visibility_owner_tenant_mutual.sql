-- Applied to production 2026-10-29 (migration 20261029170756).
-- Apartment-level debt visibility: current owners and tenants can inspect all charges
-- and payment allocations for their own unit, regardless of which party owes them.
-- No financial data or person relationships are changed.
CREATE OR REPLACE FUNCTION ay2_private.can_view_unit_debts(p_site uuid,p_unit uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
   SELECT 1
   FROM public.site_units u
   JOIN public.site_resident_units r ON r.unit_id=u.id
   JOIN public.ay3_persons p ON p.site_id=u.site_id AND p.auth_user_id=r.user_id
   JOIN public.ay3_links l ON l.site_id=u.site_id AND l.unit_id=u.id AND l.person_id=p.id
   WHERE u.site_id=p_site AND u.id=p_unit
     AND r.user_id=auth.uid() AND r.active AND r.role IN ('owner','tenant')
     AND p.archived_at IS NULL
     AND l.role IN ('owner','tenant') AND l.active AND l.archived_at IS NULL
     AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
     AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
 );
$$;
REVOKE ALL ON FUNCTION ay2_private.can_view_unit_debts(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.can_view_unit_debts(uuid,uuid) TO authenticated;

ALTER POLICY ay2_charges_read ON public.ay2_charges TO authenticated
 USING (ay2_private.can(site_id,'finance') OR ay2_private.can_view_unit_debts(site_id,unit_id));

CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.ay2_charges x WHERE x.id=c AND
  (ay2_private.can(x.site_id,'finance') OR ay2_private.can_view_unit_debts(x.site_id,x.unit_id))
 );
$$;
ALTER POLICY ay2_allocations_read ON public.ay2_allocations TO authenticated
 USING (ay2_private.view_charge(charge_id));

-- Return only names and unit-role labels for authorized debtors; never disclose
-- phones, emails, notes, or details from any apartment outside the user's scope.
CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND ay2_private.view_site(s) THEN
  coalesce((
   SELECT jsonb_agg(
    jsonb_build_object(
     'id',p.id,
     'full_name',p.full_name,
     'unit_roles',coalesce((
       SELECT jsonb_agg(jsonb_build_object('unit_id',l.unit_id,'role',l.role))
       FROM public.ay3_links l
       WHERE l.site_id=s AND l.person_id=p.id AND l.active AND l.archived_at IS NULL
         AND l.role IN ('owner','tenant')
         AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND ay2_private.can_view_unit_debts(s,l.unit_id)
     ),'[]'::jsonb)
    )
   )
   FROM public.ay3_persons p
   WHERE p.site_id=s AND (
     ay2_private.can(s,'finance') OR ay2_private.own_person(p.id)
     OR EXISTS(
       SELECT 1 FROM public.ay2_charges c
       WHERE c.site_id=s AND c.person_id=p.id
         AND ay2_private.can_view_unit_debts(s,c.unit_id)
     )
   )
  ),'[]'::jsonb)
 ELSE '[]'::jsonb END;
$$;
