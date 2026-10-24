import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo,demoCommand} from '../ledger.mjs';
import {tenantOwnerCovered} from '../relationships.mjs';

const sample=()=>fullDemo();
const financial=d=>JSON.stringify({persons:d.persons,charges:d.charges,transactions:d.transactions,allocations:d.allocations});
const link=(d,unit,person,role,starts_on,ends_on=null)=>demoCommand(d,'link',{unit_id:unit,person_id:person,role,starts_on,ends_on,start_unknown:starts_on===null});

test('legacy owner start edit cannot move past a registered tenant',()=>{
 const d=sample(),snapshot=financial(d);
 assert.throws(()=>demoCommand(d,'edit_link',{id:'demo-owner-link',starts_on:'2027-01-01',ends_on:''}),/ev sahibi|Eigentümer/);
 assert.equal(d.links.find(l=>l.id==='demo-owner-link').starts_on,'2022-01-01');
 assert.equal(financial(d),snapshot);
});

test('legacy tenant date edit cannot predate owner history',()=>{
 const d=sample();
 assert.throws(()=>demoCommand(d,'edit_link',{id:'demo-tenant-link',starts_on:'2020-01-01',ends_on:''}),/ev sahibi|Eigentümer/);
 assert.equal(d.links.find(l=>l.id==='demo-tenant-link').starts_on,'2026-10-01');
});

test('legacy tenant unknown start cannot bypass dated owner requirement',()=>{
 const d=sample();
 assert.throws(()=>demoCommand(d,'edit_link',{id:'demo-tenant-link',starts_on:null,start_unknown:true,ends_on:''}),/ev sahibi|Eigentümer/);
 assert.equal(d.links.find(l=>l.id==='demo-tenant-link').starts_on,'2026-10-01');
});

test('legacy direct link with unknown tenant start must be covered',()=>{
 const d=sample();
 link(d,'B-1','demo-owner','owner','2022-01-01');
 const oldCount=d.links.length;
 assert.throws(()=>link(d,'B-1','demo-tenant','tenant',null),/ev sahibi|Eigentümer/);
 assert.equal(d.links.length,oldCount);
});

test('direct tenant across adjacent ownership periods is valid',()=>{
 const d=sample();
 link(d,'B-2','demo-owner','owner','2025-01-01','2025-12-31');
 link(d,'B-2','demo-former','owner','2026-01-01');
 assert.doesNotThrow(()=>link(d,'B-2','demo-tenant','tenant','2025-07-01'));
 assert.equal(tenantOwnerCovered(d.links,'B-2'),true);
});

test('unknown owner start can cover unknown tenant start',()=>{
 const d=sample();
 link(d,'B-3','demo-owner','owner',null);
 assert.doesNotThrow(()=>link(d,'B-3','demo-tenant','tenant',null));
 assert.equal(tenantOwnerCovered(d.links,'B-3'),true);
});

test('representative is independent of owner and its dates are editable',()=>{
 const d=sample();
 link(d,'B-4','demo-former','representative','2025-01-01');
 const l=d.links.find(l=>l.unit_id==='B-4'&&l.role==='representative');
 assert.doesNotThrow(()=>demoCommand(d,'edit_link',{id:l.id,start_unknown:true,ends_on:''}));
 assert.equal(l.starts_on,null);
});

test('ending required ownership via direct end_link is rejected',()=>{
 const d=sample(),original=d.links.find(l=>l.id==='demo-owner-link').ends_on;
 assert.throws(()=>demoCommand(d,'end_link',{id:'demo-owner-link',ends_on:'2025-01-01'}),/ev sahibi|Eigentümer/);
 assert.equal(d.links.find(l=>l.id==='demo-owner-link').ends_on,original);
});

test('valid extension of owner history is allowed without changing any money',()=>{
 const d=sample(),snapshot=financial(d);
 assert.doesNotThrow(()=>demoCommand(d,'edit_link',{id:'demo-owner-link',starts_on:'2020-01-01',ends_on:''}));
 assert.equal(d.links.find(l=>l.id==='demo-owner-link').starts_on,'2020-01-01');
 assert.equal(financial(d),snapshot);
});
