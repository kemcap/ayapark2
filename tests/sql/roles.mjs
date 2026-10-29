import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Deliberately accepts no connection URL: synthetic, in-memory PostgreSQL only.
const db=new PGlite();
const site='20000000-0000-0000-0000-000000000001';
const other='20000000-0000-0000-0000-000000000099';
const user=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');
const delegated=['finance','import','people','announcements'];
let passed=0;
const check=(label,actual,expected)=>{assert.deepEqual(actual,expected,label);passed++;};
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
async function as(n){
 await db.exec('reset role;set role authenticated');
 await db.query("select set_config('request.jwt.claims',$1,false)",[
  JSON.stringify({sub:user(n),role:'authenticated',user_metadata:{role:'manager',admin:true}})
 ]);
}
async function grants(n,caps){
 await db.exec('reset role');
 await db.query(`insert into public.ay2_permissions(site_id,user_id,capabilities) values($1,$2,$3)
 on conflict(site_id,user_id) do update set capabilities=excluded.capabilities`,[site,user(n),caps]);
 await as(n);
}
try{
 for(const path of ['schema.sql','../../supabase/migrations/20261025073340_v4_finance_release_safety.sql','../../supabase/migrations/20261025194333_v5_notifications_finance.sql'])
  await db.exec(await readFile(new URL(path,import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${user(4)}','qa-auditor@example.invalid');
 insert into public.site_staff_memberships(site_id,user_id,role) values
 ('${site}','${user(2)}','deputy'),('${site}','${user(4)}','auditor');
 insert into public.site_sites(id,slug,name) values('${other}','qa-other','Synthetic other site');`);
 for(const n of [2,4]){
  for(let mask=0;mask<16;mask++){
   const caps=delegated.filter((_,i)=>mask&(1<<i));
   await grants(n,caps);
   for(const cap of [...delegated,'admin']){
    check(`user ${n}, mask ${mask}, ${cap}`,await scalar('select ay2_private.can($1,$2)',[site,cap]),caps.includes(cap));
    check(`cross-site user ${n}, mask ${mask}, ${cap}`,await scalar('select ay2_private.can($1,$2)',[other,cap]),false);
   }
   await assert.rejects(()=>db.query("select public.ay2_command($1,'permissions',$2::jsonb)",[site,JSON.stringify({user_id:user(n),capabilities:['finance','people']})]),{code:'42501'});passed++;
  }
 }
 await grants(3,delegated); // A stale permission row alone cannot make a resident staff.
 for(const cap of [...delegated,'admin'])check('resident stale grant '+cap,await scalar('select ay2_private.can($1,$2)',[site,cap]),false);
 await db.exec('reset role');
 await db.query('delete from public.site_staff_memberships where site_id=$1 and user_id=$2',[site,user(2)]);
 await grants(2,delegated);
 for(const cap of [...delegated,'admin'])check('revoked membership '+cap,await scalar('select ay2_private.can($1,$2)',[site,cap]),false);
 await as(1);
 for(const cap of [...delegated,'admin'])check('manager '+cap,await scalar('select ay2_private.can($1,$2)',[site,cap]),true);
 await assert.rejects(()=>db.query("select public.ay2_command($1,'permissions',$2::jsonb)",[site,JSON.stringify({user_id:user(4),capabilities:['admin']})]),{code:'23514'});passed++;
 await db.exec('reset role;set role anon');
 await assert.rejects(()=>db.query('select public.ay2_capabilities($1)',[site]),{code:'42501'});passed++;
 console.log(JSON.stringify({passed,failed:0,scope:'legacy capability boundary matrix, synthetic in-memory PostgreSQL; not acceptance of five target permissions or live policies'}));
}finally{await db.close();}
