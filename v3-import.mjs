import {parseLegacyCsv} from './core.mjs';
import {t as tr} from './i18n.mjs';
export const templateHeader='date;reference;counterparty;description;income;expense;unit;iban;balance';
export const template=templateHeader+'\r\n';
export function csvRows(raw){const rows=[];let row=[],cell='',quoted=false,closed=false;const delimiter=raw.split(/\r?\n/)[0].includes(';')?';':',';
 for(let i=0;i<raw.length;i++){const c=raw[i];if(quoted){if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;continue;}if(c==='"'){if(cell||closed)throw Error('CSV: invalid quotes');quoted=true;}else if(c===delimiter){row.push(cell);cell='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}else{if(closed)throw Error('CSV: invalid quotes');cell+=c;}}if(quoted)throw Error('CSV: unclosed quotes');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
const esc=s=>'"'+String(s).replaceAll('"','""')+'"';
export function parseImport(raw){
 if(raw.length>2*1024*1024)throw Error('CSV: max. 2 MB');
 const rows=csvRows(raw.replace(/^\uFEFF/,'')),header=(rows.shift()||[]).map(s=>s.trim().toLowerCase());
 if(header.join(';')!==templateHeader)return parseLegacyCsv(raw);
 if(rows.length<1||rows.length>2000)throw Error('CSV: 1–2000 rows');
 const seen=new Set();let duplicates=0;
 const entries=rows.map((r,i)=>{
  if(r.length!==9)throw Error('CSV: row '+(i+2)+' / 9 columns required');
  const [date,reference,counterparty,description,income,expense,unit,iban,balance]=r.map(x=>x.trim());
  if(!income&&!expense||income&&expense)throw Error('CSV: row '+(i+2)+' / choose income OR expense');
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(income||expense))throw Error(tr('Satır ')+(i+2)+': '+tr('Gelir ve gider sütunlarına pozitif tutar yazın; eksi veya artı işareti kullanmayın.'));
  if(unit&&!/^[AB][- ]?(?:[1-9]|10)$/i.test(unit))throw Error(tr('Satır ')+(i+2)+': '+tr('Daire A-1–A-10 veya B-1–B-10 olmalıdır.'));
  if(reference.length>100||counterparty.length>150||unit&&!/^[AB][- ]?\d{1,2}$/i.test(unit)||iban.length>40)throw Error('CSV: row '+(i+2)+' / invalid reference, unit or IBAN');
  const desc=[counterparty,description].filter(Boolean).join(' · ');
  const parsed=parseLegacyCsv('tarih;aciklama;tutar\n'+[date,desc,(expense?'-':'')+(income||expense)].map(esc).join(';')).entries[0];
  const key=JSON.stringify([date,desc,parsed.cents,reference]);const duplicate=seen.has(key);if(duplicate)duplicates++;seen.add(key);
  let balance_cents;if(balance){const signed=balance.startsWith('-'),val=signed?balance.slice(1):balance;if(val==='0'||val==='0,00')balance_cents=0;else balance_cents=parseLegacyCsv('tarih;aciklama;tutar\n'+[date,'Balance',(signed?'-':'')+val].map(esc).join(';')).entries[0].cents;}
  return {...parsed,reference,iban,counterparty,unit_hint:unit.toUpperCase().replace(' ','-').replace(/^([AB])(\d)/,'$1-$2'),balance_cents,duplicate};
 });return {entries,duplicates};
}
