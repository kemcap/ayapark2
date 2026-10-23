import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs';
import {planRelationship,linkVersion,effectiveOccupancy,previousDay,relationshipPayload} from '../relationships.mjs';
import {buildForm,payloadFor} from '../forms.mjs';
const fixture=()=>{const d=fullDemo();d.links=d.links.filter(l=>l.role==='owner');d.persons.push({id:'buyer',full_name:'QA Buyer'});return d;};
const payload=(d,kind='owner_to_tenant',extra={})=>({request_id:'qa-request',kind,unit_id:'A-4',link_id:'demo-owner-link',expected:linkVersion(d.links.find(l=>l.id==='demo-owner-link')),effective_on:'2026-11-01',person_id:'buyer',occupancy:'occupied',...extra});
test('owner stays as tenant: one atomic plan preserves debt records and dated history',()=>{const d=fixture(),before=JSON.stringify(d.charges);demoCommand(d,'relationship_change',payload(d));assert.equal(d.links.find(l=>l.id==='demo-owner-link').ends_on,'2026-10-31');assert(d.links.some(l=>l.person_id==='buyer'&&l.role==='owner'&&l.starts_on==='2026-11-01'));assert(d.links.some(l=>l.person_id==='demo-owner'&&l.role==='tenant'&&l.starts_on==='2026-11-01'));assert.equal(JSON.stringify(d.charges),before);assert.equal(d.audit[0].action,'relationship_change');});
test('failed role transition rolls back person creation, link ending and occupancy',()=>{const d=fullDemo(),before=JSON.stringify(d);assert.throws(()=>demoCommand(d,'relationship_change',payload(d,'owner_to_tenant',{new_person:true,person_id:'',first_name:'New',last_name:'Owner'})));assert.equal(JSON.stringify(d),before);});
test('future vacancy is effective only after departure and same-day replacement wins',()=>{const d=fullDemo(),l=d.links.find(l=>l.id==='demo-tenant-link'),u=d.units.find(u=>u.id==='A-4');demoCommand(d,'relationship_change',payload(d,'moveout',{link_id:l.id,expected:linkVersion(l),occupancy:'vacant'}));assert.equal(effectiveOccupancy(d,u,'2026-10-31'),'occupied');assert.equal(effectiveOccupancy(d,u,'2026-11-01'),'vacant');demoCommand(d,'occupancy',{unit_id:u.id,status:'occupied'});assert.equal(effectiveOccupancy(d,u,'2026-10-23'),'occupied');});
test('tenant replacement and purchase keep old debtor and stop old roles',()=>{for(const kind of ['tenant_change','tenant_to_owner']){const d=fullDemo(),l=d.links.find(l=>l.id==='demo-tenant-link'),before=JSON.stringify(d.charges);demoCommand(d,'relationship_change',payload(d,kind,{link_id:l.id,expected:linkVersion(l),owner_link_id:'demo-owner-link',owner_expected:linkVersion(d.links[0]),person_id:'demo-former'}));assert.equal(d.links.find(x=>x.id===l.id).ends_on,'2026-10-31');if(kind==='tenant_to_owner'){assert.equal(d.links.find(x=>x.id==='demo-owner-link').ends_on,'2026-10-31');assert(d.links.some(x=>x.person_id===l.person_id&&x.role==='owner'&&x.starts_on==='2026-11-01'));}assert.equal(JSON.stringify(d.charges),before);}});
test('correction requires reason, rejects overlaps and owner coverage gaps',()=>{const d=fullDemo(),l=d.links.find(l=>l.id==='demo-tenant-link');assert.throws(()=>planRelationship(d,payload(d,'correction',{link_id:l.id,expected:linkVersion(l),role:'owner',starts_on:l.starts_on,ends_on:'',occupancy:'keep'})));assert.throws(()=>planRelationship(d,payload(d,'correction',{role:'representative',starts_on:'2022-01-01',reason:'Wrong role',occupancy:'keep'})));const p=payload(d,'correction',{link_id:l.id,expected:linkVersion(l),role:'representative',starts_on:l.starts_on,reason:'Wrong role',occupancy:'keep'});demoCommand(d,'relationship_change',p);assert.equal(d.links.find(x=>x.id===l.id).role,'representative');});
test('stale records cannot overwrite changes and retry does not duplicate',()=>{const d=fixture(),p=payload(d);d.links[0].starts_on='2021-01-01';assert.throws(()=>planRelationship(d,p));const fresh=payload(d);demoCommand(d,'relationship_change',fresh);const count=d.links.length;demoCommand(d,'relationship_change',fresh);assert.equal(d.links.length,count);});
test('unknown dates, leap boundaries and complete owner coverage are checked',()=>{assert.equal(previousDay('2028-03-01'),'2028-02-29');const d=fixture();d.links[0].starts_on=null;assert.doesNotThrow(()=>planRelationship(d,payload(d)));const gap=fixture();gap.links[0].ends_on='2026-10-01';assert.throws(()=>planRelationship(gap,payload(gap,'add',{person_id:'buyer',role:'tenant',effective_on:'2026-10-02',occupancy:'keep'})));});
test('guided add payload supports a new person and has no client data in request',()=>{const d=fixture(),s={data:d,mode:'demo'},b=buildForm(s,'relationship_change',{unit:'A-4',kind:'add'}),f=new FormData();for(const[k,v]of Object.entries({kind:'add',unit_id:'A-4',effective_on:'2026-11-01',person_id:'__new__',first_name:'QA',last_name:'New',role:'representative',occupancy:'keep'}))f.set(k,v);const p=payloadFor('relationship_change',f,b.context);assert.equal(p.new_person,true);assert.equal(p.relationshipData,undefined);demoCommand(d,'relationship_change',p);assert(d.persons.some(x=>x.full_name==='QA New'));});
test('departure form uses last dwelling day and starts vacancy on following day',()=>{const d=fullDemo(),b=buildForm({data:d},'relationship_change',{unit:'A-4',kind:'moveout'}),f=new FormData();for(const[k,v]of Object.entries({kind:'moveout',unit_id:'A-4',link_id:'demo-tenant-link',departure_on:'2026-10-22',occupancy:'vacant'}))f.set(k,v);const p=payloadFor('relationship_change',f,b.context);assert.equal(p.effective_on,'2026-10-23');const plan=planRelationship(d,p);assert.equal(plan.links.find(x=>x.id==='demo-tenant-link').ends_on,'2026-10-22');});

test('representative can be added without owner, while tenants still require owner coverage',()=>{
 const d=fixture();d.links=d.links.filter(l=>l.unit_id!=='A-4');const before=JSON.stringify({charges:d.charges,transactions:d.transactions});
 const p={request_id:'qa-representative',kind:'add',unit_id:'A-4',person_id:'buyer',role:'representative',effective_on:'2026-10-01',occupancy:'keep'};
 const plan=planRelationship(d,p);assert(plan.summary.some(s=>/Temsilci|Vertreter/.test(s)));
 demoCommand(d,'relationship_change',p);
 assert(d.links.some(l=>l.unit_id==='A-4'&&l.person_id==='buyer'&&l.role==='representative'));
 assert.equal(JSON.stringify({charges:d.charges,transactions:d.transactions}),before);
 assert.throws(()=>planRelationship(d,{...p,role:'tenant',request_id:'qa-tenant'}));
});
test('representative can predate recorded owner without rewriting owner history',()=>{
 const d=fixture(),owner=d.links.find(l=>l.id==='demo-owner-link'),old=linkVersion(owner);
 assert.doesNotThrow(()=>planRelationship(d,{request_id:'qa-representative-early',kind:'add',unit_id:'A-4',person_id:'buyer',role:'representative',effective_on:'2021-01-01',occupancy:'keep'}));
 assert.equal(linkVersion(owner),old);
});

test('retroactive correction from tenant to representative accepts unknown start and preserves recorded owner',()=>{
 const d=fixture(),owner=d.links.find(l=>l.id==='demo-owner-link');owner.starts_on='2026-10-09';
 const tenant={id:'qa-tenant-link',unit_id:'A-4',person_id:'buyer',role:'tenant',starts_on:'2026-10-09',ends_on:null};d.links.push(tenant);
 const original=linkVersion(owner),finances=JSON.stringify({charges:d.charges,transactions:d.transactions});
 const p={request_id:'qa-retro-correction',kind:'correction',unit_id:'A-4',link_id:tenant.id,expected:linkVersion(tenant),role:'representative',starts_on:null,start_unknown:true,ends_on:'',reason:'Rolle war falsch',occupancy:'keep'};
 assert.doesNotThrow(()=>planRelationship(d,p));demoCommand(d,'relationship_change',p);
 assert.equal(d.links.find(l=>l.id===tenant.id).role,'representative');assert.equal(d.links.find(l=>l.id===tenant.id).starts_on,null);
 assert.equal(linkVersion(owner),original);assert.equal(JSON.stringify({charges:d.charges,transactions:d.transactions}),finances);
});
