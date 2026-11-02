import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardFinancePatch} from '../dashboard-finance-refresh.mjs';

const base={
 site:{id:'example-site'}, summaryBalance:8000, summaryOpening:0,
 charges:[{id:'old',unit_id:'b1',cents:5000}],allocations:[],credits:[],
 units:[{id:'b1',debt:5000},{id:'b2',debt:0},{id:'restricted',debt:null}],
 transactions:[{id:'old',date:'2026-10-01',cents:8000}]
};
test('independent finance refresh uses current bank balance without subtracting credits twice',()=>{
 const summary={balance_cents:6542312,opening_cents:0,source_last_date:'2026-11-02',days:[{date:'2026-11-02',income_cents:360000,expense_cents:0}]};
 const workspace={
  charges:[{id:'c1',unit_id:'b1',cents:360000},{id:'c2',unit_id:'b2',cents:280000}],
  allocations:[{id:'a1',charge_id:'c1',cents:100000,void_reason:null}],
  credits:[{id:'cr1',unit_id:'b1',cents:360000,void_reason:null},{id:'cr2',unit_id:'b2',cents:720000,void_reason:null}],
  entries:[{id:'e1',booked_on:'2026-11-02',description:'Test',cents:360000}]
 };
 const next=dashboardFinancePatch(base,summary,workspace);
 assert.equal(next.summaryBalance,6542312);
 assert.equal(next.units.find(u=>u.id==='b1').debt,260000);
 assert.equal(next.units.find(u=>u.id==='b2').debt,280000);
 assert.equal(next.units.find(u=>u.id==='restricted').debt,null);
 assert.equal(next.credits.reduce((n,c)=>n+c.cents,0),1080000);
 assert.equal(next.transactions[0].date,'2026-11-02');
 assert.equal(next.sourceLastDate,'2026-11-02');
 assert.equal(base.summaryBalance,8000);
});
test('partial or malformed API responses never replace valid dashboard amounts',()=>{
 assert.throws(()=>dashboardFinancePatch(base,{balance_cents:6542312},null));
 assert.throws(()=>dashboardFinancePatch(base,{balance_cents:'bad',days:[]},{charges:[],allocations:[],credits:[],entries:[]}));
 assert.throws(()=>dashboardFinancePatch(base,{balance_cents:0,days:null},{charges:[],allocations:[],credits:[],entries:[]}));
});
