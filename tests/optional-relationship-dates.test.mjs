import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipPayload,planRelationship,linkVersion,followingDay,previousDay} from '../relationships.mjs';
import {buildV3Form,payloadV3} from '../v3-forms.mjs';
import {today} from '../v3-domain.mjs';

const d=()=>({
 units:[{id:'U',code:'A-1'},{id:'Z',code:'B-1'}],
 persons:[{id:'owner',full_name:'Original Owner'},{id:'buyer',full_name:'New Owner'},{id:'tenant',full_name:'Tenant'}],
 links:[{id:'O',unit_id:'U',person_id:'owner',role:'owner',starts_on:'2022-01-01',ends_on:null},
        {id:'T',unit_id:'U',person_id:'tenant',role:'tenant',starts_on:'2024-01-01',ends_on:null}],
 occupancyChanges:[]
});
const form=fields=>{const fd=new FormData();for(const [k,v] of Object.entries(fields))fd.set(k,v);return fd;};
const context=x=>({request_id:'00000000-0000-4000-8000-000000000001',versions:Object.fromEntries(x.links.map(l=>[l.id,linkVersion(l)]))});

test('guided add with empty date creates an owner with unknown beginning',()=>{
 const x=d(),p=relationshipPayload(form({kind:'add',unit_id:'Z',person_id:'buyer',role:'owner',effective_on:'',occupancy:'keep'}),context(x),x);
 assert.equal(p.effective_on,null);assert.equal(p.start_unknown,true);assert.equal(planRelationship(x,p).added[0].starts_on,null);
});
test('unknown tenant date is allowed if owner also has unknown beginning',()=>{
 const x=d();x.links.push({id:'ZO',unit_id:'Z',person_id:'owner',role:'owner',starts_on:null,ends_on:null});
 const p=relationshipPayload(form({kind:'add',unit_id:'Z',person_id:'tenant',role:'tenant',occupancy:'keep'}),context(x),x);
 assert.equal(planRelationship(x,p).added[0].starts_on,null);
});
test('unknown tenant date remains blocked when owner history starts later',()=>{
 const x=d();assert.throws(()=>relationshipPayload(form({kind:'correction',unit_id:'U',link_id:'T',role:'tenant',starts_on:'',reason:'Unknown real date',occupancy:'keep'}),context(x),x));
});
test('actual change with blank date applies today and retains old history',()=>{
 const x=d(),p=relationshipPayload(form({kind:'owner_change',unit_id:'U',link_id:'O',person_id:'buyer',effective_on:'',occupancy:'keep'}),context(x),x);
 assert.equal(p.effective_on,today());const result=planRelationship(x,p);
 assert.equal(result.links.find(l=>l.id==='O').ends_on,previousDay(today()));
});
test('undated moveout has today as last day and tomorrow as vacant day',()=>{
 const x=d(),p=relationshipPayload(form({kind:'moveout',unit_id:'U',link_id:'T',departure_on:'',occupancy:'vacant'}),context(x),x);
 assert.equal(p.departure_on,today());assert.equal(p.effective_on,followingDay(today()));
 assert.equal(planRelationship(x,p).links.find(l=>l.id==='T').ends_on,today());
});
test('legacy date editor and role links do not require a written beginning',()=>{
 const x=d(),s={data:x,role:'super'};
 for(const action of ['link','person_link']){
  const html=buildV3Form(s,action,{unit:'U',id:'O'}).body;
  assert.doesNotMatch(html,/name="starts_on"[^>]*required/);
 }
 const p=payloadV3('person_link',form({unit_id:'U',role:'owner'}),{person_id:'buyer'});
 assert.equal(p.starts_on,null);assert.equal(p.start_unknown,true);
});
test('legacy tenant replacement has deterministic today/tomorrow fallback',()=>{
 const p=payloadV3('switch_tenant',form({person_id:'buyer',confirmation:'on'}),{id:'T',link_start:'2024-01-01'});
 assert.equal(p.ends_on,today());assert.equal(p.starts_on,followingDay(today()));
});
test('legacy role ending has today fallback and no required field',()=>{
 const x=d(),s={data:x,role:'super'};
 assert.doesNotMatch(buildV3Form(s,'end_link',{id:'T'}).body,/name="ends_on"[^>]*required/);
 assert.equal(payloadV3('end_link',form({}),{id:'T',link_start:'2024-01-01'}).ends_on,today());
});
