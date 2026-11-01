// End-to-end local browser checks. All external requests are blocked.
// Usage: node tests/performance-browser.mjs [BASELINE_DIRECTORY]
// Optional: CHROMIUM_PATH, CHROMIUM_ARGS (JSON array), PERF_OUTPUT.
import {chromium} from 'playwright';
import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const current=resolve(new URL('..',import.meta.url).pathname);
const roots={after:current,...(process.argv[2]?{before:resolve(process.argv[2])}:{})};
const server=http.createServer(async(req,res)=>{
 try{
  const parts=decodeURIComponent(new URL(req.url,'http://localhost').pathname).split('/'),root=roots[parts[1]];
  if(!root)throw Error();
  const file=resolve(root,parts.slice(2).join('/')||'index.html');if(!file.startsWith(root+sep))throw Error();
  const bytes=await readFile(file);
  res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const launch=()=>chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:JSON.parse(process.env.CHROMIUM_ARGS||'[]')});
let browser;
const results=[],snapshots=new Map(),screenshots=new Map();
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
try{
 for(const [variant] of Object.entries(roots).reverse())for(const width of [390,1440]){
  browser=await launch();
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
  const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:width===390?4:1});
  await page.goto(origin+'/'+variant+'/?demo=1');
  await page.waitForSelector('#content .card');await page.waitForSelector('#ay2Splash',{state:'detached'});
  const modules=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.includes('.mjs')).map(x=>new URL(x.name).pathname.split('/').at(-1)));
  const duplicateModules=modules.length-new Set(modules).size;
  const nav=async target=>{
   return page.evaluate(target=>new Promise(resolve=>{
    const start=performance.now();
    if(location.hash==='#'+target){resolve(0);return;}
    document.addEventListener('ay5:view',()=>{void document.querySelector('#content').offsetHeight;resolve(performance.now()-start);},{once:true});
    location.hash=target;
   }),target);
  };
  const timing={blocks:[],unit:[],navigation:[]};
  for(const language of ['tr','de','en']){
   await page.evaluate(async language=>{const {setLanguage}=await import('./i18n.mjs?v=5.10.0');setLanguage(language);},language);
   for(const role of ['super','staff','resident']){
    console.error(variant,width,language,role);
    await page.selectOption('#roleSelect',role);
    for(const target of ['units','dues','reports','announcements','providers','law','overview']){
     if(target==='reports'&&!await page.locator('#nav a[href="#reports"]').count())continue;
     timing.navigation.push(await nav(target));
     const html=await page.locator('#content').innerHTML(),key=JSON.stringify([width,language,role,target]);
     if(variant==='before')snapshots.set(key,html);else if(roots.before)assert.equal(html,snapshots.get(key),key+' content changed');
     if(language==='tr'&&role==='super'&&target==='units'){
      const image=await page.locator('#content').screenshot({animations:'disabled'});
      if(variant==='before')screenshots.set(width,image);else if(roots.before)assert.deepEqual(image,screenshots.get(width),'Apartment design changed');
      if(process.env.PERF_SCREENSHOT_DIR){await mkdir(process.env.PERF_SCREENSHOT_DIR,{recursive:true});await writeFile(resolve(process.env.PERF_SCREENSHOT_DIR,variant+'-'+width+'.png'),image);}
     }
    }
    await nav('units');
    if(role!=='resident'){
     const durations=await page.evaluate(()=>{
      const cards=[...document.querySelectorAll('#unitResults .apartment-card')],container=document.querySelector('#unitResults'),times=[];
      for(const block of ['A','B','B','A','A','B','B']){
       const start=performance.now();document.querySelector('[data-block="'+block+'"]').click();void container.offsetHeight;times.push(performance.now()-start);
       if(!cards.every((node,i)=>node===container.querySelectorAll('.apartment-card')[i]))throw Error('Block filter replaced cards');
      }
      return times;
     });timing.blocks.push(...durations);
    }
    const detail=await page.evaluate(()=>{
     const card=[...document.querySelectorAll('.apartment-card [data-action="unit"]')].find(n=>!n.hidden&&!n.closest('[hidden]'));
     if(!card)throw Error('No apartment card');
     const start=performance.now();card.click();const dialog=document.querySelector('#detailDialog');if(!dialog.open)throw Error('Apartment did not open');
     void dialog.offsetHeight;const ms=performance.now()-start;dialog.close();return ms;
    });timing.unit.push(detail);
    if(role!=='resident'){
     await nav('transactions');assert(await page.locator('#transactionResults table').count());
     await nav('persons');assert(await page.locator('#peopleSearch').count());
    }
   }
  }
  assert.deepEqual(errors,[],variant+' browser errors');assert.deepEqual(external,[],variant+' must not use live APIs');
  results.push({variant,width,cpu_throttle:width===390?4:1,duplicate_module_requests:duplicateModules,block_ms:median(timing.blocks),unit_ms:median(timing.unit),navigation_ms:median(timing.navigation),samples:timing,external_requests:external.length,browser_errors:errors});
  await context.close();await browser.close();
 }
 // Directly count forced layouts in the real recurring affordance, preserving its appearance.
 for(const [variant] of Object.entries(roots).reverse()){
  browser=await launch();
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.addInitScript(()=>{const original=window.setInterval;window.setInterval=(fn,delay,...args)=>{if(delay===3000){window.auditPulse=fn;return 0;}return original(fn,delay,...args);};});
  await page.goto(origin+'/'+variant+'/?demo=1');await page.waitForSelector('#content .apartment-card');await page.waitForSelector('#ay2Splash',{state:'detached'});
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  await page.evaluate(()=>{void document.body.offsetHeight;});const before=await metrics();await page.evaluate(()=>{window.auditPulse();void document.body.offsetHeight;});const after=await metrics();
  results.push({variant,pulse_layouts:after.LayoutCount-before.LayoutCount});await context.close();await browser.close();
 }
 for(const r of results.filter(r=>r.variant==='after')){
  if('pulse_layouts' in r)assert(r.pulse_layouts<=2,'Recurring affordance forced more than two layouts');
  else {assert.equal(r.duplicate_module_requests,0);assert(r.block_ms<150);assert(r.unit_ms<200);assert(r.navigation_ms<200);}
 }
 const output={browser:browser.version(),visual_comparisons:screenshots.size,scope:'Local synthetic demo; handler + style/layout CPU; mobile viewport with 4x CPU throttling; no mobile hardware or production network',html_comparisons:snapshots.size,results};
 if(process.env.PERF_OUTPUT){await mkdir(resolve(process.env.PERF_OUTPUT,'..'),{recursive:true});await writeFile(process.env.PERF_OUTPUT,JSON.stringify(output,null,2)+'\n');}
 console.log(JSON.stringify(output,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
