-- Remove unused client DDL privileges. Preserve all SELECT/INSERT/UPDATE/DELETE/RLS.
begin;
set local lock_timeout='5s';
revoke all on function public.site_person_audit_trigger(),public.site_portal_audit_trigger(),public.site_unit_person_audit_trigger(),public.site_unit_status_audit_trigger() from public,anon,authenticated;
DO $client_ddl$
declare target record;
begin
 for target in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and c.relname~'^(ay[2356]_|site_|ayapark_|ay_access_)'
 loop
  execute format('revoke truncate,references,trigger on table %I.%I from public,anon,authenticated',target.nspname,target.relname);
  if current_setting('server_version_num')::int>=170000 then
   execute format('revoke maintain on table %I.%I from public,anon,authenticated',target.nspname,target.relname);
  end if;
 end loop;
end;
$client_ddl$;
commit;
