import test from 'node:test';
import assert from 'node:assert/strict';
import {AyaparkApi} from '../api.mjs?v=5.10.0';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(role='manager',count=6){
 const calls=[],api=new AyaparkApi(undefined,{storage:null});api.session={user:{id:'qa-user'}};
 const units=[{id:'u1',block_id:'b',number:1,code:'A-1'},{id:'u2',block_id:'b',number:2,code:'A-2'}];
 const charges=Array.from({length:count},(_,i)=>({id:'c'+i,unit_id:units[i%2].id,cents:'1000',void_reason:i===2?'cancelled':null}));
 const allocations=charges.flatMap((c,i)=>[{id:'a'+i,charge_id:c.id,cents:'200'},{id:'v'+i,charge_id:c.id,cents:'100',void_reason:'reversed'}]);
 const capabilities={finance:role==='manager',admin:role==='manager',people:true};
 const workspace={capabilities,entries:[],charges,allocations,settings:[],people:[],links:[],persons:[]};
 api.read=async(table,q)=>{calls.push([table,q]);return ({site_sites:[{id:'s'}],site_staff_memberships:role==='resident'?[]:[{role}],site_units:units,ay2_devir_snapshot:[],site_blocks:[{id:'b',code:'A'}],site_resident_units:[{unit_id:'u1'}]})[table];};
 api.readAll=async(table,q)=>{calls.push(['all:'+table,q]);return [{user_id:'resident',unit_id:'u1'}];};
 api.rpc=async(name)=>{calls.push([name]);return name==='ay5_workspace'?workspace:name==='ay3_staff_directory'?[]:{};};
 return {api,calls,units,charges,allocations,workspace};
}
test('workspace debt matches existing accounting semantics, including voids and missing allocations',async()=>{
 const f=fixture();f.charges.push({id:'unpaid',unit_id:'u2',cents:'775',void_reason:null});
 f.allocations.push({charge_id:'c0',cents:'1200'});
 const data=await f.api.load();
 for(const u of data.units){const expected=f.charges.filter(c=>c.unit_id===u.id&&!c.void_reason).reduce((sum,c)=>sum+Number(c.cents)-f.allocations.filter(a=>a.charge_id===c.id&&!a.void_reason).reduce((n,a)=>n+Number(a.cents),0),0);assert.equal(u.debt,expected);}
 assert.equal(data.residentAccounts.length,1);
});
test('administrator resident-account load starts before workspace finishes',async()=>{
 const f=fixture(),gate=deferred(),started=deferred(),original=f.api.rpc;
 f.api.rpc=async(name)=>{if(name==='ay5_workspace'){started.resolve();await gate.promise;}return original(name);};
 const pending=f.api.load();await started.promise;
 assert(f.calls.some(([name])=>name==='all:site_resident_units'));
 gate.resolve();await pending;
});
test('resident/staff scopes and protected amounts stay unchanged',async()=>{
 for(const role of ['resident','deputy','auditor']){const f=fixture(role),data=await f.api.load();
  assert(!f.calls.some(([name])=>name==='all:site_resident_units'||name==='ay3_staff_directory'));
  assert.equal(data.units[0].debt,1600); // c2 is void, c0/c4 remain.
  if(role==='resident')assert.equal(data.units.length,1);else assert.equal(data.units[1].debt,null);
 }
});
test('large response computes all unit totals with the same result',async()=>{
 const f=fixture('manager',20000),data=await f.api.load();
 assert.equal(data.charges.length,20000);assert.equal(data.allocations.length,40000);
 assert.equal(data.units[0].debt,9999*800);assert.equal(data.units[1].debt,10000*800);
});
test('readAll preserves pagination rather than silently truncating after 1000 rows',async()=>{
 const api=new AyaparkApi(undefined,{storage:null}),offsets=[];
 api.read=async(_table,q)=>{const n=Number(new URLSearchParams(q).get('offset'));offsets.push(n);return Array.from({length:n<2000?1000:1},(_,i)=>({id:n+i}));};
 const rows=await api.readAll('site_resident_units','select=user_id');assert.equal(rows.length,2001);assert.deepEqual(offsets,[0,1000,2000]);
});
test('management read projection enables apartment balances without any editing capability',async()=>{
 const f=fixture('deputy');f.workspace.management_read=true;f.workspace.capabilities={admin:false,finance:false,people:false};
 f.workspace.persons=[{id:'owner',full_name:'Synthetic owner',is_self:false}];f.workspace.links=[{id:'owner-link',unit_id:'u2',person_id:'owner',role:'owner',active:true}];
 const old=f.api.rpc;f.api.rpc=async name=>name==='ay3_draft_workspace'?{tasks:{charges_prepare:true},grants:[{user_id:'qa-user',tasks:['charges_prepare'],management_read:true}],preparation:{persons:[],links:[]}}:old(name);
 const data=await f.api.load();assert.equal(data.managementRead,true);assert.equal(data.capabilities.finance,false);assert.equal(data.capabilities.people,false);assert.equal(data.persons[0].full_name,'Synthetic owner');assert(data.units.every(u=>typeof u.debt==='number'));assert.equal(data.links[0].id,'owner-link');assert.equal(data.opening,null,'allocated-payment projection must not become an account balance');
});
test('management opt-out does not infer new read access from the role label',async()=>{
 const f=fixture('deputy');f.workspace.management_read=false;f.workspace.capabilities={admin:false,finance:false,people:false};const data=await f.api.load();assert.equal(data.managementRead,false);assert.equal(data.units.find(u=>u.id==='u2').debt,null);
});
