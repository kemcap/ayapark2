// Network schedule model, NOT a production timing claim. Same per-request delay.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
if(!process.argv[2])throw Error('Pass a detached baseline directory');
const {AyaparkApi:Before}=await import(pathToFileURL(resolve(process.argv[2],'api.mjs')));
const {AyaparkApi:After}=await import('../api.mjs?v=perf1');
function fixture(Api,role){
 const api=new Api(undefined,{storage:null}),calls=[];api.session={user:{id:'qa-user'},access_token:'synthetic-token'};
 const workspace={capabilities:{admin:role==='manager',finance:role==='manager',people:role==='manager'},current_member:true,entries:[],charges:[],allocations:[],settings:[],persons:[],links:[]};
 const done=async(name,result)=>{calls.push(name);await delay(25);return structuredClone(result);};
 api.read=async table=>done(table,{site_sites:[{id:'s'}],site_staff_memberships:role==='resident'?[]:[{role}],site_units:[{id:'u',block_id:'b',code:'A-1',number:1}],site_blocks:[{id:'b',code:'A'}],site_resident_units:[{unit_id:'u'}],ay2_devir_snapshot:[]}[table]);
 api.readAll=async table=>done(table,[]);
 api.rpc=async name=>done(name,name==='ay5_workspace'?workspace:name==='ay3_staff_directory'||name==='ay3_provider_directory'||name==='ay3_provider_categories'?[]:{});
 api.siteClaims=()=>done('siteClaims',null);
 return {api,calls};
}
const results=[];
for(const role of ['manager','deputy','resident']){
 const times={before:[],after:[]};let count;
 for(let run=0;run<7;run++){
  const f={before:fixture(Before,role),after:fixture(After,role)},out={};
  for(const variant of run%2?['after','before']:['before','after']){const start=performance.now();out[variant]=await f[variant].api.load();if(run)times[variant].push(performance.now()-start);}
  assert.deepEqual(out.before,out.after);assert.deepEqual(f.before.calls.sort(),f.after.calls.sort());count=f.after.calls.length;
 }
 const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
 results.push({role,request_count:count,before_ms:median(times.before),after_ms:median(times.after),same_requests:true,same_result:true});
}
console.log(JSON.stringify({scope:'Synthetic 25 ms per request; 6 measured runs per variant; isolated load scheduling, no production network',results},null,2));
