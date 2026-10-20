import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const ids={site:'00000000-0000-4000-8000-000000000001',other:'00000000-0000-4000-8000-000000000002',manager:'10000000-0000-4000-8000-000000000001',staff:'10000000-0000-4000-8000-000000000002',resident:'10000000-0000-4000-8000-000000000003',stranger:'10000000-0000-4000-8000-000000000004',a:'20000000-0000-4000-8000-000000000001',b:'20000000-0000-4000-8000-000000000002'};
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table public.site_sites(id uuid primary key);create table public.site_units(id uuid primary key,site_id uuid references site_sites(id),unique(id,site_id));create table public.site_staff_memberships(site_id uuid,user_id uuid,role text);create table public.site_resident_units(unit_id uuid,user_id uuid,active boolean);create function public.site_can_view_site(s uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.site_staff_memberships where site_id=s and user_id=auth.uid()) or exists(select 1 from public.site_resident_units r join public.site_units u on u.id=r.unit_id where u.site_id=s and r.user_id=auth.uid() and active)$$;`);
await db.query('insert into auth.users values ($1),($2),($3),($4)',[ids.manager,ids.staff,ids.resident,ids.stranger]);
await db.query('insert into site_sites values($1),($2)',[ids.site,ids.other]);
await db.query('insert into site_units values($1,$3),($2,$3)',[ids.a,ids.b,ids.site]);
await db.query("insert into site_staff_memberships values($1,$2,'manager'),($1,$3,'deputy')",[ids.site,ids.manager,ids.staff]);
await db.query('insert into site_resident_units values($1,$2,true)',[ids.a,ids.resident]);
await db.exec(await readFile(new URL('../../supabase/migrations/20261020145217_ayapark_v2_isolated_finance.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261020150258_ayapark_v2_consistent_workspace.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/20261020150554_ayapark_v2_idempotent_allocation.sql',import.meta.url),'utf8'));
async function as(user,fn){await db.exec('begin;set local role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);try{const result=await fn();await db.exec('commit');return result;}catch(error){await db.exec('rollback');throw error;}}
async function command(action,payload={},site=ids.site){const r=await db.query('select public.ay2_command($1,$2,$3::jsonb) as result',[site,action,JSON.stringify({request_id:crypto.randomUUID(),...payload})]);return r.rows[0].result;}
let entry,charge;
test('database: initialization and immutable ledger with duplicate protection',async()=>{
 await as(ids.manager,async()=>{
  await command('settings',{opening_cents:0,opening_date:'2026-01-01'});
  const payload={source:'test.csv',digest:'abc',entries:[{date:'2026-10-01',desc:'Payment',cents:10000,reference:'r1'},{date:'2026-10-01',desc:'Fee',cents:-500,reference:'r1'}]};
  assert.equal((await command('import',payload)).inserted,2);
  assert.equal((await command('import',payload)).inserted,0);
  assert.equal((await command('import',{...payload,digest:'abc2'})).duplicates,2);
  entry=(await db.query('select id from ay2_entries where cents>0')).rows[0].id;
  charge=(await command('charge',{unit_id:ids.a,category:'Aidat',label:'October',due_on:'2026-10-01',cents:8000,payer:'tenant',reference:'test'})).id;
 });
});
test('database: resident sees own charges but neither bank data nor other units; foreign site rejected',async()=>{
 await assert.rejects(as(ids.manager,()=>db.query('delete from public.ay2_entries')),/permission denied/);
 await as(ids.manager,()=>command('charge',{unit_id:ids.b,category:'Aidat',label:'October',due_on:'2026-10-01',cents:5000,payer:'owner',reference:'test'}));
 await as(ids.resident,async()=>{
  assert.equal((await db.query('select * from ay2_charges')).rows.length,1);
  const workspace=(await db.query('select public.ay2_workspace($1) as w',[ids.site])).rows[0].w;assert.equal(workspace.entries.length,0);assert.equal(workspace.charges.length,1);
  assert.equal((await db.query('select * from ay2_entries')).rows.length,0);
  assert.equal((await db.query('select * from ay2_people')).rows.length,0);
  await assert.rejects(command('entry',{date:'2026-10-01',desc:'x',category:'x',cents:1,request_id:crypto.randomUUID()}),/yetkiniz/);
 });
 await assert.rejects(as(ids.manager,()=>command('charge',{unit_id:ids.a,category:'x',label:'x',due_on:'2026-10-01',cents:1,payer:'owner',reference:'x'},ids.other)),/yetkiniz/);
});
test('database: partial payments, over-allocation rejection and traceable corrections',async()=>{
 const request_id=crypto.randomUUID();
 const allocation=await as(ids.manager,()=>command('allocate',{entry_id:entry,charge_id:charge,cents:3000,request_id}));
 assert.equal((await as(ids.manager,()=>command('allocate',{entry_id:entry,charge_id:charge,cents:3000,request_id}))).already_recorded,true);
 await assert.rejects(as(ids.manager,()=>command('allocate',{entry_id:entry,charge_id:charge,cents:2000,request_id})),/farklı/);
 await assert.rejects(as(ids.manager,()=>command('allocate',{entry_id:entry,charge_id:charge,cents:6000})),/aşıyor/);
 await assert.rejects(as(ids.manager,()=>command('reverse',{id:entry,reason:'Mistake'})),/eşleştirme/);
 await as(ids.manager,()=>command('unallocate',{id:allocation.id,reason:'Wrong match'}));
 await as(ids.manager,()=>command('reverse',{id:entry,reason:'Mistake'}));
 await as(ids.manager,async()=>{assert.equal(Number((await db.query('select sum(cents) as sum from ay2_entries')).rows[0].sum),-500);assert.ok((await db.query('select * from ay2_audit')).rows.length>0);});
});
test('database: individual staff grants cannot grant admin privileges',async()=>{
 await assert.rejects(as(ids.staff,()=>command('monthly',{due_on:'2026-11-01',label:'November',cents:360000,payer:'tenant'})),/yetkiniz/);
 await as(ids.manager,()=>command('permissions',{user_id:ids.staff,capabilities:['finance']}));
 await as(ids.staff,()=>command('monthly',{due_on:'2026-11-01',label:'November',cents:360000,payer:'tenant'}));
 await as(ids.staff,()=>command('monthly',{due_on:'2026-11-01',label:'November',cents:360000,payer:'tenant'}));
 await as(ids.manager,async()=>assert.equal((await db.query("select * from ay2_charges where reference='monthly:2026-11-01'")).rows.length,2));
 await assert.rejects(as(ids.staff,()=>command('permissions',{user_id:ids.staff,capabilities:['finance','people']})),/yetkiniz/);
});
test('database: aggregate report and announcement publication preserve resident privacy',async()=>{
 await as(ids.manager,()=>command('publish_report',{period:'2026-10-01'}));
 await as(ids.manager,()=>command('announcement',{title:'Draft',body:'Private',published:false}));
 await as(ids.manager,()=>command('announcement',{title:'Published',body:'Hello',published:true}));
 await as(ids.resident,async()=>{const r=(await db.query('select * from ay2_reports')).rows[0];assert.equal(Number(r.closing_cents),Number(r.opening_cents)+Number(r.income_cents)-Number(r.expense_cents));assert.equal((await db.query('select * from ay2_announcements')).rows.length,1);});
 await as(ids.stranger,async()=>{assert.equal((await db.query('select * from ay2_reports')).rows.length,0);assert.equal((await db.query('select * from ay2_charges')).rows.length,0);});
});
test('database: anonymous RPC and data access fail closed',async()=>{
 await db.exec('begin;set local role anon');
 await assert.rejects(db.query('select * from public.ay2_entries'),/permission denied/);await db.exec('rollback');
 await db.exec('begin;set local role anon');await assert.rejects(db.query('select public.ay2_capabilities($1)',[ids.site]),/permission denied/);await db.exec('rollback');
 await db.close();
});
