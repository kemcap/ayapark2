-- Private administrative payloads are not a general financial statement.
begin;
revoke insert,update,delete on public.ay5_operations from anon,authenticated;
create policy admin_operation_payloads on public.ay5_operations as restrictive for select to authenticated
using(
 not(coalesce(payload->>'_admin_only','false')='true' or coalesce(payload->>'_action','') like 'budget\_%' escape '\' or coalesce(payload->>'_action','')='reserve_release')
 or ay2_private.can(site_id,'admin')
);
create or replace function ay2_private.budget_request(s uuid,a text,r uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.ay5_operations; ident uuid; canonical jsonb;
begin
 if auth.uid() is null or not ay2_private.can(s,'admin') then raise exception 'Budget access denied' using errcode='42501';end if;
 if r is null then raise exception 'Budget request required';end if;
 perform pg_advisory_xact_lock(hashtextextended(s::text,0));
 canonical:=(p-'_admin_only')||jsonb_build_object('_action',a);
 select * into existing from public.ay5_operations where site_id=s and request_id=r;
 if found then
  -- Keep already recorded pre-hardening requests idempotent without rewriting history.
  if (existing.payload-'_admin_only') is distinct from canonical then raise exception 'Budget request conflict';end if;
  return jsonb_build_object('existing',true,'result',existing.result);
 end if;
 insert into public.ay5_operations(site_id,request_id,payload,created_by) values(s,r,canonical||jsonb_build_object('_admin_only',true),auth.uid()) returning id into ident;
 return jsonb_build_object('existing',false,'operation_id',ident);
end;$$;
revoke all on function ay2_private.budget_request(uuid,text,uuid,jsonb) from public,anon,authenticated;
commit;
