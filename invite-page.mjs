import {AyaparkApi} from './api.mjs?v=5.1.0';
import {Invitations,readInvitation,newDeviceSecret} from './invitations.mjs';
import {t as tr,getLanguage,setLanguage} from './i18n.mjs?v=5.1.0';
const $=id=>document.getElementById(id),invite=readInvitation(location,history),api=new AyaparkApi(),invites=new Invitations(api);
const secret=newDeviceSecret();let busy=false,until=0,lastMessage='';
const message=text=>{lastMessage=text;$('inviteStatus').textContent=tr(text);};
function language(){document.documentElement.lang=getLanguage();document.querySelectorAll('[data-tr]').forEach(x=>x.textContent=tr(x.dataset.tr));message(lastMessage);}
$('inviteLanguage').onclick=()=>{setLanguage(getLanguage()==='tr'?'de':'tr');language();};
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(error){message(error.status===503?'Davet sistemi henüz etkin değil.':'İşlem tamamlanamadı. Daveti, kodu veya yönetici onayını kontrol et.');}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
$('inviteSend').onclick=()=>void run(async()=>{if(Date.now()<until){message('Yeni kod için bir dakika bekle.');return;}await invites.call('email_send',{invite});until=Date.now()+60000;message('Kod gönderildi. E-postadaki kodu gir.');$('inviteCode').focus();});
$('inviteCodeForm').onsubmit=event=>{event.preventDefault();void run(async()=>{await invites.finish('email_finish',{invite,code:$('inviteCode').value});location.replace('./#overview');});};
$('inviteRequest').onclick=()=>void run(async()=>{const r=await invites.call('request',{invite,secret});$('inviteComparisonCode').textContent=r.code;$('inviteRequestInfo').hidden=false;$('inviteRequest').hidden=true;message('Onay bekleniyor. Kodunu yöneticiye bildir.');});
$('inviteCheck').onclick=()=>void run(async()=>{const status=await invites.call('resolve',{invite});if(status.status!=='approved'){message('Onay bekleniyor. Kodunu yöneticiye bildir.');return;}await invites.finish('manual_finish',{invite,secret});location.replace('./#overview');});
language();
if(!invite)message('Davet bağlantısı geçersiz. Yöneticiden yeni davet iste.');
else void run(async()=>{const r=await invites.call('resolve',{invite});$('inviteEmailStep').hidden=r.mode!=='email';$('inviteManualStep').hidden=r.mode!=='manual';$('inviteEmail').textContent=r.email||'';});
