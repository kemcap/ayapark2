-- Definition-only recovery snapshot. Captured from production 2026-10-27.
-- Apply only in maintenance mode; review access revocations before restoring prior authorization.
CREATE OR REPLACE FUNCTION public.site_can_view_unit(target_unit_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_units su JOIN public.site_staff_memberships sm
   ON sm.site_id=su.site_id AND sm.user_id=(SELECT auth.uid())
  WHERE su.id=target_unit_id
 ) OR EXISTS(
  SELECT 1 FROM public.site_resident_units ru
  WHERE ru.unit_id=target_unit_id AND ru.user_id=(SELECT auth.uid()) AND ru.active=true
 );
$function$
;
CREATE OR REPLACE FUNCTION public.site_can_view_site(target_site_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.site_staff_memberships sm
  WHERE sm.site_id=target_site_id AND sm.user_id=(SELECT auth.uid())
 ) OR EXISTS(
  SELECT 1 FROM public.site_resident_units ru
  JOIN public.site_units su ON su.id=ru.unit_id
  WHERE su.site_id=target_site_id AND ru.user_id=(SELECT auth.uid()) AND ru.active=true
 );
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.own_unit(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.site_resident_units r where r.unit_id=u and r.user_id=auth.uid() and r.active);
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_charges x WHERE x.id=c AND (ay2_private.can(x.site_id,'finance') OR ay2_private.own_person(x.person_id) OR (x.person_id IS NOT NULL AND ay2_private.ay5_unit(x.unit_id)))); $function$
;
CREATE OR REPLACE FUNCTION ay2_private.own_person(p uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(select 1 from public.ay3_persons where id=p and auth_user_id=auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.financial_summary(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 return jsonb_build_object('source_last_date',(select max(booked_on) from public.ay2_entries where site_id=s),
 'opening_cents',(select opening_cents from public.ay2_settings where site_id=s and initialized),
 'balance_cents',(select opening_cents+coalesce((select sum(cents) from public.ay2_entries where site_id=s),0) from public.ay2_settings where site_id=s and initialized),
 'days',coalesce((select jsonb_agg(jsonb_build_object('date',d.booked_on,'income_cents',d.inc,'expense_cents',d.exp,'categories',d.cats) order by d.booked_on) from (
 select booked_on,sum(inc) inc,sum(exp) exp,jsonb_object_agg(category,exp) cats from (
 select e.booked_on,e.category,coalesce(sum(e.cents) filter(where e.cents>0),0) inc,coalesce(-sum(e.cents) filter(where e.cents<0),0) exp
 from public.ay2_entries e where e.site_id=s and e.reversal_of is null and e.category<>'Transfer' and not exists(select 1 from public.ay2_entries r where r.reversal_of=e.id)
 group by e.booked_on,e.category) bycat group by booked_on) d),'[]'::jsonb));end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when auth.uid() is not null and ay2_private.can(s,'finance') then coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name)) from public.ay3_persons where site_id=s),'[]'::jsonb) else '[]'::jsonb end;
$function$
;
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
 if p_role='resident' and not exists(select 1 from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and active) then raise exception 'Current apartment required';end if;
 select id into u from auth.users where lower(email)=lower(btrim(p.email));
 if p.auth_user_id is not null and p.auth_user_id is distinct from u then raise exception 'Account mismatch';end if;
 return jsonb_build_object('email',lower(btrim(p.email)),'user_id',u);
end;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.provider_directory(s uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'contact',p.contact,'phone',p.phone,'email',p.email,'status',p.status) order by p.name) from public.ay3_providers p where p.site_id=s and p.status<>'avoid'),'[]'::jsonb);
end;$function$
;
CREATE OR REPLACE FUNCTION ay2_private.ay5_unit(u uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id WHERE l.unit_id=u AND p.auth_user_id=auth.uid() AND l.role IN ('owner','tenant','representative') AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date)); $function$
;
CREATE OR REPLACE FUNCTION ay2_private.ay5_receives(aid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_announcements a WHERE a.id=aid AND ay2_private.view_site(a.site_id) AND (ay2_private.can(a.site_id,'announcements') OR (a.published AND (a.starts_at IS NULL OR a.starts_at<=now()) AND (a.target_kind='all' OR EXISTS(
 SELECT 1 FROM public.ay3_links l JOIN public.ay3_persons p ON p.id=l.person_id JOIN public.site_units u ON u.id=l.unit_id JOIN public.site_blocks b ON b.id=u.block_id
 WHERE l.site_id=a.site_id AND p.auth_user_id=auth.uid() AND l.role IN ('owner','tenant','representative') AND l.active AND l.archived_at IS NULL AND (l.starts_on IS NULL OR l.starts_on<=current_date) AND (l.ends_on IS NULL OR l.ends_on>=current_date) AND (
 (a.target_kind='owners' AND (l.role='owner' OR l.role='representative' AND 'owners'=ANY(l.mandates))) OR
 (a.target_kind='residents' AND (l.role='tenant' OR l.role='representative' AND 'residents'=ANY(l.mandates))) OR
 (a.target_kind='representatives' AND l.role='representative') OR
 (a.target_kind='units' AND l.unit_id=ANY(a.target_units)) OR (a.target_kind='blocks' AND b.code=ANY(a.target_blocks)))))))); $function$
;
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
 select unit_id,p_user,role,NULL,true from public.ay3_links where person_id=p.id and site_id=p.site_id and role in ('owner','tenant') and active
 on conflict(unit_id,user_id,role) do update set active=true;
 if p_role in ('manager','deputy') then insert into public.site_staff_memberships(site_id,user_id,role) values(p.site_id,p_user,p_role) on conflict(site_id,user_id) do nothing;end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p.site_id,p_actor,'user_access',p.id,jsonb_build_object('role',p_role));
 return jsonb_build_object('ok',true);
end;$function$
;
CREATE OR REPLACE FUNCTION public.ay5_workspace(p_site uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
 result:=public.ay2_workspace(p_site);IF result IS NULL THEN RETURN NULL; END IF;
 result:=result||jsonb_build_object('exceptions',coalesce((SELECT jsonb_agg(x ORDER BY created_at DESC) FROM public.ay5_monthly_exceptions x WHERE site_id=p_site),'[]'::jsonb),'budget',(SELECT to_jsonb(x) FROM public.ay5_budget x WHERE site_id=p_site),'v5',true);
 IF NOT ay2_private.can(p_site,'finance') THEN result:=result||jsonb_build_object('entries',ay2_private.ay5_payments(p_site)); END IF;
 RETURN result;
END; $function$
;
CREATE OR REPLACE FUNCTION public.ay_auth_issue_invite(p_actor uuid, p_person uuid, p_phone text, p_hash text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end;$function$
;
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
$function$
;
CREATE OR REPLACE FUNCTION public.ay_auth_issue_email_invite(p_actor uuid, p_person uuid, p_email text, p_hash text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end;$function$
;
CREATE OR REPLACE FUNCTION public.ay3_manage_person_v2(p_site uuid, p_person uuid, p_mode text, p_note text, p_confirm boolean, p_revoke_access boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  target public.ay3_persons%ROWTYPE;
  detail text := btrim(coalesce(p_note,''));
  has_exceptions boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT ay2_private.can(p_site,'admin') THEN
    RAISE EXCEPTION 'Nur Superadmins duerfen Personen archivieren oder loeschen.' USING ERRCODE='42501';
  END IF;
  IF p_confirm IS DISTINCT FROM true OR p_person IS NULL OR p_mode IS NULL OR p_mode NOT IN ('archive','restore','delete') THEN
    RAISE EXCEPTION 'Bestaetigung und gueltige Aktion erforderlich.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
  SELECT * INTO target FROM public.ay3_persons
   WHERE site_id=p_site AND id=p_person FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person nicht gefunden.'; END IF;
  IF p_mode='restore' AND p_revoke_access IS TRUE THEN
    RAISE EXCEPTION 'Wiederherstellung kann keine Zugangsrechte entziehen.';
  END IF;
  -- Explicit site-access revocation for both archive and delete; auth.users remains intact.
  -- Staff access requires the separate management-membership workflow.
  IF target.auth_user_id IS NOT NULL AND p_revoke_access IS TRUE THEN
    IF target.auth_user_id = (SELECT auth.uid()) THEN
      RAISE EXCEPTION 'Eigenes Anmeldekonto kann hier nicht entzogen werden.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.site_staff_memberships
      WHERE site_id=p_site AND user_id=target.auth_user_id) THEN
      RAISE EXCEPTION 'Yönetim hesabı bağlı: Önce Ayarlar bölümünden yönetim üyeliğini kaldırın.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ay3_persons
      WHERE site_id=p_site AND id<>p_person AND auth_user_id=target.auth_user_id) THEN
      RAISE EXCEPTION 'Paylaşılan hesap: Aynı hesaba bağlı diğer kişilerin erişimi korunmalıdır.';
    END IF;
    DELETE FROM public.site_resident_units ru USING public.site_units su
     WHERE ru.unit_id=su.id AND su.site_id=p_site AND ru.user_id=target.auth_user_id;
  END IF;


  -- Linked accounts require explicit site-access revocation for permanent deletion.
  IF p_mode='delete' AND target.auth_user_id IS NOT NULL AND p_revoke_access IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Giriş hesabı bağlı: Site erişimini kaldırmayı ayrıca onaylayın.';
  END IF;

  IF p_mode='archive' THEN
    IF target.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Person ist bereits archiviert.'; END IF;
    IF char_length(detail) < 3 OR char_length(detail) > 500 THEN
      RAISE EXCEPTION 'Archivierungshinweis: 3 bis 500 Zeichen erforderlich.';
    END IF;
    UPDATE public.ay3_links SET active=false, archived_at=now(),
      archive_reason='person_archived', archive_note=detail,
      updated_at=now(),revision=revision+1
    WHERE site_id=p_site AND person_id=p_person AND active;
    UPDATE public.ay3_persons SET archived_at=now(),archive_note=detail
    WHERE site_id=p_site AND id=p_person;
    INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
    VALUES(p_site,auth.uid(),'person_archive',p_person,jsonb_build_object('note',detail));
    RETURN jsonb_build_object('ok',true,'mode','archive');
  ELSIF p_mode='restore' THEN
    IF target.archived_at IS NULL THEN RAISE EXCEPTION 'Person ist nicht archiviert.'; END IF;
    UPDATE public.ay3_persons SET archived_at=NULL,archive_note=NULL
    WHERE site_id=p_site AND id=p_person;
    INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
    VALUES(p_site,auth.uid(),'person_restore',p_person,'{}'::jsonb);
    -- Past apartment assignments intentionally stay historical.
    RETURN jsonb_build_object('ok',true,'mode','restore');
  END IF;

  -- Hard deletion is permitted only if no accounting row or source identity depends on the person.
  IF EXISTS(SELECT 1 FROM public.ay2_charges c
     WHERE c.site_id=p_site AND
       (c.person_id=p_person OR EXISTS (
          SELECT 1 FROM public.ay3_links l
          WHERE l.id=c.link_id AND l.site_id=p_site AND l.person_id=p_person
       )))
     OR EXISTS(SELECT 1 FROM public.ay3_credits c WHERE c.site_id=p_site AND c.person_id=p_person)
  THEN
    RAISE EXCEPTION 'Finanzvorgaenge vorhanden: Person nur archivieren; Buchungen bleiben unveraendert.';
  END IF;
  IF to_regclass('public.ay5_monthly_exceptions') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.ay5_monthly_exceptions WHERE site_id=$1 AND person_id=$2)'
    INTO has_exceptions USING p_site,p_person;
  END IF;
  IF has_exceptions THEN
    RAISE EXCEPTION 'Monatliche Finanz-Ausnahmen vorhanden: Person nur archivieren.';
  END IF;

  DELETE FROM public.ay3_invite_tokens WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay_access_requests WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM ay_auth_private.phone_contacts WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay3_match_rules WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay3_links WHERE site_id=p_site AND person_id=p_person;
  DELETE FROM public.ay2_audit WHERE site_id=p_site AND entity_id=p_person
    AND action IN ('person','person_archive','person_restore');
  DELETE FROM public.ay3_persons WHERE site_id=p_site AND id=p_person;
  -- Audit only the operation, without retaining the deleted person's name or ID.
  INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details)
  VALUES(p_site,auth.uid(),'person_purge',NULL,'{"personal_details_retained":false}'::jsonb);
  RETURN jsonb_build_object('ok',true,'mode','delete');
END
$function$
;
alter policy "occupancy_read" on public."ay3_occupancy_changes" using ((EXISTS ( SELECT 1
   FROM site_units u
  WHERE ((u.id = ay3_occupancy_changes.unit_id) AND (u.site_id = ay3_occupancy_changes.site_id)))));

alter policy "ay2_reports_read" on public."ay2_reports" using (ay2_private.view_site(site_id));

alter policy "ay2_charges_read" on public."ay2_charges" using ((ay2_private.can(site_id, 'finance'::text) OR ay2_private.own_person(person_id) OR ((person_id IS NOT NULL) AND ay2_private.ay5_unit(unit_id))));

alter policy "ay3_credits_read" on public."ay3_credits" using ((ay2_private.can(site_id, 'finance'::text) OR ay2_private.own_person(person_id) OR ay2_private.ay5_unit(unit_id)));

CREATE OR REPLACE FUNCTION public.ay2_workspace(p_site uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object(
 'capabilities',ay2_private.capabilities(p_site),
 'settings',coalesce((select jsonb_agg(t) from public.ay2_settings t where site_id=p_site),'[]'::jsonb),
 'permissions',coalesce((select jsonb_agg(t) from public.ay2_permissions t where site_id=p_site),'[]'::jsonb),
 'entries',coalesce((select jsonb_agg(t order by booked_on desc,created_at desc,id) from public.ay2_entries t where site_id=p_site),'[]'::jsonb),
 'charges',coalesce((select jsonb_agg(t order by due_on,id) from public.ay2_charges t where site_id=p_site),'[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(t) from public.ay2_allocations t where site_id=p_site),'[]'::jsonb),
 'occupancy_changes',coalesce((select jsonb_agg(t order by effective_on desc) from public.ay3_occupancy_changes t where site_id=p_site),'[]'::jsonb),
 'people','[]'::jsonb,
 'persons',case when ay2_private.can(p_site,'people') then coalesce((select jsonb_agg(t order by full_name) from public.ay3_persons t where site_id=p_site),'[]'::jsonb) else ay2_private.finance_people(p_site) end,
 'links',coalesce((select jsonb_agg(t) from public.ay3_links t where site_id=p_site),'[]'::jsonb),
 'credits',coalesce((select jsonb_agg(t) from public.ay3_credits t where site_id=p_site),'[]'::jsonb),
 'match_rules',coalesce((select jsonb_agg(t) from public.ay3_match_rules t where site_id=p_site),'[]'::jsonb),
 'providers',coalesce((select jsonb_agg(t order by name) from public.ay3_providers t where site_id=p_site),'[]'::jsonb),
 'provider_notes',coalesce((select jsonb_agg(t order by created_at desc) from public.ay3_provider_notes t where site_id=p_site),'[]'::jsonb),
 'acknowledgements',coalesce((select jsonb_agg(t) from public.ay3_acknowledgements t where site_id=p_site),'[]'::jsonb),
 'announcements',coalesce((select jsonb_agg(t order by created_at desc,id) from public.ay2_announcements t where site_id=p_site),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(t order by period desc) from public.ay2_reports t where site_id=p_site),'[]'::jsonb),
 'audit','[]'::jsonb,
 'staged_charges',coalesce((select jsonb_agg(t) from public.ay2_staged_charges t where site_id=p_site),'[]'::jsonb)
 ) where ay2_private.view_site(p_site);
$function$

alter policy ay3_links_read on public.ay3_links using(ay2_private.can(site_id,'people') or ay2_private.can(site_id,'finance') or ay2_private.own_person(person_id));
-- Duplicate protection can be disabled independently; existing rows are never removed.
-- drop trigger ay3_person_no_duplicate on public.ay3_persons;
