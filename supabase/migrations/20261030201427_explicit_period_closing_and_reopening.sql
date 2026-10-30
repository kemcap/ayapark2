-- Explicit period closings. No existing financial rows or published reports change.
begin;
set local lock_timeout='5s';
create table public.ay3_period_closings(
 id uuid primary key default gen_random_uuid(),
 site_id uuid not null references public.site_sites(id),
 kind text not null check(kind in ('month','year')),
 period date not null,
 ends_on date not null,
 status text not null default 'closed' check(status in ('closed','reopened')),
 snapshot jsonb not null,
 source_reference text not null check(length(source_reference) between 3 and 200),
 review_note text not null default '' check(length(review_note)<=500),
 request_id uuid not null,
 request_payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 reopened_by uuid references auth.users(id),
 reopened_at timestamptz,
 reopen_reason text,
 unique(site_id,request_id),
 check(period=date_trunc(case when kind='month' then 'month' else 'year' end,period)::date),
 check(ends_on>=period),
 check(status='closed' or (reopened_by is not null and reopened_at is not null and length(reopen_reason) between 10 and 500))
);
create unique index ay3_one_closed_period on public.ay3_period_closings(site_id,kind,period) where status='closed';
alter table public.ay3_period_closings enable row level security;
revoke all on public.ay3_period_closings from anon,authenticated;
grant select on public.ay3_period_closings to authenticated;
create policy closing_admin_read on public.ay3_period_closings for select to authenticated using(ay2_private.can(site_id,'admin'));

create function ay2_private.closing_snapshot(s uuid,k text,p date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare finish date; opening bigint; closing bigint; income bigint; expense bigint; setting public.ay2_settings;
 pending bigint; staged bigint; source jsonb; fingerprint text; rows bigint; result jsonb;
begin
 if auth.uid() is null or not ay2_private.can(s,'admin') then raise exception 'Closing access denied' using errcode='42501';end if;
 if k not in ('month','year') or k is null or p is null or p<>date_trunc(case when k='month' then 'month' else 'year' end,p)::date then raise exception 'Closing invalid period';end if;
 finish:=(p+case when k='month' then interval '1 month' else interval '1 year' end-interval '1 day')::date;
 select * into setting from public.ay2_settings where site_id=s and initialized;
 if not found or setting.opening_date>finish then raise exception 'Closing opening required';end if;
 select setting.opening_cents+coalesce(sum(e.cents) filter(where e.booked_on<p),0),
 setting.opening_cents+coalesce(sum(e.cents),0),count(*) filter(where e.booked_on>=p)
 into opening,closing,rows from public.ay2_entries e where e.site_id=s and e.booked_on<=finish;
 if abs(opening)>900000000000 or abs(closing)>900000000000 then raise exception 'Closing invalid amount';end if;
 select coalesce(sum(e.cents) filter(where e.cents>0),0),coalesce(-sum(e.cents) filter(where e.cents<0),0)
 into income,expense from public.ay2_entries e
 where e.site_id=s and e.booked_on between p and finish and e.reversal_of is null and e.category<>'Transfer'
 and not exists(select 1 from public.ay2_entries r where r.site_id=s and r.reversal_of=e.id);
 select count(*) into pending from public.ay2_entries e where e.site_id=s and e.booked_on<=finish and e.cents>0 and e.reversal_of is null
 and not exists(select 1 from public.ay2_entries r where r.site_id=s and r.reversal_of=e.id)
 and e.cents>coalesce((select sum(a.cents) from public.ay2_allocations a where a.site_id=s and a.entry_id=e.id and a.void_reason is null),0)
 +coalesce((select sum(c.cents) from public.ay3_credits c where c.site_id=s and c.entry_id=e.id and c.void_reason is null),0);
 select count(*) into staged from public.ay2_staged_charges where site_id=s and as_of<=finish and confirmed_charge is null and ignored_reason is null;
 select jsonb_build_object(
 'settings',to_jsonb(setting),
 'entries',coalesce((select jsonb_agg(e order by e.id) from public.ay2_entries e where e.site_id=s and e.booked_on<=finish),'[]'::jsonb),
 'charges',coalesce((select jsonb_agg(c order by c.id) from public.ay2_charges c where c.site_id=s and c.due_on<=finish),'[]'::jsonb),
 'allocations',coalesce((select jsonb_agg(a order by a.id) from public.ay2_allocations a join public.ay2_entries e on e.id=a.entry_id and e.site_id=s where a.site_id=s and e.booked_on<=finish),'[]'::jsonb),
 'credits',coalesce((select jsonb_agg(c order by c.id) from public.ay3_credits c join public.ay2_entries e on e.id=c.entry_id and e.site_id=s where c.site_id=s and e.booked_on<=finish),'[]'::jsonb),
 'staged',coalesce((select jsonb_agg(c order by c.id) from public.ay2_staged_charges c where c.site_id=s and c.as_of<=finish),'[]'::jsonb)
 ) into source;
 fingerprint:=md5(source::text);
 result:=jsonb_build_object('kind',k,'period',p,'ends_on',finish,'opening_date',setting.opening_date,
 'opening_cents',opening,'closing_cents',closing,'income_cents',income,'expense_cents',expense,
 'cash_adjustment_cents',closing-opening-income+expense,'movement_count',rows,'unresolved_count',pending,'unreviewed_staged_count',staged,
 'fingerprint',fingerprint,'period_complete',finish<(now() at time zone 'Europe/Istanbul')::date,
 'closed_months',(select count(*) from public.ay3_period_closings where site_id=s and kind='month' and status='closed' and period between p and finish));
 return result;
end;$$;
revoke all on function ay2_private.closing_snapshot(uuid,text,date) from public,anon,authenticated;

create function public.ay3_closing_preview(p_site uuid,p_kind text,p_period date)
returns jsonb language sql security definer set search_path='' as $$select ay2_private.closing_snapshot(p_site,p_kind,p_period);$$;
revoke all on function public.ay3_closing_preview(uuid,text,date) from public,anon;
grant execute on function public.ay3_closing_preview(uuid,text,date) to authenticated;

create function public.ay3_finalize_period(p_site uuid,p_kind text,p_period date,p_request uuid,p_fingerprint text,p_statement_cents bigint,p_source_reference text,p_source_complete boolean,p_bank_verified boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare snap jsonb; existing public.ay3_period_closings; payload jsonb; ident uuid;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Closing access denied' using errcode='42501';end if;
 if p_request is null then raise exception 'Closing request required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 payload:=jsonb_build_object('kind',p_kind,'period',p_period,'fingerprint',p_fingerprint,'statement_cents',p_statement_cents,
 'source_reference',btrim(p_source_reference),'source_complete',p_source_complete,'bank_verified',p_bank_verified,'note',btrim(coalesce(p_note,'')));
 select * into existing from public.ay3_period_closings where site_id=p_site and request_id=p_request;
 if found then
  if existing.request_payload is distinct from payload then raise exception 'Closing request conflict';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status,'already_recorded',true);
 end if;
 if p_source_complete is distinct from true or p_bank_verified is distinct from true or length(btrim(coalesce(p_source_reference,''))) not between 3 and 200 or length(coalesce(p_note,''))>500 then raise exception 'Closing source review required';end if;
 snap:=ay2_private.closing_snapshot(p_site,p_kind,p_period);
 if (snap->>'period_complete')::boolean is distinct from true then raise exception 'Closing period not complete';end if;
 if snap->>'fingerprint' is distinct from p_fingerprint then raise exception 'Closing preview changed';end if;
 if (snap->>'closing_cents')::bigint is distinct from p_statement_cents then raise exception 'Closing bank difference';end if;
 if exists(select 1 from public.ay3_period_closings where site_id=p_site and status='closed' and kind=p_kind and period=p_period) then raise exception 'Closing already closed';end if;
 if p_kind='year' and ((snap->>'unresolved_count')::bigint>0 or (snap->>'unreviewed_staged_count')::bigint>0) then raise exception 'Closing annual unresolved';end if;
 if p_kind='year' and (snap->>'closed_months')::int<>12 then raise exception 'Closing annual months required';end if;
 if p_kind='month' and (snap->>'unresolved_count')::bigint>0 and length(btrim(coalesce(p_note,'')))<10 then raise exception 'Closing unresolved note required';end if;
 insert into public.ay3_period_closings(site_id,kind,period,ends_on,snapshot,source_reference,review_note,request_id,request_payload,created_by)
 values(p_site,p_kind,p_period,(snap->>'ends_on')::date,snap,btrim(p_source_reference),btrim(coalesce(p_note,'')),p_request,payload,auth.uid()) returning id into ident;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'period_closed',ident,jsonb_build_object('kind',p_kind,'period',p_period,'fingerprint',p_fingerprint));
 return jsonb_build_object('id',ident,'status','closed');
end;$$;
revoke all on function public.ay3_finalize_period(uuid,text,date,uuid,text,bigint,text,boolean,boolean,text) from public,anon;
grant execute on function public.ay3_finalize_period(uuid,text,date,uuid,text,bigint,text,boolean,boolean,text) to authenticated;

create function public.ay3_reopen_period(p_site uuid,p_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare original public.ay3_period_closings;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Closing access denied' using errcode='42501';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Closing reopen reason required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 select * into original from public.ay3_period_closings where site_id=p_site and id=p_id for update;
 if not found then raise exception 'Closing unavailable';end if;
 if original.status='reopened' then return jsonb_build_object('id',p_id,'status','reopened','already_recorded',true);end if;
 if original.kind='month' and exists(select 1 from public.ay3_period_closings where site_id=p_site and kind='year' and status='closed' and original.period between period and ends_on) then raise exception 'Closing reopen year first';end if;
 if exists(select 1 from public.ay3_period_closings where site_id=p_site and status='closed' and id<>p_id and ends_on>original.ends_on) then raise exception 'Closing reopen later first';end if;
 update public.ay3_period_closings set status='reopened',reopened_by=auth.uid(),reopened_at=now(),reopen_reason=btrim(p_reason) where id=p_id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'period_reopened',p_id,jsonb_build_object('kind',original.kind,'period',original.period,'reason',btrim(p_reason)));
 return jsonb_build_object('id',p_id,'status','reopened');
end;$$;
revoke all on function public.ay3_reopen_period(uuid,uuid,text) from public,anon;
grant execute on function public.ay3_reopen_period(uuid,uuid,text) to authenticated;

create function public.ay3_closing_workspace(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.view_site(p_site) then raise exception 'Closing access denied' using errcode='42501';end if;
 if not ay2_private.can(p_site,'admin') then return jsonb_build_object('admin',false,'rows','[]'::jsonb);end if;
 return jsonb_build_object('admin',true,'rows',coalesce((select jsonb_agg(c order by created_at desc) from (select id,kind,period,ends_on,status,snapshot,source_reference,review_note,created_at,reopened_at,reopen_reason from public.ay3_period_closings where site_id=p_site order by created_at desc limit 100)c),'[]'::jsonb));
end;$$;
revoke all on function public.ay3_closing_workspace(uuid) from public,anon;
grant execute on function public.ay3_closing_workspace(uuid) to authenticated;

create function ay2_private.guard_closed_finances()
returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb; s uuid; day date; linked record;
begin
 for item in select value from jsonb_array_elements(jsonb_build_array(case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end)) where value<>'null'::jsonb loop
  s:=(item->>'site_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(s::text,0));
  if tg_table_name='ay2_settings' then
   if tg_op='UPDATE' and (new.site_id,new.opening_cents,new.opening_date,new.initialized) is not distinct from (old.site_id,old.opening_cents,old.opening_date,old.initialized) then continue;end if;
   if exists(select 1 from public.ay3_period_closings where site_id=s and status='closed') then raise exception 'Closing period locked';end if;
  elsif tg_table_name='ay2_staged_charges' then
   day:=(item->>'as_of')::date;
   if exists(select 1 from public.ay3_period_closings where site_id=s and status='closed' and kind='year' and day<=ends_on) then raise exception 'Closing period locked';end if;
  elsif tg_table_name in ('ay2_entries','ay2_charges') then
   day:=(item->>case when tg_table_name='ay2_entries' then 'booked_on' else 'due_on' end)::date;
   if exists(select 1 from public.ay3_period_closings where site_id=s and status='closed' and day<=ends_on) then raise exception 'Closing period locked';end if;
   if tg_table_name='ay2_entries' and item->>'reversal_of' is not null then
    select booked_on into day from public.ay2_entries where site_id=s and id=(item->>'reversal_of')::uuid;
    if exists(select 1 from public.ay3_period_closings where site_id=s and status='closed' and day<=ends_on) then raise exception 'Closing period locked';end if;
   end if;
  else
   -- Monthly closings permit later resolution of documented unassigned cash.
   -- Annual closings require it resolved and freeze those later changes too.
   for linked in select e.booked_on as day from public.ay2_entries e where e.site_id=s and e.id=nullif(item->>'entry_id','')::uuid
    union select c.due_on from public.ay2_charges c where c.site_id=s and c.id=nullif(item->>'charge_id','')::uuid loop
    if exists(select 1 from public.ay3_period_closings where site_id=s and status='closed' and kind='year' and linked.day<=ends_on) then raise exception 'Closing period locked';end if;
   end loop;
  end if;
 end loop;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function ay2_private.guard_closed_finances() from public,anon,authenticated;
create trigger closing_entries_guard before insert or update or delete on public.ay2_entries for each row execute function ay2_private.guard_closed_finances();
create trigger closing_charges_guard before insert or update or delete on public.ay2_charges for each row execute function ay2_private.guard_closed_finances();
create trigger closing_allocations_guard before insert or update or delete on public.ay2_allocations for each row execute function ay2_private.guard_closed_finances();
create trigger closing_credits_guard before insert or update or delete on public.ay3_credits for each row execute function ay2_private.guard_closed_finances();
create trigger closing_staged_guard before insert or update or delete on public.ay2_staged_charges for each row execute function ay2_private.guard_closed_finances();
create trigger closing_settings_guard before insert or update or delete on public.ay2_settings for each row execute function ay2_private.guard_closed_finances();
commit;
