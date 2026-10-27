import {escapeHtml as e} from './core.mjs?v=5.8.1';
import {t} from './i18n.mjs?v=5.8.1';
export const searchKey=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ı/g,'i');
export function matchingPeople(people,query){
 const key=searchKey(query).trim(),digits=key.replace(/\D/g,'');
 return people.filter(p=>!p.archived_at&&(!key||searchKey([p.full_name,p.phone,p.email].join(' ')).includes(key)
  ||digits.length>0&&/^[+()\d\s./-]+$/.test(key)&&String(p.phone||'').replace(/\D/g,'').includes(digits)));
}
export function personCombobox(people,selected=''){
 const person=people.find(p=>p.id===selected&&!p.archived_at);
 return `<div class="person-combobox" data-person-combobox><label id="person-combo-label">${t('Kişi')}</label><input type="hidden" name="person_id" value="${e(person?.id||'')}"><button type="button" class="person-combo-trigger" aria-labelledby="person-combo-label person-combo-value" aria-haspopup="listbox" aria-expanded="false" aria-controls="person-combo-list"><span id="person-combo-value">${e(person?.full_name||t('Kişi seçin.'))}</span><span aria-hidden="true">⌄</span></button><div class="person-combo-popup" hidden><input type="search" role="combobox" aria-label="${e(t('Ad, telefon veya e-posta ara'))}" aria-autocomplete="list" aria-expanded="false" aria-controls="person-combo-list" autocomplete="off" placeholder="${e(t('Ad, telefon veya e-posta ara'))}"><div id="person-combo-list" role="listbox" aria-labelledby="person-combo-label"></div><p class="fine" data-combo-count role="status" aria-live="polite"></p><button type="button" class="button" data-combo-new hidden>${t('Yeni kişi oluştur')}</button></div></div>`;
}
export function bindPersonCombobox(container,people,onNew){
 const root=container.querySelector('[data-person-combobox]');if(!root||root.dataset.bound)return;
 root.dataset.bound='true';
 const value=root.querySelector('[name=person_id]'),trigger=root.querySelector('.person-combo-trigger'),label=root.querySelector('#person-combo-value'),popup=root.querySelector('.person-combo-popup'),input=root.querySelector('[role=combobox]'),list=root.querySelector('[role=listbox]'),create=root.querySelector('[data-combo-new]');
 let rows=[],index=-1;
 function highlight(){
  [...list.children].forEach((node,i)=>node.setAttribute('aria-selected',String(i===index)));
  if(index>=0){input.setAttribute('aria-activedescendant',list.children[index].id);list.children[index].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');
 }
 function render(){
  rows=matchingPeople(people,input.value);index=rows.findIndex(p=>p.id===value.value);
  list.innerHTML=rows.map((p,i)=>`<div role="option" tabindex="-1" id="person-combo-option-${i}" data-index="${i}" aria-selected="false"><strong>${e(p.full_name)}</strong><small>${e([p.phone,p.email].filter(Boolean).join(' · '))}</small></div>`).join('');
  create.hidden=rows.length>0;root.querySelector('[data-combo-count]').textContent=rows.length?String(rows.length)+' '+t('kişi'):t('Kişi bulunamadı.');highlight();
 }
 function close(restore=false){popup.hidden=true;trigger.setAttribute('aria-expanded','false');input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(restore)trigger.focus();}
 function open(){popup.hidden=false;trigger.setAttribute('aria-expanded','true');input.setAttribute('aria-expanded','true');input.value='';render();input.focus();}
 function choose(i){if(!rows[i])return;value.value=rows[i].id;label.textContent=rows[i].full_name;close(true);value.dispatchEvent(new Event('change',{bubbles:true}));}
 trigger.addEventListener('click',()=>popup.hidden?open():close());
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
 input.addEventListener('input',render);
 input.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
  else if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();index=rows.length?(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length:-1;highlight();}
  else if(event.key==='Enter'){event.preventDefault();if(index>=0)choose(index);else if(rows.length===1)choose(0);else if(!rows.length)create.focus();}
 });
 list.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option)choose(Number(option.dataset.index));});
 create.addEventListener('click',()=>{close();onNew();});
 root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){event.preventDefault();event.stopPropagation();close(true);}});
}
