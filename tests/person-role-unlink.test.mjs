import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs';
import {linkVersion} from '../relationships.mjs';
import {buildForm,payloadFor} from '../forms.mjs';
import {personManager} from '../people-ui.mjs';
import {unitDetailV3} from '../v3-ui.mjs';

const state=()=>({data:fullDemo(),mode:'demo',page:'units',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all'}});
const form=(s,id,reason='Incorrect apartment role')=>{
 const built=buildForm(s,'unlink',{id}),fd=new FormData();
 fd.set('reason',reason);fd.set('confirmation','on');
 return payloadFor('unlink',fd,built.context);
};

test('role actions are directly visible in apartment and person details',()=>{
 const s=state();
 assert.match(personManager(s,'demo-owner'),/data-action="unlink"/);
 assert.match(personManager(s,'demo-owner'),/data-action="end_link"/);
 assert.match(unitDetailV3(s,'A-4'),/data-action="unlink"/);
 assert.match(unitDetailV3(s,'A-4'),/data-action="end_link"/);
});

test('mistaken representative link can be removed while person, owner and ledger remain',()=>{
 const s=state(),d=s.data;
 d.links.push({id:'wrong-rep',person_id:'demo-tenant',unit_id:'B-1',role:'representative',starts_on:null,ends_on:null});
 const snapshot=JSON.stringify({persons:d.persons,charges:d.charges,transactions:d.transactions});
 const p=form(s,'wrong-rep');
 assert.equal(p.expected,linkVersion(d.links.find(l=>l.id==='wrong-rep')));
 demoCommand(d,'unlink',p);
 assert(!d.links.some(l=>l.id==='wrong-rep'));
 assert.equal(JSON.stringify({persons:d.persons,charges:d.charges,transactions:d.transactions}),snapshot);
 assert.equal(d.audit[0].action,'unlink');
 const count=d.audit.length;
 demoCommand(d,'unlink',p);
 assert.equal(d.audit.length,count);
});

test('unlink requires explicit confirmation and a reason',()=>{
 const s=state();s.data.links.push({id:'wrong-rep',person_id:'demo-owner',unit_id:'B-1',role:'representative'});
 const built=buildForm(s,'unlink',{id:'wrong-rep'});
 const fd=new FormData();fd.set('reason','Because');
 assert.throws(()=>payloadFor('unlink',fd,built.context));
 fd.set('confirmation','on');fd.set('reason','x');
 assert.throws(()=>payloadFor('unlink',fd,built.context));
});

test('history safeguards prevent deleting financially referenced roles and necessary owners',()=>{
 const s=state(),d=s.data;
 assert.throws(()=>demoCommand(d,'unlink',form(s,'demo-tenant-link')),/borç|Forderungen/);
 assert.throws(()=>demoCommand(d,'unlink',form(s,'demo-owner-link')),/ev sahibi|Eigentümereintrag/);
});

test('stale edit versions cannot erase another record',()=>{
 const s=state(),d=s.data;
 d.links.push({id:'wrong-rep',person_id:'demo-owner',unit_id:'B-1',role:'representative',starts_on:null});
 const p=form(s,'wrong-rep');d.links.find(l=>l.id==='wrong-rep').starts_on='2026-01-01';
 assert.throws(()=>demoCommand(d,'unlink',p),/Kayıt başka|Eintrag/);
});
