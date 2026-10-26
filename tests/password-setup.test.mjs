import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {AyaparkApi} from '../api.mjs?v=5.1.0';

test('recovery callback at root goes to reset page with credentials preserved',()=>{
 const script=readFileSync(new URL('../recovery-redirect.js',import.meta.url),'utf8');
 const original='https://kemcap.github.io/ayapark2/#access_token=fake-token&refresh_token=fake-refresh&type=recovery';
 let redirected='';
 const location={href:original,hash:new URL(original).hash,search:'',replace:uri=>{redirected=uri;}};
 vm.runInNewContext(script,{location,URL,URLSearchParams});
 assert.equal(new URL(redirected).pathname,'/ayapark2/reset.html');
 assert.equal(new URL(redirected).hash,new URL(original).hash);
});
test('recovery link without credentials still reaches the error page, not a silent reset loop',()=>{
 const script=readFileSync(new URL('../recovery-redirect.js',import.meta.url),'utf8');
 const href='https://kemcap.github.io/ayapark2/?type=recovery';
 let redirected='';
 const location={href,hash:'',search:'?type=recovery',replace:uri=>{redirected=uri;}};
 vm.runInNewContext(script,{location,URL,URLSearchParams});
 assert.equal(new URL(redirected).pathname,'/ayapark2/reset.html');
});

test('normal login URLs do not redirect to the reset page',()=>{
 const script=readFileSync(new URL('../recovery-redirect.js',import.meta.url),'utf8');
 let called=false;const href='https://kemcap.github.io/ayapark2/#access_token=sample&type=magiclink';
 const location={href,hash:new URL(href).hash,search:'',replace(){called=true;}};
 vm.runInNewContext(script,{location,URL,URLSearchParams});
 assert.equal(called,false);
});
test('setting a first password uses only the authenticated Supabase user endpoint',async()=>{
 const calls=[],api=new AyaparkApi(async(url,init)=>{
  calls.push({url,...init});return {ok:true,status:200,json:async()=>({id:'sample-user'})};
 },{persist:false});
 await assert.rejects(api.setPassword('example-password'));
 api.accept({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'sample-user'}},api.generation);
 await api.setPassword('example-password');
 assert.equal(new URL(calls[0].url).pathname,'/auth/v1/user');
 assert.equal(calls[0].method,'PUT');
 assert.equal(calls[0].headers.Authorization,'Bearer test-access');
 assert.deepEqual(JSON.parse(calls[0].body),{password:'example-password'});
 assert.equal(api.session.user.id,'sample-user');
});
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const handlers=source.slice(source.indexOf('let pendingSetupLoaded=null;'),source.indexOf("$('refreshButton').addEventListener"));
function harness(){
 const elements=new Map(),calls={verify:0,login:0,password:0,load:0,logout:0};
 const $=id=>{
  if(!elements.has(id))elements.set(id,{value:'',hidden:false,required:false,disabled:false,open:false,
   listeners:{},classList:{add(){},remove(){}},addEventListener(k,f){this.listeners[k]=f;},
   setAttribute(){},focus(){},reset(){},showModal(){this.open=true;},close(){this.open=false;}});
  return elements.get(id);
 };
 const api={
  async verifyCode(){calls.verify++;},async login(){calls.login++;},
  async setPassword(){calls.password++;},async load(){calls.load++;return {role:'super',transactions:[]};},
  async logout(){calls.logout++;},saved(){return null;}
 };
 const context=vm.createContext({$,api,state:{mode:'signedout'},epoch:0,loginBusy:false,loginMethod:'password',
  tr:x=>x,beginLoading:()=>()=>{},syncPreferences:async()=>{},hideLoginPassword(){},
  navigate(){},toast(){},URLSearchParams,Date,setTimeout(){},location:{hash:'',pathname:'/',search:''},
  history:{replaceState(){}},applyStaticLanguage(){},render(){},document:{dispatchEvent(){}},Event});
 vm.runInContext(handlers,context);
 return {$,api,calls,context,submit:()=>$('loginForm').listeners.submit({preventDefault(){}})};
}
test('first password setup verifies once, shows password fields and finishes login',async()=>{
 const h=harness();h.$('loginDialog').showModal();
 h.$('createPasswordEntry').listeners.click();
 assert.equal(h.context.loginMethod,'setup');
 h.$('email').value='first@example.invalid';h.$('loginCode').value='123456';
 await h.submit();
 assert.equal(h.calls.verify,1);assert.equal(h.calls.load,1);
 assert.equal(h.context.loginMethod,'setup_password');
 assert.equal(h.$('setupPasswordFields').hidden,false);
 h.$('setupPassword').value='new-sample-password';h.$('setupPasswordConfirm').value='new-sample-password';
 await h.submit();
 assert.equal(h.calls.password,1);assert.equal(h.calls.verify,1);
 assert.equal(h.context.state.mode,'connected');
});
test('mismatched first passwords cannot be saved',async()=>{
 const h=harness();h.$('createPasswordEntry').listeners.click();
 h.$('email').value='first@example.invalid';h.$('loginCode').value='123456';await h.submit();
 h.$('setupPassword').value='one';h.$('setupPasswordConfirm').value='two';
 await h.submit();assert.equal(h.calls.password,0);assert.equal(h.context.loginMethod,'setup_password');
});
