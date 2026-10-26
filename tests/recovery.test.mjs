import test from 'node:test';
import assert from 'node:assert/strict';
import {RecoveryApi,takeRecoveryLocation} from '../recovery-api.mjs?v=5.8.0';

test('default fetch keeps the browser Window receiver',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async function(){
   assert.equal(this,globalThis,'Native Window.fetch rejects another receiver');
   return {ok:true,status:200,json:async()=>({})};
  };
  await new RecoveryApi().raw('/auth/v1/settings');
 }finally{globalThis.fetch=original;}
});

function client(replies){
 const calls=[];
 const api=new RecoveryApi(async(url,init)=>{
  calls.push({url,...init});const value=replies.shift();
  if(value instanceof Error)throw value;
  return {ok:value.status===undefined||value.status<400,status:value.status||200,json:async()=>value.body??value};
 });return {api,calls};
}
test('reset request uses the precise new recovery URL and sends only email',async()=>{
 const {api,calls}=client([{}]);await api.requestReset('test@example.invalid','https://example.invalid/reset.html');
 assert.equal(new URL(calls[0].url).searchParams.get('redirect_to'),'https://example.invalid/reset.html');
 assert.deepEqual(JSON.parse(calls[0].body),{email:'test@example.invalid'});
 assert.equal(calls[0].headers.Authorization,undefined);
});
test('URL credentials and errors are removed before any API request',()=>{
 let cleaned;const r=takeRecoveryLocation({hash:'#access_token=access&refresh_token=refresh&type=recovery',search:'',pathname:'/reset.html'},{replaceState:(_,__,url)=>cleaned=url});
 assert.equal(cleaned,'/reset.html');assert.equal(r.payload.type,'recovery');assert.equal(r.present,true);
 const e=takeRecoveryLocation({hash:'#error=access_denied&error_code=otp_expired',search:'',pathname:'/reset.html'},{replaceState:()=>{}});assert.equal(e.error,true);
});
test('a recovery callback with missing credentials produces a visible invalid-link state',()=>{
 const result=takeRecoveryLocation({hash:'',search:'?type=recovery',pathname:'/reset.html'},{replaceState(){}});
 assert.equal(result.present,true);
 assert.equal(result.payload.type,'recovery');
});

test('numeric email recovery codes verify with the recovery type',async()=>{
 const {api,calls}=client([{access_token:'a',refresh_token:'r',expires_in:3600,user:{id:'u'}}]);
 await api.beginWithEmailCode('sample@example.invalid','123456');
 assert.equal(JSON.parse(calls[0].body).type,'recovery');
 assert.equal(api.recovery,true);
});
test('verified recovery updates password once and clears the session',async()=>{
 const {api,calls}=client([{id:'verified-user'}, {id:'verified-user'}, {}]);
 await api.begin({accessToken:'access',refreshToken:'refresh',type:'recovery'});
 await api.savePassword('fictitious-test-password');
 assert.equal(new URL(calls[0].url).pathname,'/auth/v1/user');assert.equal(calls[0].method,'GET');
 assert.deepEqual(JSON.parse(calls[1].body),{password:'fictitious-test-password'});assert.equal(calls[1].method,'PUT');
 assert.equal(calls[1].headers.Authorization,'Bearer access');assert.equal(api.session,null);assert.equal(api.recovery,false);
 assert(calls.every(c=>new URL(c.url).pathname.startsWith('/auth/v1/')));
 await assert.rejects(api.savePassword('another-test-password'));
});
test('invalid tokens never allow a password update',async()=>{
 const {api,calls}=client([{status:401,body:{message:'Invalid token'}}]);
 await assert.rejects(api.begin({accessToken:'invalid',refreshToken:'refresh',type:'recovery'}));
 await assert.rejects(api.savePassword('fictitious-test-password'));assert.equal(calls.length,1);assert.equal(api.session,null);
});
test('token hash is verified using recovery type before editing password',async()=>{
 const {api,calls}=client([{access_token:'a',refresh_token:'r',expires_in:3600,user:{id:'u'}}]);
 await api.begin({tokenHash:'fictional-hash',type:'recovery'});
 assert.deepEqual(JSON.parse(calls[0].body),{token_hash:'fictional-hash',type:'recovery'});assert.equal(api.recovery,true);
});
test('non-recovery sessions and missing credentials are rejected',async()=>{
 const {api,calls}=client([]);
 await assert.rejects(api.begin({accessToken:'a',refreshToken:'r',type:'invite'}));
 await assert.rejects(api.begin({type:'recovery'}));assert.equal(calls.length,0);
});
test('a response arriving after the session is cleared cannot restore recovery access',async()=>{
 let resolve;const api=new RecoveryApi(()=>new Promise(r=>resolve=r));
 const pending=api.begin({accessToken:'a',refreshToken:'r',type:'recovery'});api.clear();
 resolve({ok:true,status:200,json:async()=>({id:'u'})});
 await assert.rejects(pending);assert.equal(api.recovery,false);assert.equal(api.session,null);
});

test('fragment recovery hashes are read and immediately removed from the address',()=>{
 let clean=false;const result=takeRecoveryLocation({hash:'#type=recovery&token_hash=secret-hash',search:'',pathname:'/reset.html'},{replaceState(){clean=true;}});
 assert.equal(clean,true);assert.equal(result.payload.tokenHash,'secret-hash');
});
test('temporary password save failure preserves the verified session for retry with six plain characters',async()=>{
 const {api,calls}=client([{id:'u'},{status:503,body:{}},{id:'u'},{}]);
 await api.begin({accessToken:'a',refreshToken:'r',type:'recovery'});
 await assert.rejects(api.savePassword('abcdef'));assert.equal(api.recovery,true);assert.equal(api.session.user.id,'u');
 await api.savePassword('abcdef');assert.equal(api.session,null);assert.equal(calls.filter(c=>c.method==='PUT').length,2);
});
