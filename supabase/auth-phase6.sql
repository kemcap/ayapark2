-- Development draft. No production execution. Requires auth-phase3.sql.
-- Recovery never creates accounts, edits contacts or changes apartment/administrative roles.
create function public.ay_auth_recovery_authorize(p_actor uuid,p_person uuid,p_reason text,p_confirmed boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare person public.ay3_persons;
begin
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or person.auth_user_id is null or p_confirmed is distinct from true
 or length(btrim(coalesce(p_reason,''))) not between 10 and 300
 or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager')
 then raise exception 'Recovery unavailable'; end if;
 -- Recovery of staff accounts uses a separate, stronger operator procedure.
 if exists(select 1 from public.site_staff_memberships where user_id=person.auth_user_id)
 then raise exception 'Staff recovery requires operator verification';end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(person.site_id,p_actor,'recovery_authorized',p_person,jsonb_build_object('reason',btrim(p_reason)));
 return person.auth_user_id;
end;$$;
create function public.ay_auth_recovery_issued(p_actor uuid,p_person uuid,p_user uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.ay3_persons where id=p_person and auth_user_id=p_user for update;
 if not found or not exists(select 1 from public.ay3_persons p join public.site_staff_memberships s on s.site_id=p.site_id where p.id=p_person and s.user_id=p_actor and s.role='manager')
 or exists(select 1 from public.site_staff_memberships where user_id=p_user)
 then raise exception 'Recovery unavailable';end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 select site_id,p_actor,'recovery_link_issued',id,'{}'::jsonb from public.ay3_persons where id=p_person;
end;$$;
revoke all on function public.ay_auth_recovery_authorize(uuid,uuid,text,boolean),public.ay_auth_recovery_issued(uuid,uuid,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.ay_auth_recovery_authorize(uuid,uuid,text,boolean),public.ay_auth_recovery_issued(uuid,uuid,uuid) to service_role;
