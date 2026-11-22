-- Guarded debtor correction: reassign a charge without rewriting an amount, ledger entry or payment.
-- No existing charge, allocation, person or bank entry is changed by this migration.
create or replace function ay2_private.reassign_charge(s uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
 v_charge public.ay2_charges%rowtype;
 v_link public.ay3_links%rowtype;
 v_reason text := btrim(coalesce(p->>'reason',''));
 v_expected_person uuid;
 v_expected_link uuid;
begin
 if auth.uid() is null or not ay2_private.can(s,'admin') then
  raise exception 'Bu işlem için Süper Admin yetkisi gerekli.' using errcode='42501';
 end if;
 if coalesce(p->>'confirmation','') <> 'true' then
  raise exception 'Sorumlu değişikliği onayı gerekli.';
 end if;
 if length(v_reason) < 5 or length(v_reason) > 500 then
  raise exception 'Değişiklik gerekçesi 5–500 karakter olmalı.';
 end if;
 if nullif(p->>'charge_id','') is null or nullif(p->>'link_id','') is null then
  raise exception 'Borç ve yeni sorumlu seçimi gerekli.';
 end if;
 select * into v_charge from public.ay2_charges
 where site_id=s and id=(p->>'charge_id')::uuid
 for update;
 if not found or v_charge.void_reason is not null then
  raise exception 'Aktif borç kaydı bulunamadı.';
 end if;
 if v_charge.person_id is null then
  raise exception 'Bu borcun sorumlusu yok. Kişi belirle işlemini kullanın.';
 end if;
 v_expected_person := nullif(p->>'expected_person_id','')::uuid;
 v_expected_link := nullif(p->>'expected_link_id','')::uuid;
 if v_charge.person_id is distinct from v_expected_person
    or v_charge.link_id is distinct from v_expected_link then
  raise exception 'Sorumlu kişi bu ekran açıldıktan sonra değişti. Yeniden yükleyip kontrol edin.';
 end if;
 select * into v_link from public.ay3_links
 where site_id=s and unit_id=v_charge.unit_id and id=(p->>'link_id')::uuid
 and role in ('owner','tenant');
 if not found then
  raise exception 'Aynı daireye bağlı malik veya kiracı seçin.';
 end if;
 if v_link.person_id=v_charge.person_id then
  raise exception 'Aynı kişi zaten sorumlu görünüyor. Farklı kişiyi seçin.';
 end if;
 if exists(select 1 from public.ay2_allocations a
           where a.site_id=s and a.charge_id=v_charge.id and a.void_reason is null) then
  raise exception 'Bu borca ödeme mahsup edilmiş. Önce ödeme eşleştirmelerini gerekçeyle düzeltin.';
 end if;
 -- One transaction: preserve financial amounts and the original bank ledger, with audit before update.
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values (s,auth.uid(),'reassign_charge',v_charge.id,
 jsonb_build_object(
  'unit_id',v_charge.unit_id,
  'old_person_id',v_charge.person_id,'old_link_id',v_charge.link_id,
  'new_person_id',v_link.person_id,'new_link_id',v_link.id,
  'new_role',v_link.role,
  'reason',v_reason,
  'charge_category',v_charge.category,
  'charge_label',v_charge.label,
  'charge_cents',v_charge.cents));
 update public.ay2_charges
 set person_id=v_link.person_id,link_id=v_link.id
 where id=v_charge.id and site_id=s;
 return jsonb_build_object('id',v_charge.id,'unit_id',v_charge.unit_id,
  'old_person_id',v_charge.person_id,'new_person_id',v_link.person_id);
end;
$$;

revoke all on function ay2_private.reassign_charge(uuid,jsonb) from public, anon;
grant execute on function ay2_private.reassign_charge(uuid,jsonb) to authenticated;

-- Public thin wrapper is SECURITY INVOKER; the private routine enforces manager and record checks.
create or replace function public.ay3_reassign_charge(p_site uuid,p_payload jsonb)
returns jsonb
language sql
security invoker
set search_path to ''
as $$
 select ay2_private.reassign_charge(p_site,p_payload);
$$;
revoke all on function public.ay3_reassign_charge(uuid,jsonb) from public,anon;
grant execute on function public.ay3_reassign_charge(uuid,jsonb) to authenticated;
