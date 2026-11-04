import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,withLedgerIndex} from '../ledger.mjs?v=perf1';
import {setLanguage} from '../i18n.mjs?v=5.10.0';
import {unitDetailV3,unitMapV3} from '../v3-ui.mjs?v=20261104-apartment-ux';

function fixture(role='super'){
 const d=fullDemo(),unit=d.units[0];
 d.role=role;
 d.persons=[...(d.persons||[]),{id:'owner-current-test',full_name:'Ertan Tomaç'},{id:'owner-old-test',full_name:'Erkan Akgün'}];
 d.links=[...(d.links||[]).filter(l=>l.unit_id!==unit.id),
  {id:'owner-old-link',person_id:'owner-old-test',unit_id:unit.id,role:'owner',active:false,starts_on:'2025-03-01',ends_on:null,archive_reason:'historical_import'},
  {id:'owner-current-link',person_id:'owner-current-test',unit_id:unit.id,role:'owner',active:true,starts_on:'2026-04-15'}
 ];
 d.charges=d.charges.filter(c=>c.unit_id!==unit.id).concat([
  {id:'owner-old-charge',unit_id:unit.id,person_id:'owner-old-test',link_id:'owner-old-link',label:'Historic fee',category:'Aidat',cents:240000,due_on:'2025-12-01'},
  {id:'owner-current-charge',unit_id:unit.id,person_id:'owner-current-test',link_id:'owner-current-link',label:'Current fee',category:'Aidat',cents:120000,due_on:'2026-07-01'}
 ]);
 d.allocations=d.allocations||[];d.transactions=d.transactions||[];d.credits=d.credits||[];
 return {s:{mode:'demo',data:d,filter:{q:'',block:'all',status:'all'}},unit};
}
test('detail uses accessible four-tab layout and separates former ownership and charges',()=>{
 setLanguage('de');const {s,unit}=fixture();
 const html=withLedgerIndex(s.data,()=>unitDetailV3(s,unit.id));
 for(const tab of ['overview','people','finances','history'])assert.match(html,new RegExp('data-tab="'+tab+'"'));
 assert.match(html,/id="unitCurrent"/);assert.match(html,/id="unitPeople"/);assert.match(html,/id="unitFinances"/);assert.match(html,/id="unitHistory"/);
 assert.match(html,/data-unit-panel="history" hidden/);
 assert.match(html,/Ertan Tomaç/);assert.match(html,/Erkan Akgün/);
 assert.match(html,/owner_history_reconcile/);
 assert.match(html,/Historische Forderungen/);
 assert.match(html,/data-go-unit-tab="finances"/);
});
test('resident view avoids former owner names and former owner debt details',()=>{
 setLanguage('de');const {s,unit}=fixture('resident');
 s.data.ownIds=[unit.id];s.data.ownPersonIds=['owner-current-test'];
 s.data.capabilities={finance:false,people:false,admin:false};
 const html=withLedgerIndex(s.data,()=>unitDetailV3(s,unit.id));
 assert.doesNotMatch(html,/Erkan Akgün/);
 assert.doesNotMatch(html,/2\.400,00/);
 assert.doesNotMatch(html,/owner-old-charge/);
 assert.match(html,/data-unit-panel="overview"/);
});
test('compact tile no longer renders per-person financial amounts or every role by default',()=>{
 setLanguage('tr');const {s,unit}=fixture();
 const html=withLedgerIndex(s.data,()=>unitMapV3(s,[unit]));
 assert.match(html,/ay-unit-compact-card/);
 assert.match(html,/Ertan Tomaç/);
 assert.match(html,/Eski kişiler/);
 assert.doesNotMatch(html,/person-open-amount/);
});
