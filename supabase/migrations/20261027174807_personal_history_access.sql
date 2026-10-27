-- Preserve financial identities. Membership permits app access; current links permit community information.
CREATE OR REPLACE FUNCTION ay2_private.own_person(p uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.ay3_persons x WHERE x.id=p AND x.auth_user_id=auth.uid()
 AND EXISTS(SELECT 1 FROM public.site_resident_units r JOIN public.site_units u ON u.id=r.unit_id
 WHERE r.user_id=auth.uid() AND r.active AND u.site_id=x.site_id));
$$;
CREATE OR REPLACE FUNCTION ay2_private.current_member(s uuid, finance boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.ay3_links l WHERE l.site_id=s AND ay2_private.own_person(l.person_id)
 AND l.active AND l.archived_at IS NULL
 AND l.role IN ('owner','tenant','representative') AND (NOT finance OR l.role IN ('owner','tenant'))
 AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
 AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date));
$$;
REVOKE ALL ON FUNCTION ay2_private.current_member(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.current_member(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION ay2_private.ay5_unit(u uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT false; $$;
-- Financial access is by debtor, never inherited from a unit or representation.
CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_charges x
 WHERE x.id=c AND (ay2_private.can(x.site_id,'finance') OR ay2_private.own_person(x.person_id)));
$$;
ALTER POLICY ay2_charges_read ON public.ay2_charges USING (ay2_private.can(site_id,'finance') OR ay2_private.own_person(person_id));
ALTER POLICY ay3_credits_read ON public.ay3_credits USING (ay2_private.can(site_id,'finance') OR ay2_private.own_person(person_id));
ALTER POLICY ay2_reports_read ON public.ay2_reports USING (ay2_private.can(site_id,'finance') OR ay2_private.current_member(site_id,true));
ALTER POLICY occupancy_read ON public.ay3_occupancy_changes USING (ay2_private.can(site_id,'people') OR ay2_private.can(site_id,'finance') OR ay2_private.current_member(site_id,false) AND EXISTS(SELECT 1 FROM public.ay3_links l WHERE l.unit_id=ay3_occupancy_changes.unit_id AND ay2_private.own_person(l.person_id)));
-- Historical apartment identifiers remain visible for one's own relationships.
CREATE OR REPLACE FUNCTION public.site_can_view_unit(target_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (EXISTS(
 SELECT 1 FROM public.site_units u JOIN public.site_staff_memberships m ON m.site_id=u.site_id
 WHERE u.id=target_unit_id AND m.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.site_resident_units r WHERE r.unit_id=target_unit_id AND r.user_id=auth.uid() AND r.active)
 OR EXISTS(SELECT 1 FROM public.ay3_links l WHERE l.unit_id=target_unit_id AND ay2_private.own_person(l.person_id)));
$$;
CREATE OR REPLACE FUNCTION ay2_private.financial_summary(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 if not ay2_private.can(s,'finance') and not ay2_private.current_member(s,true) then return null;end if;
 return jsonb_build_object('source_last_date',(select max(booked_on) from public.ay2_entries where site_id=s),
 'opening_cents',(select opening_cents from public.ay2_settings where site_id=s and initialized),
 'balance_cents',(select opening_cents+coalesce((select sum(cents) from public.ay2_entries where site_id=s),0) from public.ay2_settings where site_id=s and initialized),
 'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.booked_on,'income_cents',d.inc,'expense_cents',d.exp,'categories',d.cats) order by d.booked_on) from (
 select booked_on,sum(inc) inc,sum(exp) exp,jsonb_object_agg(category,exp) cats from (
 select e.booked_on,e.category,coalesce(sum(e.cents) filter(where e.cents>0),0) inc,coalesce(-sum(e.cents) filter(where e.cents<0),0) exp
 from public.ay2_entries e where e.site_id=s and e.reversal_of is null and e.category<>'Transfer' and not exists(select 1 from public.ay2_entries r where r.reversal_of=e.id)
 group by e.booked_on,e.category) bycat group by booked_on) d),'[]'::jsonb));end;
$function$;
CREATE OR REPLACE FUNCTION ay2_private.provider_directory(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
 if not ay2_private.current_member(s,false) and not ay2_private.can(s,'people') and not ay2_private.can(s,'finance') then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'contact',p.contact,'phone',p.phone,'email',p.email,'status',p.status) order by p.name) from public.ay3_providers p where p.site_id=s and p.status<>'avoid'),'[]'::jsonb);
end;$function$;
CREATE OR REPLACE FUNCTION ay2_private.ay5_receives(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_announcements a WHERE a.id=aid AND ay2_private.view_site(a.site_id) AND (ay2_private.can(a.site_id,'announcements') OR (ay2_private.current_member(a.site_id,false) AND a.published AND (a.starts_at IS NULL OR a.starts_at<=now()) AND (a.target_kind='all' OR EXISTS(
 SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id JOIN public.site_units u ON u.id=l.unit_id JOIN public.site_blocks b ON b.id=u.block_id
 WHERE l.site_id=a.site_id AND p.auth_user_id=auth.uid() AND l.role IN ('owner','tenant','representative') AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date) AND (
 (a.target_kind='owners' AND (l.role='owner' OR l.role='representative' AND 'owners'=ANY(l.mandates))) OR
 (a.target_kind='residents' AND (l.role='tenant' OR l.role='representative' AND 'residents'=ANY(l.mandates))) OR
 (a.target_kind='representatives' AND l.role='representative') OR
 (a.target_kind='units' AND l.unit_id=ANY(a.target_units)) OR (a.target_kind='blocks' AND b.code=ANY(a.target_blocks)))))))); $function$;
CREATE OR REPLACE FUNCTION public.ay5_workspace(p_site uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
 result:=public.ay2_workspace(p_site);IF result IS NULL THEN RETURN NULL; END IF;
 result:=result||jsonb_build_object('exceptions',coalesce((SELECT jsonb_agg(x ORDER BY created_at DESC) FROM public.ay5_monthly_exceptions x WHERE site_id=p_site),'[]'::jsonb),'budget',(SELECT to_jsonb(x) FROM public.ay5_budget x WHERE site_id=p_site),'v5',true);
 IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('entries',ay2_private.ay5_payments(p_site)); END IF;
 result:=result||jsonb_build_object('person_access',ay2_private.person_access(p_site),
 'community_access',ay2_private.can(p_site,'finance') OR ay2_private.current_member(p_site,true),
 'current_member',ay2_private.current_member(p_site,false),'personal_scope',true);
 RETURN result;
END; $function$;

CREATE OR REPLACE FUNCTION public.ay3_community_access(p_site uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (ay2_private.can(p_site,'finance') OR ay2_private.current_member(p_site,true));
$$;
REVOKE ALL ON FUNCTION public.ay3_community_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_community_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND ay2_private.view_site(s) THEN
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name)) FROM public.ay3_persons p
 WHERE p.site_id=s AND (ay2_private.can(s,'finance') OR ay2_private.own_person(p.id))),'[]'::jsonb)
 ELSE '[]'::jsonb END;
$$;
