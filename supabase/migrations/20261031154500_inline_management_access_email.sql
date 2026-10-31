-- One-form e-mail capture for an existing person who does not yet have an Auth account.
-- A privileged manager chooses the person; identity conflicts must never be merged.
begin;
create or replace function ay2_private.access_target_inline_email(p_actor uuid,p_person uuid,p_role text,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 p public.ay3_persons;
 em text:=lower(btrim(coalesce(p_email,'')));
 u uuid;
begin
 select * into p from public.ay3_persons where id=p_person;
 if p.id is null or not exists(select 1 from public.site_staff_memberships m
   where m.site_id=p.site_id and m.user_id=p_actor and m.role='manager')
 then raise exception 'Access denied' using errcode='42501';end if;
 if p.archived_at is not null then raise exception 'Archived person';end if;
 if p_role not in ('resident','deputy','manager') then raise exception 'Person or role incomplete';end if;
 if p.auth_user_id is not null or coalesce(btrim(p.email),'') ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
  if em<>'' and em is distinct from lower(btrim(coalesce(p.email,'')))
  then raise exception 'Existing account email must be managed separately';end if;
  return ay2_private.access_target(p_actor,p_person,p_role);
 end if;
 if em !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(em)>254
 then raise exception 'Email required for new account';end if;
 if p_role='resident' and not exists(select 1 from public.ay3_links l
  where l.person_id=p.id and l.site_id=p.site_id and l.role in ('owner','tenant') and l.active)
 then raise exception 'Current apartment required';end if;
 -- Never override the identity of another listed person or link to another person's Auth account.
 if exists(select 1 from public.ay3_persons other_person where other_person.site_id=p.site_id
  and other_person.id<>p.id and lower(btrim(coalesce(other_person.email,'')))=em)
 then raise exception 'Email already assigned';end if;
 select a.id into u from auth.users a where lower(btrim(a.email))=em limit 1;
 if u is not null and exists(select 1 from public.ay3_persons other_person
  where other_person.site_id=p.site_id and other_person.id<>p.id and other_person.auth_user_id=u)
 then raise exception 'Account mismatch';end if;
 return jsonb_build_object('email',em,'user_id',u);
end;
$fn$;
revoke all on function ay2_private.access_target_inline_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function ay2_private.access_target_inline_email(uuid,uuid,text,text) to service_role;

create or replace function public.ay3_access_target_inline_email(p_actor uuid,p_person uuid,p_role text,p_email text)
returns jsonb language sql security invoker set search_path='' as $fn$
 select ay2_private.access_target_inline_email(p_actor,p_person,p_role,p_email);
$fn$;
revoke all on function public.ay3_access_target_inline_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ay3_access_target_inline_email(uuid,uuid,text,text) to service_role;

create or replace function public.ay3_provision_access_inline_email(p_actor uuid,p_person uuid,p_user uuid,p_role text,p_email text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 p public.ay3_persons;
 target jsonb;
 em text:=lower(btrim(coalesce(p_email,'')));
 result jsonb;
begin
 select * into p from public.ay3_persons where id=p_person for update;
 target:=public.ay3_access_target_inline_email(p_actor,p_person,p_role,em);
 if (target->>'user_id')::uuid is distinct from p_user then raise exception 'Account mismatch';end if;
 if p.auth_user_id is not null or coalesce(btrim(p.email),'') ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 then raise exception 'Existing account email must be managed separately';end if;
 if em is distinct from (target->>'email') then raise exception 'Email changed';end if;
 update public.ay3_persons set email=em where id=p_person and site_id=p.site_id
  and auth_user_id is null;
 result:=public.ay3_provision_access(p_actor,p_person,p_user,p_role);
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(p.site_id,p_actor,'person',p.id,jsonb_build_object('source','inline_management_access','updated_fields',jsonb_build_array('email')));
 return result;
end;
$fn$;
revoke all on function public.ay3_provision_access_inline_email(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ay3_provision_access_inline_email(uuid,uuid,uuid,text,text) to service_role;
commit;
