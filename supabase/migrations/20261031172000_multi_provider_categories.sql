-- Configurable multi-category directory; never rewrites or deletes provider history.
begin;
alter table public.ay3_providers add column if not exists categories text[] not null default '{}'::text[];
update public.ay3_providers set categories=array[category]
where cardinality(categories)=0;
create table if not exists public.ay3_provider_categories(
 id uuid primary key default gen_random_uuid(),
 site_id uuid not null references public.site_sites(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 60 and name=btrim(name)),
 created_at timestamptz not null default now()
);
create unique index if not exists ay3_provider_categories_site_name_unique
 on public.ay3_provider_categories(site_id,lower(name));
alter table public.ay3_provider_categories enable row level security;
revoke all on table public.ay3_provider_categories from public,anon,authenticated;
insert into public.ay3_provider_categories(site_id,name)
 select distinct site_id,btrim(category) from public.ay3_providers
 where length(btrim(category)) between 1 and 60
on conflict do nothing;
insert into public.ay3_provider_categories(site_id,name)
 select s.id,n.name from public.site_sites s
 cross join unnest(array['Temizlik','Peyzaj','Elektrik','Asansör','Havuz','Tesisat','Diğer']) as n(name)
on conflict do nothing;

-- The public RPC wrapper is invoker; only the explicitly authorized private function can read.
create or replace function ay2_private.provider_categories(s uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then
  raise exception 'Access denied' using errcode='42501';
 end if;
 if not ay2_private.current_member(s,false) and not ay2_private.can(s,'people')
   and not ay2_private.can(s,'finance') then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.name)
   from public.ay3_provider_categories c where c.site_id=s),'[]'::jsonb);
end;$fn$;
revoke all on function ay2_private.provider_categories(uuid) from public,anon,authenticated;
grant execute on function ay2_private.provider_categories(uuid) to authenticated;

create or replace function public.ay3_provider_categories(p_site uuid)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select ay2_private.provider_categories(p_site);
$fn$;
revoke all on function public.ay3_provider_categories(uuid) from public,anon;
grant execute on function public.ay3_provider_categories(uuid) to authenticated;

-- Preserve permission and exclusions in the resident-facing directory.
create or replace function ay2_private.provider_directory(s uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
begin
 if auth.uid() is null or not ay2_private.view_site(s) then raise exception 'Access denied' using errcode='42501';end if;
 if not ay2_private.current_member(s,false) and not ay2_private.can(s,'people')
   and not ay2_private.can(s,'finance') then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.id,'name',p.name,'category',p.category,
  'categories',case when cardinality(p.categories)>0 then p.categories else array[p.category] end,
  'contact',p.contact,'phone',p.phone,'email',p.email,'status',p.status
 ) order by p.name)
 from public.ay3_providers p where p.site_id=s and p.status<>'avoid'),'[]'::jsonb);
end;$fn$;

-- This single transaction records all selected services and the provider. Existing category remains
-- as a compatibility field for older client versions and data exports.
create or replace function public.ay3_save_provider(p_site uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 actor uuid:=auth.uid();
 pid uuid;
 cats text[];
 submitted int;
 pname text:=btrim(coalesce(p_payload->>'name',''));
 status_name text:=coalesce(p_payload->>'status','preferred');
begin
 if actor is null or not ay2_private.can(p_site,'people') then
  raise exception 'Access denied' using errcode='42501';end if;
 if length(pname) not between 1 and 150 or status_name not in ('preferred','backup','avoid') then
  raise exception 'Invalid provider details';end if;
 if jsonb_typeof(p_payload->'categories') is distinct from 'array'
  or jsonb_array_length(p_payload->'categories') not between 1 and 8 then
  raise exception 'Select 1 to 8 categories';end if;
 submitted:=jsonb_array_length(p_payload->'categories');
 if exists(select 1 from jsonb_array_elements(p_payload->'categories') j(value)
    where jsonb_typeof(j.value) <> 'string') then
  raise exception 'Invalid provider categories';end if;
 select array_agg(c.name order by a.ord) into cats
 from jsonb_array_elements_text(p_payload->'categories') with ordinality as a(v,ord)
 join public.ay3_provider_categories c on c.site_id=p_site and lower(c.name)=lower(btrim(a.v));
 if cardinality(cats) is distinct from submitted
  or (select count(distinct lower(x)) from unnest(cats) x)<>submitted then
  raise exception 'Unknown or duplicate categories';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 pid:=nullif(p_payload->>'id','')::uuid;
 if pid is null then
  insert into public.ay3_providers(site_id,name,category,categories,contact,phone,email,status,created_by)
  values(p_site,pname,cats[1],cats,left(btrim(coalesce(p_payload->>'contact','')),150),
   left(btrim(coalesce(p_payload->>'phone','')),60),left(btrim(coalesce(p_payload->>'email','')),254),
   status_name,actor) returning id into pid;
 else
  update public.ay3_providers set
    name=pname,category=cats[1],categories=cats,
    contact=left(btrim(coalesce(p_payload->>'contact','')),150),
    phone=left(btrim(coalesce(p_payload->>'phone','')),60),
    email=left(btrim(coalesce(p_payload->>'email','')),254),status=status_name
   where id=pid and site_id=p_site;
  if not found then raise exception 'Provider not found';end if;
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(p_site,actor,'provider',pid,jsonb_build_object('categories',to_jsonb(cats),'source','multiple_categories_ui'));
 return jsonb_build_object('id',pid,'categories',to_jsonb(cats),'ok',true);
end;$fn$;
revoke all on function public.ay3_save_provider(uuid,jsonb) from public,anon;
grant execute on function public.ay3_save_provider(uuid,jsonb) to authenticated;

-- Rename propagates to linked providers; deletion is only permitted when not in use.
create or replace function public.ay3_manage_provider_category(p_site uuid,p_action text,p_name text default null,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 actor uuid:=auth.uid();
 category_id uuid;
 old_name text;
 new_name text:=btrim(coalesce(p_name,''));
begin
 if actor is null or not ay2_private.can(p_site,'people') then raise exception 'Access denied' using errcode='42501';end if;
 if p_action not in ('add','rename','delete') then raise exception 'Invalid category action';end if;
 if p_action<>'delete' and (length(new_name) not between 1 and 60 or new_name~'[[:cntrl:]]')
 then raise exception 'Category name must have 1 to 60 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 if p_action='add' then
  if exists(select 1 from public.ay3_provider_categories c where c.site_id=p_site and lower(c.name)=lower(new_name))
  then raise exception 'Category already exists';end if;
  insert into public.ay3_provider_categories(site_id,name) values(p_site,new_name) returning id into category_id;
 else
  select c.id,c.name into category_id,old_name from public.ay3_provider_categories c
   where c.site_id=p_site and c.id=p_id for update;
  if category_id is null then raise exception 'Category not found';end if;
  if p_action='rename' then
   if exists(select 1 from public.ay3_provider_categories c
       where c.site_id=p_site and c.id<>category_id and lower(c.name)=lower(new_name))
    then raise exception 'Category already exists';end if;
   update public.ay3_provider_categories set name=new_name where id=category_id;
   update public.ay3_providers p
      set category=case when lower(p.category)=lower(old_name) then new_name else p.category end,
          categories=array(select case when lower(x)=lower(old_name) then new_name else x end
            from unnest(p.categories) x)
    where p.site_id=p_site and (lower(p.category)=lower(old_name)
      or exists(select 1 from unnest(p.categories) x where lower(x)=lower(old_name)));
  else
   if exists(select 1 from public.ay3_providers p where p.site_id=p_site
      and (lower(p.category)=lower(old_name)
        or exists(select 1 from unnest(p.categories) x where lower(x)=lower(old_name))))
   then raise exception 'Category is in use';end if;
   delete from public.ay3_provider_categories where id=category_id and site_id=p_site;
  end if;
 end if;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details)
 values(p_site,actor,'provider_category',category_id,
   jsonb_build_object('mode',p_action,'old_name',old_name,'name',new_name));
 return jsonb_build_object('id',category_id,'ok',true);
end;$fn$;
revoke all on function public.ay3_manage_provider_category(uuid,text,text,uuid) from public,anon;
grant execute on function public.ay3_manage_provider_category(uuid,text,text,uuid) to authenticated;
commit;
