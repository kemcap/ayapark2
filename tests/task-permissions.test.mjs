import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLegacyForm,payloadLegacy} from '../forms.mjs?v=5.10.0';
import {AyaparkApi} from '../api.mjs?v=5.10.0';
import {inviteEligible} from '../invite-ui.mjs?v=5.10.0';
import {taskOptions} from '../task-permissions.mjs?v=5.10.0';
test('administration form exposes five task checkboxes plus independent default-on read checkbox and serializes them',()=>{
 const s={data:{units:[],permissions:[],taskGrants:[{user_id:'staff',tasks:['bank_reconcile']}]}};
 const f=buildLegacyForm(s,'permissions',{id:'staff'});
 for(const [key] of taskOptions())assert(f.body.includes('name="'+key+'"'));
 assert.equal((f.body.match(/type="checkbox"/g)||[]).length,6);
 const p=payloadLegacy('permissions',new Map([['task_mode','1'],['people_manage','on'],['finance','on']]),{id:'staff'});
 assert.deepEqual(p.tasks,['people_manage']);assert.equal(p.capabilities,undefined);assert.equal(p.management_read,false);
 assert.match(f.body,/name="management_read"[^>]*checked/);
 const off=buildLegacyForm({data:{...s.data,taskGrants:[{user_id:'staff',tasks:[],management_read:false}]}},'permissions',{id:'staff'});assert.doesNotMatch(off.body,/name="management_read"[^>]*checked/);
});
test('task grant edits use the dedicated server RPC without changing legacy grants',async()=>{
 const api=new AyaparkApi(),calls=[];api.rpc=async(...args)=>calls.push(args);
 await api.command('site','permissions',{user_id:'staff',tasks:['bank_reconcile']});
 assert.deepEqual(calls,[['ay7_set_management_rights',{p_site:'site',p_user:'staff',p_tasks:['bank_reconcile'],p_management_read:true}]]);
});
test('delegated invitation requires explicit task and remains gated by existing eligibility',()=>{
 const person={id:'p',registered:false},base={mode:'connected',data:{role:'staff',persons:[person],links:[{person_id:'p',role:'tenant',active:true}],taskCapabilities:{occupancy_invite:true}}};
 assert(inviteEligible(base,person));assert(!inviteEligible({...base,data:{...base.data,taskCapabilities:{people_manage:true}}},person));
 assert(!inviteEligible(base,{...person,registered:true}));
});
