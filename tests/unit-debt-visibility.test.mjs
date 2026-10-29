import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedCharges} from '../v3-domain.mjs?v=5.9.20';
import {calculateClaims} from '../supabase/functions/ay3-site-open-claims/math.mjs?v=5.8.1';

const charges=[
 {id:'owner-b10',unit_id:'B-10',person_id:'owner',cents:360000},
 {id:'tenant-b10',unit_id:'B-10',person_id:'tenant',cents:4825000},
 {id:'unassigned-b10',unit_id:'B-10',person_id:null,cents:73000},
 {id:'other-a2',unit_id:'A-2',person_id:'owner-other',cents:990000},
];
test('owner sees tenant, owner and unassigned debt for own apartment but not other apartments',()=>{
 const result=scopedCharges({role:'resident',personalScope:true,ownIds:['B-10'],ownPersonIds:['owner'],charges});
 assert.deepEqual(result.map(c=>c.id),['owner-b10','tenant-b10','unassigned-b10']);
});
test('tenant sees owner, tenant and unassigned debt for own apartment but not other apartments',()=>{
 const result=scopedCharges({role:'resident',personalScope:true,ownIds:['B-10'],ownPersonIds:['tenant'],charges});
 assert.deepEqual(result.map(c=>c.id),['owner-b10','tenant-b10','unassigned-b10']);
});
test('another resident has no access to B10',()=>{
 const result=scopedCharges({role:'resident',ownIds:['A-2'],ownPersonIds:['owner-other'],charges});
 assert.deepEqual(result.map(c=>c.id),['other-a2']);
});
test('resident with both apartments sees debts of both and does not need to own each debtor',()=>{
 const result=scopedCharges({role:'resident',ownIds:['B-10','A-2'],ownPersonIds:['owner'],charges});
 assert.equal(result.length,4);
});
test('apartment aggregate counts all current debtors and subtracts allocations once',()=>{
 const result=calculateClaims({
  units:[{id:'B-10',code:'B-10'},{id:'A-2',code:'A-2'}],
  charges,allocations:[{charge_id:'tenant-b10',entry_id:'payment',cents:10000}],
  ownUnitIds:['B-10'],
 });
 assert.equal(result.own_total_cents,360000+4825000-10000+73000);
 assert.equal(result.own_units.length,1);
 assert.equal(result.own_units[0].code,'B-10');
 assert.equal(result.site_total_cents,result.own_total_cents+990000);
});
