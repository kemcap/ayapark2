import {parseImport} from './v3-import.mjs?v=5.10.0';
import {t as tr,locale} from './i18n.mjs?v=5.10.0';
// Pure domain functions. Money is stored as integer kuruş.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = (cents,currency='TRY') => cents == null ? '—' : new Intl.NumberFormat(locale(), {style:'currency', currency,currencyDisplay:'narrowSymbol', maximumFractionDigits:2}).format(cents / 100);
export const roleName = role => tr({super:'Süper Admin',staff:'Yönetim',resident:'Site Sakini'}[role] || 'Site Sakini');
export function visibleUnits(units, role, ownIds) { return role === 'resident' ? units.filter(u => ownIds.includes(u.id)) : units; }
export function allowedPages(role) { return role === 'resident' ? ['overview','units','dues','reports'] : role === 'super' ? ['overview','units','dues','transactions','reports','settings'] : ['overview','units','dues','transactions','reports']; }
export function summarize(transactions, opening = 0) {
 const income = transactions.filter(t => t.cents > 0).reduce((n,t) => n+t.cents,0);
 const expense = -transactions.filter(t => t.cents < 0).reduce((n,t) => n+t.cents,0);
 return {income,expense,net:income-expense,balance:opening+income-expense};
}
export function demoData() {
 const debts = {'A-2':740000,'A-6':180000,'A-9':180000,'B-3':180000,'B-5':180000,'B-8':360000};
 const units = ['A','B'].flatMap(block => Array.from({length:10},(_,i) => ({id:`${block}-${i+1}`,code:`${block}-${i+1}`,block,number:i+1,occupancy_status:i===9?'vacant':'occupied',debt:debts[`${block}-${i+1}`]||0})));
 const transactions = [
 {date:'2026-10-20',desc:'A-4 · Ekim aidatı',category:'Aidat',cents:360000},
 {date:'2026-10-19',desc:'Havuz bakım hizmeti',category:'Havuz',cents:-250000},
 {date:'2026-10-18',desc:'B-7 · Ekim aidatı',category:'Aidat',cents:360000},
 {date:'2026-10-17',desc:'Peyzaj bakım hizmeti',category:'Peyzaj',cents:-180000},
 {date:'2026-10-16',desc:'A-1 · Ekim aidatı',category:'Aidat',cents:360000},
 {date:'2026-10-15',desc:'Ortak alan elektrik',category:'Elektrik',cents:-120000}];
 return {units,transactions,opening:4290000,ownIds:['A-4'],site:{name:'Ayapark 2'},role:'super'};
}
// Strict preview format: tarih;aciklama;tutar, with ISO date and signed Turkish amount.
export function parseLegacyCsv(text) {
 if (text.length > 2*1024*1024) throw Error(tr("Dosya en fazla 2 MB olabilir."));
 const delimiter = text.split(/\r?\n/)[0].includes(';') ? ';' : ',';
 const rows=[]; let row=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(quoted) {if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error(tr("CSV tırnak biçimi geçersiz."));quoted=true;}
  else if(c===delimiter){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}
  else {if(closed)throw Error(tr("CSV tırnak biçimi geçersiz."));cell+=c;}
 }
 if(quoted)throw Error(tr("CSV içinde kapanmamış tırnak var."));
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error(tr("Başlık ve en az bir veri satırı gerekli."));
 const header=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
 if(header.join('|')!=='tarih|aciklama|tutar')throw Error(tr("Başlık tarih;aciklama;tutar olmalı."));
 if(rows.length>2000)throw Error(tr("En fazla 2.000 satır önizlenebilir."));
 const seen=new Set(); let duplicates=0;
 const entries=rows.map((r,i)=>{
  if(r.length!==3)throw Error(`${tr("Satır ")}${i+2}${tr(": üç sütun gerekli.")}`);
  const [date,desc,amount]=r.map(x=>x.trim());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error(`${tr("Satır ")}${i+2}${tr(": tarih YYYY-AA-GG olmalı.")}`);
  if(!desc||desc.length>500)throw Error(`${tr("Satır ")}${i+2}${tr(": açıklama 1–500 karakter olmalı.")}`);
  if(!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(amount))throw Error(`${tr("Satır ")}${i+2}${tr(": tutar Türkçe sayı biçiminde olmalı (3.600,00).")}`);
  const cents=Math.round(Number(amount.replaceAll('.','').replace(',','.'))*100);
  if(!Number.isSafeInteger(cents)||cents===0)throw Error(`${tr("Satır ")}${i+2}${tr(": tutar geçersiz.")}`);
  const key=JSON.stringify([date,desc,cents]);const duplicate=seen.has(key);if(duplicate)duplicates++;seen.add(key);
  return {date,desc,cents,duplicate};
 });
 return {entries,duplicates};
}
// randomUUID is restricted to secure contexts; getRandomValues also works on local HTTP previews.
export function randomId(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 if(!globalThis.crypto?.getRandomValues)throw Error(tr("Güvenli rastgele sayı üretimi desteklenmiyor. Güncel bir tarayıcı kullanın."));
 const bytes=globalThis.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}

export const parseCsv=parseImport;
