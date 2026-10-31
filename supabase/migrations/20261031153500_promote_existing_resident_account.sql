-- Existing resident accounts may receive additional management duties. Never create a second Auth user.
-- Service-role-only authorization: the role change itself still requires the existing explicit
-- management confirmation in ay3-user-access and the manager membership check below.
begin;
create or replace function ay2_private.access_target(p_actor uuid,p_person uuid,p_role text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
 p public.ay3_persons;
 u uuid;
 normalized_email text;
 account_email text;
begin
 select * into p from public.ay3_persons where id=p_person;
 if p.id is null or not exists(
  select 1 from public.site_staff_memberships m
  where m.site_id=p.site_id and m.user_id=p_actor and m.role='manager'
 ) then raise exception 'Access denied' using errcode='42501';end if;

 if p.archived_at is not null then raise exception 'Archived person';end if;
 if p_role not in ('resident','deputy','manager') then raise exception 'Person or role incomplete';end if;

 if p_role='resident' and not exists(
  select 1 from public.ay3_links l
  where l.person_id=p.id and l.site_id=p.site_id and l.role in ('owner','tenant') and l.active
 ) then raise exception 'Current apartment required';end if;

 normalized_email:=lower(btrim(coalesce(p.email,'')));

 if p.auth_user_id is not null then
  -- Explicitly linked, established identity is authoritative even if it uses phone
  -- login and has no e-mail address in the people directory.
  select a.id,a.email into u,account_email from auth.users a where a.id=p.auth_user_id;
  if u is null then raise exception 'Account mismatch';end if;
 else
  -- Only an unlinked person needs an e-mail address to locate/create an Auth account.
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  then raise exception 'Person or role incomplete';end if;
  select a.id,a.email into u,account_email from auth.users a
   where lower(btrim(a.email))=normalized_email limit 1;
 end if;

 if u is not null and exists(
  select 1 from public.ay3_persons other_person
  where other_person.site_id=p.site_id and other_person.id<>p.id
    and other_person.auth_user_id=u
 ) then raise exception 'Account mismatch';end if;

 return jsonb_build_object(
  'email',coalesce(nullif(lower(btrim(account_email)),''),normalized_email),
  'user_id',u
 );
end;
$function$;
revoke all on function ay2_private.access_target(uuid,uuid,text) from public,anon,authenticated;
grant execute on function ay2_private.access_target(uuid,uuid,text) to service_role;
commit;
