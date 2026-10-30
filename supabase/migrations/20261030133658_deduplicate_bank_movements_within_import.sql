-- Deduplicate repeated source movements before inserting the batch.
-- No data rows, policies, function grants or original finance records are changed.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF md5(pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure)) <> 'e28c3f1bb4d850ae972b396fa28c5302' THEN
  RAISE EXCEPTION 'Import correction requires the reviewed command version';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION ay2_private.command(s uuid, act text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ident uuid;pid uuid;uid uuid;l public.ay3_links;c public.ay2_charges;e public.ay2_entries;cr public.ay3_credits;
 need text;res jsonb;label text;amount bigint;available bigint;used bigint;previous uuid;item jsonb;filtered jsonb:='[]'::jsonb;duplicates int:=0;start_date date;end_date date;created timestamptz:=now();import_key text;import_keys text[]:='{}'::text[];
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
   for item in select value from jsonb_array_elements(p->'entries') loop
    -- Match the existing cross-file identity inside this request as well.
   -- Running balance and formatting changes do not create a second reference.
   import_key:=jsonb_build_array((item->>'date')::date,(item->>'cents')::bigint,coalesce(item->>'reference',''),case when coalesce(item->>'reference','')='' then btrim(item->>'desc') else null end)::text;
   if import_key=any(import_keys) or exists(select 1 from public.ay2_entries where site_id=s and booked_on=(item->>'date')::date and cents=(item->>'cents')::bigint and bank_reference=coalesce(item->>'reference','') and (description=btrim(item->>'desc') or coalesce(item->>'reference','')<>'')) then duplicates:=duplicates+1;
    else filtered:=filtered||jsonb_build_array(item);import_keys:=array_append(import_keys,import_key);end if;
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
COMMIT;
