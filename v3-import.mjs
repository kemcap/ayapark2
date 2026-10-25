import {parseLegacyCsv} from './core.mjs?v=5.0.0';
import {t as tr} from './i18n.mjs?v=5.0.0';
export const templateHeader='date;reference;counterparty;description;income;expense;unit;iban;balance';
export const template=templateHeader+'\r\n';
export function csvRows(raw){const rows=[];let row=[],cell='',quoted=false,closed=false;const delimiter=raw.split(/\r?\n/)[0].includes(';')?';':',';
 for(let i=0;i<raw.length;i++){const c=raw[i];if(quoted){if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;continue;}if(c==='"'){if(cell||closed)throw Error(tr('CSV dosyasındaki tırnak işaretlerini kontrol edin.'));quoted=true;}else if(c===delimiter){row.push(cell);cell='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}else{if(closed)throw Error(tr('CSV dosyasındaki tırnak işaretlerini kontrol edin.'));cell+=c;}}if(quoted)throw Error(tr('CSV dosyasındaki tırnak işaretlerini kontrol edin.'));row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
const esc=s=>'"'+String(s).replaceAll('"','""')+'"';
export function parseImport(raw){
 if(raw.length>2*1024*1024)throw Error(tr('Dosya en fazla 2 MB olabilir.'));
 const rows=csvRows(raw.replace(/^\uFEFF/,'')),header=(rows.shift()||[]).map(s=>s.trim().toLowerCase());
 if(header.join(';')!==templateHeader)return parseLegacyCsv(raw);
 if(rows.length<1||rows.length>2000)throw Error(tr('CSV dosyası 1–2.000 veri satırı içermelidir.'));
 const seen=new Set();let duplicates=0;
 const entries=rows.map((r,i)=>{
  if(r.length!==9)throw Error(tr('Satır ')+(i+2)+': '+tr('Dokuz sütun gerekli. Güncel CSV şablonunu kullanın.'));
  const [date,reference,counterparty,description,income,expense,unit,iban,balance]=r.map(x=>x.trim());
  if(!income&&!expense||income&&expense)throw Error(tr('Satır ')+(i+2)+': '+tr('Her satırda yalnızca gelir veya gider girin, ikisini birden girmeyin.'));
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(income||expense))throw Error(tr('Satır ')+(i+2)+': '+tr('Gelir ve gider sütunlarına pozitif tutar yazın; eksi veya artı işareti kullanmayın.'));
  if(unit&&!/^[AB][- ]?(?:[1-9]|10)$/i.test(unit))throw Error(tr('Satır ')+(i+2)+': '+tr('Daire A-1–A-10 veya B-1–B-10 olmalıdır.'));
  if(reference.length>100||counterparty.length>150||unit&&!/^[AB][- ]?\d{1,2}$/i.test(unit)||iban.length>40)throw Error(tr('Satır ')+(i+2)+': '+tr('Referans, gönderen, daire veya IBAN alanını kontrol edin.'));
  const desc=[counterparty,description].filter(Boolean).join(' · ');
  const parsed=parseLegacyCsv('tarih;aciklama;tutar\n'+[date,desc,(expense?'-':'')+(income||expense)].map(esc).join(';')).entries[0];
  const key=JSON.stringify([date,desc,parsed.cents,reference]);const duplicate=seen.has(key);if(duplicate)duplicates++;seen.add(key);
  let balance_cents;if(balance){const signed=balance.startsWith('-'),val=signed?balance.slice(1):balance;if(val==='0'||val==='0,00')balance_cents=0;else balance_cents=parseLegacyCsv('tarih;aciklama;tutar\n'+[date,'Balance',(signed?'-':'')+val].map(esc).join(';')).entries[0].cents;}
  return {...parsed,reference,iban,counterparty,unit_hint:unit.toUpperCase().replace(' ','-').replace(/^([AB])(\d)/,'$1-$2'),balance_cents,duplicate};
 });return {entries,duplicates};
}
