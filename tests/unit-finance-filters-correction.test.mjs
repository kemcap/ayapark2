import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullDemo,withLedgerIndex} from '../ledger.mjs';
import {unitDetailV3} from '../v3-ui.mjs';
import {buildLegacyForm,payloadLegacy} from '../forms.mjs';
import {setLanguage} from '../i18n.mjs';
import {matchesUnitClaimFilter,filteredUnitClaimTotals} from '../unit-claim-filters.mjs';

function fixture(role='super'){
 const d=fullDemo();d.v5=true;d.role=role;d.units=[{id:'A5',code:'A-5',block:'A',number:5,occupancy_status:'occupied'}];
 d.persons=[{id:'p1',full_name:'Example tenant'},{id:'p2',full_name:'Example owner'}];
 d.links=[{id:'t',unit_id:'A5',person_id:'p1',role:'tenant',active:true},{id:'o',unit_id:'A5',person_id:'p2',role:'owner',active:true}];
 d.charges=[
  {id:'c1',unit_id:'A5',person_id:'p1',link_id:'t',label:'Dues',category:'Aidat',cents:720000,due_on:'2026-10-01',reference:'devir-test'},
  {id:'c2',unit_id:'A5',person_id:'p2',link_id:'o',label:'Pool',category:'Havuz',cents:380000,due_on:'2026-10-02'},
  {id:'c3',unit_id:'A5',person_id:null,label:'Unassigned',category:'Asansör',cents:38000,due_on:'2026-10-03'}
 ];d.allocations=[
  {id:'match1',entry_id:'bank1',charge_id:'c1',cents:200000,created_at:'2026-11-01'},
  {id:'match2',entry_id:'bank1',charge_id:'c2',cents:100000,created_at:'2026-11-01'}
 ];d.transactions=[{id:'bank1',date:'2026-11-01',cents:300000,desc:'Shared bank receipt',sender_name:'Example bank sender'}];
 d.credits=[];d.devirSnapshot=[];d.ownIds=['A5'];d.ownPersonIds=['p1'];d.capabilities=role==='resident'?{finance:false,admin:false,people:false}:undefined;
 return {s:{mode:'demo',data:d,page:'units',period:'2026-11'},d};
}

test('the unit finance view exposes person/role filters without changing underlying balances',()=>{
 setLanguage('tr');const {s,d}=fixture();
 const snapshot=JSON.stringify({charges:d.charges,allocations:d.allocations});
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.match(html,/data-unit-claim-filter="role"/);
 assert.match(html,/data-unit-claim-filter="person"/);
 assert.match(html,/data-unit-claim-person="p1" data-unit-claim-role="tenant"/);
 assert.match(html,/data-unit-claim-person="p2" data-unit-claim-role="owner"/);
 assert.match(html,/data-unit-claim-person="unassigned" data-unit-claim-role="unassigned"/);
 assert.match(html,/data-unit-claim-subtotal/);
 assert.match(html,/data-unit-claim-empty hidden/);
 assert.equal(JSON.stringify({charges:d.charges,allocations:d.allocations}),snapshot);
});

test('filters compute open amount from matching claims only and do not count settled items',()=>{
 const input=[
  {role:'tenant',person:'p1',open:true,cents:520000},
  {role:'owner',person:'p2',open:true,cents:280000},
  {role:'unassigned',person:'unassigned',open:true,cents:38000},
  {role:'tenant',person:'p1',open:false,cents:0}
 ];
 assert.equal(filteredUnitClaimTotals(input).cents,838000);
 assert.equal(filteredUnitClaimTotals(input,{role:'tenant'}).cents,520000);
 assert.equal(filteredUnitClaimTotals(input,{person:'p1'}).count,1);
 assert.equal(filteredUnitClaimTotals(input,{role:'unassigned'}).cents,38000);
 assert.equal(filteredUnitClaimTotals(input,{role:'owner',person:'p1'}).cents,0);
 assert.equal(matchesUnitClaimFilter(input[2],{role:'unassigned',person:'unassigned'}),true);
});

test('each match in a split bank receipt has an independent correction button for superadmin',()=>{
 setLanguage('tr');const {s,d}=fixture();
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.equal((html.match(/class="ay-allocation-correct"/g)||[]).length,0); // Includes button primary classes, not an exact class.
 assert.equal((html.match(/data-action="unallocate"/g)||[]).length,2);
 assert.match(html,/data-id="match1" data-entry="bank1" data-unit="A5"/);
 assert.match(html,/data-id="match2" data-entry="bank1" data-unit="A5"/);
 assert.equal((html.match(/class="uf-payment"/g)||[]).length,1);
 assert.match(html,/Eşleştirmeyi düzelt/);
});
test('residents see payment allocations but no administrative correction controls',()=>{
 setLanguage('tr');const {s,d}=fixture('resident');
 const html=withLedgerIndex(d,()=>unitDetailV3(s,'A5'));
 assert.doesNotMatch(html,/data-action="unallocate"/);
 assert.doesNotMatch(html,/Shared bank receipt/);
});

test('a correction requires a reason and confirmation and never edits the bank receipt',()=>{
 setLanguage('tr');const {s}=fixture();
 const form=buildLegacyForm(s,'unallocate',{id:'match1',unit:'A5',entry:'bank1'});
 assert.match(form.body,/Dues/);
 assert.match(form.body,/Mevcut eşleştirme/);
 assert.match(form.body,/name="reason"/);
 assert.throws(()=>payloadLegacy('unallocate',new FormData(),form.context));
 const values=new FormData();values.set('reason','Yanlış dönem');values.set('confirmation','on');
 const payload=payloadLegacy('unallocate',values,form.context);
 assert.equal(payload.id,'match1');
 assert.equal(payload.reason,'Yanlış dönem');
 assert.equal(payload.unit,undefined);
 assert.equal(payload.entry,undefined);
 assert.equal(payload.cents,undefined);
 // The entry becomes available only after the confirmed allocation has been voided.
 s.data.allocations.find(a=>a.id==='match1').void_reason='Test correction';
 const reassign=buildLegacyForm(s,'allocate',{entry:'bank1',unit:'A5',amount:'20,00',correction_unit:'A5'});
 assert.match(reassign.body,/value="bank1" selected/);
 assert.match(reassign.body,/value="20,00"/);
 assert.match(reassign.body,/value="c1"/);
 assert.doesNotMatch(reassign.body,/A-6/);
});
test('UI hooks preserve the two-step correction with an explicit second booking',()=>{
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(app,/applyUnitClaimFilters/);
 assert.match(app,/action==='unallocate'&&formAction.args.unit/);
 assert.match(app,/showForm\('allocate',\{entry:correction.entry,unit:correction.unit/);
 assert.match(app,/correction_unit/);
});
