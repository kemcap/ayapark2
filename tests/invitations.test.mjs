import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inviteEligible,inviteText,whatsappNumber,whatsappShareUrl} from '../invite-ui.mjs?v=5.8.1';
import {AyaparkApi,loginIdentifier} from '../api.mjs?v=5.8.1';

const person={id:'p1',full_name:'Test Resident',phone:'0542 111 22 33',email:''};
const base={mode:'connected',data:{role:'super',persons:[person],links:[{person_id:'p1',role:'tenant',starts_on:'2024-01-01',ends_on:null}],units:[]}};
test('only managers can invite persisted resident, representative and former relationships',()=>{
 assert.equal(inviteEligible(base,person),true);
 assert.equal(inviteEligible({...base,data:{...base.data,role:'staff'}},person),false);
 assert.equal(inviteEligible({...base,mode:'demo'},person),false);
 assert.equal(inviteEligible({...base,data:{...base.data,links:[{person_id:'p1',role:'representative',starts_on:'2024-01-01'}]}},person),true);
 assert.equal(inviteEligible({...base,data:{...base.data,links:[{person_id:'p1',role:'owner',ends_on:'2024-01-01'}]}},person),true);
 assert.equal(inviteEligible(base,{...person,auth_user_id:'already-active'}),false);
});
test('normalize WhatsApp numbers before sending',()=>{
 assert.equal(whatsappNumber('0542 111 22 33'),'905421112233');
 assert.equal(whatsappNumber('+90 (542) 111-22-33'),'905421112233');
 assert.equal(whatsappNumber('+49 170 1234567'),'491701234567');
 for(const invalid of ['','foo','123','0212 123 45 67 x123','+001'])assert.equal(whatsappNumber(invalid),'');
 assert.equal(whatsappShareUrl('', 'text'),'');
});
test('share URL preserves exact editable message and phone number',()=>{
 const msg='AYAPARK 2\nMerhaba & hoş geldiniz ✨';
 const url=whatsappShareUrl('05421112233',msg);
 assert.equal(new URL(url).searchParams.get('text'),msg);
 assert.equal(new URL(url).pathname,'/905421112233');
});
test('bilingual invite copy works without collecting resident email',()=>{
 for(const language of ['de','tr']){
  const value=inviteText({name:'Test',units:'A-3',link:'https://example.invalid/?invite=abc',language});
  assert.match(value,/https:\/\/example\.invalid\/\?invite=abc/);
  assert.match(value,/A-3/);
  assert.match(value,/ohne E-Mail|E-posta gerekmez/);
  assert.match(value,/einmal|bir kez/);
 }
});
test('password sign-in maps phone to internal alias while retaining real email accounts',async()=>{
 assert.equal(loginIdentifier('0542 111 22 33'),'resident-905421112233@ayapark2.invalid');
 assert.equal(loginIdentifier('+49 170 1234567'),'resident-491701234567@ayapark2.invalid');
 assert.equal(loginIdentifier('Person@Example.com'),'Person@Example.com');
 const calls=[];
 const api=new AyaparkApi(async(url,init)=>{
  calls.push({url,init});
  return {ok:true,status:200,json:async()=>url.includes('/auth/v1/token')?{access_token:'jwt',refresh_token:'refresh',expires_in:3600,user:{id:'u'}}:{id:'u'}};
 },{persist:false});
 await api.login('0542 111 22 33','some-good-password');
 assert.equal(JSON.parse(calls[0].init.body).email,'resident-905421112233@ayapark2.invalid');
});
test('public inspect and activate do not send manager bearer',async()=>{
 const calls=[],api=new AyaparkApi(async(url,init)=>{
  calls.push({url,init});return {ok:true,status:200,json:async()=>({ok:true})};
 },{persist:false});
 await api.invitation({action:'inspect',token:'safe'},false);
 await api.invitation({action:'activate',token:'safe',password:'password123456'},false);
 assert.equal(calls[0].init.headers.Authorization,undefined);
 assert.equal(calls[1].init.headers.Authorization,undefined);
 api.accept({access_token:'test-jwt',refresh_token:'test-refresh',expires_in:3600,user:{id:'test-manager'}},api.generation);
 await api.invitation({action:'create',person_id:'p1',phone:'905421112233'},true);
 assert.equal(calls[2].init.headers.Authorization,'Bearer test-jwt');
});
test('backend stores hash-only one-time tokens and atomically claims access',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261026_email_free_whatsapp_activation.sql',import.meta.url),'utf8');
 const edge=await readFile(new URL('../supabase/functions/ay3-whatsapp-invite/index.ts',import.meta.url),'utf8');
 assert.match(sql,/token_hash text not null unique/);
 assert.match(sql,/for update/);
 assert.match(sql,/consumed_at=now\(\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all .*anon,authenticated/);
 assert.match(edge,/crypto\.getRandomValues/);
 assert.match(edge,/SHA-256/);
 assert.match(edge,/getUser\(bearer\)/);
 assert.match(edge,/phone_e164/);
 assert.match(edge,/ay_auth_issue_invite/);
 assert.doesNotMatch(edge,/sendSms|sendEmail|inviteUserByEmail|generateLink\(/);
});
test('invite activation UI has no mandatory email and requires password twice',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const client=await readFile(new URL('../invite-ui.mjs',import.meta.url),'utf8');
 assert.match(html,/id="inviteActivationPassword"/);
 assert.match(html,/id="inviteActivationConfirm"/);
 assert.match(html,/id="inviteConfirm"/);
 assert.match(html,/id="inviteWhatsApp" disabled/);
 assert.match(app,/onActivated:/);
 assert.doesNotMatch(client,/Bitte zuerst eine gültige E-Mail-Adresse für diese Person eintragen/);
 assert.doesNotMatch(client,/api\.provision\(/);
});

test('phone invitation activation does not insert a text NULL into uuid person_id',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261026_fix_invite_activation_uuid.sql',import.meta.url),'utf8');
 assert.match(sql,/insert into public\.site_resident_units\(unit_id,user_id,role,person_id,active\)/);
 assert.match(sql,/select distinct l\.unit_id,p_user,l\.role,null::uuid,true/);
 assert.doesNotMatch(sql,/select distinct l\.unit_id,p_user,l\.role,null,true/);
 assert.match(sql,/revoke all on function public\.ay3_redeem_phone_invite\(text,uuid\) from PUBLIC,anon,authenticated/);
});

test('email invitation text never claims an email-free account',()=>{
 for(const language of ['de','tr']){const text=inviteText({name:'Synthetic',units:'A-7',link:'https://example.invalid/?invite=abc',language,contactKind:'email'});assert.doesNotMatch(text,/ohne E-Mail|E-posta gerekmez/);assert.match(text,/7/);}
});
