import test from 'node:test';
import assert from 'node:assert/strict';
import {norm,suggestUnits,withPaymentIndex,buildSummaryDays} from '../v3-domain.mjs?v=perf1';

test('matching preserves Unicode normalization, first code match, historical names and saved rules',()=>{
 const d={transactions:[],credits:[],units:[{id:'a',code:'A-1'},{id:'duplicate',code:'A 1'},{id:'b',code:'B-2'}],persons:[{id:'p',full_name:'Çağrı Şahin'}],links:[{person_id:'p',unit_id:'b',active:false}],matchRules:[{alias:'Düzenli',unit_id:'a'},{iban:'TR 123',unit_id:'b'}]};
 const transactions=[{desc:'Ödeme A-1'},{desc:'Çağrı Şahin',iban:'TR123'},{desc:'Düzenli A-1',unit_hint:'B-2'}];
 const before=transactions.map(t=>suggestUnits(d,t));
 assert.deepEqual(before.map(x=>x.unitIds),[['a'],['b'],['b','a']]);
 assert.deepEqual(withPaymentIndex(d,()=>transactions.map(t=>suggestUnits(d,t))),before);
 assert.equal(norm('ÇAĞRI ŞAHİN'),'cagrisahin');
});
test('render caches are discarded after exceptions, data switches and in-place edits',()=>{
 const d={transactions:[],credits:[],units:[{id:'a',code:'A-1'}]},other={transactions:[],credits:[],units:[{id:'b',code:'B-1'}]},t={desc:'A-1'};
 withPaymentIndex(d,()=>{
  assert.deepEqual(suggestUnits(d,t).unitIds,['a']);
  withPaymentIndex(other,()=>assert.deepEqual(suggestUnits(other,{desc:'B-1'}).unitIds,['b']));
  assert.deepEqual(suggestUnits(d,t).unitIds,['a']);
 });
 assert.throws(()=>withPaymentIndex(d,()=>{suggestUnits(d,t);throw Error('render failed');}));
 d.units[0].code='A-2';t.desc='A-2';
 assert.deepEqual(withPaymentIndex(d,()=>suggestUnits(d,t)).unitIds,['a']);
 t.desc='A-1';assert.deepEqual(withPaymentIndex(d,()=>suggestUnits(d,t)).unitIds,[]);
});
test('daily summaries preserve reversal pairs, transfers, categories and input order',()=>{
 const transactions=[{id:'a',date:'2026-10-01',cents:1000,category:'Aidat'},{id:'r',reversal_of:'a',date:'2026-10-02',cents:-1000,category:'Aidat'},{id:'transfer',date:'2026-10-01',cents:999,category:'Transfer'},{id:'b',date:'2026-10-03',cents:-200,category:'Su'},{id:'c',date:'2026-10-03',cents:300,category:'Aidat'},{id:'d',date:'2026-10-01',cents:-150,category:'Su'}];
 const original=structuredClone(transactions);
 assert.deepEqual(buildSummaryDays({transactions}),[{date:'2026-10-03',income_cents:300,expense_cents:200,categories:{Su:200}},{date:'2026-10-01',income_cents:0,expense_cents:150,categories:{Su:150}}]);
 assert.deepEqual(transactions,original);
});
