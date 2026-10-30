import test from 'node:test';
import assert from 'node:assert/strict';
import {AyaparkApi} from '../api.mjs';
import {visible} from '../ui.mjs';
import {scopedCharges} from '../v3-domain.mjs';
test('own historical charge retains its apartment label without granting current apartment access',async()=>{
 const api=new AyaparkApi(undefined,{storage:null});api.session={user:{id:'own-user'}};
 const units=[{id:'current',code:'A-1',block_id:'b'},{id:'old',code:'A-2',block_id:'b'},{id:'foreign',code:'B-1',block_id:'b'}];
 api.read=async table=>({site_sites:[{id:'site'}],site_staff_memberships:[],site_units:units,site_blocks:[{id:'b',code:'A'}],site_resident_units:[{unit_id:'current'}],ay2_devir_snapshot:[]}[table]||[]);
 const charges=[{id:'history',unit_id:'old',person_id:'self',cents:1000},{id:'foreign-person',unit_id:'old',person_id:'other',cents:99999}];
 api.rpc=async name=>name==='ay5_workspace'?{capabilities:{},entries:[],charges,allocations:[],settings:[],persons:[{id:'self',is_self:true}],links:[],people:[],announcements:[],reports:[],staged_charges:[],audit:[],permissions:[]}:name==='ay3_provider_directory'?[]:{};
 const data=await api.load();
 assert.equal(data.units.find(u=>u.id==='old')?.code,'A-2');
 assert(!data.units.some(u=>u.id==='foreign'));
 assert.deepEqual(data.ownIds,['current']);
 assert.deepEqual(visible({data}).map(u=>u.id),['current']);
 assert.deepEqual(scopedCharges(data).map(c=>c.id),['history']);
 assert.equal(data.units.find(u=>u.id==='old').debt,null);
});
