CREATE OR REPLACE FUNCTION ay2_private.access_target(p_actor uuid, p_person uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.ay3_persons; u uuid;
begin
 select * into p from public.ay3_persons where id=p_person;
 if p.id is null or not exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_actor and role='manager') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_role not in ('resident','deputy','manager') or coalesce(p.email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Person or role incomplete';end if;
 if p_role='resident' and not exists(select 1 from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and (starts_on is null or starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (ends_on is null or ends_on>=(now() at time zone 'Europe/Istanbul')::date)) then raise exception 'Current apartment required';end if;
 select id into u from auth.users where lower(email)=lower(btrim(p.email));
 if p.auth_user_id is not null and p.auth_user_id is distinct from u then raise exception 'Account mismatch';end if;
 return jsonb_build_object('email',lower(btrim(p.email)),'user_id',u);
end;$function$;

CREATE OR REPLACE FUNCTION public.ay3_provision_access(p_actor uuid, p_person uuid, p_user uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p public.ay3_persons; target jsonb;
begin
 select * into p from public.ay3_persons where id=p_person for update;
 target:=public.ay3_access_target(p_actor,p_person,p_role);
 if (target->>'user_id')::uuid is distinct from p_user then raise exception 'Account mismatch';end if;
 -- Do not silently change existing management roles through resident provisioning.
 if p_role='resident' and exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_user) then raise exception 'Existing management role must be reviewed';end if;
 if p_role in ('manager','deputy') and exists(select 1 from public.site_staff_memberships where site_id=p.site_id and user_id=p_user and role<>p_role) then raise exception 'Existing management role must be reviewed';end if;
 update public.ay3_persons set auth_user_id=p_user where id=p.id;
 insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
 select unit_id,p_user,role,p.id,true from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and (starts_on is null or starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (ends_on is null or ends_on>=(now() at time zone 'Europe/Istanbul')::date)
 on conflict(unit_id,user_id,role) do update set person_id=excluded.person_id,active=true;
 if p_role in ('manager','deputy') then insert into public.site_staff_memberships(site_id,user_id,role) values(p.site_id,p_user,p_role) on conflict(site_id,user_id) do nothing;end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p.site_id,p_actor,'user_access',p.id,jsonb_build_object('role',p_role));
 return jsonb_build_object('ok',true);
end;$function$;
