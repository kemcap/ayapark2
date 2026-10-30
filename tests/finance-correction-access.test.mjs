import {financePanel} from '../finance-forms.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {charges,transactionDetailV3} from '../v3-ui.mjs?v=5.9.25';
import {allocationTable} from '../ui.mjs?v=5.9.0';
const fixture=admin=>({mode:'live',filter:{q:'',block:'all',status:'all'},data:{
 role:admin?'super':'staff',capabilities:{finance:true,admin},units:[{id:'u',code:'A-1'}],
 charges:[{id:'c',unit_id:'u',person_id:'p',cents:1000,label:'QA charge'}],
 persons:[{id:'p',full_name:'Synthetic owner'}],links:[],staged:[],
 allocations:[{id:'a',charge_id:'c',entry_id:'e',cents:200}],credits:[],
 transactions:[{id:'e',cents:1000,date:'2026-10-01',desc:'Synthetic payment',category:'Aidat'}]
}});
test('finance staff can allocate but cannot cancel charges or existing allocations',()=>{
 const s=fixture(false);
 assert.match(charges(s,s.data.charges),/data-action="auto_allocate"/);
 assert.doesNotMatch(charges(s,s.data.charges),/data-action="void_charge"/);
 assert.doesNotMatch(allocationTable(s),/data-action="unallocate"/);
 const bank=transactionDetailV3(s,'e');
 assert.match(bank,/data-action="auto_allocate"/);
 assert.doesNotMatch(bank,/data-action="reverse"/);assert.doesNotMatch(bank,/data-action="classify_entry"/);for(const action of ['entry','budget','monthly_exception'])assert(!financePanel(s).includes('data-action="'+action+'"'));
 s.data.credits=[{id:'cr',entry_id:'e',person_id:'p',cents:100}];
 assert.doesNotMatch(transactionDetailV3(s,'e'),/data-action="void_credit"/);
});
test('superadmin retains correction controls and reversed status stays accurate',()=>{
 const s=fixture(true);
 assert.match(allocationTable(s),/data-action="unallocate"/);
 assert.match(transactionDetailV3(s,'e'),/data-action="reverse"/);
 s.data.allocations=[];
 assert.match(charges(s,s.data.charges),/data-action="void_charge"/);
 s.data.credits=[{id:'cr',entry_id:'e',person_id:'p',cents:100}];
 assert.match(transactionDetailV3(s,'e'),/data-action="void_credit"/);
 s.data.transactions.push({id:'r',reversal_of:'e',cents:-1000});
 assert.doesNotMatch(transactionDetailV3(s,'e'),/data-action="reverse"/);
});
