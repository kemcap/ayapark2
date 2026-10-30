-- Development candidate only. No live installation / no booking integration yet.
-- Reuse ay3_charge_drafts; this is a review record, never a second ledger.
begin;
create table public.ay3_levy_reviews(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 draft_id uuid not null references public.ay3_charge_drafts(id),request_id uuid not null,
 draft_snapshot jsonb not null,draft_fingerprint text not null,
 public_title text not null check(length(public_title) between 3 and 160),
 public_summary text not null check(length(public_summary) between 10 and 1000),
 status text not null default 'shared' check(status in ('shared','documented','withdrawn')),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 decision_date date,evidence_reference text,liability_on date,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 unique(site_id,request_id),
 check(status<>'documented' or (decision_date is not null and length(evidence_reference) between 3 and 500 and liability_on is not null and reviewed_by is not null and reviewed_at is not null))
);
create unique index levy_one_current_review on public.ay3_levy_reviews(site_id,draft_id) where status<>'withdrawn';
alter table public.ay3_levy_reviews enable row level security;
revoke all on public.ay3_levy_reviews from public,anon,authenticated;
grant select on public.ay3_levy_reviews to authenticated;
create policy levy_admin_read on public.ay3_levy_reviews for select to authenticated using(ay2_private.can(site_id,'admin'));
create function public.ay3_share_levy_review(p_site uuid,p_draft uuid,p_request uuid,p_title text,p_summary text,p_confirm boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare draft public.ay3_charge_drafts; existing public.ay3_levy_reviews; ident uuid; item record;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Levy review access denied' using errcode='42501';end if;
 if p_confirm is distinct from true or p_request is null or length(btrim(coalesce(p_title,''))) not between 3 and 160 or length(btrim(coalesce(p_summary,''))) not between 10 and 1000 then raise exception 'Levy review sharing confirmation required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 select * into existing from public.ay3_levy_reviews where site_id=p_site and request_id=p_request;
 if found then
  if existing.draft_id is distinct from p_draft or existing.public_title is distinct from btrim(p_title) or existing.public_summary is distinct from btrim(p_summary) then raise exception 'Levy review request conflict';end if;
  return existing.id;
 end if;
 select * into draft from public.ay3_charge_drafts where site_id=p_site and id=p_draft and status='pending' and action='batch_charge';
 if not found or draft.payload->>'debt_group' is distinct from 'capital' or jsonb_typeof(draft.payload->'expected') is distinct from 'object' or draft.payload->'expected'='{}'::jsonb then raise exception 'Levy review valid pending capital draft required';end if;
 for item in select key,value from jsonb_each_text(draft.payload->'expected') loop
  if item.value!~'^[1-9][0-9]{0,11}$' or item.value::bigint>900000000000 or not exists(select 1 from public.site_units u join public.ay3_links l on l.unit_id=u.id and l.site_id=u.site_id where u.site_id=p_site and u.id=item.key::uuid and l.id=(draft.payload->'debtors'->>item.key)::uuid and l.role='owner') then raise exception 'Levy review owner and amount required';end if;
 end loop;
 insert into public.ay3_levy_reviews(site_id,draft_id,request_id,draft_snapshot,draft_fingerprint,public_title,public_summary,created_by)
 values(p_site,p_draft,p_request,draft.payload,md5(draft.payload::text),btrim(p_title),btrim(p_summary),auth.uid()) returning id into ident;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'levy_review_shared',ident,jsonb_build_object('draft_id',p_draft));return ident;
end;$$;
create function public.ay3_document_levy_review(p_site uuid,p_id uuid,p_decision_date date,p_evidence_reference text,p_liability_on date,p_external_decision_verified boolean,p_distribution_verified boolean,p_responsibility_verified boolean)
returns void language plpgsql security definer set search_path='' as $$
declare original public.ay3_levy_reviews; draft public.ay3_charge_drafts;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Levy review access denied' using errcode='42501';end if;
 if p_external_decision_verified is distinct from true or p_distribution_verified is distinct from true or p_responsibility_verified is distinct from true or p_decision_date is null or p_decision_date>(now() at time zone 'Europe/Istanbul')::date or p_liability_on is null or length(btrim(coalesce(p_evidence_reference,''))) not between 3 and 500 then raise exception 'Levy review evidence confirmation required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 select * into original from public.ay3_levy_reviews where site_id=p_site and id=p_id and status<>'withdrawn' for update;
 if not found then raise exception 'Levy review unavailable';end if;
 select * into draft from public.ay3_charge_drafts where site_id=p_site and id=original.draft_id and status='pending';
 if not found or draft.payload is distinct from original.draft_snapshot then raise exception 'Levy review draft changed';end if;
 if original.status='documented' then
  if (original.decision_date,original.evidence_reference,original.liability_on) is distinct from (p_decision_date,btrim(p_evidence_reference),p_liability_on) then raise exception 'Levy review immutable documentation';end if;return;
 end if;
 if exists(select 1 from jsonb_each_text(original.draft_snapshot->'debtors') d where not exists(select 1 from public.ay3_links l where l.id=d.value::uuid and l.site_id=p_site and l.unit_id=d.key::uuid and l.role='owner' and (l.starts_on is null or l.starts_on<=p_liability_on) and (l.ends_on is null or l.ends_on>=p_liability_on))) then raise exception 'Levy review historical responsibility mismatch';end if;
 update public.ay3_levy_reviews set status='documented',decision_date=p_decision_date,evidence_reference=btrim(p_evidence_reference),liability_on=p_liability_on,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'levy_review_documented',p_id,jsonb_build_object('draft_id',original.draft_id,'fingerprint',original.draft_fingerprint));
end;$$;
create function public.ay3_withdraw_levy_review(p_site uuid,p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Levy review access denied' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Levy review withdrawal reason required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 update public.ay3_levy_reviews set status='withdrawn' where site_id=p_site and id=p_id and status<>'withdrawn';
 if found then insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'levy_review_withdrawn',p_id,jsonb_build_object('reason',btrim(p_reason)));end if;
end;$$;
create function public.ay3_owner_levy_previews(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.view_site(p_site) then raise exception 'Levy review access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('review_id',r.id,'title',r.public_title,'summary',r.public_summary,'status',r.status,
 'unit_id',u.id,'unit_code',u.code,'proposed_cents',amount.value::bigint,'due_on',r.draft_snapshot->>'due_on','is_charge',false) order by r.created_at desc,u.code)
 from public.ay3_levy_reviews r join public.ay3_charge_drafts d on d.id=r.draft_id and d.site_id=r.site_id and d.status='pending' and d.payload=r.draft_snapshot
 cross join lateral jsonb_each_text(r.draft_snapshot->'expected') amount
 join public.site_units u on u.site_id=r.site_id and u.id=amount.key::uuid
 where r.site_id=p_site and r.status<>'withdrawn' and exists(select 1 from public.ay3_links l where l.site_id=p_site and l.unit_id=u.id and l.role='owner' and ay2_private.own_person(l.person_id) and l.active and l.archived_at is null and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date))),'[]'::jsonb);
end;$$;
revoke all on function public.ay3_share_levy_review(uuid,uuid,uuid,text,text,boolean),public.ay3_document_levy_review(uuid,uuid,date,text,date,boolean,boolean,boolean),public.ay3_withdraw_levy_review(uuid,uuid,text),public.ay3_owner_levy_previews(uuid) from public,anon,authenticated;
grant execute on function public.ay3_share_levy_review(uuid,uuid,uuid,text,text,boolean),public.ay3_document_levy_review(uuid,uuid,date,text,date,boolean,boolean,boolean),public.ay3_withdraw_levy_review(uuid,uuid,text),public.ay3_owner_levy_previews(uuid) to authenticated;
commit;
