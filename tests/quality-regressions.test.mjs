import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {parseImport,templateHeader} from '../v3-import.mjs?v=5.10.0';
import {announcementActive,announcementStatus,filteredTransactions,financialSeries} from '../v3-domain.mjs?v=5.10.0';
import {overviewV3,duesV3,unitDetailV3,reportV3,bankV3,providersV3} from '../v3-ui.mjs?v=5.10.0';
import {buildForm,payloadFor} from '../forms.mjs?v=5.10.0';
import {setLanguage} from '../i18n.mjs?v=5.10.0';
const state=()=>({data:fullDemo(),mode:'demo',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',preset:'all'},reportFilter:{preset:'all'}});
const csv=(income,expense,unit='A-1')=>templateHeader+'\n2026-10-23;ref;Sender;Payment;'+income+';'+expense+';'+unit+';;';

test('authorized apartment view retains both debtors with no management actions',()=>{
 const s=state();s.data.role='resident';s.data.ownPersonIds=['demo-former'];
 s.data.charges.find(c=>c.id==='demo-former-charge').label='OWN FORMER DEBT';
 s.data.charges.find(c=>c.id==='demo-own-charge').label='OTHER PERSON DEBT';
 for(const html of [duesV3(s),unitDetailV3(s,'A-4')]){
  assert(html.includes('OWN FORMER DEBT'));assert(html.includes('OTHER PERSON DEBT'));
  assert(!html.includes('data-action="allocate"'));assert(!html.includes('data-action="void_charge"'));
 }
 assert(unitDetailV3(s,'A-4').includes('₺7.200,00'));
});
test('management still separates previous debts from the current apartment balance',()=>{
 const html=unitDetailV3(state(),'A-4');assert(html.includes('₺3.600,00'));assert(html.includes('₺7.200,00'));assert(html.includes('Önceki sakinlerden kalan'));
});
test('the new CSV format rejects signed income and expense but preserves kuruş and direction',()=>{
 for(const [income,expense] of [['-10',''],['+10',''],['','-10'],['','+10']])assert.throws(()=>parseImport(csv(income,expense)),/pozitif/);
 assert.equal(parseImport(csv('0,01','')).entries[0].cents,1);
 assert.equal(parseImport(csv('','1.234,56')).entries[0].cents,-123456);
 assert.throws(()=>parseImport(csv('0','')));
});
test('legacy signed CSV and signed bank balances stay supported',()=>{
 assert.equal(parseImport('tarih;aciklama;tutar\n2026-10-23;Expense;-10,00').entries[0].cents,-1000);
 assert.equal(parseImport(csv('10','')+'-12,34').entries[0].balance_cents,-1234);
});
test('CSV apartment hints match the twenty existing apartments',()=>{
 for(const unit of ['A-0','B-11','A-99','A-01'])assert.throws(()=>parseImport(csv('10','',unit)),/A-1/);
 for(const unit of ['a1','A 10','B-10'])assert(/^([AB])-([1-9]|10)$/.test(parseImport(csv('10','',unit)).entries[0].unit_hint));
 assert.equal(parseImport(csv('10','','')).entries[0].unit_hint,'');
});
test('overview counts and highlights active scheduled announcements only',()=>{
 const s=state();s.data.announcements=[
  {id:'active',title:'ACTIVE SCHEDULED',body:'body',published:true,priority:'urgent',starts_at:'2020-01-01T00:00:00+03:00'},
  {id:'expired',title:'EXPIRED',body:'body',published:true,priority:'urgent',ends_at:'2020-01-01T00:00:00Z'},
  {id:'future',title:'FUTURE',body:'body',published:true,priority:'urgent',starts_at:'2099-01-01T00:00:00Z'}];
 const html=overviewV3(s);assert(html.includes('ACTIVE SCHEDULED'));assert(!html.includes('EXPIRED'));assert(!html.includes('FUTURE'));
 assert.match(html,/<strong class="large-amount">1<\/strong>/);
});
test('announcement scheduling compares instants, with inclusive start and exclusive end',()=>{
 const a={published:true,starts_at:'2026-10-23T12:00:00+03:00',ends_at:'2026-10-23T13:00:00+03:00'};
 assert.equal(announcementStatus(a,'2026-10-23T08:59:59Z'),'Planlandı');
 assert(announcementActive(a,'2026-10-23T09:00:00Z'));assert(announcementActive(a,'2026-10-23T09:59:59Z'));
 assert.equal(announcementStatus(a,'2026-10-23T10:00:00Z'),'Arşiv');
 assert.equal(announcementActive({...a,starts_at:'bad'},'2026-10-23T09:00:00Z'),false);
 assert.equal(announcementStatus({...a,published:false}),'Taslak');
});
test('an inverted bank range reports an error and cannot be exported as an empty set',()=>{
 const s=state();Object.assign(s.filter,{preset:'custom',from:'2026-10-24',to:'2026-10-01'});
 assert(bankV3(s).includes('role="alert"'));assert.throws(()=>filteredTransactions(s),/Bitiş/);
});
test('an invalid report range shows feedback without zero totals or print/export actions',()=>{
 const s=state();s.reportFilter={preset:'custom',from:'2026-10-24',to:'2026-10-01'};
 const html=reportV3(s);assert(html.includes('role="alert"'));assert(!html.includes('data-action="export_report"'));assert(!html.includes('data-action="print"'));assert(!html.includes('report-metrics'));
 assert.throws(()=>financialSeries(s.data,s.reportFilter),/Bitiş/);
});
test('open-ended and equal date ranges remain valid',()=>{
 const s=state();Object.assign(s.filter,{preset:'custom',from:'2026-10-20',to:'2026-10-20'});assert.equal(filteredTransactions(s).length,1);
 s.filter.from='';assert.equal(filteredTransactions(s).length,6);s.filter.from='2026-10-20';s.filter.to='';assert.equal(filteredTransactions(s).length,1);
});
test('charge form requires both valid period dates in chronological order',()=>{
 const s=state(),context=buildForm(s,'charge').context;
 const form=new FormData();for(const[k,v]of Object.entries({amount:'10',unit_id:'A-4',payer:'review',label:'Period',due_on:'2026-10-01',category:'Aidat'}))form.set(k,v);
 for(const [from,to] of [['2026-10-01',''],['','2026-10-31'],['2026-10-31','2026-10-01'],['2026-02-30','2026-03-01']]){form.set('period_from',from);form.set('period_to',to);assert.throws(()=>payloadFor('charge',form,context),/dönem/);}
 form.set('period_from','2026-10-01');form.set('period_to','2026-10-31');const p=payloadFor('charge',form,context);assert.equal(p.period_from,'2026-10-01');assert.equal(p.period_to,'2026-10-31');
 form.set('period_from','');form.set('period_to','');assert.doesNotThrow(()=>payloadFor('charge',form,context));
});
test('German provider categories are translated and searchable without changing stored content',()=>{
 const s=state();s.data.providers=[{id:'qa',name:'Temizlik Ltd',category:'Temizlik',status:'preferred',phone:'05550000000'}];
 setLanguage('de');try{s.providerQuery='Reinigung';const html=providersV3(s);assert(html.includes('value="Temizlik">Reinigung</option>'));assert(html.includes('Temizlik Ltd'));assert(html.includes('<span class="provider-service-tag">Reinigung</span>'));assert.equal(s.data.providers[0].category,'Temizlik');}finally{setLanguage('tr');}
});

test('overview uses the same B-first apartment plan and a wider dedicated layout',()=>{
 const s=state();s.data.units=[
  {id:'A-1',code:'A-1',number:1,block:'A',occupancy_status:'unknown'},
  {id:'B-1',code:'B-1',number:1,block:'B',occupancy_status:'unknown'}
 ];
 const html=overviewV3(s);
 assert(html.includes('class="main-grid overview-main-grid"'));
 assert(html.indexOf('<h3>B Blok</h3>') < html.indexOf('<h3>A Blok</h3>'));
 assert(html.includes('data-action="unit"'));
});
