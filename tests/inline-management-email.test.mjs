import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {buildV3Form,payloadV3} from '../v3-forms.mjs?v=5.9.52';
const uid=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const person={id:uid(11),full_name:'Existing Resident',email:'',auth_user_id:null,archived_at:null};
const s={data:{persons:[person],role:'super',staff:[],units:[],links:[],permissions:[],userId:uid(1)}};

test('missing email is editable inside the existing person access form',()=>{
 const x=buildV3Form(s,'user_access',{person:person.id});
 assert.match(x.body,/id="accessExistingEmail"/);
 assert.match(x.body,/name="access_email"/);
 assert.match(x.body,new RegExp('value="'+person.id+'" selected'));
 const p=payloadV3('user_access',new Map([['person_mode','existing'],['person_id',person.id],['access_role','deputy'],['access_email','manager@example.invalid'],['confirmation','on']]),x.context);
 assert.equal(p.person_id,person.id);
 assert.equal(p.access_email,'manager@example.invalid');
 assert.equal(p.new_person,false);
 assert.equal(p.confirmation,true);
 assert.throws(()=>payloadV3('user_access',new Map([['person_mode','existing'],['person_id',person.id],['access_role','deputy'],['access_email','invalid'],['confirmation','on']]),x.context),/E-Mail|e-posta/i);
});

test('inline email RPC preserves original person and keeps email + membership in one transaction',async()=>{
 const db=new PGlite(),site=uid(1),manager=uid(2),targetUser=uid(20);
 try{
  await db.exec([
   'create role anon; create role authenticated; create role service_role;',
   'create schema auth; create schema ay2_private;',
   'create table auth.users(id uuid primary key,email text);',
   'create table public.ay3_persons(id uuid primary key,site_id uuid not null,full_name text,email text,auth_user_id uuid,archived_at timestamptz);',
   'create table public.site_staff_memberships(site_id uuid,user_id uuid,role text,primary key(site_id,user_id));',
   'create table public.ay3_links(site_id uuid,unit_id uuid,person_id uuid,role text,active bool);',
   'create table public.site_resident_units(unit_id uuid,user_id uuid,role text,person_id uuid,active bool,primary key(unit_id,user_id,role));',
   'create table public.ay2_audit(site_id uuid,actor uuid,action text,entity_id uuid,details jsonb);',
   "insert into auth.users(id,email) values('"+manager+"','manager@example.invalid');",
   "insert into public.ay3_persons(id,site_id,full_name,email) values('"+person.id+"','"+site+"','Existing Resident','');",
   "insert into public.site_staff_memberships(site_id,user_id,role) values('"+site+"','"+manager+"','manager');"
  ].join('\n'));
  const base=await readFile(new URL('../supabase/migrations/20261031153500_promote_existing_resident_account.sql',import.meta.url),'utf8');
  await db.exec(base);
  await db.exec('create or replace function public.ay3_access_target(p_actor uuid,p_person uuid,p_role text) returns jsonb language sql as $fn$ select ay2_private.access_target(p_actor,p_person,p_role); $fn$;');
  await db.exec(await readFile(new URL('../supabase/migrations/20261031154500_inline_management_access_email.sql',import.meta.url),'utf8'));
  const args=[manager,person.id,'deputy','resident@example.invalid'];
  let response=(await db.query('select public.ay3_access_target_inline_email($1::uuid,$2::uuid,$3::text,$4::text) as response',args)).rows[0].response;
  assert.equal(response.user_id,null);
  assert.equal(response.email,'resident@example.invalid');
  assert.equal((await db.query('select email from public.ay3_persons where id=$1',[person.id])).rows[0].email,'');
  await db.exec("insert into auth.users(id,email) values('"+targetUser+"','resident@example.invalid')");
  const assigned=(await db.query('select public.ay3_provision_access_inline_email($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) as result',[manager,person.id,targetUser,'deputy','resident@example.invalid'])).rows[0].result;
  assert.equal(assigned.ok,true);
  const record=(await db.query('select email,auth_user_id from public.ay3_persons where id=$1',[person.id])).rows[0];
  assert.equal(record.email,'resident@example.invalid');
  assert.equal(record.auth_user_id,targetUser);
  assert.equal((await db.query('select role from public.site_staff_memberships where user_id=$1',[targetUser])).rows[0].role,'deputy');
  assert.equal((await db.query('select count(*)::int as num from public.ay3_persons')).rows[0].num,1);
  await assert.rejects(()=>db.query('select public.ay3_access_target_inline_email($1::uuid,$2::uuid,$3::text,$4::text)',[targetUser,person.id,'manager','stranger@example.invalid']),/Access denied/);
  await assert.rejects(()=>db.query('select public.ay3_access_target_inline_email($1::uuid,$2::uuid,$3::text,$4::text)',[manager,person.id,'manager','another@example.invalid']),/Existing account email/);
  // A duplicate email cannot be claimed by a new person.
  const nextPerson=uid(12);
  await db.exec("insert into public.ay3_persons(id,site_id,full_name,email) values('"+nextPerson+"','"+site+"','Second Resident','')");
  await assert.rejects(()=>db.query('select public.ay3_access_target_inline_email($1::uuid,$2::uuid,$3::text,$4::text)',[manager,nextPerson,'deputy','resident@example.invalid']),/Email already assigned/);
 } finally {await db.close();}
});

test('edge provision picks atomic RPC only when inline email is supplied',async()=>{
 const edge=await readFile(new URL('../supabase/functions/ay3-user-access/index.ts',import.meta.url),'utf8');
 assert.match(edge,/ay3_access_target_inline_email/);
 assert.match(edge,/ay3_provision_access_inline_email/);
 assert.match(edge,/body\.access_email/);
 assert.match(edge,/inlineEmail\?'ay3_provision_access_inline_email':'ay3_provision_access'/);
});
