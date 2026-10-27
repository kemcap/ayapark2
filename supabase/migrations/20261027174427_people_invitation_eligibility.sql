-- Eligibility changes only. Existing people, accounts, charges and assignments are unchanged.
CREATE OR REPLACE FUNCTION ay2_private.invite_pending(p_user uuid,p_contact text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NULL OR EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_user AND lower(u.email)=lower(p_contact)
 AND (coalesce(u.encrypted_password,'')='' OR (u.email_confirmed_at IS NULL AND u.phone_confirmed_at IS NULL)) AND u.last_sign_in_at IS NULL AND u.deleted_at IS NULL
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND NOT EXISTS(SELECT 1 FROM public.site_staff_memberships WHERE user_id=p_user));
$$;
REVOKE ALL ON FUNCTION ay2_private.invite_pending(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.invite_pending(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.ay_auth_invite_pending(p_user uuid,p_contact text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT ay2_private.invite_pending(p_user,p_contact); $$;
REVOKE ALL ON FUNCTION public.ay_auth_invite_pending(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ay_auth_invite_pending(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION ay2_private.invite_account_matches(p_user uuid,p_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=lower(p_email));
$$;
REVOKE ALL ON FUNCTION ay2_private.invite_account_matches(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.invite_account_matches(uuid,text) TO service_role;
-- Historical assignments permit account access, never current-resident privileges.
CREATE OR REPLACE FUNCTION ay2_private.invitable_link(l public.ay3_links)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT l.role IN ('owner','tenant','representative')
 AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
 AND coalesce(l.archive_reason,'') <> 'mistake';
$$;
REVOKE ALL ON FUNCTION ay2_private.invitable_link(public.ay3_links) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ay2_private.invitable_link(public.ay3_links) TO service_role;
ALTER TABLE public.site_resident_units DROP CONSTRAINT site_resident_units_role_check;
ALTER TABLE public.site_resident_units ADD CONSTRAINT site_resident_units_role_check CHECK(role IN ('owner','tenant','representative'));

CREATE OR REPLACE FUNCTION public.ay_auth_issue_invite(p_actor uuid, p_person uuid, p_phone text, p_hash text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare person public.ay3_persons; unit uuid; expiry timestamptz:=now()+interval '7 days';
begin
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or not ay2_private.invite_pending(person.auth_user_id,'resident-'||substring(p_phone from 2)||'@ayapark2.invalid') or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager') then raise exception 'Invite unavailable';end if;
 select unit_id into unit from public.ay3_links where person_id=p_person and site_id=person.site_id and ay2_private.invitable_link(ay3_links) order by unit_id limit 1;
 if unit is null then raise exception 'No eligible apartment relationship';end if;
 update public.ay3_invite_tokens set revoked_at=now() where person_id=p_person and consumed_at is null and revoked_at is null;
 insert into public.ay3_invite_tokens(site_id,person_id,unit_id,issued_by,phone_e164,token_hash,expires_at) values(person.site_id,p_person,unit,p_actor,p_phone,p_hash,expiry);
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(person.site_id,p_actor,'invite_created',p_person,jsonb_build_object('expires_at',expiry));
 return expiry;
end;$function$;

CREATE OR REPLACE FUNCTION public.ay_auth_issue_email_invite(p_actor uuid, p_person uuid, p_email text, p_hash text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare person public.ay3_persons; unit uuid; expiry timestamptz:=now()+interval '7 days'; contact text:=lower(btrim(p_email));
begin
 if contact is null or length(contact)>254 or contact !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid contact';end if;
 select * into person from public.ay3_persons where id=p_person for update;
 if not found or not ay2_private.invite_pending(person.auth_user_id,contact) or not exists(select 1 from public.site_staff_memberships where site_id=person.site_id and user_id=p_actor and role='manager') then raise exception 'Invite unavailable';end if;
 select unit_id into unit from public.ay3_links where person_id=p_person and site_id=person.site_id and ay2_private.invitable_link(ay3_links) order by unit_id limit 1;
 if unit is null then raise exception 'No eligible apartment relationship';end if;
 update public.ay3_invite_tokens set revoked_at=now() where person_id=p_person and consumed_at is null and revoked_at is null;
 insert into public.ay3_invite_tokens(site_id,person_id,unit_id,issued_by,email,token_hash,expires_at) values(person.site_id,p_person,unit,p_actor,contact,p_hash,expiry);
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(person.site_id,p_actor,'invite_created',p_person,jsonb_build_object('expires_at',expiry,'contact_kind','email'));
 return expiry;
end;$function$;

CREATE OR REPLACE FUNCTION public.ay3_redeem_phone_invite(p_token_hash text, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 if not found or (resident.auth_user_id is not null and (resident.auth_user_id<>p_user or not ay2_private.invite_pending(p_user,coalesce(ticket.email,'resident-'||substring(ticket.phone_e164 from 2)||'@ayapark2.invalid'))))
 then raise exception 'Resident already linked'; end if;
 if not exists(select 1 from public.ay3_links l where l.person_id=ticket.person_id
   and l.site_id=ticket.site_id and l.unit_id=ticket.unit_id and ay2_private.invitable_link(l))
 then raise exception 'No eligible apartment relationship'; end if;
 if exists(select 1 from public.ay3_persons p where p.auth_user_id=p_user and p.id<>ticket.person_id)
 then raise exception 'Account already linked elsewhere'; end if;
 if not ay2_private.invite_account_matches(p_user,coalesce(ticket.email,'resident-'||substring(ticket.phone_e164 from 2)||'@ayapark2.invalid'))
 then raise exception 'Account contact mismatch'; end if;
 update public.ay3_persons set auth_user_id=p_user, phone=coalesce(ticket.phone_e164,phone), email=coalesce(ticket.email,email)
 where id=ticket.person_id;
 insert into public.site_resident_units(unit_id,user_id,role,person_id,active)
 select distinct l.unit_id,p_user,l.role,null::uuid,true from public.ay3_links l
 where l.person_id=ticket.person_id and l.site_id=ticket.site_id
   and ay2_private.invitable_link(l)
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
$function$;

GRANT USAGE ON SCHEMA ay2_private TO service_role;

create or replace function public.ay_access_update(p_site uuid,p_actor uuid,p_id uuid,p_version int,p_action text,p_person uuid,p_confirm boolean) returns void
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
  if not found or not ay2_private.invite_pending(person.auth_user_id,case when r.contact_kind='email' then r.contact else 'resident-'||substring(r.contact from 2)||'@ayapark2.invalid' end) or not exists(select 1 from public.ay3_links where person_id=p_person and site_id=p_site and ay2_private.invitable_link(ay3_links)) then raise exception 'Check person and eligible relationship';end if;
  next_status:='approved';
 elsif p_action='sent' and r.status='approved' and exists(select 1 from public.ay3_invite_tokens where person_id=r.person_id and revoked_at is null and consumed_at is null and expires_at>now()) then next_status:='sent';
 else raise exception 'Invalid transition';end if;
 if next_status='rejected' and r.person_id is not null then perform public.ay_auth_revoke_invites(p_actor,r.person_id);end if;
 update public.ay_access_requests set status=next_status,person_id=case when next_status='approved' then p_person else person_id end,read_at=coalesce(read_at,now()),updated_at=now(),updated_by=p_actor,version=version+1 where id=r.id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,p_actor,'access_request_'||p_action,r.id,jsonb_build_object('status',next_status,'person_id',case when next_status='approved' then p_person else r.person_id end));
end;$$;
