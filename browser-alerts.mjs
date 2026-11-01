// Optional browser notifications while the signed-in app is running.
// Background Web Push requires a separately configured VAPID sender.
export function createBrowserAlerts(){
 const key='ayapark2-browser-alerts-enabled';
 const supported=()=>typeof Notification!=='undefined'&&window.isSecureContext;
 const enabled=()=>supported()&&localStorage.getItem(key)==='1'&&Notification.permission==='granted';
 let seen=new Set(),primed=false;
 function label(lang){return lang==='de'?'Browser-Benachrichtigungen':lang==='en'?'Browser notifications':'Tarayıcı bildirimleri';}
 function mount(lang='tr'){
  const root=document.querySelector('#content');if(!root||!supported())return;
  if(document.querySelector('#ayBrowserAlertsControl'))return;
  const node=document.createElement('section');node.id='ayBrowserAlertsControl';node.className='card';node.style.marginBottom='16px';
  node.innerHTML='<h3>🔔 '+label(lang)+'</h3><p class="fine">'+(lang==='de'?'Benachrichtigungen über neue wichtige Mitteilungen, solange AYA PARK 2 geöffnet ist. Für Hintergrund-Push ist eine weitere Einrichtung erforderlich.':lang==='en'?'Alerts for new important announcements while AYA PARK 2 is open. Background push requires further setup.':'AYA PARK 2 açıkken yeni önemli duyurular için bildirim alın. Uygulama kapalıyken push göndermek için ek kurulum gerekir.')+'</p><button type="button" class="button" id="ayBrowserAlertsButton"></button>';
  root.prepend(node);
  const button=node.querySelector('button');
  const draw=()=>{button.textContent=enabled()?(lang==='de'?'Benachrichtigungen ausschalten':lang==='en'?'Disable notifications':'Bildirimleri kapat'):(lang==='de'?'Benachrichtigungen aktivieren':lang==='en'?'Enable notifications':'Bildirimleri aç')};
  button.onclick=async()=>{if(enabled()){localStorage.removeItem(key);draw();return;}const p=await Notification.requestPermission();if(p==='granted')localStorage.setItem(key,'1');draw();};
  draw();
 }
 function check(announcements,lang='tr'){
  if(!Array.isArray(announcements))return;
  const relevant=announcements.filter(a=>a.published&&['important','urgent'].includes(a.priority));
  const keys=relevant.map(a=>String(a.id)+':'+String(a.revision||1));
  if(!primed){seen=new Set(keys);primed=true;return;}
  for(const a of relevant){const id=String(a.id)+':'+String(a.revision||1);if(seen.has(id))continue;seen.add(id);if(!enabled())continue;
   const title=lang==='de'?(a.title_de||a.title):a.title;
   const n=new Notification('AYA PARK 2 · '+title,{body:(lang==='de'?(a.body_de||a.body):a.body||'').slice(0,145),tag:'ayapark-'+a.id,icon:'./assets/app-icon.png'});
   n.onclick=()=>{window.focus();n.close();};
  }
 }
 return {mount,check};
}
