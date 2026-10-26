import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {filteredTransactions,assertRange,selectedRange,norm,creditAvailable} from '../v3-domain.mjs';
// Compare the exact reviewed starting implementation, never another live checkout.
const ref='deef766bbc22f2aa7b7bb4d6bf8b2ffc64e74c4c';
const source=execFileSync('git',['show',ref+':v3-domain.mjs'],{encoding:'utf8'});
const body=source.slice(source.indexOf('export function filteredTransactions('),source.indexOf('\nexport function financialSeries'));
const inRange=(date,{from='',to=''}={})=>(!from||date>=from)&&(!to||date<=to);
const baseline=Function('assertRange','selectedRange','norm','creditAvailable','inRange','return '+body.replace('export ',''))(assertRange,selectedRange,norm,creditAvailable,inRange);
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
for(const n of [1729,10000]){
 const transactions=Array.from({length:n},(_,i)=>({id:'t'+i,date:'2026-10-10',cents:i%4?1000:-1000,desc:'payment '+i,category:'Aidat',reversal_of:i%31===0?'t'+(i-1):null}));
 const allocations=transactions.filter((_,i)=>i%3===0).map(t=>({entry_id:t.id,cents:500}));
 const credits=transactions.filter((_,i)=>i%7===0).map(t=>({entry_id:t.id,cents:500}));
 const state={data:{transactions,allocations,credits},filter:{q:'',type:'unmatched',preset:'all'}};
 assert.deepEqual(filteredTransactions(state),baseline(state));
 const times={before:[],after:[]};
 for(let i=0;i<11;i++)for(const [name,fn] of i%2?[['after',filteredTransactions],['before',baseline]]:[['before',baseline],['after',filteredTransactions]]){
  const start=performance.now();fn(state);const ms=performance.now()-start;if(i>1)times[name].push(ms);
 }
 console.log(JSON.stringify({rows:n,allocations:allocations.length,credits:credits.length,runs:9,before_ms:median(times.before),after_ms:median(times.after),environment:process.version,scope:'Node CPU only; synthetic data; not mobile page latency'}));
}
