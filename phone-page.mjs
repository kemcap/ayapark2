import {AyaparkApi} from './api.mjs?v=5.1.0';
import {PhoneAccess,activationToken,normalizePhone} from './phone-auth.mjs';
import {t as tr,getLanguage,setLanguage} from './i18n.mjs?v=5.1.0';
const $=id=>document.getElementById(id),adminMode=location.hash==='#admin';
const invite=activationToken(location,history),api=new AyaparkApi(),phone=new PhoneAccess(api);
let busy=false,until=0;
const message=text=>$('phoneStatus').textContent=tr(text);
const language=()=>{document.documentElement.lang=getLanguage();document.querySelectorAll('[data-tr]').forEach(x=>x.textContent=tr(x.dataset.tr));};
$('phoneLanguage').onclick=()=>{setLanguage(getLanguage()==='de'?'tr':'de');language();};
const errors={phone_access_disabled:'Telefonla giriş henüz etkin değil. Yöneticiye başvur.',invalid_phone:'Telefonu uluslararası biçimde gir: +90…',invalid_code:'Kod geçersiz veya süresi dolmuş. Yeni bir kod iste.'};
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(x=>x.disabled=true);try{await fn();}catch(e){message((e.status===503?'Telefonla giriş henüz etkin değil. Yöneticiye başvur.':errors[e.message])||'İşlem tamamlanamadı. Daveti, telefonunu ve kodu kontrol et.');}finally{busy=false;document.querySelectorAll('button').forEach(x=>x.disabled=false);}}
const body=()=>invite?{invite}:{phone:normalizePhone($('phoneNumber').value)};
$('phoneForm').onsubmit=e=>{e.preventDefault();void run(async()=>{if(Date.now()<until){message('Yeni kod için bir dakika bekle.');return;}await phone.call(invite?'send':'login_send',{...body(),channel:$('phoneChannel').value});until=Date.now()+60000;$('phoneVerifyForm').hidden=false;message('Kod gönderildi. Telefonundaki kodu gir.');$('phoneCode').focus();});};
$('phoneVerifyForm').onsubmit=e=>{e.preventDefault();void run(async()=>{const code=$('phoneCode').value;if(invite)await phone.verify(invite,code);else{const g=api.generation,r=await phone.call('login_verify',{...body(),code});api.accept(r.session,g);}location.replace('./#overview');});};
$('phoneIssue').onclick=()=>void run(async()=>{const r=await phone.call('issue',{person_id:$('phonePerson').value,confirmation:true},true);$('phoneShare').href=r.whatsapp;$('phoneShare').hidden=false;$('phoneLink').textContent=r.link;message('Davet hazır. WhatsApp üzerinden kontrol ederek gönder.');});
$('phoneRevoke').onclick=()=>void run(async()=>{await phone.call('revoke',{person_id:$('phonePerson').value,confirmation:true},true);$('phoneShare').hidden=true;$('phoneLink').textContent='';message('Telefon daveti iptal edildi. Mevcut daire yetkileri değiştirilmedi.');});
language();
if(adminMode){$('phoneForm').hidden=true;void run(async()=>{if(!await api.restore())throw Error('denied');const d=await api.load();if(d.role!=='super')throw Error('denied');$('phoneAdmin').hidden=false;$('phonePerson').replaceChildren(...d.persons.filter(p=>p.phone).map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.full_name;return o;}));});}
else if(invite){$('phoneField').hidden=true;$('phoneNumber').required=false;void run(async()=>{const r=await phone.call('resolve',{invite});$('maskedPhone').textContent=r.masked_phone;});}
