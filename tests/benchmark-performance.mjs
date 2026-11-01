// Local CPU benchmark: compare an immutable detached worktree with this checkout.
// No production API or credentials. Equality is checked before timing.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const root=resolve(new URL('..',import.meta.url).pathname);
if(!process.argv[2])throw Error('Usage: node tests/benchmark-performance.mjs BASELINE_DIRECTORY');
const load=(dir,file)=>import(pathToFileURL(resolve(dir,file)));
const [before,after,ledger,finance]=await Promise.all([
 load(process.argv[2],'ui.mjs'),load(root,'ui.mjs'),load(root,'ledger.mjs'),load(root,'finance-demo.mjs')
]);
// Renderers import i18n with a query; use that exact identity for language changes.
const languageModule=dir=>import(new URL('./i18n.mjs?v=5.10.0',pathToFileURL(resolve(dir,'index.html'))));
const languages=await Promise.all([languageModule(process.argv[2]),languageModule(root)]);
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const scale of ['demo','1729-entries']){
 const d=finance.prepareV5Demo(ledger.fullDemo());
 if(scale!=='demo'){
  d.transactions=Array.from({length:1729},(_,i)=>({id:'t'+i,date:'2026-10-10',cents:i%4?1000:-500,desc:'Payment A-'+(i%10+1),category:'Aidat'}));
  const template=d.charges[0];
  d.charges.push(...Array.from({length:1200},(_,i)=>({...template,id:'extra-charge-'+i,unit_id:d.units[i%20].id,cents:1000,due_on:'2026-10-01',reference:'qa-'+i})));
  d.allocations.push(...d.charges.map((c,i)=>({id:'qa-allocation-'+i,charge_id:c.id,entry_id:'t'+(i%1729),cents:500})));
 }
 for(const language of ['tr','de','en']){
  languages.forEach(m=>m.setLanguage(language));
  for(const role of ['super','staff','resident']){
   const data={...d,role};
   for(const page of ['overview','units','dues','transactions','reports','persons','providers','announcements','law','settings','unit']){
    if(role==='resident'&&['transactions','persons','settings'].includes(page))continue;
    const state={data,mode:'demo',page:page==='unit'?'units':page,period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'},reportFilter:{preset:'all'}};
    const fns=[()=>page==='unit'?before.unitDetail(state,'A-4'):before.renderPage(state),()=>page==='unit'?after.unitDetail(state,'A-4'):after.renderPage(state)];
    assert.equal(fns[0](),fns[1](),`${scale}/${language}/${role}/${page}: HTML drift`);
    const times=[[],[]];
    for(let run=0;run<9;run++)for(const index of run%2?[1,0]:[0,1]){const start=performance.now();fns[index]();if(run>=2)times[index].push(performance.now()-start);}
    results.push({scale,language,role,page,before_ms:median(times[0]),after_ms:median(times[1]),html_equal:true});
   }
  }
 }
}
console.log(JSON.stringify({node:process.version,runs:7,scope:'Local Node CPU / HTML generation; excludes DOM, network and mobile hardware',results},null,2));
