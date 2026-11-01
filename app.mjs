import {createBrowserAlerts} from './browser-alerts.mjs?v=4';
import {createPrivacyGate} from './privacy-gate.mjs?v=3';
import {preserveViewFocus} from './ui-focus.mjs?v=5.10.1';
import {nextLanguage} from './language-text.mjs?v=5.10.0';
import {uiText} from './language-text.mjs?v=5.10.0';
import {claimHoldReview} from './claim-hold-ui.mjs?v=perf1';
import {managementTasks} from './management-tasks-ui.mjs?v=perf1';
import {privateArchive} from './archive-ui.mjs?v=perf1';
import {budgetPlanning} from './budget-planning-ui.mjs?v=perf1';
import {levyReviews} from './levy-review-ui.mjs?v=perf1';
import {reportReleases} from './report-release-ui.mjs?v=perf1';
import {periodClosings} from './period-closing-ui.mjs?v=perf1';
import {summaryExport,bankExport,receiptExport} from './report-export-domain.mjs?v=5.10.0';
import {receiptButtons,downloadWorkbook,openExport} from './report-export-ui.mjs?v=5.10.0';
import {readBankFile} from './bank-file-reader.mjs?v=5.10.0';
import {bankFileMessage} from './bank-file-adapters.mjs?v=5.10.0';
import {reviewImport} from './import-review.mjs?v=5.9.33';
import {contactError} from './contact-requests.mjs?v=perf1';
import {mayUseTaskAction} from './task-permissions.mjs?v=5.10.0';
import {bindAdminRecovery} from './admin-recovery-ui.mjs?v=5.10.0';
import {bindAccessRequests} from './access-request-ui.mjs?v=perf1';
import {popupProgress,closeMenuOnScroll} from './seven-ux.mjs?v=perf1';
import {installSmartHeader} from './smart-header.mjs?v=5.9.49';
import {expenseDistributionPanel} from './expense-distribution-ui.mjs?v=perf1';
import {incomeExpenseChart} from './finance-charts.mjs?v=perf1';
import {prepareV5Demo} from './finance-demo.mjs?v=perf1';
import {financeActions,financePayload,localFinancePreview,financePreviewMarkup,updateFinanceForm} from './finance-forms.mjs?v=perf1';
import {notifications,unreadNotifications,hasRead,nextPopup,notificationList,notificationTitle,notificationBody,testAnnouncement,notificationCenter,notificationExpired} from './notifications.mjs?v=cleartests1';
import {bindDesign} from './design.mjs?v=5.10.0';
import {enhanceTables} from './ui-accessibility.mjs?v=5.10.1';
import {showFormError,clearFieldError,fieldError} from './ui-feedback.mjs?v=5.10.1';
import {apartmentInfo} from './apartment-info.mjs?v=perf1';
import {initializePreferences,syncPreferences,endPreferenceSession,changePreference,resetPreferences,preferences,beginLoading} from './preferences.mjs?v=perf1';
import {updateAssignmentForm} from './assignments.mjs?v=perf1';
import {personManager} from './people-ui.mjs?v=pushstatus1';
import {bindInvitations} from './invite-ui.mjs?v=perf1';
import {mayPreview,nativePreviewRole,allowedPreviewRoles,residentPreviewOptions,previewProjection,previewBanner} from './access-preview.mjs?v=perf1';
import {bindInstall} from './install.mjs?v=perf1';
import {bindPasswordEyes} from './password-eye.mjs?v=5.10.1';
import {sha256} from './hash.mjs?v=5.8.1';
import {navigation,nextMobileNavGroup,unitResults,chargeDetail,providerDetail,info,residentClaimsDetail} from './v3-ui.mjs?v=announcements-safe1';
import {rangeError,selectedRange,filteredTransactions,financialSeries,buildSummaryDays,announcementActive,acknowledgementKey} from './v3-domain.mjs?v=perf1';
import {template} from './v3-import.mjs?v=perf1';
import {t as tr,getLanguage,setLanguage,bindStaticText} from './i18n.mjs?v=5.10.0';
import {escapeHtml as e,money,roleName,parseCsv,randomId} from './core.mjs?v=perf1';
import {fullDemo,demoCommand,refreshDebts,monthlySummary} from './ledger.mjs?v=perf1';
import {AyaparkApi} from './api.mjs?v=pushread1';
import {icon,labels,pages,can,visible,renderPage,unitTable,filteredUnits,transactionTable,unitDetail,transactionDetail,button,date} from './ui.mjs?v=logs2';
import {buildForm,payloadFor} from './forms.mjs?v=perf1';
import {analyzeStage} from './reconcile.mjs?v=5.10.0';
const IS_PREVIEW=document.querySelector('meta[name="ayapark-stage"]')?.content==='preview';
const $=id=>document.getElementById(id),api=new AyaparkApi(undefined,{previewOnly:IS_PREVIEW,persist:!IS_PREVIEW});
const applyStaticLanguage=bindStaticText(document.body);
const hideLoginPassword=bindPasswordEyes();
let detailView=null,personUnitReturn=null,loginMethod='password';
function applyApartmentQuickFilters(){
 const root=$('unitResults');if(!root)return;
 let count=0;
 for(const section of root.querySelectorAll('.building-block')){
  const block=section.querySelector('h3')?.textContent?.trim()?.[0]?.toUpperCase();
  const blockAllowed=state.filter.block==='all'||state.filter.block===block;
  let sectionCount=0;
  for(const card of section.querySelectorAll('.apartment-card')){
   const status=state.filter.status;
   const matching=status==='all'||(status==='debt'&&card.dataset.hasDebt==='true')||(status==='paid'&&card.dataset.hasDebt==='false')||(status==='occupied'&&card.dataset.occupancy==='occupied')||(status==='vacant'&&card.dataset.occupancy==='vacant');
   card.hidden=!blockAllowed||!matching;
   if(!card.hidden)sectionCount++;
  }
  section.hidden=sectionCount===0;
  count+=sectionCount;
 }
 if($('resultCount'))$('resultCount').textContent=count+tr(' daire');
}

bindInstall();
initializePreferences();
const updateDesignControl=bindDesign(()=>render());
const state={data:prepareV5Demo(fullDemo()),mode:IS_PREVIEW||new URLSearchParams(location.search).get('demo')==='1'?'demo':'signedout',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''},reportFilter:{preset:'all'},expenseDistributionYear:'report',financeChartView:'bar',stale:false};
const privacyGate=createPrivacyGate({api,language:getLanguage});
const browserAlerts=createBrowserAlerts({api,getContext:()=>state.mode==='connected'?state.data:null,language:getLanguage});
let peopleSearchTimer;
const invitationUi=bindInvitations({
 api,getState:()=>state,rerender:()=>render(),
 onActivated:async({phone,password})=>{await api.login(phone,password);completeSignIn(await api.load());},
 openPhoneLogin:(phone)=>{selectLogin('password');$('email').value=phone;$('loginDialog').showModal();$('loginMessage').textContent=tr('Hesabın etkinleştirildi. Giriş bilgin ve yeni şifrenle giriş yap.');}
});
const adminRecoveryUi=bindAdminRecovery({api,getState:()=>state});
const accessRequestUi=bindAccessRequests({api,getState:()=>state,invite:id=>invitationUi.open(id)});
async function loadPushStatuses(){if(state.mode!=='connected'||!can(state,'admin'))return;try{const r=await api.rpc('ay10_person_push_status',{p_site:state.data.site.id});state.pushStatus=Object.fromEntries((Array.isArray(r)?r:[]).map(x=>[x.person_id,x]));render();}catch(error){console.warn('Push statuses unavailable',error);}}
async function loadPersonLogins(){if(state.mode!=='connected'||!can(state,'admin'))return;try{state.personLogins=await api.rpc('ay8_person_last_logins');render();}catch(error){console.warn('Login-Übersicht nicht verfügbar',error);}}
let epoch=0,loginBusy=false,writeBusy=false,formAction=null,toastTimer,fileGeneration=0,importPayload=null,mobileNavGroup=null,importController=null;
function renderNavigation(){const compact=window.matchMedia('(max-width:1000px)').matches;if(!compact)mobileNavGroup=null;$('nav').innerHTML=navigation(state,labels,compact,mobileNavGroup);}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,8000);}
function isAccessPreview(){return ['connected','demo'].includes(state.mode)&&mayPreview(state.fullData)&&allowedPreviewRoles(state.fullData).includes(state.viewRole)&&state.viewRole!==nativePreviewRole(state.fullData);}
function render(focus=false){
 const restoreFocus=focus?()=>{}:preserveViewFocus();
 const appearanceWasOpen=document.querySelector('.appearance-settings')?.open;
 if(state.mode==='connected'){
  if(mayPreview(state.data)&&state.data!==state.fullData)state.fullData=state.data;
  if(mayPreview(state.fullData)){if(!allowedPreviewRoles(state.fullData).includes(state.viewRole))state.viewRole=nativePreviewRole(state.fullData);state.data=previewProjection(state.fullData,state.viewRole,state.previewSelection||'');}
 }else if(state.mode==='demo'){if(!state.demoFullData||state.data.role==='super'){state.demoFullData=state.data;state.demoFullData.serverRole='manager';}state.fullData=state.demoFullData;state.data=previewProjection(state.fullData,state.viewRole||'super',state.previewSelection||'');}else{state.fullData=null;state.demoFullData=null;state.viewRole='super';state.previewSelection='';}

 document.documentElement.lang=getLanguage();
 $('languageToggle').hidden=false;$('languageToggle').innerHTML='<img class="flag" alt="" src="./assets/'+getLanguage()+'.svg?v=uk1"> <span class="language-code">'+getLanguage().toUpperCase()+'</span>';$('languageToggle').title=tr('Dili değiştir')+' · Türkçe → Deutsch → English';$('languageToggle').setAttribute('aria-label',$('languageToggle').title);
 if(!pages(state).includes(state.page))state.page='overview';
 if(location.hash!=='#'+state.page)history.replaceState(null,'','#'+state.page);
 const d=state.data,own=d.role==='resident';document.title=labels[state.page]+' · Ayapark 2 · V5.10.0'+(IS_PREVIEW?' · '+tr('Önizleme'):'');
 renderNavigation();
 updateDesignControl();
 $('breadcrumb').textContent=labels[state.page];
 const previewAllowed=['connected','demo'].includes(state.mode)&&mayPreview(state.fullData);if(previewAllowed&&state.viewRole==='resident'){const opts=residentPreviewOptions(state.fullData);if(!opts.some(o=>o.id===state.previewSelection))state.previewSelection=opts[0]?.id||'';}
 $('roleControl').hidden=!previewAllowed;
  for(const option of $('roleSelect').options){const allowed=previewAllowed&&allowedPreviewRoles(state.fullData).includes(option.value);option.hidden=!allowed;option.disabled=!allowed;}
  $('roleSelect').value=d.role;
 $('roleLabel').textContent=tr('Görünüm');
 const narrowRoleLabels=window.matchMedia('(max-width:440px)').matches;
 const deutsch=getLanguage()==='de';
 const roleLabels={
  super:narrowRoleLabels?((getLanguage()==='tr'?('Süper'):(uiText("Super",getLanguage())))):tr('Süper Admin'),
  staff:narrowRoleLabels?((getLanguage()==='tr'?('Yönetim'):(uiText("Verw.",getLanguage())))):tr('Yönetim'),
  resident:narrowRoleLabels?((getLanguage()==='tr'?('Sakin'):(uiText("Bewohner",getLanguage())))):tr('Site Sakini')
 };
 for(const option of $('roleSelect').options)option.textContent=roleLabels[option.value]||option.textContent;
 $('roleSelect').setAttribute('aria-label',tr('Görünümü dene'));
 $('roleSelect').title=tr('Önizlemede değişiklikler kaydedilmez.');
 $('residentPreviewLabel').textContent=tr('Daire / Kişi');
 const showResidentPreview=previewAllowed&&d.role==='resident';
 $('residentPreviewControl').hidden=!showResidentPreview;
 $('previewTargetBar').hidden=!showResidentPreview;
 document.querySelector('.header-actions').classList.toggle('has-role-preview',previewAllowed);
 if(previewAllowed&&d.role==='resident'){
  const options=residentPreviewOptions(state.fullData);$('residentPreviewSelect').innerHTML=options.map(o=>`<option value="${e(o.id)}">${e(o.label.replace(/ · owner$/,' · '+tr('Ev sahibi')).replace(/ · tenant$/,' · '+tr('Kiracı')))}</option>`).join('');
  if(!options.some(o=>o.id===state.previewSelection))state.previewSelection=options[0]?.id||'';
  $('residentPreviewSelect').value=state.previewSelection;
 }
 $('modeBadge').textContent=tr("Örnek veriler");
 $('contextText').textContent=state.mode==='demo'?tr("Örnek çalışma alanı · Değişiklikler bu sayfayla sınırlıdır."):state.stale?tr("Veriler yenilenemedi. Ekranda önceki okuma var."):tr("Son okuma ")+(d.loadedAt||'')+tr(" · Kayıtlar hesabınızın yetkileriyle gösterilir.");
 if(isAccessPreview())$('contextText').textContent=tr(nativePreviewRole(state.fullData)==='super'?'Görünüm önizlemesi · İşlemler kaydedilmez. Süper Admin görünümüne dönerek düzenleyin.':'Görünüm önizlemesi · İşlemler kaydedilmez. Yönetim görünümüne dönerek düzenleyin.');
 $('footerMode').textContent=state.mode==='demo'?tr("Örnek veriler"):tr("Hesabınız");$('connectionButton').textContent=state.mode==='demo'?tr("Hesabımla giriş"):tr("Çıkış yap");$('refreshButton').hidden=state.mode==='demo';
 document.body.classList.toggle('signed-out',state.mode==='signedout');
 $('previewBanner').hidden=!IS_PREVIEW;$('previewBanner').textContent=tr('V5.1 önizleme · Örnek veriler · Canlı kayıtlara erişim yok');
 if(IS_PREVIEW){$('connectionButton').textContent=tr('Giriş ekranını incele');$('installApp').hidden=true;}
 $('modeBadge').hidden=state.mode!=='demo';$('refreshButton').hidden=state.mode!=='connected';
 $('connectionButton').textContent=IS_PREVIEW?tr('Giriş ekranını incele'):state.mode==='connected'?tr('Çıkış yap'):tr('Giriş yap');
 const logPage=state.page==='logdata'&&state.mode==='connected'&&can(state,'admin');
 const logBody=logPage?'<section class="card ay-logdata-page"><div class="card-head"><div><h2>Logdaten · Anmeldehistorie</h2><p>Gespeicherte Login- und App-Ereignisse einzelner Personen einsehen.</p></div></div><p class="fine">Die Angaben zeigen dokumentierte Ereignisse, keine geschätzte Online-Zeit. Eine Sitzungsdauer ist nur mit zuverlässigem Anfangs- und Endzeitpunkt bestimmbar. Zeitangaben: Türkiye.</p><div class="ay-logdata-people">'+(state.data.persons||[]).filter(p=>!p.archived_at&&p.auth_user_id).sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''),'tr')).map(p=>'<button class="ay-logdata-person" type="button" data-action="person_login_logs" data-id="'+e(p.id)+'"><span><strong>'+e(p.full_name||'—')+'</strong><small>'+e(p.email||'Registrierter Zugang')+'</small></span><span aria-hidden="true">›</span></button>').join('')+'</div></section>':'';
 $('content').innerHTML=state.mode==='signedout'?`<div class="login-welcome"><img src="./assets/ayapark2-modern-icon.svg?v=8" alt="Ayapark 2"><h1>AYAPARK 2</h1><p>${tr('Sitenize hoş geldiniz.')}</p></div>${invitationUi.landing()}`:(logPage?logBody:renderPage(state));
 if(state.mode!=='signedout'&&state.page==='reports'&&!can(state,'finance')&&state.data.communityAccess!==true)$('content').innerHTML='<section class="card"><h1>'+((getLanguage()==='tr'?('Mali özet erişime açık değil'):(uiText("Finanzübersicht nicht freigegeben",getLanguage()))))+'</h1><p>'+((getLanguage()==='tr'?('Bu erişim için ortak mali özetler açık değil. Kendi borç ve ödemeleriniz kişisel alanda kullanılabilir.'):(uiText("Für diesen Zugang sind keine gemeinsamen Finanzübersichten freigegeben. Eigene Forderungen und Zahlungen bleiben im persönlichen Bereich verfügbar.",getLanguage()))))+'</p></section>';
 if(state.mode==='connected'&&!isAccessPreview()&&state.page==='overview')$('content').insertAdjacentHTML('afterbegin','<div class="archive-toolbar"><button class="button" type="button" data-action="private_archive">'+((getLanguage()==='tr'?('Belgeler ve toplantılar'):(uiText("Dokumente & Versammlungen",getLanguage()))))+'</button></div>');
 if(state.mode==='connected'&&!isAccessPreview()&&state.page==='overview'&&['super','staff'].includes(d.role)){const tasks=d.taskWorkspace,c=tasks?.counts;document.querySelector('.archive-toolbar')?.insertAdjacentHTML('beforeend','<button class="button" type="button" data-action="management_tasks">'+((getLanguage()==='tr'?('Görevler ve tarihler'):(uiText("Aufgaben & Termine",getLanguage()))))+'</button><span role="status">'+(c?((getLanguage()==='tr'?('Gecikmiş: '+c.overdue+' · Bugün: '+c.today+' · Gelecek 7 gün: '+c.soon):(uiText("Überfällig: ",getLanguage())+c.overdue+uiText(" · Heute: ",getLanguage())+c.today+uiText(" · Nächste 7 Tage: ",getLanguage())+c.soon))):((getLanguage()==='tr'?('Görev durumu yok – listeyi açın.'):(uiText("Aufgabenstand nicht verfügbar – Liste öffnen.",getLanguage())))))+'</span>');}
 if(state.mode==='connected'&&state.page==='settings')$('content').insertAdjacentHTML('afterbegin','<div class="ay-privacy-settings-link"><a href="./privacy-policy.html" target="_blank" rel="noopener noreferrer"><span aria-hidden="true" class="ay-privacy-document-icon">▤</span><span class="ay-privacy-document-copy"><strong>'+(getLanguage()==='de'?'Gesamten Vertrag lesen (30 Artikel)':getLanguage()==='en'?'Read full agreement (30 articles)':'Sözleşmenin tamamını oku (30 madde)')+'</strong><small>'+(getLanguage()==='de'?'Vollständiges Dokument öffnen':getLanguage()==='en'?'Open full document':'Tam metni aç ve incele')+'</small></span><span aria-hidden="true" class="ay-privacy-document-arrow">↗</span></a></div>');
 if(appearanceWasOpen&&document.querySelector('.appearance-settings'))document.querySelector('.appearance-settings').open=true;
 if(state.mode==='connected'&&state.page==='settings')browserAlerts.mount();
 addExportControls();const previewBar=$('accessPreviewBanner');previewBar.innerHTML=previewBanner(state);previewBar.hidden=!isAccessPreview();labelTables();applyAmountPrivacy();updateNotifications();checkUrgent();
 document.dispatchEvent(new CustomEvent('ay5:view',{detail:{resident:own,page:state.page,mode:state.mode}}));
 for(const card of document.querySelectorAll('.summary-grid .card')){const links=card.querySelectorAll('a[href]');if(links.length===1&&!card.querySelector('button,input,select')){card.classList.add('stretched-card');links[0].setAttribute('aria-label',(card.querySelector('h2')?.textContent||'')+': '+links[0].textContent);}}
 $('refreshButton').hidden=state.mode!=='connected';const powerLabel=tr(state.mode==='connected'?'Çıkış yap':'Giriş yap');$('connectionButton').innerHTML=icon('power');$('connectionButton').setAttribute('aria-label',powerLabel);$('connectionButton').title=powerLabel;
 if(state.page==='settings'&&can(state,'admin')&&!state.auditLoading&&state.auditData!==state.data){void loadAuditPage(0);}
 for(const [id,value] of [['statusFilter',state.filter.status],['txnFilter',state.filter.type],['periodFilter',state.filter.period]])if($(id))$(id).value=value;
 if(focus)$('content').focus({preventScroll:true});else restoreFocus();
}
function recordAppEvent(event,page=null){if(state.mode!=='connected'||!state.data?.site?.id||isAccessPreview())return;void api.rpc('ay8_record_app_event',{p_site:state.data.site.id,p_event:event,p_page:page}).catch(()=>{});}
function navigate(page){recordAppEvent('page_view',page);clearTimeout(peopleSearchTimer);mobileNavGroup=null;state.page=page;state.filter={q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''};state.bankPage=0;render(true);window.scrollTo({top:0,behavior:'instant'});}
const closingUI=periodClosings({rpc:(name,args)=>api.rpc(name,args),allowed:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),site:()=>state.data.site.id,language:getLanguage,onSaved:reload});
const releaseUI=reportReleases({rpc:(name,args)=>api.rpc(name,args),admin:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),community:()=>state.mode==='connected'&&!isAccessPreview()&&(can(state,'finance')||state.data.communityAccess===true),site:()=>state.data.site.id,language:getLanguage});
const levyUI=levyReviews({rpc:(name,args)=>api.rpc(name,args),admin:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),connected:()=>state.mode==='connected'&&!isAccessPreview(),site:()=>state.data.site.id,language:getLanguage,data:()=>state.data,onSaved:reload});
const budgetUI=budgetPlanning({rpc:(name,args)=>api.rpc(name,args),allowed:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'finance'),admin:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),site:()=>state.data.site.id,language:getLanguage,data:()=>state.data,onSaved:reload,onRender:applyAmountPrivacy});
const archiveUI=privateArchive({rpc:(name,args)=>api.rpc(name,args),storage:(path,args)=>api.storageDocument(path,args),allowed:()=>state.mode==='connected'&&!isAccessPreview(),admin:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),site:()=>state.data.site.id,siteName:()=>state.data.site.name||'AyaPark 2',language:getLanguage});
const tasksUI=managementTasks({rpc:(name,args)=>api.rpc(name,args),allowed:()=>state.mode==='connected'&&!isAccessPreview()&&['super','staff'].includes(state.data.role),admin:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),site:()=>state.data.site.id,language:getLanguage,onSaved:reload,onDocument:id=>void archiveUI.open({documentId:id})});
const holdUI=claimHoldReview({rpc:(name,args)=>api.rpc(name,args),allowed:()=>state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'),site:()=>state.data.site.id,language:getLanguage,data:()=>state.data,onSaved:async()=>{await reload();if(detailView?.action==='charge_detail'&&$('detailDialog').open)showDetail(chargeWithReceipts(detailView.id));}});
function closeDialogs(){holdUI.close();tasksUI.close();archiveUI.close();closingUI.close();releaseUI.close();levyUI.close();budgetUI.close();personUnitReturn=null;$('detailDialog').classList.remove('person-unit-drawer');for(const id of ['detailDialog','actionDialog','importDialog','urgentDialog','notificationsDialog','inviteDialog'])if($(id).open)$(id).close();$('detailContent').textContent='';$('actionFields').textContent='';}
async function reload(){const stop=beginLoading($('contextText'));try{const attempt=epoch,loaded=await api.load();if(attempt!==epoch||state.mode!=='connected')throw Error(tr("Oturum değişti."));if(nativePreviewRole(state.fullData)!==nativePreviewRole(loaded)){state.viewRole=nativePreviewRole(loaded)||'resident';state.previewSelection='';}state.fullData=null;state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.stale=false;render();}finally{stop();}}
async function sendImportantPush(result,payload){
 // Server verifies priority, target, publishing window, site and sender authorization.
 const id=result?.id||result?.announcement_id||payload?.id;
 if(!id)return;
 const token=await api.token();
 await api.raw('/functions/v1/ay10-web-push-send','POST',{site_id:state.data.site.id,announcement_id:id},token);
}
async function mutate(action,payload){const stop=beginLoading($('contextText'),tr('Kaydediliyor…'));try{return await mutateInner(action,payload);}finally{stop();}}
async function mutateInner(action,payload){
 if(action==='person_link')action='link';
 if(action.startsWith('contact_')){
  if(isAccessPreview()||state.mode!=='connected')throw Error('Access denied');
  const p_site=state.data.site.id;
  const result=action==='contact_request'?await api.rpc('ay3_request_contact_change',{p_site,p_person:payload.person_id,p_request:payload.request_id,p_email:payload.email,p_phone:payload.phone}):action==='contact_decide'?await api.rpc('ay3_decide_contact_change',{p_site,p_id:payload.id,p_approve:payload.approve,p_verified:payload.verified,p_reason:payload.reason}):action==='contact_withdraw'?await api.rpc('ay3_withdraw_contact_change',{p_site,p_id:payload.id}):null;
  if(result===null&&action!=='contact_withdraw')throw Error('Unknown contact action');
  await reload();return result;
 }

 if(action==='draft_decision'){if(isAccessPreview()||state.mode!=='connected'||!can(state,'admin'))throw Error('Access denied');const r=await api.rpc('ay3_decide_charge_draft',{p_site:state.data.site.id,p_id:payload.id,p_approve:payload.approve});await reload();return r;}
 if(isAccessPreview())throw Error(tr(nativePreviewRole(state.fullData)==='super'?'Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.':'Önizlemede değişiklik yapılamaz. Yönetim görünümüne dönün.'));
 if(state.mode==='demo'&&action==='user_access')return {ok:true};
 if(action==='user_access'){const result=await api.provision({...payload,site_id:state.data.site.id});await reload();return result;}

 if(action==='provider'||action==='provider_category'){
  if(!can(state,'people'))throw Error(tr('Bu işlem için yetkiniz yok.'));
  if(state.mode==='demo'){
   const d=state.data;d.providerCategories=d.providerCategories||[];
   if(action==='provider'){
    const old=d.providers.find(x=>x.id===payload.id);
    const id=old?.id||randomId();
    const values={name:payload.name,category:payload.categories[0],categories:payload.categories,
      contact:payload.contact||'',phone:payload.phone||'',email:payload.email||'',status:payload.status||'preferred'};
    if(old)Object.assign(old,values);else d.providers.push({...values,id});
    if(payload.edit_note_id){
     const note=d.providerNotes.find(x=>x.id===payload.edit_note_id&&x.provider_id===id);
     if(!note)throw Error(tr('Not bulunamadı.'));
     note.body=payload.edit_note_body;
    }else if(payload.new_note_body){
     d.providerNotes.push({id:randomId(),provider_id:id,body:payload.new_note_body,created_at:new Date().toISOString(),author_label:'Örnek Yönetici'});
    }
   }else{
    const name=payload.name||'',match=d.providerCategories.find(x=>x.id===payload.category_id);
    if(payload.operation==='add'){
     if(d.providerCategories.some(x=>x.name.toLocaleLowerCase('tr-TR')===name.toLocaleLowerCase('tr-TR')))throw Error(tr('Kategori zaten var.'));
     d.providerCategories.push({id:randomId(),name});
    }else if(!match)throw Error(tr('Kategori bulunamadı.'));
    else if(payload.operation==='rename'){
     const oldName=match.name;match.name=name;
     for(const p of d.providers){p.categories=(p.categories||[p.category]).map(x=>x===oldName?name:x);if(p.category===oldName)p.category=name;}
    }else if(payload.operation==='delete'){
     if(d.providers.some(p=>(p.categories||[p.category]).includes(match.name)))throw Error(tr('Kategori halen kullanılıyor.'));
     d.providerCategories=d.providerCategories.filter(x=>x.id!==match.id);
    }
   }
   render();return {ok:true};
  }
  const p_site=state.data.site.id;
  const result=action==='provider'?await api.rpc('ay3_save_provider',{p_site,p_payload:payload}):
   await api.rpc('ay3_manage_provider_category',{p_site,p_action:payload.operation,p_name:payload.name||null,p_id:payload.category_id||null});
  await reload();return result;
 }
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
 if(action==='person_lifecycle'||action==='person_restore'){
  if(!can(state,'admin'))throw Error(tr('Bu işlem için yetkiniz yok.'));
  const mode=action==='person_restore'?'restore':payload.mode;
  if(state.mode==='demo'){
   const d=state.data,person=d.persons.find(x=>x.id===payload.person_id);
   if(!person)throw Error('Person nicht gefunden.');
   if(person.auth_user_id&&mode==='delete'&&!payload.revoke_access)throw Error('Site-Zugang zuerst ausdrücklich entziehen.');
   if(person.auth_user_id&&payload.revoke_access){
    if(person.auth_user_id===d.userId||(d.staff||[]).some(m=>m.user_id===person.auth_user_id))
     throw Error('Yönetim hesabı: Önce yönetim üyeliğini kaldırın.');
    if(d.persons.some(p=>p.id!==person.id&&p.auth_user_id===person.auth_user_id))
     throw Error('Giriş hesabı birden fazla kişiye bağlı.');
   }
   if(mode==='archive'){
    if(person.archived_at)throw Error('Bereits archiviert.');
    person.archived_at=new Date().toISOString();person.archive_note=payload.note;
    for(const l of d.links.filter(l=>l.person_id===person.id&&l.active)){
     l.active=false;l.archived_at=person.archived_at;l.archive_reason='person_archived';l.archive_note=payload.note;l.revision=(l.revision||0)+1;
    }
   }else if(mode==='restore'){
    if(!person.archived_at)throw Error('Nicht archiviert.');
    person.archived_at=null;person.archive_note=null;
   }else if(mode==='delete'){
    const ids=new Set(d.links.filter(l=>l.person_id===person.id).map(l=>l.id));
    if(d.charges.some(c=>c.person_id===person.id||ids.has(c.link_id))||(d.credits||[]).some(c=>c.person_id===person.id)||(d.exceptions||[]).some(c=>c.person_id===person.id))
     throw Error('Finanzvorgänge vorhanden: Bitte archivieren.');
    d.matchRules=(d.matchRules||[]).filter(r=>r.person_id!==person.id);
    d.links=d.links.filter(l=>l.person_id!==person.id);
    d.persons=d.persons.filter(p=>p.id!==person.id);
   }else throw Error('Ungültige Aktion.');
   render();return {ok:true,mode};
  }
  const attempt=epoch,result=await api.rpc('ay3_manage_person_v2',{p_site:state.data.site.id,p_person:payload.person_id,p_mode:mode,p_note:payload.note||'',p_confirm:payload.confirmation===true,p_revoke_access:payload.revoke_access===true});
  if(attempt!==epoch)throw Error(tr('Oturum değişti.'));
  try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
  return result;
 }
 if(action==='assignment_add'&&payload.historical){
  if(state.mode==='demo'){
   const d=state.data,unit=d.units.find(u=>u.id===payload.unit_id);if(!unit)throw Error(tr('Daire bulunamadı.'));
   let person=d.persons.find(x=>x.id===payload.person_id);
   if(payload.new_person){person={id:randomId(),first_name:payload.first_name,last_name:payload.last_name,full_name:payload.first_name+' '+payload.last_name,phone:payload.phone||'',email:payload.email||'',notes:payload.notes||''};d.persons.push(person);}
   if(!person)throw Error(tr('Kişi seçin.'));
   if(d.links.some(l=>l.unit_id===unit.id&&l.person_id===person.id&&l.role===payload.role&&l.active))throw Error(tr('Bu kişinin aynı dairede güncel rolü var.'));
   d.links.push({id:randomId(),unit_id:unit.id,person_id:person.id,role:payload.role,active:false,archived_at:new Date().toISOString(),archive_reason:'historical_import',starts_on:payload.starts_on||null,ends_on:payload.ends_on||null,revision:1});render();return {ok:true};
  }
  const attempt=epoch,result=await api.rpc('ay3_add_historical_assignment',{p_site:state.data.site.id,p_payload:payload});if(attempt!==epoch)throw Error(tr('Oturum değişti.'));
  try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}return result;
 }
 if(state.mode==='demo'){const r=demoCommand(state.data,action,payload);state.data.transactions.sort((a,b)=>b.date.localeCompare(a.date));refreshDebts(state.data);render();return r;}
 const attempt=epoch,result=await api.command(state.data.site.id,action,payload);if(action==='announcement'&&payload.published===true){void sendImportantPush(result,payload).catch(error=>console.warn('Push dispatch:',error.message));}if(attempt!==epoch)throw Error(tr("Oturum değişti."));
 try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
 return result;
}
function permissionFor(action){return ['entry','classify_entry','bind_charge','budget','monthly_exception','disable_exception','reverse','unallocate','void_charge','void_credit','user_access','staff_remove','person_lifecycle','person_restore','settings','permissions','publish_report'].includes(action)?'admin':['assignment_add','assignment_edit','assignment_remove','assignment_restore','person','person_link','link','edit_link','occupancy','end_link','unlink','switch_tenant','provider','provider_category','provider_note'].includes(action)?'people':action==='announcement'?'announcements':action==='import'?'import':'finance';}
function showForm(action,args={}){
 if(isAccessPreview())throw Error(tr(nativePreviewRole(state.fullData)==='super'?'Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.':'Önizlemede değişiklik yapılamaz. Yönetim görünümüne dönün.'));
 if(writeBusy)throw Error(tr("Önce devam eden işlemin tamamlanmasını bekleyin."));
 if(!(['batch_charge','monthly_v5'].includes(action)&&state.data.taskCapabilities?.charges_prepare)&&!can(state,permissionFor(action)))throw Error(tr("Bu işlem için yetkiniz yok."));
 if(!mayUseTaskAction(state.data,action))throw Error(tr('Bu işlem için yetkiniz yok.'));
 const origin=$('detailDialog').open?detailView:null;
 const built=buildForm(state,action,{period:state.period,...args});
 if($('detailDialog').open)$('detailDialog').close();
 formAction={action,args,context:built.context,origin};$('actionFields').dataset.financeAction=financeActions.includes(action)?action:'';
 $('actionTitle').textContent=built.title;$('actionFields').innerHTML=(['batch_charge','monthly_v5'].includes(action)?'<p class="info-strip">'+((getLanguage()==='tr'?('Taslak gönderilir. Borçlar yalnızca Süper Admin onayıyla oluşur.'):(uiText("Sie reichen einen Entwurf ein. Erst die Superadmin-Freigabe erzeugt Forderungen.",getLanguage()))))+'</p>':'')+built.body;$('actionMessage').textContent='';$('actionMessage').classList.remove('error');$('saveAction').textContent=action==='person_lifecycle'?((getLanguage()==='tr'?('İşlemi onayla'):(uiText("Aktion bestätigen",getLanguage())))):action==='person_restore'?((getLanguage()==='tr'?('Arşivden çıkar'):(uiText("Wiederherstellen",getLanguage())))):tr(action==='staff_remove'?'Üyeyi kaldır':action==='assignment_remove'?'Kaldırmayı onayla':action==='assignment_restore'?'Geri getir':'Kaydet');if(['batch_charge','monthly_v5'].includes(action))$('saveAction').textContent=(getLanguage()==='tr'?('Taslağı gönder'):(uiText("Entwurf einreichen",getLanguage())));$('actionDialog').showModal();updateConditionalForm();if(action==='provider')updateProviderCategorySelection();if(financeActions.includes(action))updateFinanceForm($('actionFields'),state.data);updateAnnouncementTargets();
}
function exportOptions(){return {language:getLanguage(),demo:state.mode==='demo'||isAccessPreview(),canFinance:can(state,'finance')};}
function reportExportModel(){const range=selectedRange(state,'report'),error=rangeError(range);if(error)throw Error(error);return summaryExport(state.data,financialSeries(state.data,range,state.reportGroup||'year'),{...exportOptions(),range});}
function bankExportModel(){return bankExport(filteredTransactions(state),exportOptions());}
function addExportControls(){
 if(state.mode==='signedout')return;
 if(state.mode==='connected'&&!isAccessPreview()){const b=$('content').querySelector('[data-action=budget]');if(b){b.textContent=(getLanguage()==='tr'?('Bütçe ve nakit planı'):(uiText("Budget & Liquidität",getLanguage())));const p=b.closest('section')?.querySelector('p');if(p)p.textContent=(getLanguage()==='tr'?('Güncel ayrıntılı planı ve nakit öngörüsünü bütçe planında görebilirsiniz.'):(uiText("Den aktuellen Detailplan und die Liquiditätsvorschau findest du in der Budgetplanung.",getLanguage())));}else if(state.page==='dues'&&can(state,'finance'))$('content').insertAdjacentHTML('beforeend','<section class="card">'+button((getLanguage()==='tr'?('Bütçe ve nakit planı'):(uiText("Budget & Liquidität",getLanguage()))),'budget_plan')+'</section>');}
 if(state.page==='dues'&&state.mode==='connected'&&!isAccessPreview())$('content').insertAdjacentHTML('beforeend','<section class="card">'+button((getLanguage()==='tr'?('Ek ödeme taslaklarını gör'):(uiText("Sonderumlagenentwürfe ansehen",getLanguage()))),'levy_owner')+(can(state,'admin')?button((getLanguage()==='tr'?('Ek ödemeleri incele'):(uiText("Sonderumlagen prüfen",getLanguage()))),'levy_manage'):'')+'</section>');
 for(const b of $('content').querySelectorAll('[data-draft-decision=approve]'))if(state.data.chargeDrafts?.find(d=>d.id===b.dataset.id)?.payload?.debt_group==='capital')b.textContent=(getLanguage()==='tr'?('Karar incelemesini aç'):(uiText("Beschlussprüfung öffnen",getLanguage())));
 if(state.page==='reports'&&(can(state,'finance')||state.data.communityAccess===true)){
  if(state.mode==='connected'&&!isAccessPreview())$('content').insertAdjacentHTML('beforeend','<section class="card">'+button((getLanguage()==='tr'?('Site üyelerine paylaşılan özetler'):(uiText("Freigegebene Gemeinschaftsübersichten",getLanguage()))),'community_releases')+(can(state,'admin')?button((getLanguage()==='tr'?('Toplam paylaşımlarını yönet'):(uiText("Summenfreigaben verwalten",getLanguage()))),'report_releases'):'')+'</section>');
  if(state.mode==='connected'&&!isAccessPreview()&&can(state,'admin'))$('content').insertAdjacentHTML('beforeend','<section class="card">'+button((getLanguage()==='tr'?('Ay / yıl kapanışını kontrol et'):(uiText("Monats- / Jahresabschluss prüfen",getLanguage()))),'period_closings')+'</section>');
  const print=$('content').querySelector('[data-action="print"]');if(print)print.dataset.action='export_report_pdf';
  const csv=$('content').querySelector('[data-action="export_report"]');if(csv)csv.insertAdjacentHTML('afterend',button((getLanguage()==='tr'?('Excel indir'):(uiText("Excel herunterladen",getLanguage()))),'export_report_xlsx'));
 }
 if(state.page==='transactions'&&can(state,'finance')){
  const csv=$('content').querySelector('[data-action="export_bank"]');if(csv)csv.insertAdjacentHTML('afterend',button((getLanguage()==='tr'?('Excel indir'):(uiText("Excel herunterladen",getLanguage()))),'export_bank_xlsx')+button((getLanguage()==='tr'?('Yazdır / PDF'):(uiText("Drucken / PDF",getLanguage()))),'export_bank_pdf'));
 }
}
function chargeWithReceipts(id){const html=chargeDetail(state,id);const hold=state.data.claimHoldWorkspace?.rows?.find(x=>x.charge_id===id);return html?html+(hold?.active?'<p class="info-strip">'+((getLanguage()==='tr'?('İncelemede: otomatik ödeme hatırlatmaları duraklatıldı. Asıl borç korunur.'):(uiText("In Prüfung: automatische Zahlungshinweise pausiert. Die ursprüngliche Forderung bleibt bestehen.",getLanguage()))))+'</p>':'')+(state.mode==='connected'&&!isAccessPreview()&&can(state,'admin')?'<button class="button" data-action="claim_hold_review" data-id="'+e(id)+'">'+((getLanguage()==='tr'?('İnceleme arasını yönet'):(uiText("Prüfpause verwalten",getLanguage()))))+'</button>':'')+receiptButtons(state.data,id,exportOptions()):null;}
function showDetail(html){
 if(!html)return;
 const dialog=$('detailDialog');$('detailContent').innerHTML=html;
 const title=$('detailTitle');if(title){title.tabIndex=-1;title.setAttribute('autofocus','');}
 if(!dialog.open)dialog.showModal();
 dialog.scrollTop=0;title?.focus({preventScroll:true});labelTables();applyAmountPrivacy();
}
// Preserve the originating person card while a linked apartment is edited.
function linkedUnitDetail(id){
 const html=unitDetail(state,id);
 if(!html)return null;
 if(!personUnitReturn)return html;
 const back=(getLanguage()==='tr'?('Kişi kartına dön'):(uiText("Zur Personenkarte",getLanguage())));
 return `<nav class="person-unit-nav" aria-label="${e(back)}"><button type="button" class="button person-unit-back" data-action="person_unit_back">← ${e(back)}</button></nav>`+html;
}
function returnFromPersonUnit(){
 if(!personUnitReturn)return false;
 const context=personUnitReturn;
 personUnitReturn=null;
 const dialog=$('detailDialog');
 dialog.classList.remove('person-unit-drawer');
 if(context.fromDialog){
  const personHtml=personManager(state,context.personId);
  if(personHtml){
   detailView={action:'person_manage',id:context.personId};
   showDetail(personHtml);
   dialog.scrollTop=context.dialogScroll;
   const ref=[...dialog.querySelectorAll('[data-action="person_unit"]')].find(node=>node.dataset.person===context.personId&&node.dataset.id===context.unitId);
   ref?.focus({preventScroll:true});
   return true;
  }
 }
 detailView=null;
 if(dialog.open)dialog.close();
 window.scrollTo({top:context.pageY,behavior:'instant'});
 const ref=[...document.querySelectorAll('[data-action="person_unit"]')].find(node=>node.dataset.person===context.personId&&node.dataset.id===context.unitId);
 ref?.focus({preventScroll:true});
 return true;
}
$('detailDialog').addEventListener('cancel',event=>{
 if(personUnitReturn&&detailView?.action==='unit'){
  event.preventDefault();
  returnFromPersonUnit();
 }
});
function staged(){
 detailView={action:'staged'};
 if(!can(state,'finance'))return;
 const rows=state.data.staged.filter(x=>!x.confirmed_charge&&!x.ignored_reason);
 showDetail(`<div class="dialog-kicker">${tr("DEVİR KONTROLÜ")}</div><h2 id="detailTitle">${tr("Eski bakiye kayıtları")}</h2><div class="muted">${info('Eski yönetimden kalan tutarları aktarmadan önce kontrol edin.','Her kayıtta daireyi, dönemi ve ödemenin yapılıp yapılmadığını kontrol edin. Aynı borcu iki kez kaydetmeyin. Yalnızca onayladığınız kayıtlar borç olarak işlenir.')}</div><div class="table-wrap"><table><thead><tr><th>${tr("Kişi / Kaynak daire")}</th><th class="numeric">${tr("Tutar")}</th><th>${tr("Kontrol")}</th><th>${tr("İşlem")}</th></tr></thead><tbody>${rows.map(r=>{const check=analyzeStage(r,state.data);return `<tr><td>${e(r.person_label)}<small class="block-small">${e(r.unit_hint||tr("Daire belirtilmedi"))} · ${r.kind==='enforcement'?tr("İcra listesi"):tr("Genel liste")}</small></td><td class="numeric">${money(Number(r.cents))}</td><td>${check.suggestedCode?e(check.suggestedCode)+' · '+(check.basis==='document'?tr("Belgede"):tr("Banka önerisi")):tr("Blok teyidi gerekli")}${check.paymentCandidates.length?`<small class="block-small error">${tr("Sonraki tahsilatı inceleyin")}</small>`:''}${check.overlaps.length?`<small class="block-small error">${tr("Başka devir kaydı da var")}</small>`:''}</td><td>${button(tr("Teyit et"),'confirm_staged',`data-id="${e(r.id)}"`)}${button(tr("Hariç tut"),'ignore_staged',`data-id="${e(r.id)}"`)}</td></tr>`;}).join('')||`<tr><td colspan="4">${tr("Bekleyen devir kaydı yok.")}</td></tr>`}</tbody></table></div>`);
}
function downloadCsv(filename,rows){const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';const safe=v=>/^[=+@\-\t\r]/.test(String(v))?"'"+v:v;const csv='\uFEFF'+rows.map(r=>r.map(v=>cell(typeof v==='number'?v.toLocaleString('tr-TR',{useGrouping:false,maximumFractionDigits:2}):safe(v))).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReport(){
 const model=reportExportModel();downloadCsv('ayapark2-mali-rapor.csv',[model.columns,...model.rows.map(row=>row.map(v=>v&&typeof v==='object'?v.moneyCents/100:v))]);
}
const urgentShown=new Set();let localTest=null,localTestRead=false,popupSession='',importantLoginKeys=new Set(),popupBatch=[],localTestQueue=[],localTestReceipts=new Set();
function notificationData(){const d=state.data;return {...d,userId:d.userId||'demo-user',announcements:[...(d.announcements||[]),...(localTest&&d.role==='super'?[localTest]:[]),...(d.role==='super'?localTestQueue:[])],acknowledgements:[...(d.acknowledgements||[]),...(localTestRead&&localTest?[{announcement_id:localTest.id,revision:localTest.revision,user_id:d.userId||'demo-user'}]:[]),...localTestQueue.filter(a=>localTestReceipts.has(a.id)).map(a=>({announcement_id:a.id,revision:a.revision,user_id:d.userId||'demo-user'}))]};}
function updateNotifications(){const d=notificationData(),unread=unreadNotifications(d);$('notificationBell').hidden=state.mode==='signedout';$('notificationCount').hidden=!unread.length;$('notificationCount').textContent=unread.length>99?'99+':unread.length;$('notificationBell').setAttribute('aria-label',tr('Bildirimler')+' · '+unread.length);$('notificationsTitle').textContent=tr('Bildirimler');$('closeNotifications').textContent=tr('Kapat');if($('notificationsDialog').open)$('notificationsList').innerHTML=notificationList(d);}
function openNotification(a,{progress=''}={}){if(!a)return;if($('notificationsDialog').open)$('notificationsDialog').close();$('urgentTitle').textContent=notificationTitle(a);$('urgentBody').textContent=notificationBody(a);$('urgentMeta').textContent=a.local_test?tr('Yalnızca Süper Admin testi'):new Date(a.created_at).toLocaleDateString((getLanguage()==='tr'?('tr-TR'):(uiText("de-DE",getLanguage()))))+(a.author_label?' · '+a.author_label:'');$('ackUrgent').dataset.id=a.id;$('ackUrgent').dataset.revision=a.revision||1;$('ackUrgent').dataset.key=acknowledgementKey(a);$('ackUrgent').textContent=tr(!announcementActive(a)||isAccessPreview()?'Kapat':'Okudum');$('urgentProgress').textContent=progress;$('urgentProgress').hidden=!progress;$('urgentDialog').dataset.required=a.priority==='urgent'&&announcementActive(a)&&!isAccessPreview()?'true':'false';$('ackUrgent').dataset.expired=String(!announcementActive(a)||isAccessPreview());if(a.priority!=='urgent')urgentShown.add(acknowledgementKey(a));if(!$('urgentDialog').open)$('urgentDialog').showModal();}
function checkUrgent(){const key=state.mode+':'+(state.data.userId||'demo-user')+':'+epoch;if(key!==popupSession){popupSession=key;popupBatch=[];importantLoginKeys=new Set(unreadNotifications(notificationData()).filter(a=>a.priority==='important'&&a.popup_on_login).map(acknowledgementKey));}if(isAccessPreview()||state.mode==='signedout'||document.querySelector('dialog[open]'))return;const pending=unreadNotifications(notificationData()).filter(a=>(a.priority==='urgent'||a.priority==='important'&&a.popup_on_login&&importantLoginKeys.has(acknowledgementKey(a)))&&!urgentShown.has(acknowledgementKey(a)));if(!pending.length){popupBatch=[];return;}if(!popupBatch.length)popupBatch=pending.map(acknowledgementKey);else for(const a of pending)if(!popupBatch.includes(acknowledgementKey(a)))popupBatch.push(acknowledgementKey(a));const a=pending[0];openNotification(a,{progress:popupBatch.length>1?popupProgress(popupBatch,acknowledgementKey(a)):''});}
$('notificationBell').addEventListener('click',()=>{$('notificationsList').innerHTML=notificationList(notificationData());$('notificationsDialog').showModal();});
$('closeNotifications').addEventListener('click',()=>$('notificationsDialog').close());
$('ackUrgent').addEventListener('click',async()=>{const b=$('ackUrgent');b.disabled=true;try{if(b.dataset.expired==='true'){$('urgentDialog').close();return;}if(b.dataset.id.startsWith('local-test-notification')){if(state.data.role!=='super')throw Error(tr('Yetkiniz yok.'));if(b.dataset.id==='local-test-notification')localTestRead=true;else localTestReceipts.add(b.dataset.id);updateNotifications();}else await mutate('acknowledge',{id:b.dataset.id,revision:Number(b.dataset.revision)});urgentShown.add(b.dataset.key);$('urgentDialog').close();checkUrgent();}catch(error){toast(error.message);}finally{b.disabled=false;}});
$('urgentDialog').addEventListener('cancel',event=>{if($('urgentDialog').dataset.required==='true')event.preventDefault();});
function updateAnnouncementTargets(){const root=$('actionFields'),kind=root.querySelector('[name="target_kind"]')?.value;for(const section of root.querySelectorAll('[data-notification-target]'))section.hidden=section.dataset.notificationTarget!==kind;}

document.addEventListener('click',async event=>{
 if(event.target.closest('a.skip[href="#content"]')){event.preventDefault();$('content').focus({preventScroll:true});$('content').scrollIntoView({block:'start'});return;}
 if(mobileNavGroup!==null&&!event.target.closest('#nav')){mobileNavGroup=null;renderNavigation();}
 // The normal close button also returns to the person card when an apartment was opened from there.
 if(event.target.closest('#detailDialog > .dialog-actions button')&&personUnitReturn&&detailView?.action==='unit'){
  event.preventDefault();
  returnFromPersonUnit();
  return;
 }
 if(event.target.closest('.unit-history-link')){event.preventDefault();if($('unitPaymentHistory')){$('unitPaymentHistory').open=true;$('unitPaymentHistory').scrollIntoView({block:'start'});$('unitPaymentHistory').focus({preventScroll:true});}return;}
 if(event.target.closest('[data-preview-return]')){changePreviewRole(nativePreviewRole(state.fullData));return;}
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
  applyApartmentQuickFilters();
  return;
 }
 const tab=event.target.closest('[data-tab]');if(tab){const history=tab.dataset.tab==='history';$('unitCurrent').hidden=history;$('unitHistory').hidden=!history;for(const node of document.querySelectorAll('[data-tab]'))node.setAttribute('aria-pressed',String(node===tab));return;}
 const changeChart=event.target.closest('[data-finance-chart-view]');
 if(changeChart){
  const view=changeChart.dataset.financeChartView;
  if(!['donut','bar','line'].includes(view))return;
  state.financeChartView=view;
  const current=$('incomeExpenseViz');
  if(current){
   const d=state.data,range=selectedRange(state,'report');
   const summary=financialSeries({...d,summaryDays:d.summaryDays||buildSummaryDays(d)},range,state.reportGroup||'year');
   current.outerHTML=incomeExpenseChart(state,summary);
   document.querySelector('[data-finance-chart-view="'+view+'"]')?.focus({preventScroll:true});
  }
  return;
 }
 const yr=event.target.closest('[data-year]');if(yr){state.reportFilter={preset:'custom',from:yr.dataset.year+'-01-01',to:yr.dataset.year+'-12-31'};state.reportGroup='month';render();return;}
 const hiddenAmount=event.target.closest('.amount-private');if(hiddenAmount){hiddenAmount.classList.remove('amount-private');hiddenAmount.removeAttribute('aria-label');return;}
 const testButton=event.target.closest('[data-notification-test]');
 if(testButton){if(state.data.role!=='super'||isAccessPreview())return;const action=testButton.dataset.notificationTest;
  if(action==='disable'){localTest=null;localTestRead=false;localTestQueue=[];localTestReceipts.clear();popupBatch=[];if($('urgentDialog').open&&$('ackUrgent').dataset.id.startsWith('local-test-notification'))$('urgentDialog').close();}
  else if(action==='show_many'){localTest=null;localTestRead=false;localTestReceipts.clear();popupBatch=[];localTestQueue=[1,2,3].map(n=>({...testAnnouncement(),id:'local-test-notification-'+n,title:'AYAPARK 2 – Test '+n,title_de:'AYAPARK 2 – Test '+n}));for(const a of localTestQueue){importantLoginKeys.add(acknowledgementKey(a));urgentShown.delete(acknowledgementKey(a));}checkUrgent();}
  else{localTestQueue=[];localTestReceipts.clear();localTest??=testAnnouncement();if(action==='reset')localTestRead=false;if(action==='show'||action==='reopen')openNotification(localTest);if(action==='reset')urgentShown.delete(acknowledgementKey(localTest));}
  updateNotifications();if($('notificationTestStatus'))$('notificationTestStatus').textContent=tr(action==='disable'?'Test devre dışı.':'Test hazır. Gerçek bildirim gönderilmedi.');return;
 }
 const testDelete=event.target.closest('[data-action="delete_test_notification"]');if(testDelete){if(state.data.role!=='super')return;const id=testDelete.dataset.id;if(id==='local-test-notification'){localTest=null;localTestRead=false;}else{localTestQueue=localTestQueue.filter(x=>x.id!==id);localTestReceipts.delete(id);}updateNotifications();return;}
 const notice=event.target.closest('[data-notification]');if(notice){openNotification(notificationCenter(notificationData()).find(a=>a.id===notice.dataset.notification));return;}
 const previewButton=event.target.closest('[data-finance-preview]');
 if(previewButton&&formAction){try{previewButton.disabled=true;const {action,context}=formAction,payload=financePayload(action,new FormData($('actionForm')),context,{previewing:true});const value=action==='auto_allocate'&&state.mode==='connected'?await api.rpc('ay5_payment_plan',{p_site:state.data.site.id,p_payload:payload}):localFinancePreview(state.data,action,payload);context.preview=value;context.previewSignature=JSON.stringify(payload);$('financePreview').innerHTML=financePreviewMarkup(state.data,action,value);labelTables();$('actionMessage').textContent='';}catch(error){$('actionMessage').textContent=tr(error.message);}finally{previewButton.disabled=false;}return;}
 const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 try{
  if(action==='claims_detail'){if(state.data.role!=='resident'||state.data.communityAccess===false)return;detailView={action};return showDetail(residentClaimsDetail(state));}
  if(action==='audit_page'){if(can(state,'admin'))await loadAuditPage(Number(b.dataset.page));return;}
  if(action==='review_selected'){await reviewSelected();return;}
  if(action==='recover_person'){adminRecoveryUi.open(b.dataset.id);return;}
  if(action==='invite_person'){invitationUi.open(b.dataset.id);return;}
  if(action==='invite_activate'){invitationUi.activate();return;}
  if(action==='delete_announcement'){
   if(state.mode!=='connected'||!can(state,'admin')||isAccessPreview())return;
   const item=state.data.announcements.find(x=>x.id===b.dataset.id);if(!item)return;
   const msg=(getLanguage()==='tr'?'Duyuru kalıcı olarak silinsin mi? Okundu kayıtları da silinir.':getLanguage()==='en'?'Permanently delete this announcement and its read receipts?':'Diese Mitteilung samt Lesebestätigungen endgültig löschen?')+'\n\n'+item.title;
   if(!window.confirm(msg))return;
   if($('actionDialog').open)$('actionDialog').close();
   b.disabled=true;try{await api.rpc('ay11_delete_announcement',{p_site:state.data.site.id,p_announcement:item.id});await reload();toast(getLanguage()==='tr'?'Duyuru silindi.':getLanguage()==='en'?'Announcement deleted.':'Mitteilung gelöscht.');}catch(error){b.disabled=false;toast(error.message||'Silme işlemi başarısız.');}return;
  }
  if(action==='person_unit_back'){returnFromPersonUnit();return;}
  if(action==='person_unit'){
   if(!can(state,'people'))return;
   const id=b.dataset.id,personId=b.dataset.person;
   if(!state.data.links.some(l=>l.person_id===personId&&l.unit_id===id))return;
   const html=unitDetail(state,id);
   if(!html)return;
   const fromDialog=$('detailDialog').open&&detailView?.action==='person_manage'&&detailView.id===personId;
   personUnitReturn={personId,unitId:id,fromDialog,dialogScroll:fromDialog?$('detailDialog').scrollTop:0,pageY:window.scrollY};
   detailView={action:'unit',id};
   $('detailDialog').classList.add('person-unit-drawer');
   return showDetail(linkedUnitDetail(id));
  }
  if(action==='person_login_logs'){if(state.mode!=='connected'||!can(state,'admin'))return;const p=state.data.persons.find(x=>x.id===b.dataset.id);if(!p)return;showDetail('<h2 id="detailTitle">'+e(p.full_name)+'</h2><p role="status">Protokolle werden geladen…</p>');try{const result=await api.rpc('ay8_person_login_logs',{p_person:p.id,p_limit:500});const fmt=t=>t?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(t)):'—';const rows=Array.isArray(result?.events)?result.events:[];const logins=rows.filter(x=>x.kind==='Anmeldung');const recent=logins.filter(x=>x.occurred_at&&Date.now()-new Date(x.occurred_at).getTime()<30*86400000);showDetail('<h2 id="detailTitle">'+e(p.full_name)+'</h2><p>Letzter Login: '+e(fmt(result?.last_login))+'</p><p>Dokumentierte Sitzungsstarts: '+logins.length+' · Davon letzte 30 Tage: '+recent.length+'</p><p class="fine">Zeiten: Türkiye · Vorhandene historische Logs · Sitzungsende nur bei verlässlichem Ereignis</p><div class="person-login-events">'+(rows.map(x=>'<article class="person-login-event"><small>'+e(fmt(x.occurred_at))+' · '+e(x.kind||'Ereignis')+'</small><p>'+e(x.details||'—')+'</p></article>').join('')||'<p>Keine bisherigen Ereignisse vorhanden.</p>')+'</div>');}catch(error){showDetail('<h2 id="detailTitle">'+e(p.full_name)+'</h2><p role="alert">'+e(error.message||'Protokolle nicht verfügbar')+'</p>');}return;}
  if(action==='person_manage'){personUnitReturn=null;$('detailDialog').classList.remove('person-unit-drawer');detailView={action,id:b.dataset.id};return showDetail(personManager(state,b.dataset.id));}
  if(action==='unit'){personUnitReturn=null;$('detailDialog').classList.remove('person-unit-drawer');detailView={action,id:b.dataset.id};return showDetail(unitDetail(state,b.dataset.id));}
  if(action==='transaction'){if(can(state,'finance')){detailView={action,id:b.dataset.id};showDetail(transactionDetail(state,b.dataset.id));}return;}
  if(action==='claim_hold_review')return await holdUI.open(b.dataset.id);
  if(action==='charge_detail'){detailView={action,id:b.dataset.id};return showDetail(chargeWithReceipts(b.dataset.id));}
  if(action==='provider_detail'){detailView={action,id:b.dataset.id};return showDetail(providerDetail(state,b.dataset.id));}
  if(action==='bank_previous'||action==='bank_next'){state.bankPage=Math.max(0,(state.bankPage||0)+(action==='bank_next'?1:-1));return render();}
  if(action==='staged')return staged();
  if(action==='review_import'){$('importDialog').close();navigate('transactions');state.filter.type='unmatched';render();return;}
  if(action==='print')return window.print();
  if((action==='budget_plan'||action==='budget')&&state.mode==='connected'&&!isAccessPreview())return await budgetUI.open();
  if(action==='management_tasks')return await tasksUI.open();
  if(action==='private_archive')return await archiveUI.open();
  if(action==='levy_manage')return await levyUI.openAdmin();
  if(action==='levy_owner')return await levyUI.openOwner();
  if(action==='report_releases')return await releaseUI.openAdmin();
  if(action==='community_releases')return await releaseUI.openCommunity();
  if(action==='period_closings')return await closingUI.open();
  if(action==='export_report')return exportReport();
  if(action==='export_report_pdf')return openExport(reportExportModel());
  if(action==='export_report_xlsx'){await downloadWorkbook(reportExportModel(),'ayapark2-mali-rapor.xlsx');return;}
  if(action==='export_bank_pdf')return openExport(bankExportModel());
  if(action==='export_bank_xlsx'){await downloadWorkbook(bankExportModel(),'ayapark2-banka.xlsx');return;}
  if(action==='export_receipt')return openExport(receiptExport(state.data,b.dataset.id,exportOptions()));
  if(action==='export_bank'){if(!can(state,'finance'))return;downloadCsv('ayapark2-banka-'+(state.mode==='demo'?'ornek':'kayitlar')+'.csv',[[tr("Tarih"),tr("Açıklama"),tr("Kategori"),tr("Tutar TL"),tr("Referans")],...filteredTransactions(state).map(t=>[t.date,t.desc,t.category,t.cents/100,t.bank_reference||t.reference||''])]);return;}
  if(action==='import'){
   if(isAccessPreview())throw Error(tr(nativePreviewRole(state.fullData)==='super'?'Önizlemede değişiklik yapılamaz. Süper Admin görünümüne dönün.':'Önizlemede değişiklik yapılamaz. Yönetim görünümüne dönün.'));
   if(!can(state,'import'))return;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");$('commitImport').disabled=true;$('importDialog').showModal();return;
  }
  const back=b.closest('#actionFields')&&formAction?{...formAction,values:[...new FormData($('actionForm'))]}:null;
  showForm(action,{id:b.dataset.id,unit:b.dataset.unit,entry:b.dataset.entry,charge:b.dataset.charge,person:b.dataset.person,kind:b.dataset.kind});if(back)formAction.back=back;
 }catch(error){toast(error.message);}
});
$('languageToggle').addEventListener('click',()=>{
 const controls=Array.from($('actionFields').querySelectorAll('input,select,textarea')).map(node=>({name:node.name,value:node.value,checked:node.checked}));
 changePreference('language',nextLanguage(getLanguage()),state.mode==='connected'?api:null);applyStaticLanguage();render();document.dispatchEvent(new Event('ay2:languagechange'));
 if($('detailDialog').open&&detailView){
  if(detailView.action==='staged')staged();
  else showDetail(detailView.action==='claims_detail'?residentClaimsDetail(state):detailView.action==='person_manage'?personManager(state,detailView.id):detailView.action==='unit'?linkedUnitDetail(detailView.id):detailView.action==='charge_detail'?chargeWithReceipts(detailView.id):detailView.action==='provider_detail'?providerDetail(state,detailView.id):transactionDetail(state,detailView.id));
 }
 if($('actionDialog').open&&formAction){
  const built=buildForm(state,formAction.action,{period:state.period,...formAction.args});
  $('actionTitle').textContent=built.title;$('actionFields').innerHTML=(['batch_charge','monthly_v5'].includes(formAction.action)?'<p class="info-strip">'+((getLanguage()==='tr'?('Taslak gönderilir. Borçlar yalnızca Süper Admin onayıyla oluşur.'):(uiText("Sie reichen einen Entwurf ein. Erst die Superadmin-Freigabe erzeugt Forderungen.",getLanguage()))))+'</p>':'')+built.body;
  if(formAction.action.startsWith('assignment_'))updateAssignmentForm($('actionFields'),state.data);
  for(const saved of controls){const node=$('actionFields').querySelector(`[name="${saved.name}"]`);if(node){node.value=saved.value;if(node.type==='checkbox')node.checked=saved.checked;}}
 }
 updateConditionalForm();document.dispatchEvent(new Event('ay2:languagechange'));
});
window.addEventListener('hashchange',()=>{if(location.hash==='#content'){$('content').focus();history.replaceState(null,'','#'+state.page);return;}navigate(location.hash.slice(1));});
function changePreviewRole(role,selection){if(writeBusy||loginBusy||!mayPreview(state.fullData)||!allowedPreviewRoles(state.fullData).includes(role))return;closeDialogs();state.viewRole=role;if(selection!==undefined)state.previewSelection=selection;else if(role==='resident')state.previewSelection=residentPreviewOptions(state.fullData)[0]?.id||'';state.page='overview';state.filter={q:'',block:'all',status:'all',type:'all',period:'all',preset:'all',from:'',to:''};state.reportFilter={preset:'all'};render(true);}
$('roleSelect').addEventListener('change',event=>changePreviewRole(event.target.value));
$('residentPreviewSelect').addEventListener('change',event=>changePreviewRole('resident',event.target.value));
document.addEventListener('input',event=>{
 clearFieldError(event.target);
 const picker=event.target.closest('.person-picker');if(picker){clearFieldError(picker.querySelector('[name=person_id]'));clearFieldError(picker.querySelector('button'));}
 if(formAction?.action.startsWith('assignment_')&&event.target.closest('#actionFields')){if(event.target.name==='person_search')updateConditionalForm('person_search');$('actionMessage').textContent='';}
 if(event.target.id==='unitSearch'){state.filter.q=event.target.value;$('unitResults').innerHTML=unitResults(state);labelTables();applyAmountPrivacy();$('resultCount').textContent=filteredUnits(state).length+tr(" daire");}
 if(event.target.id==='peopleSearch'){clearTimeout(peopleSearchTimer);const input=event.target,value=input.value,attempt=epoch;peopleSearchTimer=setTimeout(()=>{if(state.page!=='persons'||attempt!==epoch||!input.isConnected)return;state.peopleQuery=value;render();},160);return;}

 if(event.target.id==='providerSearch'){state.providerQuery=event.target.value;render();}
 if(event.target.id==='txnSearch'){state.filter.q=event.target.value;state.bankPage=0;$('transactionResults').innerHTML=transactionTable(state);labelTables();applyAmountPrivacy();}
});
document.addEventListener('change',event=>{
 clearFieldError(event.target);
 const picker=event.target.closest('.person-picker');if(picker){clearFieldError(picker.querySelector('[name=person_id]'));clearFieldError(picker.querySelector('button'));}
 const id=event.target.id;if(id==='previewRoleSelect'){changePreviewRole(event.target.value);return;}if(id==='previewPersonSelect'){changePreviewRole('resident',event.target.value);return;}
 if(event.target.closest('#actionFields')){if(financeActions.includes(formAction?.action)){if(event.target.name!=='confirmed'){delete formAction.context.previewSignature;if($('financePreview'))$('financePreview').textContent='';const confirm=$('actionFields').querySelector('[name=confirmed]');if(confirm)confirm.checked=false;}updateFinanceForm($('actionFields'),state.data,event.target.name);}updateAnnouncementTargets();}
 if((formAction?.action.startsWith('assignment_')||formAction?.action==='user_access')&&event.target.closest('#actionFields'))updateConditionalForm(event.target.name);
 if(formAction?.action==='provider_category'&&event.target.name==='operation'&&event.target.closest('#actionFields'))updateConditionalForm();
 if(formAction?.action==='provider'&&event.target.name==='categories'&&event.target.closest('#actionFields'))updateProviderCategorySelection();
 if(event.target.name==='category'||event.target.name==='relation'||event.target.name==='person_id'||event.target.name==='start_unknown')updateConditionalForm();
 if(['statusFilter','txnFilter','periodFilter'].includes(id)){
  const key={statusFilter:'status',txnFilter:'type',periodFilter:'period'}[id];state.filter[key]=event.target.value;state.bankPage=0;
  if(id==='statusFilter'){applyApartmentQuickFilters();}else {$('transactionResults').innerHTML=transactionTable(state);labelTables();applyAmountPrivacy();}
 }
 if(event.target.dataset.range){const kind=event.target.dataset.range,f=kind==='report'?state.reportFilter:state.filter;f[event.target.dataset.rangeField]=event.target.value;state.bankPage=0;render();return;}
 if(id==='reportGroup'){state.reportGroup=event.target.value;render();}
 if(id==='reportYear'){state.reportFilter=event.target.value==='all'?{preset:'all'}:{preset:'custom',from:event.target.value+'-01-01',to:event.target.value+'-12-31'};state.reportGroup=event.target.value==='all'?'year':'month';render();}
 if(id==='expenseDistributionYear'){
  state.expenseDistributionYear=event.target.value;
  const panel=$('expenseDistributionPanel');
  if(panel){panel.outerHTML=expenseDistributionPanel(state,selectedRange(state,'report'));$('expenseDistributionYear')?.focus({preventScroll:true});}
  return;
 }
 if(id==='peopleFilter'){state.peopleFilter=event.target.value;render();}
 if(id==='providerCategory'){state.providerCategory=event.target.value;render();}
 if(id==='reportPeriod'&&/^\d{4}-\d{2}$/.test(event.target.value)){state.period=event.target.value;render();}
});
// Lightweight native SVG inspection, shared between chart types and touch/keyboard.
// Inspectors display existing values only; no network, data update or analytics events.
function inspectFinanceChart(element){
 const target=element?.closest?.('[data-chart-label]');
 if(!target)return;
 const root=target.closest('[data-chart-root]');
 const inspector=root?.querySelector('.fch-inspector');
 if(!inspector)return;
 const label=inspector.querySelector('[data-inspector-label]');
 const value=inspector.querySelector('[data-inspector-value]');
 const extra=inspector.querySelector('[data-inspector-extra]');
 if(label)label.textContent=target.dataset.chartLabel||'';
 if(value)value.textContent=target.dataset.chartValue||'';
 if(extra)extra.textContent=target.dataset.chartPercent||'';
 for(const el of root.querySelectorAll('.fch-selected'))el.classList.remove('fch-selected');
 target.classList.add('fch-selected');
 const selected=target.dataset.chartLabel;
 for(const el of root.querySelectorAll('.fch-donut-arc'))if(el.dataset.chartLabel===selected)el.classList.add('fch-selected');
}
function resetFinanceChart(element){
 const root=element?.closest?.('[data-chart-root]');
 if(!root)return;
 if(root.contains(document.activeElement))return;
 for(const el of root.querySelectorAll('.fch-selected'))el.classList.remove('fch-selected');
 const inspector=root.querySelector('.fch-inspector');
 if(!inspector)return;
 const label=inspector.querySelector('[data-inspector-label]');
 const value=inspector.querySelector('[data-inspector-value]');
 const extra=inspector.querySelector('[data-inspector-extra]');
 if(label)label.textContent=inspector.dataset.defaultLabel||'';
 if(value)value.textContent=inspector.dataset.defaultValue||'—';
 if(extra)extra.textContent=inspector.dataset.defaultExtra||'';
}
document.addEventListener('pointerover',ev=>{inspectFinanceChart(ev.target);});
document.addEventListener('focusin',ev=>{inspectFinanceChart(ev.target);});
document.addEventListener('pointerout',ev=>{if(!ev.relatedTarget?.closest?.('[data-chart-label]'))resetFinanceChart(ev.target);});
document.addEventListener('focusout',ev=>{if(!ev.relatedTarget?.closest?.('[data-chart-label]'))resetFinanceChart(ev.target);});
function restoreParentForm(back){showForm(back.action,back.args);for(const node of $('actionFields').querySelectorAll('[name]')){const values=back.values.filter(([k])=>k===node.name).map(([,v])=>v);if(node.type==='checkbox'||node.type==='radio')node.checked=values.includes(node.value);else if(values.length)node.value=values[0];}updateFinanceForm($('actionFields'),state.data,'restored');}
function cancelActionForm(){if(writeBusy)return;const back=formAction?.back;$('actionDialog').close();if(back){restoreParentForm(back);return;}const origin=formAction?.origin;if(origin?.action==='unit')showDetail(linkedUnitDetail(origin.id));else if(origin?.action==='person_manage')showDetail(personManager(state,origin.id));}
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
  if(attempt!==epoch)return;const back=formAction.back;writeBusy=false;$('actionDialog').close();if(back)restoreParentForm(back);if(!state.stale&&formAction.origin){const origin=formAction.origin;if(origin.action==='unit')showDetail(linkedUnitDetail(origin.id));else if(origin.action==='person_manage')showDetail(personManager(state,origin.id));}toast(state.stale?tr("Kaydedildi; görünüm yenilenemedi. Sayfayı yeniden açın."):state.mode==='demo'?tr("Örnek çalışma alanında kaydedildi."):tr("Kayıt tamamlandı."));
 }catch(error){if(attempt===epoch){error.message=tr(error.message);showFormError($('actionForm'),$('actionMessage'),error);}}
 finally{stopLoading();writeBusy=false;$('saveAction').disabled=false;$('cancelAction').disabled=false;}
});
document.addEventListener('ay2:themechanged',event=>changePreference('theme',event.detail,state.mode==='connected'?api:null));
$('connectionButton').addEventListener('click',async()=>{
 if(state.mode!=='connected'){$('loginMessage').textContent='';$('loginDialog').showModal();return;}
 endPreferenceSession();urgentShown.clear();popupSession='';importantLoginKeys.clear();localTest=null;localTestRead=false;localTestQueue=[];localTestReceipts.clear();popupBatch=[];epoch++;closeDialogs();state.mode='signedout';state.data=prepareV5Demo(fullDemo());state.stale=false;navigate('overview');
 try{await api.logout();toast(tr("Oturum kapatıldı."));}catch{toast(tr("Bu sekmedeki oturum temizlendi; sunucu çıkışı doğrulanamadı."));}
});
let pendingSetupLoaded=null;
$('cancelLogin').addEventListener('click',()=>$('loginDialog').close());
function completeSignIn(loaded){
 state.viewRole=nativePreviewRole(loaded)||'resident';state.previewSelection='';state.fullData=null;
  state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.mode='connected';state.stale=false;recordAppEvent('app_open');state.personLogins={};void loadPersonLogins();void loadPushStatuses();
 browserAlerts.scheduleReminder();
 void privacyGate.check();
 state.period=loaded.transactions.map(t=>t.date.slice(0,7)).sort().at(-1)||new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}).slice(0,7);
 // Closing a completed login must not trigger the pending-login cancellation handler.
 loginBusy=false;pendingSetupLoaded=null;$('loginSubmit').disabled=false;
 if($('loginDialog').open)$('loginDialog').close();
 if(typeof invitationUi!=='undefined')invitationUi.clearUrl();$('loginForm').reset();navigate('overview');if(typeof accessRequestUi!=='undefined')void accessRequestUi.load();void syncPreferences(api,()=>{applyStaticLanguage();render();document.dispatchEvent(new Event('ay2:languagechange'));});
}

$('loginDialog').addEventListener('close',()=>{
 hideLoginPassword();$('password').value='';$('setupPassword').value='';$('setupPasswordConfirm').value='';
 if(loginBusy||pendingSetupLoaded){epoch++;pendingSetupLoaded=null;void api.logout().catch(()=>{});loginBusy=false;$('loginSubmit').disabled=false;}
 selectLogin('password');
});

// Dynamic labels cannot use captured static text nodes after textContent replaces them.
// Refresh only wording: changing language must preserve input and verification state.
function updateLoginLanguage(){
 const setup=loginMethod==='setup',verified=loginMethod==='setup_password';
 $('loginTitle').textContent=tr(setup||verified?'Şifre oluştur':'Sitenize hoş geldiniz.');
 $('loginIdentifierLabel').textContent=tr(loginMethod==='password'?'Telefon veya e-posta':'E-posta');
 $('codeHelp').textContent=tr(setup?'Şifre oluşturmak için e-postadaki kodu buraya gir. E-postadaki bağlantıyı açma.':'E-postadaki kodu girin veya giriş bağlantısını açın. Yeni kullanıcı erişimini yönetim tanımlar.');
 $('loginSubmit').textContent=tr(verified?'Şifreyi kaydet':setup?'Devam et':'Giriş yap');
}
function selectLogin(method){
 loginMethod=method;const code=method==='code'||method==='setup';
 $('loginMethodChooser').hidden=method==='setup';$('loginEmailField').hidden=false;$('email').required=true;$('email').type=code?'email':'text';
 $('passwordFields').hidden=method!=='password';$('codeFields').hidden=!code;$('setupPasswordFields').hidden=true;
 $('password').required=method==='password';$('loginCode').required=code;
 $('setupPassword').required=false;$('setupPasswordConfirm').required=false;
 $('usePassword').setAttribute('aria-pressed',String(method==='password'));
 $('useCode').setAttribute('aria-pressed',String(code));
 updateLoginLanguage();
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
selectLogin('password');

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
function applyBankImportLabels(){
 $('bankFileIntro').textContent=(getLanguage()==='tr'?('Dosya bu cihazda okunur. Kayıt oluşturmak için ayrıca “İçe aktar” düğmesine basın.'):(uiText("Die Datei wird auf diesem Gerät gelesen. Erst „Importieren“ erstellt Einträge.",getLanguage())));
 $('bankFormatHint').textContent=(getLanguage()==='tr'?('Desteklenen PDF veya XLSX dosyasını doğrudan seçebilirsiniz. Diğer biçimler için CSV şablonunu kullanın. Ödeme eşleştirmelerini ayrıca kontrol edin.'):(uiText("Unterstützte PDF- oder XLSX-Dateien direkt auswählen. Für andere Formate die CSV-Vorlage verwenden. Zahlungszuordnungen anschließend getrennt prüfen.",getLanguage())));
 $('bankFileLabel').textContent=(getLanguage()==='tr'?('CSV, PDF veya XLSX dosyası seçin'):(uiText("CSV-, PDF- oder XLSX-Datei auswählen",getLanguage())));
 $('bankFileHelp').textContent=(getLanguage()==='tr'?('En fazla 2 MB / 2.000 hareket. PDF: desteklenen Yapı Kredi metin dökümleri; Excel: şablon sütunları.'):(uiText("Maximal 2 MB / 2.000 Bewegungen. PDF: unterstützte Yapı-Kredi-Textauszüge; Excel: Vorlagenspalten.",getLanguage())));
 $('importTitle').textContent=(getLanguage()==='tr'?('Banka dosyasını kontrol et ve aktar'):(uiText("Bankdatei prüfen und importieren",getLanguage())));
}
document.addEventListener('ay2:languagechange',applyBankImportLabels);
async function previewImportFile(options={}){
 const generation=++fileGeneration,file=$('csvFile').files[0];importController?.abort();importController=new AbortController();importPayload=null;$('commitImport').disabled=true;if(!file)return;
 try{
  $('importPreview').textContent=(getLanguage()==='tr'?('Dosya yerel olarak okunuyor …'):(uiText("Datei wird lokal gelesen …",getLanguage())));
  const loaded=await readBankFile(file,{...options,signal:importController.signal,onProgress:(page,total)=>{if(generation===fileGeneration)$('importPreview').textContent=((getLanguage()==='tr'?('PDF sayfası '):(uiText("PDF-Seite ",getLanguage()))))+page+' / '+total;}});if(generation!==fileGeneration)return;
  if(loaded.sheets){$('importPreview').innerHTML=`<label class="field">${(getLanguage()==='tr'?('Çalışma sayfası seçin – yalnızca seçilen sayfa aktarılır'):(uiText("Tabellenblatt auswählen – es wird nur dieses Blatt importiert",getLanguage())))}<select id="bankSheetSelect"><option value="">${(getLanguage()==='tr'?('Lütfen seçin'):(uiText("Bitte auswählen",getLanguage())))}</option>${loaded.sheets.map(name=>`<option value="${e(name)}">${e(name)}</option>`).join('')}</select></label>`;$('bankSheetSelect').addEventListener('change',event=>{if(event.target.value)void previewImportFile({sheet:event.target.value});});return;}
  const raw=loaded.raw;
  const parsed=parseCsv(raw);const sourceReview=reviewImport(parsed.entries);if(!sourceReview.mayImport)throw Error((getLanguage()==='tr'?('Ara bakiyeler hareketlerle uyuşmuyor. Kaynak dosyadaki tutarları, ücretleri ve sıralamayı kontrol edin. Hiçbir kayıt aktarılmadı.'):(uiText("Die laufenden Salden passen nicht zu den Bewegungen. Bitte prüfe Beträge, Gebühren und Reihenfolge der Quelldatei. Es wurde nichts importiert.",getLanguage()))));const digest=loaded.digest||await sha256(raw);if(generation!==fileGeneration)return;
  importPayload={source:file.name,digest,entries:parsed.entries.map(t=>({date:t.date,desc:t.desc,cents:t.cents,category:'Diğer',reference:t.reference||'',balance_cents:t.balance_cents,counterparty:t.counterparty||'',iban:t.iban||'',unit_hint:t.unit_hint||''}))};
  $('importPreview').innerHTML=`${loaded.metadata?.format==='pdf'?`<p>PDF · ${loaded.metadata.pages} ${(getLanguage()==='tr'?('sayfa okundu'):(uiText("Seiten gelesen",getLanguage())))}${loaded.metadata.identifiersRemoved?' · '+((getLanguage()==='tr'?('işaretli kimlik/vergi numaraları çıkarıldı'):(uiText("markierte Identitäts-/Steuernummern entfernt",getLanguage())))):''}</p>`:loaded.metadata?.sheet?`<p>${(getLanguage()==='tr'?('Çalışma sayfası'):(uiText("Tabellenblatt",getLanguage())))}: ${e(loaded.metadata.sheet)}</p>`:''}<strong>${parsed.entries.length}${tr(" satır · ")}${parsed.duplicates}${tr(" dosya içi olası tekrar")}</strong><p role="status">${(getLanguage()==='tr'?(sourceReview.status==='consistent'?'Ara bakiyeler hareketlerle uyumlu.':sourceReview.status==='partial'?'Mevcut ara bakiyeler uyumlu; bazı bakiye bilgileri eksik.':'Bakiye kontrolü yapılamıyor: en az iki ara bakiye gerekli.'):(sourceReview.status==='consistent'?uiText("Laufende Salden stimmen überein.",getLanguage()):sourceReview.status==='partial'?uiText("Vorhandene Salden stimmen überein; Saldoangaben fehlen teilweise.",getLanguage()):uiText("Kein Saldoabgleich möglich: mindestens zwei laufende Salden werden benötigt.",getLanguage())))}</p><p>${(getLanguage()==='tr'?('Gelir'):(uiText("Einnahmen",getLanguage())))}: ${money(sourceReview.incomeCents)} · ${(getLanguage()==='tr'?('Gider'):(uiText("Ausgaben",getLanguage())))}: ${money(sourceReview.expenseCents)} · ${(getLanguage()==='tr'?('Net'):(uiText("Netto",getLanguage())))}: ${money(sourceReview.netCents)}</p><p class="fine">${(getLanguage()==='tr'?('Açılış bakiyesi ve kaynağın eksiksizliği ayrıca kontrol edilmelidir.'):(uiText("Der Anfangssaldo und die Vollständigkeit der Quelle müssen separat geprüft werden.",getLanguage())))}</p><p class="fine">${tr("Henüz kayıt oluşturulmadı. Sunucu aynı hareketleri tekrar kaydetmez. Banka referansı bulunmayan aynı tarih/açıklama/tutarlı CSV satırları tekrar kabul edilmez; ayrı gerçek hareketler için bankanın referanslı kaydını kullanın.")}</p><div class="table-wrap"><table><caption>${tr("İlk 5 satır")}</caption><thead><tr><th>${tr("Tarih")}</th><th>${tr("Açıklama")}</th><th>${tr("Tutar")}</th></tr></thead><tbody>${parsed.entries.slice(0,5).map(t=>`<tr><td>${e(t.date)}</td><td>${e(t.desc)}</td><td>${money(t.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  $('commitImport').disabled=false;
 }catch(error){if(generation===fileGeneration&&error.name!=='AbortError')$('importPreview').textContent=error.code?bankFileMessage(error,getLanguage()):error.message;}
}
$('csvFile').addEventListener('change',()=>void previewImportFile());
$('commitImport').addEventListener('click',async()=>{
 if(!importPayload||writeBusy)return;const attempt=epoch,payload=importPayload;writeBusy=true;$('commitImport').disabled=true;
 try{const r=await mutate('import',payload);if(attempt!==epoch)return;importPayload=null;$('importPreview').textContent=`${r.inserted}${tr(" hareket kaydedildi, ")}${r.duplicates}${tr(" tekrar atlandı.")}${state.stale?tr(" Görünümü yenileyin."):''}`;$('importPreview').append(document.createElement('p'));$('importPreview').insertAdjacentHTML('beforeend',button(tr('Ödemeleri kontrol et'),'review_import'));toast(tr("Dosya kontrolü ve aktarımı tamamlandı."));}
 catch(error){if(attempt===epoch){$('importPreview').textContent=error.message;$('commitImport').disabled=false;}}
 finally{writeBusy=false;}
});
$('importDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('importDialog').addEventListener('close',()=>{importController?.abort();fileGeneration++;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");});
document.addEventListener('ay2:languagechange',updateLoginLanguage);
applyStaticLanguage();
document.documentElement.lang=getLanguage();
document.dispatchEvent(new Event('ay2:languagechange'));
if(!new URLSearchParams(location.hash.slice(1)).has('access_token')&&!new URLSearchParams(location.hash.slice(1)).has('error'))navigate(location.hash.slice(1)||'overview');

function updateProviderCategorySelection(){
 const root=$('actionFields'),output=root?.querySelector('#providerCategorySelectionCount');
 if(!output)return;
 const count=root.querySelectorAll('input[name="categories"]:checked').length;
 output.textContent=(getLanguage()==='tr'?(count+' / 8 seçildi'):(count+uiText(" von 8 ausgewählt",getLanguage())));
 output.dataset.invalid=String(count<1||count>8);
}
function updateConditionalForm(changed=''){
 if(formAction?.action==='provider_category'){
  const root=$('actionFields'),mode=root.querySelector('[name="operation"]')?.value||'add';
  for(const [id,visible] of [['providerCategoryExisting',mode!=='add'],['providerCategoryName',mode!=='delete']]){
   const el=$(id);if(!el)continue;el.hidden=!visible;
   for(const input of el.querySelectorAll('input,select')){input.disabled=!visible;input.required=visible;}
  }
  return;
 }
 if(formAction?.action==='user_access'){
  const root=$('actionFields');
  const fresh=root.querySelector('[name="person_mode"]:checked')?.value==='new';
  for(const[id,enabled]of [['accessExisting',!fresh],['accessNew',fresh]]){
   const container=$(id);if(!container)continue;
   container.hidden=!enabled;
   for(const input of container.querySelectorAll('input,select')){input.disabled=!enabled;input.required=enabled;}
  }
  const selected=root.querySelector('[name="person_id"]')?.value;
  const person=state.data.persons.find(p=>p.id===selected);
  const storedEmail=String(person?.email||'').trim();
  const needsEmail=!fresh&&!!person&&!person.auth_user_id&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(storedEmail);
  const container=$('accessExistingEmail');
  if(container){container.hidden=!needsEmail;const input=container.querySelector('[name="access_email"]');if(input){input.disabled=!needsEmail;input.required=needsEmail;}}
  return;
 }

 if(formAction?.action.startsWith('assignment_'))updateAssignmentForm($('actionFields'),state.data,changed);

 if(formAction?.action!=='entry')return;const category=$('actionFields').querySelector('[name="category"]'),desc=$('actionFields').querySelector('[name="desc"]');if(desc){desc.placeholder=tr(category?.value==='Diğer'?'İşlem ne için yapıldı?':'Açıklama girin');desc.required=true;}
}

function labelTables(){enhanceTables(document);}

window.matchMedia('(max-width:1000px)').addEventListener('change',()=>{mobileNavGroup=null;renderNavigation();});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape'||mobileNavGroup===null||!event.target.closest('#nav'))return;
 event.preventDefault();const group=mobileNavGroup;mobileNavGroup=null;renderNavigation();
 $('nav').querySelector('[data-nav-group="'+group+'"]')?.focus({preventScroll:true});
});
// Keep the top controls reachable after a short upward scroll without a layout jump.
installSmartHeader();

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
 }catch(error){if(attempt===epoch)toast(error.message);}
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
// All background data refreshes use refreshWhenIdle below to preserve active input.
void resumeSession();
void invitationUi.inspect();

$('actionForm').addEventListener('invalid',event=>{event.preventDefault();const input=event.target;const message=tr(input.validity.valueMissing?'Bu alanı doldurun.':input.type==='email'?'Geçerli bir e-posta adresi girin.':'Bu alanı kontrol edin.');showFormError($('actionForm'),$('actionMessage'),fieldError(message,input.name));const first=$('actionForm').querySelector(':invalid');first?.focus();},true);

document.addEventListener('input',event=>{if(event.target.closest('#actionFields')&&financeActions.includes(formAction?.action)&&event.target.name!=='confirmed'){delete formAction.context.previewSignature;if($('financePreview'))$('financePreview').textContent='';const c=$('actionFields').querySelector('[name="confirmed"]');if(c)c.checked=false;}});
let autoRefreshBusy=false,lastAutoRefresh=Date.now();
async function refreshWhenIdle(){if(autoRefreshBusy||state.mode!=='connected'||document.visibilityState!=='visible'||writeBusy||loginBusy||document.querySelector('dialog[open]')||Date.now()-lastAutoRefresh<30000||document.activeElement?.matches('input,textarea,select'))return;autoRefreshBusy=true;lastAutoRefresh=Date.now();try{await reload();}catch{state.stale=true;}finally{autoRefreshBusy=false;}}
setInterval(()=>void refreshWhenIdle(),90000);window.addEventListener('focus',()=>void refreshWhenIdle());document.addEventListener('visibilitychange',()=>void refreshWhenIdle());

window.addEventListener('scroll',event=>{if(mobileNavGroup!==null&&closeMenuOnScroll(event,$('nav'))){mobileNavGroup=null;renderNavigation();}},{passive:true,capture:true});

document.addEventListener('click',async event=>{const button=event.target.closest('[data-draft-decision]');if(!button||writeBusy)return;if(button.dataset.draftDecision==='approve'&&state.data.chargeDrafts?.find(d=>d.id===button.dataset.id)?.payload?.debt_group==='capital'){await levyUI.openAdmin();return;}try{writeBusy=true;button.disabled=true;await mutate('draft_decision',{id:button.dataset.id,approve:button.dataset.draftDecision==='approve'});}catch(error){toast(error.message);}finally{writeBusy=false;button.disabled=false;}});

document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('[data-contact-request],[data-contact-review]'))return;event.preventDefault();if(writeBusy)return;
 const values=new FormData(form),review=form.matches('[data-contact-review]'),approve=event.submitter?.value==='approve',status=form.querySelector('[data-contact-status]');
 if(review&&approve&&!values.has('verified')){status.textContent=(getLanguage()==='tr'?('Lütfen bağımsız doğrulamayı onaylayın.'):(uiText("Bitte bestätigen Sie die unabhängige Prüfung.",getLanguage())));return;}
 try{writeBusy=true;for(const b of form.querySelectorAll('button'))b.disabled=true;
 await mutate(review?'contact_decide':'contact_request',review?{id:form.dataset.id,approve,verified:values.has('verified'),reason:String(values.get('reason')||'')}:{person_id:values.get('person_id'),request_id:values.get('request_id'),email:values.get('email'),phone:values.get('phone')});
 toast((getLanguage()==='tr'?('Talep kaydedildi.'):(uiText("Antrag gespeichert.",getLanguage()))));
 }catch(error){status.textContent=contactError(error.message);}finally{writeBusy=false;for(const b of form.querySelectorAll('button'))b.disabled=false;}
});
document.addEventListener('click',async event=>{const b=event.target.closest('[data-contact-withdraw]');if(!b||writeBusy)return;try{writeBusy=true;b.disabled=true;await mutate('contact_withdraw',{id:b.dataset.contactWithdraw});}catch(error){toast(error.message);}finally{writeBusy=false;b.disabled=false;}});
