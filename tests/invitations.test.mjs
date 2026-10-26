import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inviteEligible,inviteText,whatsappNumber,whatsappShareUrl} from '../invite-ui.mjs?v=5.1.1';
import {AyaparkApi} from '../api.mjs?v=5.1.0';

const person={id:'p1',full_name:'Test Bewohner',phone:'0542 111 22 33',email:'person@example.invalid'};
const base={mode:'connected',data:{role:'super',persons:[person],links:[{person_id:'p1',role:'tenant',starts_on:'2024-01-01',ends_on:null}],units:[]}};
test('only super admins may invite actively assigned owners or tenants',()=>{
 assert.equal(inviteEligible(base,person),true);
 assert.equal(inviteEligible({...base,data:{...base.data,role:'staff'}},person),false);
 assert.equal(inviteEligible({...base,mode:'demo'},person),false);
 assert.equal(inviteEligible({...base,data:{...base.data,links:[{person_id:'p1',role:'representative',starts_on:'2024-01-01'}]}},person),false);
 assert.equal(inviteEligible({...base,data:{...base.data,links:[{person_id:'p1',role:'owner',ends_on:'2024-01-01'}]}},person),false);
 assert.equal(inviteEligible(base,{...person,auth_user_id:'already-provisioned'}),true); // renewal after initial provisioning
});
test('mobile and international WhatsApp numbers are normalized without guessing missing numbers',()=>{
 assert.equal(whatsappNumber('0542 111 22 33'),'905421112233');
 assert.equal(whatsappNumber('+90 (542) 111-22-33'),'905421112233');
 assert.equal(whatsappNumber('+49 170 1234567'),'491701234567');
 for(const invalid of ['','foo','123','0212 123 45 67 x123','+001'])assert.equal(whatsappNumber(invalid),'');
 assert.equal(whatsappShareUrl('', 'text'),'');
});
test('share URL percent-encodes complete editable message',()=>{
 const message='AYAPARK 2\nMerhaba & hoş geldiniz ✨ https://example.invalid/?a=1&b=2';
 const url=whatsappShareUrl('05421112233',message);
 assert.equal(new URL(url).searchParams.get('text'),message);
 assert.equal(new URL(url).pathname,'/905421112233');
});
test('bilingual invite copy requires email confirmation, not a bare link',()=>{
 for(const language of ['de','tr']){
  const text=inviteText({name:'Test',units:'A-3',link:'https://example.invalid/?invite=abc',language});
  assert.match(text,/https:\/\/example\.invalid\/\?invite=abc/);
  assert.match(text,/A-3/);
  assert.match(text,/E-Mail|e-posta/);
 }
});
test('invitation REST call adds the user token only for creation',async()=>{
 const calls=[];
 const api=new AyaparkApi(async(url,init)=>{
  calls.push({url,init});return {ok:true,status:200,json:async()=>({valid:true})};
 },{persist:false});
 await api.invitation({action:'inspect',token:'example'},false);
 assert.equal(calls[0].init.headers.Authorization,undefined);
 api.accept({access_token:'test-jwt',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-manager'}},api.generation);
 await api.invitation({action:'create',person_id:'p1'},true);
 assert.equal(calls[1].init.headers.Authorization,'Bearer test-jwt');
 assert.match(calls[1].url,/\/functions\/v1\/ay3-whatsapp-invite$/);
});
test('invitation UI exposes explicit user send controls, not automatic WhatsApp transmission',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const edge=await readFile(new URL('../supabase/functions/ay3-whatsapp-invite/index.ts',import.meta.url),'utf8');
 assert.match(html,/id="inviteConfirm"/);
 assert.match(html,/id="inviteWhatsApp" disabled/);
 assert.match(app,/if\(action==='invite_person'\)/);
 assert.match(app,/invite_activate/);
 assert.match(edge,/crypto\.subtle\.verify/);
 assert.match(edge,/getUser\(bearer\)/);
 assert.match(edge,/48 \* 60 \* 60/);
 assert.doesNotMatch(edge,/inviteUserByEmail|generateLink\(/);
});
