import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {enabledOAuthProviders,oauthAuthorizeUrl} from '../oauth-entry.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const handlers=app.slice(app.indexOf('let pendingSetupLoaded=null;'),app.indexOf("$('refreshButton').addEventListener"));
function harness(){
 const elements=new Map(),redirects=[];
 const $=id=>{
  if(!elements.has(id))elements.set(id,{
   value:'',hidden:false,required:false,disabled:false,open:false,textContent:'',listeners:{},
   classList:{add(){},remove(){}},setAttribute(){},focus(){},reset(){},
   reportValidity(){return true;},addEventListener(type,fn){this.listeners[type]=fn;},
   showModal(){this.open=true;},close(){this.open=false;}
  });return elements.get(id);
 };
 const api={async raw(){return {external:{google:true,apple:false}};},async logout(){},
  async setPassword(){},async verifyCode(){},async login(){},
  async load(){return {transactions:[]};},clear(){}};
 const context=vm.createContext({$,api,IS_PREVIEW:false,enabledOAuthProviders,oauthAuthorizeUrl,
  location:{href:'https://kemcap.github.io/ayapark2/',hash:'',pathname:'/ayapark2/',search:'',
   assign(url){redirects.push(url);}},URL,URLSearchParams,history:{replaceState(){}},
  state:{mode:'signedout'},epoch:0,loginBusy:false,loginMethod:'password',
  tr:s=>s,beginLoading:()=>()=>{},syncPreferences:async()=>{},hideLoginPassword(){},
  navigate(){},toast(){},Date,setTimeout(){},applyStaticLanguage(){},render(){},
  document:{dispatchEvent(){}},Event});
 vm.runInContext(handlers,context);return {$,context,redirects};
}
test('login choice is shown first and activation keeps existing OTP setup',()=>{
 assert.match(html,/id="chooseExistingAccess"/);
 assert.match(html,/id="chooseFirstActivation"/);
 assert.match(html,/id="loginFlow" hidden/);
 const h=harness();
 assert.equal(h.$('loginEntryChoice').hidden,false);
 assert.equal(h.$('loginFlow').hidden,true);
 h.$('chooseExistingAccess').listeners.click();
 assert.equal(h.context.loginMethod,'password');
 h.$('loginBack').listeners.click();
 assert.equal(h.$('loginEntryChoice').hidden,false);
 h.$('chooseFirstActivation').listeners.click();
 assert.equal(h.context.loginMethod,'setup');
 assert.equal(h.$('codeFields').hidden,false);
 assert.equal(h.$('loginFooter').hidden,true);
});
test('only real booleans from Supabase enable social providers',()=>{
 assert.deepEqual(enabledOAuthProviders({external:{google:true,apple:false}}),{google:true,apple:false});
 assert.deepEqual(enabledOAuthProviders({external:{google:'true',apple:1}}),{google:false,apple:false});
 const h=harness();assert.equal(h.$('loginGoogle').hidden,true);
 h.$('loginGoogle').listeners.click();assert.equal(h.redirects.length,0);
});
test('OAuth URL requires enabled provider and approved redirect',()=>{
 const enabled={google:true,apple:false};
 const uri=new URL(oauthAuthorizeUrl('google','https://kemcap.github.io/ayapark2/',enabled));
 assert.equal(uri.pathname,'/auth/v1/authorize');
 assert.equal(uri.searchParams.get('provider'),'google');
 assert.equal(uri.searchParams.get('redirect_to'),'https://kemcap.github.io/ayapark2/');
 assert.throws(()=>oauthAuthorizeUrl('apple','https://kemcap.github.io/ayapark2/',enabled));
 assert.throws(()=>oauthAuthorizeUrl('google','https://untrusted.example/ayapark2/',enabled));
});
test('available Google provider is shown and Apple stays hidden',async()=>{
 const h=harness();await vm.runInContext('checkOAuthProviders()',h.context);
 assert.equal(h.$('loginGoogle').hidden,false);
 assert.equal(h.$('loginApple').hidden,true);
 h.$('loginGoogle').listeners.click();
 assert.equal(h.redirects.length,1);
 assert.equal(new URL(h.redirects[0]).searchParams.get('provider'),'google');
});
test('application still checks backend permissions and avoids WhatsApp',()=>{
 assert.match(app,/await api\.load\(\)/);
 assert.match(app,/\[401,403\]\.includes\(error\.status\).*api\.session/);
 assert.doesNotMatch(html,/WhatsApp/i);
});
