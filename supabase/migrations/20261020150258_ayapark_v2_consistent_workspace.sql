-- Single-statement financial snapshot; all subqueries use caller RLS.
create function public.ay2_workspace(p_site uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'capabilities',ay2_private.capabilities(p_site),
  'settings',coalesce((select jsonb_agg(t) from public.ay2_settings t where t.site_id=p_site),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(t) from public.ay2_permissions t where t.site_id=p_site),'[]'::jsonb),
  'entries',coalesce((select jsonb_agg(t order by t.booked_on desc,t.created_at desc,t.id) from public.ay2_entries t where t.site_id=p_site),'[]'::jsonb),
  'charges',coalesce((select jsonb_agg(t order by t.due_on,t.id) from public.ay2_charges t where t.site_id=p_site),'[]'::jsonb),
  'allocations',coalesce((select jsonb_agg(t) from public.ay2_allocations t where t.site_id=p_site),'[]'::jsonb),
  'people',coalesce((select jsonb_agg(t order by t.full_name,t.id) from public.ay2_people t where t.site_id=p_site),'[]'::jsonb),
  'announcements',coalesce((select jsonb_agg(t order by t.created_at desc,t.id) from public.ay2_announcements t where t.site_id=p_site),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(t order by t.period desc) from public.ay2_reports t where t.site_id=p_site),'[]'::jsonb),
  'audit',coalesce((select jsonb_agg(t order by t.id desc) from (select * from public.ay2_audit where site_id=p_site order by id desc limit 100) t),'[]'::jsonb),
  'staged_charges',coalesce((select jsonb_agg(t) from public.ay2_staged_charges t where t.site_id=p_site),'[]'::jsonb)
 ) where ay2_private.view_site(p_site);
$$;
revoke all on function public.ay2_workspace(uuid) from public,anon,authenticated;
grant execute on function public.ay2_workspace(uuid) to authenticated;
