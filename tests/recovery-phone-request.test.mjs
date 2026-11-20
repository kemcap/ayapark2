import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {RecoveryApi,takeRecoveryLocation} from '../recovery-api.mjs?v=20261120-phone-request';
import {normalizePhone,loginWithCountry} from '../auth-policy.mjs?v=20261120-country-login';
import {countryCallingCode} from '../phone-country-codes.mjs?v=20261120-worldwide';

test('national phone request uses the existing country-aware normalization',()=>{
 assert.equal(normalizePhone(loginWithCountry('0532 123 45 67',countryCallingCode('TR'))),'+905321234567');
 assert.equal(normalizePhone(loginWithCountry('0151 12345678',countryCallingCode('DE'))),'+4915112345678');
 assert.equal(normalizePhone(loginWithCountry('+4915112345678',countryCallingCode('TR'))),'+4915112345678');
});

test('phone request does not send credentials or create a new user',async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{calls.push({url,body:JSON.parse(init.body),headers:init.headers});return {ok:true,status:200,json:async()=>({ok:true})};};
 const api=new RecoveryApi(fetcher,{persist:false});
 await api.requestPhoneReset('+905321234567');
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/functions\/v1\/ay3-recovery-requests$/);
 assert.deepEqual(calls[0].body,{action:'submit',phone:'+905321234567'});
 assert.equal(calls[0].headers.Authorization,undefined);
});

test('reset page has separate phone, email, code and verified-password stages',()=>{
 const html=readFileSync(new URL('../reset.html',import.meta.url),'utf8');
 for(const id of ['recoveryMethodPicker','requestResetForm','requestPhoneResetForm','recoveryPhone','recoveryCountry','recoveryDonePanel','recoveryCodeToggle','verifyRecoveryCodeForm','newPasswordForm'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<form id="verifyRecoveryCodeForm" hidden>/);
 assert.match(html,/<form id="newPasswordForm" hidden>/);
 assert.match(html,/<form id="requestPhoneResetForm" hidden>/);
});

test('recovery queue is below the main page and not a dashboard card',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../recovery-requests-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/<main id="content"[^>]*><\/main><section id="phoneRecoveryRequestsPanel" hidden>/);
 assert.match(app,/state\.page==='persons'\)\$\('content'\)\.insertAdjacentHTML\('afterbegin',phoneRecoveryUi\.shortcutHTML\(\)\)/);
 assert.match(app,/unread\.length\+phoneRecoveryUi\.openCount\(\)/);
 assert.match(app,/combinedNotificationList\(notificationData\(\)\)/);
 assert.match(app,/phoneRecoveryUi\.openManager\(\)/);
 assert.match(ui,/s\.data\?\.role==='super'/);
 assert.match(ui,/getState\(\)\.page==='persons'/);
 assert.match(ui,/if\(!openCount\(\)\|\|getState\(\)\.page!=='overview'\)return/);
 assert.match(ui,/action:'list'/);
 assert.match(ui,/action:'update'/);
});

test('recovery queue, bell and dashboard remain quiet with zero pending requests',async()=>{
 const code=readFileSync(new URL('../recovery-requests-ui.mjs',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replace('export function bindRecoveryRequests','function bindRecoveryRequests');
 const handlers={};
 const root={hidden:true,innerHTML:'',replaceChildren(){this.innerHTML='';},
  querySelector(selector){if(selector==='details')return {addEventListener(){},scrollIntoView(){},focus(){}};return null;}};
 const content={html:'',querySelector(){return null;},insertAdjacentHTML(position,html){this.html=html;}};
 const document={getElementById:id=>({phoneRecoveryRequestsPanel:root,content})[id],
  addEventListener:(type,callback)=>handlers[type]=callback};
 const window={addEventListener(){}};
 const state={mode:'connected',page:'overview',data:{role:'super',userId:'fake-user'}};
 const result={open:0,requests:[]};
 const api={raw:async()=>result,token:async()=> 'test-token'};
 const context={document,window,getLanguage:()=> 'de',e:String,Date,Intl,Number};
 const bind=vm.runInNewContext(code+'\nbindRecoveryRequests',context);
 const ui=bind({api,getState:()=>state});
 await ui.load();
 assert.equal(ui.openCount(),0);
 assert.equal(ui.notificationHTML(),'');
 ui.hint();
 assert.equal(content.html,'');
 assert.equal(root.hidden,true);
 state.page='persons';ui.panel();
 assert.equal(root.hidden,false);
 assert.match(root.innerHTML,/<details class="ay-recovery-management"/);
 assert.doesNotMatch(root.innerHTML,/open="true"/);
 assert.match(root.innerHTML,/Keine offenen Passwortanfragen/);
 assert.equal(ui.openManager(),'');
 state.page='overview';
 result.open=2;result.requests=[{id:'1',full_name:'Test Person',phone:'+90000000000',person_id:'p1',created_at:'2026-11-20T00:00:00Z'}];
 await ui.load({force:true});
 assert.equal(ui.openCount(),2);
 assert.match(ui.notificationHTML(),/data-recovery-notice/);
 ui.hint();
 assert.match(content.html,/phoneRecoveryHint/);
 assert.equal(ui.openManager(),'persons');
 state.data.role='resident';ui.panel();ui.hint();
 assert.equal(root.hidden,true);
 assert.equal(ui.openCount(),0);
 assert.equal(ui.notificationHTML(),'');
});
