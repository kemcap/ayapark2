import {ENABLE_ADMIN_RECOVERY} from './auth-features.mjs?v=5.8.1';
import {getLanguage} from './i18n.mjs?v=5.9.28';
export const recoveryEligible=(s,p)=>ENABLE_ADMIN_RECOVERY&&s.mode==='connected'&&s.data.role==='super'&&Boolean(p?.auth_user_id);
const tx=(tr,de)=>getLanguage()==='de'?de:tr;

const recoveryError=error=>{
 const code=error?.code||'';
 if(code==='staff_verification_required')return tx('Yönetim hesabı için ek kimlik onayını işaretleyin.','Bitte die zusätzliche Identitätsprüfung für das Verwaltungskonto bestätigen.');
 if(code==='manager_recovery_requires_operator')return tx('Süper Admin hesabı bu işlemle yenilenemez. Ayrı bir kimlik doğrulaması gereklidir.','Ein Superadmin-Konto kann hier nicht zurückgesetzt werden. Dafür ist ein separater Identitätsnachweis erforderlich.');
 if(code==='self_recovery_forbidden')return tx('Kendi hesabınız için bu işlem kullanılamaz.','Dieser Vorgang ist für das eigene Konto nicht zulässig.');
 if(code==='invalid_request')return tx('En az 10 karakterlik kontrol notu yazıp gerekli onayları işaretleyin.','Bitte mindestens 10 Zeichen zur Identitätsprüfung eingeben und die Bestätigungen markieren.');
 if(code==='not_enabled'||error?.status===503)return tx('Şifre yenileme hizmeti sunucuda henüz etkin değil.','Die Wiederherstellung ist serverseitig noch nicht aktiviert.');
 if(code==='try_later'||error?.status===429)return tx('Çok fazla deneme. Lütfen daha sonra tekrar deneyin.','Zu viele Versuche. Bitte später erneut probieren.');
 if(code==='access_denied'||error?.status===401||error?.status===403)return tx('Süper Admin yetkisini ve oturumunuzu kontrol edin.','Bitte Superadmin-Berechtigung und Sitzung prüfen.');
 return tx('Bağlantı oluşturulamadı. Hesap ilişkisini ve sunucu ayarlarını kontrol edin.','Der Link konnte nicht erzeugt werden. Bitte Kontoverknüpfung und Servereinstellungen prüfen.');
};

export function bindAdminRecovery({api,getState}){
 const dialog=document.getElementById('adminRecoveryDialog');
 const form=document.getElementById('adminRecoveryForm');
 const status=document.getElementById('adminRecoveryStatus');
 const link=document.getElementById('adminRecoveryLink');
 const copy=document.getElementById('adminRecoveryCopy');
 const staffBox=document.getElementById('adminRecoveryStaffBox');
 const staffCheck=document.getElementById('adminRecoveryStaffConfirm');
 const staffLabel=document.getElementById('adminRecoveryStaffLabel');
 const managerNotice=document.getElementById('adminRecoveryManagerNotice');
 const button=form.querySelector('[type="submit"]');
 let person=null,busy=false,staffMember=null;

 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!recoveryEligible(getState(),person))return;
  if(staffMember?.role==='manager'){
   status.textContent=recoveryError({code:'manager_recovery_requires_operator'});
   return;
  }
  if(staffMember&&!staffCheck.checked){
   status.textContent=recoveryError({code:'staff_verification_required'});
   staffCheck.focus();return;
  }
  busy=true;button.disabled=true;link.value='';copy.disabled=true;
  status.textContent=tx('Bağlantı hazırlanıyor…','Link wird erstellt…');
  try{
   const result=await api.raw('/functions/v1/ay3-admin-recovery','POST',{
    action:'create',person_id:person.id,reason:document.getElementById('adminRecoveryReason').value,
    confirmed:document.getElementById('adminRecoveryConfirm').checked,
    staff_confirmed:!!staffMember&&staffCheck.checked
   },await api.token());
   const target=new URL(result.url),expected=new URL('./reset.html',location.href);
   if(target.origin!==expected.origin||target.pathname!==expected.pathname||
       !target.hash.startsWith('#type=recovery&token_hash='))throw Error('invalid_link');
   if(!dialog.open)return;
   link.value=target.href;copy.disabled=false;
   status.textContent=tx('Bağlantı hazır. Yalnızca kimliğini doğruladığınız kişiye özel gönderin.','Link erstellt. Ausschließlich der überprüften Person vertraulich senden.');
  }catch(error){status.textContent=recoveryError(error);}
  finally{busy=false;button.disabled=staffMember?.role==='manager';}
 });
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(link.value);status.textContent=tx('Kopyalandı.','Kopiert.');}
  catch{link.focus();link.select();status.textContent=tx('Bağlantıyı elle kopyalayın.','Link bitte manuell kopieren.');}
 });
 document.getElementById('adminRecoveryClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  person=null;staffMember=null;form.reset();link.value='';copy.disabled=true;button.disabled=false;
  staffBox.hidden=true;staffCheck.required=false;managerNotice.hidden=true;
 });
 return {open(id){
  if(busy)return;
  const state=getState();
  person=state.data.persons?.find(p=>p.id===id);
  if(!recoveryEligible(state,person))return;
  staffMember=(state.data.staff||[]).find(x=>x.user_id===person.auth_user_id)||null;
  form.reset();link.value='';copy.disabled=true;status.textContent='';
  staffBox.hidden=!staffMember||staffMember.role==='manager';
  staffCheck.required=!!staffMember&&staffMember.role!=='manager';
  managerNotice.hidden=staffMember?.role!=='manager';
  staffLabel.textContent=tx(
   'Bu yönetim hesabının sahibini doğrudan doğruladım ve şifre yenilemesini özellikle onaylıyorum.',
   'Ich habe die Identität dieses Verwaltungsmitglieds persönlich überprüft und bestätige die Passwortwiederherstellung ausdrücklich.'
  );
  managerNotice.textContent=recoveryError({code:'manager_recovery_requires_operator'});
  button.disabled=staffMember?.role==='manager';
  document.getElementById('adminRecoveryPerson').textContent=person.full_name;
  dialog.showModal();
 }};
}
