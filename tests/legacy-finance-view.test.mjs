import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyFinance,isLegacyCharge} from '../legacy-finance.mjs?v=5.9.50';
import {unitDetailV3} from '../v3-ui.mjs?v=5.9.50';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {money} from '../core.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.9.28';

const A2='A-2';
const categories={'Aidat':662300,'Havuz':210000,'Asansör':38000,'Demirbaş':105000,'Su dijital kafa':110000,'Su arıtma bakımı':125000,'Bina kapısı bakımı':410000};
const makeCharge=(id,category,cents,person_id='Sibel',reference='staged:'+id)=>({id,unit_id:A2,category,label:category,cents,reference,person_id,payer:'tenant',due_on:'2026-10-09'});
const makeFixture=()=>{
 const charges=[
  makeCharge('old-aidat','Aidat',302300),
  makeCharge('old-havuz','Havuz',20000),
  makeCharge('elevator','Asansör',38000),
  makeCharge('demirbas','Demirbaş',105000,'Owner'),
  makeCharge('digital','Demirbaş',110000,'Owner'),
  makeCharge('water','Bakım',125000,'Owner'),
  makeCharge('gate','Bakım',410000,'Owner'),
  {...makeCharge('paid-aidat','Aidat',360000,'Sibel','purpose-split-20261015-A2-aidat-202610'),period_from:'2026-10-01',period_to:'2026-10-31'},
  {...makeCharge('paid-pool','Havuz',190000,'Sibel','purpose-split-20261015-A2-havuz-202609'),period_from:'2026-09-01',period_to:'2026-09-30'},
  makeCharge('current','Aidat',360000,'Sibel','monthly-a2-2026-11')
 ];
 const allocations=[
  {id:'a1',charge_id:'paid-aidat',entry_id:'bank-aidat',cents:360000},
  {id:'a2',charge_id:'paid-pool',entry_id:'bank-havuz',cents:190000}
 ];
 const transactions=[
  {id:'bank-aidat',date:'2026-10-15',cents:720000,sender_name:'Halil Kantarcı',desc:'Aidat Oktober für A-2 und A-8'},
  {id:'bank-havuz',date:'2026-10-15',cents:380000,sender_name:'Halil Kantarcı',desc:'Havuz September für A-2 und A-8'}
 ];
 const d=fullDemo();
 d.role='super';d.v5=true;d.charges=charges;d.allocations=allocations;d.transactions=transactions;d.credits=[];
 d.units=[{id:A2,code:A2,occupancy_status:'occupied',block:'A',number:2}];
 d.persons=[{id:'Sibel',full_name:'Sibel Kantarcı'},{id:'Owner',full_name:'Halil Geçer'}];
 d.links=[{id:'l1',unit_id:A2,person_id:'Sibel',role:'tenant',active:true},{id:'l2',unit_id:A2,person_id:'Owner',role:'owner',active:true}];
 d.devirSnapshot=[{unit_id:A2,source_date:'2026-10-09',total_cents:1660300,categories}];
 return d;
};

test('A-2 original 16,603 TL minus purpose-matched 5,500 TL is presented as one 11,103 TL legacy balance',()=>{
 const d=makeFixture(),x=legacyFinance(d,A2,d.charges);
 assert.equal(x.gross,1660300);
 assert.equal(x.paid,550000);
 assert.equal(x.open,1110300);
 assert.equal(x.sourceVerified,true);
 assert.equal(x.categories.length,7);
 assert.equal(x.categories.find(c=>c.name==='Aidat').cents,662300);
 assert.equal(x.categories.find(c=>c.name==='Havuz').cents,210000);
 assert.equal(x.current.length,1);
 assert.equal(x.current[0].cents,360000);
 assert.deepEqual(x.persons.map(p=>[p.personId,p.gross,p.paid,p.open]).sort((a,b)=>a[0].localeCompare(b[0])),[
 ['Owner',750000,0,750000],['Sibel',910300,550000,360300]
 ]);
});

test('only assigned allocations are subtracted; incoming bank transfer with no allocation does not pay old debt',()=>{
 const d=makeFixture();
 d.transactions.push({id:'unmatched',date:'2026-10-20',cents:500000});
 const x=legacyFinance(d,A2,d.charges);
 assert.equal(x.paid,550000);
 assert.equal(x.open,1110300);
});

test('source list and posted charges mismatch is visibly flagged rather than fabricating a reconciliation',()=>{
 const d=makeFixture();
 d.devirSnapshot[0].categories.Havuz=250000;
 const x=legacyFinance(d,A2,d.charges);
 assert.equal(x.sourceVerified,false);
 assert.equal(x.gross,1660300);
 assert.equal(x.paid,550000);
 assert.equal(x.categories.reduce((n,c)=>n+c.cents,0),1660300);
});

test('A-2 screen shows original source amounts only once, newly assessed debt separately, and no manufactured partials',()=>{
 const d=makeFixture(),s={data:d,mode:'demo',page:'units'};
 setLanguage('de');
 try{
  const html=unitDetailV3(s,A2);
  assert.match(html,/Altbestand – vorherige Verwaltung/);
  assert.match(html,/Originalforderungen und Zuordnung anzeigen/);
  assert.match(html,/Neue Forderungen – aktuelle Verwaltung/);
  assert(html.includes(money(1660300)));
  assert(html.includes(money(550000)));
  assert(html.includes(money(1110300)));
  assert(html.includes(money(360000)));
  assert(html.includes(money(1470300))); // 11,103 legacy + 3,600 current
  assert(!html.includes('Teilweise verrechnet'));
  assert.equal((html.match(/class="uf-legacy-row"/g)||[]).length,7);
  assert.equal((html.match(/class="uf-payment"/g)||[]).length,2);
  assert.equal((html.match(/class="uf-current-row"/g)||[]).length,1);
 }finally{setLanguage('tr');}
});

test('resident sees source summary with no administrative allocation actions or other apartment memos',()=>{
 const d=makeFixture();d.role='resident';d.ownIds=[A2];d.ownPersonIds=['Sibel'];d.capabilities={};
 const s={data:d,mode:'connected'};
 setLanguage('de');
 try{
  const html=unitDetailV3(s,A2);
  assert.match(html,/Altbestand – vorherige Verwaltung/);
  assert(html.includes(money(1660300)));
  assert(!html.includes('data-action="auto_allocate"'));
  assert(!html.includes('Aidat Oktober für A-2 und A-8'));
 }finally{setLanguage('tr');}
});
