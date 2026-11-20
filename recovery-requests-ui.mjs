import {escapeHtml as e} from './core.mjs?v=perf1';
import {getLanguage} from './i18n.mjs?v=5.10.0';

const words={
 tr:{heading:'Şifre yenileme talepleri',intro:'Kimliği doğruladıktan sonra kişiye özel bağlantı oluşturun.',empty:'Bekleyen şifre talebi yok.',review:'Kimliği doğrula ve bağlantı oluştur',done:'Tamamlandı',reject:'Reddet',reload:'Yenile',failed:'Talepler yüklenemedi. Yeniden deneyin.',updateFailed:'Talep güncellenemedi.',notice:'Şifre yenileme talebi',pending:'bekleyen talep',shortcut:'Şifre talepleri'},
 de:{heading:'Passwortanfragen',intro:'Vor dem Erstellen eines persönlichen Links die Identität prüfen.',empty:'Keine offenen Passwortanfragen.',review:'Identität prüfen und Link erstellen',done:'Erledigt',reject:'Ablehnen',reload:'Aktualisieren',failed:'Anfragen konnten nicht geladen werden.',updateFailed:'Anfrage konnte nicht bearbeitet werden.',notice:'Passwortzurücksetzung angefragt',pending:'offene Anfrage(n)',shortcut:'Passwortanfragen'},
 en:{heading:'Password requests',intro:'Verify identity before creating a personal link.',empty:'No pending password requests.',review:'Verify identity and create link',done:'Completed',reject:'Reject',reload:'Refresh',failed:'Could not load requests.',updateFailed:'Request could not be updated.',notice:'Password reset requested',pending:'pending request(s)',shortcut:'Password requests'}
};

export function bindRecoveryRequests({api,getState,openRecovery,onChange=()=>{},isPreview=()=>false}){
 const root=document.getElementById('phoneRecoveryRequestsPanel');
 let rows=[],count=0,loading=false,lastLoad=0,serial=0,error='',updating=false,expanded=false;
 const lang=()=>words[getLanguage()]||words.tr;
 const eligible=()=>{
  const s=getState();
  return s.mode==='connected'&&s.data?.role==='super'&&!isPreview();
 };
 const managerVisible=()=>eligible()&&getState().page==='persons';
 const when=date=>{try{return new Intl.DateTimeFormat(getLanguage()==='tr'?'tr-TR':getLanguage()==='de'?'de-DE':'en-GB',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(date));}catch{return '';}};
 const openCount=()=>eligible()?count:0;
 const badge=()=>count?' <span class="ay-recovery-count" aria-label="'+e(String(count))+'">'+count+'</span>':'';
 const notificationHTML=()=>openCount()
  ?'<div class="notification-row"><button type="button" class="notification-item unread ay-recovery-notice" data-recovery-notice><strong>🔐 '+e(lang().notice)+'</strong><small>'+count+' '+e(lang().pending)+'</small></button></div>':'';
 function hint(){
  const main=document.getElementById('content');
  if(!main)return;
  main.querySelector('#phoneRecoveryHint')?.remove();
  if(!openCount()||getState().page!=='overview')return;
  const x=lang();
  main.insertAdjacentHTML('afterbegin','<div id="phoneRecoveryHint" class="ay-recovery-hint" role="status"><span>🔐 '+e(x.notice)+' · '+count+' '+e(x.pending)+'</span><button type="button" class="text-button" data-recovery-shortcut>'+e(x.shortcut)+'</button></div>');
 }
 function panel(){
  if(!root)return;
  root.hidden=!managerVisible();
  if(root.hidden){root.replaceChildren();return;}
  const x=lang();
  root.innerHTML='<details class="ay-recovery-management"'+(expanded?' open':'')+'><summary><span>🔐 '+e(x.heading)+badge()+'</span></summary><div class="ay-recovery-management-body"><div class="ay-recovery-management-head"><p class="fine">'+e(x.intro)+'</p><button type="button" class="button small" data-phone-recovery="refresh">'+e(x.reload)+'</button></div>'+
   (error?'<p role="alert">'+e(error)+'</p>':'')+
   (!rows.length?'<p class="muted">'+e(loading?'…':x.empty)+'</p>':
    '<div class="ay-recovery-admin-list">'+rows.map(r=>'<article class="ay-recovery-admin-item"><div><strong>'+e(r.full_name||'')+'</strong><span class="fine">'+e(r.phone||'')+' · '+e(when(r.created_at))+'</span></div><div class="row-actions"><button type="button" class="button primary" data-phone-recovery="review" data-id="'+e(r.id)+'">'+e(x.review)+'</button><button type="button" class="button" data-phone-recovery="completed" data-id="'+e(r.id)+'">'+e(x.done)+'</button><button type="button" class="button" data-phone-recovery="rejected" data-id="'+e(r.id)+'">'+e(x.reject)+'</button></div></article>').join('')+'</div>')+
   '</div></details>';
  root.querySelector('details')?.addEventListener('toggle',ev=>{expanded=ev.target.open;});
 }
 async function load({force=false}={}){
  if(!eligible()){
   serial++;rows=[];count=0;lastLoad=0;error='';loading=false;expanded=false;panel();onChange();return;
  }
  if(loading||!force&&Date.now()-lastLoad<15000)return;
  const userId=getState().data.userId,id=++serial;
  loading=true;error='';panel();
  try{
   const result=await api.raw('/functions/v1/ay3-recovery-requests','POST',{action:'list'},await api.token());
   if(id!==serial||!eligible()||getState().data.userId!==userId)return;
   rows=Array.isArray(result?.requests)?result.requests:[];count=Math.max(0,Number(result?.open)||0);lastLoad=Date.now();
  }catch{if(id===serial&&eligible())error=lang().failed;}
  finally{if(id===serial){loading=false;panel();onChange();}}
 }
 function openManager(){
  if(!eligible())return;
  expanded=true;
  if(getState().page!=='persons')return 'persons';
  panel();
  root?.querySelector('details')?.scrollIntoView({block:'start',behavior:'smooth'});
  root?.querySelector('summary')?.focus({preventScroll:true});
  return '';
 }
 function shortcutHTML(){
  if(!managerVisible())return '';
  return '<div class="ay-recovery-shortcut"><button class="button" type="button" data-recovery-shortcut>🔐 '+e(lang().shortcut)+(count?' ('+count+')':'')+'</button></div>';
 }
 document.addEventListener('click',async ev=>{
  const btn=ev.target.closest('[data-phone-recovery]');
  if(!btn||!managerVisible()||updating)return;
  const action=btn.dataset.phoneRecovery;
  if(action==='refresh'){void load({force:true});return;}
  const row=rows.find(r=>r.id===btn.dataset.id);if(!row)return;
  if(action==='review'){openRecovery(row.person_id);return;}
  if(!['completed','rejected'].includes(action))return;
  updating=true;btn.disabled=true;
  try{await api.raw('/functions/v1/ay3-recovery-requests','POST',{action:'update',id:row.id,status:action},await api.token());await load({force:true});}
  catch{error=lang().updateFailed;panel();}
  finally{updating=false;btn.disabled=false;}
 });
 document.addEventListener('ay5:view',()=>{
  if(!eligible()){if(count||rows.length||lastLoad)void load();else panel();return;}
  panel();hint();
  if(!loading&&Date.now()-lastLoad>30000)void load();
 });
 document.addEventListener('ay2:languagechange',()=>{panel();hint();});
 window.addEventListener('focus',()=>{if(eligible()&&!loading&&Date.now()-lastLoad>10000)void load();});
 return {load,panel,hint,openManager,openCount,notificationHTML,shortcutHTML};
}
