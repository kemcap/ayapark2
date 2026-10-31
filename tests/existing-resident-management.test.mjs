import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {buildV3Form,payloadV3} from '../v3-forms.mjs?v=5.9.51';
import {peoplePage,personManager} from '../people-ui.mjs?v=5.9.51';

const person={id:'00000000-0000-0000-0000-000000000101',full_name:'Existing Resident',auth_user_id:'00000000-0000-0000-0000-000000000201',email:'',phone:'',archived_at:null};
const existingStaff={user_id:'00000000-0000-0000-0000-000000000201',role:'deputy',name:'Existing Resident'};
const state=(member=false)=>({mode:'connected',data:{role:'super',capabilities:{admin:true,people:true},persons:[person],staff:member?[existingStaff]:[],links:[],units:[],transactions:[],userId:'00000000-0000-0000-0000-000000000299',audit:[],permissions:[]}});

test('existing resident is selected for management without generating another person',()=>{
 const built=buildV3Form(state(),'user_access',{person:person.id});
 assert.match(built.body,new RegExp('value="'+person.id+'" selected'));
 assert.match(built.body,/Bestehendes Anmeldekonto erkannt|Mevcut giriş hesabı bulundu/);
 const form=new Map([['person_mode','existing'],['person_id',person.id],['access_role','deputy'],['confirmation','on']]);
 const payload=payloadV3('user_access',form,built.context);
 assert.equal(payload.person_id,person.id);
 assert.equal(payload.access_role,'deputy');
 assert.equal(payload.new_person,false);
 assert.equal(payload.confirmation,true);
});

test('management role action only appears on registered nonstaff persons for managers',()=>{
 const html=personManager(state(),person.id);
 assert.match(html,/data-action="user_access"/);
 assert.match(html,new RegExp('data-person="'+person.id+'"'));
 assert.match(peoplePage(state()),/data-action="user_access"/);
 assert.doesNotMatch(personManager(state(true),person.id),/data-action="user_access"/);
 assert.doesNotMatch(peoplePage(state(true)),/data-action="user_access"/);
});

test('SQL reuses linked phone-only account; unauthorized actor cannot promote',async()=>{
 const db=new PGlite();
 const sid='00000000-0000-0000-0000-000000000001';
 const manager='00000000-0000-0000-0000-000000000299';
 const resident=person.auth_user_id;
 try {
  await db.exec([
    'create role anon; create role authenticated; create role service_role;',
    'create schema auth; create schema ay2_private;',
    'create table auth.users(id uuid primary key,email text);',
    'create table public.ay3_persons(id uuid primary key,site_id uuid not null,email text,auth_user_id uuid,archived_at timestamptz);',
    'create table public.site_staff_memberships(site_id uuid,user_id uuid,role text);',
    'create table public.ay3_links(site_id uuid,person_id uuid,unit_id uuid,role text,active bool);',
    'create table public.site_resident_units(unit_id uuid,user_id uuid,role text,person_id uuid,active bool, primary key(unit_id,user_id,role));',
    'create table public.ay2_audit(site_id uuid,actor uuid,action text,entity_id uuid,details jsonb);',
    "insert into auth.users(id,email) values('"+resident+"',null);",
    "insert into public.ay3_persons(id,site_id,email,auth_user_id) values('"+person.id+"','"+sid+"',null,'"+resident+"');",
    "insert into public.site_staff_memberships(site_id,user_id,role) values('"+sid+"','"+manager+"','manager');",
    "insert into public.ay3_links(site_id,person_id,unit_id,role,active) values('"+sid+"','"+person.id+"','00000000-0000-0000-0000-000000000301','tenant',true);",
    "insert into public.site_resident_units(unit_id,user_id,role,active) values('00000000-0000-0000-0000-000000000301','"+resident+"','tenant',false);"
  ].join('\n'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261031153500_promote_existing_resident_account.sql',import.meta.url),'utf8'));
  await db.exec('create or replace function public.ay3_access_target(p_actor uuid,p_person uuid,p_role text) returns jsonb language sql as $ select ay2_private.access_target(p_actor,p_person,p_role); $;');
  const call=async (actor,personId=person.id,role='deputy')=>db.query(
    'select ay2_private.access_target($1::uuid,$2::uuid,$3::text) as target',[actor,personId,role]);
  const value=(await call(manager)).rows[0].target;
  assert.equal(value.user_id,resident);
  assert.equal(value.email,'');
  assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count,1);
  const asManager=(await call(manager,person.id,'manager')).rows[0].target;
  assert.equal(asManager.user_id,resident);
  await assert.rejects(call(resident),/Access denied/);
  const promoted=await db.query('select public.ay3_provision_access($1::uuid,$2::uuid,$3::uuid,$4::text) as result',[manager,person.id,resident,'deputy']);
  assert.equal(promoted.rows[0].result.ok,true);
  assert.equal((await db.query('select role from public.site_staff_memberships where user_id=$1',[resident])).rows[0].role,'deputy');
  assert.equal((await db.query('select active from public.site_resident_units where user_id=$1',[resident])).rows[0].active,false,'staff promotion must not revive revoked apartment grant');
  assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count,1);
  await db.exec("update public.ay3_persons set archived_at=now() where id='"+person.id+"'");
  await assert.rejects(call(manager),/Archived person/);
  await db.exec("update public.ay3_persons set archived_at=null,auth_user_id=null where id='"+person.id+"'");
  await assert.rejects(call(manager),/Person or role incomplete/);
 } finally {await db.close();}
});
