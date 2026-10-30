// File adapters only. Normalized output passes through the existing CSV validator.
export class BankFileError extends Error{constructor(code,location=''){super(code);this.code=code;this.location=String(location);}}
const fail=(code,location)=>{throw new BankFileError(code,location);};
const header='date;reference;counterparty;description;income;expense;unit;iban;balance';
const esc=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const csv=rows=>header+'\r\n'+rows.map(row=>row.map(esc).join(';')).join('\r\n');
export const centsText=n=>(n<0?'-':'')+Math.floor(Math.abs(n)/100)+','+String(Math.abs(n)%100).padStart(2,'0');
export function sourceDate(value){
 if(value instanceof Date){if(!Number.isFinite(value.getTime()))fail('date');return value.toISOString().slice(0,10);}
 let s=String(value??'').trim();const m=/^(\d{2})[./](\d{2})[./](\d{4})$/.exec(s);if(m)s=m[3]+'-'+m[2]+'-'+m[1];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('date');return s;
}
function decimalCents(value,decimal=',',group='.'){const s=String(value).trim(),pattern=decimal===','?/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/:/^-?(?:\d+|\d{1,3}(?:,\d{3})+)\.\d{2}$/;
 if(!pattern.test(s))fail('amount');const clean=s.replaceAll(group,''),[whole,fraction]=clean.replace('-','').split(decimal);const amount=Number(whole)*100+Number(fraction);if(!Number.isSafeInteger(amount))fail('amount');return s.startsWith('-')?-amount:amount;}
function xlsxValue(value,kind){
 if(value==null)return '';
 if(kind==='date')return sourceDate(value);
 if(typeof value==='object'&&!(value instanceof Date)&&typeof value.xlsxNumber==='string'){
  const s=value.xlsxNumber;if(kind==='money'){if(!/^-?\d+(?:\.\d{1,2})?$/.test(s))fail('amount');return s.replace('.',',');}return s;
 }
 if(typeof value!=='string')fail('cell');return value.trim();
}
export function workbookToCsv(sheets,selected){
 const available=sheets.filter(s=>s.data.some(row=>row.some(v=>v!=null&&v!=='')));
 if(!available.length)fail('empty');
 if(!selected&&available.length>1)return {sheets:available.map(s=>s.sheet)};
 const sheet=selected?available.find(s=>s.sheet===selected):available[0];if(!sheet)fail('sheet');
 const rows=sheet.data.filter(row=>row.some(v=>v!=null&&v!==''));if(rows.length<2||rows.length>2001)fail('rows');
 const names=rows[0].map(v=>String(v??'').trim().toLowerCase()),key=names.join(';');
 let normalized;
 if(key===header){normalized=rows.slice(1).map((r,i)=>{if(r.length>9&&r.slice(9).some(v=>v!=null))fail('columns',i+2);return Array.from({length:9},(_,n)=>xlsxValue(r[n],n===0?'date':[4,5,8].includes(n)?'money':'text'));});}
 else if(key==='tarih;aciklama;tutar'||key==='tarih;açıklama;tutar'||key==='tarih;açıklama;tutar;bakiye'||key==='tarih;açıklama;işlem tutarı;bakiye'){
  normalized=rows.slice(1).map((r,i)=>{if(r.slice(names.length).some(v=>v!=null))fail('columns',i+2);const amount=xlsxValue(r[2],'money'),negative=amount.startsWith('-');return [sourceDate(r[0]),'','',xlsxValue(r[1],'text'),negative?'':amount,negative?amount.slice(1):'','','',xlsxValue(r[3],'money')];});
 }else fail('columns');
 return {raw:csv(normalized),metadata:{format:'xlsx',sheet:sheet.sheet,rows:normalized.length}};
}
function pdfLines(items){
 const sorted=items.filter(i=>typeof i.str==='string'&&i.str.trim()).map(i=>({text:i.str.trim(),x:i.transform[4],y:-i.transform[5],width:i.width||0})).sort((a,b)=>a.y-b.y||a.x-b.x);
 const lines=[];for(const item of sorted){let line=lines.at(-1);if(!line||Math.abs(line.y-item.y)>1.2){line={y:item.y,items:[]};lines.push(line);}line.items.push(item);}
 for(const line of lines){line.items.sort((a,b)=>a.x-b.x);line.text=line.items.map(i=>i.text).join(' ');}return lines;
}
const datePrefix=/^\d{2}[./]\d{2}[./]\d{4}(?:\s|$)/;
const legacyRow=/^(\d{2}\.\d{2}\.\d{4})\s+(?:\d{2}\.\d{2}\.\d{4}\s+)?(.*?)\s+(-?[\d,]+\.\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?[\d,]+\.\d{2})\s+(\d+)$/;
const modernRow=/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(.*?)\s+(-?[\d.]+,\d{2})\s*TL\s+(-?[\d.]+,\d{2})\s*TL$/;
export function pdfPagesToCsv(pages){
 if(!pages.length||pages.length>100)fail('pages');let layout=null,pending=[],records=[],descriptionX,amountX,removed=0;
 for(let p=0;p<pages.length;p++){
  const lines=pdfLines(pages[p]),head=lines.findIndex(l=>/Tarih/.test(l.text)&&/Açıklama/.test(l.text)&&/Bakiye/.test(l.text));
  if(head<0)fail('pdf-layout',p+1);const line=lines[head],type=/Valör/.test(line.text)?'legacy':/Saat/.test(line.text)?'modern':null;
  if(!type||layout&&layout!==type)fail('pdf-layout',p+1);layout=type;
  const desc=line.items.find(i=>i.text.includes('Açıklama')),amount=line.items.find(i=>/İşlem Tutarı/.test(i.text))||line.items.find(i=>i.text==='İşlem'&&i.x>desc?.x);
  if(!desc||!amount||amount.x-desc.x<60)fail('pdf-layout',p+1);descriptionX=desc.x;amountX=amount.x;
  const startCount=records.length;
  for(const l of lines.slice(head+1)){
   if(datePrefix.test(l.text)){
    if(layout==='legacy'&&/GÜNSONU BAKİYESİ|AÇILIŞ BAKİYESİ|KAPANIŞ BAKİYESİ/.test(l.text))continue;
    const match=(layout==='legacy'?legacyRow:modernRow).exec(l.text);if(!match)fail('pdf-row',p+1);
    let date,time,amount,balance,reference,description;
    if(layout==='legacy'){[,date,description,amount,time,balance,reference]=match;}else{[,date,time,description,amount,balance]=match;reference='';
     // Preserve all description lines, but exclude transaction/channel columns.
     description=l.items.filter(i=>i.x>=descriptionX-2&&i.x<amountX-15).map(i=>i.text).join(' ');
     description=[...pending,description].filter(Boolean).join(' ');pending=[];
    }
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time))fail('pdf-row',p+1);
    records.push({date:sourceDate(date),desc:description,cents:decimalCents(amount,layout==='legacy'?'.':',',layout==='legacy'?',':'.'),balance_cents:decimalCents(balance,layout==='legacy'?'.':',',layout==='legacy'?',':'.'),reference});
    if(records.length>2000)fail('rows');
   }else{
    const part=l.items.filter(i=>i.x>=descriptionX-2&&i.x<amountX-15);
    if(part.length&&part.length===l.items.length){const extra=part.map(i=>i.text).join(' ');if(layout==='modern')pending.push(extra);else if(records.length)records.at(-1).desc+=' '+extra;else fail('pdf-row',p+1);}
    else if(/\d{2}:\d{2}:\d{2}/.test(l.text)||/-?[\d.,]+\s*TL\s+-?[\d.,]+\s*TL$/.test(l.text))fail('pdf-row',p+1);
   }
  }
  if(records.length===startCount)fail('pdf-row',p+1);
 }
 if(pending.length||!records.length)fail('pdf-row',pages.length);
 for(const r of records){r.desc=r.desc.replace(/\b(?:tckn|t\.c\.\s*kimlik(?:\s*no)?|vkn|vergi\s*(?:no|numarası))\s*[:.]?\s*\d{9,11}\b/giu,()=>{removed++;return '';}).replace(/\s+/g,' ').trim();if(!r.desc||r.desc.length>500||r.cents===0)fail('pdf-row');}
 return {raw:csv(records.map(r=>[r.date,r.reference,'',r.desc,r.cents>0?centsText(r.cents):'',r.cents<0?centsText(-r.cents):'','','',centsText(r.balance_cents)])),metadata:{format:'pdf',layout,pages:pages.length,rows:records.length,missingReferences:records.filter(r=>!r.reference).length,identifiersRemoved:removed}};
}
export function validateXlsxArchive(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),len=bytes.length;if(len<22)fail('xlsx-archive');
 let end=-1;for(let i=len-22;i>=Math.max(0,len-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0||end+22+view.getUint16(end+20,true)!==len||view.getUint16(end+4,true)||view.getUint16(end+6,true))fail('xlsx-archive');
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true);let offset=view.getUint32(end+16,true),total=0;const start=offset,names=new Set();
 if(!count||count>128||offset+size!==end)fail('xlsx-archive');
 for(let n=0;n<count;n++){
  if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)fail('xlsx-archive');
  const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),uncompressed=view.getUint32(offset+24,true),nameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
  const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(offset+46,offset+46+nameLength));
  if(flags&1||![0,8].includes(method)||uncompressed>8*1024*1024||(total+=uncompressed)>16*1024*1024||names.has(name)||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||local+30>=start||view.getUint32(local,true)!==0x04034b50)fail('xlsx-archive');
  const localNameLength=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true);
  if(local+30+localNameLength+localExtra+compressed>start||view.getUint16(local+8,true)!==method||new TextDecoder().decode(bytes.slice(local+30,local+30+localNameLength))!==name)fail('xlsx-archive');
  if(/vbaProject|externalLinks/i.test(name))fail('xlsx-active');names.add(name);offset+=46+nameLength+extra+comment;
 }
 if(offset!==end||!names.has('[Content_Types].xml')||!names.has('xl/workbook.xml'))fail('xlsx-archive');return {entries:count,expandedBytes:total};
}
export function bankFileMessage(error,language){
 const messages={size:['Die Datei darf höchstens 2 MB groß sein.','Dosya en fazla 2 MB olabilir.'],type:['Bitte CSV, PDF oder XLSX auswählen.','CSV, PDF veya XLSX dosyası seçin.'],pages:['PDF mit höchstens 100 Seiten verwenden.','En fazla 100 sayfalı PDF kullanın.'],'pdf-layout':['Dieses PDF-Tabellenformat ist nicht eindeutig lesbar. Verwende einen Textauszug von Yapı Kredi oder die CSV-Vorlage.','Bu PDF tablo biçimi açıkça okunamıyor. Yapı Kredi metin dökümü veya CSV şablonunu kullanın.'],'pdf-row':['Mindestens eine PDF-Bewegung oder Beschreibung ist nicht eindeutig lesbar. Es wurde nichts importiert.','En az bir PDF hareketi veya açıklaması açıkça okunamıyor. Hiçbir kayıt aktarılmadı.'],rows:['Die Datei muss 1–2.000 Bewegungen enthalten.','Dosya 1–2.000 hareket içermelidir.'],columns:['Die Excel-Spalten entsprechen keiner unterstützten Bank- oder CSV-Vorlage. Bitte die Vorlagenspalten verwenden.','Excel sütunları desteklenen banka veya CSV şablonuyla uyuşmuyor. Şablon sütunlarını kullanın.'],date:['Datumszellen prüfen: echtes Excel-Datum oder JJJJ-MM-TT verwenden.','Tarih hücrelerini kontrol edin: Excel tarihi veya YYYY-AA-GG kullanın.'],amount:['Beträge prüfen: höchstens zwei Nachkommastellen und keine Rundung verwenden.','Tutarları kontrol edin: yuvarlama olmadan en fazla iki ondalık basamak kullanın.'],cell:['Die Excel-Datei enthält einen nicht unterstützten Zellwert.','Excel dosyasında desteklenmeyen hücre değeri var.'],sheet:['Bitte ein vorhandenes Tabellenblatt auswählen.','Mevcut bir çalışma sayfası seçin.'],empty:['Die Datei enthält keine lesbaren Bewegungen.','Dosyada okunabilir hareket yok.'],'xlsx-archive':['Die Excel-Datei ist beschädigt, zu umfangreich entpackt oder kein unterstütztes XLSX.','Excel dosyası bozuk, açılmış boyutu çok büyük veya desteklenen XLSX biçiminde değil.'],'xlsx-active':['Formeln, verbundene oder ausgeblendete Zellen und externe Verknüpfungen werden nicht importiert. Bitte eine reine Wertetabelle verwenden.','Formüller, birleştirilmiş veya gizli hücreler ve dış bağlantılar aktarılmaz. Yalnızca değerlerden oluşan tablo kullanın.'],timeout:['Das Lesen dauerte zu lange. Bitte die Datei aufteilen oder CSV verwenden.','Okuma çok uzun sürdü. Dosyayı bölün veya CSV kullanın.'],read:['Die Datei konnte nicht vollständig gelesen werden. Es wurde nichts importiert.','Dosya tamamen okunamadı. Hiçbir kayıt aktarılmadı.']};
 const label=messages[error.code]||messages.read;return label[language==='de'?0:1]+(error.location?' ('+error.location+')':'');
}
