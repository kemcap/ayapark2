import test from 'node:test';
import assert from 'node:assert/strict';
import {duesOverview} from '../dues-overview.mjs';

test('dues overview adds outstanding cents, separates paid/partial and ignores voided entries',()=>{
 const charges=[
  {id:'a',unit_id:'u',cents:10000},
  {id:'b',unit_id:'u',cents:7000},
  {id:'c',unit_id:'u',cents:5000},
  {id:'d',unit_id:'u',cents:50000,void_reason:'cancelled'}
 ];
 const d={charges,allocations:[{id:'p',charge_id:'b',cents:2000},{id:'q',charge_id:'c',cents:5000}]};
 assert.deepEqual(duesOverview(d,charges),{outstanding:15000,open:2,partial:1,settled:1,recorded:3});
});

test('empty authorized list has zero values',()=>{
 assert.deepEqual(duesOverview({charges:[],allocations:[]},[]),{outstanding:0,open:0,partial:0,settled:0,recorded:0});
});
