-- Opt-in aggregate releases. Existing reports/closings remain private by default.
begin;
set local lock_timeout='5s';
create table public.ay3_report_releases(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 closing_id uuid not null references public.ay3_period_closings(id),
 audience text not null check(audience in ('community','public')),
 request_id uuid not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 revoked_by uuid references auth.users(id),revoked_at timestamptz,
 unique(site_id,request_id),check((revoked_at is null)=(revoked_by is null))
);
create unique index report_release_active on public.ay3_report_releases(site_id,closing_id,audience) where revoked_at is null;
alter table public.ay3_report_releases enable row level security;
revoke all on public.ay3_report_releases from public,anon,authenticated;
grant select on public.ay3_report_releases to authenticated;
create policy report_release_admin on public.ay3_report_releases for select to authenticated using(ay2_private.can(site_id,'admin'));
create function public.ay3_release_report(p_site uuid,p_closing uuid,p_audience text,p_request uuid,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare original public.ay3_period_closings; existing public.ay3_report_releases; ident uuid;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Report release access denied' using errcode='42501';end if;
 if p_confirm is distinct from true or p_audience is null or p_audience not in ('community','public') or p_request is null then raise exception 'Report release confirmation required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 select * into existing from public.ay3_report_releases where site_id=p_site and request_id=p_request;
 if found then
  if existing.closing_id is distinct from p_closing or existing.audience is distinct from p_audience then raise exception 'Report release request conflict';end if;
  return jsonb_build_object('id',existing.id,'revoked',existing.revoked_at is not null,'already_recorded',true);
 end if;
 select * into original from public.ay3_period_closings where site_id=p_site and id=p_closing and status='closed';
 if not found then raise exception 'Report release active closing required';end if;
 if exists(select 1 from public.ay3_report_releases where site_id=p_site and closing_id=p_closing and audience=p_audience and revoked_at is null) then raise exception 'Report release already active';end if;
 insert into public.ay3_report_releases(site_id,closing_id,audience,request_id,created_by) values(p_site,p_closing,p_audience,p_request,auth.uid()) returning id into ident;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'report_released',ident,jsonb_build_object('closing_id',p_closing,'audience',p_audience));
 return jsonb_build_object('id',ident,'revoked',false);
end;$$;
create function public.ay3_revoke_report_release(p_site uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.ay3_report_releases;
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Report release access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 select * into existing from public.ay3_report_releases where site_id=p_site and id=p_id for update;
 if not found then raise exception 'Report release unavailable';end if;
 if existing.revoked_at is not null then return jsonb_build_object('id',p_id,'revoked',true,'already_recorded',true);end if;
 update public.ay3_report_releases set revoked_at=now(),revoked_by=auth.uid() where id=p_id;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'report_release_revoked',p_id,jsonb_build_object('closing_id',existing.closing_id,'audience',existing.audience));
 return jsonb_build_object('id',p_id,'revoked',true);
end;$$;
-- The projection is a fixed scalar allowlist; never return raw snapshots or free text.
create function ay2_private.released_report_summaries(s uuid,a text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'kind',c.kind,'period',c.period,'ends_on',c.ends_on,
 'opening_cents',(c.snapshot->>'opening_cents')::bigint,'income_cents',(c.snapshot->>'income_cents')::bigint,
 'expense_cents',(c.snapshot->>'expense_cents')::bigint,'cash_adjustment_cents',(c.snapshot->>'cash_adjustment_cents')::bigint,
 'closing_cents',(c.snapshot->>'closing_cents')::bigint,'published_at',r.created_at) order by c.period desc,c.kind),'[]'::jsonb)
 from (select * from public.ay3_report_releases where site_id=s and audience=a and revoked_at is null order by created_at desc limit 100) r join public.ay3_period_closings c on c.id=r.closing_id and c.site_id=r.site_id
 where r.site_id=s and r.audience=a and r.revoked_at is null and c.status='closed';
$$;
create function public.ay3_public_report_summaries(p_site uuid)
returns jsonb language sql stable security definer set search_path='' as $$select ay2_private.released_report_summaries(p_site,'public');$$;
create function public.ay3_community_report_summaries(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not(ay2_private.can(p_site,'finance') or ay2_private.current_member(p_site,true)) then raise exception 'Report release access denied' using errcode='42501';end if;
 return ay2_private.released_report_summaries(p_site,'community');
end;$$;
create function public.ay3_report_release_workspace(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.can(p_site,'admin') then raise exception 'Report release access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(r order by r.created_at desc) from (select id,closing_id,audience,created_at,revoked_at from public.ay3_report_releases where site_id=p_site order by created_at desc limit 100)r),'[]'::jsonb);
end;$$;
revoke all on function ay2_private.released_report_summaries(uuid,text) from public,anon,authenticated;
revoke all on function public.ay3_release_report(uuid,uuid,text,uuid,boolean),public.ay3_revoke_report_release(uuid,uuid),public.ay3_public_report_summaries(uuid),public.ay3_community_report_summaries(uuid),public.ay3_report_release_workspace(uuid) from public,anon,authenticated;
grant execute on function public.ay3_release_report(uuid,uuid,text,uuid,boolean),public.ay3_revoke_report_release(uuid,uuid),public.ay3_community_report_summaries(uuid),public.ay3_report_release_workspace(uuid) to authenticated;
-- Anonymous access is intentional and limited to explicitly published scalar aggregates.
grant execute on function public.ay3_public_report_summaries(uuid) to anon,authenticated;
commit;
