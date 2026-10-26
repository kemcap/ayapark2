import {escapeHtml as e} from './core.mjs?v=5.1.0';
import {activeAt} from './v3-domain.mjs?v=5.1.0';
import {t as tr} from './i18n.mjs?v=5.1.0';
import {Invitations,invitationText} from './invitations.mjs';
export function invitationControl(s,p){
 if(s.data.role!=='super'||!p)return '';
 const assigned=s.data.links.some(l=>l.person_id===p.id&&activeAt(l)&&['owner','tenant'].includes(l.role));
 if(!assigned)return `<small>${tr('Davet için önce güncel daire bağlantısı ekle.')}</small>`;
 return `<button type="button" class="text-button" data-resident-invite="${e(p.id)}">${tr(p.auth_user_id?'Erişim ve davet':'Davet et')}</button>`;
}
export function setupInvitations({state,api,showDetail,toast,reload,isAccessPreview}){
 const invites=new Invitations(api);const originalCall=invites.call.bind(invites);invites.call=async(...args)=>{const generation=api.generation;const result=await originalCall(...args);if(generation!==api.generation||!allowed())throw Error(tr('Canlı Süper Admin görünümünde kullanılır.'));return result;};let busy=false,context=null,share='';
 const statusLabels={none:'Henüz davet edilmedi',invited:'Davet gönderilmeye hazır',requested:'Onay bekliyor',approved:'Onaylandı',active:'Erişim etkin',expired:'Davet süresi doldu',revoked:'Davet iptal edildi'};
 const allowed=()=>state.mode==='connected'&&state.data.role==='super'&&!isAccessPreview();
 const draw=(p,r)=>{context={person:p,status:r};share='';showDetail(`<h2 id="detailTitle">${e(p.full_name)} · ${tr('Davet')}</h2><p>${tr(statusLabels[r.status]||'Henüz davet edilmedi')}</p><p class="fine">${tr('Davet yalnızca güncel daire rollerini kapsar. WhatsApp veya SMS kodu gönderilmez.')}</p>${r.status==='requested'?`<p>${tr('Karşılaştırma kodu')}: <strong>${e(r.code)}</strong></p><p>${tr('Kişiyi yüz yüze veya kayıtlı telefonundan ara. Ekranındaki kodu doğrula.')}</p><label><input id="inviteIdentityChecked" type="checkbox"> ${tr('Kişinin kimliğini ve ekrandaki kodu kontrol ettim.')}</label><p><button type="button" class="button primary" data-invite-action="approve">${tr('Erişimi onayla')}</button></p>`:''}<label>${tr('Etkinleştirme yöntemi')}<select id="inviteMethod"><option value="manual">${tr('Yönetici onayı · e-posta gerekmez')}</option>${p.email?`<option value="email">${tr('E-posta doğrulaması')}</option>`:''}</select></label><p><button type="button" class="button primary" data-invite-action="issue">${tr(['none','revoked','expired'].includes(r.status)?'Davet oluştur':'Yeni davet oluştur')}</button> <button type="button" class="button" data-invite-action="refresh">${tr('Durumu yenile')}</button>${r.id&&!['active','expired','revoked'].includes(r.status)?` <button type="button" class="button" data-invite-action="revoke">${tr('Daveti iptal et')}</button>`:''}</p><div id="invitationShare" hidden><label>${tr('Davet metni')}<textarea id="invitationText" readonly rows="6"></textarea></label><p><button type="button" class="button" data-invite-action="copy">${tr('Metni kopyala')}</button> <button type="button" class="button" data-invite-action="copy_link">${tr('Bağlantıyı kopyala')}</button></p></div><p id="invitationStatus" role="status" aria-live="polite"></p>`);};
 const run=async fn=>{if(busy)return;busy=true;try{if(!allowed())throw Error(tr('Canlı Süper Admin görünümünde kullanılır.'));await fn();}catch(error){toast(error.status===503?tr('Davet sistemi henüz etkin değil.'):error.message);}finally{busy=false;}};
 document.addEventListener('click',event=>{
  const entry=event.target.closest('[data-resident-invite]');if(entry){void run(async()=>{const p=state.data.persons.find(p=>p.id===entry.dataset.residentInvite);if(!p)return;const result=await invites.call('status',{person_id:p.id},true);if(allowed())draw(p,result);});return;}
  const b=event.target.closest('[data-invite-action]');if(!b||!context)return;
  void run(async()=>{const p=context.person,r=context.status,action=b.dataset.inviteAction;
   if(action==='copy'||action==='copy_link'){await navigator.clipboard.writeText(action==='copy_link'?share:invitationText(p.full_name,share));document.getElementById('invitationStatus').textContent=tr('Kopyalandı.');return;}
   if(action==='refresh'){draw(p,await invites.call('status',{person_id:p.id},true));return;}
   if(action==='approve'&&!document.getElementById('inviteIdentityChecked')?.checked)throw Error(tr('Önce kişiyi ve karşılaştırma kodunu doğrula.'));
   const result=await invites.call(action,{person_id:p.id,id:r.id,mode:document.getElementById('inviteMethod')?.value,code:r.code,confirmed:true},true);
   if(!allowed())return;
   if(action==='issue'){draw(p,{...result,status:'invited'});share=result.link;document.getElementById('invitationText').value=invitationText(p.full_name,share);document.getElementById('invitationShare').hidden=false;}
   else{draw(p,await invites.call('status',{person_id:p.id},true));await reload();}
  });
 });
}
