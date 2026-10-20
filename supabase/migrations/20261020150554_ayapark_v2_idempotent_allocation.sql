-- Harden retries: one request cannot be reused with different allocation values.
create or replace function ay2_private.command(s uuid,act text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 need text; ident uuid; u uuid; e public.ay2_entries; c public.ay2_charges; a public.ay2_allocations;
 n bigint; paid bigint; used bigint; item jsonb; inserted_count int:=0; duplicate_count int:=0;
 batch uuid; fingerprint text; period_start date; period_end date; opening bigint; income bigint; expense bigint;
 original public.ay2_staged_charges; caps text[]; result jsonb;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli.' using errcode='42501'; end if;
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
  select coalesce(sum(cents) filter(where cents>0),0),coalesce(-sum(cents) filter(where cents<0),0) into income,expense from public.ay2_entries where site_id=s and booked_on>=period_start and booked_on<period_end;
  insert into public.ay2_reports(site_id,period,opening_cents,income_cents,expense_cents,closing_cents,source_last_date,published_by)
  values(s,period_start,opening,income,expense,opening+income-expense,(select max(booked_on) from public.ay2_entries where site_id=s and booked_on<period_end),auth.uid())
  on conflict(site_id,period) do update set opening_cents=excluded.opening_cents,income_cents=excluded.income_cents,expense_cents=excluded.expense_cents,closing_cents=excluded.closing_cents,source_last_date=excluded.source_last_date,published_at=now(),published_by=excluded.published_by;
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
$$;

revoke all on function ay2_private.command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function ay2_private.command(uuid,text,jsonb) to authenticated;
