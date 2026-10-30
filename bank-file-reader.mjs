import {BankFileError,pdfPagesToCsv} from './bank-file-adapters.mjs?v=5.9.35';
const cancelled=()=>new DOMException('Cancelled','AbortError');
function readXlsx(buffer,{sheet,signal}){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./bank-xlsx-worker.mjs?v=5.9.35',import.meta.url),{type:'module'});
 const finish=(error,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(value);};
 const abort=()=>finish(cancelled()),timer=setTimeout(()=>finish(new BankFileError('timeout')),20000);signal?.addEventListener('abort',abort,{once:true});
 worker.onmessage=({data})=>data.ok?finish(null,data.result):finish(new BankFileError(data.error.code,data.error.location));
 worker.onerror=()=>finish(new BankFileError('read'));worker.postMessage({buffer,sheet},[buffer]);
});}
async function readPdf(buffer,{signal,onProgress}){
 const pdfjs=await import('./vendor/pdfjs-6.4.299/pdf.min.mjs');if(signal?.aborted)throw cancelled();
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs-6.4.299/pdf.worker.min.mjs',import.meta.url).href;
 const task=pdfjs.getDocument({data:new Uint8Array(buffer),disableFontFace:true,useSystemFonts:true,useWasm:false,useWorkerFetch:false,stopAtErrors:true,enableXfa:false});
 let timedOut=false;const abort=()=>{void task.destroy();},timer=setTimeout(()=>{timedOut=true;abort();},60000);task.onPassword=abort;signal?.addEventListener('abort',abort,{once:true});
 try{const doc=await task.promise;if(doc.numPages<1||doc.numPages>100)throw new BankFileError('pages');const pages=[];let characters=0;
  for(let i=1;i<=doc.numPages;i++){
   if(signal?.aborted)throw cancelled();const page=await doc.getPage(i),content=await page.getTextContent();if(content.items.length>20000)throw new BankFileError('pdf-row',i);
   characters+=content.items.reduce((n,item)=>n+(item.str?.length||0),0);if(characters>2000000)throw new BankFileError('size');pages.push(content.items);page.cleanup();onProgress?.(i,doc.numPages);
  }
  return pdfPagesToCsv(pages);
 }catch(error){if(signal?.aborted)throw cancelled();if(timedOut)throw new BankFileError('timeout');throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);await task.destroy();}
}
export async function readBankFile(file,options={}){
 if(file.size>2*1024*1024)throw new BankFileError('size');if(options.signal?.aborted)throw cancelled();
 const extension=file.name.toLowerCase().split('.').at(-1);if(!['csv','pdf','xlsx'].includes(extension))throw new BankFileError('type');
 if(extension==='csv')return {raw:await file.text(),metadata:{format:'csv'}};
 const buffer=await file.arrayBuffer();if(options.signal?.aborted)throw cancelled();const prefix=new Uint8Array(buffer,0,Math.min(8,buffer.byteLength));
 if(extension==='pdf'&&new TextDecoder().decode(prefix.slice(0,5))!=='%PDF-'||extension==='xlsx'&&(prefix[0]!==0x50||prefix[1]!==0x4b))throw new BankFileError('type');
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(options.signal?.aborted)throw cancelled();const result=extension==='pdf'?await readPdf(buffer,options):await readXlsx(buffer,options);
 const batchDigest=result.metadata?.sheet?[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(digest+'\n'+result.metadata.sheet)))].map(x=>x.toString(16).padStart(2,'0')).join(''):digest;return {...result,digest:batchDigest};
}
