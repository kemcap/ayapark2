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
