import {escapeHtml as escape} from './core.mjs?v=5.8.1';
import {today} from './v3-domain.mjs?v=5.9.0';
import {getLanguage} from './i18n.mjs?v=5.8.1';

export const invitableRelationship=link=>['owner','tenant','representative'].includes(link.role)
 && (!link.starts_on||link.starts_on<=today()) && link.archive_reason!=='mistake';

export const inviteEligible=(state,person)=>state.mode==='connected' && state.data.role==='super'
 && Boolean(person?.id) && person?.registered!==true && (!person?.auth_user_id||person?.provisional===true)
 && (state.data.links||[]).some(link=>link.person_id===person.id && invitableRelationship(link));

export function whatsappNumber(input) {
 const raw=String(input||'').trim();
 if(!raw || !/^[+()\d\s./-]+$/.test(raw))return '';
 let digits=raw.replace(/\D/g,'');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(digits.length===10 && digits.startsWith('5'))digits='90'+digits;
 else if(digits.length===11 && digits.startsWith('05'))digits='90'+digits.slice(1);
 if(digits.length<10||digits.length>15||digits.startsWith('0'))return '';
 return digits;
}
export function whatsappShareUrl(phone,message) {
 const number=whatsappNumber(phone);
 return number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):'';
}
export function inviteText({name,units,link='',language='tr',contactKind='phone'}) {
 const unit=String(units||'').trim();
 const salutation=String(name||'')+(unit?' ('+unit+')':'');
 return language==='de'
 ? '🏡 Willkommen bei AYAPARK 2!\n\nHallo '+salutation+' 👋\n\nUnsere App bietet dir Informationen zu Hausgeld, Mitteilungen und deiner Wohnung.\n\n📲 Konto erstellen:\n'+(link||'[EINLADUNGSLINK]')+'\n\n🔐 '+(contactKind==='email'?'Persönliche Einladung.':'Anmeldung ohne E-Mail.')+' 7 Tage gültig und nur einmal verwendbar.\n\nAYAPARK 2 Verwaltung 🌿'
 : '🏡 AYAPARK 2’ye Hoş Geldiniz!\n\nMerhaba '+salutation+' 👋\n\nSite yönetim uygulamamızla aidat, duyuru ve daire bilgilerinize kolayca ulaşabilirsiniz.\n\n📲 Hesabınızı oluşturmak için:\n'+(link||'[DAVET BAĞLANTISI]')+'\n\n🔐 '+(contactKind==='email'?'Kişisel davet.':'E-posta gerekmez.')+' Bağlantı 7 gün geçerlidir ve yalnızca bir kez kullanılabilir.\n\nAYAPARK 2 Site Yönetimi 🌿';
}
const tx=(tr,de)=>getLanguage()==='de'?de:tr;
const $=id=>document.getElementById(id);
const replacePlaceholder=(message,link)=>/\[(?:EINLADUNGSLINK|DAVET BAĞLANTISI)\]/.test(message)
 ?message.replace(/\[(?:EINLADUNGSLINK|DAVET BAĞLANTISI)\]/g,link):message+'\n\n'+link;

export function bindInvitations({api,getState,rerender,onActivated,openPhoneLogin}) {
 let selected=null,inviteUrl='',preview=null,token=null,inviteBusy=false;
 const dialog=$('inviteDialog');
 const status=$('inviteStatus');
 const message=$('inviteMessage');
 const copyText=$('inviteCopyText'),copyLink=$('inviteCopyLink'),share=$('inviteWhatsApp');
 const setStatus=(value,error=false)=>{status.textContent=value;status.classList.toggle('error',error);};
 const toggleSend=()=>{const ready=Boolean(inviteUrl);copyText.disabled=!ready;copyLink.disabled=!ready;share.disabled=!ready||!whatsappNumber($('invitePhone').value);};
 function open(personId){
  const s=getState(),person=s.data.persons?.find(p=>p.id===personId);
  if(!inviteEligible(s,person))throw Error(tx('Bu kişi davet için uygun değil.','Für diese Person ist keine Einladung möglich.'));
  const units=[...new Set(s.data.links.filter(link=>link.person_id===person.id&&invitableRelationship(link))
   .map(link=>s.data.units.find(unit=>unit.id===link.unit_id)?.code).filter(Boolean))].join(', ');
  selected={id:person.id,name:person.full_name||'',units,email:person.email||''};
  inviteUrl='';
  $('invitePersonLabel').textContent=selected.name+' · '+(units||'—')+' · '+selected.email;
  $('invitePhone').value=person.phone||'';
  $('inviteEmail').value=person.email||'';$('inviteContactKind').value=person.phone?'phone':'email';$('inviteEmailField').hidden=$('inviteContactKind').value!=='email';
  message.value=inviteText({name:selected.name,units,language:getLanguage(),contactKind:$('inviteContactKind').value});
  $('inviteConfirm').checked=false;
  $('inviteGenerate').disabled=false;
  $('inviteLink').value='';
  setStatus(person.invite_expires_at&&Date.parse(person.invite_expires_at)>Date.now()?tx('Geçerli bir davet var. Yeni bağlantı oluşturmak önceki bağlantıyı iptal eder.','Eine gültige Einladung liegt vor. Ein neuer Link macht den bisherigen ungültig.'):tx('Bağlantı henüz oluşturulmadı.','Noch kein Einladungslink erzeugt.'));
  toggleSend();dialog.showModal();
 }
 $('inviteRevoke').addEventListener('click',async()=>{
  if(inviteBusy)return;
  if(!selected||!$('inviteConfirm').checked){setStatus(tx('Önce erişim onayını işaretleyin.','Bitte zuerst die Bestätigung aktivieren.'),true);return;}
  const b=$('inviteRevoke');inviteBusy=true;b.disabled=true;$('inviteGenerate').disabled=true;
  try{await api.invitation({action:'revoke',person_id:selected.id,confirmed:true},true);inviteUrl='';$('inviteLink').value='';message.value=inviteText({name:selected.name,units:selected.units,language:getLanguage(),contactKind:$('inviteContactKind').value});toggleSend();setStatus(tx('Bekleyen davetler iptal edildi.','Ausstehende Einladungen widerrufen.'));}
  catch(e){setStatus(e.message,true);}finally{inviteBusy=false;b.disabled=false;$('inviteGenerate').disabled=false;}
 });
 $('invitePhone').addEventListener('input',()=>{if(inviteUrl){inviteUrl='';$('inviteLink').value='';message.value=inviteText({name:selected.name,units:selected.units,language:getLanguage(),contactKind:$('inviteContactKind').value});setStatus(tx('Numara değişti. Yeni bağlantı oluşturun.','Nummer geändert. Bitte einen neuen Link erstellen.'));}toggleSend();});
 $('inviteEmail').addEventListener('input',()=>{inviteUrl='';$('inviteLink').value='';toggleSend();});
 $('inviteContactKind').addEventListener('change',()=>{inviteUrl='';$('inviteLink').value='';$('inviteEmailField').hidden=$('inviteContactKind').value!=='email';toggleSend();});
 $('inviteGenerate').addEventListener('click',async ()=>{
  if(!selected||inviteBusy)return;
  if(!$('inviteConfirm').checked){setStatus(tx('Önce bu kişi için erişim yetkisini onaylayın.','Bitte zuerst die Bestätigung für die Kontofreischaltung aktivieren.'),true);return;}
  const s=getState(),button=$('inviteGenerate');
  if(!inviteEligible(s,s.data.persons.find(p=>p.id===selected.id))){setStatus(tx('Kişi bilgileri değişti. Sayfayı yenileyin.','Der Personenstatus hat sich geändert. Bitte aktualisieren.'),true);return;}
  inviteBusy=true;button.disabled=true;$('inviteRevoke').disabled=true;setStatus(tx('Hesap hazırlanıyor ve güvenli bağlantı oluşturuluyor…','Konto wird vorbereitet und der geschützte Link erstellt…'));
  try{
   const phone=whatsappNumber($('invitePhone').value);
   if($('inviteContactKind').value!=='email'&&!phone)throw Error(tx('Geçerli bir WhatsApp numarası girin.','Bitte eine gültige WhatsApp-Nummer eintragen.'));
   const result=await api.invitation({action:'create',person_id:selected.id,phone,contact_kind:$('inviteContactKind').value,email:$('inviteEmail').value,confirmed:true},true);
   if(typeof result?.url!=='string'||!result.url.startsWith(new URL('./',location.href).href+'?invite='))throw Error(tx('Sunucudan geçerli bir davet bağlantısı alınamadı. Lütfen tekrar deneyin.','Der Server hat keinen gültigen Einladungslink geliefert. Bitte erneut versuchen.'));
   const person=s.data.persons.find(p=>p.id===selected.id);if(person)person.invite_expires_at=result.expires_at;
   inviteUrl=result.url;
   $('inviteLink').value=inviteUrl;
   message.value=inviteText({name:selected.name,units:selected.units,link:inviteUrl,language:getLanguage(),contactKind:$('inviteContactKind').value});
   toggleSend();
   setStatus(tx('Bağlantı hazır. 7 gün geçerlidir. Gönderim sadece sizin onayınızla yapılır.','Link erstellt, 7 Tage gültig. Es wird nichts automatisch verschickt.'));
  }catch(error){setStatus(error.message||tx('Bağlantı oluşturulamadı.','Der Link konnte nicht erzeugt werden.'),true);}
  finally{inviteBusy=false;button.disabled=false;$('inviteRevoke').disabled=false;}
 });
 async function copy(value){
  if(!inviteUrl)return;
  try{await navigator.clipboard.writeText(value);setStatus(tx('Kopyalandı.','Kopiert.'));}
  catch{setStatus(tx('Kopyalama başarısız. Metni seçip manuel kopyalayın.','Kopieren fehlgeschlagen. Bitte Text markieren und manuell kopieren.'),true);}
 }
 copyText.addEventListener('click',()=>void copy(message.value));
 copyLink.addEventListener('click',()=>void copy(inviteUrl));
 share.addEventListener('click',()=>{
  if(!inviteUrl)return;
  const url=whatsappShareUrl($('invitePhone').value,message.value);
  if(!url){setStatus(tx('Geçerli bir telefon numarası girin.','Bitte eine gültige Telefonnummer eingeben.'),true);return;}
  window.open(url,'_blank','noopener,noreferrer');
 });
 dialog.addEventListener('close',()=>{selected=null;inviteUrl='';});
 function landing(){
  if(!token)return '';
  if(preview?.error)return '<section class="card invite-landing" role="alert"><h2>'+escape(tx('Davet bağlantısı geçersiz','Einladungslink ungültig'))+'</h2><p>'+escape(preview.error)+'</p></section>';
  const headline=preview?.first_name?tx('Hoş geldiniz, ','Willkommen, ')+preview.first_name:tx('Kişisel davet bağlantısı','Persönlicher Einladungslink');
  return '<section class="card invite-landing"><h2>'+escape(headline)+'</h2><p>'+escape(preview?.unit_code||'AYAPARK 2')+' · '+escape(preview?.phone_hint||'')+'</p><p>'+escape(tx('Bu bağlantı ile şifrenizi oluşturabilirsiniz. Bağlantı yalnızca bir kez kullanılır.','Du kannst hier dein Passwort erstellen. Der Link ist nur einmal einlösbar.'))+'</p><button type="button" class="button primary" data-action="invite_activate" '+(!preview?.valid?'disabled':'')+'>'+escape(tx('Hesabımı etkinleştir','Konto aktivieren'))+'</button></section>';
 }
 async function inspect(){
  const raw=new URLSearchParams(location.search).get('invite');
  if(!raw)return;
  token=raw.length<=2048?raw:null;
  if(!token){preview={error:tx('Bağlantı çok uzun.','Link ist ungültig.')};rerender();return;}
  try{preview=await api.invitation({action:'inspect',token},false);}
  catch{preview={error:tx('Bağlantının süresi dolmuş veya henüz etkinleştirilmemiş olabilir. Yönetimden yeni bağlantı isteyin.','Der Link ist abgelaufen oder noch nicht aktiviert. Bitte die Verwaltung um einen neuen Link.')};}
  if(getState().mode==='signedout')rerender();
 }
 function clearUrl(){
  if(!token)return;
  const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.pathname+url.search+url.hash);token=null;preview=null;
 }
 const form=$('inviteActivateForm'),activationStatus=$('inviteActivateStatus'),activationDialog=$('inviteActivateDialog');
 $('inviteActivationCancel').addEventListener('click',()=>activationDialog.close());
 form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!token||!preview?.valid)return;
  const password=$('inviteActivationPassword').value,again=$('inviteActivationConfirm').value;
  if([...password].length<6||password!==again){activationStatus.textContent=tx('Şifre en az 6 karakter olmalı ve aynı girilmeli.','Das Passwort muss mindestens 6 Zeichen haben und zweimal übereinstimmen.');return;}
  const submit=$('inviteActivationSubmit');submit.disabled=true;
  activationStatus.textContent=tx('Hesabınız etkinleştiriliyor…','Dein Konto wird aktiviert…');
  try{
   const result=await api.invitation({action:'activate',token,password});
   const phone=result.identifier||result.phone;
   clearUrl();activationDialog.close();form.reset();
   try{await onActivated({phone,password});}
   catch{
    openPhoneLogin(phone);
   }
  }catch(err){activationStatus.textContent=err.message||tx('Hesap etkinleştirilemedi.','Konto konnte nicht aktiviert werden.');}
  finally{submit.disabled=false;}
 });
 return {open,landing,inspect,clearUrl,activate(){if(preview?.valid){activationStatus.textContent='';activationDialog.showModal();}}};
}
