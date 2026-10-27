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

-- Development SQL only. Requires original invite table + auth-phase3.sql. Not applied to production.
create function public.ay_auth_issue_invite(p_actor uuid,p_person uuid,p_phone text,p_hash text)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare person public.ay3_persons; unit uuid; expiry timestamptz:=now()+interval '7 days';
begin
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or person.auth_user_id is not null or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager') then raise exception 'Invite unavailable';end if;
 select unit_id into unit from public.ay3_links where person_id=p_person and site_id=person.site_id and active and role in ('owner','tenant') and (starts_on is null or starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (ends_on is null or ends_on>=(now() at time zone 'Europe/Istanbul')::date) order by unit_id limit 1;
 if unit is null then raise exception 'No current apartment';end if;
 update public.ay3_invite_tokens set revoked_at=now() where person_id=p_person and consumed_at is null and revoked_at is null;
 insert into public.ay3_invite_tokens(site_id,person_id,unit_id,issued_by,phone_e164,token_hash,expires_at) values(person.site_id,p_person,unit,p_actor,p_phone,p_hash,expiry);
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(person.site_id,p_actor,'invite_created',p_person,jsonb_build_object('expires_at',expiry));
 return expiry;
end;$$;
create function public.ay_auth_revoke_invites(p_actor uuid,p_person uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare person public.ay3_persons;
begin
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager') then raise exception 'Access denied';end if;
 update public.ay3_invite_tokens set revoked_at=now() where person_id=p_person and consumed_at is null and revoked_at is null;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(person.site_id,p_actor,'invite_revoked',p_person,'{}');
end;$$;
revoke all on function public.ay_auth_issue_invite(uuid,uuid,text,text),public.ay_auth_revoke_invites(uuid,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.ay_auth_issue_invite(uuid,uuid,text,text),public.ay_auth_revoke_invites(uuid,uuid) to service_role;

create or replace function public.ay3_redeem_phone_invite(p_token_hash text,p_user uuid)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare ticket public.ay3_invite_tokens; resident public.ay3_persons;
begin
 select * into ticket from public.ay3_invite_tokens where token_hash=p_token_hash;
 if not found then raise exception 'Invite unavailable';end if;
 -- Same lock order as issue/revoke: person, then token.
 perform 1 from public.ay3_persons where id=ticket.person_id for update;
 select * into ticket from public.ay3_invite_tokens where token_hash=p_token_hash for update;
 if not found or ticket.consumed_at is not null or ticket.revoked_at is not null or ticket.expires_at<=now()
 then raise exception 'Invite expired or already used'; end if;
 if not exists(select 1 from public.site_staff_memberships s
   where s.site_id=ticket.site_id and s.user_id=ticket.issued_by and s.role='manager')
 then raise exception 'Issuer no longer authorized'; end if;
 select * into resident from public.ay3_persons
   where id=ticket.person_id and site_id=ticket.site_id for update;
 if not found or resident.auth_user_id is not null
 then raise exception 'Resident already linked'; end if;
 if not exists(select 1 from public.ay3_links l where l.person_id=ticket.person_id
   and l.site_id=ticket.site_id and l.unit_id=ticket.unit_id and l.role in ('owner','tenant')
   and l.active and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date)
   and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date))
 then raise exception 'No current apartment'; end if;
 if exists(select 1 from public.ay3_persons p where p.auth_user_id=p_user and p.id<>ticket.person_id)
 then raise exception 'Account already linked elsewhere'; end if;
 update public.ay3_persons set auth_user_id=p_user, phone=ticket.phone_e164
 where id=ticket.person_id;
 insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
 select distinct l.unit_id,p_user,l.role,null::uuid,true from public.ay3_links l
 where l.person_id=ticket.person_id and l.site_id=ticket.site_id
   and l.role in ('owner','tenant') and l.active
   and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date)
   and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date)
 on conflict(unit_id,user_id,role) do update set active=true;
 perform public.ay_auth_bind_phone(ticket.issued_by,ticket.person_id,ticket.phone_e164,'Administrator confirmed and delivered personal invitation',true);
 update public.ay3_invite_tokens set consumed_at=now() where id=ticket.id;
 update public.ay3_invite_tokens set revoked_at=now()
 where person_id=ticket.person_id and id<>ticket.id and consumed_at is null and revoked_at is null;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(ticket.site_id,ticket.issued_by,'whatsapp_invite_activated',ticket.person_id,
 jsonb_build_object('unit_id',ticket.unit_id));
 return jsonb_build_object('ok',true,'person_id',ticket.person_id);
end;
$$;
revoke all on function public.ay3_redeem_phone_invite(text,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.ay3_redeem_phone_invite(text,uuid) to service_role;

-- Development only; service-only RPCs. Requires auth-phase3.sql and invite table.
create table public.ay_access_requests(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 first_name text not null check(length(btrim(first_name)) between 1 and 70),last_name text not null check(length(btrim(last_name)) between 1 and 70),
 contact_kind text not null check(contact_kind in ('phone','email')),contact text not null check(length(contact) between 5 and 254),
 unit_hint text not null default '' check(unit_hint='' or unit_hint ~ '^[AB]-(10|[1-9])$'),
 status text not null default 'new' check(status in ('new','review','approved','sent','activated','rejected')),
 person_id uuid references public.ay3_persons(id),created_at timestamptz not null default now(),read_at timestamptz,
 updated_at timestamptz not null default now(),updated_by uuid,version int not null default 1
);
create unique index ay_access_pending_contact on public.ay_access_requests(site_id,contact_kind,lower(contact)) where status in ('new','review','approved','sent');
alter table public.ay_access_requests enable row level security;
revoke all on public.ay_access_requests from PUBLIC,anon,authenticated;
grant select,insert,update on public.ay_access_requests to service_role;
create function public.ay_access_submit(p_site uuid,p_first text,p_last text,p_kind text,p_contact text,p_unit text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_kind='phone' and p_contact !~ '^\+[1-9][0-9]{9,14}$' or p_kind='email' and p_contact !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid contact';end if;
 insert into public.ay_access_requests(site_id,first_name,last_name,contact_kind,contact,unit_hint)
 values(p_site,p_first,p_last,p_kind,p_contact,p_unit) on conflict do nothing;
end;$$;
create function public.ay_access_list(p_site uuid,p_actor uuid,p_offset int default 0) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.site_staff_memberships where site_id=p_site and user_id=p_actor and role='manager') then raise exception 'Access denied' using errcode='42501';end if;
 if p_offset<0 or p_offset>100000 then raise exception 'Invalid page';end if;
 return jsonb_build_object('total',(select count(*) from public.ay_access_requests where site_id=p_site),'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (select * from public.ay_access_requests where site_id=p_site order by created_at desc,id desc limit 200 offset p_offset)r),'[]'),'open',(select count(*) from public.ay_access_requests where site_id=p_site and status not in ('activated','rejected')),'unread',(select count(*) from public.ay_access_requests where site_id=p_site and read_at is null));
end;$$;
create function public.ay_access_update(p_site uuid,p_actor uuid,p_id uuid,p_version int,p_action text,p_person uuid,p_confirm boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.ay_access_requests; person public.ay3_persons; next_status text;
begin
 if not exists(select 1 from public.site_staff_memberships where site_id=p_site and user_id=p_actor and role='manager') then raise exception 'Access denied' using errcode='42501';end if;
 select * into r from public.ay_access_requests where id=p_id and site_id=p_site;
 if not found then raise exception 'Unknown request';end if;
 perform 1 from public.ay3_persons where id=coalesce(p_person,r.person_id) for update;
 select * into r from public.ay_access_requests where id=p_id and site_id=p_site for update;
 if not found or r.version<>p_version then raise exception 'Stale request';end if;
 if p_action='read' then update public.ay_access_requests set read_at=coalesce(read_at,now()),version=version+1 where id=r.id;return;end if;
 if p_confirm is distinct from true then raise exception 'Confirmation required';end if;
 if p_action='review' and r.status='new' then next_status:='review';
 elsif p_action='reject' and r.status in ('new','review','approved','sent') then next_status:='rejected';
 elsif p_action='approve' and r.status in ('new','review') then
  select * into person from public.ay3_persons where id=p_person and site_id=p_site for update;
  if not found or person.auth_user_id is not null or not exists(select 1 from public.ay3_links where person_id=p_person and site_id=p_site and active and role in ('owner','tenant') and (starts_on is null or starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (ends_on is null or ends_on>=(now() at time zone 'Europe/Istanbul')::date)) then raise exception 'Check person and current apartment';end if;
  next_status:='approved';
 elsif p_action='sent' and r.status='approved' and exists(select 1 from public.ay3_invite_tokens where person_id=r.person_id and revoked_at is null and consumed_at is null and expires_at>now()) then next_status:='sent';
 else raise exception 'Invalid transition';end if;
 if next_status='rejected' and r.person_id is not null then perform public.ay_auth_revoke_invites(p_actor,r.person_id);end if;
 update public.ay_access_requests set status=next_status,person_id=case when next_status='approved' then p_person else person_id end,read_at=coalesce(read_at,now()),updated_at=now(),updated_by=p_actor,version=version+1 where id=r.id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,p_actor,'access_request_'||p_action,r.id,jsonb_build_object('status',next_status,'person_id',case when next_status='approved' then p_person else r.person_id end));
end;$$;
revoke all on function public.ay_access_submit(uuid,text,text,text,text,text),public.ay_access_list(uuid,uuid,int),public.ay_access_update(uuid,uuid,uuid,int,text,uuid,boolean) from PUBLIC,anon,authenticated;
grant execute on function public.ay_access_submit(uuid,text,text,text,text,text),public.ay_access_list(uuid,uuid,int),public.ay_access_update(uuid,uuid,uuid,int,text,uuid,boolean) to service_role;
-- Server-only activation status. The public admin API cannot set activated.
create function ay_auth_private.request_activated() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.consumed_at is not null and old.consumed_at is null then
 update public.ay_access_requests set status='activated',updated_at=now(),version=version+1 where person_id=new.person_id and site_id=new.site_id and status in ('approved','sent');end if;return new;
end;$$;
revoke all on function ay_auth_private.request_activated() from PUBLIC,anon,authenticated;
create trigger ay_access_invite_consumed after update on public.ay3_invite_tokens for each row execute function ay_auth_private.request_activated();

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

-- Development integration draft; requires auth phases 3, 4 and 5. Never applied to production.
alter table public.ay3_invite_tokens alter column phone_e164 drop not null;
alter table public.ay3_invite_tokens add column email text;
alter table public.ay3_invite_tokens add constraint ay_invite_one_contact check (
 (phone_e164 is not null and email is null) or
 (phone_e164 is null and email is not null and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'));
create function public.ay_auth_issue_email_invite(p_actor uuid,p_person uuid,p_email text,p_hash text)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare person public.ay3_persons; unit uuid; expiry timestamptz:=now()+interval '7 days'; contact text:=lower(btrim(p_email));
begin
 if contact is null or length(contact)>254 or contact !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid contact';end if;
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or person.auth_user_id is not null or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager') then raise exception 'Invite unavailable';end if;
 select unit_id into unit from public.ay3_links where person_id=p_person and site_id=person.site_id and active and role in ('owner','tenant') and (starts_on is null or starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (ends_on is null or ends_on>=(now() at time zone 'Europe/Istanbul')::date) order by unit_id limit 1;
 if unit is null then raise exception 'No current apartment';end if;
 update public.ay3_invite_tokens set revoked_at=now() where person_id=p_person and consumed_at is null and revoked_at is null;
 insert into public.ay3_invite_tokens(site_id,person_id,unit_id,issued_by,email,token_hash,expires_at) values(person.site_id,p_person,unit,p_actor,contact,p_hash,expiry);
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(person.site_id,p_actor,'invite_created',p_person,jsonb_build_object('expires_at',expiry,'contact_kind','email'));
 return expiry;
end;$$;
revoke all on function public.ay_auth_issue_email_invite(uuid,uuid,text,text) from PUBLIC,anon,authenticated;
grant execute on function public.ay_auth_issue_email_invite(uuid,uuid,text,text) to service_role;

create or replace function public.ay3_redeem_phone_invite(p_token_hash text,p_user uuid)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare ticket public.ay3_invite_tokens; resident public.ay3_persons;
begin
 select * into ticket from public.ay3_invite_tokens where token_hash=p_token_hash;
 if not found then raise exception 'Invite unavailable';end if;
 -- Same lock order as issue/revoke: person, then token.
 perform 1 from public.ay3_persons where id=ticket.person_id for update;
 select * into ticket from public.ay3_invite_tokens where token_hash=p_token_hash for update;
 if not found or ticket.consumed_at is not null or ticket.revoked_at is not null or ticket.expires_at<=now()
 then raise exception 'Invite expired or already used'; end if;
 if not exists(select 1 from public.site_staff_memberships s
   where s.site_id=ticket.site_id and s.user_id=ticket.issued_by and s.role='manager')
 then raise exception 'Issuer no longer authorized'; end if;
 select * into resident from public.ay3_persons
   where id=ticket.person_id and site_id=ticket.site_id for update;
 if not found or resident.auth_user_id is not null
 then raise exception 'Resident already linked'; end if;
 if not exists(select 1 from public.ay3_links l where l.person_id=ticket.person_id
   and l.site_id=ticket.site_id and l.unit_id=ticket.unit_id and l.role in ('owner','tenant')
   and l.active and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date)
   and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date))
 then raise exception 'No current apartment'; end if;
 if exists(select 1 from public.ay3_persons p where p.auth_user_id=p_user and p.id<>ticket.person_id)
 then raise exception 'Account already linked elsewhere'; end if;
 update public.ay3_persons set auth_user_id=p_user, phone=coalesce(ticket.phone_e164,phone), email=coalesce(ticket.email,email)
 where id=ticket.person_id;
 insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
 select distinct l.unit_id,p_user,l.role,null::uuid,true from public.ay3_links l
 where l.person_id=ticket.person_id and l.site_id=ticket.site_id
   and l.role in ('owner','tenant') and l.active
   and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date)
   and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date)
 on conflict(unit_id,user_id,role) do update set active=true;
 if ticket.phone_e164 is not null then
  perform public.ay_auth_bind_phone(ticket.issued_by,ticket.person_id,ticket.phone_e164,'Administrator confirmed and delivered personal invitation',true);
 end if;
 update public.ay3_invite_tokens set consumed_at=now() where id=ticket.id;
 update public.ay3_invite_tokens set revoked_at=now()
 where person_id=ticket.person_id and id<>ticket.id and consumed_at is null and revoked_at is null;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(ticket.site_id,ticket.issued_by,'whatsapp_invite_activated',ticket.person_id,
 jsonb_build_object('unit_id',ticket.unit_id));
 return jsonb_build_object('ok',true,'person_id',ticket.person_id);
end;
$$;
revoke all on function public.ay3_redeem_phone_invite(text,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.ay3_redeem_phone_invite(text,uuid) to service_role;
