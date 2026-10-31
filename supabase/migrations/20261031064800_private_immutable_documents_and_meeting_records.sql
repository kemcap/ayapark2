-- Private document/meeting archive. Object bytes only via authenticated Storage API.
begin;
set local lock_timeout='5s';
DO $privacy$ BEGIN
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='ay5_operations' and policyname='admin_operation_payloads' and permissive='RESTRICTIVE') then raise exception 'Archive private request protection required';end if;
END;$privacy$;
DO $bucket$ BEGIN
 if exists(select 1 from storage.buckets where id='ayapark2-documents' and (public or file_size_limit is distinct from 10485760)) then raise exception 'Archive bucket configuration conflict';end if;
END;$bucket$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ayapark2-documents','ayapark2-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) on conflict(id) do nothing;
create table public.ay6_documents(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),
 request_id uuid not null,object_path text not null unique,title text not null check(length(btrim(title)) between 3 and 200),
 filename text not null,category text not null check(category in ('bank','invoice','meeting','decision','contract','maintenance','general')),
 audience text not null check(audience in ('management','finance','owners','community')),
 mime text not null,bytes bigint not null check(bytes between 1 and 10485760),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 status text not null default 'pending' check(status in ('pending','ready','archived')),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),confirmed_at timestamptz,
 archived_by uuid references auth.users(id),archived_at timestamptz,archive_reason text,
 unique(site_id,request_id),check(category not in ('bank','invoice') or audience='finance')
);
create index documents_site_category on public.ay6_documents(site_id,category,created_at desc);
alter table public.ay6_documents enable row level security;
revoke all on public.ay6_documents from public,anon,authenticated;
grant select(id,site_id,object_path,title,filename,category,audience,mime,bytes,sha256,status,created_at,confirmed_at) on public.ay6_documents to authenticated;
create function ay2_private.archive_audience(s uuid,a text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (ay2_private.can(s,'admin')
 or a='finance' and ay2_private.can(s,'finance')
 or a='management' and exists(select 1 from public.site_staff_memberships where site_id=s and user_id=auth.uid())
 or a='community' and ay2_private.current_member(s,true)
 or a='owners' and exists(select 1 from public.ay3_links l where l.site_id=s and ay2_private.own_person(l.person_id) and l.role='owner' and l.active and l.archived_at is null and (l.starts_on is null or l.starts_on<=(now() at time zone 'Europe/Istanbul')::date) and (l.ends_on is null or l.ends_on>=(now() at time zone 'Europe/Istanbul')::date)));
$$;
revoke all on function ay2_private.archive_audience(uuid,text) from public,anon,authenticated;
create function ay2_private.can_read_document(d uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ay6_documents x where x.id=d and auth.uid() is not null and (ay2_private.can(x.site_id,'admin') or x.status='ready' and ay2_private.archive_audience(x.site_id,x.audience)));
$$;
revoke all on function ay2_private.can_read_document(uuid) from public,anon;
grant execute on function ay2_private.can_read_document(uuid) to authenticated;
create policy document_metadata_read on public.ay6_documents for select to authenticated using(ay2_private.can_read_document(id));
create function ay2_private.can_read_document_path(p text) returns boolean
language sql stable security definer set search_path='' as $$ select exists(select 1 from public.ay6_documents d where d.object_path=p and ay2_private.can_read_document(d.id));$$;
create function ay2_private.can_upload_document_path(p text,o text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and o=auth.uid()::text and exists(select 1 from public.ay6_documents d where d.object_path=p and d.status='pending' and d.created_by=auth.uid() and ay2_private.can(d.site_id,'admin'));
$$;
revoke all on function ay2_private.can_read_document_path(text),ay2_private.can_upload_document_path(text,text) from public,anon;
grant execute on function ay2_private.can_read_document_path(text),ay2_private.can_upload_document_path(text,text) to authenticated;
-- Restrictive guards ensure another bucket's permissive policy cannot open this archive.
create policy archive_objects_read on storage.objects for select to authenticated using(bucket_id='ayapark2-documents' and ay2_private.can_read_document_path(name));
create policy archive_objects_insert on storage.objects for insert to authenticated with check(bucket_id='ayapark2-documents' and ay2_private.can_upload_document_path(name,owner_id));
create policy archive_read_boundary on storage.objects as restrictive for select to authenticated using(bucket_id<>'ayapark2-documents' or ay2_private.can_read_document_path(name));
create policy archive_insert_boundary on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'ayapark2-documents' or ay2_private.can_upload_document_path(name,owner_id));
create policy archive_no_overwrite on storage.objects as restrictive for update to authenticated using(bucket_id<>'ayapark2-documents') with check(bucket_id<>'ayapark2-documents');
create policy archive_no_delete on storage.objects as restrictive for delete to authenticated using(bucket_id<>'ayapark2-documents');
create policy archive_no_anonymous on storage.objects as restrictive for all to anon using(bucket_id<>'ayapark2-documents') with check(bucket_id<>'ayapark2-documents');

create function public.ay6_prepare_document(p_site uuid,p_request uuid,p_title text,p_filename text,p_category text,p_audience text,p_mime text,p_bytes bigint,p_sha256 text,p_confirm boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; ident uuid; extension text; path text; answer jsonb; used bigint; pending int;
begin
 req:=ay2_private.budget_request(p_site,'document_prepare',p_request,jsonb_build_object('title',btrim(p_title),'filename',p_filename,'category',p_category,'audience',p_audience,'mime',p_mime,'bytes',p_bytes,'sha256',p_sha256,'confirm',p_confirm));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or length(btrim(coalesce(p_title,''))) not between 3 and 200 or length(coalesce(p_filename,'')) not between 3 and 200 or position('/' in p_filename)>0 or position(chr(92) in p_filename)>0 or p_filename~'[[:cntrl:]]' or p_bytes is null or p_bytes not between 1 and 10485760 or p_sha256 is null or p_sha256!~'^[a-f0-9]{64}$' or p_category is null or p_category not in ('bank','invoice','meeting','decision','contract','maintenance','general') or p_audience is null or p_audience not in ('management','finance','owners','community') then raise exception 'Archive invalid document';end if;
 extension:=lower(substring(p_filename from '\.([a-zA-Z0-9]+)$'));
 if p_mime is distinct from (case extension when 'pdf' then 'application/pdf' when 'jpg' then 'image/jpeg' when 'jpeg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp' when 'txt' then 'text/plain' when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' else '' end) or p_category in ('bank','invoice') and p_audience<>'finance' then raise exception 'Archive type or audience invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('ayapark2-document-capacity',0));
 select count(*) into pending from public.ay6_documents where status='pending';
 select coalesce(sum(case when (metadata->>'size')~'^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end),0) into used from storage.objects;
 used:=used+coalesce((select sum(d.bytes) from public.ay6_documents d where d.status='pending' and not exists(select 1 from storage.objects o where o.bucket_id='ayapark2-documents' and o.name=d.object_path)),0);
 if pending>=12 or used+p_bytes>629145600 then raise exception 'Archive capacity reached';end if;
 ident:=gen_random_uuid();path:=p_site::text||'/'||ident::text||'/source.'||extension;
 insert into public.ay6_documents(id,site_id,request_id,object_path,title,filename,category,audience,mime,bytes,sha256,created_by) values(ident,p_site,p_request,path,btrim(p_title),p_filename,p_category,p_audience,p_mime,p_bytes,p_sha256,auth.uid());
 answer:=jsonb_build_object('id',ident,'path',path,'mime',p_mime,'bytes',p_bytes,'sha256',p_sha256);
 update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'document_prepared',ident,jsonb_build_object('filename',p_filename,'audience',p_audience,'sha256',p_sha256));return answer;
end;$$;
create function public.ay6_confirm_document(p_site uuid,p_request uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req jsonb; original public.ay6_documents; object_meta jsonb; object_owner text; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'document_confirm',p_request,jsonb_build_object('id',p_id));if (req->>'existing')::boolean then return req->'result';end if;
 select * into original from public.ay6_documents where site_id=p_site and id=p_id;
 if not found or original.status='archived' then raise exception 'Archive document unavailable';end if;
 select metadata,owner_id into object_meta,object_owner from storage.objects where bucket_id='ayapark2-documents' and name=original.object_path;
 if not found or object_owner is distinct from original.created_by::text or (object_meta->>'size')::bigint is distinct from original.bytes or object_meta->>'mimetype' is distinct from original.mime then raise exception 'Archive uploaded bytes required';end if;
 update public.ay6_documents set status='ready',confirmed_at=coalesce(confirmed_at,now()) where id=p_id;
 answer:=jsonb_build_object('id',p_id,'status','ready');update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'document_confirmed',p_id,jsonb_build_object('sha256',original.sha256,'bytes',original.bytes));return answer;
end;$$;
create function public.ay6_archive_document(p_site uuid,p_request uuid,p_id uuid,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req jsonb; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'document_archive',p_request,jsonb_build_object('id',p_id,'reason',btrim(p_reason)));if (req->>'existing')::boolean then return req->'result';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Archive reason required';end if;
 update public.ay6_documents set status='archived',archived_by=auth.uid(),archived_at=now(),archive_reason=btrim(p_reason) where site_id=p_site and id=p_id;
 if not found then raise exception 'Archive document unavailable';end if;
 answer:=jsonb_build_object('id',p_id,'status','archived');update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'document_archived',p_id,jsonb_build_object('reason',btrim(p_reason)));return answer;
end;$$;
create function public.ay6_set_document_access(p_site uuid,p_request uuid,p_id uuid,p_audience text,p_restore boolean,p_reason text,p_confirm boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req jsonb; original public.ay6_documents; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'document_access',p_request,jsonb_build_object('id',p_id,'audience',p_audience,'restore',p_restore,'reason',btrim(p_reason),'confirm',p_confirm));if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_restore is null or p_audience is null or p_audience not in ('management','finance','owners','community') or length(btrim(coalesce(p_reason,''))) not between 10 and 500 then raise exception 'Archive access confirmation required';end if;
 select * into original from public.ay6_documents where id=p_id and site_id=p_site and status<>'pending';
 if not found or original.category in ('bank','invoice') and p_audience<>'finance' then raise exception 'Archive audience invalid';end if;
 if p_restore and (original.confirmed_at is null or not exists(select 1 from storage.objects o where o.bucket_id='ayapark2-documents' and o.name=original.object_path and o.owner_id=original.created_by::text and (o.metadata->>'size')::bigint=original.bytes and o.metadata->>'mimetype'=original.mime)) then raise exception 'Archive original bytes required';end if;
 update public.ay6_documents set audience=p_audience,status=case when p_restore then 'ready' else status end where id=p_id;
 answer:=jsonb_build_object('id',p_id,'status',case when p_restore then 'ready' else original.status end);update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'document_access_changed',p_id,jsonb_build_object('before',original.audience,'after',p_audience,'restored',p_restore,'reason',btrim(p_reason)));return answer;
end;$$;
create function public.ay6_document_download(p_site uuid,p_id uuid,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.ay6_documents;
begin
 select * into d from public.ay6_documents where site_id=p_site and id=p_id;
 if not found or not ay2_private.can_read_document(p_id) or p_request is null then raise exception 'Archive access denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_site::text,0));
 if not exists(select 1 from public.ay2_audit where site_id=p_site and actor=auth.uid() and action='document_download_requested' and entity_id=p_id and details->>'request_id'=p_request::text) then
  insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'document_download_requested',p_id,jsonb_build_object('request_id',p_request));end if;
 return jsonb_build_object('id',d.id,'path',d.object_path,'filename',d.filename,'mime',d.mime,'bytes',d.bytes,'sha256',d.sha256);
end;$$;
create function public.ay6_document_workspace(p_site uuid,p_query text default '',p_category text default '',p_archived boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.view_site(p_site) then raise exception 'Archive access denied' using errcode='42501';end if;
 if length(coalesce(p_query,''))>100 or p_category not in ('','bank','invoice','meeting','decision','contract','maintenance','general') then raise exception 'Archive invalid filter';end if;
 return jsonb_build_object('admin',ay2_private.can(p_site,'admin'),'rows',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from(
 select id,title,filename,category,audience,mime,bytes,sha256,status,created_at,confirmed_at,case when status='pending' and created_by=auth.uid() and ay2_private.can(p_site,'admin') then object_path else null end as upload_path from public.ay6_documents where site_id=p_site and ay2_private.can_read_document(id)
 and (status='ready' or ay2_private.can(p_site,'admin') and (status='pending' or p_archived))
 and (p_category='' or category=p_category) and (coalesce(p_query,'')='' or strpos(lower(title||' '||filename),lower(p_query))>0) order by created_at desc limit 100)d),'[]'::jsonb));
end;$$;

create table public.ay6_meetings(
 id uuid primary key default gen_random_uuid(),site_id uuid not null references public.site_sites(id),revision int not null default 1,
 title text not null,meeting_on date not null,location text not null,agenda text not null,
 audience text not null check(audience in ('management','owners','community')),status text not null check(status in ('planned','held','documented','cancelled')),
 document_id uuid references public.ay6_documents(id),decision_reference text not null default '',created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.ay6_meetings enable row level security;
revoke all on public.ay6_meetings from public,anon,authenticated;
grant select(id,site_id,revision,title,meeting_on,location,agenda,audience,status,created_at,updated_at) on public.ay6_meetings to authenticated;
create function ay2_private.can_read_meeting(m uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ay6_meetings x where x.id=m and ay2_private.archive_audience(x.site_id,x.audience));$$;
revoke all on function ay2_private.can_read_meeting(uuid) from public,anon;
grant execute on function ay2_private.can_read_meeting(uuid) to authenticated;
create policy meeting_metadata_read on public.ay6_meetings for select to authenticated using(ay2_private.can_read_meeting(id));
create function public.ay6_save_meeting(p_site uuid,p_request uuid,p_id uuid,p_revision int,p_title text,p_day date,p_location text,p_agenda text,p_audience text,p_status text,p_document uuid,p_reference text,p_external_verified boolean,p_confirm boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare req jsonb; original public.ay6_meetings; ident uuid; answer jsonb;
begin
 req:=ay2_private.budget_request(p_site,'meeting_save',p_request,jsonb_build_object('id',p_id,'revision',p_revision,'title',btrim(p_title),'day',p_day,'location',btrim(p_location),'agenda',btrim(p_agenda),'audience',p_audience,'status',p_status,'document',p_document,'reference',btrim(p_reference),'verified',p_external_verified,'confirm',p_confirm,'reason',btrim(p_reason)));
 if (req->>'existing')::boolean then return req->'result';end if;
 if p_confirm is distinct from true or p_day is null or length(btrim(coalesce(p_title,''))) not between 3 and 200 or length(btrim(coalesce(p_location,''))) not between 3 and 300 or length(btrim(coalesce(p_agenda,''))) not between 3 and 5000 or length(coalesce(p_reference,''))>300 or p_audience is null or p_audience not in ('management','owners','community') or p_status is null or p_status not in ('planned','held','documented','cancelled') or length(btrim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Archive invalid meeting';end if;
 if p_document is not null and not exists(select 1 from public.ay6_documents where id=p_document and site_id=p_site and status='ready' and category in ('meeting','decision')) then raise exception 'Archive signed document required';end if;
 if p_status='documented' and (p_document is null or p_external_verified is distinct from true or length(btrim(coalesce(p_reference,'')))<3 or p_day>(now() at time zone 'Europe/Istanbul')::date) then raise exception 'Archive external record confirmation required';end if;
 if p_id is null then
  if p_revision is not null then raise exception 'Archive stale meeting';end if;
  insert into public.ay6_meetings(site_id,title,meeting_on,location,agenda,audience,status,document_id,decision_reference,created_by) values(p_site,btrim(p_title),p_day,btrim(p_location),btrim(p_agenda),p_audience,p_status,p_document,btrim(coalesce(p_reference,'')),auth.uid()) returning id into ident;
 else
  select * into original from public.ay6_meetings where site_id=p_site and id=p_id for update;
  if not found or original.revision is distinct from p_revision then raise exception 'Archive stale meeting';end if;
  update public.ay6_meetings set title=btrim(p_title),meeting_on=p_day,location=btrim(p_location),agenda=btrim(p_agenda),audience=p_audience,status=p_status,document_id=p_document,decision_reference=btrim(coalesce(p_reference,'')),revision=revision+1,updated_at=now() where id=p_id;ident:=p_id;
 end if;
 answer:=jsonb_build_object('id',ident,'revision',(select revision from public.ay6_meetings where id=ident));update public.ay5_operations set result=answer where id=(req->>'operation_id')::uuid;
 insert into public.ay2_audit(site_id,actor,action,entity_id,details) values(p_site,auth.uid(),'meeting_saved',ident,jsonb_build_object('before',to_jsonb(original),'after',(select to_jsonb(x) from public.ay6_meetings x where id=ident),'reason',btrim(p_reason)));return answer;
end;$$;
create function public.ay6_meeting_workspace(p_site uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not ay2_private.view_site(p_site) then raise exception 'Archive access denied' using errcode='42501';end if;
 return jsonb_build_object('admin',ay2_private.can(p_site,'admin'),'rows',coalesce((select jsonb_agg(to_jsonb(m) order by m.meeting_on desc) from(
 select id,revision,title,meeting_on,location,agenda,audience,status,created_at,
 case when ay2_private.can_read_document(document_id) then document_id else null end as document_id,
 case when ay2_private.can(p_site,'admin') then decision_reference else null end as decision_reference
 from public.ay6_meetings where site_id=p_site and ay2_private.can_read_meeting(id) order by meeting_on desc limit 100)m),'[]'::jsonb));
end;$$;
revoke all on function public.ay6_prepare_document(uuid,uuid,text,text,text,text,text,bigint,text,boolean),public.ay6_confirm_document(uuid,uuid,uuid),public.ay6_archive_document(uuid,uuid,uuid,text),public.ay6_document_download(uuid,uuid,uuid),public.ay6_set_document_access(uuid,uuid,uuid,text,boolean,text,boolean),public.ay6_document_workspace(uuid,text,text,boolean),public.ay6_save_meeting(uuid,uuid,uuid,int,text,date,text,text,text,text,uuid,text,boolean,boolean,text),public.ay6_meeting_workspace(uuid) from public,anon;
grant execute on function public.ay6_prepare_document(uuid,uuid,text,text,text,text,text,bigint,text,boolean),public.ay6_confirm_document(uuid,uuid,uuid),public.ay6_archive_document(uuid,uuid,uuid,text),public.ay6_document_download(uuid,uuid,uuid),public.ay6_set_document_access(uuid,uuid,uuid,text,boolean,text,boolean),public.ay6_document_workspace(uuid,text,text,boolean),public.ay6_save_meeting(uuid,uuid,uuid,int,text,date,text,text,text,text,uuid,text,boolean,boolean,text),public.ay6_meeting_workspace(uuid) to authenticated;
commit;
