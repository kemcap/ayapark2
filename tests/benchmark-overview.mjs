import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {renderPage} from '../ui.mjs?v=5.10.0';
if(!process.argv[2])throw Error('Pass a detached baseline worktree directory; see tests/README.md');
const {renderPage:baseline}=await import(pathToFileURL(path.resolve(process.argv[2],'ui.mjs')));
const d=fullDemo();
d.transactions=Array.from({length:1729},(_,i)=>({id:'t'+i,date:'2026-10-10',cents:i%4?1000:-500,desc:'Payment A-'+(i%10+1),category:'Aidat'}));
d.persons.push(...Array.from({length:40},(_,i)=>({id:'extra'+i,full_name:'Synthetic Person '+i})));
const s={data:d,mode:'demo',page:'overview',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'},period:'2026-10'};
assert.equal(renderPage(s),baseline(s));
const times={before:[],after:[]};
for(let i=0;i<5;i++)for(const [name,fn] of i%2?[['after',renderPage],['before',baseline]]:[['before',baseline],['after',renderPage]]){
 const start=performance.now();fn(s);const ms=performance.now()-start;if(i)times[name].push(ms);
}
const median=a=>{a.sort((x,y)=>x-y);return (a[1]+a[2])/2;};
console.log(JSON.stringify({rows:d.transactions.length,persons:d.persons.length,units:d.units.length,runs:4,before_ms:median(times.before),after_ms:median(times.after),html_equal:true,scope:'Node CPU / HTML generation, synthetic fixture, excludes DOM/network/mobile'}));
