import {uiText} from './language-text.mjs?v=5.10.0';
const denied=()=>{throw Error('Export access denied');};
const cents=n=>{n=Number(n);if(!Number.isSafeInteger(n))throw Error('Invalid export amount');return {moneyCents:n};};
const text=(language,de,tr)=>(language==='tr'?(tr):(uiText(de,language)));
function base(language,demo,title,columns,rows,notes=[]){return {language:['de','en','tr'].includes(language)?language:'tr',demo:!!demo,title,columns,rows,notes};}
export function summaryExport(data,series,{language='tr',demo=false,canFinance=false,range={}}={}){
 if(!canFinance&&data.communityAccess!==true)denied();
 return base(language,demo,text(language,'Finanzübersicht','Mali özet'),[text(language,'Zeitraum','Dönem'),text(language,'Einnahmen','Gelir'),text(language,'Ausgaben','Gider'),text(language,'Differenz','Fark')],series.buckets.map(b=>[String(b.period),cents(b.income),cents(b.expense),cents(b.income-b.expense)]),[text(language,'Aggregierte Übersicht ohne persönliche Schuldnerdetails. Kein bestätigter Monats-/Jahresabschluss.','Kişisel borçlu bilgileri içermeyen toplu özet. Onaylı aylık/yıllık kapanış değildir.'),text(language,'Zeitraum: ','Dönem: ')+(range.from||text(language,'verfügbarer Beginn','mevcut başlangıç'))+' – '+(range.to||text(language,'verfügbares Ende','mevcut bitiş'))]);
}
export function bankExport(transactions,{language='tr',demo=false,canFinance=false}={}){
 if(!canFinance)denied();return base(language,demo,text(language,'Bankbewegungen','Banka hareketleri'),[text(language,'Datum','Tarih'),text(language,'Beschreibung','Açıklama'),text(language,'Kategorie','Kategori'),text(language,'Betrag (TL)','Tutar (TL)'),text(language,'Referenz','Referans')],transactions.map(t=>[String(t.date),String(t.desc||''),String(t.category||''),cents(t.cents),String(t.bank_reference||t.reference||'')]),[text(language,'Vertraulicher Verwaltungsexport.','Gizli yönetim dışa aktarımı.')]);
}
export function receiptExport(data,allocationId,{language='tr',demo=false,canFinance=false}={}){
 const a=(data.allocations||[]).find(a=>a.id===allocationId&&!a.void_reason);if(!a)denied();const c=(data.charges||[]).find(c=>c.id===a.charge_id&&!c.void_reason);if(!c||!canFinance&&!(data.ownPersonIds||[]).includes(c.person_id))denied();
 if(Number(a.cents)<=0||(data.transactions||[]).some(t=>t.id===a.entry_id&&t.reversal_of||t.reversal_of===a.entry_id))denied();
 const person=(data.persons||[]).find(p=>p.id===c.person_id),unit=(data.units||[]).find(u=>u.id===c.unit_id),entry=(data.transactions||[]).find(e=>e.id===a.entry_id),reference='AY2-'+String(a.id);
 return base(language,demo,text(language,'Persönlicher Zahlungsnachweis','Kişisel ödeme kaydı'),[text(language,'Angabe','Bilgi'),text(language,'Wert','Değer')],[
  [text(language,'Nachweisnummer','Kayıt numarası'),reference],[text(language,'Zugeordnete Person','İlgili kişi'),String(person?.full_name||'—')],[text(language,'Wohnung','Daire'),String(unit?.code||'—')],[text(language,'Forderung','Borç'),String(c.label||'—')],[text(language,'Bankbuchung am','Banka kayıt tarihi'),String(entry?.date||'—')],[text(language,'Zugeordnet am','Eşleştirme tarihi'),String(a.created_at||'—')],[text(language,'Zugeordneter Betrag (TL)','Eşleştirilen tutar (TL)'),cents(a.cents)]
 ],[text(language,'Nachweis aus den Anwendungsdaten; kein Bankbeleg und keine steuerliche Quittung. Er umfasst nur diese Zahlungszuordnung.','Uygulama verilerinden oluşturulan kayıt; banka dekontu veya vergi makbuzu değildir. Yalnızca bu ödeme eşleştirmesini kapsar.')]);
}
export function receiptIds(data,chargeId,{canFinance=false}={}){
 const c=(data.charges||[]).find(c=>c.id===chargeId&&!c.void_reason);if(!c||!canFinance&&!(data.ownPersonIds||[]).includes(c.person_id))return [];
 return (data.allocations||[]).filter(a=>a.charge_id===chargeId&&!a.void_reason&&Number(a.cents)>0&&!(data.transactions||[]).some(t=>t.reversal_of===a.entry_id||t.id===a.entry_id&&t.reversal_of)).map(a=>a.id);
}
