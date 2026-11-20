import {nextLanguage} from './language-text.mjs?v=5.10.0';
import {RecoveryApi,takeRecoveryLocation} from './recovery-api.mjs?v=20261120-phone-request';
import {getLanguage,setLanguage,bindStaticText} from './i18n.mjs?v=5.10.0';
import {bindPasswordEyes} from './password-eye.mjs?v=5.10.1';
import {loginWithCountry,normalizePhone} from './auth-policy.mjs?v=20261120-country-login';
import {localizedCallingCountries,countryCallingCode,findCountryFromInternational} from './phone-country-codes.mjs?v=20261120-worldwide';
const $=id=>document.getElementById(id);
const incoming=takeRecoveryLocation(location,history);
const api=new RecoveryApi(undefined,{previewOnly:document.querySelector('meta[name="ayapark-stage"]')?.content==='preview'});
const translate=bindStaticText(document.body),hidePasswords=bindPasswordEyes();
const copy={
 tr:{title:'Şifreni mi unuttun?',request:'Şifreni yenilemek için bir yöntem seç.',email:'E-posta',phone:'Telefon',emailLabel:'E-posta adresi',phoneLabel:'Telefon numarası',country:'Ülke kodu',find:'Ülke ara',search:'Ülke veya kod',emailSend:'Yenileme bağlantısı gönder',phoneSend:'Yönetimden bağlantı iste',back:'Girişe dön',codeToggle:'E-posta kodu kullan',codeLabel:'Doğrulama kodu',codeVerify:'Kodu doğrula',newPass:'Yeni şifre',confirmPass:'Yeni şifreyi tekrarla',passHelp:'En az 6 karakter kullan.',save:'Şifreyi kaydet',verified:'Yeni şifreni belirle.',complete:'Yeni şifrenle giriş yapabilirsin.',emailDoneTitle:'E-postanı kontrol et',emailDone:'Bu e-posta giriş hesabına tanımlıysa şifre yenileme bağlantısı gönderilir. Spam klasörünü de kontrol et.',phoneDoneTitle:'Talebin alındı',phoneDone:'Telefonun kayıtlı bir hesaba bağlıysa yönetim bilgilendirilir. Kimliğin doğrulandıktan sonra sana özel bağlantı gönderilebilir.',completeTitle:'Şifren yenilendi',completeDone:'Yeni şifrenle uygulamaya giriş yapabilirsin.',sending:'İstek gönderiliyor…',checking:'Bağlantı kontrol ediliyor…',saving:'Şifre kaydediliyor…',codeChecking:'Kod doğrulanıyor…',invalidPhone:'Geçerli bir telefon numarası gir.',different:'Şifreler aynı değil.',tooMany:'Çok fazla deneme. Biraz sonra tekrar dene.',sendError:'İstek gönderilemedi. Biraz sonra tekrar dene.',codeInvalid:'Kod geçersiz veya süresi dolmuş. Yeniden bağlantı iste.',codeError:'Kod doğrulanamadı.',expired:'Bağlantı geçersiz veya süresi dolmuş. Yeniden iste.',saveError:'Şifre kaydedilemedi. Tekrar dene.',noCountry:'Ülke bulunamadı.'},
 de:{title:'Passwort vergessen?',request:'Wähle, wie du dein Passwort zurücksetzen möchtest.',email:'E-Mail',phone:'Telefon',emailLabel:'E-Mail-Adresse',phoneLabel:'Telefonnummer',country:'Ländervorwahl',find:'Land suchen',search:'Land oder Vorwahl',emailSend:'Reset-Link anfordern',phoneSend:'Link bei Verwaltung anfordern',back:'Zur Anmeldung',codeToggle:'Stattdessen E-Mail-Code nutzen',codeLabel:'Bestätigungscode',codeVerify:'Code bestätigen',newPass:'Neues Passwort',confirmPass:'Passwort wiederholen',passHelp:'Mindestens 6 Zeichen.',save:'Passwort speichern',verified:'Lege dein neues Passwort fest.',complete:'Du kannst dich mit dem neuen Passwort anmelden.',emailDoneTitle:'E-Mails prüfen',emailDone:'Wenn die Adresse als Anmeldekonto hinterlegt ist, erhältst du einen Link. Prüfe auch den Spam-Ordner.',phoneDoneTitle:'Anfrage eingegangen',phoneDone:'Ist deine Telefonnummer mit einem Konto verknüpft, wird die Verwaltung benachrichtigt. Nach Identitätsprüfung kann sie dir einen persönlichen Link schicken.',completeTitle:'Passwort geändert',completeDone:'Du kannst dich mit dem neuen Passwort anmelden.',sending:'Anfrage wird gesendet …',checking:'Link wird geprüft …',saving:'Passwort wird gespeichert …',codeChecking:'Code wird geprüft …',invalidPhone:'Bitte eine gültige Telefonnummer eingeben.',different:'Passwörter stimmen nicht überein.',tooMany:'Zu viele Versuche. Bitte später erneut probieren.',sendError:'Anfrage fehlgeschlagen. Bitte später erneut versuchen.',codeInvalid:'Code ungültig oder abgelaufen. Neuen Link anfordern.',codeError:'Code konnte nicht geprüft werden.',expired:'Link ungültig oder abgelaufen. Bitte neuen anfordern.',saveError:'Passwort konnte nicht gespeichert werden.',noCountry:'Kein Land gefunden.'},
 en:{title:'Forgot your password?',request:'Choose how to reset your password.',email:'Email',phone:'Phone',emailLabel:'Email address',phoneLabel:'Phone number',country:'Country calling code',find:'Find country',search:'Country or calling code',emailSend:'Send reset link',phoneSend:'Request link from management',back:'Back to sign in',codeToggle:'Use email code instead',codeLabel:'Verification code',codeVerify:'Verify code',newPass:'New password',confirmPass:'Confirm new password',passHelp:'At least 6 characters.',save:'Save password',verified:'Choose a new password.',complete:'You can sign in using the new password.',emailDoneTitle:'Check your inbox',emailDone:'If this email is linked to a sign-in account, a reset link will be sent. Check your spam folder too.',phoneDoneTitle:'Request received',phoneDone:'If the phone is linked to an account, management will be notified. After verifying your identity, they can send a personal link.',completeTitle:'Password updated',completeDone:'You can sign in using your new password.',sending:'Sending request…',checking:'Verifying link…',saving:'Saving password…',codeChecking:'Verifying code…',invalidPhone:'Enter a valid phone number.',different:'Passwords do not match.',tooMany:'Too many attempts. Try again later.',sendError:'Could not send request. Try again later.',codeInvalid:'Invalid or expired code. Request a new link.',codeError:'Could not verify code.',expired:'Invalid or expired link. Request another.',saveError:'Could not save password.',noCountry:'No country found.'}
};
let method='email',phase='request',busy=false,completed=false,statusKey='',statusError=false;
const t=()=>copy[getLanguage()]||copy.tr;
const setText=(id,val)=>{$(id).textContent=val;};
const status=(key='',error=false)=>{statusKey=key;statusError=error;setText('recoveryStatus',key?t()[key]||key:'');$('recoveryStatus').classList.toggle('error',error);};
const fold=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLocaleLowerCase();
function fillCountries(){
 const selected=$('recoveryCountry').value||'TR',query=fold($('recoveryCountrySearch').value.trim());
 let countries=localizedCallingCountries(getLanguage()).filter(c=>!query||fold([c.name,c.english,c.iso,c.code,'+'+c.code].join(' ')).includes(query));
 if(/^\+?\d{1,4}$/.test(query)){const code=query.replace(/^\+/,'');countries.sort((a,b)=>Number(b.code===code)-Number(a.code===code));}
 $('recoveryCountry').innerHTML=countries.length?countries.map(c=>'<option value="'+c.iso+'">'+c.flag+' +'+c.code+' · '+c.name+'</option>').join(''):'<option value="">'+t().noCountry+'</option>';
 $('recoveryCountry').disabled=!countries.length;
 if(countries.length)$('recoveryCountry').value=countries.some(c=>c.iso===selected)?selected:countries[0].iso;
}
function render(){
 const x=t();
 translate();
 document.documentElement.lang=getLanguage();
 document.title=x.title+' · AYA PARK 2';
 for(const [id,v] of Object.entries({recoveryTitle:phase==='request'?x.title:phase==='verified'?x.newPass:phase==='complete'?x.completeTitle:x.title,recoveryHelp:phase==='request'?x.request:phase==='verified'?x.verified:phase==='complete'?x.complete:'',recoveryEmailMethod:x.email,recoveryPhoneMethod:x.phone,recoveryEmailLabel:x.emailLabel,recoveryPhoneLabel:x.phoneLabel,recoveryCountryFindLabel:x.find,requestResetButton:x.emailSend,requestPhoneResetButton:x.phoneSend,recoveryCodeToggle:x.codeToggle,recoveryCodeEmailLabel:x.emailLabel,recoveryCodeLabel:x.codeLabel,verifyRecoveryCodeButton:x.codeVerify,newPasswordLabel:x.newPass,confirmPasswordLabel:x.confirmPass,passwordHelp:x.passHelp,saveNewPassword:x.save,recoveryBack:x.back,recoveryDoneTitle:phase==='sent_email'?x.emailDoneTitle:phase==='sent_phone'?x.phoneDoneTitle:x.completeTitle,recoveryDoneText:phase==='sent_email'?x.emailDone:phase==='sent_phone'?x.phoneDone:x.completeDone})){setText(id,v);}
 const lc=getLanguage();$('recoveryLanguage').innerHTML='<img class="flag" alt="" src="./assets/'+lc+'.svg"> '+lc.toUpperCase();
 $('recoveryLanguage').setAttribute('aria-label',lc==='de'?'Sprache wechseln':lc==='en'?'Change language':'Dili değiştir');
 $('recoveryCountrySearch').placeholder=x.search;$('recoveryCountrySearch').setAttribute('aria-label',x.search);
 $('recoveryCountry').setAttribute('aria-label',x.country);
 $('recoveryEmailMethod').setAttribute('aria-pressed',String(method==='email'));
 $('recoveryPhoneMethod').setAttribute('aria-pressed',String(method==='phone'));
 $('recoveryMethodPicker').hidden=phase!=='request';
 $('requestResetForm').hidden=phase!=='request'||method!=='email';
 $('requestPhoneResetForm').hidden=phase!=='request'||method!=='phone';
 $('recoveryDonePanel').hidden=!['sent_email','sent_phone','complete'].includes(phase);
 $('recoveryCodeToggle').hidden=phase!=='sent_email';
 $('verifyRecoveryCodeForm').hidden=phase!=='sent_email'||!$('verifyRecoveryCodeForm').dataset.shown;
 $('newPasswordForm').hidden=phase!=='verified';
 status(statusKey,statusError);
 fillCountries();
 document.dispatchEvent(new Event('ay2:languagechange'));
}
function choose(next){if(busy||phase!=='request')return;method=next;$('verifyRecoveryCodeForm').dataset.shown='';status();render();}
$('recoveryEmailMethod').addEventListener('click',()=>choose('email'));
$('recoveryPhoneMethod').addEventListener('click',()=>choose('phone'));
$('recoveryLanguage').addEventListener('click',()=>{setLanguage(nextLanguage(getLanguage()));render();});
$('recoveryCountrySearch').addEventListener('input',fillCountries);
$('recoveryPhone').addEventListener('input',()=>{
 const iso=findCountryFromInternational($('recoveryPhone').value);
 if(iso&&$('recoveryCountry').value!==iso){$('recoveryCountrySearch').value='';fillCountries();$('recoveryCountry').value=iso;}
});
$('requestResetForm').addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy)return;busy=true;$('requestResetButton').disabled=true;status('sending');
 try{
  await api.requestReset($('recoveryEmail').value.trim(),new URL('./reset.html',location.href).href);
  $('recoveryCodeEmail').value=$('recoveryEmail').value.trim();
  phase='sent_email';status();render();
 }catch(err){status(err.status===429?'tooMany':'sendError',true);}
 finally{busy=false;$('requestResetButton').disabled=false;}
});
$('requestPhoneResetForm').addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy)return;
 const normalized=normalizePhone(loginWithCountry($('recoveryPhone').value,countryCallingCode($('recoveryCountry').value)));
 if(!/^\+[1-9][0-9]{9,14}$/.test(normalized)){status('invalidPhone',true);return;}
 busy=true;$('requestPhoneResetButton').disabled=true;status('sending');
 try{await api.requestPhoneReset(normalized);phase='sent_phone';status();render();}
 catch(err){status(err.status===429?'tooMany':'sendError',true);}
 finally{busy=false;$('requestPhoneResetButton').disabled=false;}
});
$('recoveryCodeToggle').addEventListener('click',()=>{
 $('verifyRecoveryCodeForm').dataset.shown='1';render();$('recoveryCode').focus();
});
$('verifyRecoveryCodeForm').addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy)return;busy=true;$('verifyRecoveryCodeButton').disabled=true;status('codeChecking');
 try{
  await api.beginWithEmailCode($('recoveryCodeEmail').value.trim(),$('recoveryCode').value.trim());
  phase='verified';status();render();$('newPassword').focus();
 }catch(err){status(err.status===400||err.status===401?'codeInvalid':'codeError',true);}
 finally{busy=false;$('verifyRecoveryCodeButton').disabled=false;}
});
$('newPasswordForm').addEventListener('submit',async ev=>{
 ev.preventDefault();if(busy||completed)return;
 if($('newPassword').value!==$('confirmPassword').value){status('different',true);$('confirmPassword').focus();return;}
 busy=true;$('saveNewPassword').disabled=true;status('saving');
 try{await api.savePassword($('newPassword').value);completed=true;phase='complete';status();render();$('newPasswordForm').reset();}
 catch(err){
  if([401,403].includes(err.status)){api.clear();phase='request';method='email';status('expired',true);render();}
  else status('saveError',true);
 }finally{busy=false;$('saveNewPassword').disabled=false;hidePasswords();}
});
window.addEventListener('pagehide',()=>{api.clear();$('newPasswordForm').reset();hidePasswords();});
render();
if(incoming.present){
 $('recoveryMethodPicker').hidden=true;$('requestResetForm').hidden=true;$('requestPhoneResetForm').hidden=true;
 status('checking');
 try{
  if(incoming.error)throw Error('Expired link');
  await api.begin(incoming.payload);
  phase='verified';status();render();$('newPassword').focus();
 }catch{api.clear();phase='request';method='email';status('expired',true);render();}
}
