-- WhatsApp invitations: no email address required. Service-role-only token store.
create table if not exists public.ay3_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.site_sites(id),
  person_id uuid not null references public.ay3_persons(id),
  unit_id uuid not null references public.site_units(id),
  issued_by uuid not null,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{9,14}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz
);
create index if not exists ay3_invite_tokens_person on public.ay3_invite_tokens(person_id,created_at desc);
alter table public.ay3_invite_tokens enable row level security;
revoke all on public.ay3_invite_tokens from PUBLIC, anon, authenticated;
grant select,insert,update on public.ay3_invite_tokens to service_role;

create or replace function public.ay3_redeem_phone_invite(p_token_hash text,p_user uuid)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare ticket public.ay3_invite_tokens; resident public.ay3_persons;
begin
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
 select distinct l.unit_id,p_user,l.role,null,true from public.ay3_links l
 where l.person_id=ticket.person_id and l.site_id=ticket.site_id
   and l.role in ('owner','tenant') and l.active
   and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date)
   and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date)
 on conflict(unit_id,user_id,role) do update set active=true;
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
