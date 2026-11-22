import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullDemo,withLedgerIndex} from '../ledger.mjs';
import {unitDetailV3,unitMapV3} from '../v3-ui.mjs';
import {setLanguage} from '../i18n.mjs';
import {money} from '../core.mjs';

function a5(role='super'){
 const d=fullDemo();d.role=role;d.v5=true;
 const u={id:'A5-demo',code:'A-5',block:'A',number:5,occupancy_status:'occupied'};
 d.units=[u];d.persons=[{id:'tenant-a5',full_name:'Kayıtlı kiracı',unit_roles:[{unit_id:u.id,role:'tenant'}]}];
 d.links=[{id:'tenant-a5-link',unit_id:u.id,person_id:'tenant-a5',role:'tenant',active:true,starts_on:'2026-01-01'}];
 d.charges=[
  {id:'a5-legacy-aidat',unit_id:u.id,person_id:null,link_id:null,category:'Aidat',label:'Devir aidat',reference:'devir-a5-aidat',payer:'review',due_on:'2026-10-09',cents:720000},
  {id:'a5-legacy-pool',unit_id:u.id,person_id:null,link_id:null,category:'Havuz',label:'Devir havuz',reference:'devir-a5-pool',payer:'review',due_on:'2026-10-09',cents:380000},
  {id:'a5-legacy-lift',unit_id:u.id,person_id:null,link_id:null,category:'Asansör',label:'Devir asansör',reference:'devir-a5-lift',payer:'review',due_on:'2026-10-09',cents:38000},
  {id:'a5-nov',unit_id:u.id,person_id:'tenant-a5',link_id:'tenant-a5-link',category:'Aidat',label:'Kasım aidatı',payer:'tenant',due_on:'2026-11-01',cents:360000}
 ];
 d.allocations=[];d.transactions=[];d.credits=[];d.staged=[];
 d.devirSnapshot=[{unit_id:u.id,source_date:'2026-10-09',total_cents:1138000,categories:{Aidat:720000,Havuz:380000,Asansör:38000}}];
 d.ownIds=[u.id];d.ownPersonIds=['tenant-a5'];
 return {d,u,s:{data:d,mode:'demo',page:'units',period:'2026-11',filter:{q:'',block:'all',status:'all'}}};
}

test('A5 finance preserves real-world example math and three tabs without writing bookings',()=>{
 setLanguage('tr');
 const {d,u,s}=a5();
 const before=JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits});
 const html=withLedgerIndex(d,()=>unitDetailV3(s,u.id));
 assert.match(html,/data-unit-finance-panel="debts"/);
 assert.match(html,/data-unit-finance-panel="payments"[^>]*hidden/);
 assert.match(html,/data-unit-finance-panel="history"[^>]*hidden/);
 assert.match(html,/Dairede kayıtlı toplam açık alacak/);
 assert.match(html,/Güncel kişilere bağlı/);
 assert.match(html,/Sorumlusu doğrulanacak/);
 assert.match(html,/Sorumlu kişi belirlenmemiş/);
 assert(html.includes(money(1498000)),'total includes current + unassigned legacy charges');
 assert(html.includes(money(1138000)),'review subtotal is present');
 assert(html.includes(money(360000)),'current tenant subtotal is present');
 assert.equal((html.match(/class="ay-finance-claim"/g)||[]).length,4);
 assert((html.match(/data-action="bind_charge"/g)||[]).length>=3);
 assert.match(html,/Orijinal borçları/); // Original source breakdown accessible
 assert.match(html,/class="uf-legacy"/);
 assert.match(html,/data-go-finance-view="debts"/);
 assert.equal(JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits}),before);
 const tile=withLedgerIndex(d,()=>unitMapV3(s,[u]));
 assert.match(tile,/Dairede kayıtlı toplam açık alacak/);
 assert(tile.includes(money(1498000)),'unit tile shows full apartment total');
});

test('resident cannot see archived claims or sensitive finance admin actions',()=>{
 setLanguage('tr');
 const {d,u,s}=a5('resident');
 d.persons.push({id:'old-owner',full_name:'Geçmiş kişi'});
 d.links.push({id:'old-owner-link',unit_id:u.id,person_id:'old-owner',role:'owner',active:false,ends_on:'2026-01-01',archived_at:'2026-01-01T00:00:00Z'});
 d.charges.push({id:'old-person-debt',unit_id:u.id,person_id:'old-owner',link_id:'old-owner-link',category:'Aidat',label:'Eski malik özel borcu',cents:250000,due_on:'2025-06-01'});
 d.capabilities={finance:false,people:false,admin:false};
 const html=withLedgerIndex(d,()=>unitDetailV3(s,u.id));
 assert.doesNotMatch(html,/Geçmiş kişi/);
 assert.doesNotMatch(html,/Eski malik özel borcu/);
 assert.doesNotMatch(html,/data-action="bind_charge"/);
 assert.doesNotMatch(html,/data-action="auto_allocate"/);
 assert.doesNotMatch(html,/data-tab="history"/);
});

test('nested finance tabs support click, keyboard and direct review jumping',()=>{
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../unit-finance.css',import.meta.url),'utf8');
 assert.match(app,/function selectUnitFinanceView/);
 assert.match(app,/data-go-finance-view/);
 assert.match(app,/data-unit-finance-view/);
 assert.match(app,/ArrowLeft/);
 assert.match(css,/\.ay-finance-view\[hidden\]\{display:none!important\}/);
});
