CREATE OR REPLACE FUNCTION public.ay3_redeem_phone_invite(p_token_hash text, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 select distinct l.unit_id,p_user,l.role,null::uuid,true from public.ay3_links l
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
$function$
