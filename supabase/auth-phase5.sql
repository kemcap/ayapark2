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
