import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('admin overview has persistent protected phone request panel',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../recovery-requests-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="phoneRecoveryRequestsPanel"/);
 assert.match(ui,/s\.data\?\.role==='super'/);
 assert.match(ui,/action:'list'/);
 assert.match(ui,/action:'update'/);
});
