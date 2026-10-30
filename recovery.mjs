import {RecoveryApi,takeRecoveryLocation} from './recovery-api.mjs?v=5.9.30';
import {t as tr,getLanguage,setLanguage,bindStaticText} from './i18n.mjs?v=5.9.28';
import {bindPasswordEyes} from './password-eye.mjs?v=5.8.1';
const incoming=takeRecoveryLocation(location,history),api=new RecoveryApi(undefined,{previewOnly:document.querySelector('meta[name="ayapark-stage"]')?.content==='preview'}),$=id=>document.getElementById(id);
const translate=bindStaticText(document.body),hidePasswords=bindPasswordEyes();
let busy=false,completed=false,phase='request',statusText='';
function message(text,error=false){statusText=text;$('recoveryStatus').textContent=tr(text);$('recoveryStatus').classList.toggle('error',error);}
function language(){translate();document.documentElement.lang=getLanguage();$('recoveryHelp').textContent=tr(phase==='verified'?'Yeni şifreni belirle.':phase==='complete'?'Yeni şifrenle uygulamaya giriş yapabilirsin.':'Şifreni yenilemek için e-posta adresini yaz.');const code=getLanguage();$('recoveryLanguage').innerHTML='<img class="flag" alt="" src="./assets/'+code+'.svg"> '+code.toUpperCase();$('recoveryLanguage').setAttribute('aria-label',tr('Dili değiştir'));$('recoveryStatus').textContent=tr(statusText);document.title=tr('Şifre yenile')+' · Ayapark 2';document.dispatchEvent(new Event('ay2:languagechange'));}
$('recoveryLanguage').addEventListener('click',()=>{setLanguage(getLanguage()==='tr'?'de':'tr');language();});
$('requestResetForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;$('requestResetButton').disabled=true;
 message('Bağlantı gönderiliyor…');
 try{await api.requestReset($('recoveryEmail').value.trim(),new URL('./reset.html',location.href).href);$('recoveryCodeEmail').value=$('recoveryEmail').value.trim();$('verifyRecoveryCodeForm').hidden=false;message('Bu adresle kayıtlı bir hesap varsa yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.');}
 catch(error){message(error.status===429?'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.':'Bağlantı gönderilemedi. Biraz sonra tekrar dene.',true);}
 finally{busy=false;$('requestResetButton').disabled=false;}
});
$('verifyRecoveryCodeForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;$('verifyRecoveryCodeButton').disabled=true;
 message('Kod doğrulanıyor…');
 try{
  await api.beginWithEmailCode($('recoveryCodeEmail').value.trim(),$('recoveryCode').value.trim());
  phase='verified';$('requestResetForm').hidden=true;$('verifyRecoveryCodeForm').hidden=true;
  $('newPasswordForm').hidden=false;$('recoveryHelp').textContent=tr('Yeni şifreni belirle.');
  message('');$('newPassword').focus();
 }catch(error){message(error.status===400||error.status===401?'Kod geçersiz veya süresi dolmuş. Yeni bir kod iste.':'Kod doğrulanamadı. Lütfen tekrar dene.',true);}
 finally{busy=false;$('verifyRecoveryCodeButton').disabled=false;}
});
$('newPasswordForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||completed)return;
 if($('newPassword').value!==$('confirmPassword').value){message('Şifreler aynı değil.',true);$('confirmPassword').focus();return;}
 busy=true;$('saveNewPassword').disabled=true;message('Şifre kaydediliyor…');
 try{await api.savePassword($('newPassword').value);completed=true;phase='complete';$('newPasswordForm').hidden=true;$('recoveryHelp').textContent=tr('Yeni şifrenle uygulamaya giriş yapabilirsin.');message('Şifren yenilendi.');}
 catch(error){message(error.status===401||error.status===403?'Bağlantının süresi dolmuş olabilir. Yeni bir bağlantı iste.':'Şifre kaydedilemedi. En az 6 karakter kullanın ve tekrar deneyin.',true);if(error.status===401||error.status===403){api.clear();phase='request';$('recoveryHelp').textContent=tr('Şifreni yenilemek için e-posta adresini yaz.');$('newPasswordForm').hidden=true;$('requestResetForm').hidden=false;}}
 finally{busy=false;$('saveNewPassword').disabled=false;if(completed)$('newPasswordForm').reset();hidePasswords();}
});
window.addEventListener('pagehide',()=>{api.clear();$('newPasswordForm').reset();hidePasswords();});
language();
if(incoming.present){
 $('requestResetForm').hidden=true;message('Bağlantı kontrol ediliyor…');
 try{
  if(incoming.error)throw Error('Expired link');
  await api.begin(incoming.payload);
  phase='verified';$('recoveryHelp').textContent=tr('Yeni şifreni belirle.');$('newPasswordForm').hidden=false;message('');$('newPassword').focus();
 }catch{api.clear();$('requestResetForm').hidden=false;$('verifyRecoveryCodeForm').hidden=false;message('Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste veya e-postadaki kodu kullan.',true);}
}
