import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {adminRecoveryHandler} from '../supabase/functions/ay3-admin-recovery/handler.mjs';
const pid='10000000-0000-0000-0000-000000000001';
function fixture(overrides={}){const calls=[];const admin={user:async()=>({id:'manager'}),limit:async()=>true,authorize:async()=>{calls.push('authorize');return 'existing';},account:async id=>{calls.push('account');return {id,email:'resident-905321234567@ayapark2.invalid'};},generate:async email=>{calls.push(email);return {user:{id:'existing'},properties:{hashed_token:'a'.repeat(64)}};},issued:async()=>{calls.push('issued');},...overrides};return {calls,handler:adminRecoveryHandler({enabled:true,origins:new Set(['https://staging.example.invalid']),resetUrl:'https://staging.example.invalid/reset.html',admin,hash:async()=> 'b'.repeat(64)})};}
const input={action:'create',person_id:pid,reason:'Verified in person',confirmed:true};
const req=(body=input,headers={})=>new Request('https://edge.example.invalid',{method:'POST',headers:{Origin:'https://staging.example.invalid',Authorization:'Bearer manager','Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('admin recovery only generates a recovery token for the same existing Auth ID, audits before disclosure',async()=>{const {handler,calls}=fixture();const response=await handler(req());assert.equal(response.status,200);const url=new URL((await response.json()).url);assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice(1)).get('type'),'recovery');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(calls,['authorize','account','resident-905321234567@ayapark2.invalid','issued']);});
test('authorization failure never calls Auth or returns secrets',async()=>{const {handler,calls}=fixture({authorize:async()=>{throw Error('denied');}});const res=await handler(req());assert.equal(res.status,409);assert.deepEqual(calls,[]);assert.deepEqual(await res.json(),{error:'recovery_unavailable'});});
test('unknown actor, malformed confirmation and hostile origin rejected',async()=>{let f=fixture({user:async()=>null});assert.equal((await f.handler(req())).status,401);f=fixture();for(const patch of [{confirmed:false},{reason:'x'},{person_id:'wrong'}])assert.equal((await f.handler(req({...input,...patch}))).status,400);assert.equal((await f.handler(req(input,{Origin:'https://hostile.invalid'}))).status,403);assert.equal(f.calls.length,0);});
test('mismatched generated account or failed final audit never discloses the token',async()=>{for(const override of [{generate:async()=>({user:{id:'other'},properties:{hashed_token:'a'.repeat(64)}})},{issued:async()=>{throw Error('mapping changed');}}]){const {handler}=fixture(override);const res=await handler(req());assert.equal(res.status,409);assert(!(await res.text()).includes('aaaa'));}});
test('bounded payload, invalid JSON and server throttling',async()=>{const {handler}=fixture();assert.equal((await handler(req('x'.repeat(4097)))).status,413);assert.equal((await handler(req('{'))).status,400);const limited=fixture({limit:async()=>false});assert.equal((await limited.handler(req())).status,429);assert.equal(limited.calls.length,0);});
test('disabled recovery never reaches admin methods',async()=>{let called=false;const handler=adminRecoveryHandler({enabled:false,origins:new Set(),admin:{user(){called=true;}}});assert.equal((await handler(req(input,{Origin:''}))).status,503);assert.equal(called,false);});

test('deputy requires an explicit second confirmation before any recovery token is generated',async()=>{
 const calls=[];
 const f=fixture({authorize:async(actor,person,reason,confirm,staffConfirmed)=>{
  calls.push(['authorize',staffConfirmed]);
  if(!staffConfirmed)throw Error('staff_verification_required');
  return 'existing';
 },issued:async(actor,person,user,staffConfirmed)=>{calls.push(['issued',staffConfirmed]);}});
 let response=await f.handler(req());
 assert.equal(response.status,409);
 assert.deepEqual(await response.json(),{error:'staff_verification_required'});
 assert(!f.calls.includes('account'));
 response=await f.handler(req({...input,staff_confirmed:true}));
 assert.equal(response.status,200);
 assert.deepEqual(calls,[['authorize',false],['authorize',true],['issued',true]]);
 const body=await response.json();
 assert.match(body.url,/reset\.html#type=recovery&token_hash=/);
});

test('manager and self-service recovery are explicitly rejected without exposing a link',async()=>{
 for(const code of ['manager_recovery_requires_operator','self_recovery_forbidden']){
  const f=fixture({authorize:async()=>{throw Error(code);}});
  const res=await f.handler(req({...input,staff_confirmed:true}));
  assert.equal(res.status,403);
  assert.deepEqual(await res.json(),{error:code});
  assert.equal(f.calls.length,0);
 }
});

test('malformed staff confirmation is rejected without hitting privileged services',async()=>{
 const f=fixture();
 assert.equal((await f.handler(req({...input,staff_confirmed:'true'}))).status,400);
 assert.equal(f.calls.length,0);
});

test('recovery migration restricts service-role entrypoints and independently checks actor, staff role and person',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261027232500_deputy_recovery_verified.sql',import.meta.url),'utf8');
 for(const rpc of ['ay_auth_recovery_authorize_v2','ay_auth_recovery_issued_v2']){
  assert.match(sql,new RegExp('CREATE OR REPLACE FUNCTION public\\.'+rpc+'\\('));
  assert.match(sql,new RegExp('REVOKE ALL ON FUNCTION public\\.'+rpc));
  assert.match(sql,new RegExp('GRANT EXECUTE ON FUNCTION public\\.'+rpc+'[^;]+ TO service_role;'));
 }
 assert.match(sql,/s\.role='manager'/);
 assert.match(sql,/s\.role IN \('deputy','auditor'\)/);
 assert.match(sql,/target\.auth_user_id=p_actor/);
 assert.match(sql,/p_staff_confirmed IS DISTINCT FROM true/);
 assert.match(sql,/recovery_link_issued/);
});
