begin;
revoke all on function public.site_unit_status_audit_trigger() from public,anon,authenticated;
commit;
