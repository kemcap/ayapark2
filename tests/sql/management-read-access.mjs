import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadCurrentSchema} from './current-schema.mjs';
const db=new PGlite(),site='20000000-0000-0000-0000-000000000001',id=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');let passed=0;
const q=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const check=(name,v)=>{assert(v,name);passed++};
const as=async n=>{await db.exec('reset role;set role authenticated');await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id(n),role:'authenticated'})]);};
try{
 await loadCurrentSchema(db,{periodClosings:false,bankImport:false,levyReview:false,budgetPlanning:false});
 await db.exec(`insert into public.site_staff_memberships(site_id,user_id,role) values('${site}','${id(2)}','deputy');insert into public.ay3_task_grants(site_id,user_id,tasks) values('${site}','${id(2)}','{}');`);
 await db.exec(await readFile(new URL('../../supabase/management-read-access.sql',import.meta.url),'utf8'));
 await db.exec(`insert into public.site_blocks(id,site_id,code) values('${id(50)}','${site}','A');insert into public.site_units(id,site_id,block_id,number,code) values('${id(51)}','${site}','${id(50)}',2,'A2');insert into public.ay3_persons(id,site_id,full_name,email,phone,notes) values('${id(52)}','${site}','Synthetic owner','private@example.invalid','PRIVATE PHONE','PRIVATE NOTE');insert into public.ay3_links(id,site_id,unit_id,person_id,role) values('${id(53)}','${site}','${id(51)}','${id(52)}','owner');insert into public.ay2_charges(id,site_id,unit_id,person_id,link_id,label,cents,due_on,category,payer,reference,created_by) values('${id(54)}','${site}','${id(51)}','${id(52)}','${id(53)}','Synthetic debt',10000,'2026-10-01','Aidat','owner','synthetic-test','${id(1)}');`);
 await db.exec(`insert into public.ay2_entries(id,site_id,booked_on,description,sender_iban,category,cents,dedup_key,created_by) values('${id(60)}','${site}','2026-10-15','PRIVATE BANK MEMO','PRIVATE IBAN','Aidat',3000,'synthetic-read','${id(1)}');insert into public.ay2_allocations(id,site_id,entry_id,charge_id,cents,created_by,request_id) values('${id(61)}','${site}','${id(60)}','${id(54)}',3000,'${id(1)}','${id(62)}');`);
 await as(2);check('existing management defaults on',await q('select ay2_private.management_read($1)',[site]));
 const payload=await q('select public.ay5_workspace($1)',[site]);
 check('actual workspace includes all-unit claim',payload.charges.some(c=>c.id===id(54)));
 check('name present',payload.persons.some(p=>p.full_name==='Synthetic owner'));
 check('no contact or private note',!JSON.stringify(payload.persons).includes('PRIVATE')&&!JSON.stringify(payload.persons).includes('@'));
 check('no mutation finance capability',payload.capabilities.finance===false);
 check('no mutation people capability',payload.capabilities.people===false);
 check('no admin capability',payload.capabilities.admin===false);
 check('allocated payment amount retained',payload.allocations.find(a=>a.id===id(61))?.cents===3000);
 check('allocated bank date retained',payload.entries.find(e=>e.id===id(60))?.booked_on==='2026-10-15');
 check('no raw bank description or IBAN',!JSON.stringify(payload.entries).includes('PRIVATE'));
 check('raw RLS does not gain foreign person access',await q('select count(*)::int from public.ay3_persons where id=$1',[id(52)])===0);
 await assert.rejects(()=>q('update public.ay3_task_grants set management_read=false where site_id=$1 returning true',[site]),{code:'42501'});passed++;

 await assert.rejects(()=>q('select public.ay7_set_management_rights($1,$2,$3,$4)',[site,id(2),[],false]),{code:'42501'});passed++;
 for(const action of ['person','entry','reverse','allocate','void_charge']){await assert.rejects(()=>q('select public.ay2_command($1,$2,$3)',[site,action,{}]),{code:'42501'});passed++;}
 await as(1);await q('select public.ay7_set_management_rights($1,$2,$3,$4)',[site,id(2),[],false]);
 await as(2);check('opt-out effective server-side',!await q('select ay2_private.management_read($1)',[site]));
 check('opt-out removes foreign claims',(await q('select public.ay5_workspace($1)',[site])).charges.length===0);
 await as(1);await q('select public.ay3_set_task_grants($1,$2,$3)',[site,id(2),[]]);await as(2);check('old setter preserves opt-out',!await q('select ay2_private.management_read($1)',[site]));
 await as(1);await q('select public.ay7_set_management_rights($1,$2,$3,$4)',[site,id(2),[],true]);await as(2);check('re-enable effective',await q('select ay2_private.management_read($1)',[site]));
 await db.exec(`reset role;insert into auth.users(id,email) values('${id(4)}','new-manager@example.invalid');insert into public.site_staff_memberships(site_id,user_id,role) values('${site}','${id(4)}','auditor');`);await as(4);check('new management without grant defaults on',await q('select ay2_private.management_read($1)',[site]));
 await as(3);check('resident cannot read site overview',!await q('select ay2_private.management_read($1)',[site]));check('helper leaks no data to resident',JSON.stringify(await q('select ay2_private.management_overview($1)',[site]))==='{}');
 await db.exec('reset role;set role anon');await assert.rejects(()=>q('select public.ay7_set_management_rights($1,$2,$3,$4)',[site,id(2),[],true]),{code:'42501'});passed++;
 await as(2);check('other site denied',!await q('select ay2_private.management_read($1)',[id(99)]));
 console.log(JSON.stringify({passed,failed:0}));
}finally{await db.close();}
