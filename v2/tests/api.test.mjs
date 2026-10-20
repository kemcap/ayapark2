import test from 'node:test';
import assert from 'node:assert/strict';
import {ReadonlyApi} from '../api.mjs';
const session={access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'user-1'}};
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
function mockApi(role='manager'){
 const calls=[];
 const api=new ReadonlyApi(async(url,options)=>{
  calls.push({url,options});
  if(url.includes('/auth/v1/token'))return response(session);
  if(url.endsWith('/auth/v1/user'))return response({id:'user-1'});
  if(url.includes('/site_sites?'))return response([{id:'site-1',name:'Ayapark 2'}]);
  if(url.includes('/site_staff_memberships?'))return response(role?[{role}]:[]);
  if(url.includes('/site_blocks?'))return response([{id:'block-1',code:'A'}]);
  if(url.includes('/site_resident_units?'))return response([{unit_id:'u1'}]);
  if(url.includes('/site_units?'))return response([{id:'u1',block_id:'block-1',code:'A-1'},{id:'u2',block_id:'block-1',code:'A-2'}]);
  return response(null);
 });return {api,calls};
}
test('connected mode loads only scoped, allowlisted tables and unknown financial values stay null',async()=>{
 const {api,calls}=mockApi();await api.login('example@example.com','example');const d=await api.load();
 assert.equal(d.role,'super');assert.equal(d.units[0].debt,null);assert.equal(d.opening,null);assert.deepEqual(d.transactions,[]);
 for(const {url,options} of calls.filter(c=>c.url.includes('/rest/'))){assert.equal(options.method,'GET');assert.match(options.headers.Authorization,/^Bearer /);assert.ok(url.includes('site_id=eq.site-1')||url.includes('slug=eq.aya-park-2')||url.includes('user_id=eq.user-1'));}
 assert.ok(!calls.some(c=>c.url.includes('ayapark_claims')||c.url.includes('site_people')));
 await assert.rejects(api.read('ayapark_private','select=*'),/kapsamı/);
});
test('resident mapping uses active assignments and ignores unknown membership roles',async()=>{
 for(const role of [null,'unexpected-role']){const {api}=mockApi(role);await api.login('x','y');const d=await api.load();assert.equal(d.role,'resident');assert.deepEqual(d.units.map(u=>u.id),['u1']);}
 for(const role of ['deputy','auditor']){const {api}=mockApi(role);await api.login('x','y');assert.equal((await api.load()).role,'staff');}
});
test('simultaneous reads share one refresh and logout revokes only this session',async()=>{
 const {api,calls}=mockApi();await api.login('x','y');api.expiry=0;
 await Promise.all([api.read('site_units','select=id'),api.read('site_blocks','select=id')]);
 assert.equal(calls.filter(c=>c.url.includes('grant_type=refresh_token')).length,1);
 await api.logout();assert.equal(api.session,null);assert.ok(calls.some(c=>c.url.endsWith('/logout?scope=local')));
});
test('a cancelled login cannot restore credentials after an asynchronous response',async()=>{
 let resolve;const api=new ReadonlyApi(()=>new Promise(r=>resolve=r));
 const pending=api.login('x','y');api.clear();resolve(response(session));
 await assert.rejects(pending,/Oturum değişti/);assert.equal(api.session,null);
});
test('unauthenticated reads fail closed and network errors do not fabricate data',async()=>{
 const {api}=mockApi();await assert.rejects(api.read('site_units','select=id'),/Giriş/);
 const broken=new ReadonlyApi(async()=>response({},403));await assert.rejects(broken.login('x','y'),/erişim/);
 assert.equal(broken.session,null);
});
