-- Restore personal history without expanding the current-apartment scope.
BEGIN;
ALTER POLICY ay2_charges_read ON public.ay2_charges TO authenticated
 USING(ay2_private.can(site_id,'finance') OR ay2_private.own_person(person_id) OR ay2_private.can_view_unit_debts(site_id,unit_id));
CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_charges x WHERE x.id=c AND
 (ay2_private.can(x.site_id,'finance') OR ay2_private.own_person(x.person_id) OR ay2_private.can_view_unit_debts(x.site_id,x.unit_id)));
$$;
COMMIT;
