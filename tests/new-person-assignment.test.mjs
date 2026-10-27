import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs?v=5.8.1';
import {buildForm,payloadFor} from '../forms.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.8.1';

const state=()=>({mode:'demo',data:fullDemo()});
const form=fields=>{
 const f=new FormData();for(const [key,value] of Object.entries(fields))f.set(key,value);return f;
};
test('new person form creates a person and selected apartment role in one action',()=>{
 setLanguage('tr');
 for(const role of ['owner','tenant','representative']){
  const s=state(),built=buildForm(s,'person',{});
  assert.match(built.body,/name="unit_id"/);
  assert.match(built.body,/name="role"/);
  const d=form({first_name:'Test',last_name:'Rolu',phone:'000',email:'fixture@example.invalid',language:'de',unit_id:'A-7',role});
  const payload=payloadFor('person',d,built.context);
  assert.equal(payload.unit_id,'A-7');
  assert.equal(payload.role,role);
  demoCommand(s.data,'person',payload);
  const p=s.data.persons.find(x=>x.full_name==='Test Rolu');
  assert(p);
  assert.equal(p.language,'de');
  assert(s.data.links.some(l=>l.unit_id==='A-7'&&l.person_id===p.id&&l.role===role&&l.active));
 }
});
test('new person validates apartment and role before saving',()=>{
 const s=state(),built=buildForm(s,'person',{});
 assert.throws(()=>payloadFor('person',form({first_name:'Test',last_name:'Person',role:'owner'}),built.context));
 assert.throws(()=>payloadFor('person',form({first_name:'Test',last_name:'Person',unit_id:'A-7'}),built.context));
 assert.throws(()=>payloadFor('person',form({first_name:'Test',last_name:'Person',unit_id:'A-7',role:'super'}),built.context));
});
test('existing person edit does not demand a new apartment or role',()=>{
 const s=state(),p=s.data.persons[0],built=buildForm(s,'person',{id:p.id});
 assert(!built.body.includes('name="unit_id"'));
 assert(!built.body.includes('name="role"'));
 const payload=payloadFor('person',form({first_name:'Test',last_name:'Updated',language:'tr'}),built.context);
 assert.equal(payload.person_id,p.id);
});
test('new person form supports preselected apartment from an apartment detail',()=>{
 const s=state(),built=buildForm(s,'person',{unit:'A-7'});
 assert.match(built.body,/name="unit_id"/);
 assert.match(built.body,/value="A-7" selected/);
});
