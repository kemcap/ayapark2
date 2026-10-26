-- Reviewed development SQL, NOT applied to production. Promote through CLI migration new after staging validation.
create schema if not exists ay_auth_private;
revoke all on schema ay_auth_private from PUBLIC,anon,authenticated;
create table ay_auth_private.phone_contacts(
 phone text primary key check(phone ~ '^\+[1-9][0-9]{9,14}$'),
 user_id uuid not null references auth.users(id),
 site_id uuid not null references public.site_sites(id),
 person_id uuid not null references public.ay3_persons(id),
 verified_by uuid not null references auth.users(id),
 verified_at timestamptz not null default now(),
 reason text not null check(length(btrim(reason)) between 5 and 500),
 active boolean not null default true
);
alter table ay_auth_private.phone_contacts enable row level security;
create index on ay_auth_private.phone_contacts(user_id);
create table ay_auth_private.login_limits(
 bucket text primary key check(bucket ~ '^(phone|ip|global):[a-f0-9]{64}$'),
 window_start timestamptz not null default now(), hits int not null default 0
);
alter table ay_auth_private.login_limits enable row level security;
-- Only the service-backed Edge function calls these entry points.
create function public.ay_auth_phone_lookup(p_phone text) returns uuid
language sql security definer set search_path='' as $$
 select user_id from ay_auth_private.phone_contacts where phone=p_phone and active;
$$;
create function public.ay_auth_bind_phone(p_actor uuid,p_person uuid,p_phone text,p_reason text,p_active boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare target public.ay3_persons; previous ay_auth_private.phone_contacts;
begin
 select * into target from public.ay3_persons where id=p_person for update;
 if not found or target.auth_user_id is null or not exists(select 1 from public.site_staff_memberships
 where site_id=target.site_id and user_id=p_actor and role='manager') then raise exception 'Access denied' using errcode='42501';end if;
 -- Never derive identity from a user-editable profile or change an existing account link.
 perform pg_advisory_xact_lock(hashtextextended(p_phone,0));
 select * into previous from ay_auth_private.phone_contacts where phone=p_phone for update;
 if found and previous.user_id<>target.auth_user_id then raise exception 'Contact already assigned';end if;
 insert into ay_auth_private.phone_contacts(phone,user_id,site_id,person_id,verified_by,reason,active)
 values(p_phone,target.auth_user_id,target.site_id,target.id,p_actor,p_reason,p_active)
 on conflict(phone) do update set verified_by=p_actor,verified_at=now(),reason=p_reason,active=p_active;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(target.site_id,p_actor,case when p_active then 'phone_login_verified' else 'phone_login_revoked' end,target.id,jsonb_build_object('user_id',target.auth_user_id));
end;$$;
create function public.ay_auth_login_limit(p_bucket text,p_limit int) returns boolean
language plpgsql security definer set search_path='' as $$
declare n int;
begin
 if p_limit not between 1 and 1000 then raise exception 'Invalid limit';end if;
 insert into ay_auth_private.login_limits(bucket,hits) values(p_bucket,1)
 on conflict(bucket) do update set hits=case when ay_auth_private.login_limits.window_start<=now()-interval '15 minutes' then 1 else least(ay_auth_private.login_limits.hits+1,1001) end,
 window_start=case when ay_auth_private.login_limits.window_start<=now()-interval '15 minutes' then now() else ay_auth_private.login_limits.window_start end returning hits into n;
 return n<=p_limit;
end;$$;
revoke all on function public.ay_auth_phone_lookup(text),public.ay_auth_bind_phone(uuid,uuid,text,text,boolean),public.ay_auth_login_limit(text,int) from PUBLIC,anon,authenticated;
grant execute on function public.ay_auth_phone_lookup(text),public.ay_auth_bind_phone(uuid,uuid,text,text,boolean),public.ay_auth_login_limit(text,int) to service_role;
-- Retention: a trusted scheduled job should delete expired login_limits rows (older than 24h).
-- No automatic contact backfill: a recorded phone number is not an identity proof.
