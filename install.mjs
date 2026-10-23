import {t as tr} from './i18n.mjs';
export function bindInstall(){
 let pending=null;const button=document.getElementById('installApp');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 const update=()=>{button.hidden=!!standalone();button.textContent=tr('Uygulamayı ekle');};
 update();document.addEventListener('ay2:languagechange',update);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;update();});
 window.addEventListener('appinstalled',()=>{pending=null;button.hidden=true;});
 button.addEventListener('click',async()=>{
  if(pending){const prompt=pending;pending=null;await prompt.prompt();await prompt.userChoice;return;}
  const dialog=document.createElement('dialog'),h=document.createElement('h2'),p=document.createElement('p'),close=document.createElement('button');
  h.textContent=tr('Başlangıç ekranına ekle');p.textContent=tr('iPhone: Paylaş menüsünü açın ve Ana Ekrana Ekle seçeneğini kullanın. Android: Tarayıcı menüsünde Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın.');close.textContent=tr('Kapat');close.className='button';close.addEventListener('click',()=>dialog.close());dialog.append(h,p,close);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 });
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
