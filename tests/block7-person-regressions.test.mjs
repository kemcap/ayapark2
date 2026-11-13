import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs?v=5.8.1';
import {buildForm,payloadFor} from '../forms.mjs?v=5.8.1';
import {assignmentCard,personManager} from '../people-ui.mjs?v=5.8.1';
import {receives} from '../notifications.mjs?v=5.8.1';
import {activeAt} from '../v3-domain.mjs?v=5.8.1';
import {setLanguage} from '../i18n.mjs?v=5.8.1';

let serial=0;
const request=()=> 'block7-synthetic-'+(++serial);
const call=(d,action,p)=>demoCommand(d,action,{request_id:request(),...p});

test('identical retries are idempotent; changed payloads cannot reuse a request ID',()=>{
 const d=fullDemo(),req=request();
 const command={request_id:req,unit_id:'B-3',person_id:'demo-tenant',role:'owner'};
 const first=demoCommand(d,'assignment_add',command);
 const after=JSON.stringify(d),audits=d.audit.length;
 assert.equal(demoCommand(d,'assignment_add',{role:'owner',person_id:'demo-tenant',unit_id:'B-3',request_id:req}).already_recorded,true);
 assert.equal(d.audit.length,audits);
 assert.equal(JSON.stringify(d),after);
 assert.throws(()=>demoCommand(d,'assignment_add',{...command,role:'tenant'}),/farklı|different|andere/i);
 assert.equal(JSON.stringify(d),after);
 assert.equal(d.links.filter(l=>l.id===first.id).length,1);
});

test('same person across apartments: ending one role does not remove other roles or historical liabilities',()=>{
 const d=fullDemo(),unit='B-3',pid='demo-tenant';
 const first=call(d,'assignment_add',{unit_id:'A-7',person_id:pid,role:'owner'});
 const second=call(d,'assignment_add',{unit_id:unit,person_id:pid,role:'tenant'});
 const old=d.links.find(l=>l.id===first.id);
 d.charges.push({id:'block7-historical-charge',unit_id:'A-7',person_id:pid,link_id:first.id,category:'Aidat',cents:24000,due_on:'2026-09-01'});
 d.allocations.push({id:'block7-partial',charge_id:'block7-historical-charge',cents:4000});
 const financialSnapshot=JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits,transactions:d.transactions});
 const personCount=d.persons.length;
 call(d,'assignment_remove',{id:first.id,revision:old.revision,reason:'ended',note:'Synthetic fixture'});
 assert.equal(activeAt(d.links.find(l=>l.id===first.id)),false);
 assert.equal(activeAt(d.links.find(l=>l.id===second.id)),true);
 assert.equal(d.persons.length,personCount);
 assert.equal(JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits,transactions:d.transactions}),financialSnapshot);
 const oldRow=d.links.find(l=>l.id===first.id);
 assert.equal(oldRow.archive_reason,'ended');
 const view=assignmentCard({mode:'demo',data:d},oldRow,true);
 assert.match(view,/block7|Eski|açık|24\.000|200,00|240,00/i);
});

test('role change archives only the selected link; restoring leaves archive and money unchanged',()=>{
 const d=fullDemo();
 const old=call(d,'assignment_add',{unit_id:'B-3',person_id:'demo-tenant',role:'representative'}),before=d.links.find(l=>l.id===old.id);
 const initialCount=d.links.length;
 call(d,'assignment_edit',{id:old.id,revision:before.revision,first_name:'Sakin',last_name:'Örnek',role:'owner',additional_role:'tenant'});
 const archived=d.links.find(l=>l.id===old.id);
 assert.equal(archived.active,false);
 assert.equal(archived.archive_reason,'role_changed');
 assert.equal(d.links.filter(l=>l.unit_id==='B-3'&&l.person_id==='demo-tenant'&&l.active).length,2);
 assert.equal(d.links.length,initialCount+2);
 const financialSnapshot=JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits});
 call(d,'assignment_restore',{id:old.id,revision:archived.revision});
 assert.equal(d.links.find(l=>l.id===old.id).active,false);
 assert.equal(d.links.filter(l=>l.unit_id==='B-3'&&l.person_id==='demo-tenant'&&l.active).length,3);
 assert.equal(JSON.stringify({charges:d.charges,allocations:d.allocations,credits:d.credits}),financialSnapshot);
});

test('invalid dates and missing removal reason reject without partial mutation',()=>{
 const d=fullDemo(),link=d.links.find(l=>l.id==='demo-tenant-link');
 const s={mode:'demo',data:d};
 const context=buildForm(s,'assignment_edit',{id:link.id}).context;
 const form=new FormData();
 for(const [k,v] of Object.entries({role:'tenant',first_name:'Sakin',last_name:'Örnek',starts_on:'2026-11-30',ends_on:'2026-11-01'}))form.set(k,v);
 const before=JSON.stringify(d);
 assert.throws(()=>payloadFor('assignment_edit',form,context));
 assert.throws(()=>call(d,'assignment_remove',{id:link.id,revision:link.revision,reason:''}));
 assert.equal(JSON.stringify(d),before);
});

test('representative notification mandates affect only matching active role in resident preview',()=>{
 const d=fullDemo(),pid='demo-tenant',unit='B-3';
 const id=call(d,'assignment_add',{unit_id:unit,person_id:pid,role:'representative',mandates:['owners']}).id;
 const preview={...d,role:'resident',capabilities:{},ownIds:[unit],ownPersonIds:[pid]};
 const owners={target_kind:'owners'},residents={target_kind:'residents'};
 assert.equal(receives(preview,owners),true);
 assert.equal(receives(preview,residents),true);
 const role=d.links.find(l=>l.id===id);
 assert.deepEqual(role.mandates,['owners']);
 call(d,'assignment_edit',{id,revision:role.revision,role:'tenant',first_name:'Sakin',last_name:'Örnek',mandates:['owners']});
 const next={...d,role:'resident',capabilities:{},ownIds:[unit],ownPersonIds:[pid]};
 assert.equal(d.links.find(l=>l.id===id).active,false);
 assert.equal(receives(next,owners),false);
 assert.equal(receives(next,residents),true);
});

test('person manager separates active and former roles, hides restricted management controls',()=>{
 const d=fullDemo(),l=call(d,'assignment_add',{unit_id:'A-7',person_id:'demo-tenant',role:'owner'});
 call(d,'assignment_remove',{id:l.id,revision:1,reason:'mistake'});
 const s={mode:'demo',data:d};
 setLanguage('tr');
 const manager=personManager(s,'demo-tenant');
 assert.match(manager,/Önceki roller/);
 assert.match(manager,/Güncel roller/);
 assert.match(manager,/A-7/);
 const resident={mode:'demo',data:{...d,role:'resident',capabilities:{}}};
 assert.equal(personManager(resident,'demo-tenant'),null);
});
