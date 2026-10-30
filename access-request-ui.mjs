import {ENABLE_ACCESS_REQUESTS} from './auth-features.mjs?v=5.8.1';
import {accessRequestPayload,accessRequestsPanel} from './access-requests.mjs?v=5.8.1';
import {escapeHtml as e} from './core.mjs?v=5.8.1';
import {t as tr} from './i18n.mjs?v=5.9.28';
export function bindAccessRequests({api,getState,invite,enabled=ENABLE_ACCESS_REQUESTS}){
 const $=id=>document.getElementById(id);let offset=0,counts={},rows=[],generation=0,busy=false,selected=null;
 const message=(id,text)=>{$(id).textContent=tr(text);};
 function panel(){const s=getState(),host=$('accessRequestPanel');if(!host)return;host.hidden=!enabled||s.mode!=='connected'||s.data.role!=='super'||s.page!=='overview';if(!host.hidden)host.innerHTML=accessRequestsPanel(rows,counts);}
 async function load(){const s=getState(),g=++generation;if(!enabled||s.mode!=='connected'||s.data.role!=='super'){rows=[];panel();return;}
  try{const result=await api.accessRequests({action:'list',offset},true);if(g!==generation||getState().data.userId!==s.data.userId)return;rows=result.requests||[];counts={open:result.open,unread:result.unread,total:result.total,offset};panel();}
  catch{if(g===generation){panel();const host=$('accessRequestPanel');if(host&&!host.hidden)host.textContent=tr('Talepler yüklenemedi. Yenileyin.');}}
 }
 $('requestAccessEntry').hidden=!enabled;
 $('requestAccessEntry').addEventListener('click',()=>{$('loginDialog').close();$('requestAccessDialog').showModal();});
 $('requestAccessForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(busy)return;busy=true;$('requestAccessSubmit').disabled=true;
  try{const p=accessRequestPayload(Object.fromEntries(new FormData(form)));await api.accessRequests({action:'submit',...p});message('requestAccessStatus','Talebiniz alındı. Yönetim incelemeden sonra sizinle iletişime geçecektir.');form.reset();}
  catch{message('requestAccessStatus','Talep gönderilemedi. Bilgilerinizi kontrol edip daha sonra tekrar deneyin.');}finally{busy=false;$('requestAccessSubmit').disabled=false;}
 });
 async function update(row,action,person_id){await api.accessRequests({action,id:row.id,version:row.version,person_id,confirmed:true},true);await load();}
 document.addEventListener('click',async event=>{
  if(event.target.closest('[data-request-close]')){event.target.closest('dialog')?.close();return;}
  if(event.target.closest('[data-access-page]')){offset=Math.max(0,offset+Number(event.target.closest('[data-access-page]').dataset.accessPage));await load();return;}
  if(event.target.closest('[data-access-refresh]')){await load();return;}
  const button=event.target.closest('[data-request-action]');if(!button||busy||!enabled)return;const s=getState();if(s.mode!=='connected'||s.data.role!=='super')return;
  const row=rows.find(r=>r.id===button.dataset.id);if(!row)return;const action=button.dataset.requestAction;
  if(action==='invite'){invite(row.person_id);return;}
  if(action==='open'||action==='reject'){
   selected={row,action};$('requestApplicantDetails').textContent=[row.first_name,row.last_name,row.contact,row.unit_hint].filter(Boolean).join(' · ');const candidates=s.data.persons.filter(p=>!p.auth_user_id||p.provisional===true);$('requestPersonSearch').value='';$('requestPersonDetails').textContent='';$('requestPersonSelect').innerHTML='<option value="">'+tr('Kişi seçin.')+'</option>'+candidates.map(p=>`<option value="${e(p.id)}">${e(p.full_name)}</option>`).join('');$('requestPersonField').hidden=action==='reject';$('requestReviewConfirm').checked=false;$('requestReviewTitle').textContent=tr(action==='reject'?'Talebi reddet':'Erişim talebini incele');$('requestReviewSubmit').textContent=tr(action==='reject'?'Reddet':'Onayla');message('requestReviewStatus','Kişiyi, iletişim bilgisini ve güncel daire rolünü kontrol edin.');$('requestReviewDialog').showModal();return;
  }
  busy=true;button.disabled=true;try{await update(row,action);}catch{message('requestAdminStatus','İşlem tamamlanamadı. Kaydı yenileyip tekrar kontrol edin.');}finally{busy=false;button.disabled=false;}
 });
 $('requestPersonSelect').addEventListener('change',()=>{
  const d=getState().data,p=d.persons.find(p=>p.id===$('requestPersonSelect').value);
  $('requestPersonDetails').textContent=p?[p.full_name,p.phone,p.email,...d.links.filter(l=>l.person_id===p.id&&l.active).map(l=>(d.units.find(u=>u.id===l.unit_id)?.code||'—')+' · '+tr({owner:'Ev sahibi',tenant:'Kiracı',representative:'Temsilci'}[l.role]||l.role))].filter(Boolean).join(' · '):'';
 });
 $('requestPersonSearch').addEventListener('input',event=>{const q=event.target.value.toLocaleLowerCase();for(const option of $('requestPersonSelect').options)option.hidden=!!option.value&&!option.textContent.toLocaleLowerCase().includes(q);});
 $('requestReviewForm').addEventListener('submit',async event=>{event.preventDefault();if(!selected||busy)return;if(!$('requestReviewConfirm').checked){message('requestReviewStatus','Önce kontrolü onaylayın.');return;}
  busy=true;$('requestReviewSubmit').disabled=true;try{await update(selected.row,selected.action==='reject'?'reject':'approve',$('requestPersonSelect').value||null);$('requestReviewDialog').close();}catch{message('requestReviewStatus','İşlem tamamlanamadı. Kaydı yenileyip tekrar kontrol edin.');}finally{busy=false;$('requestReviewSubmit').disabled=false;}
 });
 document.addEventListener('ay5:view',()=>{const s=getState();if(s.mode!=='connected'||s.data.role!=='super'){generation++;rows=[];offset=0;counts={};}panel();});
 return {load,panel};
}
