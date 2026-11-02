import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {overviewV3,overviewAccountCard} from '../v3-ui.mjs?v=5.10.0';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {setLanguage} from '../i18n.mjs?v=5.10.0';
import {money} from '../core.mjs?v=5.10.0';
import {financePayload} from '../finance-forms.mjs?v=5.10.0';

test('dashboard shows ledger balance without subtracting resident credits a second time',()=>{
 setLanguage('tr');
 const d=fullDemo();
 d.role='super';d.v5=true;d.summaryBalance=6542312;d.summaryOpening=0;d.sourceLastDate='2026-11-02';
 d.credits=[
  {id:'yasemin',unit_id:'B-10',person_id:'yasemin',cents:360000,void_reason:null},
  {id:'cemile',unit_id:'B-9',person_id:'cemile',cents:360000,void_reason:null},
  {id:'cancelled',unit_id:'B-3',person_id:'other',cents:90000,void_reason:'cancelled'}
 ];
 const balance=overviewAccountCard({data:d});
 assert(balance.includes(money(6542312)));
 assert.match(balance,/data-action="refresh_dashboard"/);
 assert.match(balance,/2026-11-02/);
 const overview=overviewV3({mode:'demo',data:d});
 assert(overview.includes(money(720000)),'unapplied credits must be displayed separately');
 assert.match(overview,/Henüz mahsup edilmemiş alacaklar/);
 assert.match(overview,/Alacaklar başka kişilerin borçlarından düşülmez/);
 assert(overview.includes(money(6542312)));
});
test('finance preview signatures remain binding and require new approval after an edit',()=>{
 const context={request_id:'3ca508fd-a9e3-456e-bc9e-8a316a1fe0c1',unit_scope:{}};
 const form=new FormData();
 for(const [name,value] of Object.entries({scope:'all',distribution:'per_unit',amount:'3.600,00',due_on:'2026-11-01',label:'Kasım 2026 Aidat',debt_group:'general',basis_ref:'Karar Defteri 2026',category:'Aidat','debtor:unit-one':'link-one'}))form.set(name,value);
 const proposal=financePayload('monthly_v5',form,context,{previewing:true});
 context.previewSignature=JSON.stringify(proposal);
 context.preview=[{unit_id:'unit-one',cents:360000}];
 form.set('confirmed','on');
 const ready=financePayload('monthly_v5',form,context);
 assert.equal(ready.confirmed,true);
 assert.equal(ready.expected['unit-one'],360000);
 form.set('amount','3.700,00');
 assert.throws(()=>financePayload('monthly_v5',form,context),/Önizlemeyi yeniden açın/);
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(app,/await updateFinancePreview\(\)/);
 assert.match(app,/confirm\.checked=false/);
 assert.match(app,/data-action="refresh_dashboard"/);
});
