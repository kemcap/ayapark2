-- Email-free resident onboarding by one-time, expiring WhatsApp invitation.
-- This RPC is never exposed to browser roles, only to the service_role backend.
create or replace function public.ay3_activate_phone_invite(
  p_actor uuid,
  p_person uuid,
  p_site uuid,
  p_unit uuid,
  p_user uuid,
  p_phone text
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare target public.ay3_persons;
begin
  if p_phone !~ '^\+[1-9][0-9]{9,14}$' then
    raise exception 'Invalid phone';
  end if;
  if not exists (
    select 1 from public.site_staff_memberships m
    where m.site_id=p_site and m.user_id=p_actor and m.role='manager'
  ) then raise exception 'Management authorization required'; end if;
  if not exists (
    select 1 from auth.users u
    where u.id=p_user and u.phone=p_phone and u.phone_confirmed_at is not null
  ) then raise exception 'Authenticated account mismatch'; end if;
  select * into target from public.ay3_persons
    where id=p_person and site_id=p_site for update;
  if not found or target.auth_user_id is not null then
    raise exception 'Person account unavailable';
  end if;
  if not exists (
    select 1 from public.ay3_links l
    where l.person_id=p_person and l.site_id=p_site and l.unit_id=p_unit
      and l.role in ('owner','tenant') and l.active
      and (l.starts_on is null or l.starts_on<=current_date)
      and (l.ends_on is null or l.ends_on>=current_date)
  ) then raise exception 'Active apartment relationship required'; end if;
  if exists (
    select 1 from public.ay3_persons other
    where other.auth_user_id=p_user and other.id<>p_person
  ) then raise exception 'Account already bound'; end if;
  update public.ay3_persons
  set auth_user_id=p_user, phone=case when trim(phone)='' then p_phone else phone end
  where id=p_person;
  insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
  select distinct l.unit_id,p_user,l.role,null,true from public.ay3_links l
  where l.person_id=p_person and l.site_id=p_site and l.role in ('owner','tenant') and l.active
    and (l.starts_on is null or l.starts_on<=current_date)
    and (l.ends_on is null or l.ends_on>=current_date)
  on conflict(unit_id,user_id,role) do update set active=true;
  insert into public.ay2_audit(site_id,actor,action,entity_id,details)
    values(p_site,p_actor,'resident_whatsapp_activation',p_person,jsonb_build_object('unit',p_unit));
  return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.ay3_activate_phone_invite(uuid,uuid,uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.ay3_activate_phone_invite(uuid,uuid,uuid,uuid,uuid,text) to service_role;
