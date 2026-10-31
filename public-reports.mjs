import {uiText} from './language-text.mjs?v=5.10.0';
import {releasedReportModel} from './released-report-model.mjs?v=5.10.0';
import {exportMarkup} from './report-export-view.mjs?v=5.10.0';
import {downloadWorkbook} from './report-export-ui.mjs?v=5.10.0';
const $=id=>document.getElementById(id),site=new URL(location.href).searchParams.get('site');let model=null,controller=null;
const t=(de,tr)=>($('language').value==='tr'?(tr):(uiText(de,$('language').value)));
async function load(){
 $('refresh').textContent=t('Aktualisieren','Yenile');document.title=t('Finanzübersicht','Mali özet')+' · AyaPark 2';
 controller?.abort();controller=new AbortController();const current=controller;model=null;$('document').textContent='';$('print').hidden=true;$('excel').hidden=true;document.documentElement.lang=$('language').value;
 if(!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(site||'')){$('status').textContent=t('Kein gültiger Freigabelink.','Geçerli paylaşım bağlantısı yok.');return;}
 $('status').textContent=t('Freigaben werden geladen …','Paylaşımlar yükleniyor …');
 const timer=setTimeout(()=>current.abort(),30000);
 try{
  // Only the public projection: no session tokens, cookies or account storage.
  const response=await fetch('https://eisozwhhinqszfikemot.supabase.co/rest/v1/rpc/ay3_public_report_summaries',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json',apikey:'sb_publishable_KGkvInvbdFRRF0716v9AuQ_fZjwkkBc'},body:JSON.stringify({p_site:site}),signal:current.signal});
  if(!response.ok)throw Error('Unavailable');const next=releasedReportModel(await response.json(),$('language').value);if(current!==controller)return;model=next;$('document').innerHTML=exportMarkup(model);$('status').textContent=t(model.rows.length?'Ausdrücklich öffentlich freigegebene Summen.':'Keine öffentlichen Finanzübersichten freigegeben.',model.rows.length?'Açıkça herkese paylaşılan toplamlar.':'Herkese açık mali özet paylaşılmadı.');$('print').hidden=!model.rows.length;$('excel').hidden=!model.rows.length;
 }catch(error){if(current!==controller)return;$('status').textContent=t('Freigaben konnten nicht geladen werden. Erneut versuchen.','Paylaşımlar yüklenemedi. Yeniden deneyin.');}finally{clearTimeout(timer);}
}
$('language').addEventListener('change',load);$('refresh').addEventListener('click',load);$('print').addEventListener('click',()=>{if(model?.rows.length)window.print();});$('excel').addEventListener('click',async()=>{if(model?.rows.length)try{await downloadWorkbook(model,'ayapark2-freigaben.xlsx');}catch{$('status').textContent=t('Export fehlgeschlagen.','Dışa aktarım tamamlanamadı.');}});void load();
