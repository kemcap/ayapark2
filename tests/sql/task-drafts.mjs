import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),s='20000000-0000-0000-0000-000000000001',u=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');let passed=0;
const q=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const check=(name,value)=>{assert(value,name);passed++;};
const as=async n=>{await db.exec('reset role;set role authenticated');await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:u(n),role:'authenticated'})]);};
const deny=async f=>{await assert.rejects(f,{code:'42501'});passed++;};
try{
 for(const f of ['schema.sql','../../supabase/migrations/20261025073340_v4_finance_release_safety.sql','../../supabase/migrations/20261025194333_v5_notifications_finance.sql','../../supabase/migrations/20261029214410_phase2_task_grants_charge_drafts.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec(`insert into public.site_staff_memberships(site_id,user_id,role) values('${s}','${u(2)}','deputy');`);
 const tasks=['people_manage','occupancy_invite','charges_prepare','bank_reconcile','announcements_publish'];
 for(const task of tasks){
 await as(1);await q('select public.ay3_set_task_grants($1,$2,$3)',[s,u(2),[task]]);await as(2);
 for(const candidate of tasks)check('independent '+task+' '+candidate,await q('select ay2_private.can_task($1,$2)',[s,candidate])===(candidate===task));
 check('no legacy admin escalation',!await q("select ay2_private.can($1,'admin')",[s]));
 }
 await deny(()=>q('select public.ay3_set_task_grants($1,$2,$3)',[s,u(2),tasks]));
 await as(1);await q('select public.ay3_set_task_grants($1,$2,$3)',[s,u(2),['charges_prepare']]);await as(2);
 const submit=(request,p={})=>q('select public.ay3_submit_charge_draft($1,$2,$3,$4)',[s,request,'batch_charge',p]);
 const draft=await submit(u(40));check('stable draft id',draft===await submit(u(40)));
 check('no financial effects',await q('select count(*)::int from public.ay2_charges')===0);
 await deny(()=>q('select public.ay3_decide_charge_draft($1,$2,true)',[s,draft]));
 await as(1);
 await assert.rejects(()=>q('select public.ay3_decide_charge_draft($1,$2,true)',[s,draft]));passed++;
 check('failed approval remains pending',await q('select status from public.ay3_charge_drafts where id=$1',[draft])==='pending');
 const rejected=await q('select public.ay3_decide_charge_draft($1,$2,false)',[s,draft]);check('rejected without booking',rejected.rejected===true);
 check('rejection retry stable',(await q('select public.ay3_decide_charge_draft($1,$2,false)',[s,draft])).rejected===true);
 await assert.rejects(()=>q('select public.ay3_decide_charge_draft($1,$2,true)',[s,draft]));passed++;
 await db.exec(`reset role;
 insert into public.site_blocks(id,site_id,code) values('${u(50)}','${s}','A');
 insert into public.site_units(id,site_id,block_id,number,code) values('${u(51)}','${s}','${u(50)}',1,'A-1');
 insert into public.ay3_persons(id,site_id,full_name) values('${u(52)}','${s}','Synthetic owner');
 insert into public.ay3_links(id,site_id,unit_id,person_id,role) values('${u(53)}','${s}','${u(51)}','${u(52)}','owner');`);
 await as(2);
 const valid=await submit(u(44),{scope:'selected',unit_ids:[u(51)],distribution:'per_unit',cents:1000,due_on:'2026-11-01',label:'Synthetic draft',category:'Genel Gider / İşletme',debt_group:'general',basis_ref:'QA resolution',debtors:{[u(51)]:u(53)},expected:{[u(51)]:1000}});
 check('valid draft still creates no charge',await q('select count(*)::int from public.ay2_charges')===0);
 await as(1);
 const booked=await q('select public.ay3_decide_charge_draft($1,$2,true)',[s,valid]);
 check('approval books exact amount',booked.charges.length===1&&booked.charges[0].cents===1000);
 await q('select public.ay3_decide_charge_draft($1,$2,true)',[s,valid]);
 check('approval retry cannot double book',await q('select count(*)::int from public.ay2_charges')===1);
 await as(3);check('resident cannot read drafts',await q('select count(*)::int from public.ay3_charge_drafts')===0);
 await deny(()=>submit(u(41)));
 await db.exec('reset role;set role anon');await deny(()=>submit(u(42)));
 console.log(JSON.stringify({passed,failed:0,scope:'isolated task-grant and draft foundation; booking tested; legacy route and UI integration still pending'}));
}finally{await db.close();}
