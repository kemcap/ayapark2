// Synthetic local browser checks. External requests are always blocked.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const helper=process.env.BROWSER_HELPER_MODULE?(await import(process.env.BROWSER_HELPER_MODULE)).default:null;
const root=resolve(import.meta.dirname,'..'),out=resolve(process.env.QA_OUTPUT||resolve(root,'../phase2-import-browser-evidence'));
await mkdir(out,{recursive:true});
// All responses are fulfilled from the checkout; no listening socket or live account.
const base='http://127.0.0.1:46581';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper?.args,headless:true});let passed=0;const results=[],errors=[],blocked=[];
const check=(name,ok)=>{assert(ok,name);passed++;};
try{
 const context=await browser.newContext();await context.route('**/*',async route=>{if(route.request().url().startsWith(base+'/')){const url=new URL(route.request().url()),path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))return route.abort();try{return await route.fulfill({body:await readFile(path),contentType:({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[extname(path)]||'text/plain'});}catch{return route.fulfill({status:404,body:'Not found'});}}blocked.push({method:route.request().method(),host:new URL(route.request().url()).hostname});return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
 const header='date;reference;counterparty;description;income;expense;unit;iban;balance';
 const source=header+'\n2026-10-01;QA-1;Synthetic Sender;Receipt;100,00;;A-1;;1100,00\n2026-10-02;QA-2;Synthetic Bank;Fee;;2,50;;;1097,50';
 for(const lang of ['de','tr'])for(const width of [320,375,768,1440]){
  console.log('Checking',lang,width);await page.setViewportSize({width,height:960});await page.goto(base+'/?demo=1&qa='+lang+'-'+width+'#transactions');await page.waitForSelector('#content h1');
  if(await page.locator('html').getAttribute('lang')!==lang)await page.locator('#languageToggle').click();
  await page.locator('[data-action="import"]').first().click();await page.waitForSelector('#importDialog[open]');
  await page.locator('#csvFile').setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(source)});
  await page.waitForFunction(()=>!document.querySelector('#commitImport').disabled);
  check(`${lang} ${width}: matching source is available for explicit import`,await page.locator('#importPreview').innerText().then(s=>s.includes(lang==='de'?'Laufende Salden stimmen':'Ara bakiyeler hareketlerle uyumlu')));
  await page.locator('#csvFile').setInputFiles({name:'mismatch.csv',mimeType:'text/csv',buffer:Buffer.from(source.replace('1097,50','1097,51'))});
  await page.waitForFunction(()=>document.querySelector('#importPreview').textContent.includes('Hiçbir kayıt')||document.querySelector('#importPreview').textContent.includes('Es wurde nichts'));
  check(`${lang} ${width}: one kuruş mismatch blocks actual import button`,await page.locator('#commitImport').isDisabled());
  const withoutBalances=source.replace('1100,00','').replace('1097,50','');
  await page.locator('#csvFile').setInputFiles({name:'no-balances.csv',mimeType:'text/csv',buffer:Buffer.from(withoutBalances)});
  await page.waitForFunction(()=>!document.querySelector('#commitImport').disabled);
  check(`${lang} ${width}: missing balances are visibly unverified`,await page.locator('#importPreview').innerText().then(s=>s.includes(lang==='de'?'Kein Saldoabgleich möglich':'Bakiye kontrolü yapılamıyor')));
  const layout=await page.locator('#importDialog').evaluate(n=>({scroll:n.scrollWidth,client:n.clientWidth}));check(`${lang} ${width}: import dialog fits`,layout.scroll<=layout.client+2);
  await page.locator('#importDialog').evaluate(n=>n.close());
  await page.evaluate(async({lang})=>{const [{contactPanel},{setLanguage}]=await Promise.all([import('/contact-requests.mjs?v=5.10.0'),import('/i18n.mjs?v=5.10.0')]);setLanguage(lang);const data={userId:'synthetic-user',capabilities:{admin:true},contactWorkspace:{persons:[],requests:[{id:'synthetic-request',full_name:'Synthetic Person',status:'pending',previous_email:'old@example.invalid',new_email:'new@example.invalid',new_phone:'+90 555 000 00 00'}]}};document.querySelector('#content').innerHTML=contactPanel({mode:'connected',data});},{lang});
  await page.locator('[data-contact-review] textarea').fill('Synthetic independent review');
  await page.locator('[data-contact-review] [value=approve]').click();
  check(`${lang} ${width}: approval requires independent verification`,await page.locator('[data-contact-status]').innerText().then(s=>s.includes(lang==='de'?'unabhängige Prüfung':'bağımsız doğrulamayı')));
  const contactLayout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));check(`${lang} ${width}: contact approval has no page overflow`,contactLayout.scroll<=contactLayout.width+2);
  await page.addScriptTag({url:base+'/node_modules/axe-core/axe.min.js'});
  const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));});
  check(`${lang} ${width}: contact form accessibility`,violations.length===0);results.push({lang,width,layout,contactLayout,violations});
  if(width===375)await page.screenshot({path:resolve(out,'contact-approval-'+lang+'.png'),fullPage:true});
 }
 check('no application runtime errors',errors.length===0);check('no attempted external writes',blocked.every(r=>r.method==='GET'||r.method==='HEAD'));
 await writeFile(resolve(out,'results.json'),JSON.stringify({passed,browser:browser.version(),errors,blocked,results},null,2));console.log(JSON.stringify({passed,errors,blocked,output:out}));
}finally{await browser.close();}
