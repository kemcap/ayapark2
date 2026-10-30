-- Explicit capital levy review, private evidence, scoped owner preview and guarded finalization.
-- Reuse ay3_charge_drafts; this is a review record, never a second ledger.
begin;
set local lock_timeout='5s';
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
declare draft public.ay3_charge_drafts; existing public.ay3_levy_reviews; ident uuid; item record; target_keys text[]; expected_keys text[];
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
 select array_agg(u.id::text order by u.id::text) into target_keys from public.site_units u join public.site_blocks b on b.id=u.block_id where u.site_id=p_site
 and (draft.payload->>'scope'='all' or b.code=draft.payload->>'scope' or draft.payload->>'scope'='selected' and u.id::text in(select jsonb_array_elements_text(coalesce(draft.payload->'unit_ids','[]'::jsonb))))
 and not exists(select 1 from jsonb_array_elements(coalesce(draft.payload->'exclusions','[]'::jsonb)) x where x->>'unit_id'=u.id::text);
 select array_agg(key order by key) into expected_keys from jsonb_object_keys(draft.payload->'expected') key;
 if cardinality(target_keys) not between 1 and 20 or target_keys is distinct from expected_keys then raise exception 'Levy review target mismatch';end if;
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
 if original.draft_snapshot->>'liability_on' is not null and (original.draft_snapshot->>'liability_on')::date is distinct from p_liability_on then raise exception 'Levy review responsibility date changed';end if;
 if exists(select 1 from jsonb_each_text(original.draft_snapshot->'expected') d where not exists(select 1 from public.ay3_links l where l.id=(original.draft_snapshot->'debtors'->>d.key)::uuid and l.site_id=p_site and l.unit_id=d.key::uuid and l.role='owner' and ((l.active and l.archived_at is null) or (l.starts_on is not null and l.ends_on is not null)) and (l.starts_on is null or l.starts_on<=p_liability_on) and (l.ends_on is null or l.ends_on>=p_liability_on))) then raise exception 'Levy review historical responsibility mismatch';end if;
 update public.ay3_levy_reviews set status='documented',decision_date=p_decision_date,evidence_reference=btrim(p_evidence_reference),liability_on=p_liability_on,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'levy_review_documented',p_id,jsonb_build_object('draft_id',original.draft_id,'fingerprint',original.draft_fingerprint));
end;$$;
create function public.ay3_withdraw_levy_review(p_site uuid,p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Levy review access denied' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Levy review withdrawal reason required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 if exists(select 1 from public.ay3_levy_reviews r join public.ay3_charge_drafts d on d.id=r.draft_id and d.site_id=r.site_id where r.id=p_id and r.site_id=p_site and d.status='approved') then raise exception 'Levy review booked evidence retained';end if;
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

-- Share the existing financial core; clients retain only the guarded entry point.
-- Rename once, retaining all existing rules and drift-check each targeted extension.
DO $extend$
DECLARE definition text; original text; eligibility text;
BEGIN
 definition:=pg_get_functiondef('ay2_private.ay5_command(uuid,text,jsonb)'::regprocedure);
 IF md5((SELECT prosrc FROM pg_proc WHERE oid='ay2_private.ay5_command(uuid,text,jsonb)'::regprocedure))<>'5ee83f811df82571d5672a3038afccf2' THEN RAISE EXCEPTION 'Levy migration financial core drift';END IF;
 ALTER FUNCTION ay2_private.ay5_command(uuid,text,jsonb) RENAME TO ay5_command_review_core;
 definition:=pg_get_functiondef('ay2_private.ay5_command_review_core(uuid,text,jsonb)'::regprocedure);
 original:=definition;
 definition:=replace(definition,'start_on date;','start_on date; levy public.ay3_levy_reviews;');
 definition:=replace(definition,
  ' INSERT INTO public.ay5_operations(site_id,request_id,payload,created_by)',
  $code$ IF act='batch_charge' AND p->>'debt_group'='capital' THEN
  SELECT r.* INTO levy FROM public.ay3_levy_reviews r JOIN public.ay3_charge_drafts d ON d.id=r.draft_id AND d.site_id=r.site_id
  WHERE r.site_id=s AND d.id=(p->>'request_id')::uuid AND d.status='pending' AND d.action=act
   AND r.status='documented' AND d.payload=r.draft_snapshot
   AND p=(d.payload||jsonb_build_object('request_id',d.id,'confirmed',true));
  IF NOT FOUND THEN RAISE EXCEPTION 'Levy review documented approval required';END IF;
 END IF;
 INSERT INTO public.ay5_operations(site_id,request_id,payload,created_by)$code$);
 eligibility:=$code$AND role IN ('owner','tenant') AND active AND archived_at IS NULL AND (starts_on IS NULL OR starts_on<=start_on) AND (ends_on IS NULL OR ends_on>=start_on)$code$;
 IF strpos(definition,eligibility)=0 THEN RAISE EXCEPTION 'Levy migration debtor rule drift';END IF;
 definition:=replace(definition,eligibility,$code$AND role IN ('owner','tenant')
 AND ((levy.id IS NOT NULL AND role='owner' AND ((active AND archived_at IS NULL) OR (starts_on IS NOT NULL AND ends_on IS NOT NULL))) OR (levy.id IS NULL AND active AND archived_at IS NULL))
 AND (starts_on IS NULL OR starts_on<=coalesce(levy.liability_on,start_on)) AND (ends_on IS NULL OR ends_on>=coalesce(levy.liability_on,start_on))$code$);
 definition:=replace(definition,$code$'basis_ref',p->>'basis_ref') WHERE id=ident;$code$,$code$'basis_ref',p->>'basis_ref') || CASE WHEN levy.id IS NOT NULL THEN jsonb_build_object('levy_review_id',levy.id,'liability_on',levy.liability_on,'decision_date',levy.decision_date,'review_fingerprint',levy.draft_fingerprint) ELSE '{}'::jsonb END WHERE id=ident;$code$);
 IF definition=original OR strpos(definition,'documented approval required')=0 OR strpos(definition,'review_fingerprint')=0 THEN RAISE EXCEPTION 'Levy migration core patch incomplete';END IF;
 EXECUTE definition;
END;$extend$;
REVOKE ALL ON FUNCTION ay2_private.ay5_command_review_core(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION ay2_private.ay5_command(s uuid,act text,p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM ay2_private.require_task_action(s,act,p);
 IF act='batch_charge' AND p->>'debt_group'='capital' THEN RAISE EXCEPTION 'Levy review use documented draft approval';END IF;
 RETURN ay2_private.ay5_command_review_core(s,act,p);
END;$$;
REVOKE ALL ON FUNCTION ay2_private.ay5_command(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ay2_private.ay5_command(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.ay5_command(p_site uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE sql SET search_path='' AS $$SELECT ay2_private.ay5_command(p_site,p_action,p_payload);$$;
CREATE OR REPLACE FUNCTION public.ay3_decide_charge_draft(p_site uuid,p_id uuid,p_approve boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE draft public.ay3_charge_drafts;res jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Access denied' USING errcode='42501';END IF;
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Decision required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 SELECT * INTO draft FROM public.ay3_charge_drafts WHERE site_id=p_site AND id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable';END IF;
 IF draft.status<>'pending' THEN
  IF (draft.status='approved') IS DISTINCT FROM p_approve THEN RAISE EXCEPTION 'Decision conflict';END IF;RETURN draft.result;
 END IF;
 IF p_approve THEN
  -- Only this checked transaction may call the private reviewed financial core.
  IF draft.action='batch_charge' AND draft.payload->>'debt_group'='capital' THEN
   res:=ay2_private.ay5_command_review_core(p_site,draft.action,draft.payload||jsonb_build_object('request_id',draft.id,'confirmed',true));
  ELSE res:=ay2_private.ay5_command(p_site,draft.action,draft.payload||jsonb_build_object('request_id',draft.id,'confirmed',true));END IF;
 ELSE res:=jsonb_build_object('rejected',true);END IF;
 UPDATE public.ay3_charge_drafts SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,result=res,decided_by=auth.uid(),decided_at=now() WHERE id=draft.id;
 INSERT INTO public.ay2_audit(site_id,actor,action,entity_id,details) VALUES(p_site,auth.uid(),'charge_draft_decided',draft.id,jsonb_build_object('approved',p_approve));
 RETURN res;
END;$$;
CREATE FUNCTION public.ay3_levy_review_workspace(p_site uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT ay2_private.can(p_site,'admin') THEN RAISE EXCEPTION 'Levy review access denied' USING errcode='42501';END IF;
 RETURN jsonb_build_object('reviews',coalesce((SELECT jsonb_agg(r ORDER BY created_at DESC) FROM (SELECT * FROM public.ay3_levy_reviews WHERE site_id=p_site ORDER BY created_at DESC LIMIT 100)r),'[]'::jsonb),
 'drafts',coalesce((SELECT jsonb_agg(d ORDER BY created_at DESC) FROM (SELECT * FROM public.ay3_charge_drafts WHERE site_id=p_site AND action='batch_charge' AND payload->>'debt_group'='capital' ORDER BY created_at DESC LIMIT 100)d),'[]'::jsonb));
END;$$;
REVOKE ALL ON FUNCTION public.ay3_levy_review_workspace(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ay3_levy_review_workspace(uuid) TO authenticated;
commit;
