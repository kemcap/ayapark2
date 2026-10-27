import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();let checks=0;const check=(name,value)=>{assert(value,name);checks++;};
const id=n=>'9f000000-0000-0000-0000-'+String(n).padStart(12,'0');
const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
async function denied(sql,args=[]){let caught=false;try{await db.query(sql,args);}catch{caught=true;}check('operation denied',caught);}
try{
 await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/auth-phase3.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${id(1)}','manager@example.invalid'),('${id(2)}','resident@example.invalid'),('${id(3)}','alien@example.invalid');
 insert into public.site_sites(id,slug,name) values('${id(10)}','qa-auth-phase3','Synthetic');
 insert into public.site_staff_memberships(site_id,user_id,role) values('${id(10)}','${id(1)}','manager');
 insert into public.ay3_persons(id,site_id,full_name,auth_user_id) values('${id(20)}','${id(10)}','Synthetic Resident','${id(2)}'),('${id(21)}','${id(10)}','Other Resident','${id(3)}');`);
 const bind='select public.ay_auth_bind_phone($1,$2,$3,$4,$5)';
 await db.exec('set role anon');await denied('select public.ay_auth_phone_lookup($1)',['+905321234567']);await denied('select * from ay_auth_private.phone_contacts');
 await db.exec('reset role;set role authenticated');await denied(bind,[id(1),id(20),'+905321234567','Identity checked',true]);await denied('select * from ay_auth_private.login_limits');
 await db.exec('reset role;set role service_role');await denied(bind,[id(3),id(20),'+905321234567','Identity checked',true]);
 await db.query(bind,[id(1),id(20),'+905321234567','Identity checked',true]);check('lookup existing account',await value('select public.ay_auth_phone_lookup($1)',['+905321234567'])===id(2));
 await denied(bind,[id(1),id(21),'+905321234567','Identity checked',true]);check('conflicting bind preserves first user',await value('select public.ay_auth_phone_lookup($1)',['+905321234567'])===id(2));
 await db.query(bind,[id(1),id(20),'+905321234567','Revoked after check',false]);check('revoked contact hidden',await value('select public.ay_auth_phone_lookup($1)',['+905321234567'])===null);
 await db.query(bind,[id(1),id(20),'+905321234567','Reverified identity',true]);check('reactivation same user',await value('select public.ay_auth_phone_lookup($1)',['+905321234567'])===id(2));
 const bucket='phone:'+'a'.repeat(64),limit='select public.ay_auth_login_limit($1,2)';check('attempt 1',await value(limit,[bucket]));check('attempt 2',await value(limit,[bucket]));check('attempt 3 throttled',!await value(limit,[bucket]));
 await db.exec('reset role');check('only three synthetic Auth accounts',await value("select count(*)::int from auth.users where email in ('manager@example.invalid','resident@example.invalid','alien@example.invalid')")===3);check('three audit events',await value("select count(*)::int from public.ay2_audit where action in ('phone_login_verified','phone_login_revoked')")===3);check('no apartment grants created',await value('select count(*)::int from public.site_resident_units where user_id in ($1,$2)',[id(2),id(3)])===0);check('existing person binding retained',await value('select auth_user_id from public.ay3_persons where id=$1',[id(20)])===id(2));
 await db.exec("update ay_auth_private.login_limits set window_start=now()-interval '16 minutes'");await db.exec('set role service_role');check('window resets',await value(limit,[bucket]));
 console.log(JSON.stringify({passed:checks,failed:0,scope:'isolated synthetic PGlite; not Supabase Auth or concurrent network transactions'}));
}finally{await db.close();}
