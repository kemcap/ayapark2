import {norm} from './v3-domain.mjs?v=5.9.26';
import {escapeHtml as e} from './core.mjs?v=5.8.1';
import {getLanguage} from './i18n.mjs?v=5.8.1';
const text=(tr,de)=>getLanguage()==='de'?de:tr;
const phone=value=>{let n=String(value||'').replace(/\D/g,'').replace(/^00/,'');return n.replace(/^90(?=5\d{9}$)/,'').replace(/^0(?=5\d{9}$)/,'');};
export function matchingPeople(people,query){
 const q=norm(query),digits=phone(query);
 return people.filter(p=>!p.archived_at&&(!q||[p.first_name,p.last_name,p.full_name,p.email,p.phone].some(v=>norm(v).includes(q))||(/^\s*[+()\d\s./-]+$/.test(query)&&digits&&phone(p.phone).includes(digits))));
}
export function personPicker(people,id=''){
 const selected=people.find(p=>p.id===id);
 return `<div class="person-picker"><label id="personPickerLabel">${text('Kişi','Person')}</label><input type="hidden" name="person_id" value="${e(id)}"><button type="button" class="person-picker-toggle" aria-haspopup="listbox" aria-expanded="false" aria-controls="personPickerPopup" aria-labelledby="personPickerLabel personPickerValue"><span id="personPickerValue">${e(selected?.full_name||text('Kişi seçin.','Person auswählen'))}</span><span aria-hidden="true">⌄</span></button><div id="personPickerPopup" class="person-picker-popup" hidden><input type="search" name="person_search" role="combobox" aria-label="${text('Ad, telefon veya e-posta ara','Name, Telefon oder E-Mail suchen')}" aria-autocomplete="list" aria-expanded="true" aria-controls="personPickerOptions" autocomplete="off"><div id="personPickerOptions" role="listbox" aria-labelledby="personPickerLabel"></div><p class="fine" data-picker-count role="status"></p><button type="button" data-picker-new class="text-button">${text('Yeni kişi ekle','Neue Person hinzufügen')}</button></div></div>`;
}
export function bindPersonPicker(container,people){
 const root=container.querySelector('.person-picker');if(!root||root.dataset.bound)return;
 root.dataset.bound='true';const toggle=root.querySelector('.person-picker-toggle'),popup=root.querySelector('.person-picker-popup'),input=root.querySelector('[role=combobox]'),list=root.querySelector('[role=listbox]'),value=root.querySelector('[name=person_id]');let index=-1,matches=[];
 const highlight=()=>{const options=[...list.children];options.forEach((n,i)=>n.classList.toggle('highlighted',i===index));if(index>=0){input.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');};
 const render=()=>{matches=matchingPeople(people,input.value);index=-1;list.innerHTML=matches.map((p,i)=>`<div role="option" id="personOption${i}" data-picker-id="${e(p.id)}" aria-selected="${p.id===value.value}"><strong>${e(p.full_name)}</strong><small>${e([p.phone,p.email].filter(Boolean).join(' · '))}</small></div>`).join('');root.querySelector('[data-picker-count]').textContent=matches.length?String(matches.length):text('Kişi bulunamadı.','Keine Person gefunden.');highlight();};
 const close=(focus=false)=>{popup.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();};
 const open=()=>{popup.hidden=false;toggle.setAttribute('aria-expanded','true');input.value='';render();input.focus();};
 const choose=id=>{value.value=id;root.querySelector('#personPickerValue').textContent=people.find(p=>p.id===id)?.full_name||'';close(true);value.dispatchEvent(new Event('change',{bubbles:true}));};
 toggle.addEventListener('click',()=>popup.hidden?open():close());
 toggle.addEventListener('keydown',ev=>{if(['ArrowDown','ArrowUp'].includes(ev.key)){ev.preventDefault();open();}});
 input.addEventListener('input',render);
 input.addEventListener('keydown',ev=>{if(['ArrowDown','ArrowUp','Home','End'].includes(ev.key)){ev.preventDefault();index=ev.key==='Home'?0:ev.key==='End'?matches.length-1:Math.max(0,Math.min(matches.length-1,index+(ev.key==='ArrowDown'?1:-1)));highlight();}else if(ev.key==='Enter'){ev.preventDefault();if(matches[index])choose(matches[index].id);}else if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();close(true);}});
 list.addEventListener('click',ev=>{const option=ev.target.closest('[data-picker-id]');if(option)choose(option.dataset.pickerId);});
 root.addEventListener('focusout',ev=>{if(!root.contains(ev.relatedTarget))close();});
 root.querySelector('[data-picker-new]').addEventListener('click',()=>{const radio=container.querySelector('[name=person_mode][value=new]');radio.checked=true;close();radio.dispatchEvent(new Event('change',{bubbles:true}));container.querySelector('[name=first_name]')?.focus();});
 render();
}
