import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculateClaims} from '../supabase/functions/ay3-site-open-claims/math.mjs';
import {residentClaimsCards,residentClaimsPanel} from '../site-claims-ui.mjs?v=5.10.0';
import {scopedCharges} from '../v3-domain.mjs?v=5.10.0';
import {AyaparkApi} from '../api.mjs?v=5.10.0';

const units=Array.from({length:20},(_,i)=>({id:'u'+i,code:(i<10?'A-':'B-')+(i%10+1)}));
const fixture={
 units, ownUnitIds:['u0','u15'],
 charges:[
  {id:'a',unit_id:'u0',cents:150000}, // 50,000 allocated => 100,000 open
  {id:'b',unit_id:'u1',cents:80000}, // 10,000 allocated => 70,000 open, other unit
  {id:'c',unit_id:'u15',cents:100000}, // 20,000 allocated => 80,000 open
  {id:'void',unit_id:'u3',cents:999999,void_reason:'cancelled'},
  {id:'fully',unit_id:'u2',cents:10000},
  {id:'extra',unit_id:'u4',cents:5000}
 ],
 allocations:[
  {charge_id:'a',entry_id:'e1',cents:50000},
  {charge_id:'b',entry_id:'e2',cents:10000},
  {charge_id:'c',entry_id:'e3',cents:20000},
  {charge_id:'fully',entry_id:'e4',cents:10000},
  {charge_id:'extra',entry_id:'e5',cents:5000,void_reason:'voided'}
 ],
 entries:[
  {id:'e1',cents:55000}, // remaining 5,000 unassigned
  {id:'e2',cents:10000},
  {id:'e3',cents:20000},
  {id:'e4',cents:10000},
  {id:'old',cents:12000}, // reversed, ignore
  {id:'reverse',cents:-12000,reversal_of:'old'}
 ],
 credits:[{entry_id:'e1',cents:2000}],
 staged:[{id:'new',confirmed_charge:null,ignored_reason:null},{id:'confirmed',confirmed_charge:'x'},{id:'ignored',ignored_reason:'duplicate'}]
};
test('20-unit site total includes own units without double addition',()=>{
 const result=calculateClaims(fixture);
 assert.equal(result.site_total_cents,255000); // 100k+70k+80k+5k
 assert.equal(result.own_total_cents,180000);
 assert.equal(result.site_unit_count,20);
 assert.deepEqual(result.own_units.map(u=>[u.code,u.open_cents]),[['A-1',100000],['B-6',80000]]);
 assert.ok(result.site_total_cents>=result.own_total_cents);
 assert.equal(result.open_charge_count,4);
});
test('unmatched incoming entries and unapproved legacy charges remain separate',()=>{
 const r=calculateClaims(fixture);
 assert.equal(r.unmatched_entry_count,1);
 assert.equal(r.unmatched_entry_cents,3000);
 assert.equal(r.pending_source_count,1);
 assert.equal(r.site_total_cents,255000);
});
test('void allocations do not reduce debts and negative overpayments do not create negative debt',()=>{
 const a=calculateClaims({units:[units[0]],ownUnitIds:['u0'],
  charges:[{id:'charge',unit_id:'u0',cents:10000}],
  allocations:[{charge_id:'charge',entry_id:'x',cents:9000,void_reason:'cancelled'}]});
 assert.equal(a.own_total_cents,10000);
 const b=calculateClaims({units:[units[0]],ownUnitIds:['u0'],
  charges:[{id:'charge',unit_id:'u0',cents:10000}],
  allocations:[{charge_id:'charge',entry_id:'x',cents:14000}]});
 assert.equal(b.site_total_cents,0);
});
test('site-wide disclosure sends only aggregate and my own apartment details',async()=>{
 const f=await readFile(new URL('../supabase/functions/ay3-site-open-claims/index.ts',import.meta.url),'utf8');
 assert.match(f,/getUser\(bearer\)/);
 assert.match(f,/site_resident_units/);
 assert.match(f,/siteUnitIds\.has\(r\.unit_id\)/);
 assert.match(f,/siteClaims|calculateClaims/);
 assert.doesNotMatch(f,/reply\(\{.*charges/);
 const r=calculateClaims(fixture);
 assert.equal('other_units' in r,false);
 assert.equal(r.own_units.some(u=>u.code==='A-2'),false);
});
test('both resident dashboard and apartment page show separate claims, with no additive KPI',async()=>{
 const data={role:'resident',siteClaims:calculateClaims(fixture)};
 const state={data};
 const cards=residentClaimsCards(state);
 const html=residentClaimsPanel(state);
 assert.match(cards,/Açık|alacak|borç/i);
 assert.equal((cards.match(/class="card claim-metric(?: claim-metric-action)?"/g)||[]).length,2);
 assert.match(cards,/180.000|1.800/); // locale-dependent thousands or value in TL
 assert.match(cards,/255.000|2.550/);
 assert.match(html,/A-1/);
 assert.match(html,/B-6/);
 assert.doesNotMatch(html,/A-2/);
 const view=await readFile(new URL('../v3-ui.mjs?v=5.10.0',import.meta.url),'utf8');
 assert.match(view,/directoryV3\(s\).*residentClaimsPanel\(s\)/);
 assert.match(view,/overviewV3\(s\)/);
 assert.match(view,/residentClaimsPanel\(s\)/);
});
test('legacy/no-person charges are visible on authorized own units only',()=>{
 const data={role:'resident',v5:true,financialUnitIds:['u0'],
  ownIds:['u0'],ownPersonIds:['p0'],charges:[
   {id:'linked',unit_id:'u0',person_id:'p0'},
   {id:'unbound',unit_id:'u0',person_id:null},
   {id:'foreign',unit_id:'u1',person_id:null}
  ]};
 assert.deepEqual(scopedCharges(data).map(x=>x.id),['linked','unbound']);
});
test('resident aggregate API uses session bearer token and no site ID supplied by client',async()=>{
 const calls=[];
 const api=new AyaparkApi(async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({site_total_cents:255000,own_total_cents:180000})};
 },{persist:false});
 api.accept({access_token:'access-1',refresh_token:'refresh',expires_in:3600,user:{id:'my-user'}},api.generation);
 await api.siteClaims();
 assert.match(calls[0].url,/\/functions\/v1\/ay3-site-open-claims$/);
 assert.equal(calls[0].options.headers.Authorization,'Bearer access-1');
 assert.equal(calls[0].options.body,'{}');
});
