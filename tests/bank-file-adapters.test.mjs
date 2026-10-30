import test from 'node:test';
import assert from 'node:assert/strict';
import {workbookToCsv,pdfPagesToCsv,sourceDate,bankFileMessage} from '../bank-file-adapters.mjs';
import {parseImport} from '../v3-import.mjs?v=5.8.1';
const header='date;reference;counterparty;description;income;expense;unit;iban;balance'.split(';');
const item=(str,x,y)=>({str,transform:[1,0,0,1,x,-y],width:str.length*4});
const modernHead=[item('Tarih',28,10),item('Saat',100,10),item('Açıklama',276,10),item('İşlem Tutarı',451,10),item('Bakiye',542,10)];
const row=(date,desc,amount,balance,y)=>[item(date,28,y),item('10:00:00',100,y),item('Para Gönder',142,y),item('Diğer',190,y),item(desc,276,y),item(amount+' TL',438,y),item(balance+' TL',530,y)];
test('PDF keeps multiline descriptions, separate fees and zero balances',()=>{
 const page=[...modernHead,item('GELEN FAST - Synthetic 11:09:49',276,20),...row('02/10/2026','Receipt','100,00','100,00',30),...row('01/10/2026','Fee','-2,50','0,00',40)];
 const result=pdfPagesToCsv([page]),parsed=parseImport(result.raw);assert.equal(parsed.entries.length,2);assert.equal(parsed.entries[0].desc,'GELEN FAST - Synthetic 11:09:49 Receipt');assert.equal(parsed.entries[1].cents,-250);assert.equal(parsed.entries[1].balance_cents,0);assert.equal(result.metadata.missingReferences,2);
});
test('PDF legacy references, dates and US money map to existing CSV semantics',()=>{
 const page=[item('Tarih',19,10),item('Valör',78,10),item('Açıklama',123,10),item('İşlem Tutarı',511,10),item('Bakiye',667,10),item('Dekont No',738,10),item('01.10.2026 01.10.2026 Synthetic tckn: 12345678901 receipt 1,200.00 10:00:00 1,200.00 900000001',19,30),item('continued purpose',123,40)];
 const result=pdfPagesToCsv([page]),entry=parseImport(result.raw).entries[0];assert.equal(entry.cents,120000);assert.equal(entry.reference,'900000001');assert.equal(entry.date,'2026-10-01');assert(entry.desc.includes('continued purpose'));assert(!entry.desc.includes('12345678901'));assert.equal(result.metadata.identifiersRemoved,1);
});
test('unknown, empty, damaged and ambiguous PDF pages are rejected completely',()=>{
 for(const pages of [[],[[]],[[...modernHead,item('02/10/2026 broken row',28,30)]],[[...modernHead,item('dangling description',276,30)]],[[...modernHead,...row('31/02/2026','Invalid date','10,00','10,00',30)]]])assert.throws(()=>pdfPagesToCsv(pages));
});
test('multiple PDF pages retain every movement',()=>{const result=pdfPagesToCsv([[...modernHead,...row('02/10/2026','First','100,00','100,00',30)],[...modernHead,...row('01/10/2026','Second','10,00','0,00',30)]]);assert.equal(parseImport(result.raw).entries.length,2);assert.equal(result.metadata.pages,2);});
test('XLSX template preserves exact numeric strings, dates, quotes and text cells',()=>{
 const result=workbookToCsv([{sheet:'Bank',data:[header,[new Date('2026-10-01T00:00:00Z'),'QA-1','','Synthetic; "receipt"',{xlsxNumber:'1234.56'},null,'A-1',null,{xlsxNumber:'-0.01'}]]}]);
 const entry=parseImport(result.raw).entries[0];assert.equal(entry.cents,123456);assert.equal(entry.balance_cents,-1);assert.equal(entry.desc,'Synthetic; "receipt"');
});
test('multiple populated sheets require explicit selection and never merge automatically',()=>{
 const sheets=['First','Second'].map(sheet=>({sheet,data:[['tarih','açıklama','tutar'],['2026-10-01',sheet,{xlsxNumber:'-2.50'}]]}));
 assert.deepEqual(workbookToCsv(sheets),{sheets:['First','Second']});const r=workbookToCsv(sheets,'Second');assert.equal(parseImport(r.raw).entries[0].desc,'Second');assert.throws(()=>workbookToCsv(sheets,'Missing'));
});
test('unsupported Excel headers, date serials and fractional cents fail closed',()=>{
 for(const data of [[['not','a','bank'],['x','y','z']],[header,[{xlsxNumber:'47000'},'','','Text','10,00']],[header,['2026-10-01','','','Text',{xlsxNumber:'10.001'}]]])assert.throws(()=>workbookToCsv([{sheet:'QA',data}]));
});
test('source date calendar validation and localized errors do not echo source content',()=>{
 assert.equal(sourceDate('30.10.2026'),'2026-10-30');assert.throws(()=>sourceDate('31.02.2026'));for(const language of ['de','tr'])assert(!bankFileMessage({code:'unknown',message:'SECRET'},language).includes('SECRET'));
});
