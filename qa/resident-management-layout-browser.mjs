// Synthetic browser QA only. Never connects to Supabase or the live user session.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const helper=(await import(process.env.BROWSER_HELPER_MODULE)).default;
const root=resolve(import.meta.dirname,'..'),base='http://127.0.0.1:46589',html=await readFile(resolve(root,'index.html'),'utf8'),styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]),external=[],errors=[];let passed=0;
const check=(n,v)=>{assert(v,n);passed++};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:helper.args,headless:true});
try{
 const context=await browser.newContext();await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==base){external.push(url.hostname);return route.abort();}if(url.pathname==='/export.html')return route.fulfill({body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>',contentType:'text/html'});try{const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+'/'))return route.abort();await route.fulfill({body:await readFile(path),contentType:({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='log')console.log(m.text());});await page.goto(base+'/export.html?resident-management-qa');
 await page.evaluate(async({styles,html})=>{
  const template=new DOMParser().parseFromString(html,'text/html');document.body.innerHTML=template.body.innerHTML;document.querySelectorAll('script').forEach(s=>s.remove());
  await Promise.all(styles.map(href=>new Promise((ok,bad)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.onload=ok;l.onerror=bad;document.head.append(l);})));document.head.insertAdjacentHTML('beforeend','<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>');
  const [{fullDemo},ui,i18n,{prepareV5Demo},pageUI]=await Promise.all([import('/ledger.mjs?v=5.10.0'),import('/v3-ui.mjs?v=5.10.0'),import('/i18n.mjs?v=5.10.0'),import('/finance-demo.mjs?v=5.10.0'),import('/ui.mjs?v=5.10.0')]);
  window.qaRender=({lang,view,design,theme,font,community=true,role='resident'})=>{
   i18n.setLanguage(lang);Object.assign(document.documentElement.dataset,{design,theme,palette:'park',contrast:'normal'});document.documentElement.style.fontSize=font+'px';
   let d=prepareV5Demo(fullDemo());d.role=role;d.communityAccess=community;d.currentMember=true;d.managementRead=role==='staff';d.capabilities={admin:false,people:false,finance:false,announcements:false};d.taskGrants=[{user_id:'staff',tasks:[],management_read:true}];
   d.charges=[{id:'owner-claim',unit_id:'A-4',person_id:'demo-owner',link_id:'demo-owner-link',payer:'owner',category:'Repair',label:'Synthetic owner repair',due_on:'2026-10-01',cents:10000},{id:'tenant-claim',unit_id:'A-4',person_id:'demo-tenant',link_id:'demo-tenant-link',payer:'tenant',category:'Aidat',label:'Synthetic tenant dues',due_on:'2026-10-01',cents:20000}];d.allocations=[{id:'owner-payment',charge_id:'owner-claim',entry_id:'synthetic-entry',cents:3000},{id:'tenant-payment',charge_id:'tenant-claim',entry_id:'synthetic-entry',cents:4000}];d.transactions=[{id:'synthetic-entry',cents:7000,date:'2026-10-15',desc:'Synthetic payment'}];d.siteClaims={own_total_cents:10000,site_total_cents:80000,own_units:[{id:'A-4',code:'A-4',open_cents:10000}],site_unit_count:20};
   if(role==='resident')d.units=d.units.filter(x=>d.ownIds.includes(x.id));
   const s={data:d,mode:'connected',page:view,period:'2026-10',filter:{q:'STALE FILTER',block:'B',status:'debt',type:'all',preset:'all'},reportFilter:{preset:'all'}};
   window.scrollTo(0,0);window.qaState=s;document.querySelector('#content').innerHTML=pageUI.renderPage(s);
   document.querySelector('#content').onclick=e=>{const b=e.target.closest('[data-action="unit"]');if(b){document.querySelector('#detailContent').innerHTML=ui.unitDetailV3(s,b.dataset.id);document.querySelector('#detailDialog').showModal();}};
  };
 },{styles,html});
 for(const width of [320,375,430,768,1440])for(const design of ['classic','modern'])for(const lang of ['de','tr'])for(const view of ['units','overview']){
  await page.setViewportSize({width,height:1100});await page.evaluate(c=>qaRender(c),{lang,view,design,theme:'dark',font:width<=375?22:16});const tag=[width,design,lang,view].join(' ');
  check(tag+' apartment card exists despite stale filters',await page.locator('#content .resident-apartments .apartment-open').count()===1);
  check(tag+' no contact search',await page.locator('#unitSearch').count()===0);
  check(tag+' no redundant drilldown',await page.locator('.claim-drilldown,.claim-metric-trigger').count()===0);
  check(tag+' one apartment card only',await page.locator('#content .apartment-open').count()===1);
  check(tag+' no horizontal content overflow',await page.locator('#content').evaluate(n=>{const bad=n.scrollWidth>n.clientWidth+2;if(bad)console.log(JSON.stringify([...n.querySelectorAll('*')].filter(x=>x.getBoundingClientRect().right>n.getBoundingClientRect().right+2).slice(0,12).map(x=>({tag:x.tagName,cls:x.className,text:x.textContent.slice(0,60),w:x.getBoundingClientRect().width}))));return !bad;}));
  check(tag+' correct card order',await page.locator('#content').evaluate((node,view)=>{const a=node.querySelector('.resident-apartments'),claims=node.querySelector('.resident-claims-panel');return view==='units'?a.compareDocumentPosition(claims)&Node.DOCUMENT_POSITION_FOLLOWING:claims.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING;},view));
  if(width<=768)check(tag+' claim metric spans full available width',await page.locator('.resident-claims-panel>.summary-grid').evaluate(n=>{const child=n.querySelector('.card');return Math.abs(child.getBoundingClientRect().width-n.getBoundingClientRect().width)<3;}));
  if(view==='overview'&&width===375&&lang==='de'&&design==='modern')await page.screenshot({path:resolve(root,'qa/results/resident-overview-mobile-20261031.png'),fullPage:true});
  if(view==='units'&&width===375&&lang==='de'&&design==='modern'){
   await page.locator('.apartment-open').click();check('actual apartment control opens existing detail',await page.locator('#detailDialog').isVisible());check('detail retains attributed finance groups',await page.locator('#detailContent .uf-finance').count()===1&&await page.locator('#detailContent .uf-matches li').count()===2);await page.locator('#detailDialog').evaluate(n=>n.close());
  }
 }
 await page.evaluate(()=>qaRender({lang:'de',view:'units',design:'modern',theme:'light',font:16,community:false}));check('historical/resident fallback still has apartment card',await page.locator('.resident-apartments .apartment-open').count()===1);
 await page.evaluate(()=>qaRender({lang:'de',view:'units',design:'modern',theme:'light',font:16,role:'staff'}));check('management keeps existing search',await page.locator('#unitSearch').count()===1);check('read-only management has no assignment edit controls',await page.locator('[data-action="assignment_add"],[data-action="occupancy"],[data-action="auto_allocate"]').count()===0);
 check('no external transport',external.length===0);check('no JS errors',errors.length===0);
 const result={passed,failed:0,external,errors,scope:'synthetic actual renderers, full production stylesheet cascade, 320/375 enlarged text/430/768/1440, DE/TR, Classic/Modern, resident overview/units, actual unit click, read-only management'};await writeFile(resolve(root,'qa/results/resident-management-layout-browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
