create or replace function ay2_private.provider_directory(s uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Yetkiniz yok.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category',p.category,'contact',p.contact,'phone',p.phone,'email',p.email,'status',p.status) order by p.name) from public.ay3_providers p where p.site_id=s and p.status<>'avoid'),'[]'::jsonb);
end;$$;
revoke all on function ay2_private.provider_directory(uuid) from public,anon;
grant execute on function ay2_private.provider_directory(uuid) to authenticated;
create or replace function public.ay3_provider_directory(p_site uuid)
returns jsonb language sql stable security invoker set search_path='' as $$select ay2_private.provider_directory(p_site);$$;
revoke all on function public.ay3_provider_directory(uuid) from public,anon;
grant execute on function public.ay3_provider_directory(uuid) to authenticated;
