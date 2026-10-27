import {isFinanceV5,demoFinanceCommand} from './finance-demo.mjs?v=5.8.1';
import {enrichDemo,demoV3,bindDemoCharge} from './v3-ledger.mjs?v=5.8.1';
import {creditAvailable,buildSummaryDays,withPaymentIndex} from './v3-domain.mjs?v=5.9.0';
import {t as tr} from './i18n.mjs?v=5.8.1';
import {demoData as base,summarize,randomId} from './core.mjs?v=5.8.1';
let computation=null;
// Cache only within one synchronous rendering pass. Mutations never share this cache.
export function withLedgerIndex(d,fn){if(computation?.data===d)return fn();const previous=computation,byCharge=new Map(),byEntry=new Map();for(const a of d.allocations||[])if(!a.void_reason){byCharge.set(a.charge_id,(byCharge.get(a.charge_id)||0)+Number(a.cents));byEntry.set(a.entry_id,(byEntry.get(a.entry_id)||0)+Number(a.cents));}computation={data:d,byCharge,byEntry};try{return withPaymentIndex(d,fn);}finally{computation=previous;}}
export const paid=(d,id)=>computation?.data===d?(computation.byCharge.get(id)||0):d.allocations.filter(a=>a.charge_id===id&&!a.void_reason).reduce((n,a)=>n+a.cents,0);
export const remaining=(d,c)=>c.void_reason?0:c.cents-paid(d,c.id);
export const unassigned=(d,t)=>t.cents-(computation?.data===d?(computation.byEntry.get(t.id)||0):d.allocations.filter(a=>a.entry_id===t.id&&!a.void_reason).reduce((n,a)=>n+a.cents,0));
export function refreshDebts(d){d.units.forEach(u=>u.debt=d.charges.filter(c=>c.unit_id===u.id).reduce((n,c)=>n+remaining(d,c),0));return d;}
export function monthlySummary(d,period){
 const before=d.transactions.filter(t=>t.date.slice(0,7)<period),transactions=d.transactions.filter(t=>t.date.slice(0,7)===period);
 return {...summarize(transactions,(d.opening||0)+summarize(before).net),transactions};
}
export function fullDemo(){
 const d=base();d.site.id='demo-site';d.capabilities={admin:true,finance:true,import:true,people:true,announcements:true};
 d.transactions=d.transactions.map((t,i)=>({...t,id:'demo-entry-'+i,reference:'EXAMPLE-'+i}));
 d.charges=d.units.filter(u=>u.debt>0).map(u=>({id:'charge-'+u.id,unit_id:u.id,category:'Devir',label:'Açık borç',due_on:'2026-10-01',cents:u.debt,payer:'review',reference:'demo-'+u.id}));
 d.allocations=[];d.openingDate='2026-10-01';d.people=[];d.reports=[];d.announcements=[{id:'demo-announcement',title:'Ayapark 2 yönetim alanına hoş geldiniz',body:'Bu örnek duyurudur. Dairelerinizi, ödemelerinizi ve ortak raporları buradan takip edebilirsiniz.',published:true,created_at:'2026-10-20T09:00:00Z'}];
 d.staged=[{id:'demo-staged',person_label:'Örnek Kişi',unit_hint:'B-4 (M)',cents:360000,as_of:'2026-10-09',kind:'balance',source:'Örnek devir listesi',source_key:'demo-staged'}];d.audit=[];d.permissions=[];d.staff=[{user_id:'demo-staff',role:'deputy'}];return enrichDemo(d);
}
export function demoCommand(d,action,p){
 if(isFinanceV5(action))return demoFinanceCommand(d,action,p);
 const id=()=>randomId();const now=()=>new Date().toISOString();
 const result=demoV3(d,action,p);if(result)return result;
 if(action==='settings'){if(d.transactions.length)throw Error(tr("Hareketler varken açılış değiştirilemez."));d.opening=p.opening_cents;d.openingDate=p.opening_date;}
 else if(action==='entry'){if(!d.transactions.some(t=>t.request_id===p.request_id))d.transactions.unshift({...p,id:id(),category:p.category});}
 else if(action==='import'){let inserted=0,duplicates=0;for(const t of p.entries){if(d.transactions.some(x=>x.date===t.date&&x.desc===t.desc&&x.cents===t.cents)){duplicates++;continue;}d.transactions.push({...t,id:id(),category:'Diğer'});inserted++;}return {inserted,duplicates};}
 else if(action==='charge'){if(!d.charges.some(c=>c.unit_id===p.unit_id&&c.reference===p.reference))d.charges.push(bindDemoCharge(d,{...p,id:id()},p));}
 else if(action==='monthly'){for(const u of d.units){const reference='monthly:'+p.due_on.slice(0,7);if(!d.charges.some(c=>c.unit_id===u.id&&c.reference===reference))d.charges.push(bindDemoCharge(d,{...p,id:id(),unit_id:u.id,category:'Aidat',reference},p));}}
 else if(action==='allocate'){
  if(d.allocations.some(a=>a.request_id===p.request_id))return {ok:true};
  const t=d.transactions.find(t=>t.id===p.entry_id),c=d.charges.find(c=>c.id===p.charge_id);
  if(!t||!c||t.cents<0||t.reversal_of||d.transactions.some(x=>x.reversal_of===t.id)||p.cents<=0||p.cents>unassigned(d,t)-creditAvailable(d,t)||p.cents>remaining(d,c))throw Error(tr("Tutar ödeme veya borç bakiyesini aşıyor."));
  d.allocations.push({...p,id:id()});
 }
 else if(action==='unallocate'){const a=d.allocations.find(a=>a.id===p.id);if(!a)throw Error(tr("Eşleştirme bulunamadı."));a.void_reason=p.reason;}
 else if(action==='void_charge'){if(paid(d,p.id)>0)throw Error(tr("Önce ödeme eşleştirmelerini kaldırın."));d.charges.find(c=>c.id===p.id).void_reason=p.reason;}
 else if(action==='reverse'){const t=d.transactions.find(t=>t.id===p.id);if(!t||t.reversal_of||d.transactions.some(x=>x.reversal_of===t.id))throw Error(tr("Hareket daha önce düzeltilmiş."));if(creditAvailable(d,t)>0||unassigned(d,t)!==t.cents)throw Error(tr("Önce ödeme eşleştirmelerini kaldırın."));d.transactions.unshift({...t,id:id(),date:now().slice(0,10),cents:-t.cents,desc:'STORNO: '+p.reason,reversal_of:t.id});}
 else if(action==='person'){const person=d.people.find(x=>x.id===p.id);if(person)Object.assign(person,p);else d.people.push({...p,id:id(),active:true});}
 else if(action==='announcement'){const a=d.announcements.find(x=>x.id===p.id);if(a)Object.assign(a,p,{revision:(a.revision||1)+1,updated_at:now(),updated_by:'demo'});else d.announcements.unshift({...p,id:id(),created_at:now(),author_label:'Örnek Yönetici',revision:1});}
 else if(action==='publish_report'){const s=monthlySummary(d,p.period.slice(0,7));d.reports=d.reports.filter(r=>r.period!==p.period);d.reports.unshift({period:p.period,opening_cents:s.balance-s.net,income_cents:s.income,expense_cents:s.expense,closing_cents:s.balance,published_at:now()});}
 else if(action==='confirm_staged'){const row=d.staged.find(r=>r.id===p.id);if(!row||row.confirmed_charge||row.ignored_reason)throw Error(tr("Bekleyen kayıt bulunamadı."));if(p.ignore_reason)row.ignored_reason=p.ignore_reason;else{if(!d.units.some(u=>u.id===p.unit_id))throw Error(tr("Daire seçin."));const chargeId=id();d.charges.push({id:chargeId,unit_id:p.unit_id,category:row.kind==='enforcement'?'İcra':'Devir',label:'Açık borç',due_on:row.as_of,cents:Number(row.cents),payer:p.payer,reference:'staged:'+row.id});row.confirmed_charge=chargeId;}}
 else if(action==='permissions'){d.permissions=d.permissions.filter(x=>x.user_id!==p.user_id);d.permissions.push(p);}
 else throw Error(tr("Bu işlem örnek görünümde mevcut değil."));
 d.audit.unshift({id:id(),action,at:now(),details:{reason:p.reason||''}});d.summaryDays=buildSummaryDays(d);refreshDebts(d);return {ok:true};
}
