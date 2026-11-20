import {escapeHtml as e} from './core.mjs?v=perf1';
import {getLanguage} from './i18n.mjs?v=5.10.0';

const words={
 tr:{heading:'Şifre yenileme talepleri',intro:'Telefonla şifre yenilemek isteyen kullanıcılar. Önce kimliğini doğrulayın.',empty:'Bekleyen şifre yenileme talebi yok.',review:'İncele ve bağlantı oluştur',done:'Tamamlandı',reject:'Reddet',reload:'Yenile',newRequest:'Yeni talep',failed:'Talepler yüklenemedi. Yeniden deneyin.',updateFailed:'Talep güncellenemedi.'},
 de:{heading:'Passwort-Anfragen',intro:'Anfragen über Telefonnummer. Vor dem Erstellen des Links die Identität prüfen.',empty:'Keine offenen Passwort-Anfragen.',review:'Prüfen und Link erstellen',done:'Erledigt',reject:'Ablehnen',reload:'Aktualisieren',newRequest:'Neue Anfrage',failed:'Anfragen konnten nicht geladen werden.',updateFailed:'Anfrage konnte nicht bearbeitet werden.'},
 en:{heading:'Password reset requests',intro:'Requests by phone number. Verify identity before creating a link.',empty:'No pending password reset requests.',review:'Verify and create link',done:'Completed',reject:'Reject',reload:'Refresh',newRequest:'New request',failed:'Could not load requests.',updateFailed:'Request could not be updated.'}
};
export function bindRecoveryRequests({api,getState,openRecovery}){
 const root=document.getElementById('phoneRecoveryRequestsPanel');
 let rows=[],count=0,loading=false,lastLoad=0,serial=0,error='',updating=false;
 const lang=()=>words[getLanguage()]||words.tr;
 const eligible=()=>{
  const s=getState();return s.mode==='connected'&&s.data?.role==='super'&&s.page==='overview';
 };
 const when=date=>{try{return new Intl.DateTimeFormat(getLanguage()==='tr'?'tr-TR':getLanguage()==='de'?'de-DE':'en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(date));}catch{return '';}};
 function panel(){
  if(!root)return;
  root.hidden=!eligible();if(root.hidden)return;
  const x=lang();
  root.innerHTML='<section class="card ay-recovery-admin"><header class="ay-recovery-admin-head"><h2>🔐 '+e(x.heading)+(count?' <span class="ay-recovery-count">'+count+'</span>':'')+'</h2><button type="button" class="button small" data-phone-recovery="refresh">'+e(x.reload)+'</button></header><p class="fine">'+e(x.intro)+'</p>'+
   (error?'<p role="alert">'+e(error)+'</p>':'')+
   (!rows.length?'<p class="muted">'+e(loading?'…':x.empty)+'</p>':
    '<div class="ay-recovery-admin-list">'+rows.map(r=>'<article class="ay-recovery-admin-item"><div><strong>'+e(r.full_name||'')+'</strong><span class="fine">'+e(r.phone||'')+' · '+e(when(r.created_at))+'</span></div><div class="row-actions"><button type="button" class="button primary" data-phone-recovery="review" data-id="'+e(r.id)+'">'+e(x.review)+'</button><button type="button" class="button" data-phone-recovery="completed" data-id="'+e(r.id)+'">'+e(x.done)+'</button><button type="button" class="button" data-phone-recovery="rejected" data-id="'+e(r.id)+'">'+e(x.reject)+'</button></div></article>').join('')+'</div>')+
   '</section>';
 }
 async function load(){
  if(!eligible()){panel();return;}
  const id=++serial;loading=true;error='';panel();
  try{
   const result=await api.raw('/functions/v1/ay3-recovery-requests','POST',{action:'list'},await api.token());
   if(id!==serial)return;rows=Array.isArray(result?.requests)?result.requests:[];count=Number(result?.open)||0;lastLoad=Date.now();
  }catch{if(id===serial)error=lang().failed;}
  finally{if(id===serial){loading=false;panel();}}
 }
 root?.addEventListener('click',async ev=>{
  const btn=ev.target.closest('[data-phone-recovery]');if(!btn||!eligible()||updating)return;
  const action=btn.dataset.phoneRecovery;
  if(action==='refresh'){void load();return;}
  const row=rows.find(r=>r.id===btn.dataset.id);if(!row)return;
  if(action==='review'){openRecovery(row.person_id);return;}
  if(!['completed','rejected'].includes(action))return;
  updating=true;btn.disabled=true;
  try{await api.raw('/functions/v1/ay3-recovery-requests','POST',{action:'update',id:row.id,status:action},await api.token());await load();}
  catch{error=lang().updateFailed;panel();}
  finally{updating=false;btn.disabled=false;}
 });
 document.addEventListener('ay5:view',()=>{
  if(!eligible()){panel();return;}
  panel();if(!loading&&Date.now()-lastLoad>15000)void load();
 });
 document.addEventListener('ay2:languagechange',panel);
 return {load,panel};
}
