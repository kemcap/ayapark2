import test from 'node:test';
import assert from 'node:assert/strict';
import {md5,sourceBounds,checkBankImport} from '../bank-import-preflight.mjs';
const a={date:'2026-11-22',desc:'Aidat',cents:10000,balance_cents:110000,reference:''};
const b={date:'2026-11-20',desc:'Ödeme',cents:20000,balance_cents:100000,reference:''};
const fingerprint=(r,balance)=>md5('['+[r.date,r.desc,r.cents,r.reference,balance==null?null:String(balance)].map(v=>JSON.stringify(v)).join(', ')+']');
const stored={booked_on:a.date,description:a.desc,cents:a.cents,bank_reference:'',batch_id:'batch',dedup_key:fingerprint(a,a.balance_cents)};
test('MD5 identifiers match PostgreSQL and UTF-8',()=>{
 assert.equal(md5(''),'d41d8cd98f00b204e9800998ecf8427e');
 assert.equal(md5('abc'),'900150983cd24fb0d6963f7d28e17f72');
 assert.equal(md5('["2026-11-22", "GELEN FAST - ÖDEME", 1498000, "", "11995783"]'),fingerprint({date:'2026-11-22',desc:'GELEN FAST - ÖDEME',cents:1498000,reference:''},11995783));
});
test('new, mixed, duplicate batch and missing access',()=>{
 assert.equal(checkBankImport([a,b],[]).newCount,2);
 assert.deepEqual(checkBankImport([a,b],[stored]),{total:2,newCount:1,duplicates:1,ambiguous:0,alreadyImported:false,complete:true});
 assert.equal(checkBankImport([a,b],[],{batch:{source_name:'previous.pdf'}}).newCount,0);
 assert.equal(checkBankImport([a,b],[],{complete:false}).complete,false);
});
test('in-file duplicate, different balance, and ambiguous legacy record',()=>{
 assert.equal(checkBankImport([a,a],[]).duplicates,1);
 assert.equal(checkBankImport([{...a,balance_cents:110001}],[stored]).newCount,1);
 assert.equal(checkBankImport([a],[{...stored,batch_id:null,dedup_key:fingerprint(a,null)}]).ambiguous,1);
});
test('source dates and final balance',()=>assert.deepEqual(sourceBounds([a,b],'newest-first'),{from:'2026-11-20',to:'2026-11-22',closingCents:110000}));
