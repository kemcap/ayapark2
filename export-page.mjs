import {uiText} from './language-text.mjs?v=5.10.0';
import {exportMarkup,validateExportModel} from './report-export-view.mjs?v=5.10.0';
import {downloadWorkbook} from './report-export-ui.mjs?v=5.10.0';
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);let model=null;
const timer=setTimeout(()=>{if(!model)document.getElementById('status').textContent='No export available. Reopen it in the app. / Kein Export verfügbar. In der App erneut öffnen. / Dışa aktarım yok. Uygulamadan yeniden açın.';},30000);
window.addEventListener('message',event=>{if(model||event.source!==window.opener||event.origin!==location.origin||event.data?.type!=='ayapark-export'||event.data.token!==token)return;
 try{model=validateExportModel(event.data.model);document.documentElement.lang=model.language;document.title=model.title+' · AyaPark 2';document.getElementById('document').innerHTML=exportMarkup(model);document.getElementById('actions').hidden=false;document.getElementById('print').textContent=(model.language==='tr'?"Yazdır / PDF olarak kaydet":uiText("Drucken / als PDF speichern",model.language));document.getElementById('status').textContent=(model.language==='tr'?"Bu dışa aktarım yalnızca seçilen verileri içerir.":uiText("Dieser Export enthält nur die ausgewählten Daten.",model.language));clearTimeout(timer);}catch{model=null;document.getElementById('status').textContent='Invalid export / Export ungültig / Geçersiz dışa aktarım';}
});
document.getElementById('print').addEventListener('click',()=>{if(model)window.print();});document.getElementById('excel').addEventListener('click',async()=>{if(model)try{await downloadWorkbook(model,'ayapark2-export.xlsx');}catch(error){document.getElementById('status').textContent=error.message;}});
if(window.opener&&/^[a-f0-9]{32}$/.test(token))window.opener.postMessage({type:'ayapark-export-ready',token},location.origin);
