import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeStage,unitCodes,normalize} from '../reconcile.mjs';
const units=['A-1','A-2','A-8','A-9','B-1','B-2','B-8','B-9'].map(code=>({id:code,code}));
function data(row,transactions=[],others=[]){return{units,transactions,staged:[row,...others]};}
const row=(extra={})=>({id:'case-1',person_label:'ÖRNEK YILMAZ',unit_hint:'1 (M)',as_of:'2026-10-09',cents:410000,...extra});
test('explicit source block wins without treating a suggestion as confirmation',()=>{
 const r=row({unit_hint:'B-1 (M)'}),result=analyzeStage(r,data(r));assert.equal(result.suggestedCode,'B-1');assert.equal(result.basis,'document');assert.equal(r.confirmed_charge,undefined);
});
test('missing block remains unresolved without suitable recent bank evidence',()=>{
 const r=row(),d=data(r,[{id:'old',date:'2024-01-01',desc:'Örnek Yılmaz A blok no 1',cents:100}]);
 assert.equal(analyzeStage(r,d).suggestedCode,null);assert.equal(analyzeStage(r,d).basis,'unresolved');
});
test('strict name and recent matching apartment support a suggestion',()=>{
 const r=row(),d=data(r,[{id:'t',date:'2026-09-01',desc:'ÖRNEK YILMAZ - A BLOK NO:1 aidat',cents:100}]);
 const result=analyzeStage(r,d);assert.equal(result.suggestedCode,'A-1');assert.equal(result.basis,'bank');assert.ok(result.warnings.length);
 const unrelated=data(r,[{id:'t',date:'2026-09-01',desc:'Başka Yılmaz A blok no 1',cents:100}]);assert.equal(analyzeStage(r,unrelated).suggestedCode,null);
});
test('shared payment is recognized; apartment hint narrows evidence without splitting money',()=>{
 assert.deepEqual(unitCodes('A blok daire 2 ve daire 8 aidatı'),['A-2','A-8']);
 const r=row({unit_hint:'2 (M)'}),result=analyzeStage(r,data(r,[{id:'t',date:'2026-08-01',desc:'Örnek Yılmaz A blok daire 2 ve 8',cents:600000}]));
 assert.equal(result.suggestedCode,'A-2');assert.equal(result.unitEvidence[0].shared,true);assert.ok(result.warnings.some(w=>w.includes('tamamı')));
});
test('post-snapshot exact amount is only a payment candidate, not an automatic clearance',()=>{
 const r=row(),t={id:'payment',date:'2026-10-11',desc:'Örnek Yılmaz',cents:410000};const d=data(r,[t]);
 const result=analyzeStage(r,d);assert.equal(result.paymentCandidates.length,1);assert.equal(d.transactions.length,1);assert.equal(r.confirmed_charge,undefined);
 const reversed=data(r,[t,{id:'reversal',date:'2026-10-12',desc:'Storno',cents:-410000,reversal_of:'payment'}]);assert.equal(analyzeStage(r,reversed).paymentCandidates.length,0);
});
test('parallel enforcement/general balances are flagged without being declared duplicates',()=>{
 const r=row(),other=row({id:'other',kind:'enforcement'});const result=analyzeStage(r,data(r,[],[other]));assert.equal(result.overlaps.length,1);assert.ok(result.warnings.some(w=>w.includes('çakışmadığını')));
});
test('ambiguous blocks and unrelated numbers do not produce a unique selection',()=>{
 const r=row(),result=analyzeStage(r,data(r,[{date:'2026-09-01',desc:'Örnek Yılmaz A blok daire 1',cents:100},{date:'2026-09-02',desc:'Örnek Yılmaz B blok no 1',cents:100}]));assert.equal(result.suggestedUnitId,null);assert.deepEqual(unitCodes('2026 Eylül 4100 TL'),[]);assert.equal(normalize('ÇAPACI İŞ'), 'capaci is');
});
