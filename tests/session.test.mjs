import test from 'node:test';
import assert from 'node:assert/strict';
import {AyaparkApi} from '../api.mjs?v=5.6.0';
import {RecoveryApi} from '../recovery-api.mjs?v=5.6.0';
import {buildForm,payloadFor} from '../forms.mjs?v=5.6.0';
import {fullDemo} from '../ledger.mjs?v=5.6.0';
const session=(a='test-access',r='test-refresh',expires_in=3600)=>({access_token:a,refresh_token:r,expires_in,user:{id:'test-user'}});
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
function client(replies,store=storage()){
 const calls=[],api=new AyaparkApi(async(url,init)=>{calls.push({url,...init});const r=replies.shift();if(r instanceof Error)throw r;if(!r)throw Error('Unexpected request');return {ok:!r.status||r.status<400,status:r.status||200,json:async()=>r.body??r};},{storage:store});return {api,calls,store};
}
test('password login persists and a new instance verifies the saved session',async()=>{
 const {api,store}=client([session(),{id:'test-user'}]);await api.login('fake@example.invalid','test-password');assert(api.saved());
 const next=client([{id:'test-user'}],store);assert.equal(await next.api.restore(),true);assert.equal(next.api.session.user.id,'test-user');assert(next.calls[0].url.endsWith('/auth/v1/user'));
});
test('expired access rotates refresh token and persists the new pair',async()=>{
 const {api,store}=client([session('new-access','new-refresh')]);api.accept(session('old','old-refresh',0),api.generation);assert.equal(await api.token(),'new-access');assert.equal(api.saved().refresh_token,'new-refresh');
 const next=client([{id:'test-user'}],store);assert.equal(await next.api.restore(),true);
});
test('parallel API calls share one token refresh',async()=>{
 const {api,calls}=client([session()]);api.accept(session('old','old-refresh',0),api.generation);await Promise.all([api.token(),api.token(),api.token()]);assert.equal(calls.length,1);
});
test('another tab uses the already rotated token from shared storage',async()=>{
 const store=storage(),first=client([session('rotated','rotated-refresh')],store),second=client([],store);
 first.api.accept(session('old','old-refresh',0),0);second.api.session=first.api.session;second.api.expiry=0;
 await first.api.token();assert.equal(await second.api.token(),'rotated');assert.equal(second.calls.length,0);
});
test('a network outage preserves the saved session for retry',async()=>{
 const {api}=client([new TypeError('Offline')]);api.accept(session('old','old-refresh',0),0);await assert.rejects(api.token());assert(api.saved());
});
test('invalid refresh clears storage and requires sign-in',async()=>{
 const {api}=client([{status:401,body:{}}]);api.accept(session('old','old-refresh',0),0);await assert.rejects(api.token());assert.equal(api.saved(),null);assert.equal(api.session,null);
});
test('logout removes persistent credentials and late refresh cannot revive them',async()=>{
 let finish;const store=storage(),api=new AyaparkApi(()=>new Promise(r=>finish=r),{storage:store});api.accept(session('old','old-refresh',0),0);const pending=api.token();api.clear();finish({ok:true,status:200,json:async()=>session()});await assert.rejects(pending);assert.equal(api.saved(),null);
});
test('recovery never writes into ordinary login storage',async()=>{
 const store=storage(),normal=client([],store);normal.api.accept(session(),0);const recovery=new RecoveryApi(async()=>({ok:true,status:200,json:async()=>({id:'test-user'})}));await recovery.begin({accessToken:'recovery-test',refreshToken:'recovery-test-refresh',type:'recovery'});assert.equal(normal.api.saved().access_token,'test-access');assert.equal(recovery.storage,null);
});
test('OTP verification creates a persistent session without signing up users',async()=>{
 const {api,calls}=client([session()]);await api.verifyCode('fake@example.invalid','123456');assert.equal(JSON.parse(calls[0].body).type,'email');assert(api.saved());
});
test('user access requires confirmation and submits a boolean',()=>{
 const s={data:fullDemo()},built=buildForm(s,'user_access');const f=new FormData();f.set('person_id','fake-person');assert.throws(()=>payloadFor('user_access',f,built.context));f.set('confirmation','on');f.set('access_role','resident');assert.equal(payloadFor('user_access',f,built.context).confirmation,true);
});
