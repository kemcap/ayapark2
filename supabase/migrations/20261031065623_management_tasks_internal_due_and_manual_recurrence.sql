-- Simple management work items. No finance writes or automatic recurring creation.
begin;
set local lock_timeout='5s';
create table public.ay6_tasks(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),revision int not null default 1,
 title text not null check(length(btrim(title)) between 3 and 200),description text not null check(length(description)<=5000),
 assignee uuid not null references auth.users(id),due_on date not null,priority text not null check(priority in ('low','normal','high')),
 status text not null check(status in ('open','in_progress','done','cancelled')),provider_id uuid references public.ay3_providers(id),document_id uuid references public.ay6_documents(id),
 repeated_from uuid references public.ay6_tasks(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(repeated_from,due_on)
);
create index management_tasks_site_due on public.ay6_tasks(site_id,status,due_on);
alter table public.ay6_tasks enable row level security;
revoke all on public.ay6_tasks from public,anon,authenticated;
grant select(id,site_id,revision,title,description,assignee,due_on,priority,status,provider_id,repeated_from,created_at,updated_at) on public.ay6_tasks to authenticated;
create function ay2_private.task_reader(s uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ay2_private.can(s,'admin') or exists(select 1 from public.site_staff_memberships where site_id=s and user_id=auth.uid()));$$;
revoke all on function ay2_private.task_reader(uuid) from public,anon;
grant execute on function ay2_private.task_reader(uuid) to authenticated;
create policy management_tasks_read on public.ay6_tasks for select to authenticated using(ay2_private.task_reader(site_id));
create function public.ay6_save_task(p_site uuid,p_request uuid,p_id uuid,p_revision int,p_title text,p_description text,p_assignee uuid,p_due date,p_priority text,p_status text,p_provider uuid,p_document uuid,p_repeated_from uuid,p_confirm boolean,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb;original public.ay6_tasks;parent public.ay6_tasks;ident uuid;answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'management_task_save',p_request,jsonb_build_object('id',p_id,'revision',p_revision,'title',btrim(p_title),'description',btrim(p_description),'assignee',p_assignee,'due',p_due,'priority',p_priority,'status',p_status,'provider',p_provider,'document',p_document,'repeated_from',p_repeated_from,'confirm',p_confirm,'reason',btrim(p_reason)));
 if(req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or length(btrim(coalesce(p_title,''))) not between 3 and 200 or p_description is null or length(p_description)>5000 or p_due is null or p_priority is null or p_priority not in ('low','normal','high') or p_status is null or p_status not in ('open','in_progress','done','cancelled') or length(btrim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Task invalid fields';end if;
 if p_assignee is null or not exists(select 1 from public.site_staff_memberships where site_id=p_site and user_id=p_assignee) then raise exception 'Task responsible management member required';end if;
 if p_provider is not null and not exists(select 1 from public.ay3_providers where site_id=p_site and id=p_provider) then raise exception 'Task foreign provider';end if;
 if p_document is not null and not exists(select 1 from public.ay6_documents where site_id=p_site and id=p_document and (status='ready' or exists(select 1 from public.ay6_tasks where site_id=p_site and id=p_id and document_id=p_document))) then raise exception 'Task ready site document required';end if;
 if p_id is null then
  if p_revision is not null then raise exception 'Task stale revision';end if;
  if p_repeated_from is not null then
   select * into parent from public.ay6_tasks where site_id=p_site and id=p_repeated_from for update;
   if not found or parent.status<>'done' or p_due<=parent.due_on or p_status<>'open' then raise exception 'Task manual repetition requires completed source and later date';end if;
  end if;
  insert into public.ay6_tasks(site_id,title,description,assignee,due_on,priority,status,provider_id,document_id,repeated_from,created_by) values(p_site,btrim(p_title),btrim(p_description),p_assignee,p_due,p_priority,p_status,p_provider,p_document,p_repeated_from,auth.uid()) returning id into ident;
 else
  select * into original from public.ay6_tasks where site_id=p_site and id=p_id for update;
  if not found or original.revision is distinct from p_revision or original.repeated_from is distinct from p_repeated_from then raise exception 'Task stale revision';end if;
  if original.repeated_from is not null and p_due<=(select due_on from public.ay6_tasks where id=original.repeated_from) then raise exception 'Task later date required';end if;
  update public.ay6_tasks set title=btrim(p_title),description=btrim(p_description),assignee=p_assignee,due_on=p_due,priority=p_priority,status=p_status,provider_id=p_provider,document_id=p_document,revision=revision+1,updated_at=now() where id=p_id;ident:=p_id;
 end if;
 answer:=jsonb_build_object('id',ident,'revision',(select revision from public.ay6_tasks where id=ident));update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'management_task_saved',ident,jsonb_build_object('before',to_jsonb(original),'after',(select to_jsonb(x) from public.ay6_tasks x where id=ident),'reason',btrim(p_reason)));return answer;
end;$$;
create function public.ay6_task_workspace(p_site uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare today date:=(now() at time zone 'Europe/Istanbul')::date;
begin
 if not ay2_private.task_reader(p_site) then raise exception 'Task access denied' using errcode='42501';end if;
 return jsonb_build_object('as_of',today,'admin',ay2_private.can(p_site,'admin'),
 'counts',(select jsonb_build_object('overdue',count(*) filter(where due_on<today),'today',count(*) filter(where due_on=today),'soon',count(*) filter(where due_on>today and due_on<=today+7)) from public.ay6_tasks where site_id=p_site and status in ('open','in_progress')),
 'rows',coalesce((select jsonb_agg(to_jsonb(t) order by case when t.status in ('open','in_progress') then 0 else 1 end,t.due_on,t.id) from(
 select id,revision,title,description,assignee,due_on,priority,status,provider_id,repeated_from,
 (select name from public.ay3_providers where id=provider_id) as provider_name,
 case when ay2_private.can_read_document(document_id) then document_id else null end as document_id,
 case when status not in ('open','in_progress') then null when due_on<today then 'overdue' when due_on=today then 'today' when due_on<=today+7 then 'soon' else null end as reminder
 from public.ay6_tasks where site_id=p_site order by case when status in ('open','in_progress') then 0 else 1 end,due_on,id limit 300)t),'[]'::jsonb),
 'assignees',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'label',coalesce((select p.full_name from public.ay3_persons p where p.site_id=p_site and p.auth_user_id=m.user_id order by p.created_at limit 1),m.role||' · '||left(m.user_id::text,8)))) from public.site_staff_memberships m where m.site_id=p_site),'[]'::jsonb),
 'providers',case when ay2_private.can(p_site,'admin') then coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.ay3_providers where site_id=p_site),'[]'::jsonb) else '[]'::jsonb end);
end;$$;
revoke all on function public.ay6_save_task(uuid,uuid,uuid,int,text,text,uuid,date,text,text,uuid,uuid,uuid,boolean,text),public.ay6_task_workspace(uuid) from public,anon;
grant execute on function public.ay6_save_task(uuid,uuid,uuid,int,text,text,uuid,date,text,text,uuid,uuid,uuid,boolean,text),public.ay6_task_workspace(uuid) to authenticated;
commit;
