-- Separate review metadata; charge originals, balances and payments never change.
begin;
set local lock_timeout='5s';
create table public.ay6_claim_holds(
 charge_id uuid primary key references public.ay2_charges(id),site_id uuid not null references public.site_sites(id),revision int not null,
 active boolean not null,reason text not null check(length(btrim(reason)) between 10 and 1000),actor uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
create index claim_holds_site on public.ay6_claim_holds(site_id);
alter table public.ay6_claim_holds enable row level security;
revoke all on public.ay6_claim_holds from public,anon,authenticated;
grant select(charge_id,site_id,revision,active,updated_at) on public.ay6_claim_holds to authenticated;
create function ay2_private.claim_hold_reader(s uuid,c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.ay2_charges x where x.site_id=s and x.id=c and (ay2_private.can(s,'finance') or ay2_private.own_person(x.person_id)));$$;
revoke all on function ay2_private.claim_hold_reader(uuid,uuid) from public,anon;
grant execute on function ay2_private.claim_hold_reader(uuid,uuid) to authenticated;
create policy claim_hold_scoped_read on public.ay6_claim_holds for select to authenticated using(ay2_private.claim_hold_reader(site_id,charge_id));
create function public.ay6_set_claim_hold(p_site uuid,p_request uuid,p_charge uuid,p_revision int,p_active boolean,p_reason text,p_confirm boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb;original public.ay6_claim_holds;answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'claim_hold',p_request,jsonb_build_object('charge',p_charge,'revision',p_revision,'active',p_active,'reason',btrim(p_reason),'confirm',p_confirm));
 if(req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_active is null or length(btrim(coalesce(p_reason,''))) not between 10 and 1000 then raise exception 'Claim hold explicit reason and confirmation required';end if;
 if not exists(select 1 from public.ay2_charges where site_id=p_site and id=p_charge and (not p_active or void_reason is null)) then raise exception 'Claim hold valid site charge required';end if;
 perform pg_advisory_xact_lock(hashtextextended('claim-hold:'||p_charge::text,0));
 select * into original from public.ay6_claim_holds where site_id=p_site and charge_id=p_charge for update;
 if original.charge_id is null then
  if p_revision is not null or not p_active then raise exception 'Claim hold stale revision';end if;
  insert into public.ay6_claim_holds(charge_id,site_id,revision,active,reason,actor) values(p_charge,p_site,1,true,btrim(p_reason),auth.uid());
 else
  if original.revision is distinct from p_revision then raise exception 'Claim hold stale revision';end if;
  update public.ay6_claim_holds set revision=revision+1,active=p_active,reason=btrim(p_reason),actor=auth.uid(),updated_at=now() where charge_id=p_charge;
 end if;
 answer:=jsonb_build_object('charge_id',p_charge,'active',p_active,'revision',(select revision from public.ay6_claim_holds where charge_id=p_charge));update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'claim_hold_decided',p_charge,jsonb_build_object('before',to_jsonb(original),'after',(select to_jsonb(x) from public.ay6_claim_holds x where charge_id=p_charge)));
 return answer;
end;$$;
create function public.ay6_claim_hold_workspace(p_site uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not(ay2_private.view_site(p_site) or exists(select 1 from public.ay2_charges where site_id=p_site and ay2_private.own_person(person_id))) then raise exception 'Claim hold access denied' using errcode='42501';end if;
 return jsonb_build_object('admin',ay2_private.can(p_site,'admin'),'rows',coalesce((select jsonb_agg(jsonb_build_object('charge_id',h.charge_id,'revision',h.revision,'active',h.active,'updated_at',h.updated_at,'reason',case when ay2_private.can(p_site,'admin') then h.reason else null end)) from public.ay6_claim_holds h where h.site_id=p_site and ay2_private.claim_hold_reader(h.site_id,h.charge_id)),'[]'::jsonb));
end;$$;
revoke all on function public.ay6_set_claim_hold(uuid,uuid,uuid,int,boolean,text,boolean),public.ay6_claim_hold_workspace(uuid) from public,anon;
grant execute on function public.ay6_set_claim_hold(uuid,uuid,uuid,int,boolean,text,boolean),public.ay6_claim_hold_workspace(uuid) to authenticated;
commit;
