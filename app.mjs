import {popupProgress,closeMenuOnScroll} from './seven-ux.mjs?v=5.1.0';
import {prepareV5Demo} from './finance-demo.mjs?v=5.1.0';
import {financeActions,financePayload,localFinancePreview,financePreviewMarkup,updateFinanceForm} from './finance-forms.mjs?v=5.1.0';
import {notifications,unreadNotifications,hasRead,nextPopup,notificationList,notificationTitle,notificationBody,testAnnouncement,notificationCenter,notificationExpired} from './notifications.mjs?v=5.1.0';
import {bindDesign} from './design.mjs?v=5.1.0';
import {enhanceTables} from './ui-accessibility.mjs?v=5.1.0';
import {showFormError,clearFieldError,fieldError} from './ui-feedback.mjs?v=5.1.0';
import {apartmentInfo} from './apartment-info.mjs?v=5.1.0';
import {initializePreferences,syncPreferences,endPreferenceSession,changePreference,resetPreferences,preferences,beginLoading} from './preferences.mjs?v=5.1.0';
import {updateAssignmentForm} from './assignments.mjs?v=5.1.0';
import {personManager} from './people-ui.mjs?v=5.1.0';
import {mayPreview,residentPreviewOptions,previewProjection,previewBanner} from './access-preview.mjs?v=5.1.0';
import {bindInstall} from './install.mjs?v=5.1.0';
import {bindPasswordEyes} from './password-eye.mjs?v=5.1.0';
import {sha256} from './hash.mjs?v=5.1.0';
import {navigation,nextMobileNavGroup,unitResults,chargeDetail,providerDetail,info} from './v3-ui.mjs?v=5.1.0';
import {selectedRange,filteredTransactions,financialSeries,announcementActive,acknowledgementKey} from './v3-domain.mjs?v=5.1.0';
import {template} from './v3-import.mjs?v=5.1.0';
import {t as tr,getLanguage,setLanguage,bindStaticText} from './i18n.mjs?v=5.1.0';
import {escapeHtml as e,money,roleName,parseCsv,randomId} from './core.mjs?v=5.1.0';
import {fullDemo,demoCommand,refreshDebts,monthlySummary} from './ledger.mjs?v=5.1.0';
import {AyaparkApi} from './api.mjs?v=5.1.0';
import {enabledOAuthProviders,oauthAuthorizeUrl} from './oauth-entry.mjs';
import {icon,labels,pages,can,visible,renderPage,unitTable,filteredUnits,transactionTable,unitDetail,transactionDetail,button,date} from './ui.mjs?v=5.1.0';
import {buildForm,payloadFor} from './forms.mjs?v=5.1.0';
import {analyzeStage} from './reconcile.mjs?v=5.1.0';
const IS_PREVIEW=document.querySelector('meta[name="ayapark-stage"]')?.content==='preview';
const $=id=>document.getElementById(id),api=new AyaparkApi(undefined,{previewOnly:IS_PREVIEW,persist:!IS_PREVIEW});
const applyStaticLanguage=bindStaticText(document.body);
const hideLoginPassword=bindPasswordEyes();
let detailView=null,loginMethod='password';
bindInstall();
initializePreferences();
const updateDesignControl=bindDesign(()=>render());
const state={data:prepareV5Demo(fullDemo()),mode:IS_PREVIEW||new URLSearchParams(location.search).get('demo')==='1'?'demo':'signedout',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''},reportFilter:{preset:'all'},stale:false};
let peopleSearchTimer;
let epoch=0,loginBusy=false,writeBusy=false,formAction=null,toastTimer,fileGeneration=0,importPayload=null,mobileNavGroup=null;
function renderNavigation(){const compact=window.matchMedia('(max-width:1000px)').matches;if(!compact)mobileNavGroup=null;$('nav').innerHTML=navigation(state,labels,compact,mobileNavGroup);}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,8000);}
function isAccessPreview(){return ['connected','demo'].includes(state.mode)&&mayPreview(state.fullData)&&['staff','resident'].includes(state.viewRole);}
function render(focus=false){
 const appearanceWasOpen=document.querySelector('.appearance-settings')?.open;
 if(state.mode==='connected'){
  if(mayPreview(state.data)&&state.data!==state.fullData)state.fullData=state.data;
  if(mayPreview(state.fullData))state.data=previewProjection(state.fullData,state.viewRole||'super',state.previewSelection||'');
 }else if(state.mode==='demo'){if(!state.demoFullData||state.data.role==='super'){state.demoFullData=state.data;state.demoFullData.serverRole='manager';}state.fullData=state.demoFullData;state.data=previewProjection(state.fullData,state.viewRole||'super',state.previewSelection||'');}else{state.fullData=null;state.demoFullData=null;state.viewRole='super';state.previewSelection='';}

 document.documentElement.lang=getLanguage();
 $('languageToggle').hidden=false;$('languageToggle').innerHTML='<img class="flag" alt="" src="./assets/'+getLanguage()+'.svg"> '+getLanguage().toUpperCase();$('languageToggle').title=getLanguage()==='tr'?'Deutsch':'Türkçe';
 if(!pages(state).includes(state.page))state.page='overview';
 if(location.hash!=='#'+state.page)history.replaceState(null,'','#'+state.page);
 const d=state.data,own=d.role==='resident';document.title=labels[state.page]+' · Ayapark 2 · V5.1'+(IS_PREVIEW?' · '+tr('Önizleme'):'');
 renderNavigation();
 updateDesignControl();
 $('breadcrumb').textContent=labels[state.page];
 const previewAllowed=['connected','demo'].includes(state.mode)&&mayPreview(state.fullData);if(previewAllowed&&state.viewRole==='resident'){const opts=residentPreviewOptions(state.fullData);if(!opts.some(o=>o.id===state.previewSelection))state.previewSelection=opts[0]?.id||'';}
 $('roleControl').hidden=state.mode!=='demo'&&!previewAllowed;$('roleSelect').value=d.role;
 $('roleLabel').textContent=tr(previewAllowed?'Görünüm':'Görünümü dene');
 $('residentPreviewControl').hidden=!previewAllowed||d.role!=='resident';
 if(previewAllowed&&d.role==='resident'){
  const options=residentPreviewOptions(state.fullData);$('residentPreviewSelect').innerHTML=options.map(o=>`<option value="${e(o.id)}">${e(o.label.replace(/ · owner$/,' · '+tr('Ev sahibi')).replace(/ · tenant$/,' · '+tr('Kiracı')))}</option>`).join('');
  if(!options.some(o=>o.id===state.previewSelection))state.previewSelection=options[0]?.id||'';
  $('residentPreviewSelect').value=state.previewSelection;
 }
 $('modeBadge').textContent=tr("Örnek veriler");
 $('contextText').textContent=state.mode==='demo'?tr("Örnek çalışma alanı · Değişiklikler bu sayfayla sınırlıdır."):state.stale?tr("Kayıt kaydedildi; görünüm yenilenemedi. Sayfayı yeniden açın."):tr("Son okuma ")+(d.loadedAt||'')+tr(" · Kayıtlar hesabınızın yetkileriyle gösterilir.");
 if(isAccessPreview())$('contextText').textContent=tr('Görünüm önizlemesi · İşlemler kaydedilmez. Süper Admin görünümüne dönerek düzenleyin.');
 $('footerMode').textContent=state.mode==='demo'?tr("Örnek veriler"):tr("Hesabınız");$('connectionButton').textContent=state.mode==='demo'?tr("Hesabımla giriş"):tr("Çıkış yap");$('refreshButton').hidden=state.mode==='demo';
 document.body.classList.toggle('signed-out',state.mode==='signedout');
 $('previewBanner').hidden=!IS_PREVIEW;$('previewBanner').textContent=tr('V5.1 önizleme · Örnek veriler · Canlı kayıtlara erişim yok');
 if(IS_PREVIEW){$('connectionButton').textContent=tr('Giriş ekranını incele');$('installApp').hidden=true;}
 $('modeBadge').hidden=state.mode!=='demo';$('refreshButton').hidden=state.mode!=='connected';
 $('connectionButton').textContent=IS_PREVIEW?tr('Giriş ekranını incele'):state.mode==='connected'?tr('Çıkış yap'):tr('Giriş yap');
 $('content').innerHTML=state.mode==='signedout'?`<div class="login-welcome"><img src="./assets/buildings.svg" alt="Ayapark 2"><h1>AYAPARK 2</h1><p>${tr('Sitenize hoş geldiniz.')}</p></div>`:renderPage(state);
 if(appearanceWasOpen&&document.querySelector('.appearance-settings'))document.querySelector('.appearance-settings').open=true;
 const previewBar=$('accessPreviewBanner');previewBar.innerHTML=previewBanner(state);previewBar.hidden=!isAccessPreview();labelTables();applyAmountPrivacy();updateNotifications();checkUrgent();
 document.dispatchEvent(new CustomEvent('ay5:view',{detail:{resident:own,page:state.page,mode:state.mode}}));
 for(const card of document.querySelectorAll('.summary-grid .card')){const links=card.querySelectorAll('a[href]');if(links.length===1&&!card.querySelector('button,input,select')){card.classList.add('stretched-card');links[0].setAttribute('aria-label',(card.querySelector('h2')?.textContent||'')+': '+links[0].textContent);}}
 $('refreshButton').hidden=true;const powerLabel=tr(state.mode==='connected'?'Çıkış yap':'Giriş yap');$('connectionButton').innerHTML=icon('power');$('connectionButton').setAttribute('aria-label',powerLabel);$('connectionButton').title=powerLabel;
 if(state.page==='settings'&&can(state,'admin')&&!state.auditLoading&&state.auditData!==state.data){void loadAuditPage(0);}
 for(const [id,value] of [['statusFilter',state.filter.status],['txnFilter',state.filter.type],['periodFilter',state.filter.period]])if($(id))$(id).value=value;
 if(focus)$('content').focus({preventScroll:true});
}
function navigate(page){mobileNavGroup=null;state.page=page;state.filter={q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''};state.bankPage=0;render(true);window.scrollTo({top:0,behavior:'instant'});}
function closeDialogs(){for(const id of ['detailDialog','actionDialog','importDialog','urgentDialog','notificationsDialog'])if($(id).open)$(id).close();$('detailContent').textContent='';$('actionFields').textContent='';}
async function reload(){const stop=beginLoading($('contextText'));try{const attempt=epoch,loaded=await api.load();if(attempt!==epoch||state.mode!=='connected')throw Error(tr("Oturum değişti."));state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.stale=false;render();}finally{stop();}}
async function mutate(action,payload){const stop=beginLoading($('contextText'),tr('Kaydediliyor…'));try{return await mutateInner(action,payload);}finally{stop();}}
async function mutateInner(action,payload){
 if(action==='person_link')action='link';
 if(isAccessPreview())throw Error(tr('Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.'));
 if(state.mode==='demo'&&action==='user_access')return {ok:true};
 if(action==='user_access'){const result=await api.provision({...payload,site_id:state.data.site.id});await reload();return result;}
 if(action==='staff_remove'){
  if(state.mode==='demo'){
   const member=state.data.staff.find(x=>x.user_id===payload.user_id);
   if(!member||member.user_id===state.data.userId||member.role==='manager'&&state.data.staff.filter(x=>x.role==='manager').length<=1)throw Error(tr('Bu işlem için yetkiniz yok.'));
   state.data.staff=state.data.staff.filter(x=>x.user_id!==payload.user_id);
   state.data.permissions=state.data.permissions.filter(x=>x.user_id!==payload.user_id);
   state.data.audit.push({id:randomId(),at:new Date().toISOString(),actor:state.data.userId,action:'staff_remove',details:{reason:payload.reason}});
   render();return {ok:true};
  }
  const attempt=epoch,result=await api.rpc('ay3_remove_staff_member',{p_site:state.data.site.id,p_user:payload.user_id,p_confirm:payload.confirmation,p_reason:payload.reason});
  if(attempt!==epoch)throw Error(tr('Oturum değişti.'));
  try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
  return result;
 }
 if(state.mode==='demo'){const r=demoCommand(state.data,action,payload);state.data.transactions.sort((a,b)=>b.date.localeCompare(a.date));refreshDebts(state.data);render();return r;}
 const attempt=epoch,result=await api.command(state.data.site.id,action,payload);if(attempt!==epoch)throw Error(tr("Oturum değişti."));
 try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
 return result;
}
function permissionFor(action){return ['user_access','staff_remove','settings','permissions','publish_report'].includes(action)?'admin':['assignment_add','assignment_edit','assignment_remove','assignment_restore','person','person_link','link','edit_link','occupancy','end_link','unlink','switch_tenant','provider','provider_note'].includes(action)?'people':action==='announcement'?'announcements':action==='import'?'import':'finance';}
function showForm(action,args={}){
 if(isAccessPreview())throw Error(tr('Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.'));
 if(writeBusy)throw Error(tr("Önce devam eden işlemin tamamlanmasını bekleyin."));
 if(!can(state,permissionFor(action)))throw Error(tr("Bu işlem için yetkiniz yok."));
 const origin=$('detailDialog').open?detailView:null;
 const built=buildForm(state,action,{period:state.period,...args});
 if($('detailDialog').open)$('detailDialog').close();
 formAction={action,args,context:built.context,origin};$('actionFields').dataset.financeAction=financeActions.includes(action)?action:'';
 $('actionTitle').textContent=built.title;$('actionFields').innerHTML=built.body;$('actionMessage').textContent='';$('actionMessage').classList.remove('error');$('saveAction').textContent=tr(action==='staff_remove'?'Üyeyi kaldır':action==='assignment_remove'?'Kaldırmayı onayla':action==='assignment_restore'?'Geri getir':'Kaydet');$('actionDialog').showModal();updateConditionalForm();if(financeActions.includes(action))updateFinanceForm($('actionFields'),state.data);updateAnnouncementTargets();
}
function showDetail(html){
 if(!html)return;
 const dialog=$('detailDialog');$('detailContent').innerHTML=html;
 const title=$('detailTitle');if(title){title.tabIndex=-1;title.setAttribute('autofocus','');}
 if(!dialog.open)dialog.showModal();
 dialog.scrollTop=0;title?.focus({preventScroll:true});labelTables();applyAmountPrivacy();
}
function staged(){
 detailView={action:'staged'};
 if(!can(state,'finance'))return;
 const rows=state.data.staged.filter(x=>!x.confirmed_charge&&!x.ignored_reason);
 showDetail(`<div class="dialog-kicker">${tr("DEVİR KONTROLÜ")}</div><h2 id="detailTitle">${tr("Eski bakiye kayıtları")}</h2><div class="muted">${info('Eski yönetimden kalan tutarları aktarmadan önce kontrol edin.','Her kayıtta daireyi, dönemi ve ödemenin yapılıp yapılmadığını kontrol edin. Aynı borcu iki kez kaydetmeyin. Yalnızca onayladığınız kayıtlar borç olarak işlenir.')}</div><div class="table-wrap"><table><thead><tr><th>${tr("Kişi / Kaynak daire")}</th><th class="numeric">${tr("Tutar")}</th><th>${tr("Kontrol")}</th><th>${tr("İşlem")}</th></tr></thead><tbody>${rows.map(r=>{const check=analyzeStage(r,state.data);return `<tr><td>${e(r.person_label)}<small class="block-small">${e(r.unit_hint||tr("Daire belirtilmedi"))} · ${r.kind==='enforcement'?tr("İcra listesi"):tr("Genel liste")}</small></td><td class="numeric">${money(Number(r.cents))}</td><td>${check.suggestedCode?e(check.suggestedCode)+' · '+(check.basis==='document'?tr("Belgede"):tr("Banka önerisi")):tr("Blok teyidi gerekli")}${check.paymentCandidates.length?`<small class="block-small error">${tr("Sonraki tahsilatı inceleyin")}</small>`:''}${check.overlaps.length?`<small class="block-small error">${tr("Başka devir kaydı da var")}</small>`:''}</td><td>${button(tr("Teyit et"),'confirm_staged',`data-id="${e(r.id)}"`)}${button(tr("Hariç tut"),'ignore_staged',`data-id="${e(r.id)}"`)}</td></tr>`;}).join('')||`<tr><td colspan="4">${tr("Bekleyen devir kaydı yok.")}</td></tr>`}</tbody></table></div>`);
}
function downloadCsv(filename,rows){const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';const safe=v=>/^[=+@\-\t\r]/.test(String(v))?"'"+v:v;const csv='\uFEFF'+rows.map(r=>r.map(v=>cell(typeof v==='number'?v.toLocaleString('tr-TR',{useGrouping:false,maximumFractionDigits:2}):safe(v))).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReport(){
 const r=financialSeries(state.data,selectedRange(state,'report'),state.reportGroup||'year');downloadCsv('ayapark2-mali-rapor.csv',[[tr('Dönem'),tr('Gelir'),tr('Gider'),tr('Dönem farkı')],...r.buckets.map(b=>[b.period,b.income/100,b.expense/100,(b.income-b.expense)/100])]);
}
const urgentShown=new Set();let localTest=null,localTestRead=false,popupSession='',importantLoginKeys=new Set(),popupBatch=[],localTestQueue=[],localTestReceipts=new Set();
function notificationData(){const d=state.data;return {...d,userId:d.userId||'demo-user',announcements:[...(d.announcements||[]),...(localTest&&d.role==='super'?[localTest]:[]),...(d.role==='super'?localTestQueue:[])],acknowledgements:[...(d.acknowledgements||[]),...(localTestRead&&localTest?[{announcement_id:localTest.id,revision:localTest.revision,user_id:d.userId||'demo-user'}]:[]),...localTestQueue.filter(a=>localTestReceipts.has(a.id)).map(a=>({announcement_id:a.id,revision:a.revision,user_id:d.userId||'demo-user'}))]};}
function updateNotifications(){const d=notificationData(),unread=unreadNotifications(d);$('notificationBell').hidden=state.mode==='signedout';$('notificationCount').hidden=!unread.length;$('notificationCount').textContent=unread.length>99?'99+':unread.length;$('notificationBell').setAttribute('aria-label',tr('Bildirimler')+' · '+unread.length);$('notificationsTitle').textContent=tr('Bildirimler');$('closeNotifications').textContent=tr('Kapat');if($('notificationsDialog').open)$('notificationsList').innerHTML=notificationList(d);}
function openNotification(a,{progress=''}={}){if(!a)return;if($('notificationsDialog').open)$('notificationsDialog').close();$('urgentTitle').textContent=notificationTitle(a);$('urgentBody').textContent=notificationBody(a);$('urgentMeta').textContent=a.local_test?tr('Yalnızca Süper Admin testi'):new Date(a.created_at).toLocaleDateString(getLanguage()==='de'?'de-DE':'tr-TR')+(a.author_label?' · '+a.author_label:'');$('ackUrgent').dataset.id=a.id;$('ackUrgent').dataset.revision=a.revision||1;$('ackUrgent').dataset.key=acknowledgementKey(a);$('ackUrgent').textContent=tr(!announcementActive(a)||isAccessPreview()?'Kapat':'Okudum');$('urgentProgress').textContent=progress;$('urgentProgress').hidden=!progress;$('urgentDialog').dataset.required=a.priority==='urgent'&&announcementActive(a)&&!isAccessPreview()?'true':'false';$('ackUrgent').dataset.expired=String(!announcementActive(a)||isAccessPreview());if(a.priority!=='urgent')urgentShown.add(acknowledgementKey(a));if(!$('urgentDialog').open)$('urgentDialog').showModal();}
function checkUrgent(){const key=state.mode+':'+(state.data.userId||'demo-user')+':'+epoch;if(key!==popupSession){popupSession=key;popupBatch=[];importantLoginKeys=new Set(unreadNotifications(notificationData()).filter(a=>a.priority==='important'&&a.popup_on_login).map(acknowledgementKey));}if(isAccessPreview()||state.mode==='signedout'||document.querySelector('dialog[open]'))return;const pending=unreadNotifications(notificationData()).filter(a=>(a.priority==='urgent'||a.priority==='important'&&a.popup_on_login&&importantLoginKeys.has(acknowledgementKey(a)))&&!urgentShown.has(acknowledgementKey(a)));if(!pending.length){popupBatch=[];return;}if(!popupBatch.length)popupBatch=pending.map(acknowledgementKey);else for(const a of pending)if(!popupBatch.includes(acknowledgementKey(a)))popupBatch.push(acknowledgementKey(a));const a=pending[0];openNotification(a,{progress:popupBatch.length>1?popupProgress(popupBatch,acknowledgementKey(a)):''});}
$('notificationBell').addEventListener('click',()=>{$('notificationsList').innerHTML=notificationList(notificationData());$('notificationsDialog').showModal();});
$('closeNotifications').addEventListener('click',()=>$('notificationsDialog').close());
$('ackUrgent').addEventListener('click',async()=>{const b=$('ackUrgent');b.disabled=true;try{if(b.dataset.expired==='true'){$('urgentDialog').close();return;}if(b.dataset.id.startsWith('local-test-notification')){if(state.data.role!=='super')throw Error(tr('Yetkiniz yok.'));if(b.dataset.id==='local-test-notification')localTestRead=true;else localTestReceipts.add(b.dataset.id);updateNotifications();}else await mutate('acknowledge',{id:b.dataset.id,revision:Number(b.dataset.revision)});urgentShown.add(b.dataset.key);$('urgentDialog').close();checkUrgent();}catch(error){toast(error.message);}finally{b.disabled=false;}});
$('urgentDialog').addEventListener('cancel',event=>{if($('urgentDialog').dataset.required==='true')event.preventDefault();});
function updateAnnouncementTargets(){const root=$('actionFields'),kind=root.querySelector('[name="target_kind"]')?.value;for(const section of root.querySelectorAll('[data-notification-target]'))section.hidden=section.dataset.notificationTarget!==kind;}

document.addEventListener('click',async event=>{
 if(event.target.closest('.unit-history-link')){event.preventDefault();$('unitPaymentHistory')?.scrollIntoView({block:'start'});$('unitPaymentHistory')?.focus({preventScroll:true});return;}
 if(event.target.closest('[data-preview-return]')){changePreviewRole('super');return;}
 if(event.target.closest('[data-reset-appearance]')){resetPreferences(state.mode==='connected'?api:null,message=>{const el=$('preferenceStatus');if(el)el.textContent=message;});applyStaticLanguage();render();document.dispatchEvent(new Event('ay2:languagechange'));const panel=document.querySelector('.appearance-settings');if(panel)panel.open=true;document.querySelector('[data-reset-appearance]')?.focus();return;}
 const navToggle=event.target.closest('#nav [data-nav-group]');
 if(navToggle){
  const group=Number(navToggle.dataset.navGroup);
  mobileNavGroup=nextMobileNavGroup(mobileNavGroup,group);
  renderNavigation();
  $('nav').querySelector('[data-nav-group="'+group+'"]')?.focus({preventScroll:true});
  return;
 }
 const navLink=event.target.closest('#nav a[href^="#"]');
 if(navLink){
  mobileNavGroup=null;
  if(navLink.getAttribute('href')===location.hash){event.preventDefault();renderNavigation();}
  return;
 }
 const blockButton=event.target.closest('[data-block]');
 if(blockButton){
  const block=blockButton.dataset.block;if(!['A','B'].includes(block))return;
  state.filter.block=state.filter.block===block?'all':block;
  for(const node of document.querySelectorAll('[data-block]'))node.setAttribute('aria-pressed',String(node.dataset.block===state.filter.block));
  $('unitResults').innerHTML=unitResults(state);$('resultCount').textContent=filteredUnits(state).length+tr(' daire');
  return;
 }
 const tab=event.target.closest('[data-tab]');if(tab){const history=tab.dataset.tab==='history';$('unitCurrent').hidden=history;$('unitHistory').hidden=!history;for(const node of document.querySelectorAll('[data-tab]'))node.setAttribute('aria-pressed',String(node===tab));return;}
 const yr=event.target.closest('[data-year]');if(yr){state.reportFilter={preset:'custom',from:yr.dataset.year+'-01-01',to:yr.dataset.year+'-12-31'};state.reportGroup='month';render();return;}
 const hiddenAmount=event.target.closest('.amount-private');if(hiddenAmount){hiddenAmount.classList.remove('amount-private');hiddenAmount.removeAttribute('aria-label');return;}
 const testButton=event.target.closest('[data-notification-test]');
 if(testButton){if(state.data.role!=='super'||isAccessPreview())return;const action=testButton.dataset.notificationTest;
  if(action==='disable'){localTest=null;localTestRead=false;localTestQueue=[];localTestReceipts.clear();popupBatch=[];if($('urgentDialog').open&&$('ackUrgent').dataset.id.startsWith('local-test-notification'))$('urgentDialog').close();}
  else if(action==='show_many'){localTest=null;localTestRead=false;localTestReceipts.clear();popupBatch=[];localTestQueue=[1,2,3].map(n=>({...testAnnouncement(),id:'local-test-notification-'+n,title:'AYAPARK 2 – Test '+n,title_de:'AYAPARK 2 – Test '+n}));for(const a of localTestQueue){importantLoginKeys.add(acknowledgementKey(a));urgentShown.delete(acknowledgementKey(a));}checkUrgent();}
  else{localTestQueue=[];localTestReceipts.clear();localTest??=testAnnouncement();if(action==='reset')localTestRead=false;if(action==='show'||action==='reopen')openNotification(localTest);if(action==='reset')urgentShown.delete(acknowledgementKey(localTest));}
  updateNotifications();if($('notificationTestStatus'))$('notificationTestStatus').textContent=tr(action==='disable'?'Test devre dışı.':'Test hazır. Gerçek bildirim gönderilmedi.');return;
 }
 const notice=event.target.closest('[data-notification]');if(notice){openNotification(notificationCenter(notificationData()).find(a=>a.id===notice.dataset.notification));return;}
 const previewButton=event.target.closest('[data-finance-preview]');
 if(previewButton&&formAction){try{previewButton.disabled=true;const {action,context}=formAction,payload=financePayload(action,new FormData($('actionForm')),context,{previewing:true});const value=action==='auto_allocate'&&state.mode==='connected'?await api.rpc('ay5_payment_plan',{p_site:state.data.site.id,p_payload:payload}):localFinancePreview(state.data,action,payload);context.preview=value;context.previewSignature=JSON.stringify(payload);$('financePreview').innerHTML=financePreviewMarkup(state.data,action,value);labelTables();$('actionMessage').textContent='';}catch(error){$('actionMessage').textContent=tr(error.message);}finally{previewButton.disabled=false;}return;}
 const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 try{
  if(action==='audit_page'){if(can(state,'admin'))await loadAuditPage(Number(b.dataset.page));return;}
  if(action==='review_selected'){await reviewSelected();return;}
  if(action==='person_manage'){detailView={action,id:b.dataset.id};return showDetail(personManager(state,b.dataset.id));}
  if(action==='unit'){detailView={action,id:b.dataset.id};return showDetail(unitDetail(state,b.dataset.id));}
  if(action==='transaction'){if(can(state,'finance')){detailView={action,id:b.dataset.id};showDetail(transactionDetail(state,b.dataset.id));}return;}
  if(action==='charge_detail'){detailView={action,id:b.dataset.id};return showDetail(chargeDetail(state,b.dataset.id));}
  if(action==='provider_detail'){detailView={action,id:b.dataset.id};return showDetail(providerDetail(state,b.dataset.id));}
  if(action==='bank_previous'||action==='bank_next'){state.bankPage=Math.max(0,(state.bankPage||0)+(action==='bank_next'?1:-1));return render();}
  if(action==='staged')return staged();
  if(action==='review_import'){$('importDialog').close();navigate('transactions');state.filter.type='unmatched';render();return;}
  if(action==='print')return window.print();
  if(action==='export_report')return exportReport();
  if(action==='export_bank'){if(!can(state,'finance'))return;downloadCsv('ayapark2-banka-'+(state.mode==='demo'?'ornek':'kayitlar')+'.csv',[[tr("Tarih"),tr("Açıklama"),tr("Kategori"),tr("Tutar TL"),tr("Referans")],...filteredTransactions(state).map(t=>[t.date,t.desc,t.category,t.cents/100,t.bank_reference||t.reference||''])]);return;}
  if(action==='import'){
   if(isAccessPreview())throw Error(tr('Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.'));
   if(!can(state,'import'))return;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");$('commitImport').disabled=true;$('importDialog').showModal();return;
  }
  const back=b.closest('#actionFields')&&formAction?{...formAction,values:[...new FormData($('actionForm'))]}:null;
  showForm(action,{id:b.dataset.id,unit:b.dataset.unit,entry:b.dataset.entry,charge:b.dataset.charge,person:b.dataset.person,kind:b.dataset.kind});if(back)formAction.back=back;
 }catch(error){toast(error.message);}
});
$('languageToggle').addEventListener('click',()=>{
 const controls=Array.from($('actionFields').querySelectorAll('input,select,textarea')).map(node=>({name:node.name,value:node.value,checked:node.checked}));
 changePreference('language',getLanguage()==='tr'?'de':'tr',state.mode==='connected'?api:null);applyStaticLanguage();render();document.dispatchEvent(new Event('ay2:languagechange'));
 if($('detailDialog').open&&detailView){
  if(detailView.action==='staged')staged();
  else showDetail(detailView.action==='person_manage'?personManager(state,detailView.id):detailView.action==='unit'?unitDetail(state,detailView.id):detailView.action==='charge_detail'?chargeDetail(state,detailView.id):detailView.action==='provider_detail'?providerDetail(state,detailView.id):transactionDetail(state,detailView.id));
 }
 if($('actionDialog').open&&formAction){
  const built=buildForm(state,formAction.action,{period:state.period,...formAction.args});
  $('actionTitle').textContent=built.title;$('actionFields').innerHTML=built.body;
  if(formAction.action.startsWith('assignment_'))updateAssignmentForm($('actionFields'),state.data);
  for(const saved of controls){const node=$('actionFields').querySelector(`[name="${saved.name}"]`);if(node){node.value=saved.value;if(node.type==='checkbox')node.checked=saved.checked;}}
 }
 updateConditionalForm();document.dispatchEvent(new Event('ay2:languagechange'));
});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
function changePreviewRole(role,selection){if(writeBusy||loginBusy||!mayPreview(state.fullData)||!['super','staff','resident'].includes(role))return;closeDialogs();state.viewRole=role;if(selection!==undefined)state.previewSelection=selection;else if(role==='resident')state.previewSelection=residentPreviewOptions(state.fullData)[0]?.id||'';state.page='overview';state.filter={q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''};state.reportFilter={preset:'all'};render(true);}
$('roleSelect').addEventListener('change',event=>changePreviewRole(event.target.value));
$('residentPreviewSelect').addEventListener('change',event=>changePreviewRole('resident',event.target.value));
document.addEventListener('input',event=>{
 clearFieldError(event.target);
 if(formAction?.action.startsWith('assignment_')&&event.target.closest('#actionFields')){if(event.target.name==='person_search')updateConditionalForm('person_search');$('actionMessage').textContent='';}
 if(event.target.id==='unitSearch'){state.filter.q=event.target.value;$('unitResults').innerHTML=unitResults(state);$('resultCount').textContent=filteredUnits(state).length+tr(" daire");}
 if(event.target.id==='peopleSearch'){clearTimeout(peopleSearchTimer);const value=event.target.value,pos=event.target.selectionStart;peopleSearchTimer=setTimeout(()=>{state.peopleQuery=value;render();$('peopleSearch')?.focus();$('peopleSearch')?.setSelectionRange(pos,pos);},160);return;}

 if(event.target.id==='providerSearch'){state.providerQuery=event.target.value;const start=event.target.selectionStart;render();$('providerSearch').focus();$('providerSearch').setSelectionRange(start,start);}
 if(event.target.id==='txnSearch'){state.filter.q=event.target.value;$('transactionResults').innerHTML=transactionTable(state);}
});
document.addEventListener('change',event=>{
 const id=event.target.id;if(id==='previewRoleSelect'){changePreviewRole(event.target.value);return;}if(id==='previewPersonSelect'){changePreviewRole('resident',event.target.value);return;}
 if(event.target.closest('#actionFields')){if(financeActions.includes(formAction?.action)){if(event.target.name!=='confirmed'){delete formAction.context.previewSignature;if($('financePreview'))$('financePreview').textContent='';const confirm=$('actionFields').querySelector('[name=confirmed]');if(confirm)confirm.checked=false;}updateFinanceForm($('actionFields'),state.data,event.target.name);}updateAnnouncementTargets();}
 if((formAction?.action.startsWith('assignment_')||formAction?.action==='user_access')&&event.target.closest('#actionFields'))updateConditionalForm(event.target.name);
 if(event.target.name==='category'||event.target.name==='relation'||event.target.name==='person_id'||event.target.name==='start_unknown')updateConditionalForm();
 if(['statusFilter','txnFilter','periodFilter'].includes(id)){
  const key={statusFilter:'status',txnFilter:'type',periodFilter:'period'}[id];state.filter[key]=event.target.value;
  if(id==='statusFilter'){$('unitResults').innerHTML=unitResults(state);$('resultCount').textContent=filteredUnits(state).length+tr(" daire");}else $('transactionResults').innerHTML=transactionTable(state);
 }
 if(event.target.dataset.range){const kind=event.target.dataset.range,f=kind==='report'?state.reportFilter:state.filter;f[event.target.dataset.rangeField]=event.target.value;state.bankPage=0;render();return;}
 if(id==='reportGroup'){state.reportGroup=event.target.value;render();}
 if(id==='reportYear'){state.reportFilter=event.target.value==='all'?{preset:'all'}:{preset:'custom',from:event.target.value+'-01-01',to:event.target.value+'-12-31'};state.reportGroup=event.target.value==='all'?'year':'month';render();}
 if(id==='peopleFilter'){state.peopleFilter=event.target.value;render();}
 if(id==='providerCategory'){state.providerCategory=event.target.value;render();}
 if(id==='reportPeriod'&&/^\d{4}-\d{2}$/.test(event.target.value)){state.period=event.target.value;render();}
});
function restoreParentForm(back){showForm(back.action,back.args);for(const node of $('actionFields').querySelectorAll('[name]')){const values=back.values.filter(([k])=>k===node.name).map(([,v])=>v);if(node.type==='checkbox'||node.type==='radio')node.checked=values.includes(node.value);else if(values.length)node.value=values[0];}updateFinanceForm($('actionFields'),state.data,'restored');}
function cancelActionForm(){if(writeBusy)return;const back=formAction?.back;$('actionDialog').close();if(back){restoreParentForm(back);return;}const origin=formAction?.origin;if(origin?.action==='unit')showDetail(unitDetail(state,origin.id));else if(origin?.action==='person_manage')showDetail(personManager(state,origin.id));}
$('cancelAction').addEventListener('click',cancelActionForm);
$('actionDialog').addEventListener('cancel',event=>{event.preventDefault();cancelActionForm();});
$('actionForm').addEventListener('submit',async event=>{
 event.preventDefault();if(writeBusy||!formAction)return;const attempt=epoch;let stopLoading=()=>{};
 try{
  $('actionMessage').textContent='';$('actionMessage').classList.remove('error');
  const {action,context}=formAction;
  const payload=payloadFor(action,new FormData($('actionForm')),context);
  writeBusy=true;$('saveAction').disabled=true;$('cancelAction').disabled=true;$('actionMessage').textContent='';stopLoading=beginLoading($('actionMessage'),tr('Kaydediliyor…'));
  await mutate(action==='ignore_staged'?'confirm_staged':action,payload);
  if(attempt!==epoch)return;const back=formAction.back;writeBusy=false;$('actionDialog').close();if(back)restoreParentForm(back);if(!state.stale&&formAction.origin){const origin=formAction.origin;if(origin.action==='unit')showDetail(unitDetail(state,origin.id));else if(origin.action==='person_manage')showDetail(personManager(state,origin.id));}toast(state.stale?tr("Kaydedildi; görünüm yenilenemedi. Sayfayı yeniden açın."):state.mode==='demo'?tr("Örnek çalışma alanında kaydedildi."):tr("Kayıt tamamlandı."));
 }catch(error){if(attempt===epoch){error.message=tr(error.message);showFormError($('actionForm'),$('actionMessage'),error);}}
 finally{stopLoading();writeBusy=false;$('saveAction').disabled=false;$('cancelAction').disabled=false;}
});
document.addEventListener('ay2:themechanged',event=>changePreference('theme',event.detail,state.mode==='connected'?api:null));
$('connectionButton').addEventListener('click',async()=>{
 if(state.mode!=='connected'){$('loginMessage').textContent='';showLoginEntry();$('loginDialog').showModal();void checkOAuthProviders();return;}
 endPreferenceSession();urgentShown.clear();popupSession='';importantLoginKeys.clear();localTest=null;localTestRead=false;localTestQueue=[];localTestReceipts.clear();popupBatch=[];epoch++;closeDialogs();state.mode='signedout';state.data=prepareV5Demo(fullDemo());state.stale=false;navigate('overview');
 try{await api.logout();toast(tr("Oturum kapatıldı."));}catch{toast(tr("Bu sekmedeki oturum temizlendi; sunucu çıkışı doğrulanamadı."));}
});
let pendingSetupLoaded=null;
let oauthProviders={google:false,apple:false},oauthStatusChecked=false;
function updateOAuthOptions(){
 $('loginGoogle').hidden=!oauthProviders.google;
 $('loginApple').hidden=!oauthProviders.apple;
 $('loginOauthOptions').hidden=!(oauthProviders.google||oauthProviders.apple)||loginMethod==='setup_password';
}
async function checkOAuthProviders(){
 if(IS_PREVIEW||oauthStatusChecked)return;
 oauthStatusChecked=true;
 try{oauthProviders=enabledOAuthProviders(await api.raw('/auth/v1/settings'));}catch{oauthProviders={google:false,apple:false};oauthStatusChecked=false;}
 updateOAuthOptions();
}
function showLoginEntry(){
 $('loginEntryChoice').hidden=false;$('loginFlow').hidden=true;
 $('loginTitle').textContent=tr('Sitenize hoş geldiniz.');
 $('loginIntro').textContent=tr('Nasıl devam etmek istersiniz?');
 $('loginMessage').textContent='';
}
$('cancelLogin').addEventListener('click',()=>$('loginDialog').close());
$('chooseExistingAccess').addEventListener('click',()=>selectLogin('password'));
$('chooseFirstActivation').addEventListener('click',()=>selectLogin('setup'));
$('loginBack').addEventListener('click',()=>{
 if(loginBusy)return;
 if(pendingSetupLoaded){epoch++;pendingSetupLoaded=null;void api.logout().catch(()=>api.clear());}
 selectLogin('password');showLoginEntry();
});
for(const provider of ['google','apple']){
 $(provider==='google'?'loginGoogle':'loginApple').addEventListener('click',()=>{
  if(IS_PREVIEW||!oauthProviders[provider]||loginBusy)return;
  try{location.assign(oauthAuthorizeUrl(provider,new URL('./',location.href).href,oauthProviders));}
  catch{$('loginMessage').textContent=tr('Bu giriş yöntemi şu anda kullanılamıyor.');}
 });
}
function completeSignIn(loaded){
 state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.mode='connected';state.stale=false;
 state.period=loaded.transactions.map(t=>t.date.slice(0,7)).sort().at(-1)||new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}).slice(0,7);
 // Closing a completed login must not trigger the pending-login cancellation handler.
 loginBusy=false;pendingSetupLoaded=null;$('loginSubmit').disabled=false;
 if($('loginDialog').open)$('loginDialog').close();
 $('loginForm').reset();navigate('overview');void syncPreferences(api,()=>{applyStaticLanguage();render();document.dispatchEvent(new Event('ay2:languagechange'));});
}

$('loginDialog').addEventListener('close',()=>{
 hideLoginPassword();$('password').value='';$('setupPassword').value='';$('setupPasswordConfirm').value='';
 if(loginBusy||pendingSetupLoaded){epoch++;pendingSetupLoaded=null;void api.logout().catch(()=>{});loginBusy=false;$('loginSubmit').disabled=false;}
 selectLogin('password');showLoginEntry();
});

function selectLogin(method){
 loginMethod=method;const code=method==='code'||method==='setup';
 $('loginEntryChoice').hidden=true;$('loginFlow').hidden=false;
 $('loginIntro').textContent=tr(method==='setup'?'Yönetim tarafından tanımlanan erişiminizi e-posta koduyla doğrulayın.':'Mevcut hesabınızla giriş yapın.');
 $('loginFooter').hidden=method==='setup';updateOAuthOptions();
 $('loginMethodChooser').hidden=method==='setup';$('loginEmailField').hidden=false;$('email').required=true;
 $('passwordFields').hidden=method!=='password';$('codeFields').hidden=!code;$('setupPasswordFields').hidden=true;
 $('password').required=method==='password';$('loginCode').required=code;
 $('setupPassword').required=false;$('setupPasswordConfirm').required=false;
 $('usePassword').setAttribute('aria-pressed',String(method==='password'));
 $('useCode').setAttribute('aria-pressed',String(code));
 $('loginTitle').textContent=tr(method==='setup'?'Şifre oluştur':'Sitenize hoş geldiniz.');
 $('codeHelp').textContent=tr(method==='setup'?'Şifre oluşturmak için e-postadaki kodu buraya gir. E-postadaki bağlantıyı açma.':'E-postadaki kodu girin veya giriş bağlantısını açın. Yeni kullanıcı erişimini yönetim tanımlar.');
 $('loginSubmit').textContent=tr(method==='setup'?'Devam et':'Giriş yap');
 hideLoginPassword();$('password').value='';$('loginCode').value='';
 $('setupPassword').value='';$('setupPasswordConfirm').value='';$('loginMessage').textContent='';
}
function showFirstPasswordForm(loaded){
 pendingSetupLoaded=loaded;loginMethod='setup_password';
 $('loginMethodChooser').hidden=true;$('loginEmailField').hidden=true;$('email').required=false;
 $('passwordFields').hidden=true;$('codeFields').hidden=true;$('setupPasswordFields').hidden=false;
 $('password').required=false;$('loginCode').required=false;
 $('setupPassword').required=true;$('setupPasswordConfirm').required=true;
 $('loginTitle').textContent=tr('Şifre oluştur');
 $('loginOauthOptions').hidden=true;$('loginFooter').hidden=true;
 $('loginSubmit').textContent=tr('Şifreyi kaydet');
 $('setupPassword').focus();
}
$('useCode').addEventListener('click',()=>selectLogin('code'));
$('usePassword').addEventListener('click',()=>selectLogin('password'));
$('createPasswordEntry').addEventListener('click',()=>selectLogin('setup'));
let nextCodeAt=0;
$('requestCode').addEventListener('click',async()=>{
 if(loginBusy||Date.now()<nextCodeAt||!$('email').reportValidity())return;
 const b=$('requestCode'),email=$('email').value.trim();b.disabled=true;const stopLoading=beginLoading($('loginMessage'));
 try{await api.requestCode(email);nextCodeAt=Date.now()+60000;$('loginMessage').textContent=tr('Hesap tanımlıysa giriş e-postası gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');}
 catch(error){$('loginMessage').textContent=error.message;}
 finally{stopLoading();setTimeout(()=>{b.disabled=false;},Math.max(0,nextCodeAt-Date.now()));}
});
selectLogin('password');showLoginEntry();

$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(loginBusy)return;const stopLoading=beginLoading($('loginMessage'),tr('Hesap ve erişim yetkileri doğrulanıyor…'));loginBusy=true;const attempt=++epoch;$('loginSubmit').disabled=true;$('loginMessage').textContent='';$('loginMessage').classList.remove('error');
 try{
  if(loginMethod==='setup_password'){
   if($('setupPassword').value!==$('setupPasswordConfirm').value)throw Error(tr('Şifreler aynı değil.'));
   await api.setPassword($('setupPassword').value);
   if(attempt!==epoch)return;
   completeSignIn(pendingSetupLoaded);toast(tr('Şifren kaydedildi.'));return;
  }
  if(loginMethod==='code'||loginMethod==='setup')await api.verifyCode($('email').value.trim(),$('loginCode').value.trim());
  else await api.login($('email').value.trim(),$('password').value);
  $('password').value='';
  const loaded=await api.load();if(attempt!==epoch)return;
  if(loginMethod==='setup'){showFirstPasswordForm(loaded);return;}
  completeSignIn(loaded);toast(tr("Hesabınız açıldı."));
 }
 catch(error){
  if(attempt!==epoch)return;
  if((loginMethod!=='setup_password'&&[400,401,403].includes(error.status))||(loginMethod==='setup_password'&&[401,403].includes(error.status))){
   await api.logout().catch(()=>{});
  }
  if(attempt!==epoch)return;
  $('loginMessage').textContent=error.message;$('loginMessage').classList.add('error');
 }
 finally{stopLoading();if(attempt===epoch){loginBusy=false;$('loginSubmit').disabled=false;}}
});
$('refreshButton').addEventListener('click',async()=>{
 if(state.mode!=='connected')return;const attempt=epoch;$('refreshButton').disabled=true;$('refreshButton').setAttribute('aria-busy','true');
 try{await reload();toast(tr("Kayıtlar güncellendi."));}
 catch(error){if(attempt!==epoch)return;if([400,401,403].includes(error.status)){epoch++;closeDialogs();void api.logout().catch(()=>{});state.mode='signedout';state.data=prepareV5Demo(fullDemo());navigate('overview');toast(tr("Erişim doğrulanamadı. Yeniden giriş yapın."));}else{state.stale=true;render();toast(tr("Veriler yenilenemedi. Ekranda önceki okuma var."));}}
 finally{$('refreshButton').disabled=false;$('refreshButton').setAttribute('aria-busy','false');}
});
$('csvFile').addEventListener('change',async()=>{
 const generation=++fileGeneration,file=$('csvFile').files[0];importPayload=null;$('commitImport').disabled=true;if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error(tr("Dosya en fazla 2 MB olabilir."));if(!file.name.toLowerCase().endsWith('.csv'))throw Error(tr("CSV dosyası seçin."));
  const raw=await file.text();if(generation!==fileGeneration)return;const parsed=parseCsv(raw);const digest=await sha256(raw);if(generation!==fileGeneration)return;
  importPayload={source:file.name,digest,entries:parsed.entries.map(t=>({date:t.date,desc:t.desc,cents:t.cents,category:'Diğer',reference:t.reference||'',balance_cents:t.balance_cents,counterparty:t.counterparty||'',iban:t.iban||'',unit_hint:t.unit_hint||''}))};
  $('importPreview').innerHTML=`<strong>${parsed.entries.length}${tr(" satır · ")}${parsed.duplicates}${tr(" dosya içi olası tekrar")}</strong><p class="fine">${tr("Henüz kayıt oluşturulmadı. Sunucu aynı hareketleri tekrar kaydetmez. Banka referansı bulunmayan aynı tarih/açıklama/tutarlı CSV satırları tekrar kabul edilmez; ayrı gerçek hareketler için bankanın referanslı kaydını kullanın.")}</p><div class="table-wrap"><table><caption>${tr("İlk 5 satır")}</caption><thead><tr><th>${tr("Tarih")}</th><th>${tr("Açıklama")}</th><th>${tr("Tutar")}</th></tr></thead><tbody>${parsed.entries.slice(0,5).map(t=>`<tr><td>${e(t.date)}</td><td>${e(t.desc)}</td><td>${money(t.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  $('commitImport').disabled=false;
 }catch(error){if(generation===fileGeneration)$('importPreview').textContent=error.message;}
});
$('commitImport').addEventListener('click',async()=>{
 if(!importPayload||writeBusy)return;const attempt=epoch,payload=importPayload;writeBusy=true;$('commitImport').disabled=true;
 try{const r=await mutate('import',payload);if(attempt!==epoch)return;importPayload=null;$('importPreview').textContent=`${r.inserted}${tr(" hareket kaydedildi, ")}${r.duplicates}${tr(" tekrar atlandı.")}${state.stale?tr(" Görünümü yenileyin."):''}`;$('importPreview').append(document.createElement('p'));$('importPreview').insertAdjacentHTML('beforeend',button(tr('Ödemeleri kontrol et'),'review_import'));toast(tr("Dosya kontrolü ve aktarımı tamamlandı."));}
 catch(error){if(attempt===epoch){$('importPreview').textContent=error.message;$('commitImport').disabled=false;}}
 finally{writeBusy=false;}
});
$('importDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('importDialog').addEventListener('close',()=>{fileGeneration++;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");});
applyStaticLanguage();
document.documentElement.lang=getLanguage();
document.dispatchEvent(new Event('ay2:languagechange'));
if(!new URLSearchParams(location.hash.slice(1)).has('access_token')&&!new URLSearchParams(location.hash.slice(1)).has('error'))navigate(location.hash.slice(1)||'overview');

function updateConditionalForm(changed=''){
 if(formAction?.action==='user_access'){const fresh=$('actionFields').querySelector('[name="person_mode"]:checked')?.value==='new';for(const[id,enabled]of [['accessExisting',!fresh],['accessNew',fresh]]){const container=$(id);if(!container)continue;container.hidden=!enabled;for(const input of container.querySelectorAll('input,select')){input.disabled=!enabled;input.required=enabled;}}return;}

 if(formAction?.action.startsWith('assignment_'))updateAssignmentForm($('actionFields'),state.data,changed);

 if(formAction?.action!=='entry')return;const category=$('actionFields').querySelector('[name="category"]'),desc=$('actionFields').querySelector('[name="desc"]');if(desc){desc.placeholder=tr(category?.value==='Diğer'?'İşlem ne için yapıldı?':'Açıklama girin');desc.required=true;}
}

function labelTables(){enhanceTables(document);}

window.matchMedia('(max-width:1000px)').addEventListener('change',()=>{mobileNavGroup=null;renderNavigation();});

// Page hints open on hover; dialog disclosures open only by click or keyboard.
document.addEventListener('pointerover',event=>{if(event.pointerType!=='mouse'||event.target.closest('dialog'))return;const el=event.target.closest('.info-help');if(el&&!el.open){el.dataset.hoverOpen='1';el.open=true;}});
document.addEventListener('pointerout',event=>{if(event.target.closest('dialog'))return;const el=event.target.closest('.info-help');if(el?.dataset.hoverOpen&&!el.contains(event.relatedTarget)){el.open=false;delete el.dataset.hoverOpen;}});
document.addEventListener('focusin',event=>{if(event.target.closest('dialog'))return;const el=event.target.closest('.info-help');if(el&&window.matchMedia('(hover:hover)').matches&&!el.open){el.dataset.focusOpen='1';el.open=true;}});
document.addEventListener('focusout',event=>{if(event.target.closest('dialog'))return;const el=event.target.closest('.info-help');if(el?.dataset.focusOpen&&!el.contains(event.relatedTarget)){el.open=false;delete el.dataset.focusOpen;}});

function applyAmountPrivacy(){if(!preferences().hideAmounts)return;for(const node of document.querySelectorAll('.apartment-balance,.numeric,.money-pair dd,.detail-grid strong,.metric strong,.report-total strong,.amount,.review-item strong,.compact-info,.debt-card strong,.bookkeeping-details strong')){if(/(?:TL|₺|TRY)/.test(node.textContent)){node.classList.add('amount-private');node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label',tr('Tutarı göster'));}}}
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.classList.contains('amount-private')){event.preventDefault();event.target.click();}});
async function loadAuditPage(page=0){
 if(state.auditLoading||!can(state,'admin'))return;
 const attempt=epoch,size=state.auditSize||10;state.auditLoading=true;state.auditError='';state.auditPage=Math.max(0,page);state.auditData=state.data;render();
 try{const result=state.mode==='demo'?{rows:state.data.audit.slice().reverse().slice(state.auditPage*size,(state.auditPage+1)*size),total:state.data.audit.length}:await api.rpc('ay3_audit_page',{p_site:state.data.site.id,p_limit:size,p_offset:state.auditPage*size});if(attempt!==epoch)return;state.auditState=result;}
 catch(error){if(attempt===epoch)state.auditError=error.message;}
 finally{if(attempt===epoch){state.auditLoading=false;render();}}
}
async function reviewSelected(){
 if(writeBusy||isAccessPreview()||!detailView||detailView.action!=='unit')return;
 if(!can(state,'finance'))throw Error(tr('Bu işlem için yetkiniz yok.'));
 const info=apartmentInfo(state,state.data.units.find(u=>u.id===detailView.id)),keys=new Set([...document.querySelectorAll('[data-review-key]:checked')].map(x=>x.dataset.reviewKey));
 const items=info.openIssues.filter(i=>i.reviewable&&keys.has(i.key)).map(({unit_id,kind,source_id,fingerprint})=>({unit_id,kind,source_id,fingerprint}));if(!items.length)return;
 if(items.length>100)throw Error(tr('Bir seferde en fazla 100 konu seçin.'));
 writeBusy=true;const attempt=epoch,b=document.querySelector('[data-action="review_selected"]');b.disabled=true;const stop=beginLoading(b,tr('Kaydediliyor…'));
 try{if(state.mode==='demo'){state.data.reviewState||={sources:[],receipts:[]};for(const item of items){state.data.reviewState.receipts.push({...item,reviewed_at:new Date().toISOString()});state.data.audit.push({id:randomId(),at:new Date().toISOString(),action:'review_checked',details:item});}render();}else{await api.rpc('ay3_review_selected',{p_site:state.data.site.id,p_items:items});await reload();}if(attempt===epoch){showDetail(unitDetail(state,detailView.id));toast(tr('Seçilen konular kontrol edildi olarak kaydedildi.'));}}
 finally{stop();writeBusy=false;if(b.isConnected)b.disabled=false;}
}
document.addEventListener('change',event=>{
 const preference=event.target.dataset.preference;
 if(preference){changePreference(preference,preference==='contrast'?(event.target.checked?'high':'normal'):event.target.type==='checkbox'?event.target.checked:event.target.value,state.mode==='connected'?api:null,message=>{const status=$('preferenceStatus');if(status)status.textContent=message;});applyStaticLanguage();const open=document.querySelector('.appearance-settings')?.open;render();if(open&&document.querySelector('.appearance-settings'))document.querySelector('.appearance-settings').open=true;document.dispatchEvent(new Event('ay2:languagechange'));return;}
 if(event.target.id==='auditSize'){state.auditSize=Number(event.target.value);void loadAuditPage(0);return;}
 if(event.target.matches('[data-review-all]'))for(const box of document.querySelectorAll('[data-review-key]'))box.checked=event.target.checked;
 if(event.target.matches('[data-review-all],[data-review-key]')){const all=[...document.querySelectorAll('[data-review-key]')],n=all.filter(x=>x.checked).length,select=document.querySelector('[data-review-all]'),b=document.querySelector('[data-action="review_selected"]');if(select){select.checked=n===all.length&&n>0;select.indeterminate=n>0&&n<all.length;}if(b)b.disabled=n===0||writeBusy;const count=document.querySelector('[data-review-count]');if(count)count.textContent=n+' '+tr('seçildi');}
});
async function resumeSession(){
 if(state.mode==='demo'||loginBusy)return;
 const stopLoading=beginLoading($('content'),tr('Yükleniyor…'),{skeleton:true});
 const attempt=++epoch,hash=new URLSearchParams(location.hash.slice(1));
 if(hash.get('type')==='recovery'){stopLoading();location.replace(new URL('./reset.html',location.href).href+location.hash);return;}
 try{
  let restored=false;
  if(hash.has('access_token')||hash.has('error')){
   const access=hash.get('access_token'),refresh=hash.get('refresh_token');history.replaceState(null,'',location.pathname+location.search);
   if(!access||!refresh)throw Error(tr('Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.'));
   await api.acceptLink(access,refresh);restored=true;
  }else restored=await api.restore();
  if(!restored||attempt!==epoch)return;
  const loaded=await api.load();if(attempt!==epoch)return;
  completeSignIn(loaded);
 }catch(error){if(attempt===epoch){if([401,403].includes(error.status)&&api.session)void api.logout().catch(()=>api.clear());toast(error.message);}}
 finally{stopLoading();}
}
window.addEventListener('storage',event=>{
 if(state.mode==='demo'||(event.key!==api.storageKey&&event.key!==null))return;
 if(!api.saved()){epoch++;api.clear(false);closeDialogs();state.mode='signedout';state.data=prepareV5Demo(fullDemo());navigate('overview');}
 else if(state.mode==='signedout')void resumeSession();
});
// Refresh on resume and periodically while open. Network failures preserve the saved session.
setInterval(()=>{if(state.mode==='connected')void api.token().catch(error=>{if([400,401,403].includes(error.status)){epoch++;closeDialogs();state.mode='signedout';state.data=prepareV5Demo(fullDemo());navigate('overview');toast(error.message);}});},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.mode==='signedout'&&api.saved())void resumeSession();});
void resumeSession();

$('actionForm').addEventListener('invalid',event=>{event.preventDefault();const input=event.target;const message=tr(input.validity.valueMissing?'Bu alanı doldurun.':input.type==='email'?'Geçerli bir e-posta adresi girin.':'Bu alanı kontrol edin.');showFormError($('actionForm'),$('actionMessage'),fieldError(message,input.name));const first=$('actionForm').querySelector(':invalid');first?.focus();},true);

document.addEventListener('input',event=>{if(event.target.closest('#actionFields')&&financeActions.includes(formAction?.action)&&event.target.name!=='confirmed'){delete formAction.context.previewSignature;if($('financePreview'))$('financePreview').textContent='';const c=$('actionFields').querySelector('[name="confirmed"]');if(c)c.checked=false;}});
let autoRefreshBusy=false,lastAutoRefresh=Date.now();
async function refreshWhenIdle(){if(autoRefreshBusy||state.mode!=='connected'||document.visibilityState!=='visible'||writeBusy||loginBusy||document.querySelector('dialog[open]')||Date.now()-lastAutoRefresh<30000||document.activeElement?.matches('input,textarea,select'))return;autoRefreshBusy=true;lastAutoRefresh=Date.now();try{await reload();}catch{state.stale=true;}finally{autoRefreshBusy=false;}}
setInterval(()=>void refreshWhenIdle(),90000);window.addEventListener('focus',()=>void refreshWhenIdle());document.addEventListener('visibilitychange',()=>void refreshWhenIdle());

window.addEventListener('scroll',event=>{if(mobileNavGroup!==null&&closeMenuOnScroll(event,$('nav'))){mobileNavGroup=null;renderNavigation();}},{passive:true,capture:true});
