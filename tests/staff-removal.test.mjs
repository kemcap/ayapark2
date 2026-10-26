import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildV3Form,payloadV3} from '../v3-forms.mjs?v=5.3.1';
import {settingsPage} from '../settings-ui.mjs?v=5.3.1';

const staff=[
 {user_id:'actor',role:'manager',name:'Primary administrator',email:'primary@example.invalid'},
 {user_id:'other',role:'deputy',name:'Assistant',email:'assistant@example.invalid'}
];
const data={staff,persons:[],permissions:[],userId:'actor',transactions:[],audit:[],opening:0,openingDate:null};
function form(values){return new Map(Object.entries(values));}

test('management view offers remove next to edit for another member but not for yourself',()=>{
 const html=settingsPage({data,period:'2026-10'},true);
 assert.match(html,/data-action="staff_remove"[^>]*data-id="other"/);
 assert.doesNotMatch(html,/data-action="staff_remove"[^>]*data-id="actor"/);
 assert.match(html,/data-action="permissions"[^>]*data-id="other"/);
});

test('remove form explains boundaries and requires confirmation and reason',()=>{
 const removal=buildV3Form({data},'staff_remove',{id:'other'});
 assert.equal(removal.context.user_id,'other');
 assert.match(removal.body,/name="reason"/);
 assert.match(removal.body,/name="confirmation"/);
 assert.match(removal.body,/muhasebe kayıtları silinmeyecek/);
 assert.throws(()=>payloadV3('staff_remove',form({reason:'Departing'}),removal.context));
 assert.throws(()=>payloadV3('staff_remove',form({reason:'x',confirmation:'on'}),removal.context));
 const payload=payloadV3('staff_remove',form({reason:'Departing',confirmation:'on'}),removal.context);
 assert.equal(payload.user_id,'other');
 assert.equal(payload.reason,'Departing');
 assert.equal(payload.confirmation,true);
});

test('a manager cannot remove themself or the last manager',()=>{
 assert.throws(()=>buildV3Form({data},'staff_remove',{id:'actor'}));
 const last={...data,userId:'other',staff:[staff[0],staff[1]]};
 assert.throws(()=>buildV3Form({data:last},'staff_remove',{id:'actor'}));
 const onlyManager={...data,userId:'other',staff:[staff[0]]};
 assert.throws(()=>buildV3Form({data:onlyManager},'staff_remove',{id:'actor'}));
});

test('SQL procedure revokes membership only and records audit trail',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261024194000_remove_management_member.sql',import.meta.url),'utf8');
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/role='manager'/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/p_user=v_actor/);
 assert.match(sql,/DELETE FROM public\.site_staff_memberships/);
 assert.match(sql,/DELETE FROM public\.ay2_permissions/);
 assert.match(sql,/'staff_remove'/);
 assert.doesNotMatch(sql,/DELETE FROM auth\.users/i);
 assert.doesNotMatch(sql,/DELETE FROM public\.ay2_charges/i);
});
