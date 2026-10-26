import {installationVisible} from './seven-ux.mjs?v=5.8.0';
import {openInstallTutorial} from './install-tutorial.mjs?v=5.8.0';
import {t as tr} from './i18n.mjs?v=5.8.0';
export function bindInstall(){
 let pending=null,view={},dismissedUntil=0,installed=false;try{installed=localStorage.getItem('ayapark-app-installed')==='1';}catch{}const button=document.getElementById('installApp'),banner=document.getElementById('installBanner');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 const dismissed=()=>{if(dismissedUntil>Date.now())return true;try{return Number(localStorage.getItem('ayapark-install-dismissed-until'))>Date.now();}catch{return false;}};
 function update(){if(!button)return;button.textContent=tr('Kurulum rehberi');button.hidden=!!standalone()||installed;if(banner){banner.hidden=!installationVisible({standalone:standalone(),installed,dismissed:dismissed(),page:view.page,mode:view.mode});document.getElementById('installBannerTitle').textContent=tr('Uygulamayı telefonuna ekle');document.getElementById('installBannerHelp').textContent=tr('Ana ekrandan tek dokunuşla aç.');document.getElementById('dismissInstall').setAttribute('aria-label',tr('Yedi gün gizle'));}}
 document.addEventListener('ay5:view',event=>{view=event.detail;update();});document.addEventListener('ay2:languagechange',update);
 document.getElementById('dismissInstall')?.addEventListener('click',()=>{dismissedUntil=Date.now()+7*86400000;try{localStorage.setItem('ayapark-install-dismissed-until',String(Date.now()+7*86400000));}catch{}if(banner)banner.hidden=true;});
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update();});window.addEventListener('appinstalled',()=>{pending=null;installed=true;try{localStorage.setItem('ayapark-app-installed','1');}catch{}update();});
 const guide=()=>openInstallTutorial({onInstall:pending?async()=>{const prompt=pending;pending=null;await prompt.prompt();await prompt.userChoice;}:null});
 button?.addEventListener('click',guide);document.addEventListener('click',event=>{if(event.target.closest('[data-install-guide]'))guide();});
 update();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
