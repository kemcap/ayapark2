import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
test('provider category migration backfills data, edits displayed notes and protects used categories',async()=>{
 const db=new PGlite(),site=id(1),admin=id(2),outsider=id(3),provider=id(4),note=id(5);
 try{
  const ddl=[
   'create role anon; create role authenticated; create schema auth; create schema ay2_private;',
   "create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb);",
   "create function auth.uid() returns uuid language sql stable as $fn$ select nullif(current_setting('app.current_user',true),'')::uuid $fn$;",
   'create table public.site_sites(id uuid primary key,name text);',
   "create table public.ay3_providers(id uuid primary key default gen_random_uuid(),site_id uuid,name text,category text not null,contact text not null default '',phone text not null default '',email text not null default '',status text not null default 'preferred',created_by uuid);",
   'create table public.ay3_provider_notes(id uuid primary key default gen_random_uuid(),site_id uuid,provider_id uuid,body text,visit_on date,created_by uuid,author_label text,created_at timestamptz default now());',
   'create table public.ay2_audit(site_id uuid,actor uuid,action text,entity_id uuid,details jsonb);',
   'create table public.site_staff_memberships(site_id uuid,user_id uuid,role text);',
   "create function ay2_private.can(s uuid,cap text) returns boolean language sql stable as $fn$ select exists(select 1 from public.site_staff_memberships where site_id=s and user_id=auth.uid() and role='manager') $fn$;",
   "create function ay2_private.view_site(s uuid) returns boolean language sql stable as $fn$ select ay2_private.can(s,'people') $fn$;",
   "create function ay2_private.current_member(s uuid,b bool) returns boolean language sql stable as $fn$ select ay2_private.can(s,'people') $fn$;",
   "insert into public.site_sites(id,name) values('"+site+"','Test');",
   "insert into auth.users(id,raw_user_meta_data) values('"+admin+"','{}'),('"+outsider+"','{}');",
   "insert into public.site_staff_memberships(site_id,user_id,role) values('"+site+"','"+admin+"','manager');",
   "insert into public.ay3_providers(id,site_id,name,category,contact,created_by) values('"+provider+"','"+site+"','Existing','Elektrik','','"+admin+"');",
   "insert into public.ay3_provider_notes(id,site_id,provider_id,body,created_by,author_label) values('"+note+"','"+site+"','"+provider+"','Original note','"+admin+"','Manager');",
   "select set_config('app.current_user','"+admin+"',false);"
  ];
  await db.exec(ddl.join('\n'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261031172000_multi_provider_categories.sql',import.meta.url),'utf8'));
  assert.deepEqual((await db.query('select categories from public.ay3_providers where id=$1',[provider])).rows[0].categories,['Elektrik']);
  await db.query('select public.ay3_manage_provider_category($1::uuid,$2::text,$3::text,$4::uuid)',[site,'add','Su arıtma',null]);
  const payload={id:provider,name:'Existing',categories:['Elektrik','Su arıtma'],status:'preferred',edit_note_id:note,edit_note_body:'Edited note'};
  await db.query('select public.ay3_save_provider($1::uuid,$2::jsonb)',[site,JSON.stringify(payload)]);
  assert.deepEqual((await db.query('select categories from public.ay3_providers where id=$1',[provider])).rows[0].categories,['Elektrik','Su arıtma']);
  assert.equal((await db.query('select body from public.ay3_provider_notes where id=$1',[note])).rows[0].body,'Edited note');
  assert.equal((await db.query('select count(*)::int as n from public.ay3_provider_notes')).rows[0].n,1);
  const categoryId=(await db.query('select id from public.ay3_provider_categories where site_id=$1 and name=$2',[site,'Su arıtma'])).rows[0].id;
  await assert.rejects(()=>db.query('select public.ay3_manage_provider_category($1::uuid,$2::text,$3::text,$4::uuid)',[site,'delete',null,categoryId]),/Category is in use/);
  await db.query('select public.ay3_manage_provider_category($1::uuid,$2::text,$3::text,$4::uuid)',[site,'rename','Su tesisatı',categoryId]);
  assert((await db.query('select categories from public.ay3_providers where id=$1',[provider])).rows[0].categories.includes('Su tesisatı'));
  await assert.rejects(()=>db.query('select public.ay3_save_provider($1::uuid,$2::jsonb)',[site,JSON.stringify({id:provider,name:'Existing',categories:['Elektrik','Unknown'],status:'preferred'})]),/Unknown or duplicate categories/);
  await db.exec("select set_config('app.current_user','"+outsider+"',false);");
  await assert.rejects(()=>db.query('select public.ay3_manage_provider_category($1::uuid,$2::text,$3::text,$4::uuid)',[site,'add','Forbidden',null]),/Access denied/);
  await assert.rejects(()=>db.query('select public.ay3_save_provider($1::uuid,$2::jsonb)',[site,JSON.stringify(payload)]),/Access denied/);
 }finally{await db.close();}
});
