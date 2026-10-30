// Native UI checks; synthetic responses, no Supabase connection or account session.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),helper=(await import(process.env.BROWSER_HELPER_MODULE)).default;
const root=resolve(import.meta.dirname,'..'),base='http://127.0.0.1:46586',site='20000000-0000-0000-0000-000000000001',requests=[],errors=[];let passed=0,mode='data';
const row={kind:'month',period:'2026-09-01',ends_on:'2026-09-30',opening_cents:10000,income_cents:2345,expense_cents:0,cash_adjustment_cents:0,closing_cents:12345,review_note:'PRIVATE NOTE'};
const check=(name,ok)=>{assert(ok,name);passed++;};const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper.args,headless:true});
try{
 const context=await browser.newContext({viewport:{width:375,height:900},acceptDownloads:true});
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==base){requests.push({url:request.url(),headers:request.headers(),body:request.postData()});if(url.pathname!=='/rest/v1/rpc/ay3_public_report_summaries')return route.abort();if(mode==='failure')return route.fulfill({status:503,body:'Unavailable'});return route.fulfill({contentType:'application/json',body:JSON.stringify(mode==='empty'?[]:[row])});}try{const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+'/'))return route.abort();return route.fulfill({body:await readFile(path),contentType:({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/public-reports.html?site='+site);await page.locator('#document table').waitFor();check('public display has no private notes',!(await page.locator('body').innerText()).includes('PRIVATE'));
 check('mobile public report has no page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const downloadPromise=page.waitForEvent('download');await page.locator('#excel').click();check('public Excel download works',(await downloadPromise).suggestedFilename().endsWith('.xlsx'));
 await page.locator('#language').selectOption('de');await page.locator('#document h1').filter({hasText:'Freigegebene'}).waitFor();check('German public report available',await page.locator('html').getAttribute('lang')==='de');
 check('anonymous request has no account authorization or cookies',requests.every(r=>!r.headers.authorization&&!r.headers.cookie&&JSON.parse(r.body).p_site===site));
 check('only the dedicated public RPC requested',requests.every(r=>r.url.endsWith('/rpc/ay3_public_report_summaries')));
 mode='empty';await page.locator('#refresh').click();await page.locator('#status').filter({hasText:'Keine öffentlichen'}).waitFor();check('empty public releases hide export actions',await page.locator('#excel').isHidden()&&await page.locator('#print').isHidden());
 mode='failure';await page.locator('#refresh').click();await page.locator('#status').filter({hasText:'nicht geladen'}).waitFor();check('failed refresh clears old public numbers',await page.locator('#document').innerText()==='');
 const n=requests.length;await page.goto(base+'/public-reports.html?site=invalid');await page.locator('#status').filter({hasText:/gültiger|Geçerli/}).waitFor();check('invalid site does not query backend',requests.length===n);
 for(const lang of ['de','tr']){
  await page.goto(base+'/export.html?admin='+lang);
  await page.evaluate(async({lang,row,site})=>{
   const {reportReleases}=await import('/report-release-ui.mjs?v=5.9.38');window.calls=[];window.permitted=true;window.releaseRows=[];window.failOnce=false;
   window.releaseUI=reportReleases({admin:()=>window.permitted,community:()=>true,site:()=>site,language:()=>lang,rpc:async(name,args)=>{calls.push({name,args});if(name==='ay3_closing_workspace')return {admin:true,rows:[{id:'synthetic-closing',kind:'month',period:row.period,status:'closed'}]};if(name==='ay3_report_release_workspace')return window.releaseRows;if(name==='ay3_community_report_summaries')return [row];if(name==='ay3_release_report'){if(window.failOnce){window.failOnce=false;throw Error('Synthetic lost response');}window.releaseRows=[{id:'synthetic-release',closing_id:'synthetic-closing',audience:args.p_audience,created_at:'2026-10-30'}];return {id:'synthetic-release'};}if(name==='ay3_revoke_report_release'){window.releaseRows[0].revoked_at='2026-10-30';return {revoked:true};}throw Error(name);}});await window.releaseUI.openAdmin();
  },{lang,row,site});
  const dialog=page.locator('dialog');await dialog.locator('[data-release=publish]').waitFor();check(lang+' no default audience or approval',await dialog.locator('[name=audience]').inputValue()===''&&!(await dialog.locator('[name=confirm]').isChecked()));
  await dialog.locator('[name=closing]').selectOption('synthetic-closing');await dialog.locator('[name=audience]').selectOption('public');await dialog.locator('[data-release=publish] button').click();check(lang+' no publish without explicit checkbox',await page.evaluate(()=>!calls.some(x=>x.name==='ay3_release_report')));
  await dialog.locator('[name=confirm]').check();await page.evaluate(()=>window.failOnce=true);await dialog.locator('[data-release=publish] button').click();await dialog.locator('[role=status]').filter({hasText:/nicht bestätigt|onaylanmadı/}).waitFor();await dialog.locator('[data-release=publish] button').click();await dialog.locator('[data-release=revoke]').waitFor();
  check(lang+' retry retains request identity',await page.evaluate(()=>{const r=calls.filter(x=>x.name==='ay3_release_report');return r.length===2&&r[0].args.p_request===r[1].args.p_request&&r[1].args.p_audience==='public';}));
  await dialog.locator('[data-release=revoke] button').click();await dialog.locator('[role=status]').filter({hasText:/protokolliert|kaydedildi/}).waitFor();check(lang+' explicit revocation submitted',await page.evaluate(()=>calls.some(x=>x.name==='ay3_revoke_report_release')));
  await page.evaluate(()=>releaseUI.close());check(lang+' admin dialog cleared on close',await dialog.innerText()==='');
  await page.evaluate(async()=>{window.permitted=false;await releaseUI.openAdmin();});check(lang+' revoked admin cannot open controls',!(await dialog.isVisible()));
  await page.evaluate(async()=>{await releaseUI.openCommunity();});await dialog.locator('table').waitFor();check(lang+' community summary exposes no private notes',!(await dialog.innerText()).includes('PRIVATE'));await page.evaluate(()=>releaseUI.close());
 }
 check('no runtime errors',errors.length===0);const result={passed,failed:0,browser:browser.version(),errors,scope:'synthetic anonymous report projection and exports, opt-in DE/TR audience selection, retries, revocation and role boundaries'};await writeFile(resolve(root,'qa/results/report-release-browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
