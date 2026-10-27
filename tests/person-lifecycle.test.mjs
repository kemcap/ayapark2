import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {buildForm,payloadFor} from '../forms.mjs?v=5.8.1';
import {peoplePage,personManager} from '../people-ui.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.8.1';

const testState=()=>({mode:'demo',data:fullDemo(),peopleFilter:'all',peopleQuery:''});
const form=values=>{
 const data=new FormData();
 for(const [key,value] of Object.entries(values))if(value===true)data.set(key,'on');else data.set(key,String(value));
 return data;
};

test('person lifecycle offers archive and actual removal with separate confirmation',()=>{
 setLanguage('de');
 const state=testState(),person=state.data.persons[0];
 const built=buildForm(state,'person_lifecycle',{id:person.id});
 assert.match(built.body,/value="archive"/);
 assert.match(built.body,/value="delete"/);
 const archived=payloadFor('person_lifecycle',form({mode:'archive',note:'Wohnort gewechselt',confirmation:true}),built.context);
 assert.equal(archived.mode,'archive');
 assert.equal(archived.person_id,person.id);
 const deleted=payloadFor('person_lifecycle',form({mode:'delete',verify_name:person.full_name,confirmation:true}),built.context);
 assert.equal(deleted.mode,'delete');
 assert.throws(()=>payloadFor('person_lifecycle',form({mode:'delete',verify_name:'falsch',confirmation:true}),built.context));
 assert.throws(()=>payloadFor('person_lifecycle',form({mode:'archive',note:'x',confirmation:true}),built.context));
 assert.throws(()=>payloadFor('person_lifecycle',form({mode:'delete',verify_name:person.full_name}),built.context));
 setLanguage('tr');
});
test('archived people are moved to archive filter and restored without restoring apartment links',()=>{
 const state=testState(),person=state.data.persons[0];
 person.full_name='Archive QA Fixture';
 person.archived_at='2026-10-27T13:00:00Z';
 person.archive_note='Taşındı';
 assert(!peoplePage(state).includes(person.full_name));
 state.peopleFilter='archived';
 assert(peoplePage(state).includes(person.full_name));
 assert(personManager(state,person.id).includes('person_restore'));
 const built=buildForm(state,'person_restore',{id:person.id});
 assert.equal(payloadFor('person_restore',form({confirmation:true}),built.context).mode,'restore');
});

test('superadmin sees separate permanent person deletion in list and detail',()=>{
 setLanguage('tr');
 const state=testState(),person=state.data.persons[0];
 const page=peoplePage(state),detail=personManager(state,person.id);
 assert.match(page,new RegExp('data-action="person_lifecycle" data-id="'+person.id+'"'));
 assert.match(detail,new RegExp('data-action="person_lifecycle" data-id="'+person.id+'"'));
 assert.match(detail,/Kişiyi sil/);
 state.data.role='staff';state.data.capabilities={people:true};
 assert.doesNotMatch(peoplePage(state),/data-action="person_lifecycle"/);
 assert.doesNotMatch(personManager(state,person.id),/data-action="person_lifecycle"/);
 setLanguage('tr');
});
