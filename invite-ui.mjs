import {escapeHtml as escape} from './core.mjs?v=5.1.0';
import {activeAt} from './v3-domain.mjs?v=5.1.0';
import {getLanguage} from './i18n.mjs?v=5.1.0';

export const inviteEligible=(state,person)=>state.mode==='connected' && state.data.role==='super'
 && Boolean(person?.id)
 && (state.data.links||[]).some(link=>link.person_id===person.id && ['owner','tenant'].includes(link.role) && activeAt(link));

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
export function inviteText({name,units,link='',language='tr'}) {
 const label=String(units||'').trim();
 return language==='de'
 ? 'Hallo '+name+',\n\nwir laden dich zur AYAPARK 2 Hausverwaltungs-App ein'+(label?' ('+label+')':'')+'.\n\nÜber den persönlichen Einladungslink kannst du die Anmeldung beginnen. Bestätige anschließend deine hinterlegte E-Mail-Adresse mit dem dort angeforderten Code. Der Einladungslink gewährt allein noch keinen Zugang zu deinen Wohnungsdaten.\n\n'+(link||'[EINLADUNGSLINK]')+'\n\nViele Grüße\nAYAPARK 2 Verwaltung'
 : 'Merhaba '+name+',\n\nAYAPARK 2 site yönetimi uygulamasına davetlisiniz'+(label?' ('+label+')':'')+'.\n\nKişisel davet bağlantısını açıp kayıtlı e-posta adresinize gelen kodla hesabınızı etkinleştirebilirsiniz. Bağlantı tek başına daire bilgilerine erişim sağlamaz.\n\n'+(link||'[DAVET BAĞLANTISI]')+'\n\nSaygılarımızla\nAYAPARK 2 Yönetimi';
}
const tx=(tr,de)=>getLanguage()==='de'?de:tr;
const $=id=>document.getElementById(id);
const replacePlaceholder=(message,link)=>/\[(?:EINLADUNGSLINK|DAVET BAĞLANTISI)\]/.test(message)
 ?message.replace(/\[(?:EINLADUNGSLINK|DAVET BAĞLANTISI)\]/g,link):message+'\n\n'+link;

export function bindInvitations({api,getState,rerender,openSetup}) {
 let selected=null,inviteUrl='',preview=null,token=null;
 const dialog=$('inviteDialog');
 const status=$('inviteStatus');
 const message=$('inviteMessage');
 const copyText=$('inviteCopyText'),copyLink=$('inviteCopyLink'),share=$('inviteWhatsApp');
 const setStatus=(value,error=false)=>{status.textContent=value;status.classList.toggle('error',error);};
 const toggleSend=()=>{const ready=Boolean(inviteUrl);copyText.disabled=!ready;copyLink.disabled=!ready;share.disabled=!ready||!whatsappNumber($('invitePhone').value);};
 function open(personId){
  const s=getState(),person=s.data.persons?.find(p=>p.id===personId);
  if(!inviteEligible(s,person))throw Error(tx('Bu kişi davet için uygun değil.','Für diese Person ist keine Einladung möglich.'));
  const units=[...new Set(s.data.links.filter(link=>link.person_id===person.id&&['owner','tenant'].includes(link.role)&&activeAt(link))
   .map(link=>s.data.units.find(unit=>unit.id===link.unit_id)?.code).filter(Boolean))].join(', ');
  selected={id:person.id,name:person.full_name||'',units,email:person.email||''};
  inviteUrl='';
  $('invitePersonLabel').textContent=selected.name+' · '+(units||'—');
  $('invitePhone').value=person.phone||'';
  message.value=inviteText({name:selected.name,units,language:getLanguage()});
  $('inviteConfirm').checked=false;
  $('inviteGenerate').disabled=false;
  $('inviteLink').value='';
  setStatus(tx('Bağlantı henüz oluşturulmadı.','Noch kein Einladungslink erzeugt.'));
  toggleSend();dialog.showModal();
 }
 $('invitePhone').addEventListener('input',toggleSend);
 $('inviteGenerate').addEventListener('click',async ()=>{
  if(!selected)return;
  if(!$('inviteConfirm').checked){setStatus(tx('Önce yetki ve e-posta doğrulaması açıklamasını onaylayın.','Bitte zuerst die Bestätigung für die Kontofreischaltung aktivieren.'),true);return;}
  const s=getState(),button=$('inviteGenerate');
  if(!inviteEligible(s,s.data.persons.find(p=>p.id===selected.id))){setStatus(tx('Kişi bilgileri değişti. Sayfayı yenileyin.','Der Personenstatus hat sich geändert. Bitte aktualisieren.'),true);return;}
  button.disabled=true;setStatus(tx('Hesap hazırlanıyor ve güvenli bağlantı oluşturuluyor…','Konto wird vorbereitet und der geschützte Link erstellt…'));
  try{
   // Uses the existing manager-only provisioning endpoint. No email or WhatsApp is sent.
   const currentPerson=s.data.persons.find(p=>p.id===selected.id);
   if(!currentPerson?.auth_user_id)await api.provision({site_id:s.data.site.id,person_id:selected.id,access_role:'resident',confirmation:true});
   const result=await api.invitation({action:'create',person_id:selected.id},true);
   if(typeof result?.url!=='string'||!result.url.startsWith('https://kemcap.github.io/ayapark2/?invite='))throw Error('Invalid invitation response');
   inviteUrl=result.url;
   $('inviteLink').value=inviteUrl;
   message.value=replacePlaceholder(message.value,inviteUrl);
   toggleSend();
   setStatus(tx('Bağlantı hazır. 48 saat geçerlidir. Gönderim sadece sizin onayınızla yapılır.','Link erstellt, 48 Stunden gültig. Es wird nichts automatisch verschickt.'));
  }catch(error){setStatus(error.message||tx('Bağlantı oluşturulamadı.','Der Link konnte nicht erzeugt werden.'),true);}
  finally{button.disabled=false;}
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
  return '<section class="card invite-landing"><h2>'+escape(headline)+'</h2><p>'+escape(preview?.unit_code||'AYAPARK 2')+'</p><p>'+escape(tx('Giriş için kayıtlı e-posta adresinizdeki doğrulama kodu gereklidir. Davet bağlantısı tek başına erişim vermez.','Zum Anmelden benötigst du den Code an deine hinterlegte E-Mail-Adresse. Der Link allein gewährt keinen Zugang.'))+'</p><button type="button" class="button primary" data-action="invite_activate" '+(!preview?.valid?'disabled':'')+'>'+escape(tx('Hesabımı etkinleştir','Konto aktivieren'))+'</button></section>';
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
 return {open,landing,inspect,clearUrl,activate(){if(preview?.valid)openSetup();}};
}
