import test from 'node:test';
import assert from 'node:assert/strict';
import {assignmentPayload,applyAssignmentDemo,buildAssignmentForm} from '../assignments.mjs';
import {today} from '../v3-domain.mjs';
import {dayBefore} from '../owner-history.mjs';

const source=()=>({
 units:[{id:'A-2',code:'A-2'}],
 persons:[
  {id:'old',first_name:'Martin',last_name:'Müller',full_name:'Martin Müller'},
  {id:'new',first_name:'Thomas',last_name:'Schmidt',full_name:'Thomas Schmidt'}
 ],
 links:[{id:'owner-1',unit_id:'A-2',person_id:'old',role:'owner',
  active:true,revision:3,starts_on:'2022-03-01',ends_on:null}],
 audit:[],charges:[{id:'debt-1',unit_id:'A-2',person_id:'old',link_id:'owner-1',cents:70000}],
 allocations:[{id:'alloc-1',charge_id:'debt-1',cents:20000}],
 credits:[{id:'credit-1',person_id:'old',cents:4000}]
});
const params=(overrides={})=>({
 request_id:'6b7c2925-8d9b-44db-8f79-809f4e6cf001',id:'owner-1',
 unit_id:'A-2',revision:3,effective_on:today(),confirmation:true,
 new_person:false,new_owner_id:'new',keep_as_tenant:true,...overrides
});

test('form provides same-person tenant choice and confirmation',()=>{
 const f=buildAssignmentForm(source(),'assignment_owner_transfer',{id:'owner-1'});
 assert.match(f.body,/name="keep_as_tenant" checked/);
 assert.match(f.body,/name="effective_on"/);
 assert.match(f.body,/name="confirmation" required/);
 assert.equal(f.context.id,'owner-1');
});

test('transfer archives former owner and adds tenant without touching finance',()=>{
 const d=source(),original=structuredClone({charges:d.charges,allocations:d.allocations,credits:d.credits});
 const response=applyAssignmentDemo(d,'assignment_owner_transfer',params());
 assert.equal(response.ok,true);
 assert.equal(d.links.length,3);
 const old=d.links.find(l=>l.id==='owner-1');
 assert.equal(old.active,false);
 assert.equal(old.ends_on,dayBefore(today()));
 assert.equal(old.archive_reason,'ownership_transfer');
 assert.equal(d.links.find(l=>l.role==='owner'&&l.active)?.person_id,'new');
 assert.equal(d.links.find(l=>l.role==='tenant'&&l.active)?.person_id,'old');
 assert.equal(d.persons.length,2);
 assert.deepEqual({charges:d.charges,allocations:d.allocations,credits:d.credits},original);
});

test('without tenant option, old owner remains in history only',()=>{
 const d=source();
 applyAssignmentDemo(d,'assignment_owner_transfer',params({keep_as_tenant:false}));
 assert.equal(d.links.filter(l=>l.role==='tenant').length,0);
 assert.equal(d.links.filter(l=>l.role==='owner'&&l.active).length,1);
});

test('existing tenant relation is not duplicated',()=>{
 const d=source();d.links.push({id:'tenant-1',unit_id:'A-2',person_id:'old',role:'tenant',active:true,revision:1});
 applyAssignmentDemo(d,'assignment_owner_transfer',params());
 assert.equal(d.links.filter(l=>l.person_id==='old'&&l.role==='tenant').length,1);
});

test('new owner can be created as a new person',()=>{
 const d=source();
 const result=applyAssignmentDemo(d,'assignment_owner_transfer',params({new_person:true,new_owner_id:null,first_name:'Ayşe',last_name:'Yılmaz'}));
 assert.equal(result.ok,true);
 assert.equal(d.persons.length,3);
 assert.equal(d.persons.at(-1).full_name,'Ayşe Yılmaz');
});

test('retries do not create a second owner or tenant',()=>{
 const d=source(),p=params();
 applyAssignmentDemo(d,'assignment_owner_transfer',p);
 const count=d.links.length;
 const retry=applyAssignmentDemo(d,'assignment_owner_transfer',p);
 assert.equal(retry.already_recorded,true);
 assert.equal(d.links.length,count);
});

test('ambiguous co-owner state is blocked atomically',()=>{
 const d=source();d.links.push({id:'co-owner',unit_id:'A-2',person_id:'new',role:'owner',active:true});
 const before=structuredClone(d);
 assert.throws(()=>applyAssignmentDemo(d,'assignment_owner_transfer',params()),/Multiple owners/);
 assert.deepEqual(d,before);
});

test('stale revisions and self-transfer are blocked',()=>{
 const d=source();assert.throws(()=>applyAssignmentDemo(d,'assignment_owner_transfer',params({revision:2})),/changed/);
 assert.throws(()=>applyAssignmentDemo(d,'assignment_owner_transfer',params({new_owner_id:'old'})),/another owner/);
 assert.equal(d.links.length,1);
});

test('payload must provide confirmation, date and distinct owner',()=>{
 const fd=new FormData();
 fd.set('person_mode','existing');fd.set('person_id','new');fd.set('effective_on',today());
 const ctx={id:'owner-1',person_id:'old',unit_id:'A-2',revision:3,request_id:'x'};
 assert.throws(()=>assignmentPayload('assignment_owner_transfer',fd,ctx),/confirm|bestätig|onay/i);
 fd.set('confirmation','on');
 const p=assignmentPayload('assignment_owner_transfer',fd,ctx);
 assert.equal(p.keep_as_tenant,false);
 assert.equal(p.new_owner_id,'new');
 fd.set('person_id','old');
 assert.throws(()=>assignmentPayload('assignment_owner_transfer',fd,ctx),/anderen|different|farklı/i);
});
