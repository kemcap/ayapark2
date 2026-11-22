import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullDemo,withLedgerIndex} from '../ledger.mjs';
import {chargeDetail,unitDetailV3} from '../v3-ui.mjs';
import {buildV3Form,payloadV3} from '../v3-forms.mjs';
import {setLanguage} from '../i18n.mjs';

function fixture(role='super'){
 setLanguage('tr');
 const d=fullDemo();d.role=role;d.v5=true;
 d.units=[{id:'A5',code:'A-5',block:'A',number:5}];
 d.persons=[{id:'ferrah',full_name:'Ferrah Apalak'},{id:'akif',full_name:'Ahmet Akif Apalak'}];
 d.links=[
  {id:'ferrah-link',unit_id:'A5',person_id:'ferrah',role:'tenant',active:true,starts_on:'2026-01-01'},
  {id:'akif-link',unit_id:'A5',person_id:'akif',role:'tenant',active:true,starts_on:'2026-01-01'}
 ];
 d.charges=[
  {id:'nov',unit_id:'A5',person_id:'ferrah',link_id:'ferrah-link',category:'Aidat',label:'Kasım aidatı',reference:'monthly:test',due_on:'2026-11-01',cents:360000},
  {id:'old',unit_id:'A5',person_id:'akif',link_id:'akif-link',category:'Aidat',label:'Eski aidat',reference:'staged:test',due_on:'2026-10-09',cents:720000},
  {id:'none',unit_id:'A5',person_id:null,link_id:null,category:'Havuz',label:'Açık kayıt',reference:'devir-unassigned',due_on:'2026-10-09',cents:1000}
 ];
 d.allocations=[];d.transactions=[];d.credits=[];d.ownIds=['A5'];d.ownPersonIds=['ferrah'];
 d.capabilities=role==='resident'?{admin:false,finance:false,people:false}:{admin:true,finance:true,people:true};
 return {d,s:{mode:'demo',data:d,period:'2026-11',page:'units'}};
}

test('the apartment charge has a visible change-debtor action while unassigned charges retain bind_charge',()=>{
 const {d,s}=fixture();
 const before=JSON.stringify({charges:d.charges,allocations:d.allocations});
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.equal((html.match(/data-action="reassign_charge"/g)||[]).length,2);
 assert.match(html,/Sorumluyu değiştir/);
 assert.match(html,/data-action="bind_charge"/);
 assert.match(chargeDetail(s,'nov'),/data-action="reassign_charge" data-id="nov"/);
 assert.equal(JSON.stringify({charges:d.charges,allocations:d.allocations}),before);
});

test('the correction form selects a different person and requires a rationale and explicit confirmation',()=>{
 const {s}=fixture();const built=buildV3Form(s,'reassign_charge',{id:'nov'});
 assert.match(built.title,/Borç sorumlusunu değiştir/);
 assert.match(built.body,/Ferrah Apalak/);
 assert.match(built.body,/Ahmet Akif Apalak/);
 assert.match(built.body,/name="reason"/);
 assert.match(built.body,/name="confirmation"/);
 assert.match(built.body,/Dairenin toplam|dairenin toplam|dairenin toplam borcu/i);
 const form=new FormData();form.set('link_id','akif-link');form.set('reason','Yanlış kişi kaydı düzeltildi');form.set('confirmation','on');
 const payload=payloadV3('reassign_charge',form,built.context);
 assert.deepEqual(payload,{charge_id:'nov',expected_person_id:'ferrah',expected_link_id:'ferrah-link',link_id:'akif-link',reason:'Yanlış kişi kaydı düzeltildi',confirmation:true});
 form.delete('confirmation');
 assert.throws(()=>payloadV3('reassign_charge',form,built.context));
 form.set('confirmation','on');form.set('reason','x');
 assert.throws(()=>payloadV3('reassign_charge',form,built.context));
 form.set('reason','Yanlış sorumlu düzeltmesi');form.set('link_id','ferrah-link');
 assert.throws(()=>payloadV3('reassign_charge',form,built.context));
});

test('a paid charge cannot be reassigned before its existing allocations are corrected',()=>{
 const {d,s}=fixture();d.allocations.push({id:'a1',charge_id:'nov',entry_id:'bank1',cents:150000});
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.match(html,/Önce Ödemeler bölümündeki mahsupları düzeltin/);
 assert.doesNotMatch(html,/data-action="reassign_charge" data-id="nov"/);
 assert.throws(()=>buildV3Form(s,'reassign_charge',{id:'nov'}));
});

test('a resident cannot see the charge debtor correction button',()=>{
 const {d,s}=fixture('resident');
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.doesNotMatch(html,/data-action="reassign_charge"/);
 assert.doesNotMatch(chargeDetail(s,'nov'),/reassign_charge/);
});

test('the dedicated RPC includes admin authorization, stale-state protection, no paid allocations and an audit entry',()=>{
 const sql=readFileSync(new URL('../database/ay3_reassign_charge_guarded_audit.sql',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api.mjs',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(sql,/ay2_private\.can\(s,'admin'\)/);
 assert.match(sql,/for update/i);
 assert.match(sql,/is distinct from v_expected_person/);
 assert.match(sql,/is distinct from v_expected_link/);
 assert.match(sql,/a\.void_reason is null/);
 assert.match(sql,/insert into public\.ay2_audit/);
 assert.match(sql,/set person_id=v_link\.person_id,link_id=v_link\.id/);
 assert.doesNotMatch(sql,/update public\.ay2_allocations/i);
 assert.match(sql,/revoke all on function public\.ay3_reassign_charge\(uuid,jsonb\) from public,anon/i);
 assert.match(api,/if\(action==='reassign_charge'\)return this\.rpc\('ay3_reassign_charge'/);
 assert.match(app,/reassign_charge','budget/);
});
