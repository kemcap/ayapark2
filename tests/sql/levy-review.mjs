// Candidate review layer only. No live schema and no alternative booking path.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadCurrentSchema} from './current-schema.mjs';
const db=new PGlite(),site='20000000-0000-0000-0000-000000000001',u=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');let passed=0;
const q=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const check=(name,value)=>{assert(value,name);passed++;};
const as=async n=>db.exec("reset role;set role authenticated;select set_config('request.jwt.claims','"+JSON.stringify({sub:u(n),role:'authenticated'})+"',false)");
const rejected=async(fn,key)=>{await assert.rejects(fn,e=>!key||e.message.includes(key));passed++;};
const view=()=>q('select public.ay3_owner_levy_previews($1)',[site]);
try{
 await loadCurrentSchema(db,{levyReview:false});await db.exec(await readFile(new URL('../../supabase/levy-review.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${u(4)}','qa-owner-two@example.invalid'),('${u(5)}','qa-tenant@example.invalid');
 insert into public.site_staff_memberships(site_id,user_id,role) values('${site}','${u(2)}','deputy');
 insert into public.site_blocks(id,site_id,code) values('${u(200)}','${site}','A');
 insert into public.site_units(id,site_id,block_id,number,code) values('${u(201)}','${site}','${u(200)}',1,'A-1'),('${u(202)}','${site}','${u(200)}',2,'A-2');
 insert into public.ay3_persons(id,site_id,full_name,auth_user_id) values('${u(203)}','${site}','PRIVATE OWNER ONE','${u(3)}'),('${u(204)}','${site}','PRIVATE OWNER TWO','${u(4)}'),('${u(205)}','${site}','PRIVATE TENANT','${u(5)}'),('${u(206)}','${site}','PRIVATE HISTORICAL OWNER',null);
 insert into public.ay3_links(id,site_id,unit_id,person_id,role,active,starts_on,ends_on) values
 ('${u(213)}','${site}','${u(201)}','${u(203)}','owner',true,'2026-01-01',null),
 ('${u(214)}','${site}','${u(202)}','${u(204)}','owner',true,'2020-01-01',null),
 ('${u(215)}','${site}','${u(201)}','${u(205)}','tenant',true,'2020-01-01',null),
 ('${u(216)}','${site}','${u(201)}','${u(206)}','owner',false,'2020-01-01','2025-12-31');
 insert into public.site_resident_units(user_id,unit_id,role,active) values('${u(3)}','${u(201)}','owner',true),('${u(4)}','${u(202)}','owner',true),('${u(5)}','${u(201)}','tenant',true);`);
 await as(1);await q('select public.ay3_set_task_grants($1,$2,$3)',[site,u(2),['charges_prepare']]);await as(2);
 const payload={scope:'selected',unit_ids:[u(201),u(202)],distribution:'shares',weights:{[u(201)]:1,[u(202)]:2},cents:3000,due_on:'2026-11-01',label:'PRIVATE INTERNAL LABEL',category:'Demirbaş',debt_group:'capital',basis_ref:'PRIVATE ORIGINAL REFERENCE',debtors:{[u(201)]:u(216),[u(202)]:u(214)},expected:{[u(201)]:1000,[u(202)]:2000}};
 const draft=await q('select public.ay3_submit_charge_draft($1,$2,$3,$4)',[site,u(100),'batch_charge',payload]);
 const share=(id=u(101),title='Synthetic building work',confirm=true)=>q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,$6)',[site,draft,id,title,'Synthetic explanation approved for the affected owners.',confirm]);
 const document=(id,date='2025-06-01',ref='PRIVATE signed decision reference',checked=true)=>q('select public.ay3_document_levy_review($1,$2,$3,$4,$5,$6,$6,$6)',[site,id,'2025-05-01',ref,date,checked]);
 await rejected(()=>share(),'access denied');await as(3);check('unshared draft invisible to owner',(await view()).length===0);await as(1);
 await rejected(()=>share(u(101),'Synthetic building work',false),'confirmation');const review=await share();check('same sharing request idempotent',await share()===review);
 await rejected(()=>share(u(101),'Changed public title'),'conflict');check('review creates no financial charge',await q('select count(*)::int from public.ay2_charges')===0);
 await as(3);const own=await view();check('current owner sees only affected own apartment',own.length===1&&own[0].unit_code==='A-1'&&own[0].proposed_cents===1000);check('proposal explicitly is not a booked charge',own[0].is_charge===false);
 check('owner projection omits private identity, snapshot and evidence',!JSON.stringify(own).includes('PRIVATE')&&!Object.keys(own[0]).includes('draft_snapshot'));
 check('owner cannot read raw review table',await q('select count(*)::int from public.ay3_levy_reviews')===0);await rejected(()=>document(review),'access denied');
 await as(4);check('second owner receives own different share only',(await view()).length===1&&(await view())[0].proposed_cents===2000);
 await as(5);check('tenant cannot inherit owner proposal access',(await view()).length===0);
 await as(1);await rejected(()=>document(review,'2025-06-01','PRIVATE reference',false),'confirmation');await rejected(()=>document(review,'2026-06-01'),'historical responsibility');
 await document(review);check('historical responsibility documented without changing current owner',await q('select status from public.ay3_levy_reviews where id=$1',[review])==='documented'&&await q('select active from public.ay3_links where id=$1',[u(216)])===false);
 await document(review);check('identical documentation does not duplicate audit',await q("select count(*)::int from public.ay2_audit where action='levy_review_documented'")===1);
 await rejected(()=>document(review,'2025-06-01','Different evidence'),'immutable documentation');
 await as(3);check('private evidence stays absent after documentation',!JSON.stringify(await view()).includes('PRIVATE'));
 await db.exec('reset role');await db.query("update public.ay3_charge_drafts set payload=jsonb_set(payload,'{label}','\"changed draft\"') where id=$1",[draft]);await as(3);
 check('changed draft immediately hides stale shared review',(await view()).length===0);await as(1);await rejected(()=>document(review),'draft changed');
 await rejected(()=>q('select public.ay3_withdraw_levy_review($1,$2,$3)',[site,review,'short']),'reason');await q('select public.ay3_withdraw_levy_review($1,$2,$3)',[site,review,'Synthetic draft changed; new review needed']);
 check('withdrawal preserves original snapshot',(await q('select draft_snapshot from public.ay3_levy_reviews where id=$1',[review])).label==='PRIVATE INTERNAL LABEL');
 await as(3);check('withdrawn review absent',(await view()).length===0);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claims','{}',false)");await rejected(()=>view());await rejected(()=>share(u(102)));
 await db.exec('reset role');check('entire review flow leaves ledger empty',await q('select count(*)::int from public.ay2_charges')===0);check('original draft remains pending',await q('select status from public.ay3_charge_drafts where id=$1',[draft])==='pending');

 await as(1);
 const submit=(id,p=payload)=>q('select public.ay3_submit_charge_draft($1,$2,$3,$4)',[site,id,'batch_charge',p]);
 const decide=(id,approve=true)=>q('select public.ay3_decide_charge_draft($1,$2,$3)',[site,id,approve]);
 const direct=p=>q('select public.ay5_command($1,$2,$3)',[site,'batch_charge',p]);
 const finalDraft=await submit(u(120));
 await rejected(()=>decide(finalDraft),'documented approval');check('failed approval remains pending',await q('select status from public.ay3_charge_drafts where id=$1',[finalDraft])==='pending');
 const finalReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,finalDraft,u(121),'Synthetic final proposal','Synthetic public description without personal data']);
 await rejected(()=>decide(finalDraft),'documented approval');await document(finalReview);
 await rejected(()=>direct({...payload,request_id:finalDraft,confirmed:true}),'use documented draft');
 await rejected(()=>q('select ay2_private.ay5_command_review_core($1,$2,$3)',[site,'batch_charge',{...payload,request_id:finalDraft,confirmed:true}]));
 const booked=await decide(finalDraft);check('approved levy uses existing exact weighted allocation',booked.charges.length===2&&booked.charges.find(c=>c.unit_id===u(201)).cents===1000&&booked.charges.find(c=>c.unit_id===u(202)).cents===2000);
 const historicalCharge=await q('select to_jsonb(c) from public.ay2_charges c where id=$1',[booked.charges.find(c=>c.unit_id===u(201)).id]);
 check('historical debtor retained instead of current owner',historicalCharge.person_id===u(206)&&historicalCharge.link_id===u(216));
 check('charge retains review reference and liability date',historicalCharge.distribution_basis.levy_review_id===finalReview&&historicalCharge.distribution_basis.liability_on==='2025-06-01');
 check('approval retry stable and no duplicate charge',JSON.stringify(await decide(finalDraft))===JSON.stringify(booked)&&await q('select count(*)::int from public.ay2_charges')===2);
 await rejected(()=>decide(finalDraft,false),'conflict');await rejected(()=>q('select public.ay3_withdraw_levy_review($1,$2,$3)',[site,finalReview,'Synthetic withdrawal after booking']),'booked evidence');
 await as(3);check('booked draft is no longer shown as preliminary',(await view()).length===0);
 await as(2);await rejected(()=>decide(finalDraft),'Access denied');await rejected(()=>direct({debt_group:'capital'}),'Superadmin');
 await as(1);
 const changed=await submit(u(130));const changedReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,changed,u(131),'Synthetic changing proposal','Synthetic public description approved for review']);await document(changedReview);
 await db.exec('reset role');await db.query("update public.ay3_charge_drafts set payload=jsonb_set(payload,'{cents}','4000') where id=$1",[changed]);await as(1);await rejected(()=>decide(changed),'documented approval');
 check('stale review cannot cause partial booking',await q('select count(*)::int from public.ay2_charges')===2);
 const wrong=await submit(u(140),{...payload,expected:{[u(201)]:1001,[u(202)]:1999}});const wrongReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,wrong,u(141),'Synthetic mismatch proposal','Synthetic public description approved for review']);await document(wrongReview);await rejected(()=>decide(wrong),'Önizleme');
 check('distribution mismatch rolls back operation and all charges',await q('select count(*)::int from public.ay2_charges')===2&&await q('select count(*)::int from public.ay5_operations where request_id=$1',[wrong])===0);
 await db.exec('reset role');await db.query("insert into public.ay2_settings(site_id,opening_cents,opening_date,initialized) values($1,0,'2025-01-01',true)",[site]);await as(1);
 const closing=await q('select public.ay3_closing_preview($1,$2,$3)',[site,'month','2025-12-01']);await q('select public.ay3_finalize_period($1,$2,$3,$4,$5,0,$6,true,true,$7)',[site,'month','2025-12-01',u(150),closing.fingerprint,'Synthetic verified bank statement','']);
 const locked=await submit(u(151),{...payload,due_on:'2025-11-01'});const lockedReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,locked,u(152),'Synthetic closed period proposal','Synthetic public description approved for review']);await document(lockedReview);await rejected(()=>decide(locked),'period locked');
 check('closed period rejection leaves no operation or charge',await q('select count(*)::int from public.ay2_charges')===2&&await q('select count(*)::int from public.ay5_operations where request_id=$1',[locked])===0);
 const rejectedDraft=await submit(u(160));check('rejecting undocumented levy remains possible',(await decide(rejectedDraft,false)).rejected===true);

 const subsetPayload={...payload,unit_ids:[u(201)],distribution:'per_unit',cents:1000,expected:{[u(201)]:1000},debtors:{[u(201)]:u(216),[u(202)]:''}};
 const subset=await submit(u(170),subsetPayload);const subsetReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,subset,u(171),'Synthetic selected apartment','Synthetic explanation for only the selected apartment']);await document(subsetReview);check('unselected empty debtor fields cannot block selected historical levy',(await decide(subset)).charges.length===1);
 const scopeMismatch=await submit(u(180),{...payload,unit_ids:[u(201)]});await rejected(()=>q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,scopeMismatch,u(181),'Synthetic scope mismatch','Synthetic scope mismatch cannot disclose foreign targets']),'target mismatch');
 const recheck=await submit(u(190),subsetPayload);const recheckReview=await q('select public.ay3_share_levy_review($1,$2,$3,$4,$5,true)',[site,recheck,u(191),'Synthetic period recheck','Synthetic historical relationship period must still match']);await document(recheckReview);
 await db.exec('reset role');await db.query("update public.ay3_links set ends_on='2025-01-01' where id=$1",[u(216)]);await as(1);await rejected(()=>decide(recheck),'sorumlu');check('changed relationship after evidence review cannot book',await q('select count(*)::int from public.ay2_charges')===3);
 await rejected(()=>q('select public.ay3_levy_review_workspace($1)',[u(999)]),'access denied');
 check('authenticated has no direct review update privilege',await q("select has_table_privilege('authenticated','public.ay3_levy_reviews','update')")===false);
 console.log(JSON.stringify({passed,failed:0,scope:'synthetic scoped owner review, historical responsibility, guarded atomic finalization, bypass rejection, closed periods and audit'}));
}catch(e){console.error(e.message);console.log(JSON.stringify({passed,failed:1}));process.exitCode=1;}finally{await db.close();}
