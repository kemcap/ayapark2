const bundle=new URLSearchParams(location.search).get('bundle');
if(!['baseline','current'].includes(bundle))throw Error('Invalid bundle');
const base='./'+bundle+'/';
const [{renderPage,labels},{fullDemo},{navigation,unitDetailV3},{buildForm},{updateAssignmentForm},i18n,prefs]=await Promise.all(['ui.mjs','ledger.mjs','v3-ui.mjs','forms.mjs','assignments.mjs','i18n.mjs','preferences.mjs'].map(f=>import(base+f)));
const template=new DOMParser().parseFromString(await (await fetch(base+'index.html')).text(),'text/html');
for(const f of ['styles.css','recovery.css','install-tutorial.css','v4-ui.css']){const link=document.createElement('link');link.rel='stylesheet';link.href=base+f;document.head.append(link);}
let enhance;try{enhance=(await import(base+'ui-accessibility.mjs')).enhanceTables;}catch{}
window.runCase=async c=>{
 document.body.innerHTML=template.body.innerHTML;
 document.body.querySelectorAll('script').forEach(n=>n.remove());
 document.querySelectorAll('img').forEach(n=>{const s=n.getAttribute('src');if(s?.startsWith('./'))n.src=base+s.slice(2);});
 i18n.setLanguage(c.lang);prefs.applyPreferences({language:c.lang,palette:c.palette||'classic',font:c.font||'normal',theme:c.theme,contrast:c.contrast||'normal'},{persist:false});document.documentElement.dataset.theme=c.theme;document.documentElement.lang=c.lang;
 const translate=i18n.bindStaticText(document.body);translate();
 const data=fullDemo();data.role=c.role;const s={data,mode:'demo',page:c.page,period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'},reportFilter:{preset:'all'}};
 if(['unit','assignment_add','assignment_remove','login','allocate','announcement','user_access','person','monthly','permissions','import'].includes(c.page))s.page='overview';
 document.querySelector('#nav').innerHTML=navigation(s,labels,c.width<=1000,null);
 document.querySelector('#content').innerHTML=renderPage(s);
 document.querySelector('#breadcrumb').textContent=labels[s.page];document.querySelector('#roleControl').hidden=false;
 document.querySelector('#roleSelect').value=c.role;document.querySelector('#refreshButton').hidden=true;document.querySelector('#themeToggle').hidden=false;document.querySelector('#languageToggle').hidden=false;
 if(c.page==='unit'){document.querySelector('#detailContent').innerHTML=unitDetailV3(s,'A-4');document.querySelector('#detailDialog').showModal();}
 if(c.page.startsWith('assignment_')){
  if(c.page==='assignment_remove')data.links.push({id:'qa-rep',unit_id:'A-1',person_id:'demo-owner',role:'representative',active:true});
  const built=buildForm(s,c.page,c.page==='assignment_add'?{unit:'A-7'}:{id:'qa-rep'});
  document.querySelector('#actionTitle').textContent=built.title;document.querySelector('#actionFields').innerHTML=built.body;updateAssignmentForm(document.querySelector('#actionFields'),data);document.querySelector('#actionDialog').showModal();
 }
 if(c.page==='login')document.querySelector('#loginDialog').showModal();
 if(['allocate','announcement','user_access','person','monthly','permissions'].includes(c.page)){const built=buildForm(s,c.page,{period:s.period,id:c.page==='permissions'?'demo-staff':undefined,charge:'demo-own-charge'});document.querySelector('#actionTitle').textContent=built.title;document.querySelector('#actionFields').innerHTML=built.body;document.querySelector('#actionDialog').showModal();}
 if(c.page==='import'){document.querySelector('#importDialog').showModal();const help=document.querySelector('.import-help');if(help)help.open=true;}
 if(c.page==='settings')document.querySelectorAll('.appearance-settings,.bookkeeping-details').forEach(n=>n.open=true);
 if(enhance)enhance(document);else for(const table of document.querySelectorAll('.table-wrap table')){const headings=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());for(const tr of table.querySelectorAll('tbody tr'))[...tr.children].forEach((td,i)=>{if(!td.hasAttribute('colspan')&&!td.dataset.label)td.dataset.label=headings[i]||'';});}
 await document.fonts.ready; // Layout reads below synchronously flush style/layout; no hidden-tab animation-frame delay.
 const viewport=document.documentElement.clientWidth;
 const offenders=[...document.querySelectorAll('body *')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.right>viewport+2&&!n.closest('[hidden]')&&getComputedStyle(n).position!=='fixed';}).slice(0,5).map(n=>({tag:n.tagName,class:n.className,right:Math.round(n.getBoundingClientRect().right)}));
 const result={...c,viewport,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>viewport+2,offenders};
 if(c.axe){const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});result.violations=a.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,examples:v.nodes.slice(0,2).map(n=>({target:n.target,summary:n.failureSummary}))}));result.incomplete=a.incomplete.length;result.incompleteRules=a.incomplete.map(x=>x.id);result.axePasses=a.passes.length;}
 return result;
};
document.body.textContent='Testansicht bereit';window.ready=true;
