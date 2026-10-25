import {openInstallTutorial} from './install-tutorial.mjs?v=4.0.1';
import {t as tr} from './i18n.mjs?v=4.0.1';
export function bindInstall(){
 let pending=null;const button=document.getElementById('installApp');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 const update=()=>{button.hidden=!!standalone();button.textContent=tr('Uygulamayı ekle');};
 update();document.addEventListener('ay2:languagechange',update);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update();});
 window.addEventListener('appinstalled',()=>{pending=null;button.hidden=true;});
 button.addEventListener('click',async()=>{
  if(pending){const prompt=pending;pending=null;await prompt.prompt();await prompt.userChoice;return;}
  openInstallTutorial();
 });
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
