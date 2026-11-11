-- Route unit writes through the checked application commands, redact former debtors, and preserve distinct bank movements.

REVOKE UPDATE ON TABLE public.site_units FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION ay2_private.can_read_charge_details(s uuid, u uuid, person uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
 SELECT auth.uid() IS NOT NULL AND (
  ay2_private.can(s,'finance') OR ay2_private.own_person(person)
  OR (ay2_private.can_view_unit_debts(s,u) AND EXISTS (
   SELECT 1 FROM public.ay3_links l
   WHERE l.site_id=s AND l.unit_id=u AND l.person_id=person AND l.active
     AND l.archived_at IS NULL AND l.role IN ('owner','tenant')
     AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
     AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
  ))
 );
$fn$;
REVOKE ALL ON FUNCTION ay2_private.can_read_charge_details(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ay2_private.can_read_charge_details(uuid,uuid,uuid) TO authenticated;

ALTER POLICY ay2_charges_read ON public.ay2_charges TO authenticated
 USING (ay2_private.can_read_charge_details(site_id,unit_id,person_id));

ALTER POLICY ay2_devir_snapshot_read ON public.ay2_devir_snapshot TO authenticated
 USING (ay2_private.can(site_id,'finance'));

-- Residents still need amounts and payment dates to reconcile the unit balance.
-- Return only the financial fields needed for that view, without debtor details.
CREATE OR REPLACE FUNCTION ay2_private.redacted_unit_finance(s uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
 WITH hidden_charges AS MATERIALIZED (
   SELECT c.id,c.unit_id,c.cents,c.due_on,c.period_from,c.period_to,c.debt_group,c.void_reason,
    (c.debt_group='legacy' OR c.reference LIKE 'staged:%' OR c.reference LIKE 'devir-%'
     OR c.reference LIKE 'purpose-split-20261015-%'
     OR c.distribution_basis->>'kind' IN ('purpose-specific-subdivision-of-devir','purpose-tagged component of inherited category')) AS inherited,
    CASE WHEN c.category IN ('Aidat','Asansör','Bakım','Demirbaş','Devir','Havuz','İcra','Genel Gider / İşletme','Bakım ve Onarım')
         THEN c.category ELSE 'Diğer' END AS category
   FROM public.ay2_charges c
   WHERE c.site_id=s AND ay2_private.can_view_unit_debts(s,c.unit_id)
     AND NOT ay2_private.can_read_charge_details(s,c.unit_id,c.person_id)
 )
 SELECT jsonb_build_object(
  'charges', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',c.id,'unit_id',c.unit_id,'cents',c.cents,'due_on',c.due_on,'category',c.category,
    'label','Daire borcu','payer','review','person_id',NULL,'link_id',NULL,
    'period_from',c.period_from,'period_to',c.period_to,'debt_group',c.debt_group,
    'reference',CASE WHEN c.inherited THEN 'devir-redacted' END,
    'void_reason',CASE WHEN c.void_reason IS NOT NULL THEN 'void' END,'debtor_redacted',true
  ) ORDER BY c.due_on,c.id) FROM hidden_charges c),'[]'::jsonb),
  'allocations', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',a.id,'charge_id',a.charge_id,'entry_id',a.entry_id,'cents',a.cents,
    'created_at',a.created_at,'void_reason',CASE WHEN a.void_reason IS NOT NULL THEN 'void' END
  )) FROM public.ay2_allocations a JOIN hidden_charges c ON c.id=a.charge_id WHERE a.site_id=s),'[]'::jsonb),
  'devir_snapshot', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'unit_id',d.unit_id,'source_row',d.source_row,'source_name','—','source_role',d.source_role,
    'source_date',d.source_date,'source_period',d.source_period,'categories',d.categories,
    'total_cents',d.total_cents
  ) ORDER BY d.source_row) FROM public.ay2_devir_snapshot d WHERE d.site_id=s
      AND ay2_private.can_view_unit_debts(s,d.unit_id) AND NOT ay2_private.can(s,'finance')),'[]'::jsonb)
 ) WHERE auth.uid() IS NOT NULL;
$fn$;
REVOKE ALL ON FUNCTION ay2_private.redacted_unit_finance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ay2_private.redacted_unit_finance(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION ay2_private.view_charge(c uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.ay2_charges x WHERE x.id=c AND
 ay2_private.can_read_charge_details(x.site_id,x.unit_id,x.person_id));
$function$;

CREATE OR REPLACE FUNCTION ay2_private.finance_people(s uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND ay2_private.view_site(s) THEN
  coalesce((
   SELECT jsonb_agg(jsonb_build_object(
     'id',p.id,
     'full_name',p.full_name,
     'is_self',coalesce(p.auth_user_id=auth.uid(),false),
     'unit_roles',coalesce((
       SELECT jsonb_agg(jsonb_build_object('unit_id',l.unit_id,'role',l.role))
       FROM public.ay3_links l
       WHERE l.site_id=s AND l.person_id=p.id AND l.active AND l.archived_at IS NULL
         AND l.role IN ('owner','tenant')
         AND (l.starts_on IS NULL OR l.starts_on <= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND (l.ends_on IS NULL OR l.ends_on >= (now() AT TIME ZONE 'Europe/Istanbul')::date)
         AND ay2_private.can_view_unit_debts(s,l.unit_id)
     ),'[]'::jsonb)
   ))
   FROM public.ay3_persons p
   WHERE p.site_id=s AND (
     ay2_private.can(s,'finance') OR ay2_private.own_person(p.id)
     OR EXISTS(SELECT 1 FROM public.ay2_charges c
        WHERE c.site_id=s AND c.person_id=p.id AND ay2_private.can_read_charge_details(s,c.unit_id,c.person_id))
   )
  ),'[]'::jsonb)
 ELSE '[]'::jsonb END;
$function$;

CREATE OR REPLACE FUNCTION ay2_private.ay5_payments(s uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT coalesce(jsonb_agg(t),'[]'::jsonb) FROM (SELECT e.id,e.booked_on,'Ödeme'::text description,'Ödeme'::text category,sum(a.cents)::bigint cents FROM public.ay2_allocations a JOIN public.ay2_entries e ON e.id=a.entry_id JOIN public.ay2_charges c ON c.id=a.charge_id AND c.site_id=a.site_id WHERE a.site_id=s AND a.void_reason IS NULL AND (ay2_private.view_charge(a.charge_id) OR ay2_private.can_view_unit_debts(s,c.unit_id)) GROUP BY e.id,e.booked_on) t WHERE auth.uid() IS NOT NULL AND ay2_private.view_site(s); $function$;

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
 'charges',coalesce((select jsonb_agg(t order by due_on,id) from public.ay2_charges t where site_id=p_site),'[]'::jsonb)||coalesce(redacted.data->'charges','[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(t) from public.ay2_allocations t where site_id=p_site),'[]'::jsonb)||coalesce(redacted.data->'allocations','[]'::jsonb),
 'devir_snapshot',coalesce(redacted.data->'devir_snapshot','[]'::jsonb),
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
 ) FROM (SELECT ay2_private.redacted_unit_finance(p_site) AS data) redacted
 WHERE ay2_private.view_site(p_site);
$function$;

CREATE OR REPLACE FUNCTION ay2_private.command(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ident uuid;pid uuid;uid uuid;l public.ay3_links;c public.ay2_charges;e public.ay2_entries;cr public.ay3_credits;
 need text;res jsonb;label text;amount bigint;available bigint;used bigint;previous uuid;item jsonb;filtered jsonb:='[]'::jsonb;duplicates int:=0;start_date date;end_date date;created timestamptz:=now();import_key text;import_keys text[]:='{}'::text[];
 bank_ref text; running_balance text; fingerprint text;
begin
 PERFORM ay2_private.require_task_action(s,act,p);
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501';end if;
 -- Critical corrections require the actual site's Superadmin, before parsing IDs.
 if act in ('reverse','unallocate','void_charge','void_credit','charge','monthly','confirm_staged') and not ay2_private.can(s,'admin') then
  raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';
 end if;
 if act in ('assignment_add','assignment_edit','assignment_remove','assignment_restore') then return ay2_private.manage_assignment(s,act,p);end if;
 if act='link' then return ay2_private.manage_assignment(s,'assignment_add',p);end if;
 if act='edit_link' then return ay2_private.manage_assignment(s,'assignment_edit',p);end if;
 if act='end_link' then return ay2_private.manage_assignment(s,'assignment_remove',p||jsonb_build_object('reason','ended'));end if;
 if act='unlink' then return ay2_private.unlink_relationship(s,p);end if;
 if act in ('relationship_change','switch_tenant') then return ay2_private.change_relationship(s,p);end if;
 if act='acknowledge' then
  if not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
  insert into public.ay3_acknowledgements(site_id,announcement_id,user_id,revision)
  select s,id,auth.uid(),revision from public.ay2_announcements where site_id=s and id=(p->>'id')::uuid and published and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) on conflict do nothing;
  return jsonb_build_object('ok',true);
 end if;
 need:=case when act in ('person','link','edit_link','occupancy','end_link','switch_tenant','provider','provider_note') then 'people' when act='announcement' then 'announcements' when act in ('match_rule','entry','allocate','unallocate','void_charge','reverse','charge','monthly','confirm_staged') then 'finance' when act in ('settings','permissions','publish_report') then 'admin' when act='import' then 'import' else null end;
 if need is not null and not ay2_private.can(s,need) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 if act='occupancy' then
  if coalesce(p->>'status','') not in ('occupied','vacant','unknown') then raise exception 'Geçerli bir kullanım durumu seçin.';end if;
  update public.site_units set occupancy_status=p->>'status' where site_id=s and id=(p->>'unit_id')::uuid returning id into ident;
  if not found then raise exception 'Daire bulunamadı.';end if;
 elsif act='edit_link' then
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid for update;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
  start_date:=nullif(p->>'starts_on','')::date;end_date:=nullif(p->>'ends_on','')::date;
  -- Empty start is intentionally unknown.
  if end_date is not null and start_date is not null and end_date<start_date then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if exists(select 1 from public.ay3_links t where t.site_id=s and t.unit_id=l.unit_id and t.id<>l.id and (t.person_id=l.person_id and t.role=l.role or t.role='tenant' and l.role='tenant') and daterange(t.starts_on,t.ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu tarih aralığı başka bir belegeyle çakışıyor.';end if;
  insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),'edit_link_before',l.id,jsonb_build_object('starts_on',l.starts_on,'ends_on',l.ends_on));
  update public.ay3_links set starts_on=start_date where id=l.id;
  if end_date is not null then perform ay2_private.command(s,'end_link',jsonb_build_object('id',l.id,'ends_on',end_date));else update public.ay3_links set ends_on=null where id=l.id;end if;
  if l.role in ('owner','tenant') then perform ay2_private.assert_tenant_owner_coverage(s,l.unit_id);end if;
  ident:=l.id;
 elsif act='person' then
  if length(btrim(coalesce(p->>'first_name','')))=0 or length(btrim(coalesce(p->>'last_name','')))=0 then raise exception 'Ad ve soyad gerekli.';end if;
  ident:=nullif(p->>'person_id','')::uuid;
  if nullif(p->>'auth_user_id','') is not null and not ay2_private.can(s,'admin') then raise exception 'Hesap bağlantısını yalnızca Süper Admin yapabilir.';end if;
  uid:=nullif(p->>'auth_user_id','')::uuid;
  if uid is not null and not exists(select 1 from public.site_resident_units r join public.site_units u on u.id=r.unit_id where u.site_id=s and r.user_id=uid and r.active) then raise exception 'Bu siteye kayıtlı bir kullanıcı seçin.';end if;
  if ident is null then
   insert into public.ay3_persons(site_id,full_name,first_name,last_name,phone,email,language,notes,auth_user_id) values(s,btrim((p->>'first_name')||' '||(p->>'last_name')),p->>'first_name',p->>'last_name',coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'language','tr'),coalesce(p->>'notes',''),uid) returning id into ident;
  else
   update public.ay3_persons set full_name=btrim((p->>'first_name')||' '||(p->>'last_name')),first_name=p->>'first_name',last_name=p->>'last_name',phone=coalesce(p->>'phone',''),email=coalesce(p->>'email',''),language=coalesce(p->>'language','tr'),notes=coalesce(p->>'notes',''),auth_user_id=case when ay2_private.can(s,'admin') then uid else auth_user_id end where site_id=s and id=ident;
   if not found then raise exception 'Kişi bulunamadı.';end if;
  end if;
  if nullif(p->>'unit_id','') is not null then perform ay2_private.command(s,'link',p||jsonb_build_object('person_id',ident));end if;
 elsif act='link' then
  pid:=(p->>'person_id')::uuid;uid:=(p->>'unit_id')::uuid;start_date:=nullif(p->>'starts_on','')::date;end_date:=nullif(p->>'ends_on','')::date;
  if end_date is not null and end_date<start_date then raise exception 'Tarih aralığını kontrol edin.';end if;
  -- Empty start is intentionally unknown.

  if exists(select 1 from public.ay3_links where site_id=s and unit_id=uid and person_id=pid and role=p->>'role' and daterange(starts_on,ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu kişi zaten bu dönem için bağlı.';end if;
  if p->>'role'='tenant' and exists(select 1 from public.ay3_links where site_id=s and unit_id=uid and role='tenant' and daterange(starts_on,ends_on,'[]')&&daterange(start_date,end_date,'[]')) then raise exception 'Bu tarihlerde başka bir kiracı var. Sakin değiştir seçeneğini kullanın.';end if;
  insert into public.ay3_links(site_id,person_id,unit_id,role,starts_on,ends_on,responsibility,primary_contact) values(s,pid,uid,p->>'role',start_date,end_date,coalesce(p->>'responsibility',''),coalesce((p->>'primary_contact')::boolean,false)) returning id into ident;
  if p->>'role'='tenant' then perform ay2_private.assert_tenant_owner_coverage(s,uid);end if;
 elsif act='end_link' then
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid for update;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
  end_date:=coalesce(nullif(p->>'ends_on','')::date,(now() at time zone 'Europe/Istanbul')::date);
  if l.starts_on is not null and end_date<l.starts_on then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if l.role='owner' and exists(select 1 from public.ay3_links t where t.site_id=s and t.unit_id=l.unit_id and t.role='tenant' and (t.ends_on is null or t.ends_on>end_date)) and not exists(select 1 from public.ay3_links o where o.site_id=s and o.unit_id=l.unit_id and o.role='owner' and o.id<>l.id and o.starts_on<=end_date+1 and o.ends_on is null) then raise exception 'Önce yeni ev sahibini ekleyin veya diğer bağlantıları bitirin.';end if;
  update public.ay3_links set ends_on=end_date where site_id=s and id=(p->>'id')::uuid returning id into ident;
  if not found then raise exception 'Bağlantı bulunamadı.';end if;
 elsif act='switch_tenant' then
  if not coalesce((p->>'confirmation')::boolean,false) then raise exception 'Onay gerekli.';end if;
  select * into l from public.ay3_links where site_id=s and id=(p->>'id')::uuid and role='tenant' for update;
  if not found or l.ends_on is not null then raise exception 'Aktif kiracı bulunamadı.';end if;
  end_date:=coalesce(nullif(p->>'ends_on','')::date,(now() at time zone 'Europe/Istanbul')::date);start_date:=coalesce(nullif(p->>'starts_on','')::date,end_date+1);
  if l.starts_on is not null and end_date<l.starts_on then raise exception 'Çıkış tarihi başlangıç tarihinden önce olamaz.';end if;
  if end_date is null or start_date is null or start_date<=end_date then raise exception 'Yeni başlangıç çıkış tarihinden sonra olmalı.';end if;
  update public.ay3_links set ends_on=end_date where id=l.id;
  if nullif(p->>'person_id','') is null then res:=ay2_private.command(s,'person',(p-'unit_id'-'person_id'-'id')||jsonb_build_object('language','tr'));p:=p||jsonb_build_object('person_id',res->>'id');end if;
  res:=ay2_private.command(s,'link',p||jsonb_build_object('role','tenant','unit_id',l.unit_id,'ends_on',null,'starts_on',start_date,'start_unknown',false));ident:=(res->>'id')::uuid;
 elsif act='announcement' then
  select coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Yönetim') into label from auth.users where id=auth.uid();
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_announcements(site_id,title,body,published,priority,starts_at,ends_at,author_label,created_by) values(s,p->>'title',p->>'body',coalesce((p->>'published')::boolean,false),coalesce(p->>'priority','normal'),nullif(p->>'starts_at','')::timestamptz,nullif(p->>'ends_at','')::timestamptz,coalesce(label,'Yönetim'),auth.uid()) returning id into ident;
  else
   update public.ay2_announcements set title=p->>'title',body=p->>'body',published=coalesce((p->>'published')::boolean,false),priority=coalesce(p->>'priority','normal'),starts_at=nullif(p->>'starts_at','')::timestamptz,ends_at=nullif(p->>'ends_at','')::timestamptz,updated_by=auth.uid(),updated_at=now(),revision=revision+1 where site_id=s and id=ident;
   if not found then raise exception 'Duyuru bulunamadı.';end if;
  end if;
 elsif act='provider' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then insert into public.ay3_providers(site_id,name,category,contact,phone,email,status,created_by) values(s,p->>'name',p->>'category',coalesce(p->>'contact',''),coalesce(p->>'phone',''),coalesce(p->>'email',''),coalesce(p->>'status','preferred'),auth.uid()) returning id into ident;
  else update public.ay3_providers set name=p->>'name',category=p->>'category',contact=coalesce(p->>'contact',''),phone=coalesce(p->>'phone',''),email=coalesce(p->>'email',''),status=p->>'status' where site_id=s and id=ident;if not found then raise exception 'Kayıt bulunamadı.';end if;end if;
 elsif act='provider_note' then
  select coalesce(nullif(raw_user_meta_data->>'full_name',''),'Yönetim') into label from auth.users where id=auth.uid();
  if length(btrim(coalesce(p->>'body','')))=0 then raise exception 'Not yazın.';end if;
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay3_provider_notes(site_id,provider_id,body,visit_on,created_by,author_label) values(s,(p->>'provider_id')::uuid,p->>'body',nullif(p->>'visit_on','')::date,auth.uid(),coalesce(label,'Yönetim')) returning id into ident;
  else
   perform 1 from public.ay3_provider_notes where site_id=s and id=ident and provider_id=(p->>'provider_id')::uuid for update;
   if not found then raise exception 'Not bulunamadı.';end if;
   insert into public.ay2_audit(site_id,actor,action,entity_id,details)
   select s,auth.uid(),'provider_note_edit_before',id,jsonb_build_object('body',body,'visit_on',visit_on,'author_label',author_label) from public.ay3_provider_notes where site_id=s and id=ident;
   update public.ay3_provider_notes set body=p->>'body',visit_on=nullif(p->>'visit_on','')::date where site_id=s and id=ident and provider_id=(p->>'provider_id')::uuid;
  end if;
 elsif act='match_rule' then
  if not exists(select 1 from public.ay3_links where site_id=s and unit_id=(p->>'unit_id')::uuid and person_id=(p->>'person_id')::uuid) then raise exception 'Kişi bu daireye bağlı değil.';end if;
  insert into public.ay3_match_rules(site_id,unit_id,person_id,alias,iban,created_by) values(s,(p->>'unit_id')::uuid,(p->>'person_id')::uuid,btrim(coalesce(p->>'alias','')),upper(replace(coalesce(p->>'iban',''),' ','')),auth.uid()) returning id into ident;
 elsif act in ('credit','void_credit','bind_charge','classify_entry') then
  if not ay2_private.can(s,'finance') then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
  if act='classify_entry' then
   if p->>'category' is null or length(p->>'category') not between 1 and 80 then raise exception 'Kategori seçin.';end if;
   update public.ay2_entries set category=p->>'category' where site_id=s and id=(p->>'id')::uuid returning id into ident;
   if not found then raise exception 'Kayıt bulunamadı.';end if;
  elsif act='credit' then
   select * into cr from public.ay3_credits where site_id=s and request_id=(p->>'request_id')::uuid;
   if found then
    if cr.entry_id is distinct from (p->>'entry_id')::uuid or cr.person_id is distinct from (p->>'person_id')::uuid or cr.unit_id is distinct from (p->>'unit_id')::uuid or cr.cents is distinct from (p->>'cents')::bigint then raise exception 'Bu istek farklı değerlerle kaydedildi.';end if;
    return jsonb_build_object('id',cr.id,'already_recorded',true);
   end if;
   select * into e from public.ay2_entries where site_id=s and id=(p->>'entry_id')::uuid;
   if not found or e.cents<0 or e.reversal_of is not null or exists(select 1 from public.ay2_entries where reversal_of=e.id) then raise exception 'Geçerli tahsilat bulunamadı.';end if;
   if not exists(select 1 from public.ay3_links where site_id=s and unit_id=(p->>'unit_id')::uuid and person_id=(p->>'person_id')::uuid) then raise exception 'Kişi bu daireye bağlı değil.';end if;
   select e.cents-coalesce((select sum(cents) from public.ay2_allocations where entry_id=e.id and void_reason is null),0)-coalesce((select sum(cents) from public.ay3_credits where entry_id=e.id and void_reason is null),0) into available;
   amount:=(p->>'cents')::bigint;if amount is null or amount<=0 or amount>available then raise exception 'Tutar ödeme bakiyesini aşıyor.';end if;
   insert into public.ay3_credits(site_id,entry_id,unit_id,person_id,cents,request_id,created_by) values(s,e.id,(p->>'unit_id')::uuid,(p->>'person_id')::uuid,amount,(p->>'request_id')::uuid,auth.uid()) returning id into ident;
  elsif act='void_credit' then
   if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Gerekçe gerekli.';end if;
   update public.ay3_credits set void_reason=p->>'reason' where site_id=s and id=(p->>'id')::uuid and void_reason is null returning id into ident;
   if not found then raise exception 'Guthaben bulunamadı.';end if;
  else
   select * into c from public.ay2_charges where site_id=s and id=(p->>'id')::uuid;
   if not found or c.person_id is not null then raise exception 'Sorumlu kişi zaten belirlenmiş.';end if;
   select * into l from public.ay3_links where site_id=s and id=(p->>'link_id')::uuid and unit_id=c.unit_id;
   if not found then raise exception 'Daireye bağlı kişi seçin.';end if;
   update public.ay2_charges set person_id=l.person_id,link_id=l.id where id=c.id;ident:=c.id;
  end if;
 else
  if act='import' then
   if not ay2_private.can(s,'import') then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';end if;
   if jsonb_typeof(p->'entries') is distinct from 'array' or jsonb_array_length(p->'entries') not between 1 and 2000 then raise exception '1–2000 hareket gerekli.';end if;
   FOR item IN SELECT value FROM jsonb_array_elements(p->'entries') LOOP
    bank_ref:=coalesce(item->>'reference','');
    running_balance:=item->>'balance_cents';
    fingerprint:=md5(jsonb_build_array(item->>'date',btrim(item->>'desc'),(item->>'cents')::bigint,bank_ref,running_balance)::text);
    import_key:=jsonb_build_array((item->>'date')::date,(item->>'cents')::bigint,bank_ref,
      CASE WHEN bank_ref='' THEN btrim(item->>'desc') END,
      CASE WHEN bank_ref='' THEN running_balance END)::text;
    IF import_key=ANY(import_keys) OR EXISTS (
      SELECT 1 FROM public.ay2_entries bank_entry
      WHERE bank_entry.site_id=s AND bank_entry.booked_on=(item->>'date')::date AND bank_entry.cents=(item->>'cents')::bigint
        AND coalesce(bank_entry.bank_reference,'')=bank_ref
        AND (bank_ref<>'' OR (bank_entry.description=btrim(item->>'desc') AND (running_balance IS NULL OR bank_entry.dedup_key=fingerprint)))
    ) THEN
      duplicates:=duplicates+1;
    ELSE
      -- With no bank reference or recorded balance, an older matching row cannot be distinguished safely.
      IF bank_ref='' AND running_balance IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.ay2_entries bank_entry
        WHERE bank_entry.site_id=s AND bank_entry.booked_on=(item->>'date')::date AND bank_entry.cents=(item->>'cents')::bigint
          AND coalesce(bank_entry.bank_reference,'')='' AND bank_entry.description=btrim(item->>'desc')
          AND (bank_entry.batch_id IS NULL OR bank_entry.dedup_key=md5(jsonb_build_array(item->>'date',btrim(item->>'desc'),(item->>'cents')::bigint,'',NULL)::text))
      ) THEN
        RAISE EXCEPTION 'Eski banka kaydı eşleştirilemedi. Referans veya önceki bakiye bilgisi gerekiyor.';
      END IF;
      filtered:=filtered||jsonb_build_array(item);
      import_keys:=array_append(import_keys,import_key);
    END IF;
   END LOOP;
   IF jsonb_array_length(filtered)=0 THEN RETURN jsonb_build_object('inserted',0,'duplicates',duplicates);END IF;
   res:=ay2_private.command_v2(s,act,p||jsonb_build_object('entries',filtered));
   FOR item IN SELECT value FROM jsonb_array_elements(filtered) LOOP
    fingerprint:=md5(jsonb_build_array(item->>'date',btrim(item->>'desc'),(item->>'cents')::bigint,coalesce(item->>'reference',''),item->>'balance_cents')::text);
    UPDATE public.ay2_entries SET sender_name=coalesce(item->>'counterparty',''),sender_iban=coalesce(item->>'iban',''),unit_hint=coalesce(item->>'unit_hint','')
    WHERE site_id=s AND dedup_key=fingerprint
      AND batch_id IN (SELECT id FROM public.ay2_batches WHERE site_id=s AND digest=p->>'digest');
   END LOOP;
   return res||jsonb_build_object('duplicates',coalesce((res->>'duplicates')::int,0)+duplicates);
  end if;
  if act='allocate' then
   -- Authorization and the per-site lock precede this exact-request retry.
   -- Let command_v2 compare the complete original payload before current balances.
   if exists(select 1 from public.ay2_allocations where site_id=s and request_id=(p->>'request_id')::uuid) then
    return ay2_private.command_v2(s,act,p);
   end if;
   select * into e from public.ay2_entries where site_id=s and id=(p->>'entry_id')::uuid;
   select coalesce(sum(cents),0) into used from public.ay3_credits where entry_id=e.id and void_reason is null;
   if used>0 and (p->>'cents')::bigint>e.cents-used-coalesce((select sum(cents) from public.ay2_allocations where entry_id=e.id and void_reason is null),0) then raise exception 'Önce ayrılmış fazla ödemeyi kaldırın.';end if;
  elsif act='reverse' and exists(select 1 from public.ay3_credits where site_id=s and entry_id=(p->>'id')::uuid and void_reason is null) then raise exception 'Önce fazla ödeme kaydını kaldırın.';
  end if;
  if act in ('charge','confirm_staged') and nullif(p->>'link_id','') is not null and not exists(select 1 from public.ay3_links where id=(p->>'link_id')::uuid and site_id=s and unit_id=(p->>'unit_id')::uuid) then raise exception 'Daireye bağlı kişi seçin.';end if;
  res:=ay2_private.command_v2(s,act,p);
  if act in ('charge','confirm_staged') and nullif(res->>'id','') is not null then
   ident:=(res->>'id')::uuid;
   select * into c from public.ay2_charges where id=ident;
   select * into l from public.ay3_links where site_id=s and unit_id=c.unit_id and id=nullif(p->>'link_id','')::uuid;
   start_date:=nullif(p->>'period_from','')::date;
   end_date:=nullif(p->>'period_to','')::date;
   if (end_date is not null and start_date is null) or (end_date is not null and end_date<start_date) then
    raise exception 'Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.';
   end if;
   update public.ay2_charges set period_from=start_date,period_to=end_date where id=ident and site_id=s;
   if l.id is not null then update public.ay2_charges set person_id=l.person_id,link_id=l.id where id=ident and site_id=s;end if;
  elsif act='monthly' then
   for c in select * from public.ay2_charges where site_id=s and reference='monthly:'||date_trunc('month',(p->>'due_on')::date)::date and person_id is null loop
    select * into l from public.ay3_links where site_id=s and unit_id=c.unit_id and active and role=case c.payer when 'owner' then 'owner' when 'tenant' then 'tenant' else '' end and starts_on<=c.due_on and (ends_on is null or ends_on>=c.due_on);
    if found and (select count(*) from public.ay3_links where site_id=s and unit_id=c.unit_id and active and role=l.role and starts_on<=c.due_on and (ends_on is null or ends_on>=c.due_on))=1 then update public.ay2_charges set person_id=l.person_id,link_id=l.id,period_from=date_trunc('month',c.due_on)::date,period_to=(date_trunc('month',c.due_on)+interval '1 month - 1 day')::date where id=c.id;end if;
   end loop;
  end if;
  return res;
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),act,ident,jsonb_build_object('reason',p->>'reason'));
 return jsonb_build_object('id',ident,'ok',true);
end;
$function$;
