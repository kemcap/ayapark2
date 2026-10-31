import {uiText} from './language-text.mjs?v=5.10.0';
import {receiptIds} from './report-export-domain.mjs?v=5.10.0';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function receiptButtons(data,id,{language,canFinance}){const ids=receiptIds(data,id,{canFinance});return ids.length?'<section class="receipt-actions"><h3>'+((language==='tr'?('Kişisel ödeme kayıtları'):(uiText("Persönliche Zahlungsnachweise",language))))+'</h3>'+ids.map((id,i)=>'<button class="button" type="button" data-action="export_receipt" data-id="'+escape(id)+'">'+((language==='tr'?('Ödeme kaydı'):(uiText("Zahlungsnachweis",language))))+' '+(i+1)+' · PDF / Excel</button>').join('')+'</section>':'';}
export async function downloadWorkbook(model,filename){
 try{const {workbookBytes}=await import('./xlsx-export.mjs?v=5.10.0');const url=URL.createObjectURL(new Blob([workbookBytes(model)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 catch{throw Error((model.language==='tr'?"Excel dışa aktarımı yapılamıyor. Dönemi daraltın; en fazla 5.000 satır desteklenir.":uiText("Excel-Export nicht möglich. Bitte den Zeitraum eingrenzen; höchstens 5.000 Zeilen sind möglich.",model.language)));}
}
export function openExport(model){
 const token=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 const child=window.open(new URL('./export.html#'+token,location.href).href,'_blank');if(!child)throw Error((model.language==='tr'?"Tarayıcıda dışa aktarım penceresine izin verin.":uiText("Bitte das Exportfenster im Browser erlauben.",model.language)));
 const cleanup=()=>{window.removeEventListener('message',listener);clearTimeout(timer);};
 const listener=event=>{if(event.source!==child||event.origin!==location.origin||event.data?.type!=='ayapark-export-ready'||event.data.token!==token)return;child.postMessage({type:'ayapark-export',token,model},location.origin);cleanup();};
 const timer=setTimeout(cleanup,30000);window.addEventListener('message',listener);
}
