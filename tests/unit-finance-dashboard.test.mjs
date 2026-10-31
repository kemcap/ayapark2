import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {unitDetailV3} from '../v3-ui.mjs?v=5.9.50';
import {setLanguage} from '../i18n.mjs?v=5.9.28';
import {money} from '../core.mjs?v=5.8.1';

function state(role='super') {
 const d=fullDemo();d.role=role;d.v5=true;
 d.ownIds=['A-4'];d.ownPersonIds=['tenant'];
 d.persons=[{id:'tenant',full_name:'Ada Tenant',unit_roles:[{unit_id:'A-4',role:'tenant'}]},{id:'owner',full_name:'Ali Owner',unit_roles:[{unit_id:'A-4',role:'owner'}]}];
 d.links=[{id:'tenant-link',unit_id:'A-4',person_id:'tenant',role:'tenant',active:true},{id:'owner-link',unit_id:'A-4',person_id:'owner',role:'owner',active:true}];
 d.charges=[
  {id:'c-aidat',unit_id:'A-4',person_id:'tenant',link_id:'tenant-link',category:'Aidat',label:'Historical Aidat',reference:'staged:test:aidat',due_on:'2026-10-09',cents:600000},
  {id:'c-capital',unit_id:'A-4',person_id:'owner',link_id:'owner-link',category:'Demirbaş',label:'Owner fixture',due_on:'2026-10-09',cents:700000},
  {id:'other',unit_id:'A-5',person_id:'tenant',category:'Aidat',label:'Other apartment',due_on:'2026-10-09',cents:360000}
 ];
 d.allocations=[
  {id:'a',entry_id:'wire',charge_id:'c-aidat',cents:360000,created_at:'2026-10-31T08:00:00Z'},
  {id:'b',entry_id:'wire',charge_id:'other',cents:360000,created_at:'2026-10-31T08:00:00Z'}
 ];
 d.transactions=[{id:'wire',date:'2026-10-15',sender_name:'Halil Kantarcı',desc:'Shared October A-4 and A-5 payment',cents:720000}];
 return {data:d,mode:'demo',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'}};
}

test('one apartment dashboard consolidates inherited balances and keeps a separate payments history',()=>{
 setLanguage('de');
 try {
  const html=unitDetailV3(state('super'),'A-4');
  assert.match(html,/Altbestand – vorherige Verwaltung/);
  assert.match(html,/Bereits verrechnet/);
  assert.match(html,/Originalforderungen und Zuordnung anzeigen/);
  assert.match(html,/Ada Tenant/);
  assert.match(html,/Ali Owner/);
  assert.match(html,/Altbestand/);
  assert.match(html,/15\. Okt\. 2026/);
  assert.match(html,/Halil Kantarcı/);
  assert.match(html,/Shared October A-4 and A-5 payment/);
  assert.match(html,/Gesamtüberweisung/);
  assert(html.includes(money(940000))); // 13,000 original less 3,600 shared payment
  assert(html.includes(money(360000)));
  assert.equal((html.match(/class="uf-payment"/g)||[]).length,1);
  assert.equal((html.match(/class="uf-legacy"/g)||[]).length,1);
  assert.match(html,/Neue Forderungen – aktuelle Verwaltung/);
  assert(!html.includes('class="person-open-amount"')); // person cards no repeated balances
 } finally {setLanguage('tr');}
});

test('resident uses the same financial component but not admin actions or cross-unit bank memo',()=>{
 setLanguage('de');
 try {
  const html=unitDetailV3(state('resident'),'A-4');
  assert.match(html,/class="uf-finance"/);
  assert.match(html,/Ada Tenant/);
  assert.match(html,/Ali Owner/);
  assert.match(html,/15\. Okt\. 2026/);
  assert(html.includes(money(940000)));
  assert(!html.includes('Shared October A-4 and A-5 payment'));
  assert(!html.includes('Gesamtüberweisung'));
  assert(!html.includes('data-action="auto_allocate"'));
  assert(!html.includes('data-action="void_charge"'));
  assert(!html.includes('A-5'));
 } finally {setLanguage('tr');}
});

test('allocation creation day is never misrepresented as bank booking day',()=>{
 const s=state('super');s.data.transactions=[];
 setLanguage('de');
 try {
  const html=unitDetailV3(s,'A-4');
  assert.match(html,/Bankdatum nicht verfügbar/);
  assert.match(html,/Zuordnung erstellt/);
  assert(!html.includes('31.10.2026 · Halil Kantarcı'));
 } finally {setLanguage('tr');}
});

test('advance credits remain visible and are not subtracted again from claim balances',()=>{
 const s=state('super');
 s.data.allocations=s.data.allocations.filter(a=>a.charge_id==='c-aidat');
 s.data.credits=[{id:'credit',entry_id:'wire',unit_id:'A-4',person_id:'tenant',cents:360000,created_at:'2026-10-31T08:00:00Z'}];
 setLanguage('de');
 try {
  const html=unitDetailV3(s,'A-4');
  assert.match(html,/Noch nicht mit Forderungen verrechnetes Guthaben/);
  assert.match(html,/Guthaben/);
  assert(html.includes(money(940000))); // prior debt unchanged: credit is unallocated
  assert(html.includes(money(360000)));
  assert(html.includes(money(720000))); // bank entry shown once at apartment level
  assert.equal((html.match(/class="uf-payment"/g)||[]).length,1);
  assert.equal((html.match(/class="uf-matches"/g)||[]).length,1);
 } finally {setLanguage('tr');}
});
