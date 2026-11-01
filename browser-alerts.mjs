// AYA PARK 2 Web Push: explicit device opt-in, live even when app is closed.
const PUBLIC_VAPID='BNYDTV5UHR9HE47JNoX3h0R6PHiCCdOUIp5Zp6-C2BXA7_B5_NcNvIbc8VzM9we8YlSLQlYnRUjuTrgiJA2qx6Q';
const dict={
 tr:{heading:'Önemli duyuruları kaçırmayın',body:'AYA PARK 2 kapalıyken de telefonunuza önemli site duyuruları gelsin.',activate:'Bildirimleri aç',later:'Daha sonra',off:'Bildirimleri kapat',statusOn:'Push bildirimleri etkin.',statusOff:'Uygulama kapalıyken de bildirim almak için etkinleştirin.',blocked:'Bildirimler tarayıcı ayarlarında engellenmiş. Önce site bildirim iznini açın.',unsupported:'Bu cihazda web push desteklenmiyor. iPhone kullanıyorsanız uygulamayı Ana Ekrana ekleyin.',failed:'Bildirimler etkinleştirilemedi. Tekrar deneyin.',settings:'Push bildirimleri'},
 de:{heading:'Wichtige Mitteilungen nicht verpassen',body:'Wichtige Hausmitteilungen erhalten, auch wenn AYA PARK 2 geschlossen ist.',activate:'Push aktivieren',later:'Später',off:'Push deaktivieren',statusOn:'Push-Benachrichtigungen sind aktiv.',statusOff:'Erhalten Sie Benachrichtigungen, auch wenn die App geschlossen ist.',blocked:'Browser-Benachrichtigungen sind blockiert. Bitte Berechtigung in den Browsereinstellungen ändern.',unsupported:'Web Push wird hier nicht unterstützt. Auf iPhones muss die App zum Home-Bildschirm hinzugefügt werden.',failed:'Aktivierung fehlgeschlagen. Bitte erneut versuchen.',settings:'Push-Benachrichtigungen'},
 en:{heading:'Never miss important notices',body:'Get important building notices on your phone, even when AYA PARK 2 is closed.',activate:'Enable push notifications',later:'Later',off:'Turn off push',statusOn:'Push notifications are enabled.',statusOff:'Enable notifications while the app is closed.',blocked:'Notifications are blocked in your browser settings. Please allow notifications for this site.',unsupported:'Web Push is not supported here. On iPhone add the app to your Home Screen.',failed:'Could not enable notifications. Please try again.',settings:'Push notifications'}
};
const keyBytes=b64=>{const raw=atob(b64.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-b64.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));};
export function createBrowserAlerts({api,getContext,language}){
 let prompted=false,reminderTimer=null;
 const words=()=>dict[language()]||dict.tr;
 const supported=()=>Boolean(window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window);
 const getSub=async()=>{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;return {registration,sub:await registration.pushManager.getSubscription()};};
 const notifyError=message=>{const el=document.querySelector('#ayPushStatus');if(el)el.textContent=message;};
 async function isActive(){if(!supported()||Notification.permission!=='granted')return false;try{const {sub}=await getSub();return !!sub;}catch{return false;}}
 async function enable(){
  if(!supported())throw Error(words().unsupported);
  if(Notification.permission==='denied')throw Error(words().blocked);
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error(words().blocked);
  const {registration,sub:existing}=await getSub();
  const sub=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(PUBLIC_VAPID)});
  const json=sub.toJSON(),context=getContext();
  if(!context?.site?.id||!api.session?.user?.id)throw Error('Session unavailable');
  const token=await api.token();
  const payload={site_id:context.site.id,user_id:api.session.user.id,endpoint:sub.endpoint,p256dh:json.keys?.p256dh,auth_key:json.keys?.auth,enabled:true};
  try{await api.raw('/rest/v1/ay10_push_subscriptions','POST',payload,token)}
  catch(error){if(!String(error.message).includes('23505'))throw error;
   const endpoint=encodeURIComponent(sub.endpoint);
   await api.raw('/rest/v1/ay10_push_subscriptions?endpoint=eq.'+endpoint,'PATCH',payload,token);
  }
  document.querySelector('#ayPushReminder')?.close();
  return true;
 }
 async function disable(){
  const context=getContext(),token=await api.token();
  const {sub}=await getSub();
  if(sub){await api.raw('/rest/v1/ay10_push_subscriptions?endpoint=eq.'+encodeURIComponent(sub.endpoint),'DELETE',undefined,token);await sub.unsubscribe();}
 }
 function settings(){
  const root=document.getElementById('content');
  if(!root||document.getElementById('ayPushSettings'))return;
  const x=words(),section=document.createElement('section');section.className='card';section.id='ayPushSettings';
  section.innerHTML='<h3>🔔 '+x.settings+'</h3><p class="fine">'+x.statusOff+'</p><p id="ayPushStatus" role="status"></p><button class="button" type="button" id="ayPushButton">'+x.activate+'</button>';
  root.prepend(section);
  const button=section.querySelector('#ayPushButton');const status=section.querySelector('#ayPushStatus');
  if(!supported()){button.disabled=true;status.textContent=x.unsupported;return;}
  if(Notification.permission==='denied'){button.disabled=true;status.textContent=x.blocked;return;}
  isActive().then(active=>{button.textContent=active?x.off:x.activate;section.querySelector('.fine').textContent=active?x.statusOn:x.statusOff;});
  button.onclick=async()=>{button.disabled=true;status.textContent='';try{if(await isActive())await disable();else await enable();const active=await isActive();button.textContent=active?x.off:x.activate;section.querySelector('.fine').textContent=active?x.statusOn:x.statusOff;}catch(e){status.textContent=e.message||x.failed;}finally{button.disabled=false;}};
 }
 function closeReminder(){document.querySelector('#ayPushReminder')?.close();}
 async function remind(){
  if(prompted||!getContext()?.site?.id||!supported())return;
  if(Notification.permission==='denied')return;
  if(await isActive())return;
  if(document.querySelector('dialog[open]'))return;
  prompted=true;
  let dlg=document.querySelector('#ayPushReminder');if(!dlg){dlg=document.createElement('dialog');dlg.id='ayPushReminder';dlg.className='ay-push-reminder';document.body.append(dlg);}
  const x=words();dlg.innerHTML='<div class="ay-push-reminder-body"><div class="ay-push-reminder-icon" aria-hidden="true">🔔</div><h2>'+x.heading+'</h2><p>'+x.body+'</p><p id="ayPushReminderError" class="fine" role="alert"></p><div class="ay-push-reminder-actions"><button type="button" id="ayPushLater" class="button">'+x.later+'</button><button type="button" id="ayPushActivate" class="button primary">'+x.activate+'</button></div></div>';
  dlg.querySelector('#ayPushLater').onclick=closeReminder;
  const button=dlg.querySelector('#ayPushActivate');button.onclick=async()=>{button.disabled=true;try{await enable()}catch(e){dlg.querySelector('#ayPushReminderError').textContent=e.message||x.failed;}finally{button.disabled=false;}};
  dlg.showModal();
 }
 function scheduleReminder(){prompted=false;if(reminderTimer)clearInterval(reminderTimer);let ticks=0;reminderTimer=setInterval(()=>{if(!getContext()?.site?.id||prompted||ticks++>120){clearInterval(reminderTimer);return;}void remind();},1500);}
 function reset(){prompted=false;clearInterval(reminderTimer);closeReminder();}
 return {mount:settings,remind,scheduleReminder,reset};
}
