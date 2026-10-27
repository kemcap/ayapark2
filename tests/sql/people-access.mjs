import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),id=n=>'7f000000-0000-0000-0000-'+String(n).padStart(12,'0');let passed=0;
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const check=(label,value)=>{assert(value,label);passed++;};
const as=async n=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claims','{"sub":"${id(n)}","role":"authenticated"}',false);`);
try{
 for(const path of ['schema.sql','../../supabase/migrations/20261025073340_v4_finance_release_safety.sql','../../supabase/migrations/20261025194333_v5_notifications_finance.sql','../../supabase/migrations/20261026061016_visible_expired_announcements.sql','../../supabase/migrations/20261026_email_free_whatsapp_activation.sql','../../supabase/auth-phase3.sql','../../supabase/auth-phase4.sql','../../supabase/auth-phase5.sql','../../supabase/auth-phase6.sql','../../supabase/auth-phase8.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec(`alter table auth.users add column encrypted_password text,add column last_sign_in_at timestamptz,add column email_confirmed_at timestamptz,add column phone_confirmed_at timestamptz,add column deleted_at timestamptz,add column banned_until timestamptz;`);
 for(const path of ['../../supabase/migrations/20261027174427_people_invitation_eligibility.sql','../../supabase/migrations/20261027174611_people_registration_status.sql','../../supabase/migrations/20261027174807_personal_history_access.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email,encrypted_password,email_confirmed_at) select ('7f000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'fixture'||n||'@example.invalid','synthetic',now() from generate_series(1,6)n;
 insert into public.site_sites(id,slug,name) values('${id(10)}','people-qa','Synthetic');
 insert into public.site_blocks(id,site_id,code) values('${id(11)}','${id(10)}','A');
 insert into public.site_units(id,site_id,block_id,number,code) values('${id(12)}','${id(10)}','${id(11)}',1,'A-1'),('${id(13)}','${id(10)}','${id(11)}',2,'A-2');
 insert into public.site_staff_memberships(site_id,user_id,role) values('${id(10)}','${id(1)}','manager');
 insert into public.ay3_persons(id,site_id,full_name,auth_user_id) select ('7f000000-0000-0000-0000-'||lpad((20+n)::text,12,'0'))::uuid,'${id(10)}','Fixture '||n,('7f000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(2,5)n;
 insert into public.ay3_persons(id,site_id,full_name) values('${id(26)}','${id(10)}','Unregistered same name');
 insert into public.ay3_links(id,site_id,unit_id,person_id,role,active,starts_on,ends_on) values
 ('${id(32)}','${id(10)}','${id(12)}','${id(22)}','tenant',false,'2020-01-01','2021-01-01'),
 ('${id(33)}','${id(10)}','${id(12)}','${id(23)}','tenant',true,'2026-01-01',null),
 ('${id(34)}','${id(10)}','${id(12)}','${id(24)}','representative',true,null,null),
 ('${id(35)}','${id(10)}','${id(13)}','${id(25)}','owner',true,null,null);
 insert into public.site_resident_units(unit_id,user_id,role,active) values('${id(12)}','${id(2)}','tenant',true),('${id(12)}','${id(3)}','tenant',true),('${id(12)}','${id(4)}','representative',true),('${id(13)}','${id(5)}','owner',true);
 insert into public.ay2_settings(site_id,opening_cents,opening_date,initialized) values('${id(10)}',5000,'2020-01-01',true);
 alter table public.ay2_charges alter column reference set default gen_random_uuid()::text;
 insert into public.ay2_charges(id,site_id,unit_id,person_id,link_id,label,category,cents,due_on,payer,created_by) values
 ('${id(42)}','${id(10)}','${id(12)}','${id(22)}','${id(32)}','Old personal','Aidat',1000,'2020-02-01','tenant','${id(1)}'),
 ('${id(43)}','${id(10)}','${id(12)}','${id(23)}','${id(33)}','New personal','Aidat',2000,'2026-02-01','tenant','${id(1)}'),
 ('${id(45)}','${id(10)}','${id(13)}','${id(25)}','${id(35)}','Other unit','Aidat',3000,'2026-02-01','owner','${id(1)}');
 insert into public.ay2_entries(id,site_id,booked_on,description,category,cents,dedup_key,created_by) values('${id(50)}','${id(10)}','2020-02-02','PRIVATE BANK','Aidat',1500,'qa','${id(1)}');
 insert into public.ay2_allocations(id,site_id,entry_id,charge_id,cents,request_id,created_by) values('${id(51)}','${id(10)}','${id(50)}','${id(42)}',1000,'${id(90)}','${id(1)}'),('${id(52)}','${id(10)}','${id(50)}','${id(43)}',500,'${id(91)}','${id(1)}');
 insert into public.ay2_announcements(id,site_id,title,body,published,created_by,target_kind) values('${id(60)}','${id(10)}','Internal','Current residents',true,'${id(1)}','all'),('${id(61)}','${id(10)}','Owners only','Mandate test',true,'${id(1)}','owners');`);
 await as(2);
 check('former can enter site',await scalar('select public.site_can_view_site($1)',[id(10)]));
 check('former sees own paid historical claim only',await scalar('select count(*)::int from public.ay2_charges')===1);
 check('former sees own historical relationship only',await scalar('select count(*)::int from public.ay3_links')===1);
 check('former cannot read people directory',await scalar('select count(*)::int from public.ay3_persons')===0);
 check('former sees own allocation only',await scalar('select count(*)::int from public.ay2_allocations')===1);
 check('former cannot read bank rows',await scalar('select count(*)::int from public.ay2_entries')===0);
 check('former summary returns no global finance',await scalar('select public.ay3_financial_summary($1)',[id(10)])===null);
 check('former cannot request aggregate endpoint',await scalar('select public.ay3_community_access($1)',[id(10)])===false);
 check('former sees no internal announcements',await scalar('select count(*)::int from public.ay2_announcements')===0);
 check('former payment projection is personal',(await scalar('select public.ay5_workspace($1)',[id(10)])).entries[0].cents===1000);
 check('former cannot get registration metadata',Object.keys(await scalar('select ay2_private.person_access($1)',[id(10)])).length===0);
 await as(3);
 check('new resident never inherits old claim',await scalar('select count(*)::int from public.ay2_charges where id=$1',[id(42)])===0);
 check('new resident sees own claim',await scalar('select count(*)::int from public.ay2_charges')===1);
 check('current resident keeps aggregate permission',await scalar('select public.ay3_community_access($1)',[id(10)]));
 await as(4);
 check('representative has no implicit finance',await scalar('select count(*)::int from public.ay2_charges')===0);
 check('representative has no community finance',await scalar('select public.ay3_community_access($1)',[id(10)])===false);
 check('representative cannot receive owner notices without mandate',await scalar('select count(*)::int from public.ay2_announcements where id=$1',[id(61)])===0);
 await db.exec(`reset role;update public.ay3_links set mandates=array['owners'] where id='${id(34)}';`);await as(4);
 check('representative explicit notification mandate works',await scalar('select count(*)::int from public.ay2_announcements where id=$1',[id(61)])===1);
 check('notification mandate grants no financial data',await scalar('select count(*)::int from public.ay2_charges')===0);
 await as(6);check('unrelated account denied',await scalar('select public.ay5_workspace($1)',[id(10)])===null);
 await as(1);const statuses=await scalar('select ay2_private.person_access($1)',[id(10)]);
 check('activated historical account registered',statuses[id(22)].registered===true);
 check('same-name unlinked person not registered',statuses[id(26)].registered===false);
 await db.exec(`reset role;update auth.users set encrypted_password=null where id='${id(3)}';`);await as(1);
 check('provisioned account without password not registered',(await scalar('select ay2_private.person_access($1)',[id(10)]))[id(23)].registered===false);
 await db.exec(`reset role;update public.site_resident_units set active=false where user_id='${id(2)}';`);await as(2);
 check('explicit access revocation still works',await scalar('select count(*)::int from public.ay2_charges')===0);
 await db.exec('reset role');await db.exec(await readFile(new URL('../../supabase/migrations/20261027175638_person_identity_guard.sql',import.meta.url),'utf8'));
 let duplicate=false;try{await db.exec(`insert into public.ay3_persons(site_id,full_name) values('${id(10)}','Fixture 2');`);}catch{duplicate=true;}check('duplicate insertion blocked without rewriting old person',duplicate);
 let wrong=false;try{await db.exec(`update public.ay3_persons set auth_user_id='${id(3)}' where id='${id(26)}';`);}catch{wrong=true;}check('another person cannot reuse a linked account',wrong);
 check('original historical debtor unchanged',await scalar('select person_id from public.ay2_charges where id=$1',[id(42)])===id(22));
 console.log(JSON.stringify({passed,failed:0,scope:'synthetic PostgreSQL RLS, direct queries and RPCs'}));
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
