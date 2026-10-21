import test from 'node:test';
import assert from 'node:assert/strict';
import {demoData,summarize,visibleUnits,allowedPages,parseCsv,escapeHtml,money,randomId} from '../core.mjs';
test('dashboard and reports reconcile to the same ledger, in integer kuruş',()=>{
 const d=demoData(),s=summarize(d.transactions,d.opening);
 assert.deepEqual(s,{income:1080000,expense:550000,net:530000,balance:4820000});
 assert.equal(d.units.reduce((n,u)=>n+u.debt,0),1820000);
 assert.equal(d.units.filter(u=>u.debt>0).length,6);
 assert.equal(s.balance,d.opening+s.income-s.expense);
 assert.equal(money(null),'—');assert.notEqual(money(0),'—');
});
test('resident view only includes assigned units, including multiple units or no assignments',()=>{
 const d=demoData();assert.deepEqual(visibleUnits(d.units,'resident',['A-4','B-2']).map(u=>u.id),['A-4','B-2']);
 assert.equal(visibleUnits(d.units,'resident',[]).length,0);
 assert.equal(visibleUnits(d.units,'staff',[]).length,20);
 assert.ok(!allowedPages('resident').includes('transactions'));assert.ok(!allowedPages('staff').includes('settings'));
});
test('CSV respects quotes, escaped quotes, multiline fields, BOM and Turkish amounts',()=>{
 const p=parseCsv('\uFEFFtarih;aciklama;tutar\r\n2026-10-20;"Aidat; "+""A""";3.600,25\r\n'.replace('"+',''));
 assert.equal(p.entries[0].cents,360025);assert.equal(p.entries[0].desc,'Aidat; "A"');
 assert.equal(parseCsv('tarih,aciklama,tutar\n2026-10-20,"Birinci\nikinci","-1.200,50"').entries[0].cents,-120050);
});
test('CSV rejects malformed/ambiguous amounts, dates, columns and runaway input',()=>{
 for(const row of ['2026-02-30;x;3.600','2026-10-20;x;3.60','2026-10-20;x;1e4','2026-10-20;x;0','2026-10-20;x;1;2','2026-10-20;"x;1'])assert.throws(()=>parseCsv('tarih;aciklama;tutar\n'+row));
 assert.throws(()=>parseCsv('a;b;c\n2026-10-20;x;1'));
 assert.throws(()=>parseCsv('x'.repeat(2*1024*1024+1)));
});
test('CSV flags repeats within file without silently discarding rows',()=>{
 const p=parseCsv('tarih;aciklama;tutar\n2026-10-20;Aidat;3.600\n2026-10-20;Aidat;3600');
 assert.equal(p.duplicates,1);assert.equal(p.entries.length,2);assert.equal(p.entries[1].duplicate,true);
});
test('external descriptions are escaped before interpolation in HTML',()=>{
 assert.equal(escapeHtml('<img src=x onerror="x">&\''),'&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;');
});

test('request IDs remain valid when randomUUID is unavailable on HTTP previews',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'crypto'),cryptoObject=globalThis.crypto;
 try{Object.defineProperty(globalThis,'crypto',{value:{getRandomValues:cryptoObject.getRandomValues.bind(cryptoObject)},configurable:true});const ids=Array.from({length:30},()=>randomId());assert.equal(new Set(ids).size,30);for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);}
 finally{Object.defineProperty(globalThis,'crypto',original);}
});
