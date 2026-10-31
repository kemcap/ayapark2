// Domain rules shared by views and the local demonstration. Amounts are integer kuruş.
import {summarize} from './core.mjs?v=5.10.0';
import {t as tr} from './i18n.mjs?v=5.10.0';
// Shared only during a synchronous render; always discard after the callback.
let paymentComputation=null;
export function withPaymentIndex(d,fn){
 if(paymentComputation?.data===d)return fn();
 const previous=paymentComputation,reversed=new Set(),credits=new Map();
 for(const t of d.transactions||[])if(t.reversal_of)reversed.add(t.reversal_of);
 for(const c of d.credits||[])if(!c.void_reason)credits.set(c.entry_id,(credits.get(c.entry_id)||0)+c.cents);
 paymentComputation={data:d,reversed,credits,suggestions:new Map()};
 try{return fn();}finally{paymentComputation=previous;}
}
export const isReversed=(d,t)=>paymentComputation?.data===d?paymentComputation.reversed.has(t.id):d.transactions.some(x=>x.reversal_of===t.id);
export const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');
export const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
export const activeAt=(l,day=today())=>typeof l.active==='boolean'?l.active:(!l.starts_on||l.starts_on<=day)&&(!l.ends_on||l.ends_on>=day);
export const personName=(d,id)=>d.persons?.find(p=>p.id===id)?.full_name||'';
export function personLinks(d,unit,day=today()){return (d.links||[]).filter(l=>(!unit||l.unit_id===unit)&&activeAt(l,day));}
export function scopedCharges(d){return d.role==='resident'?d.charges.filter(c=>((d.ownIds||[]).includes(c.unit_id)||(d.ownPersonIds||[]).includes(c.person_id))):d.charges;}
export const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function rangeFor(preset,now=today()){
 const day=new Date(now+'T12:00:00Z');const iso=d=>d.toISOString().slice(0,10);let from='',to='';
 if(preset==='7'||preset==='30'){from=iso(new Date(day.getTime()-(Number(preset)-1)*86400000));to=now;}
 if(preset==='month'){from=now.slice(0,7)+'-01';to=now;}
 if(preset==='previous'){const start=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()-1,1));from=iso(start);to=iso(new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth(),0)));}
 if(preset==='year'){from=now.slice(0,4)+'-01-01';to=now;}
 return {from,to};
}
export function selectedRange(s,kind='bank'){
 const f=kind==='report'?(s.reportFilter||{preset:'all'}):s.filter;
 return f.preset==='custom'?{from:f.from||'',to:f.to||''}:rangeFor(f.preset||'all');
}
export function rangeError({from='',to=''}={}){
 if(from&&!dateValid(from)||to&&!dateValid(to))return tr('Geçerli bir tarih aralığı girin.');
 return from&&to&&to<from?tr('Bitiş tarihi başlangıç tarihinden önce olamaz.'):'';
}
export function assertRange(range){const error=rangeError(range);if(error)throw Error(error);return range;}
export function inRange(date,{from='',to=''}={}){return (!from||date>=from)&&(!to||date<=to);}
export function filteredTransactions(s){
 const f=s.filter,r=assertRange(selectedRange(s)),d=s.data,q=norm(f.q);
 // Build request-local indexes only when the unmatched filter needs them.
 // No cached balances survive a data refresh or mutation.
 const reversed=new Set(),used=new Map();
 if(f.type==='unmatched'){
  for(const t of d.transactions)if(t.reversal_of)reversed.add(t.reversal_of);
  for(const row of [...d.allocations,...(d.credits||[])])if(!row.void_reason)used.set(row.entry_id,(used.get(row.entry_id)||0)+row.cents);
 }
 return d.transactions.filter(t=>inRange(t.date,r)&&(f.type==='all'||!f.type||(f.type==='in'?t.cents>0:f.type==='unmatched'?t.cents>0&&!t.reversal_of&&!reversed.has(t.id)&&t.cents-(used.get(t.id)||0)>0:t.cents<0))&&(!q||norm(t.desc+' '+t.category+' '+(t.bank_reference||'')).includes(q)));
}
export function financialSeries(d,range={},group='year'){
 assertRange(range);
 const buckets=new Map(),categories=new Map();
 for(const row of d.summaryDays||[]){if(!inRange(row.date,range))continue;const key=row.date.slice(0,group==='month'?7:4),b=buckets.get(key)||{period:key,income:0,expense:0};b.income+=Number(row.income_cents);b.expense+=Number(row.expense_cents);buckets.set(key,b);for(const[c,v]of Object.entries(row.categories||{}))categories.set(c,(categories.get(c)||0)+Number(v));}
 return {buckets:[...buckets.values()].sort((a,b)=>a.period.localeCompare(b.period)),categories:[...categories],income:[...buckets.values()].reduce((n,b)=>n+b.income,0),expense:[...buckets.values()].reduce((n,b)=>n+b.expense,0)};
}
export function buildSummaryDays(d){const days=new Map();for(const t of d.transactions){if(t.reversal_of||d.transactions.some(x=>x.reversal_of===t.id)||t.category==='Transfer')continue;const r=days.get(t.date)||{date:t.date,income_cents:0,expense_cents:0,categories:{}};if(t.cents>0)r.income_cents+=t.cents;else{r.expense_cents-=t.cents;r.categories[t.category]=(r.categories[t.category]||0)-t.cents;}days.set(t.date,r);}return [...days.values()];}
export function announcementStatus(a,now=Date.now()){
 if(!a.published)return 'Taslak';
 const current=typeof now==='number'?now:new Date(now).getTime(),start=a.starts_at?Date.parse(a.starts_at):null,end=a.ends_at?Date.parse(a.ends_at):null;
 if(!Number.isFinite(current)||start!==null&&!Number.isFinite(start)||end!==null&&!Number.isFinite(end))return 'Geçersiz tarih';
 return start!==null&&start>current?'Planlandı':end!==null&&end<=current?'Arşiv':'Yayımlandı';
}
export function announcementActive(a,now=Date.now()){return announcementStatus(a,now)==='Yayımlandı';}
export const acknowledgementKey=a=>a.id+':'+(a.revision||1);
export function suggestUnits(d,t){
 const cached=paymentComputation?.data===d?paymentComputation.suggestions:null;if(cached?.has(t))return cached.get(t);
 const desc=norm(t.desc),codes=(t.desc||'').toUpperCase().match(/\b[AB][ -]?\d{1,2}\b/g)||[];const found=new Set();const reasons=[];
 if(t.unit_hint){const u=d.units.find(u=>norm(u.code)===norm(t.unit_hint));if(u){found.add(u.id);reasons.push('hint');}}
 for(const code of codes){const u=d.units.find(u=>norm(u.code)===norm(code));if(u){found.add(u.id);reasons.push('code');}}
 for(const p of d.persons||[]){if(norm(p.full_name).length>=5&&desc.includes(norm(p.full_name))){for(const l of d.links||[])if(l.person_id===p.id)found.add(l.unit_id);reasons.push('name');}}
 for(const rule of d.matchRules||[]){if((rule.iban&&norm(t.iban)===norm(rule.iban))||(rule.alias&&norm(rule.alias).length>=4&&desc.includes(norm(rule.alias)))){found.add(rule.unit_id);reasons.push('saved');}}
 const result={unitIds:[...found],ambiguous:found.size!==1,reasons:[...new Set(reasons)]};cached?.set(t,result);return result;
}
export function effectivePayer(d,unit,payer,day){const roles=payer==='owner'?['owner']:payer==='tenant'?['tenant']:[];const l=personLinks(d,unit,day).filter(l=>l.starts_on&&roles.includes(l.role));return l.length===1?l[0]:null;}
export function creditAvailable(d,t){if(paymentComputation?.data===d)return paymentComputation.credits.get(t.id)||0;return (d.credits||[]).filter(x=>x.entry_id===t.id&&!x.void_reason).reduce((n,x)=>n+x.cents,0);}

// Search only permitted apartment contents; a block letter is never a code match.
export function unitSearchMatches(d,unit,query,peopleAccess=false,roles={}){
 const tokens=String(query||'').trim().split(/\s+/).map(norm).filter(Boolean);
 if(!tokens.length)return [];
 const links=(d.links||[]).filter(l=>l.unit_id===unit.id);if(peopleAccess)for(const c of d.charges||[]){if(c.unit_id===unit.id&&c.person_id&&!c.void_reason&&!links.some(l=>l.person_id===c.person_id))links.push({unit_id:unit.id,person_id:c.person_id,role:'debtor'});}
 const records=links.flatMap(l=>{
  const p=(d.persons||[]).find(p=>p.id===l.person_id);if(!p)return [];
  const own=d.role==='resident'&&(d.ownPersonIds||[]).includes(p.id);
  const fields=[p.full_name,p.first_name,p.last_name,roles[l.role]||'',l.role==='owner'?'Eigentümer Besitzer Ev sahibi':l.role==='tenant'?'Bewohner Mieter Kiracı Sakin':l.role==='debtor'?'Borçlu Schuldner':'Verwaltung Stellvertreter Temsilci Yönetim'];
  if(peopleAccess||own){const digits=String(p.phone||'').replace(/\D/g,'');const local=digits.startsWith('90')?digits.slice(2):digits.startsWith('0')?digits.slice(1):digits;fields.push(p.email,p.phone);if(digits)fields.push(local,'0'+local,'90'+local);}
  if(peopleAccess)fields.push(p.notes,l.responsibility);
  return [{person:p,link:l,text:fields.filter(Boolean).join(' ')}];
 });
 if(peopleAccess)for(const c of d.charges||[]){
  if(c.unit_id!==unit.id||c.void_reason||c.person_id)continue;
  const source=(d.staged||[]).find(row=>c.reference?.startsWith('staged:'+row.id));
  if(source&&!records.some(r=>r.person.full_name===source.person_label))records.push({person:{full_name:source.person_label},link:{role:'source'},text:source.person_label+' '+(roles.source||'Kaynak kaydı Quellenangabe')});
 }
 return records.filter(record=>tokens.every(t=>norm(record.text).includes(t)));
}
