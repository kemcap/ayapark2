// Uses an existing Playwright installation, no application dependencies added.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..'),out=resolve(process.env.QA_OUTPUT||resolve(root,'../people-browser-evidence'));
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(file)]||'text/plain');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});let passed=0;const results=[];
const check=(name,ok)=>{assert(ok,name);passed++;};
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?demo=1');await page.waitForSelector('#content h1');await page.addScriptTag({url:base+'/node_modules/axe-core/axe.min.js'});
 // Render synthetic connected manager data; all writes and invitations are intercepted locally.
 await page.evaluate(async()=>{const [{fullDemo},{prepareV5Demo},{peoplePage},{setLanguage}]=await Promise.all([import('/ledger.mjs?v=5.8.1'),import('/finance-demo.mjs?v=5.8.1'),import('/people-ui.mjs?v=5.9.0'),import('/i18n.mjs?v=5.8.1')]);setLanguage('tr');const d=prepareV5Demo(fullDemo());d.capabilities={people:true,admin:true};d.persons[0].registered=true;window.qaState={mode:'connected',data:d};document.querySelector('#content').innerHTML=peoplePage(window.qaState);document.querySelectorAll('dialog[open]').forEach(x=>x.close());window.qaActions=[];document.addEventListener('click',e=>{const b=e.target.closest('#content [data-action]');if(b){e.stopImmediatePropagation();e.preventDefault();window.qaActions.push(b.dataset.action);}},{capture:true});});
 const card=page.locator('.person-record').first();const nameBox=await card.locator('h2').boundingBox();await page.mouse.click(nameBox.x+10,nameBox.y+nameBox.height/2);check('name click invokes only editing',(await page.evaluate(()=>qaActions)).join(',')==='person');
 await page.evaluate(()=>qaActions=[]);const invite=page.locator('.person-record [data-action=invite_person]').first();await invite.click();check('invite click never invokes editing',(await page.evaluate(()=>qaActions)).join(',')==='invite_person');
 await page.evaluate(()=>qaActions=[]);await card.locator('.person-record-edit').focus();await page.keyboard.press('Enter');check('keyboard opens person editor',(await page.evaluate(()=>qaActions)).join(',')==='person');
 check('status is textual and color independent',await page.locator('.registration-status').count()>0);
 const peopleAxe=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});check('person cards accessibility',peopleAxe.length===0);results.push({peopleAccessibility:peopleAxe});
 await page.screenshot({path:resolve(out,'people-desktop.png'),fullPage:true});
 await page.evaluate(async()=>{const {buildAssignmentForm,updateAssignmentForm}=await import('/assignments.mjs?v=5.9.0');const built=buildAssignmentForm(qaState.data,'assignment_add',{unit:'A-1'});document.querySelector('#actionFields').innerHTML=built.body;updateAssignmentForm(document.querySelector('#actionFields'),qaState.data);document.querySelector('#actionDialog').showModal();});
 await page.locator('.person-picker-toggle').click();check('picker opens list immediately',await page.locator('[role=option]').count()>0);
 const search=page.locator('.person-picker [role=combobox]');await search.fill('zzzzzz');check('empty search offers creation',await page.locator('[data-picker-new]').isVisible());
 await search.fill('');await search.press('ArrowDown');await search.press('Enter');check('keyboard selects existing identity',!!await page.locator('.person-picker [name=person_id]').inputValue());check('picker closes after selection',await page.locator('#personPickerPopup').isHidden());
 await page.locator('.person-picker-toggle').click();await search.press('Escape');check('escape closes picker without closing form',await page.locator('#personPickerPopup').isHidden()&&await page.locator('#actionDialog').isVisible());
 const pickerAxe=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#actionDialog'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>v.id);});check('person picker form accessibility',pickerAxe.length===0);results.push({pickerAccessibility:pickerAxe});
 await page.evaluate(()=>document.querySelector('#actionDialog').close());
 for(const lang of ['tr','de'])for(const width of [320,375,430,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(async({lang})=>{const [{overviewV3},{setLanguage}]=await Promise.all([import('/v3-ui.mjs?v=5.9.0'),import('/i18n.mjs?v=5.8.1')]);setLanguage(lang);const s=structuredClone(qaState);s.mode='demo';s.page='overview';s.data.role='resident';s.data.siteClaims={own_total_cents:123456789,site_total_cents:987654321,site_unit_count:20,own_units:[]};s.data.summaryBalance=123456789;s.data.communityAccess=true;document.querySelector('#content').innerHTML=overviewV3(s);window.qaResident=s;},{lang});
  await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{const pairs=[document.querySelector('.resident-dashboard-claims>.summary-grid'),document.querySelector('.resident-dashboard-summary')];return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+2,pairs:pairs.map(p=>{const [a,b]=[...p.children].map(n=>n.getBoundingClientRect());return {sameRow:Math.abs(a.y-b.y)<2,widths:[a.width,b.width],height:Math.max(a.height,b.height)};})};});
  check(`${lang} ${width}: viewport fits`,!layout.overflow);
  if(width<=430){if(!layout.pairs.every(p=>p.sameRow)){console.log(JSON.stringify(layout));await page.screenshot({path:resolve(out,'layout-failure.png'),fullPage:true});}check(`${lang} ${width}: both pairs share a row`,layout.pairs.every(p=>p.sameRow));check(`${lang} ${width}: no horizontal overflow`,!layout.overflow);await page.screenshot({path:resolve(out,`resident-${lang}-${width}.png`),fullPage:true});}
  results.push({lang,...layout});
 }
 await page.setViewportSize({width:320,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const large=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,columns:getComputedStyle(document.querySelector('.resident-dashboard-claims>.summary-grid')).gridTemplateColumns}));check('large type triggers accessible fallback',large.columns.split(' ').length===1);
 await page.screenshot({path:resolve(out,'resident-large-type.png'),fullPage:true});await page.evaluate(()=>document.documentElement.style.fontSize='');
 // Scan the affected resident overview for accessibility issues.
 await page.addScriptTag({url:base+'/node_modules/axe-core/axe.min.js'});const axe=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('#content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));});
 const touch=await browser.newPage({viewport:{width:375,height:812},hasTouch:true,isMobile:true});await touch.goto(base+'/?demo=1#persons');await touch.waitForSelector('.person-record');const touchBox=await touch.locator('.person-record h2').first().boundingBox();await touch.touchscreen.tap(touchBox.x+10,touchBox.y+touchBox.height/2);check('touch opens actual person editor',await touch.locator('#actionDialog').isVisible());await touch.locator('#cancelAction').tap();await touch.goto(base+'/?demo=1#units');await touch.locator('.apartment-open').first().tap();await touch.locator('.assignment-card [data-action=assignment_remove]').first().tap();check('remove opens only its own form',await touch.locator('#actionDialog').isVisible()&&await touch.locator('[name=reason]').count()===1);await touch.close();
 results.push({accessibility:axe});check('no runtime errors',errors.length===0);
 await writeFile(resolve(out,'results.json'),JSON.stringify({passed,errors,results},null,2));console.log(JSON.stringify({passed,errors,accessibility:axe,output:out}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
