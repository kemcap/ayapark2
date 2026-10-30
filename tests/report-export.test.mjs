import test from 'node:test';
import assert from 'node:assert/strict';
import {summaryExport,bankExport,receiptExport,receiptIds} from '../report-export-domain.mjs';
import {exportMarkup,validateExportModel} from '../report-export-view.mjs';
import {workbookBytes} from '../xlsx-export.mjs';
import {unzipSync,readWorkbook} from '../vendor/xlsx-9.3.14/reader.mjs';
const data=()=>({ownPersonIds:['own'],persons:[{id:'own',full_name:'Own Person'},{id:'other',full_name:'PRIVATE OTHER PERSON'}],units:[{id:'u',code:'A-1'}],charges:[{id:'c1',unit_id:'u',person_id:'own',label:'Aidat'},{id:'c2',unit_id:'u',person_id:'other',label:'PRIVATE OTHER DEBT'}],allocations:[{id:'a1',charge_id:'c1',entry_id:'e',cents:500,created_at:'2026-10-01'},{id:'a2',charge_id:'c2',entry_id:'e',cents:900,created_at:'2026-10-01'}],transactions:[{id:'e',date:'2026-10-01',cents:1400,desc:'PRIVATE BANK PURPOSE',sender_iban:'PRIVATE IBAN'}]});
test('personal receipt exposes only own allocation even in a shared apartment/payment',()=>{
 const d=data(),r=receiptExport(d,'a1',{language:'de'}),serialized=JSON.stringify(r);
 assert(serialized.includes('Own Person'));assert(!serialized.includes('PRIVATE'));assert.deepEqual(receiptIds(d,'c1'),['a1']);assert.deepEqual(receiptIds(d,'c2'),[]);assert.throws(()=>receiptExport(d,'a2'));assert(r.rows.some(r=>r[1]?.moneyCents===500));
});
test('management export is explicit and void/reversed data cannot produce a live receipt',()=>{
 const d=data();assert(receiptExport(d,'a2',{canFinance:true}));d.allocations[0].void_reason='Correction';assert.throws(()=>receiptExport(d,'a1'));delete d.allocations[0].void_reason;d.transactions.push({id:'reversal',reversal_of:'e'});assert.throws(()=>receiptExport(d,'a1'));assert.deepEqual(receiptIds(d,'c1'),[]);
});
test('historical own receipt does not require an active current apartment relationship',()=>{
 const d=data();d.links=[];assert.equal(receiptExport(d,'a1').rows.find(r=>r[0]==='Daire')[1],'A-1');
});
test('summary export requires actual community/finance access and never includes bank descriptions',()=>{
 const d=data(),series={buckets:[{period:'2026-10',income:1400,expense:250}]};assert.throws(()=>summaryExport(d,series));d.communityAccess=true;const r=summaryExport(d,series);assert.equal(r.rows[0][3].moneyCents,1150);assert(!JSON.stringify(r).includes('PRIVATE'));assert.throws(()=>bankExport(d.transactions));assert.equal(bankExport(d.transactions,{canFinance:true}).rows.length,1);
});
test('export HTML escapes bank/person text and keeps explicit demo warning',()=>{
 const m={language:'de',demo:true,title:'<script>bad</script>',columns:['Name'],rows:[['<img src=x onerror=alert(1)>']],notes:[]};const html=exportMarkup(m);assert(!html.includes('<script>'));assert(!html.includes('<img'));assert(html.includes('Beispieldaten'));assert.throws(()=>validateExportModel({...m,rows:[[{moneyCents:NaN}]]}));
});
test('XLSX round-trip preserves exact cents, Turkish text and formula-looking strings as text',async()=>{
 const model={language:'tr',title:'Ödeme',demo:true,columns:['Açıklama','Tutar'],rows:[['=HYPERLINK("https://example.invalid")',{moneyCents:123456}],['İşlem',{moneyCents:-1}]],notes:['Synthetic']};
 const contents=unzipSync(workbookBytes(model)),sheets=await readWorkbook(contents),rows=sheets[0].data;
 assert.equal(rows[1][0],model.rows[0][0]);assert.equal(rows[1][1].xlsxNumber,'1234.56');assert.equal(rows[2][1].xlsxNumber,'-0.01');assert.equal(rows[2][0],'İşlem');assert(rows.flat().some(v=>typeof v==='string'&&v.includes('Örnek veriler')));assert(!new TextDecoder().decode(contents['xl/worksheets/sheet1.xml']).includes('<f>'));
});
