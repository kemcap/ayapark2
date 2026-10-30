// End-to-end file input/preview checks against a synthetic local app session.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const helper=process.env.BROWSER_HELPER_MODULE?(await import(process.env.BROWSER_HELPER_MODULE)).default:null;
const root=resolve(import.meta.dirname,'..'),fixtures=resolve(process.env.QA_FIXTURES||resolve(root,'../bank-file-browser-fixtures')),out=resolve(process.env.QA_OUTPUT||resolve(root,'../bank-import-ui-evidence')),base='http://127.0.0.1:46583';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper?.args,headless:true});let passed=0;const results=[],errors=[],external=[];
const check=(label,ok)=>{assert(ok,label);passed++;};
try{
 const context=await browser.newContext();await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push({host:u.hostname,method:route.request().method()});return route.abort();}const path=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!path.startsWith(root+'/'))return route.abort();try{return route.fulfill({body:await readFile(path),contentType:({'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[extname(path)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Missing'});}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
 const upload=name=>page.locator('#csvFile').setInputFiles(resolve(fixtures,name));
 const ready=async()=>{try{await page.waitForFunction(()=>!document.querySelector('#commitImport').disabled);}catch(error){console.error('PREVIEW',await page.locator('#importPreview').innerText());console.error('RUNTIME',errors);throw error;}};
 for(const lang of ['de','tr'])for(const width of [375,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/?demo=1&qa='+lang+width+'#transactions');await page.waitForSelector('#content h1');if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#languageToggle').click();await page.locator('[data-action=import]').first().click();
  await upload('synthetic-bank.pdf');await ready();check(`${lang}/${width} PDF reaches actual preview`,(await page.locator('#importPreview').innerText()).includes('PDF · 2'));
  const layout=await page.locator('#importDialog').evaluate(n=>({width:n.clientWidth,scroll:n.scrollWidth}));check(`${lang}/${width} preview fits dialog`,layout.scroll<=layout.width+2);
  if(width===375)await page.screenshot({path:resolve(out,'native-import-'+lang+'.png'),fullPage:true});
  await upload('synthetic-bank.xlsx');await ready();check(`${lang}/${width} Excel reaches actual preview`,(await page.locator('#importPreview').innerText()).includes('First'));
  await upload('multiple-sheets.xlsx');await page.waitForSelector('#bankSheetSelect');check(`${lang}/${width} no automatic sheet selection`,await page.locator('#commitImport').isDisabled());await page.locator('#bankSheetSelect').selectOption('Second');await ready();check(`${lang}/${width} explicitly selected worksheet only`,(await page.locator('#importPreview').innerText()).includes('Second'));
  await upload('formula.xlsx');await page.waitForFunction(()=>/Formeln|Formüller/.test(document.querySelector('#importPreview').textContent));check(`${lang}/${width} formulas block commit`,await page.locator('#commitImport').isDisabled());
  await upload('image-only.pdf');await page.waitForFunction(()=>/PDF-Tabellenformat|PDF tablo/.test(document.querySelector('#importPreview').textContent));check(`${lang}/${width} unreadable PDF blocks commit`,await page.locator('#commitImport').isDisabled());
  await upload('synthetic-bank.xlsx');await ready();await page.locator('#commitImport').click();await page.waitForFunction(()=>/hareket kaydedildi|Buchungen erfasst/.test(document.querySelector('#importPreview').textContent));check(`${lang}/${width} synthetic import completes without production access`,(await page.locator('#importPreview').innerText()).startsWith('2'));
  results.push({lang,width,layout});
 }
 check('no runtime errors',errors.length===0);check('no external requests',external.length===0);const r={passed,browser:browser.version(),results,errors,external};await writeFile(resolve(out,'results.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));
}finally{await browser.close();}
