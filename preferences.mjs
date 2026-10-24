import {t as tr,getLanguage,setLanguage} from './i18n.mjs';
import {escapeHtml as e} from './core.mjs';
export const preferenceOptions={palette:['classic','ocean','slate','plum','sand'],loader:['ring','dots','bar','pulse','wave'],font:['normal','large','xlarge'],contrast:['normal','high'],density:['compact','comfortable'],motion:['system'],language:['tr','de'],theme:['system','light','dark']};
export const preferenceDefaults={palette:'classic',loader:'ring',font:'normal',contrast:'normal',density:'comfortable',motion:'system',hideAmounts:false,language:'tr',theme:'system'};
export function cleanPreferences(value={}){const out={...preferenceDefaults};for(const[k,options]of Object.entries(preferenceOptions))if(options.includes(value[k]))out[k]=value[k];out.hideAmounts=value.hideAmounts===true;return out;}
const key='ayapark2-preferences-v1';let owner=null,current=cleanPreferences(),saveTimer,syncVersion=0;
function cached(id){try{return JSON.parse(localStorage.getItem(key+(id?':'+id:''))||'null');}catch{return null;}}
export const preferences=()=>({...current});
export function applyPreferences(value,{persist=true}={}){
 current=cleanPreferences(value);if(typeof document==='undefined')return current;
 const root=document.documentElement;for(const k of ['palette','loader','font','contrast','density','motion'])root.dataset[k]=current[k];root.dataset.hideAmounts=String(current.hideAmounts);
 setLanguage(current.language);document.dispatchEvent(new CustomEvent('ay2:settheme',{detail:current.theme}));
 if(persist)try{localStorage.setItem(key,JSON.stringify(current));if(owner)localStorage.setItem(key+':'+owner,JSON.stringify(current));}catch{}
 return current;
}
export function initializePreferences(){const saved=cached(null)||{};try{saved.theme=localStorage.getItem('ayapark2-v2-theme')||saved.theme;saved.language=localStorage.getItem('ayapark2-v2-language')||saved.language;}catch{}applyPreferences(saved);}
export async function syncPreferences(api,onChange=()=>{}){
 const version=++syncVersion;owner=api.session?.user?.id||null;const uid=owner;if(!uid)return;
 const local=cached(uid);applyPreferences({...preferenceDefaults,language:getLanguage(),...local});onChange();
 try{let pending=false;try{pending=localStorage.getItem(key+':pending:'+uid)==='1';}catch{}if(pending&&local){await api.rpc('ay3_preferences',{p_settings:local});try{localStorage.removeItem(key+':pending:'+uid);}catch{}return;}const saved=await api.rpc('ay3_preferences',{});if(version!==syncVersion||api.session?.user?.id!==uid)return;
  if(Object.keys(saved||{}).length){applyPreferences(saved);onChange();}
  else if(local)await api.rpc('ay3_preferences',{p_settings:current});
 }catch{/* Local settings remain usable while offline. */}
}
export function endPreferenceSession(){syncVersion++;owner=null;clearTimeout(saveTimer);}
export function changePreference(k,value,api,onStatus=()=>{}){
 if(k==='hideAmounts')value=value===true||value==='true';
 if(k==='language'&&!preferenceOptions.language.includes(value))return;
 if(k!=='hideAmounts'&&!preferenceOptions[k]?.includes(value))return;
 syncVersion++;applyPreferences({...current,[k]:value});clearTimeout(saveTimer);
 if(!owner||!api?.session)return;
 const uid=owner,payload={...current};try{localStorage.setItem(key+':pending:'+uid,'1');}catch{}saveTimer=setTimeout(async()=>{if(api.session?.user?.id!==uid)return;try{await api.rpc('ay3_preferences',{p_settings:payload});try{const saved=cached(uid);if(JSON.stringify(saved)===JSON.stringify(payload))localStorage.removeItem(key+':pending:'+uid);}catch{}onStatus(tr('Tercihler kaydedildi.'));}catch{onStatus(tr('Tercihler bu cihazda kaydedildi. Hesap eşitlemesi başarısız; yeniden deneyin.'));}},500);
}
const names={classic:'Klasik (standart)',ocean:'Okyanus',slate:'Arduvaz',plum:'Mürdüm',sand:'Kum',ring:'Halka',dots:'Noktalar',bar:'Çizgi',pulse:'Nabız',wave:'Dalga',normal:'Standart',large:'Büyük',xlarge:'Çok büyük',high:'Yüksek',compact:'Sıkı',comfortable:'Rahat',system:'Cihaz ayarı',reduce:'Azalt',tr:'Türkçe',de:'Deutsch'};
export function loaderMarkup(style=current.loader){return `<span class="preloader loader-${preferenceOptions.loader.includes(style)?style:'ring'}" aria-hidden="true"><i></i><i></i><i></i></span>`;}
export function appearanceSettings(){const select=(k,label)=>`<label class="field">${tr(label)}<select data-preference="${k}" aria-label="${e(tr(label))}">${preferenceOptions[k].map(v=>`<option value="${v}" ${current[k]===v?'selected':''}>${e(tr(names[v]||v))}</option>`).join('')}</select></label>`;
 return `<details class="card appearance-settings"><summary>${tr('Görünüm ve kullanım')}</summary><p>${tr('Tercihler hesabınızla eşitlenir ve bu cihazda da saklanır.')}</p><div class="settings-grid">${select('palette','Renk dünyası')}<div class="field"><button type="button" class="button" data-reset-palette>${tr('Standart renklere dön')}</button></div>${select('loader','Yükleme göstergesi')}${select('font','Yazı boyutu')}${select('contrast','Kontrast')}${select('density','Aralıklar')}${select('language','Dil')}<label class="check-field"><input type="checkbox" data-preference="hideAmounts" ${current.hideAmounts?'checked':''}><span>${tr('Para tutarlarını gizle')}<small class="block-small">${tr('Tutarlar bulanık görünür. Görmek için tutara dokunun. Borç ve ödemeler değişmez.')}</small></span></label></div><div class="appearance-preview"><span>${tr('Önizleme')}</span>${loaderMarkup()}<button type="button" class="button primary">${tr('Örnek düğme')}</button><p>${tr('Yazı ve renk önizlemesi')}</p></div><p role="status" id="preferenceStatus"></p></details>`;
}
export function beginLoading(target,label=tr('Yükleniyor…'),{skeleton=false}={}){
 if(typeof document==='undefined'||!target)return()=>{};
 const previousBusy=target.getAttribute('aria-busy');target.setAttribute('aria-busy','true');let badge=null;
 const timer=setTimeout(()=>{badge=document.createElement('div');badge.className='loading-status';badge.setAttribute('role','status');badge.innerHTML=loaderMarkup()+'<span>'+e(label)+'</span>'+(skeleton?'<div class="loading-skeleton"><i></i><i></i><i></i></div>':'');target.append(badge);},300);
 return()=>{clearTimeout(timer);badge?.remove();if(previousBusy===null)target.removeAttribute('aria-busy');else target.setAttribute('aria-busy',previousBusy);};
}
