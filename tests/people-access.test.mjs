import test from 'node:test';
import assert from 'node:assert/strict';
import {registered,registrationStatus} from '../registration-status.mjs';
import {setLanguage} from '../i18n.mjs?v=5.8.1';
import {invitationRelationship} from '../invite-ui.mjs?v=5.8.1';
test('registration depends on linked Auth account, never invitation',()=>{
 assert.equal(registered({invited:true}),false);assert.equal(registered({auth_user_id:'existing-user'}),true);
 const s={mode:'connected',data:{capabilities:{people:true}}};
 setLanguage('de');assert.match(registrationStatus(s,{auth_user_id:'u'}),/Registriert/);assert.match(registrationStatus(s,{}),/Unregistriert/);
 setLanguage('tr');assert.match(registrationStatus(s,{auth_user_id:'u'}),/Kayıtlı/);assert.match(registrationStatus(s,{}),/Kayıtlı değil/);
 assert.equal(registrationStatus({mode:'connected',data:{capabilities:{}}},{}),'');
});
test('invitation never invents relationships or enables future or erroneous ones',()=>{
 assert.equal(invitationRelationship({role:'representative',starts_on:'2020-01-01',active:false,ends_on:'2021-01-01'}),true);
 assert.equal(invitationRelationship({role:'tenant',starts_on:'2999-01-01'}),false);
 assert.equal(invitationRelationship({role:'owner',archive_reason:'mistake'}),false);
 assert.equal(invitationRelationship({role:'manager'}),false);
});
import {matchingPeople,personCombobox} from '../person-combobox.mjs';
import {assignmentPayload} from '../assignments.mjs';
test('combobox filters Turkish names, formatted phones and email locally',()=>{
 const people=[{id:'1',full_name:'Kemal Çapacı',phone:'+90 (532) 111 22 33',email:'kemal@gmail.com'},{id:'2',full_name:'IŞIK İpek',email:'other@example.invalid'},{id:'3',full_name:'Archived',archived_at:'2020-01-01'}];
 for(const q of ['KEMAL','capaci','ÇAPACI','532111','@gmail.com'])assert.deepEqual(matchingPeople(people,q).map(p=>p.id),['1']);
 assert.deepEqual(matchingPeople(people,'isik ipek').map(p=>p.id),['2']);assert.equal(matchingPeople(people,'').length,2);assert.equal(matchingPeople(people,'nobody').length,0);
 const html=personCombobox(people,'1');assert.match(html,/role="combobox"/);assert.match(html,/role="listbox"/);assert.match(html,/name="person_id" value="1"/);
 const p=assignmentPayload('assignment_add',new Map([['person_mode','existing'],['person_id','1'],['role','tenant']]),{unit_id:'u'});assert.equal(p.person_id,'1');assert.equal(p.new_person,false);
});
import {readFile} from 'node:fs/promises';
test('legacy page contains no embedded financial snapshot',async()=>{
 const html=await readFile(new URL('../old/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/publicRecords|embedded-data|sealed|amount/);assert.match(html,/legacy-redirect\.js/);
});
test('new-person fallback reuses an unambiguous existing identity',()=>{
 const form=new Map([['person_mode','new'],['first_name','Kemal'],['last_name','Çapacı'],['phone','905321112233'],['role','tenant']]);
 const payload=assignmentPayload('assignment_add',form,{unit_id:'u',persons:[{id:'existing',full_name:'Kemal Çapacı',phone:'+90 (532) 111 22 33'}]});assert.equal(payload.person_id,'existing');assert.equal(payload.new_person,false);
});
