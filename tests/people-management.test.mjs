import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingPeople} from '../person-picker.mjs?v=5.9.0';
import {registrationStatus} from '../person-status.mjs?v=5.9.0';
import {inviteEligible} from '../invite-ui.mjs?v=5.9.0';
import {scopedCharges} from '../v3-domain.mjs?v=5.9.0';
import {setLanguage} from '../i18n.mjs?v=5.8.1';
const people=[{id:'a',first_name:'Ayşe',last_name:'Işık',full_name:'Ayşe Işık',phone:'+90 (532) 123-45-67',email:'ayse@gmail.com'},{id:'b',full_name:'İlker Çelik',phone:'0542 999 88 77'},{id:'c',full_name:'Archived',archived_at:'2020-01-01'}];
test('picker searches Turkish names, partial names, email and normalized phone locally',()=>{
 for(const q of ['A','AYSE','Ayşe IŞIK','isik','0532','+90 532','532123','gmail'])assert(matchingPeople(people,q).some(p=>p.id==='a'),q);
 assert.equal(matchingPeople(people,'ilker celik')[0].id,'b');assert.equal(matchingPeople(people,'0542')[0].id,'b');assert.equal(matchingPeople(people,'xyz').length,0);assert.equal(matchingPeople(people,'').length,2);
});
test('registration comes only from verified server status, never names or invitations',()=>{
 setLanguage('de');assert.match(registrationStatus({auth_user_id:'x',invite_expires_at:'2099-01-01'}),/Nicht registriert/);assert.match(registrationStatus({registered:true}),/>Registriert/);
 setLanguage('tr');assert.match(registrationStatus({registered:true}),/>Kayıtlı/);assert.match(registrationStatus({registered:false}),/Kayıtlı değil/);
});
test('unactivated linked accounts use the same invitation flow; active accounts cannot be reset through it',()=>{
 const s={mode:'connected',data:{role:'super',links:[{person_id:'p',role:'representative',active:false,ends_on:'2020-01-01'}]}};
 assert(inviteEligible(s,{id:'p',auth_user_id:'u',provisional:true,registered:false}));
 assert(!inviteEligible(s,{id:'p',auth_user_id:'u',provisional:false,registered:true}));
 assert(!inviteEligible({...s,data:{...s.data,role:'staff'}},{id:'p'}));
});
test('personal finance scope includes own history across apartments and excludes co-resident debt',()=>{
 const charges=[{id:'old',unit_id:'u',person_id:'p'},{id:'other',unit_id:'u',person_id:'q'},{id:'second',unit_id:'v',person_id:'p'}];
 assert.deepEqual(scopedCharges({role:'resident',personalScope:true,ownPersonIds:['p'],charges}).map(c=>c.id),['old','second']);
});
