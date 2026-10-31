-- Independent default-on management read permission. Never reused by mutation guards.
ALTER TABLE public.ay3_task_grants ADD COLUMN management_read boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.ay3_set_task_grants(p_site uuid,p_user uuid,p_tasks text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE site_id=p_site AND user_id=p_user AND role IN ('deputy','auditor')) THEN RAISE EXCEPTION 'Management member required';END IF;
 IF p_tasks IS NULL OR EXISTS(SELECT 1 FROM unnest(p_tasks)t WHERE t IS NULL) THEN RAISE EXCEPTION 'Invalid tasks';END IF;
 INSERT INTO public.ay3_task_grants(site_id,user_id,tasks) VALUES(p_site,p_user,p_tasks) ON CONFLICT(site_id,user_id) DO UPDATE SET tasks=excluded.tasks;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'task_grants',p_user,jsonb_build_object('tasks',p_tasks));
END;$$;

CREATE FUNCTION ay2_private.management_read(s uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.site_staff_memberships m
 WHERE m.site_id=s AND m.user_id=auth.uid() AND (m.role='manager' OR m.role IN ('deputy','auditor')
 AND coalesce((SELECT g.management_read FROM public.ay3_task_grants g WHERE g.site_id=s AND g.user_id=m.user_id),true)));
$$;
CREATE FUNCTION public.ay7_set_management_rights(p_site uuid,p_user uuid,p_tasks text[],p_management_read boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE before_read boolean;
BEGIN
 IF NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_management_read IS NULL THEN RAISE EXCEPTION 'Read permission required';END IF;
 PERFORM 1 FROM public.site_staff_memberships WHERE site_id=p_site AND user_id=p_user AND role IN ('deputy','auditor') FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Management member required';END IF;
 SELECT coalesce((SELECT management_read FROM public.ay3_task_grants WHERE site_id=p_site AND user_id=p_user),true) INTO before_read;
 PERFORM public.ay3_set_task_grants(p_site,p_user,p_tasks);
 UPDATE public.ay3_task_grants SET management_read=p_management_read WHERE site_id=p_site AND user_id=p_user;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'management_read_access',p_user,jsonb_build_object('before',before_read,'after',p_management_read));
END;$$;
CREATE FUNCTION ay2_private.management_overview(s uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.management_read(s) THEN RETURN '{}'::jsonb;END IF;
 RETURN jsonb_build_object(
 'persons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'is_self',p.auth_user_id=auth.uid())) FROM public.ay3_persons p WHERE p.site_id=s AND (EXISTS(SELECT 1 FROM public.ay3_links l WHERE l.site_id=s AND l.person_id=p.id) OR EXISTS(SELECT 1 FROM public.ay2_charges c WHERE c.site_id=s AND c.person_id=p.id))),'[]'::jsonb),
 'links',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'person_id',l.person_id,'unit_id',l.unit_id,'role',l.role,'active',l.active,'starts_on',l.starts_on,'ends_on',l.ends_on,'archived_at',l.archived_at)) FROM public.ay3_links l WHERE l.site_id=s),'[]'::jsonb),
 'charges',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'unit_id',c.unit_id,'person_id',c.person_id,'link_id',c.link_id,'payer',c.payer,'cents',c.cents,'label',c.label,'category',c.category,'due_on',c.due_on,'period_from',c.period_from,'period_to',c.period_to,'reference',c.reference,'void_reason',CASE WHEN nullif(c.void_reason,'') IS NOT NULL THEN 'void' END)) FROM public.ay2_charges c WHERE c.site_id=s),'[]'::jsonb),
 'allocations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'charge_id',a.charge_id,'entry_id',a.entry_id,'cents',a.cents,'created_at',a.created_at,'void_reason',CASE WHEN nullif(a.void_reason,'') IS NOT NULL THEN 'void' END)) FROM public.ay2_allocations a WHERE a.site_id=s),'[]'::jsonb),
 'entries',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'booked_on',e.booked_on,'cents',e.cents,'category',e.category,'description','Ödeme','reversal_of',e.reversal_of)) FROM public.ay2_entries e WHERE e.site_id=s AND EXISTS(SELECT 1 FROM public.ay2_allocations a WHERE a.site_id=s AND a.entry_id=e.id)),'[]'::jsonb));
END;$$;
-- Preserve existing workspace authorization and personal scope; add only a guarded, narrow projection.
CREATE OR REPLACE FUNCTION public.ay5_workspace(p_site uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE result jsonb; overview jsonb; allowed boolean;
BEGIN
 result:=public.ay2_workspace(p_site);IF result IS NULL THEN RETURN NULL;END IF;
 result:=result||jsonb_build_object('exceptions',coalesce((SELECT jsonb_agg(x ORDER BY created_at DESC) FROM public.ay5_monthly_exceptions x WHERE site_id=p_site),'[]'::jsonb),'budget',(SELECT to_jsonb(x) FROM public.ay5_budget x WHERE site_id=p_site),'v5',true);
 IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('entries',ay2_private.ay5_payments(p_site));END IF;
 result:=result||jsonb_build_object('person_access',ay2_private.person_access(p_site),'community_access',ay2_private.can(p_site,'finance') OR ay2_private.current_member(p_site,true),'current_member',ay2_private.current_member(p_site,false),'personal_scope',true);
 allowed:=ay2_private.management_read(p_site);
 IF allowed THEN
  overview:=ay2_private.management_overview(p_site);
  IF NOT ay2_private.can(p_site,'people') AND NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('persons',overview->'persons');END IF;
  IF NOT ay2_private.can(p_site,'people') THEN result:=result||jsonb_build_object('links',overview->'links');END IF;
  IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('charges',overview->'charges','allocations',overview->'allocations','entries',overview->'entries');END IF;
 END IF;
 RETURN result||jsonb_build_object('management_read',allowed);
END;$$;
REVOKE ALL ON FUNCTION ay2_private.management_read(uuid),ay2_private.management_overview(uuid),public.ay7_set_management_rights(uuid,uuid,text[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.management_read(uuid),ay2_private.management_overview(uuid),public.ay7_set_management_rights(uuid,uuid,text[],boolean) TO authenticated;
