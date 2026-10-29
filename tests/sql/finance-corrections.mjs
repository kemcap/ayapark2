import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),site='20000000-0000-0000-0000-000000000001';
const id=n=>'f0000000-0000-0000-0000-'+String(n).padStart(12,'0');
const user=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');
let passed=0;
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const check=(name,value)=>{assert(value,name);passed++;};
const as=async n=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user(n),role:'authenticated'})]);};
const command=(action,p)=>scalar('select public.ay2_command($1,$2,$3::jsonb)',[site,action,JSON.stringify(p)]);
try{
 for(const f of ['schema.sql','../../supabase/migrations/20261025073340_v4_finance_release_safety.sql','../../supabase/migrations/20261025194333_v5_notifications_finance.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 const migration=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).find(p=>p.endsWith('_phase2_superadmin_finance_corrections.sql'));
 assert(migration);
 const snapshot=()=>scalar("select jsonb_agg(jsonb_build_object('oid',oid,'acl',proacl,'config',proconfig,'definer',prosecdef) order by oid) from pg_proc where oid in ('ay2_private.command(uuid,text,jsonb)'::regprocedure,'ay2_private.command_v2(uuid,text,jsonb)'::regprocedure)");
 const before=await snapshot();
 const candidate=await readFile(new URL('../../supabase/migrations/'+migration,import.meta.url),'utf8');
 await db.exec(candidate);
 check('function identity and security/ACLs retained',JSON.stringify(before)===JSON.stringify(await snapshot()));
 await db.exec(candidate);
 check('repeat application retains function identity and ACLs',JSON.stringify(before)===JSON.stringify(await snapshot()));
 await db.exec(`insert into public.site_staff_memberships(site_id,user_id,role) values('${site}','${user(2)}','deputy');
 insert into public.ay2_permissions(site_id,user_id,capabilities) values('${site}','${user(2)}',array['finance']);
 insert into public.site_blocks(id,site_id,code) values('${id(1)}','${site}','A');
 insert into public.site_units(id,site_id,block_id,number,code) values('${id(2)}','${site}','${id(1)}',1,'A-1');
 insert into public.ay3_persons(id,site_id,full_name) values('${id(3)}','${site}','Synthetic owner');
 insert into public.ay3_links(id,site_id,unit_id,person_id,role,starts_on) values('${id(4)}','${site}','${id(2)}','${id(3)}','owner','2020-01-01');
 insert into public.ay2_settings(site_id,opening_cents,opening_date,initialized) values('${site}',0,'2020-01-01',true);
 insert into public.ay2_entries(id,site_id,booked_on,description,category,cents,dedup_key,created_by) values
 ('${id(5)}','${site}','2026-10-01','Synthetic payment','Aidat',1000,'qa-1','${user(1)}'),
 ('${id(6)}','${site}','2026-10-01','Synthetic reversal source','Aidat',1000,'qa-2','${user(1)}');
 insert into public.ay2_charges(id,site_id,unit_id,person_id,label,category,cents,due_on,payer,reference,created_by) values
 ('${id(7)}','${site}','${id(2)}','${id(3)}','Synthetic charge','Aidat',1000,'2026-10-01','owner','qa-1','${user(1)}'),
 ('${id(8)}','${site}','${id(2)}','${id(3)}','Synthetic void source','Aidat',1000,'2026-10-01','owner','qa-2','${user(1)}');`);
 await as(2);
 for(const f of ['public.ay2_command','ay2_private.command'])for(const action of ['reverse','unallocate','void_charge','void_credit']){
  await assert.rejects(()=>db.query(`select ${f}($1,$2,$3::jsonb)`,[site,action,JSON.stringify({id:'invalid UUID',reason:'QA'})]),{code:'42501'});passed++;
 }
 // Even privileged internal callers cannot use command_v2 to bypass the actor check.
 await db.exec('reset role');
 for(const action of ['reverse','unallocate','void_charge','void_credit']){
  await assert.rejects(()=>db.query('select ay2_private.command_v2($1,$2,$3::jsonb)',[site,action,'{"id":"invalid UUID"}']),{code:'42501'});passed++;
 }
 await as(2);
 const p={entry_id:id(5),charge_id:id(7),cents:1000,request_id:id(9)};
 const allocation=await command('allocate',p);
 check('finance staff still allocates a payment',!!allocation.id);
 check('allocation retry still idempotent',(await command('allocate',p)).already_recorded===true);
 const credit=await command('credit',{entry_id:id(6),person_id:id(3),unit_id:id(2),cents:250,request_id:id(10)});
 check('staff may still separate valid overpayment',!!credit.id);
 for(const n of [3]){await as(n);for(const action of ['reverse','unallocate','void_charge','void_credit']){await assert.rejects(()=>command(action,{id:id(8),reason:'QA'}),{code:'42501'});passed++;}}
 await as(1);
 const sourceBefore=await scalar('select to_jsonb(e) from public.ay2_entries e where id=$1',[id(6)]);
 await command('unallocate',{id:allocation.id,reason:'QA approved correction'});
 check('superadmin cancels allocation without deleting it',await scalar('select void_reason is not null from public.ay2_allocations where id=$1',[allocation.id]));
 await command('void_charge',{id:id(8),reason:'QA approved correction'});
 check('superadmin cancels charge without deleting it',await scalar('select void_reason is not null from public.ay2_charges where id=$1',[id(8)]));
 await command('void_credit',{id:credit.id,reason:'QA approved correction'});
 check('superadmin cancels credit without deleting it',await scalar('select void_reason is not null from public.ay3_credits where id=$1',[credit.id]));
 const reversal=await command('reverse',{id:id(6),reason:'QA approved correction'});
 check('superadmin creates opposite reversal',await scalar('select cents=-1000 and reversal_of=$1 from public.ay2_entries where id=$2',[id(6),reversal.id]));
 check('original entry retained byte-for-byte',JSON.stringify(sourceBefore)===JSON.stringify(await scalar('select to_jsonb(e) from public.ay2_entries e where id=$1',[id(6)])));
 check('corrections audit actor remains superadmin',await scalar("select count(*)=4 and bool_and(actor=$1) from public.ay2_audit where action=any($2::text[])",[user(1),['reverse','unallocate','void_charge','void_credit']]));
 await db.exec('reset role');
 const changed=await scalar("select pg_get_functiondef('ay2_private.command(uuid,text,jsonb)'::regprocedure)");
 await db.exec(changed.replace('declare ident','-- synthetic unexpected drift\ndeclare ident'));
 await assert.rejects(()=>db.exec(candidate),/Unexpected command definition/);passed++;
 await db.exec('ROLLBACK');
 console.log(JSON.stringify({passed,failed:0,scope:'isolated synthetic PostgreSQL; no live migration or auth service'}));
}finally{await db.close();}
