import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),id=n=>'7f000000-0000-0000-0000-'+String(n).padStart(12,'0');let checks=0;
const scalar=async(q,p=[])=>Object.values((await db.query(q,p)).rows[0])[0];
try{
 for(const f of ['tests/sql/schema.sql','supabase/migrations/20261026_email_free_whatsapp_activation.sql','supabase/auth-phase3.sql','supabase/auth-phase4.sql','supabase/auth-phase5.sql','supabase/auth-phase8.sql'])await db.exec(await readFile(new URL('../../'+f,import.meta.url),'utf8'));
 await db.exec('alter table public.ay3_persons add column archived_at timestamptz');
 const migration=(await readdir(new URL('../../supabase/migrations/',import.meta.url))).find(f=>f.endsWith('_person_invitation_eligibility.sql'));
 await db.exec(await readFile(new URL('../../supabase/migrations/'+migration,import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${id(1)}','manager@example.invalid');insert into public.site_sites(id,slug,name) values('${id(10)}','people-invite-test','Synthetic');insert into public.site_blocks(id,site_id,code) values('${id(11)}','${id(10)}','A');insert into public.site_units(id,site_id,block_id,number,code) values('${id(12)}','${id(10)}','${id(11)}',1,'A-1');insert into public.site_staff_memberships(site_id,user_id,role) values('${id(10)}','${id(1)}','manager');`);
 for(const [i,role,active,ends,reason] of [[2,'owner',true,null,null],[3,'tenant',true,null,null],[4,'representative',true,null,null],[5,'tenant',false,'2020-01-01','ended']]){
  const email=`synthetic-${i}@example.invalid`,hash=String(i).repeat(64),newHash=String(i+4).repeat(64);
  await db.query('insert into auth.users(id,email) values($1,$2)',[id(i),email]);
  await db.query('insert into public.ay3_persons(id,site_id,full_name) values($1,$2,$3)',[id(i+20),id(10),'Synthetic '+role]);
  await db.query('insert into public.ay3_links(site_id,unit_id,person_id,role,active,ends_on,archive_reason) values($1,$2,$3,$4,$5,$6,$7)',[id(10),id(12),id(i+20),role,active,ends,reason]);
  const issue='select public.ay_auth_issue_email_invite($1,$2,$3,$4)',redeem='select public.ay3_redeem_phone_invite($1,$2)';
  await db.query(issue,[id(1),id(i+20),email,hash]);assert(await scalar("select expires_at-created_at=interval '7 days' from public.ay3_invite_tokens where token_hash=$1",[hash]));checks++;
  await db.query(issue,[id(1),id(i+20),email,newHash]);await assert.rejects(db.query(redeem,[hash,id(i)]));checks++;
  await db.query('update public.ay3_invite_tokens set expires_at=now()-interval \'1 second\' where token_hash=$1',[newHash]);await assert.rejects(db.query(redeem,[newHash,id(i)]));checks++;
  await db.query(issue,[id(1),id(i+20),email,'a'.repeat(63)+String(i)]);await db.query(redeem,['a'.repeat(63)+String(i),id(i)]);
  assert.equal(await scalar('select auth_user_id from public.ay3_persons where id=$1',[id(i+20)]),id(i));checks++;
  await assert.rejects(db.query(redeem,['a'.repeat(63)+String(i),id(i)]));checks++;
  assert.equal(await scalar('select count(*)::int from public.site_resident_units where user_id=$1',[id(i)]),active&&role!=='representative'?1:0);checks++;
 }
 await db.exec('set role authenticated');await assert.rejects(db.query('select public.ay_auth_issue_email_invite($1,$2,$3,$4)',[id(1),id(22),'x@example.invalid','f'.repeat(64)]));checks++;
 console.log(JSON.stringify({checks,failed:0,scope:'synthetic PostgreSQL invitation flows'}));
}finally{await db.close();}
