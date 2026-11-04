import test from 'node:test';
import assert from 'node:assert/strict';
import {unitDebtBuckets,formerDebtGroups,isFormerCharge} from '../unit-debt-view.mjs';
const d={
 role:'super',
 links:[
  {id:'older-owner',unit_id:'A8',person_id:'erkan',role:'owner',active:false,starts_on:'2025-03-01',ends_on:'2026-04-14'},
  {id:'owner-now',unit_id:'A8',person_id:'ertan',role:'owner',active:true,starts_on:'2026-04-15'},
  {id:'other-unit',unit_id:'A2',person_id:'erkan',role:'representative',active:true}
 ],
 charges:[
  {id:'hist',unit_id:'A8',person_id:'erkan',link_id:'older-owner',cents:240000},
  {id:'current',unit_id:'A8',person_id:'ertan',link_id:'owner-now',cents:120000},
  {id:'unknown',unit_id:'A8',person_id:null,link_id:null,cents:50000},
  {id:'unlinked',unit_id:'A8',person_id:'someone',link_id:null,cents:25000},
  {id:'void',unit_id:'A8',person_id:'ertan',cents:1200,void_reason:'Cancelled'},
  {id:'other',unit_id:'A2',person_id:'erkan',link_id:'other-unit',cents:90000}
 ],
 allocations:[{id:'a',charge_id:'hist',entry_id:'bank',cents:40000}]
};
test('historical owner debt remains on Erkan and separate from current Ertan and unidentified amounts',()=>{
 const b=unitDebtBuckets(d,'A8',d.charges);
 assert.deepEqual(b.current.map(x=>x.id),['current']);
 assert.deepEqual(b.former.map(x=>x.id),['hist']);
 assert.deepEqual(b.review.map(x=>x.id),['unknown','unlinked']);
 assert.equal(b.currentOpen,120000);
 assert.equal(b.formerOpen,200000);
 assert.equal(b.reviewOpen,75000);
 assert.equal(b.totalOpen,395000);
 assert.deepEqual(formerDebtGroups(d,b.former).map(x=>({person:x.personId,open:x.open})),[{person:'erkan',open:200000}]);
});
test('current link at another apartment does not change former status in A8',()=>{
 assert.equal(isFormerCharge(d,d.charges[0]),true);
});
test('reassigning an archived person as active in same apartment changes presentation, not bookings',()=>{
 const amended={...d,links:[...d.links,{id:'rejoined',unit_id:'A8',person_id:'erkan',role:'tenant',active:true}]};
 const b=unitDebtBuckets(amended,'A8',d.charges);
 assert.equal(b.formerOpen,0);
 assert.equal(b.currentOpen,320000);
 assert.equal(d.charges[0].link_id,'older-owner');
});
test('negative residuals and void claims are never shown as debt',()=>{
 const amended={...d,charges:[{id:'credit',unit_id:'A8',person_id:'ertan',link_id:'owner-now',cents:100},{id:'void',unit_id:'A8',person_id:'ertan',cents:100,void_reason:'Test'}],allocations:[{charge_id:'credit',cents:200}]};
 const b=unitDebtBuckets(amended,'A8',amended.charges);
 assert.equal(b.totalOpen,0);
});
