import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {validateXlsxArchive} from '../bank-file-adapters.mjs?v=5.10.0';
const archive=extra=>zipSync({'[Content_Types].xml':strToU8('<Types/>'),'xl/workbook.xml':strToU8('<workbook/>'),...extra});
test('supported bounded XLSX archives pass the size and structure gate',()=>{
 const result=validateXlsxArchive(archive());assert.equal(result.entries,2);assert(result.expandedBytes<100);
});
test('not-ZIP, truncated and inconsistent ZIP archives fail closed',()=>{
 const bytes=archive();for(const value of [new Uint8Array(),bytes.slice(0,-5),new Uint8Array(80)])assert.throws(()=>validateXlsxArchive(value));
 const changed=bytes.slice();new DataView(changed.buffer).setUint32(0,0,true);assert.throws(()=>validateXlsxArchive(changed));
});
test('zip traversal, external links and macros are refused before extraction',()=>{
 for(const name of ['../escape.xml','/absolute.xml','xl/externalLinks/externalLink1.xml','xl/vbaProject.bin'])assert.throws(()=>validateXlsxArchive(archive({[name]:strToU8('x')})));
});
test('oversized expanded entries are rejected before the decompressor runs',()=>{
 const bytes=archive(),v=new DataView(bytes.buffer);let central=-1;for(let i=0;i<bytes.length-4;i++)if(v.getUint32(i,true)===0x02014b50){central=i;break;}v.setUint32(central+24,9*1024*1024,true);assert.throws(()=>validateXlsxArchive(bytes),{code:'xlsx-archive'});
});
