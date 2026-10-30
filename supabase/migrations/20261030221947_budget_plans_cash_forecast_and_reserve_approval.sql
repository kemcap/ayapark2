-- Budget metadata only. No bank entry, charge, allocation or automatic payment.
begin;
set local lock_timeout='5s';
DO $preflight$ BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='ay2_private.ay5_command(uuid,text,jsonb)'::regprocedure)<>'2f0edeb5ed3fec4227798e6e2fa896ca' THEN RAISE EXCEPTION 'Budget migration financial wrapper drift';END IF;
END;$preflight$;
alter table public.ay5_budget add column planning_revision uuid references public.ay5_operations(id);
create table public.ay6_budget_plans(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 month date not null check(extract(day from month)=1),kind text not null check(kind in ('income','expense','repair')),
 title text not null check(length(btrim(title)) between 3 and 200),cents bigint not null check(cents between 1 and 900000000000),
 status text not null check(status in ('draft','approved','cancelled')),revision int not null default 1,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.ay6_budget_bindings(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 plan_id uuid not null references public.ay6_budget_plans(id),entry_id uuid not null references public.ay2_entries(id),
 cents bigint not null check(cents between 1 and 900000000000),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 revoked_at timestamptz,revoked_by uuid references auth.users(id),revoke_reason text
);
create table public.ay6_budget_legacy_reviews(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 legacy_fingerprint text not null,mode text not null check(mode in ('carry','represented')),reason text not null,
 plan_id uuid references public.ay6_budget_plans(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.ay6_reserve_uses(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),cents bigint not null check(cents>0),
 reason text not null,basis_reference text not null,emergency boolean not null default false,
 before_cents bigint not null,after_cents bigint not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 check(after_cents=before_cents-cents and after_cents>=0)
);
create index budget_plans_site_month on public.ay6_budget_plans(site_id,month);
create index budget_bindings_entry on public.ay6_budget_bindings(site_id,entry_id) where revoked_at is null;
create index budget_bindings_plan on public.ay6_budget_bindings(site_id,plan_id) where revoked_at is null;
alter table public.ay6_budget_plans enable row level security;
alter table public.ay6_budget_bindings enable row level security;
alter table public.ay6_budget_legacy_reviews enable row level security;
alter table public.ay6_reserve_uses enable row level security;
revoke all on public.ay6_budget_plans,public.ay6_budget_bindings,public.ay6_budget_legacy_reviews,public.ay6_reserve_uses from public,anon,authenticated;
revoke insert,update,delete on public.ay5_budget from anon,authenticated;
grant select on public.ay6_budget_plans,public.ay6_budget_bindings to authenticated;
create policy budget_plans_read on public.ay6_budget_plans for select to authenticated using(ay2_private.can(site_id,'finance'));
create policy budget_bindings_read on public.ay6_budget_bindings for select to authenticated using(ay2_private.can(site_id,'finance'));
grant select on public.ay6_budget_legacy_reviews,public.ay6_reserve_uses to authenticated;
create policy budget_legacy_admin on public.ay6_budget_legacy_reviews for select to authenticated using(ay2_private.can(site_id,'admin'));
create policy reserve_uses_admin on public.ay6_reserve_uses for select to authenticated using(ay2_private.can(site_id,'admin'));

create function ay2_private.budget_request(s uuid,a text,r uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.ay5_operations; ident uuid;
begin
 if auth.uid() is null or not ay2_private.can(s,'admin') then raise exception 'Budget access denied' using errcode='42501';end if;
 if r is null then raise exception 'Budget request required';end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 select * into existing from public.ay5_operations where site_id=s and request_id=r;
 if found then
  if existing.payload is distinct from (p||jsonb_build_object('_action',a)) then raise exception 'Budget request conflict';end if;
  return jsonb_build_object('existing',true,'result',existing.result);
 end if;
 insert into public.ay5_operations(site_id,request_id,payload,created_by) values(s,r,p||jsonb_build_object('_action',a),auth.uid()) returning id into ident;
 return jsonb_build_object('existing',false,'operation_id',ident);
end;$$;
revoke all on function ay2_private.budget_request(uuid,text,uuid,jsonb) from public,anon,authenticated;
create function ay2_private.budget_bank(s uuid) returns bigint
language sql stable security definer set search_path='' as $$
 select settings.opening_cents+coalesce((select sum(e.cents) from public.ay2_entries e where e.site_id=s and e.booked_on>=settings.opening_date and e.booked_on<=(now() at time zone 'Europe/Istanbul')::date),0)
 from public.ay2_settings settings where settings.site_id=s and initialized and opening_date<=(now() at time zone 'Europe/Istanbul')::date;
$$;
revoke all on function ay2_private.budget_bank(uuid) from public,anon,authenticated;
create function ay2_private.budget_legacy_fingerprint(s uuid) returns text
language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_array(planned_cents,reason,planning_revision)::text) from public.ay5_budget where site_id=s;
$$;
revoke all on function ay2_private.budget_legacy_fingerprint(uuid) from public,anon,authenticated;

create function public.ay6_save_budget_plan(p_site uuid,p_request uuid,p_id uuid,p_revision int,p_month date,p_kind text,p_title text,p_cents bigint,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; original public.ay6_budget_plans; ident uuid; answer jsonb; bound bigint;
begin
 req:=ay2_private.budget_request(p_site,'budget_plan_save',p_request,jsonb_build_object('id',p_id,'revision',p_revision,'month',p_month,'kind',p_kind,'title',btrim(p_title),'cents',p_cents,'status',p_status,'reason',btrim(p_reason)));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_month is null or extract(day from p_month)<>1 or p_kind is null or p_kind not in ('income','expense','repair') or p_status is null or p_status not in ('draft','approved','cancelled') or p_cents is null or p_cents not between 1 and 900000000000 or length(btrim(coalesce(p_title,''))) not between 3 and 200 or length(btrim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Budget invalid plan';end if;
 if p_id is null then
  if p_revision is not null then raise exception 'Budget stale revision';end if;
  insert into public.ay6_budget_plans(site_id,month,kind,title,cents,status,created_by) values(p_site,p_month,p_kind,btrim(p_title),p_cents,p_status,auth.uid()) returning id into ident;
 else
  select * into original from public.ay6_budget_plans where site_id=p_site and id=p_id for update;
  if not found or original.revision is distinct from p_revision then raise exception 'Budget stale revision';end if;
  select coalesce(sum(cents),0) into bound from public.ay6_budget_bindings where site_id=p_site and plan_id=p_id and revoked_at is null;
  if bound>p_cents or bound>0 and (original.kind is distinct from p_kind or p_status='cancelled') then raise exception 'Budget bound plan protected';end if;
  update public.ay6_budget_plans set month=p_month,kind=p_kind,title=btrim(p_title),cents=p_cents,status=p_status,revision=revision+1,updated_at=now() where id=p_id;ident:=p_id;
 end if;
 answer:=jsonb_build_object('id',ident,'revision',(select revision from public.ay6_budget_plans where id=ident));
 update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'budget_plan_saved',ident,jsonb_build_object('before',to_jsonb(original),'after',(select to_jsonb(x) from public.ay6_budget_plans x where id=ident),'reason',btrim(p_reason)));
 return answer;
end;$$;

create function public.ay6_bind_budget_payment(p_site uuid,p_request uuid,p_plan uuid,p_entry uuid,p_cents bigint,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; plan public.ay6_budget_plans; entry public.ay2_entries; bank_used bigint; plan_used bigint; ident uuid; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'budget_payment_bind',p_request,jsonb_build_object('plan',p_plan,'entry',p_entry,'cents',p_cents,'confirm',p_confirm));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_cents is null or p_cents not between 1 and 900000000000 then raise exception 'Budget payment confirmation required';end if;
 select * into plan from public.ay6_budget_plans where site_id=p_site and id=p_plan and status<>'cancelled';
 if not found then raise exception 'Budget plan unavailable';end if;
 select * into entry from public.ay2_entries where site_id=p_site and id=p_entry and booked_on<=(now() at time zone 'Europe/Istanbul')::date and reversal_of is null and category<>'Transfer';
 if not found or (plan.kind='income') is distinct from (entry.cents>0) or exists(select 1 from public.ay2_entries r where r.site_id=p_site and r.reversal_of=entry.id) then raise exception 'Budget actual payment required';end if;
 select coalesce(sum(cents),0) into bank_used from public.ay6_budget_bindings where site_id=p_site and entry_id=p_entry and revoked_at is null;
 select coalesce(sum(cents),0) into plan_used from public.ay6_budget_bindings where site_id=p_site and plan_id=p_plan and revoked_at is null;
 if p_cents>abs(entry.cents)-bank_used or p_cents>plan.cents-plan_used then raise exception 'Budget payment exceeds available amount';end if;
 insert into public.ay6_budget_bindings(site_id,plan_id,entry_id,cents,created_by) values(p_site,p_plan,p_entry,p_cents,auth.uid()) returning id into ident;
 answer:=jsonb_build_object('id',ident);update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'budget_payment_bound',ident,jsonb_build_object('plan',p_plan,'entry',p_entry,'cents',p_cents));return answer;
end;$$;
create function public.ay6_unbind_budget_payment(p_site uuid,p_request uuid,p_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req jsonb; ident uuid; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'budget_payment_unbind',p_request,jsonb_build_object('id',p_id,'reason',btrim(p_reason)));
 if (req->>'existing')::boolean then return req->'result';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Budget correction reason required';end if;
 update public.ay6_budget_bindings set revoked_at=now(),revoked_by=auth.uid(),revoke_reason=btrim(p_reason) where id=p_id and site_id=p_site and revoked_at is null returning id into ident;
 if ident is null then raise exception 'Budget binding unavailable';end if;
 answer:=jsonb_build_object('id',ident,'revoked',true);update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'budget_payment_unbound',ident,jsonb_build_object('reason',btrim(p_reason)));return answer;
end;$$;

create function public.ay6_review_legacy_budget(p_site uuid,p_request uuid,p_fingerprint text,p_mode text,p_reason text,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; previous public.ay5_budget; ident uuid; carry uuid; represented bigint; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'budget_legacy_review',p_request,jsonb_build_object('fingerprint',p_fingerprint,'mode',p_mode,'reason',btrim(p_reason),'confirm',p_confirm));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_mode is null or p_mode not in ('carry','represented') or length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Budget legacy confirmation required';end if;
 select * into previous from public.ay5_budget where site_id=p_site;
 if not found or previous.planned_cents<=0 or ay2_private.budget_legacy_fingerprint(p_site) is distinct from p_fingerprint then raise exception 'Budget legacy changed';end if;
 if exists(select 1 from public.ay6_budget_legacy_reviews where site_id=p_site and legacy_fingerprint=p_fingerprint) then raise exception 'Budget legacy already reviewed';end if;
 if p_mode='carry' then
  insert into public.ay6_budget_plans(site_id,month,kind,title,cents,status,created_by) values(p_site,date_trunc('month',(now() at time zone 'Europe/Istanbul')::date)::date,'expense','Übernommene Planpauschale / Devreden plan tutarı',previous.planned_cents,'draft',auth.uid()) returning id into carry;
 else
  select coalesce(sum(p.cents),0) into represented from public.ay6_budget_plans p where p.site_id=p_site and p.status<>'cancelled' and p.kind<>'income';
  if represented<previous.planned_cents then raise exception 'Budget legacy not represented';end if;
 end if;
 insert into public.ay6_budget_legacy_reviews(site_id,legacy_fingerprint,mode,reason,plan_id,created_by) values(p_site,p_fingerprint,p_mode,btrim(p_reason),carry,auth.uid()) returning id into ident;
 answer:=jsonb_build_object('id',ident,'plan_id',carry);update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'budget_legacy_reviewed',ident,jsonb_build_object('mode',p_mode,'amount',previous.planned_cents,'reason',btrim(p_reason)));return answer;
end;$$;

create function public.ay6_release_reserve(p_site uuid,p_request uuid,p_cents bigint,p_basis text,p_reason text,p_emergency boolean,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; previous public.ay5_budget; bank bigint; ident uuid; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'reserve_release',p_request,jsonb_build_object('cents',p_cents,'basis',btrim(p_basis),'reason',btrim(p_reason),'emergency',p_emergency,'confirm',p_confirm));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_emergency is null or p_cents is null or p_cents not between 1 and 900000000000 or length(btrim(coalesce(p_basis,''))) not between 3 and 500 or length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Budget reserve evidence required';end if;
 select * into previous from public.ay5_budget where site_id=p_site for update;
 bank:=ay2_private.budget_bank(p_site);
 if not found or previous.restricted_cents<p_cents or bank is null or bank<p_cents then raise exception 'Budget reserve funds unavailable';end if;
 update public.ay5_budget set restricted_cents=restricted_cents-p_cents,updated_by=auth.uid(),updated_at=now() where site_id=p_site;
 insert into public.ay6_reserve_uses(site_id,cents,reason,basis_reference,emergency,before_cents,after_cents,created_by) values(p_site,p_cents,btrim(p_reason),btrim(p_basis),p_emergency,previous.restricted_cents,previous.restricted_cents-p_cents,auth.uid()) returning id into ident;
 answer:=jsonb_build_object('id',ident,'restricted_cents',previous.restricted_cents-p_cents);update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'reserve_released',ident,jsonb_build_object('before',previous.restricted_cents,'after',previous.restricted_cents-p_cents,'basis',btrim(p_basis),'emergency',p_emergency));return answer;
end;$$;
-- Guard the existing budget entry point too: reducing earmarked reserves requires the dedicated documented approval.
DO $guard$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('ay2_private.ay5_command(uuid,text,jsonb)'::regprocedure);
 needle:=' RETURN ay2_private.ay5_command_review_core(s,act,p);';
 if strpos(definition,needle)=0 then raise exception 'Budget migration core drift';end if;
 if strpos(definition,E'BEGIN\n PERFORM ay2_private.require_task_action(s,act,p);')=0 then raise exception 'Budget migration authorization drift';end if;
 definition:=replace(definition,E'BEGIN\n PERFORM ay2_private.require_task_action(s,act,p);',E'DECLARE budget_prior boolean; budget_answer jsonb;\nBEGIN\n PERFORM ay2_private.require_task_action(s,act,p);');
 definition:=replace(definition,needle,$body$ IF act='budget' THEN
  budget_prior:=EXISTS(SELECT 1 FROM public.ay5_operations WHERE site_id=s AND request_id=(p->>'request_id')::uuid);
  IF NOT budget_prior AND (p->>'restricted_cents')::bigint<(SELECT restricted_cents FROM public.ay5_budget WHERE site_id=s) THEN RAISE EXCEPTION 'Budget reserve documented release required';END IF;
 END IF;
 budget_answer:=ay2_private.ay5_command_review_core(s,act,p);
 IF act='budget' AND NOT budget_prior THEN UPDATE public.ay5_budget SET planning_revision=(SELECT id FROM public.ay5_operations WHERE site_id=s AND request_id=(p->>'request_id')::uuid) WHERE site_id=s;END IF;
 RETURN budget_answer;$body$);execute definition;
end;$guard$;

create function public.ay6_budget_workspace(p_site uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare today date:=(now() at time zone 'Europe/Istanbul')::date; legacy public.ay5_budget; fingerprint text; plans jsonb; answer jsonb; bank bigint;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'finance') then raise exception 'Budget access denied' using errcode='42501';end if;
 select * into legacy from public.ay5_budget where site_id=p_site;fingerprint:=ay2_private.budget_legacy_fingerprint(p_site);bank:=ay2_private.budget_bank(p_site);
 select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('booked_cents',coalesce((select sum(b.cents) from public.ay6_budget_bindings b join public.ay2_entries e on e.id=b.entry_id and e.site_id=b.site_id where b.site_id=p_site and b.plan_id=p.id and b.revoked_at is null and e.booked_on<=today and not exists(select 1 from public.ay2_entries r where r.site_id=p_site and r.reversal_of=e.id and r.booked_on<=today)),0)) order by p.month,p.created_at),'[]'::jsonb) into plans from public.ay6_budget_plans p where p.site_id=p_site;
 answer:=jsonb_build_object('as_of',today,'bank_cents',bank,'restricted_cents',coalesce(legacy.restricted_cents,0),'legacy_planned_cents',coalesce(legacy.planned_cents,0),'legacy_fingerprint',fingerprint,
 'legacy_reviewed',coalesce(legacy.planned_cents,0)=0 or exists(select 1 from public.ay6_budget_legacy_reviews where site_id=p_site and legacy_fingerprint=fingerprint),
 'plans',plans,'admin',ay2_private.can(p_site,'admin'),
 'receivable_cents',coalesce((select sum(greatest(0,c.cents-coalesce((select sum(a.cents) from public.ay2_allocations a where a.site_id=p_site and a.charge_id=c.id and a.void_reason is null),0))) from public.ay2_charges c where c.site_id=p_site and c.void_reason is null),0));
 if ay2_private.can(p_site,'admin') then answer:=answer||jsonb_build_object('bindings',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.ay6_budget_bindings b where site_id=p_site),'[]'::jsonb),'reserve_uses',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from public.ay6_reserve_uses r where site_id=p_site),'[]'::jsonb));end if;
 return answer;
end;$$;
revoke all on function public.ay6_save_budget_plan(uuid,uuid,uuid,int,date,text,text,bigint,text,text),public.ay6_bind_budget_payment(uuid,uuid,uuid,uuid,bigint,boolean),public.ay6_unbind_budget_payment(uuid,uuid,uuid,text),public.ay6_review_legacy_budget(uuid,uuid,text,text,text,boolean),public.ay6_release_reserve(uuid,uuid,bigint,text,text,boolean,boolean),public.ay6_budget_workspace(uuid) from public,anon;
grant execute on function public.ay6_save_budget_plan(uuid,uuid,uuid,int,date,text,text,bigint,text,text),public.ay6_bind_budget_payment(uuid,uuid,uuid,uuid,bigint,boolean),public.ay6_unbind_budget_payment(uuid,uuid,uuid,text),public.ay6_review_legacy_budget(uuid,uuid,text,text,text,boolean),public.ay6_release_reserve(uuid,uuid,bigint,text,text,boolean,boolean),public.ay6_budget_workspace(uuid) to authenticated;
commit;
