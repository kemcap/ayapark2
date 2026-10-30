import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewImport} from '../import-review.mjs';
const rows=()=>[{cents:10000,balance_cents:110000},{cents:-250,balance_cents:109750},{cents:5000,balance_cents:114750}];
test('source review preserves fees and exact signed totals without changing rows',()=>{
 const entries=rows().map(Object.freeze);Object.freeze(entries);const r=reviewImport(entries);
 assert.deepEqual([r.incomeCents,r.expenseCents,r.netCents],[15000,250,14750]);assert.equal(r.status,'consistent');assert.equal(r.direction,'oldest-first');assert.equal(r.checkedTransitions,2);assert.equal(r.mayImport,true);
});
test('newest first sources are checked in reverse without rewriting the upload',()=>{
 const entries=rows().reverse(),before=JSON.stringify(entries);const r=reviewImport(entries);assert.equal(r.status,'consistent');assert.equal(r.direction,'newest-first');assert.equal(JSON.stringify(entries),before);
});
test('one kuruş discrepancy blocks import instead of changing an amount',()=>{
 const entries=rows();entries[1].balance_cents++;const r=reviewImport(entries);assert.equal(r.status,'mismatch');assert.equal(r.mayImport,false);assert(r.mismatches>0);assert.equal(entries[1].cents,-250);
});
test('intervening movements without a balance are included between known anchors',()=>{
 const entries=rows();delete entries[1].balance_cents;const r=reviewImport(entries);assert.equal(r.status,'partial');assert.equal(r.checkedTransitions,1);assert.equal(r.knownBalances,2);assert.equal(r.mayImport,true);
 entries[1].cents++;assert.equal(reviewImport(entries).mayImport,false);
});
test('zero and negative balances count as known source values',()=>{
 const r=reviewImport([{cents:-100,balance_cents:0},{cents:-200,balance_cents:-200}]);assert.equal(r.status,'consistent');assert.equal(r.knownBalances,2);
});
test('missing source balances do not falsely claim reconciliation',()=>{
 for(const entries of [[{cents:100},{cents:-20}],[{cents:100,balance_cents:100},{cents:-20}]]){const r=reviewImport(entries);assert.equal(r.status,'unavailable');assert.equal(r.direction,'unknown');assert.equal(r.checkedTransitions,0);assert.equal(r.mayImport,true);}
});
test('the first reported balance is not assumed to independently prove opening cash',()=>{
 const r=reviewImport([{cents:100,balance_cents:999999},{cents:200,balance_cents:1000199}]);assert.equal(r.status,'consistent');assert.equal(r.checkedTransitions,1);assert(!('openingCents' in r));
});
test('fractional cents, unsafe totals and invalid input fail before review',()=>{
 for(const entries of [[],[{cents:0.5}],[{cents:1,balance_cents:NaN}],[{cents:Number.MAX_SAFE_INTEGER},{cents:1}]])assert.throws(()=>reviewImport(entries),TypeError);
});
