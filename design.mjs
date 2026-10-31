import {uiText} from './language-text.mjs?v=5.10.0';
import {getLanguage} from './i18n.mjs?v=5.10.0';
export const designKey='ayapark2-design-v1';
export const designOptions=['classic','modern'];
let current='modern';
export function readDesign(storage){try{const value=storage?.getItem(designKey);return designOptions.includes(value)?value:'modern';}catch{return 'modern';}}
export function getDesign(){return typeof document==='undefined'?current:document.documentElement.dataset.design||current;}
export function setDesign(value,{storage,persist=true}={}){
 if(!designOptions.includes(value))return getDesign();current=value;
 if(typeof document!=='undefined'){document.documentElement.dataset.design=value;if(storage===undefined)try{storage=localStorage;}catch{}}
 if(persist)try{storage?.setItem(designKey,value);}catch{}
 return value;
}
export function modernText(tr,de){return (getLanguage()==='tr'?(tr):(uiText(de,getLanguage())));}
export function designSettings(){return `<section class="design-settings"><div><h3>${modernText('Tasarım','Design')}</h3><p>${modernText('Bu cihaz için bir tasarım seçin.','Wähle die Gestaltung für dieses Gerät.')}</p></div><div class="design-choices" role="group" aria-label="${modernText('Tasarım seçin','Design wählen')}">${designOptions.map(v=>`<button type="button" class="button" data-design-choice="${v}" aria-pressed="${getDesign()===v}">${v==='modern'?'Modern':modernText('Klasik','Klassisch')}</button>`).join('')}</div><p class="modern-palette-note">${modernText('Modern, kendine ait renkleri kullanır. Klasik renk seçenekleriniz korunur.','Modern verwendet eine eigene Farbwelt. Deine bisherigen Farbwelten bleiben erhalten.')}</p></section>`;}
export function bindDesign(onChange=()=>{}){
 const update=()=>{
  const menu=document.getElementById('designMenu');if(!menu)return;
  menu.querySelector('summary').setAttribute('aria-label',modernText('Tasarım seçin','Design wählen'));
  menu.querySelector('[data-design-label]').textContent=getDesign()==='modern'?'Modern':modernText('Klasik','Klassisch');
  for(const b of document.querySelectorAll('[data-design-choice]')){b.setAttribute('aria-pressed',String(b.dataset.designChoice===getDesign()));b.textContent=b.dataset.designChoice==='modern'?'Modern':modernText('Klasik','Klassisch');}
 };
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-design-choice]');if(button){const inMenu=!!button.closest('#designMenu');setDesign(button.dataset.designChoice);const menu=document.getElementById('designMenu');if(menu)menu.open=false;onChange();update();(inMenu?menu?.querySelector('summary'):document.querySelector('.design-settings [data-design-choice="'+getDesign()+'"]'))?.focus();return;}
  const menu=document.getElementById('designMenu');if(menu?.open&&!menu.contains(event.target))menu.open=false;
 });
 document.addEventListener('keydown',event=>{const menu=document.getElementById('designMenu');if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary').focus();}});
 document.addEventListener('ay2:languagechange',update);
 if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===designKey||event.key===null){let storage;try{storage=localStorage;}catch{}setDesign(readDesign(storage),{persist:false});onChange();update();}});
 update();return update;
}
