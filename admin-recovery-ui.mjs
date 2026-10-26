import {ENABLE_ADMIN_RECOVERY} from './auth-features.mjs?v=5.8.0';
import {getLanguage} from './i18n.mjs?v=5.8.0';
export const recoveryEligible=(s,p)=>ENABLE_ADMIN_RECOVERY&&s.mode==='connected'&&s.data.role==='super'&&Boolean(p?.auth_user_id);
const tx=(tr,de)=>getLanguage()==='de'?de:tr;
export function bindAdminRecovery({api,getState}){
 const dialog=document.getElementById('adminRecoveryDialog');let person=null,busy=false;
 const status=document.getElementById('adminRecoveryStatus'),link=document.getElementById('adminRecoveryLink'),copy=document.getElementById('adminRecoveryCopy');
 const form=document.getElementById('adminRecoveryForm');
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy||!recoveryEligible(getState(),person))return;busy=true;const button=form.querySelector('[type="submit"]');button.disabled=true;link.value='';copy.disabled=true;status.textContent=tx('Bağlantı hazırlanıyor…','Link wird erstellt…');
  try{const result=await api.raw('/functions/v1/ay3-admin-recovery','POST',{action:'create',person_id:person.id,reason:document.getElementById('adminRecoveryReason').value,confirmed:document.getElementById('adminRecoveryConfirm').checked},await api.token());
   const target=new URL(result.url),expected=new URL('./reset.html',location.href);if(target.origin!==expected.origin||target.pathname!==expected.pathname||!target.hash.startsWith('#type=recovery&token_hash='))throw Error('invalid_link');
   if(!dialog.open)return;link.value=target.href;copy.disabled=false;status.textContent=tx('Bağlantı hazır. Sadece kimliğini doğruladığınız kişiye özel olarak gönderin.','Link erstellt. Nur der Person, deren Identität du geprüft hast, vertraulich senden.');
  }catch{status.textContent=tx('Bağlantı oluşturulamadı. Yetkiyi, hesap bağlantısını ve hizmet ayarlarını kontrol edin.','Link konnte nicht erstellt werden. Berechtigung, Kontozuordnung und Diensteinstellungen prüfen.');}
  finally{busy=false;button.disabled=false;}
 });
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link.value);status.textContent=tx('Kopyalandı.','Kopiert.');}catch{link.focus();link.select();status.textContent=tx('Bağlantıyı manuel kopyalayın.','Link bitte manuell kopieren.');}});
 document.getElementById('adminRecoveryClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{person=null;form.reset();link.value='';copy.disabled=true;});
 return {open(id){if(busy)return;person=getState().data.persons?.find(p=>p.id===id);if(!recoveryEligible(getState(),person))return;form.reset();link.value='';copy.disabled=true;status.textContent='';document.getElementById('adminRecoveryPerson').textContent=person.full_name;dialog.showModal();}};
}
