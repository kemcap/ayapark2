import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const handlers=source.slice(source.indexOf("$('cancelLogin').addEventListener"),source.indexOf("$('refreshButton').addEventListener"));
const restore=source.slice(source.indexOf('async function resumeSession()'),source.indexOf("window.addEventListener('storage'"));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const flush=()=>new Promise(r=>setImmediate(r));
function harness(){
 const elements=new Map(),calls={logout:0,load:0,restore:0,navigate:0};
 const $=id=>{if(!elements.has(id))elements.set(id,{value:'',open:false,disabled:false,classList:{remove(){},add(){}},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},showModal(){this.open=true;},close(){if(!this.open)return;this.open=false;queueMicrotask(()=>this.listeners.close?.());},reset(){},reportValidity(){return true;}});return elements.get(id);};
 const loaded={role:'super',transactions:[{date:'2026-10-01'}]};let saved=false;
 const api={async login(){saved=true;},async verifyCode(){saved=true;},saved:()=>saved,async restore(){calls.restore++;return saved;},async load(){calls.load++;return loaded;},async logout(){calls.logout++;saved=false;}};
 const context=vm.createContext({$,api,nativePreviewRole:d=>d?.role==='super'?'super':d?.role==='staff'?'staff':null,state:{mode:'signedout'},epoch:0,loginBusy:false,loginMethod:'password',tr:s=>s,beginLoading:()=>()=>{},syncPreferences:async()=>{},hideLoginPassword(){},navigate(){calls.navigate++;},toast(){},URLSearchParams,Date,setTimeout(){},location:{hash:'',pathname:'/',search:''},history:{replaceState(){}}});
 vm.runInContext(handlers+'\n'+restore,context);
 return {$,api,context,calls,loaded,submit:()=>$('loginForm').listeners.submit({preventDefault(){}}),restore:()=>vm.runInContext('resumeSession()',context)};
}
test('password login closes its dialog and keeps the verified session',async()=>{const h=harness();h.$('loginDialog').showModal();await h.submit();await flush();assert.equal(h.$('loginDialog').open,false);assert.equal(h.context.state.mode,'connected');assert.equal(h.api.saved(),true);assert.equal(h.calls.logout,0);assert.equal(h.$('loginSubmit').disabled,false);});
test('restoring a session while the login dialog is open dismisses it',async()=>{const h=harness(),pending=deferred();h.api.restore=()=>pending.promise;const result=h.restore();h.$('loginDialog').showModal();pending.resolve(true);await result;await flush();assert.equal(h.context.state.mode,'connected');assert.equal(h.$('loginDialog').open,false);assert.equal(h.calls.logout,0);});
test('background restore cannot supersede a manual login in progress',async()=>{const h=harness(),pending=deferred();h.api.load=async()=>{h.calls.load++;return pending.promise;};h.$('loginDialog').showModal();const result=h.submit();await flush();const background=h.restore(),restores=h.calls.restore;pending.resolve(h.loaded);await Promise.all([result,background]);await flush();assert.equal(restores,0);assert.equal(h.$('loginDialog').open,false);assert.equal(h.context.state.mode,'connected');assert.equal(h.$('loginSubmit').disabled,false);assert.equal(h.calls.logout,0);});
test('failed login keeps the dialog open and shows its error',async()=>{const h=harness();h.api.login=async()=>{throw Error('Invalid credentials');};h.$('loginDialog').showModal();await h.submit();assert.equal(h.$('loginDialog').open,true);assert.equal(h.$('loginMessage').textContent,'Invalid credentials');assert.equal(h.context.state.mode,'signedout');assert.equal(h.$('loginSubmit').disabled,false);});
test('cancelling a pending login prevents a late result from connecting',async()=>{const h=harness(),pending=deferred();h.api.load=()=>pending.promise;h.$('loginDialog').showModal();const result=h.submit();await flush();h.$('loginDialog').close();await flush();pending.resolve(h.loaded);await result;assert.equal(h.context.state.mode,'signedout');assert.equal(h.calls.logout,1);});
