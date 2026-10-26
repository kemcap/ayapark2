import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();let passed=0;const id=n=>'7f000000-0000-0000-0000-'+String(n).padStart(12,'0');
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];const check=(label,v)=>{assert(v,label);passed++;};const denied=async(sql,args)=>{let fail=false;try{await db.query(sql,args);}catch{fail=true;}check('denied',fail);};
try{
 for(const path of ['./schema.sql','../../supabase/auth-phase3.sql','../../supabase/auth-phase6.sql'])await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${id(1)}','manager@example.invalid'),('${id(2)}','alias@example.invalid'),('${id(3)}','other@example.invalid');
 insert into public.site_sites(id,slug,name) values('${id(10)}','recovery-qa','Synthetic');
 insert into public.site_staff_memberships(site_id,user_id,role) values('${id(10)}','${id(1)}','manager');
 insert into public.ay3_persons(id,site_id,full_name,auth_user_id) values('${id(20)}','${id(10)}','Synthetic resident','${id(2)}'),('${id(21)}','${id(10)}','Unactivated',null),('${id(22)}','${id(10)}','Staff','${id(1)}');
 grant select,insert,update on all tables in schema public to service_role;`);
 const authorize='select public.ay_auth_recovery_authorize($1,$2,$3,$4)',issued='select public.ay_auth_recovery_issued($1,$2,$3)';
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await denied(authorize,[id(1),id(20),'In person verified',true]);await db.exec('reset role');}
 await db.exec('set role service_role');
 for(const args of [[id(3),id(20),'In person verified',true],[id(1),id(21),'In person verified',true],[id(1),id(22),'In person verified',true],[id(1),id(20),'short',true],[id(1),id(20),'In person verified',false]])await denied(authorize,args);
 check('returns existing ID only',await scalar(authorize,[id(1),id(20),'In person verified',true])===id(2));
 await denied(issued,[id(1),id(20),id(3)]);await denied(issued,[id(3),id(20),id(2)]);
 await db.query(issued,[id(1),id(20),id(2)]);await db.exec('reset role');
 check('audit without credentials',await scalar("select count(*)::int from public.ay2_audit where action in ('recovery_authorized','recovery_link_issued')")===2);
 check('no accounts created',await scalar('select count(*)::int from auth.users where id in ($1,$2,$3)',[id(1),id(2),id(3)])===3);
 check('no apartment roles added',await scalar('select count(*)::int from public.site_resident_units where user_id=$1',[id(2)])===0);
 check('person linkage preserved',await scalar('select auth_user_id from public.ay3_persons where id=$1',[id(20)])===id(2));
 console.log(JSON.stringify({passed,failed:0,scope:'synthetic PostgreSQL, no GoTrue'}));
}finally{await db.close();}
