import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand,remaining,unassigned,monthlySummary,refreshDebts} from '../ledger.mjs';
import {payloadFor,buildForm} from '../forms.mjs';
import {renderPage,unitDetail,pages} from '../ui.mjs';
function state(role='super'){const data=fullDemo();data.role=role;return {data,mode:'demo',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all'}};}
function fd(obj){const f=new FormData();for(const[k,v]of Object.entries(obj))f.set(k,v);return f;}
test('partial-payment workflow updates debt once and correction preserves cash ledger',()=>{
 const s=state(),d=s.data,t=d.transactions.find(t=>t.cents>0),c=d.charges[0],cash=monthlySummary(d,s.period).balance;
 const p={entry_id:t.id,charge_id:c.id,cents:10000,request_id:crypto.randomUUID()};
 demoCommand(d,'allocate',p);demoCommand(d,'allocate',p);assert.equal(d.allocations.length,1);assert.equal(remaining(d,c),c.cents-10000);assert.equal(unassigned(d,t),t.cents-10000);
 assert.equal(monthlySummary(d,s.period).balance,cash);
 demoCommand(d,'unallocate',{id:d.allocations[0].id,reason:'Incorrect match'});assert.equal(remaining(d,c),c.cents);assert.equal(monthlySummary(d,s.period).balance,cash);
});
test('form parsing requires explicit bulk confirmation and preserves idempotency key',()=>{
 const s=state(),f=buildForm(s,'monthly');assert.throws(()=>payloadFor('monthly',fd({amount:'3.600,00'}),f.context),/onay/);
 const p=payloadFor('monthly',fd({amount:'3.600,00',confirmation:'on',due_on:'2026-10-01',label:'October',payer:'review'}),f.context);
 assert.equal(p.cents,360000);assert.equal(p.request_id,f.context.request_id);
 const entry=payloadFor('entry',fd({amount:'12,50',direction:'out'}),{request_id:'fixed'});assert.equal(entry.cents,-1250);
 assert.throws(()=>payloadFor('charge',fd({amount:'1e9'}),{}),/biçim/);
});
test('rendering all authorized screens works and escapes stored content',()=>{
 const s=state();s.data.announcements[0].body='<script>alert(1)</script>';
 for(const page of pages(s)){s.page=page;const html=renderPage(s);assert.ok(html.includes('<h1>'));assert.ok(!html.includes('<script>'));}
 assert.ok(unitDetail(s,s.data.units[0].id).includes('detailTitle'));
});
test('resident rendering excludes other units, raw bank descriptions and other allocations',()=>{
 const s=state('resident'),d=s.data;d.transactions[0].desc='PRIVATE BANK SECRET';d.charges[0].label='OTHER UNIT SECRET';d.allocations.push({id:'private',entry_id:d.transactions[0].id,charge_id:d.charges[0].id,cents:100,void_reason:null});refreshDebts(d);
 for(const page of pages(s)){s.page=page;const html=renderPage(s);assert.ok(!html.includes('PRIVATE BANK SECRET'));assert.ok(!html.includes('OTHER UNIT SECRET'));}
 assert.equal(unitDetail(s,'A-2'),null);assert.ok(!pages(s).includes('settings'));assert.ok(!pages(s).includes('transactions'));
});
test('published report remains a separate snapshot after later changes',()=>{
 const d=fullDemo();demoCommand(d,'publish_report',{period:'2026-10-01'});const published=d.reports[0].closing_cents;
 demoCommand(d,'entry',{date:'2026-10-25',desc:'Later',category:'Diğer',cents:1000,request_id:crypto.randomUUID()});
 assert.equal(d.reports[0].closing_cents,published);assert.equal(monthlySummary(d,'2026-10').balance,published+1000);
});

test('staged demo balance is not posted until an explicit confirmation command',()=>{
 const d=fullDemo(),before=d.charges.length;assert.equal(d.charges.length,before);const row=d.staged[0];demoCommand(d,'confirm_staged',{id:row.id,unit_id:'B-4',payer:'review'});assert.equal(d.charges.length,before+1);assert.ok(row.confirmed_charge);assert.throws(()=>demoCommand(d,'confirm_staged',{id:row.id,unit_id:'B-4',payer:'review'}),/Bekleyen/);
});
