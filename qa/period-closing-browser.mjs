// Native browser UI tests with synthetic RPC data only; no real account/backend.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const helper=(await import(process.env.BROWSER_HELPER_MODULE)).default;
const root=resolve(import.meta.dirname,'..'),base='http://127.0.0.1:46585',errors=[],external=[];let passed=0;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper.args,headless:true});
const check=(name,ok)=>{assert(ok,name);passed++;};
try{
 const context=await browser.newContext({viewport:{width:375,height:900}});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push(u.hostname);return route.abort();}try{const p=resolve(root,'.'+u.pathname);if(!p.startsWith(root+'/'))return route.abort();await route.fulfill({body:await readFile(p),contentType:({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'})[extname(p)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const lang of ['de','tr']){
  await page.goto(base+'/export.html?qa='+lang);
  await page.evaluate(async lang=>{
   const {periodClosings}=await import('/period-closing-ui.mjs?v=5.9.37');window.calls=[];window.permitted=true;window.failNext=false;window.rows=[];
   const snap={kind:'month',period:'2026-09-01',ends_on:'2026-09-30',opening_cents:10000,income_cents:2345,expense_cents:0,cash_adjustment_cents:0,closing_cents:12345,unresolved_count:1,unreviewed_staged_count:0,fingerprint:'synthetic-fingerprint',period_complete:true};
   window.ui=periodClosings({allowed:()=>window.permitted,site:()=> 'synthetic-site',language:()=>lang,rpc:async(name,args)=>{window.calls.push({name,args});if(name==='ay3_closing_workspace')return {admin:true,rows:window.rows};if(name==='ay3_closing_preview')return snap;if(name==='ay3_finalize_period'){if(window.failNext){window.failNext=false;throw Error('Synthetic network failure');}window.rows=[{id:'closing-one',...snap,snapshot:snap,status:'closed',source_reference:args.p_source_reference,review_note:args.p_note}];return {id:'closing-one',status:'closed'};}if(name==='ay3_reopen_period'){window.rows[0]={...window.rows[0],status:'reopened',reopen_reason:args.p_reason};return {status:'reopened'};}throw Error('Unexpected RPC');}});await window.ui.open();
  },lang);
  const dialog=page.locator('dialog');check(lang+' history and controls visible',await dialog.isVisible());
  await dialog.locator('[name=period]').fill('2026-09');await dialog.locator('[data-closing=preview] button').click();await dialog.locator('[data-closing=finalize]').waitFor();
  check(lang+' explicit source attestations start unchecked',await dialog.locator('[name=complete]').isChecked()===false&&await dialog.locator('[name=verified]').isChecked()===false);
  await dialog.locator('[name=balance]').fill('123,45');await dialog.locator('[name=source]').fill('<img src=x onerror=alert(1)> synthetic source');await dialog.locator('[name=note]').fill('Synthetic unresolved amount reviewed');
  await dialog.locator('[data-closing=finalize] button').click();check(lang+' unchecked attestations prevent RPC',await page.evaluate(()=>!calls.some(x=>x.name==='ay3_finalize_period')));
  await dialog.locator('[name=complete]').check();await dialog.locator('[name=verified]').check();await page.evaluate(()=>window.failNext=true);await dialog.locator('[data-closing=finalize] button').click();await dialog.locator('[role=status]').filter({hasText:/fehlgeschlagen|tamamlanamadı/}).waitFor();
  check(lang+' failed save retains preview',await dialog.locator('[data-closing=finalize]').count()===1);
  await dialog.locator('[data-closing=finalize] button').click();await dialog.locator('[data-closing=reopen]').waitFor();
  const saved=await page.evaluate(()=>calls.filter(x=>x.name==='ay3_finalize_period').map(x=>x.args));check(lang+' retry has identical id and exact cents',saved.length===2&&saved[0].p_request===saved[1].p_request&&saved[1].p_statement_cents===12345&&saved[1].p_fingerprint==='synthetic-fingerprint');
  check(lang+' source safely escaped',await dialog.locator('img').count()===0&&(await dialog.innerText()).includes('<img src=x'));
  await dialog.locator('[name=reason]').fill('Synthetic correction reviewed');await dialog.locator('[data-closing=reopen] button').click();await page.waitForFunction(()=>window.rows[0]?.status==='reopened');check(lang+' explicit reason submitted',await page.evaluate(()=>calls.some(x=>x.name==='ay3_reopen_period'&&x.args.p_reason==='Synthetic correction reviewed')));
  await page.evaluate(()=>ui.close());check(lang+' closing clears private dialog',await dialog.innerText()==='');
  check(lang+' denied access cannot reopen workspace',await page.evaluate(async()=>{window.permitted=false;const n=calls.length;try{await ui.open();return false;}catch{return calls.length===n;}}));
  const layout=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);check(lang+' mobile document fits',layout);
 }
 check('no external requests',external.length===0);check('no runtime errors',errors.length===0);const result={passed,failed:0,browser:browser.version(),scope:'synthetic DE/TR closure preview, explicit attestation, retry, escaping, reopen and revoked access',errors,external};await writeFile(resolve(root,'qa/results/period-closing-browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
