// Native browser extraction. Every request is fulfilled locally or rejected.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const helper=process.env.BROWSER_HELPER_MODULE?(await import(process.env.BROWSER_HELPER_MODULE)).default:null;
const root=resolve(import.meta.dirname,'..'),fixtures=resolve(process.env.QA_FIXTURES||resolve(root,'../bank-file-browser-fixtures')),out=resolve(process.env.QA_OUTPUT||resolve(root,'../bank-file-browser-evidence')),base='http://127.0.0.1:46582';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper?.args,headless:true});const reports=[];let passed=0;
const check=(name,ok)=>{assert(ok,name);passed++;};
try{
 const context=await browser.newContext();const external=[];
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==base){external.push(url.hostname);return route.abort();}const file=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+'/'))return route.abort();try{return route.fulfill({body:await readFile(file),contentType:({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Not found'});}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.goto(base+'/?demo=1');await page.waitForSelector('#content h1');
 async function extract(path,options={}){const bytes=await readFile(path);return page.evaluate(async({bytes,name,options})=>{const {readBankFile}=await import('/bank-file-reader.mjs?v=5.9.35');const {parseImport}=await import('/v3-import.mjs?v=5.8.1');const {reviewImport}=await import('/import-review.mjs?v=5.9.33');try{const r=await readBankFile(new File([new Uint8Array(bytes)],name),options);if(r.sheets)return r;const parsed=parseImport(r.raw);return {ok:true,metadata:r.metadata,rows:parsed.entries.length,amounts:parsed.entries.map(e=>e.cents),descriptionLengths:parsed.entries.map(e=>e.desc.length),digest:!!r.digest,digestValue:r.digest,balanced:reviewImport(parsed.entries).mayImport};}catch(e){return {ok:false,code:e.code||e.name,location:e.location,message:e.message};}},{bytes:[...bytes],name:path.split('/').at(-1),options});}
 const pdf=await extract(resolve(fixtures,'synthetic-bank.pdf'));check('two-page native PDF extraction',pdf.ok&&pdf.rows===2&&pdf.metadata.pages===2);check('native PDF fee direction',pdf.amounts[1]===-250);reports.push({kind:'synthetic-pdf',...pdf});
 const xlsx=await extract(resolve(fixtures,'synthetic-bank.xlsx'));check('native Excel extraction',xlsx.ok&&xlsx.rows===2);check('native Excel exact cents and dates',xlsx.amounts[0]===10000&&xlsx.amounts[1]===-250);reports.push({kind:'synthetic-xlsx',...xlsx});
 const multiple=await extract(resolve(fixtures,'multiple-sheets.xlsx'));check('multiple worksheets require explicit choice',multiple.sheets?.join(',')==='First,Second');const selected=await extract(resolve(fixtures,'multiple-sheets.xlsx'),{sheet:'Second'});const firstSelected=await extract(resolve(fixtures,'multiple-sheets.xlsx'),{sheet:'First'});check('worksheet-specific batch identity prevents silent cross-sheet skipping',selected.digestValue!==firstSelected.digestValue);check('only selected worksheet is converted',selected.ok&&selected.rows===1&&selected.amounts[0]===5000);
 const formula=await extract(resolve(fixtures,'formula.xlsx'));check('formula workbook is refused',!formula.ok&&formula.code==='xlsx-active');const image=await extract(resolve(fixtures,'image-only.pdf'));check('image-only PDF is refused',!image.ok&&image.code==='pdf-layout');
 for(const [index,path] of JSON.parse(process.env.QA_PDF_SOURCES||'[]').entries()){
  const result=await extract(path);if(!result.ok)console.error(JSON.stringify({source:index+1,...result}));check('provided source '+(index+1)+' parses completely',result.ok);check('provided source '+(index+1)+' retains running balance transitions',result.balanced);reports.push({kind:'provided-source-'+(index+1),rows:result.rows,metadata:result.metadata,maxDescription:Math.max(...result.descriptionLengths)});
 }
 check('no external network access',external.length===0);check('no runtime errors',errors.length===0);
 for(const report of reports)delete report.digestValue;const result={passed,browser:browser.version(),reports,errors,external};await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
