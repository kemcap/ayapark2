BEGIN;
DO $preflight$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='ay2_private.command(uuid,text,jsonb)'::regprocedure) <> 'a75bf42bd300f17caa5790d99fa38f67' THEN RAISE EXCEPTION 'Backend drift: command';END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='ay2_private.command_v2(uuid,text,jsonb)'::regprocedure) <> '8ba594c7cd5c2f334b2f45ae6c66ef35' THEN RAISE EXCEPTION 'Backend drift: command_v2';END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='ay2_private.ay5_command(uuid,text,jsonb)'::regprocedure) <> '361bd1dabf6a0b14f71bb04521ea5e1f' THEN RAISE EXCEPTION 'Backend drift: ay5_command';END IF;
END; $preflight$;
CREATE FUNCTION public.ay3_draft_workspace(p_site uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT ay2_private.can_task(p_site,'charges_prepare') AND NOT ay2_private.can(p_site,'admin') THEN RETURN jsonb_build_object('tasks','{}'::jsonb,'drafts','[]'::jsonb);END IF;
 RETURN jsonb_build_object('tasks',(SELECT jsonb_object_agg(t,ay2_private.can_task(p_site,t)) FROM unnest(ARRAY['people_manage','occupancy_invite','charges_prepare','bank_reconcile','announcements_publish'])t),
 'drafts',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY created_at DESC) FROM (SELECT * FROM public.ay3_charge_drafts WHERE site_id=p_site AND (submitted_by=auth.uid() OR ay2_private.can(p_site,'admin')) ORDER BY created_at DESC LIMIT 100)d),'[]'::jsonb));
END;$$;
REVOKE ALL ON FUNCTION public.ay3_draft_workspace(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_draft_workspace(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION ay2_private.command(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ident uuid;pid uuid;uid uuid;l public.ay3_links;c public.ay2_charges;e public.ay2_entries;cr public.ay3_credits;
 need text;res jsonb;label text;amount bigint;available bigint;used bigint;previous uuid;item jsonb;filtered jsonb:='[]'::jsonb;duplicates int:=0;start_date date;end_date date;created timestamptz:=now();
begin
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
   for item in select value from jsonb_array_elements(p->'entries') loop
    if exists(select 1 from public.ay2_entries where site_id=s and booked_on=(item->>'date')::date and cents=(item->>'cents')::bigint and bank_reference=coalesce(item->>'reference','') and (description=btrim(item->>'desc') or coalesce(item->>'reference','')<>'')) then duplicates:=duplicates+1;
    else filtered:=filtered||jsonb_build_array(item);end if;
   end loop;
   if jsonb_array_length(filtered)=0 then return jsonb_build_object('inserted',0,'duplicates',duplicates);end if;
   res:=ay2_private.command_v2(s,act,p||jsonb_build_object('entries',filtered));
   for item in select value from jsonb_array_elements(filtered) loop
    update public.ay2_entries set sender_name=coalesce(item->>'counterparty',''),sender_iban=coalesce(item->>'iban',''),unit_hint=coalesce(item->>'unit_hint','') where site_id=s and booked_on=(item->>'date')::date and cents=(item->>'cents')::bigint and bank_reference=coalesce(item->>'reference','') and description=btrim(item->>'desc') and batch_id in (select id from public.ay2_batches where site_id=s and digest=p->>'digest');
   end loop;
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
   if (start_date is null) <> (end_date is null) or end_date<start_date then
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
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.command_v2(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 need text; ident uuid; u uuid; e public.ay2_entries; c public.ay2_charges; a public.ay2_allocations;
 n bigint; paid bigint; used bigint; item jsonb; inserted_count int:=0; duplicate_count int:=0;
 batch uuid; fingerprint text; period_start date; period_end date; opening bigint; income bigint; expense bigint;
 original public.ay2_staged_charges; caps text[]; result jsonb;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501'; end if;
 -- Critical corrections require the actual site's Superadmin, before parsing IDs.
 if act in ('reverse','unallocate','void_charge','void_credit','charge','monthly','confirm_staged') and not ay2_private.can(s,'admin') then
  raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501';
 end if;
 need:=case when act in ('permissions','settings','publish_report') then 'admin' when act='import' then 'import' when act='person' then 'people' when act='announcement' then 'announcements' else 'finance' end;
 if not ay2_private.can(s,need) then raise exception 'Bu işlem için yetkiniz yok.' using errcode='42501'; end if;
 -- Serialize per-site financial commands; avoids import/publish/allocation races.
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 if act='settings' then
  if exists(select 1 from public.ay2_entries where site_id=s) then raise exception 'Hareketler varken açılış değiştirilemez.'; end if;
  insert into public.ay2_settings(site_id,opening_cents,opening_date,initialized) values(s,(p->>'opening_cents')::bigint,(p->>'opening_date')::date,true)
  on conflict(site_id) do update set opening_cents=excluded.opening_cents,opening_date=excluded.opening_date,initialized=true;
 elsif act='permissions' then
  u:=(p->>'user_id')::uuid;
  if not exists(select 1 from public.site_staff_memberships where site_id=s and user_id=u and role in ('deputy','auditor')) then raise exception 'Yönetim üyesi bulunamadı.'; end if;
  select coalesce(array_agg(x),'{}') into caps from jsonb_array_elements_text(p->'capabilities') x;
  insert into public.ay2_permissions(site_id,user_id,capabilities) values(s,u,caps) on conflict(site_id,user_id) do update set capabilities=excluded.capabilities;
 elsif act='import' then
  if jsonb_typeof(p->'entries')<>'array' or jsonb_array_length(p->'entries') not between 1 and 2000 then raise exception '1–2000 hareket gerekli.'; end if;
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized) then raise exception 'Önce açılış bakiyesini belirleyin.'; end if;
  insert into public.ay2_batches(site_id,source_name,digest,row_count,created_by) values(s,p->>'source',p->>'digest',jsonb_array_length(p->'entries'),auth.uid())
  on conflict(site_id,digest) do nothing returning id into batch;
  if batch is null then return jsonb_build_object('inserted',0,'duplicates',jsonb_array_length(p->'entries'),'already_imported',true); end if;
  for item in select value from jsonb_array_elements(p->'entries') loop
   if (item->>'date')::date < (select opening_date from public.ay2_settings where site_id=s) then raise exception 'Açılıştan önceki hareket aktarılamaz.'; end if;
   fingerprint:=md5(jsonb_build_array(item->>'date',btrim(item->>'desc'),(item->>'cents')::bigint,coalesce(item->>'reference',''),item->>'balance_cents')::text);
   ident:=null;
   insert into public.ay2_entries(site_id,booked_on,description,category,cents,bank_reference,dedup_key,batch_id,created_by)
   values(s,(item->>'date')::date,btrim(item->>'desc'),coalesce(nullif(item->>'category',''),'Diğer'),(item->>'cents')::bigint,coalesce(item->>'reference',''),fingerprint,batch,auth.uid())
   on conflict(site_id,dedup_key) do nothing returning id into ident;
   if ident is null then duplicate_count:=duplicate_count+1; else inserted_count:=inserted_count+1; end if;
  end loop;
  result:=jsonb_build_object('inserted',inserted_count,'duplicates',duplicate_count);
 elsif act='entry' then
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized and opening_date<=(p->>'date')::date) then raise exception 'Açılış tarihi ve bakiyesi gerekli.'; end if;
  insert into public.ay2_entries(site_id,booked_on,description,category,cents,bank_reference,dedup_key,created_by)
  values(s,(p->>'date')::date,p->>'desc',p->>'category',(p->>'cents')::bigint,coalesce(p->>'reference',''),'manual:'||(p->>'request_id')::uuid,auth.uid())
  on conflict(site_id,dedup_key) do nothing returning id into ident;
 elsif act='charge' then
  u:=(p->>'unit_id')::uuid;
  insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
  values(s,u,p->>'category',p->>'label',(p->>'due_on')::date,(p->>'cents')::bigint,p->>'payer',p->>'reference',auth.uid())
  on conflict(site_id,unit_id,reference) do nothing returning id into ident;
 elsif act='monthly' then
  period_start:=date_trunc('month',(p->>'due_on')::date)::date;
  for u in select id from public.site_units where site_id=s loop
   insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
   values(s,u,'Aidat',p->>'label',(p->>'due_on')::date,(p->>'cents')::bigint,p->>'payer','monthly:'||period_start,auth.uid())
   on conflict(site_id,unit_id,reference) do nothing;
  end loop;
 elsif act='allocate' then
  select * into a from public.ay2_allocations where site_id=s and request_id=(p->>'request_id')::uuid;
  if found then
   if a.entry_id is distinct from (p->>'entry_id')::uuid or a.charge_id is distinct from (p->>'charge_id')::uuid or a.cents is distinct from (p->>'cents')::bigint then
    raise exception 'Bu istek daha önce farklı değerlerle kaydedildi. Yeni işlem açın.';
   end if;
   return jsonb_build_object('id',a.id,'already_recorded',true);
  end if;
  select * into e from public.ay2_entries where id=(p->>'entry_id')::uuid and site_id=s for update;
  if not found or e.cents<0 or e.reversal_of is not null or exists(select 1 from public.ay2_entries where reversal_of=e.id) then raise exception 'Geçerli tahsilat bulunamadı.'; end if;
  select * into c from public.ay2_charges where id=(p->>'charge_id')::uuid and site_id=s for update;
  if not found or c.void_reason is not null then raise exception 'Geçerli borç bulunamadı.'; end if;
  n:=(p->>'cents')::bigint;
  select coalesce(sum(cents),0) into used from public.ay2_allocations where entry_id=e.id and void_reason is null;
  select coalesce(sum(cents),0) into paid from public.ay2_allocations where charge_id=c.id and void_reason is null;
  if n is null or n<=0 or n>e.cents-used or n>c.cents-paid then raise exception 'Tutar ödeme veya borç bakiyesini aşıyor.'; end if;
  insert into public.ay2_allocations(site_id,entry_id,charge_id,request_id,cents,created_by) values(s,e.id,c.id,(p->>'request_id')::uuid,n,auth.uid()) returning id into ident;
 elsif act='unallocate' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Düzeltme gerekçesi gerekli.'; end if;
  update public.ay2_allocations set void_reason=p->>'reason' where site_id=s and id=(p->>'id')::uuid and void_reason is null returning id into ident;
  if ident is null then raise exception 'Aktif eşleştirme bulunamadı.'; end if;
 elsif act='void_charge' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'İptal gerekçesi gerekli.'; end if;
  select * into c from public.ay2_charges where site_id=s and id=(p->>'id')::uuid for update;
  if not found or c.void_reason is not null then raise exception 'Borç bulunamadı.'; end if;
  if exists(select 1 from public.ay2_allocations where charge_id=c.id and void_reason is null) then raise exception 'Önce ödeme eşleştirmelerini kaldırın.'; end if;
  update public.ay2_charges set void_reason=p->>'reason' where id=c.id returning id into ident;
 elsif act='reverse' then
  if length(btrim(coalesce(p->>'reason','')))<3 then raise exception 'Storno gerekçesi gerekli.'; end if;
  select * into e from public.ay2_entries where site_id=s and id=(p->>'id')::uuid for update;
  if not found or e.reversal_of is not null then raise exception 'Hareket bulunamadı.'; end if;
  if exists(select 1 from public.ay2_allocations where entry_id=e.id and void_reason is null) then raise exception 'Önce ödeme eşleştirmelerini kaldırın.'; end if;
  insert into public.ay2_entries(site_id,booked_on,description,category,cents,dedup_key,reversal_of,created_by)
  values(s,(now() at time zone 'Europe/Istanbul')::date,left('STORNO: '||(p->>'reason'),500),e.category,-e.cents,'reverse:'||e.id,e.id,auth.uid()) returning id into ident;
 elsif act='person' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_people(site_id,unit_id,full_name,relation,email,phone) values(s,(p->>'unit_id')::uuid,btrim(p->>'full_name'),p->>'relation',coalesce(p->>'email',''),coalesce(p->>'phone','')) returning id into ident;
  else
   update public.ay2_people set full_name=btrim(p->>'full_name'),email=coalesce(p->>'email',''),phone=coalesce(p->>'phone',''),relation=p->>'relation',active=coalesce((p->>'active')::boolean,true) where site_id=s and id=ident;
   if not found then raise exception 'Kişi bulunamadı.'; end if;
  end if;
 elsif act='announcement' then
  ident:=nullif(p->>'id','')::uuid;
  if ident is null then
   insert into public.ay2_announcements(site_id,title,body,published,created_by) values(s,p->>'title',p->>'body',coalesce((p->>'published')::boolean,false),auth.uid()) returning id into ident;
  else
   update public.ay2_announcements set title=p->>'title',body=p->>'body',published=coalesce((p->>'published')::boolean,false) where site_id=s and id=ident;
   if not found then raise exception 'Duyuru bulunamadı.'; end if;
  end if;
 elsif act='publish_report' then
  period_start:=date_trunc('month',(p->>'period')::date)::date;period_end:=(period_start+interval '1 month')::date;
  if not exists(select 1 from public.ay2_settings where site_id=s and initialized and opening_date<period_end) then raise exception 'Açılış kaydı gerekli.'; end if;
  select opening_cents into opening from public.ay2_settings where site_id=s;
  opening:=opening+coalesce((select sum(cents) from public.ay2_entries where site_id=s and booked_on<period_start),0);
  -- Gross income/expense follow the live-summary convention. Cash closing
  -- still includes every movement, including transfers and cross-period reversals.
  select coalesce(sum(movement.cents) filter(where movement.cents>0),0),coalesce(-sum(movement.cents) filter(where movement.cents<0),0) into income,expense
  from public.ay2_entries movement where movement.site_id=s and movement.booked_on>=period_start and movement.booked_on<period_end
   and movement.category<>'Transfer' and movement.reversal_of is null
   and not exists(select 1 from public.ay2_entries r where r.reversal_of=movement.id);
  insert into public.ay2_reports(site_id,period,opening_cents,income_cents,expense_cents,closing_cents,source_last_date,published_by,cash_adjustment_cents)
  values(s,period_start,opening,income,expense,opening+coalesce((select sum(cents) from public.ay2_entries where site_id=s and booked_on>=period_start and booked_on<period_end),0),(select max(booked_on) from public.ay2_entries where site_id=s and booked_on<period_end),auth.uid(),coalesce((select sum(cents) from public.ay2_entries where site_id=s and booked_on>=period_start and booked_on<period_end),0)-income+expense)
  on conflict(site_id,period) do update set opening_cents=excluded.opening_cents,income_cents=excluded.income_cents,expense_cents=excluded.expense_cents,closing_cents=excluded.closing_cents,source_last_date=excluded.source_last_date,published_at=now(),published_by=excluded.published_by,cash_adjustment_cents=excluded.cash_adjustment_cents;
 elsif act='confirm_staged' then
  select * into original from public.ay2_staged_charges where site_id=s and id=(p->>'id')::uuid for update;
  if not found or original.confirmed_charge is not null or original.ignored_reason is not null then raise exception 'Bekleyen kayıt bulunamadı.'; end if;
  if p->>'ignore_reason' is not null then
   if length(btrim(p->>'ignore_reason'))<3 then raise exception 'Gerekçe gerekli.'; end if;
   update public.ay2_staged_charges set ignored_reason=p->>'ignore_reason' where id=original.id;
  else
   insert into public.ay2_charges(site_id,unit_id,category,label,due_on,cents,payer,reference,created_by)
   values(s,(p->>'unit_id')::uuid,case when original.kind='enforcement' then 'İcra' else 'Devir' end,'Devir bakiyesi · '||original.as_of,original.as_of,original.cents,p->>'payer','staged:'||original.id,auth.uid()) returning id into ident;
   update public.ay2_staged_charges set confirmed_charge=ident where id=original.id;
  end if;
 else raise exception 'Bilinmeyen işlem.';
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(s,auth.uid(),act,ident,jsonb_build_object('reason',p->>'reason','result',result));
 return coalesce(result,jsonb_build_object('id',ident,'ok',true));
end;
$function$
;
CREATE OR REPLACE FUNCTION ay2_private.ay5_command(s uuid,act text,p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.ay5_operations; oid uuid; ident uuid; res jsonb; plan jsonb; row record; item jsonb; ids uuid[]; weights bigint[]; amounts bigint[]; denom numeric; total bigint; leftovers bigint; idx int; n int; cat text; ref text; l public.ay3_links; ex public.ay5_monthly_exceptions; old public.ay2_announcements; targets uuid[]; blocks text[]; start_on date;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Giriş gerekli.' USING errcode='42501';END IF;
 IF act IN ('batch_charge','monthly_v5') AND NOT ay2_private.can(s,'admin') THEN RAISE EXCEPTION 'Superadmin approval required' USING errcode='42501';END IF;
 IF act='acknowledge' THEN
  SELECT * INTO old FROM public.ay2_announcements WHERE site_id=s AND id=(p->>'id')::uuid FOR SHARE;
  IF NOT FOUND OR NOT ay2_private.ay5_receives(old.id) OR NOT old.published OR old.revision IS DISTINCT FROM (p->>'revision')::int OR old.starts_at>now() OR old.ends_at<=now() THEN RAISE EXCEPTION 'Duyuru sürümü değişti. Yeniden açın.' USING errcode='42501';END IF;
  INSERT INTO public.ay3_acknowledgements VALUES(s,old.id,auth.uid(),old.revision,now()) ON CONFLICT DO NOTHING;RETURN jsonb_build_object('ok',true);
 END IF;
 IF act='announcement' THEN
  IF NOT ay2_private.can(s,'announcements') THEN RAISE EXCEPTION 'Yetkiniz yok.' USING errcode='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
  SELECT coalesce(array_agg(x::uuid),'{}') INTO targets FROM jsonb_array_elements_text(coalesce(p->'target_units','[]')) x;
  SELECT coalesce(array_agg(x),'{}') INTO blocks FROM jsonb_array_elements_text(coalesce(p->'target_blocks','[]')) x;
  IF EXISTS(SELECT 1 FROM unnest(targets) u WHERE NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=u AND site_id=s)) OR EXISTS(SELECT 1 FROM unnest(blocks) b WHERE NOT EXISTS(SELECT 1 FROM public.site_blocks WHERE code=b AND site_id=s)) THEN RAISE EXCEPTION 'Hedef daire veya blok geçersiz.';END IF;
  IF p->>'target_kind'='units' AND cardinality(targets)=0 OR p->>'target_kind'='blocks' AND cardinality(blocks)=0 THEN RAISE EXCEPTION 'Hedef seçin.';END IF;
  res:=ay2_private.command(s,act,p);ident:=(res->>'id')::uuid;
  UPDATE public.ay2_announcements SET popup_on_login=coalesce((p->>'popup_on_login')::boolean,false),target_kind=coalesce(p->>'target_kind','all'),target_units=targets,target_blocks=blocks,title_de=coalesce(p->>'title_de',''),body_de=coalesce(p->>'body_de','') WHERE id=ident AND site_id=s;
  RETURN res;
 END IF;
 IF act IN ('assignment_add','assignment_edit','assignment_restore') THEN
  SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=nullif(p->>'id','')::uuid;
  res:=ay2_private.command(s,act,p);
  IF p ? 'mandates' THEN
   UPDATE public.ay3_links SET mandates=CASE WHEN role='representative' THEN ARRAY(SELECT DISTINCT jsonb_array_elements_text(p->'mandates')) ELSE '{}' END WHERE id=(res->>'id')::uuid AND site_id=s;
   INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) SELECT s,auth.uid(),'notification_mandates',id,jsonb_build_object('before',coalesce(to_jsonb(l.mandates),'[]'::jsonb),'after',to_jsonb(mandates),'request_id',p->>'request_id') FROM public.ay3_links WHERE site_id=s AND id=(res->>'id')::uuid AND coalesce(l.mandates,'{}') IS DISTINCT FROM mandates;
  END IF;
  RETURN res;
 END IF;
 IF NOT ay2_private.can(s,'finance') THEN RAISE EXCEPTION 'Bu işlem için yetkiniz yok.' USING errcode='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(s::text,0));
 SELECT * INTO op FROM public.ay5_operations WHERE site_id=s AND request_id=(p->>'request_id')::uuid;
 IF FOUND THEN IF op.payload IS DISTINCT FROM (p||jsonb_build_object('_action',act)) THEN RAISE EXCEPTION 'Bu istek farklı değerlerle kaydedildi.';END IF;RETURN op.result||'{"already_recorded":true}'::jsonb;END IF;
 INSERT INTO public.ay5_operations(site_id,request_id,payload,created_by) VALUES(s,(p->>'request_id')::uuid,p||jsonb_build_object('_action',act),auth.uid()) RETURNING id INTO oid;
 IF act='monthly_exception' THEN
  IF NOT EXISTS(SELECT 1 FROM public.site_units WHERE id=(p->>'unit_id')::uuid AND site_id=s) OR (nullif(p->>'person_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.ay3_links WHERE site_id=s AND unit_id=(p->>'unit_id')::uuid AND person_id=(p->>'person_id')::uuid)) THEN RAISE EXCEPTION 'Daire ve kişiyi kontrol edin.';END IF;
  IF EXISTS(SELECT 1 FROM public.ay5_monthly_exceptions WHERE site_id=s AND unit_id=(p->>'unit_id')::uuid AND kind=p->>'kind' AND disabled_at IS NULL AND daterange(valid_from,valid_to,'[]') && daterange((p->>'valid_from')::date,nullif(p->>'valid_to','')::date,'[]')) THEN RAISE EXCEPTION 'Bu dönem için istisna zaten var.';END IF;
  INSERT INTO public.ay5_monthly_exceptions(site_id,unit_id,person_id,kind,reference_cents,valid_from,valid_to,reason,decision_ref,created_by) VALUES(s,(p->>'unit_id')::uuid,nullif(p->>'person_id','')::uuid,p->>'kind',(p->>'reference_cents')::bigint,(p->>'valid_from')::date,nullif(p->>'valid_to','')::date,p->>'reason',p->>'decision_ref',auth.uid()) RETURNING id INTO ident;
 ELSIF act='disable_exception' THEN
  IF length(btrim(coalesce(p->>'reason','')))<3 THEN RAISE EXCEPTION 'Gerekçe gerekli.';END IF;
  UPDATE public.ay5_monthly_exceptions SET disabled_at=now() WHERE site_id=s AND id=(p->>'id')::uuid AND disabled_at IS NULL RETURNING id INTO ident;IF ident IS NULL THEN RAISE EXCEPTION 'Aktif istisna bulunamadı.';END IF;
 ELSIF act='budget' THEN
  INSERT INTO public.ay5_budget VALUES(s,(p->>'restricted_cents')::bigint,(p->>'planned_cents')::bigint,p->>'reason',auth.uid(),now()) ON CONFLICT(site_id) DO UPDATE SET restricted_cents=excluded.restricted_cents,planned_cents=excluded.planned_cents,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 ELSIF act IN ('batch_charge','monthly_v5') THEN
  IF coalesce((p->>'confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Önizlemeyi onaylayın.';END IF;
  IF length(btrim(coalesce(p->>'basis_ref','')))<3 THEN RAISE EXCEPTION 'Karar / dayanak referansı gerekli.';END IF;
  SELECT array_agg(u.id ORDER BY u.id) INTO ids FROM public.site_units u JOIN public.site_blocks b ON b.id=u.block_id WHERE u.site_id=s AND (p->>'scope'='all' OR b.code=p->>'scope' OR p->>'scope'='selected' AND u.id::text IN (SELECT jsonb_array_elements_text(coalesce(p->'unit_ids','[]'))));
  FOR item IN SELECT value FROM jsonb_array_elements(coalesce(p->'exclusions','[]')) LOOP
   IF NOT ((item->>'unit_id')::uuid=ANY(ids)) OR length(btrim(coalesce(item->>'reason','')))<3 THEN RAISE EXCEPTION 'Hariç tutma gerekçesi gerekli.';END IF;
   ids:=array_remove(ids,(item->>'unit_id')::uuid);
  END LOOP;
  IF coalesce(cardinality(ids),0) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION '1–20 daire seçin.';END IF;
  total:=(p->>'cents')::bigint;IF total IS NULL OR total NOT BETWEEN 1 AND 900000000000 THEN RAISE EXCEPTION 'Tutar geçersiz.';END IF;
  IF coalesce(p->>'distribution','') NOT IN ('total','per_unit','shares') THEN RAISE EXCEPTION 'Dağıtım türünü seçin.';END IF;
  weights:='{}';amounts:='{}';denom:=0;
  FOREACH ident IN ARRAY ids LOOP n:=CASE WHEN p->>'distribution'='shares' THEN (p->'weights'->>ident::text)::int ELSE 1 END;IF n IS NULL OR n<=0 OR n>1000000000 THEN RAISE EXCEPTION 'Arsa paylarını kontrol edin.';END IF;weights:=array_append(weights,n);denom:=denom+n;END LOOP;
  FOR idx IN 1..cardinality(ids) LOOP amounts:=array_append(amounts,CASE WHEN p->>'distribution'='per_unit' THEN total ELSE floor(total::numeric*weights[idx]/denom)::bigint END);END LOOP;
  IF p->>'distribution'<>'per_unit' THEN
   SELECT total-sum(x) INTO leftovers FROM unnest(amounts) x;
   FOR row IN SELECT i FROM generate_subscripts(weights,1) i ORDER BY mod(total::numeric*weights[i],denom) DESC,i LIMIT leftovers LOOP amounts[row.i]:=amounts[row.i]+1;END LOOP;
  END IF;
  IF (SELECT sum(x) FROM unnest(amounts) x)>900000000000 OR 0=ANY(amounts) THEN RAISE EXCEPTION 'Dağıtım tutarını kontrol edin.';END IF;
  cat:=CASE WHEN act='monthly_v5' THEN 'Aidat' ELSE p->>'category' END;
  IF act='batch_charge' AND cat NOT IN ('Genel Gider / İşletme','Bakım ve Onarım','Demirbaş') THEN RAISE EXCEPTION 'Kategori seçin.';END IF;
  IF p->>'debt_group' NOT IN ('general','capital','legal') THEN RAISE EXCEPTION 'Borç grubunu seçin.';END IF;
  start_on:=(p->>'due_on')::date;res:=jsonb_build_object('charges','[]'::jsonb,'excluded','[]'::jsonb,'operation_id',oid);
  FOR idx IN 1..cardinality(ids) LOOP
   SELECT * INTO l FROM public.ay3_links WHERE site_id=s AND id=(p->'debtors'->>ids[idx]::text)::uuid AND unit_id=ids[idx] AND role IN ('owner','tenant') AND active AND archived_at IS NULL AND (starts_on IS NULL OR starts_on<=start_on) AND (ends_on IS NULL OR ends_on>=start_on);
   IF NOT FOUND THEN RAISE EXCEPTION 'Her daire için sorumlu kişiyi seçin.';END IF;
   IF act='monthly_v5' THEN
    SELECT * INTO ex FROM public.ay5_monthly_exceptions WHERE site_id=s AND unit_id=ids[idx] AND (person_id IS NULL OR person_id=l.person_id) AND kind='exemption' AND disabled_at IS NULL AND valid_from<=start_on AND (valid_to IS NULL OR valid_to>=start_on) ORDER BY created_at LIMIT 1;
    IF FOUND THEN IF ex.reference_cents IS DISTINCT FROM amounts[idx] THEN RAISE EXCEPTION 'İstisna tutarı değişti. Kararı yeniden kontrol edin.';END IF;res:=jsonb_set(res,'{excluded}',res->'excluded'||jsonb_build_array(to_jsonb(ex)));CONTINUE;END IF;
   END IF;
   IF (p->'expected'->>ids[idx]::text)::bigint IS DISTINCT FROM amounts[idx] THEN RAISE EXCEPTION 'Önizleme değişti. Yeniden kontrol edin.';END IF;
   ref:=CASE WHEN act='monthly_v5' THEN 'monthly:'||date_trunc('month',start_on)::date ELSE 'batch:'||oid END;
   IF EXISTS(SELECT 1 FROM public.ay2_charges WHERE site_id=s AND unit_id=ids[idx] AND reference=ref) THEN RAISE EXCEPTION 'Bu dönem için aidat zaten oluşturuldu.';END IF;
   item:=ay2_private.command(s,'charge',jsonb_build_object('unit_id',ids[idx],'link_id',l.id,'category',cat,'label',p->>'label','due_on',start_on,'cents',amounts[idx],'payer',l.role,'reference',ref,'period_from',p->>'period_from','period_to',p->>'period_to'));
   ident:=(item->>'id')::uuid;
   UPDATE public.ay2_charges SET operation_id=oid,debt_group=p->>'debt_group',distribution_basis=jsonb_build_object('distribution',p->>'distribution','weight',weights[idx],'basis_ref',p->>'basis_ref') WHERE id=ident;
   res:=jsonb_set(res,'{charges}',res->'charges'||jsonb_build_array(jsonb_build_object('id',ident,'unit_id',ids[idx],'cents',amounts[idx])));
  END LOOP;
 ELSIF act='auto_allocate' THEN
  IF coalesce((p->>'confirmed')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Önizlemeyi onaylayın.';END IF;
  plan:=ay2_private.ay5_payment_plan(s,p);IF plan IS DISTINCT FROM p->'expected_plan' THEN RAISE EXCEPTION 'Ödeme bakiyesi değişti. Yeniden kontrol edin.';END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(plan->'allocations') LOOP PERFORM ay2_private.command(s,'allocate',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',p->>'entry_id','charge_id',item->>'charge_id','cents',item->>'cents'));END LOOP;
  IF (plan->>'credit_cents')::bigint>0 THEN
   item:=ay2_private.command(s,'credit',jsonb_build_object('request_id',gen_random_uuid(),'entry_id',p->>'entry_id','unit_id',p->>'unit_id','person_id',p->>'person_id','cents',plan->>'credit_cents'));
   UPDATE public.ay3_credits SET debt_group=p->>'group' WHERE id=(item->>'id')::uuid;
  END IF;res:=plan;
 ELSE RAISE EXCEPTION 'Bilinmeyen işlem.';
 END IF;
 res:=coalesce(res,jsonb_build_object('ok',true,'id',ident));UPDATE public.ay5_operations SET result=res WHERE id=oid;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(s,auth.uid(),act,oid,jsonb_build_object('request_id',p->>'request_id','payload',p,'result',res));
 RETURN res;
END; $$;
COMMIT;
