import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const german=readFileSync(new URL('../i18n.mjs',import.meta.url),'utf8');
const handlers=code.slice(code.indexOf("$('cancelLogin').addEventListener"),code.indexOf("$('refreshButton').addEventListener"));

function harness(){
 const elements=new Map();
 const $=id=>{
  if(!elements.has(id))elements.set(id,{
   hidden:false,required:false,disabled:false,value:'',open:false,focusCalled:0,textContent:'',
   listeners:{},classList:{add(){},remove(){}},addEventListener(type,listener){this.listeners[type]=listener;},
   setAttribute(){},focus(){this.focusCalled++;},reset(){},showModal(){this.open=true;},close(){this.open=false;}
  });
  return elements.get(id);
 };
 const context=vm.createContext({
  $,api:{async logout(){},async verifyCode(){},async login(){},async load(){return {transactions:[]};},async setPassword(){}},
  state:{mode:'signedout'},epoch:0,loginBusy:false,loginMethod:'password',
  tr:text=>text,beginLoading:()=>()=>{},syncPreferences:async()=>{},hideLoginPassword(){},
  navigate(){},toast(){},URLSearchParams,Date,setTimeout(){},location:{hash:'',pathname:'/',search:''},
  history:{replaceState(){}},applyStaticLanguage(){},render(){},document:{dispatchEvent(){}},Event
 });
 vm.runInContext(handlers,context);
 return {$,context};
}

test('the login dialog shows two explicit user journeys before the credential form',()=>{
 assert.match(markup,/<div id="loginStart">/);
 assert.match(markup,/<section id="loginCredentials"[^>]*hidden>/);
 for(const id of ['loginExistingPath','loginActivatePath','loginBackToStart'])assert.match(markup,new RegExp('id="'+id+'"'));
 assert.match(markup,/auth-onboarding\.css/);
});

test('existing account uses password by default and offers email code',()=>{
 const h=harness();vm.runInContext('showLoginStart()',h.context);
 assert.equal(h.$('loginStart').hidden,false);
 assert.equal(h.$('loginCredentials').hidden,true);
 h.$('loginExistingPath').listeners.click();
 assert.equal(h.context.loginMethod,'password');
 assert.equal(h.$('loginCredentials').hidden,false);
 assert.equal(h.$('passwordFields').hidden,false);
 h.$('useCode').listeners.click();
 assert.equal(h.context.loginMethod,'code');
 assert.equal(h.$('codeFields').hidden,false);
});

test('first activation requires an email code, then returns to the entrance',()=>{
 const h=harness();vm.runInContext('showLoginStart()',h.context);
 h.$('loginActivatePath').listeners.click();
 assert.equal(h.context.loginMethod,'setup');
 assert.equal(h.$('loginMethodChooser').hidden,true);
 assert.equal(h.$('codeFields').hidden,false);
 assert.equal(h.$('loginCode').required,true);
 h.$('loginBackToStart').listeners.click();
 assert.equal(h.$('loginStart').hidden,false);
 assert.equal(h.$('loginCredentials').hidden,true);
 assert.equal(h.context.loginMethod,'password');
});

test('new invitation screen copy is bilingual and does not advertise unauthorized signup',()=>{
 for(const label of ['Zaten hesabım var','İlk kez erişimi etkinleştir','Yönetim hesabınızı önceden tanımlar.'])assert.ok(german.includes(label));
 assert.ok(!/id="loginSignup"/.test(markup));
});
