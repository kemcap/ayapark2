import {unzipSync,readWorkbook} from './vendor/xlsx-9.3.14/reader.mjs';
import {validateXlsxArchive,workbookToCsv} from './bank-file-adapters.mjs?v=5.9.35';
self.onmessage=async({data})=>{try{
 const bytes=new Uint8Array(data.buffer);validateXlsxArchive(bytes);
 const contents=unzipSync(bytes);if(Object.values(contents).reduce((sum,body)=>sum+body.length,0)>16*1024*1024)throw Object.assign(Error(),{code:'xlsx-archive'});const decoder=new TextDecoder('utf-8',{fatal:true});
 for(const [name,body] of Object.entries(contents)){
  if(body.length>8*1024*1024)throw Object.assign(Error(),{code:'xlsx-archive'});
  if(!name.endsWith('.xml')&&!name.endsWith('.rels'))continue;
  const text=decoder.decode(body);
  if(/<!DOCTYPE|<!ENTITY|<(?:[\w]+:)?f(?:\s|\/|>)|<mergeCell\b|\bhidden=["'](?:1|true)["']|\bstate=["'](?:hidden|veryHidden)["']|TargetMode=["']External["']/i.test(text))throw Object.assign(Error(),{code:'xlsx-active'});
  if(name.includes('worksheets/'))for(const cell of text.matchAll(/\br=["']([A-Z]+)(\d+)["']/g)){let column=0;for(const c of cell[1])column=column*26+c.charCodeAt(0)-64;if(column>32||Number(cell[2])>2001)throw Object.assign(Error(),{code:'rows'});}
 }
 const result=workbookToCsv(await readWorkbook(contents),data.sheet);self.postMessage({ok:true,result});
}catch(error){self.postMessage({ok:false,error:{code:error.code||'read',location:error.location||''}});}};
