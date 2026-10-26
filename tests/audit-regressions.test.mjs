import test from 'node:test';
import assert from 'node:assert/strict';
import {AyaparkApi} from '../api.mjs?v=5.8.0';
import {filteredTransactions,withPaymentIndex,suggestUnits,creditAvailable,isReversed} from '../v3-domain.mjs?v=5.8.0';
import {fullDemo,withLedgerIndex} from '../ledger.mjs?v=5.8.0';
import {overviewV3} from '../v3-ui.mjs?v=5.8.0';

test('pagination refuses to combine results from different login generations',async()=>{
 const api=new AyaparkApi(undefined,{persist:false});
 let calls=0;
 api.read=async()=>{calls++;if(calls===1){api.clear();api.session={user:{id:'another-user'}};return Array.from({length:1000},()=>({id:'old-user-row'}));}return [{id:'new-user-row'}];};
 await assert.rejects(api.readAll('site_resident_units','select=user_id'),/Oturum/);
 assert.equal(calls,1);
});
test('load refuses mixed generations even when the new login has the same user id',async()=>{
 const api=new AyaparkApi(undefined,{persist:false});api.session={user:{id:'user'}};
 api.read=async table=>{
  if(table==='site_sites'){api.clear();api.session={user:{id:'user'}};return [{id:'site'}];}
  return [];
 };
 api.rpc=async()=>({capabilities:{},entries:[],charges:[],allocations:[],settings:[],persons:[],links:[]});
 await assert.rejects(api.load(),/Oturum/);
});
test('unmatched filtering preserves reversals, voids, credits, range and search',()=>{
 const d={transactions:[
  {id:'open',date:'2026-10-01',cents:1000,desc:'A-1 rent',category:'Aidat'},
  {id:'paid',date:'2026-10-01',cents:1000,desc:'Paid',category:'Aidat'},
  {id:'credited',date:'2026-10-01',cents:1000,desc:'Credit',category:'Aidat'},
  {id:'original',date:'2026-10-01',cents:1000,desc:'Reversed',category:'Aidat'},
  {id:'reversal',date:'2026-10-02',cents:-1000,reversal_of:'original',desc:'Storno',category:'Aidat'},
  {id:'expense',date:'2026-10-02',cents:-500,desc:'Expense',category:'Diğer'}],
  allocations:[{entry_id:'open',cents:500},{entry_id:'open',cents:500,void_reason:'cancelled'},{entry_id:'paid',cents:1000}],
  credits:[{entry_id:'credited',cents:1000},{entry_id:'open',cents:500,void_reason:'cancelled'}]};
 const s={data:d,filter:{type:'unmatched',q:'',preset:'all'}};
 assert.deepEqual(filteredTransactions(s).map(t=>t.id),['open']);
 s.filter.q='A-1';assert.equal(filteredTransactions(s).length,1);
 s.filter={type:'unmatched',q:'',preset:'custom',from:'2026-10-02',to:''};assert.deepEqual(filteredTransactions(s),[]);
 s.filter={type:'in',q:'',preset:'all'};assert.equal(filteredTransactions(s).length,4);
});
test('unmatched bank filter matches reference semantics over deterministic generated data',()=>{
 const transactions=Array.from({length:1729},(_,i)=>({id:'t'+i,date:'2026-10-'+String(i%28+1).padStart(2,'0'),cents:i%4?1000:-1000,desc:'payment '+i,category:'Aidat',reversal_of:i%31===0?'t'+(i-1):null}));
 const allocations=transactions.filter((_,i)=>i%3===0).map(t=>({entry_id:t.id,cents:500,void_reason:t.id.endsWith('0')?'cancelled':null}));
 const credits=transactions.filter((_,i)=>i%7===0).map(t=>({entry_id:t.id,cents:500}));
 const d={transactions,allocations,credits},s={data:d,filter:{q:'',type:'unmatched',preset:'all'}};
 const expected=transactions.filter(t=>t.cents>0&&!t.reversal_of&&!transactions.some(x=>x.reversal_of===t.id)&&t.cents-allocations.filter(a=>a.entry_id===t.id&&!a.void_reason).reduce((n,a)=>n+a.cents,0)-credits.filter(c=>c.entry_id===t.id&&!c.void_reason).reduce((n,c)=>n+c.cents,0)>0);
 assert.deepEqual(filteredTransactions(s),expected);
});
test('render payment index is equivalent and never survives a changed dataset',()=>{
 const d=fullDemo(),t=d.transactions[0];d.credits=[{entry_id:t.id,cents:500},{entry_id:t.id,cents:100,void_reason:'cancelled'}];
 const before=suggestUnits(d,t);
 withPaymentIndex(d,()=>{
  assert.deepEqual(suggestUnits(d,t),before);assert.equal(creditAvailable(d,t),500);assert.equal(isReversed(d,t),false);
  const other={...d,credits:[]};withPaymentIndex(other,()=>assert.equal(creditAvailable(other,t),0));
  assert.equal(creditAvailable(d,t),500);
 });
 d.credits.push({entry_id:t.id,cents:200});t.desc='Unknown payment';
 assert.equal(creditAvailable(d,t),700);assert.deepEqual(withPaymentIndex(d,()=>suggestUnits(d,t)),suggestUnits(d,t));
 assert.throws(()=>withPaymentIndex(d,()=>{throw Error('abort render');}));
 d.transactions.push({id:'reversal',reversal_of:t.id});assert.equal(isReversed(d,t),true);
});
test('overview markup is identical with and without request-local payment indexes',()=>{
 const s={data:fullDemo(),mode:'demo',page:'overview',filter:{q:'',block:'all',status:'all'},period:'2026-10'};
 assert.equal(withLedgerIndex(s.data,()=>overviewV3(s)),overviewV3(s));
});
