import {t as tr,getLanguage,setLanguage,bindStaticText} from './i18n.mjs';
import {escapeHtml as e,money,roleName,parseCsv} from './core.mjs';
import {fullDemo,demoCommand,refreshDebts,monthlySummary} from './ledger.mjs';
import {AyaparkApi} from './api.mjs';
import {icon,labels,pages,can,visible,renderPage,unitTable,filteredUnits,transactionTable,unitDetail,transactionDetail,button,date} from './ui.mjs';
import {buildForm,payloadFor} from './forms.mjs';
import {analyzeStage} from './reconcile.mjs';
const $=id=>document.getElementById(id),api=new AyaparkApi();
const applyStaticLanguage=bindStaticText(document.body);
let detailView=null;
const state={data:fullDemo(),mode:'demo',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all'},stale:false};
let epoch=0,loginBusy=false,writeBusy=false,formAction=null,toastTimer,fileGeneration=0,importPayload=null;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,8000);}
function render(focus=false){
 document.documentElement.lang=getLanguage();
 $('languageToggle').hidden=false;$('languageToggle').textContent=getLanguage()==='tr'?'DE':'TR';$('languageToggle').title=getLanguage()==='tr'?'Deutsch':'Türkçe';
 if(!pages(state).includes(state.page))state.page='overview';
 if(location.hash!=='#'+state.page)history.replaceState(null,'','#'+state.page);
 const d=state.data,own=d.role==='resident';document.title=labels[state.page]+' · Ayapark 2';
 $('nav').innerHTML=pages(state).map(p=>`<a href="#${p}" ${p===state.page?'aria-current="page"':''}>${icon(p)}${p==='units'&&own?tr("Dairem"):p==='dues'&&own?tr("Aidat durumum"):labels[p]}</a>`).join('');
 $('breadcrumb').textContent=roleName(d.role)+' / '+labels[state.page];
 $('roleControl').hidden=state.mode!=='demo';$('roleSelect').value=d.role;
 $('modeBadge').textContent=state.mode==='demo'?tr("Örnek veriler"):tr("Bağlı hesap");$('modeBadge').classList.toggle('connected',state.mode!=='demo');
 $('contextText').textContent=state.mode==='demo'?tr("Örnek çalışma alanı · Değişiklikler bu sayfayla sınırlıdır."):state.stale?tr("Kayıt kaydedildi; görünüm yenilenemedi. Yenile düğmesine basın."):tr("Son okuma ")+(d.loadedAt||'')+tr(" · Kayıtlar hesabınızın yetkileriyle gösterilir.");
 $('footerMode').textContent=state.mode==='demo'?tr("Örnek veriler"):tr("Supabase · V2 kayıtları");$('connectionButton').textContent=state.mode==='demo'?tr("Hesabımla giriş"):tr("Çıkış yap");$('refreshButton').hidden=state.mode==='demo';
 $('content').innerHTML=renderPage(state);
 for(const [id,value] of [['statusFilter',state.filter.status],['txnFilter',state.filter.type],['periodFilter',state.filter.period]])if($(id))$(id).value=value;
 if(focus)$('content').focus({preventScroll:true});
}
function navigate(page){state.page=page;state.filter={q:'',block:'all',status:'all',type:'all',period:'all'};render(true);window.scrollTo({top:0,behavior:'instant'});}
function closeDialogs(){for(const id of ['detailDialog','actionDialog','importDialog'])if($(id).open)$(id).close();$('detailContent').textContent='';$('actionFields').textContent='';}
async function reload(){const attempt=epoch,loaded=await api.load();if(attempt!==epoch||state.mode!=='connected')throw Error(tr("Oturum değişti."));state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.stale=false;render();}
async function mutate(action,payload){
 if(state.mode==='demo'){const r=demoCommand(state.data,action,payload);refreshDebts(state.data);render();return r;}
 const attempt=epoch,result=await api.command(state.data.site.id,action,payload);if(attempt!==epoch)throw Error(tr("Oturum değişti."));
 try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
 return result;
}
function permissionFor(action){return ['settings','permissions','publish_report'].includes(action)?'admin':action==='person'?'people':action==='announcement'?'announcements':action==='import'?'import':'finance';}
function showForm(action,args={}){
 if(writeBusy)throw Error(tr("Önce devam eden işlemin tamamlanmasını bekleyin."));
 if(!can(state,permissionFor(action)))throw Error(tr("Bu işlem için yetkiniz yok."));
 if($('detailDialog').open)$('detailDialog').close();
 const built=buildForm(state,action,{period:state.period,...args});formAction={action,args,context:built.context};
 $('actionTitle').textContent=built.title;$('actionFields').innerHTML=built.body;$('actionMessage').textContent='';$('actionMessage').classList.remove('error');$('actionDialog').showModal();
}
function showDetail(html){if(!html)return;$('detailContent').innerHTML=html;if(!$('detailDialog').open)$('detailDialog').showModal();}
function staged(){
 detailView={action:'staged'};
 if(!can(state,'finance'))return;
 const rows=state.data.staged.filter(x=>!x.confirmed_charge&&!x.ignored_reason);
 showDetail(`<div class="dialog-kicker">${tr("DEVİR KONTROLÜ")}</div><h2 id="detailTitle">${tr("Eski bakiye kayıtları")}</h2><p class="muted">${tr("Listeler tek kez alındı. Belge başlığındaki dönem ve basım tarihi farklı olabilir. Daire, dönem ve mükerrer kayıt kontrolü yapın.")}</p><div class="table-wrap"><table><thead><tr><th>${tr("Kişi / Kaynak daire")}</th><th class="numeric">${tr("Tutar")}</th><th>${tr("Kontrol")}</th><th>${tr("İşlem")}</th></tr></thead><tbody>${rows.map(r=>{const check=analyzeStage(r,state.data);return `<tr><td>${e(r.person_label)}<small class="block-small">${e(r.unit_hint||tr("Daire belirtilmedi"))} · ${r.kind==='enforcement'?tr("İcra listesi"):tr("Genel liste")}</small></td><td class="numeric">${money(Number(r.cents))}</td><td>${check.suggestedCode?e(check.suggestedCode)+' · '+(check.basis==='document'?tr("Belgede"):tr("Banka önerisi")):tr("Blok teyidi gerekli")}${check.paymentCandidates.length?`<small class="block-small error">${tr("Sonraki tahsilatı inceleyin")}</small>`:''}${check.overlaps.length?`<small class="block-small error">${tr("Başka devir kaydı da var")}</small>`:''}</td><td>${button(tr("Teyit et"),'confirm_staged',`data-id="${e(r.id)}"`)}${button(tr("Hariç tut"),'ignore_staged',`data-id="${e(r.id)}"`)}</td></tr>`;}).join('')||`<tr><td colspan="4">${tr("Bekleyen devir kaydı yok.")}</td></tr>`}</tbody></table></div>`);
}
function downloadCsv(filename,rows){const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';const safe=v=>/^[=+@\-\t\r]/.test(String(v))?"'"+v:v;const csv='\uFEFF'+rows.map(r=>r.map(v=>cell(typeof v==='number'?v.toLocaleString('tr-TR',{useGrouping:false,maximumFractionDigits:2}):safe(v))).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReport(){
 const d=state.data,r=can(state,'finance')?monthlySummary(d,state.period):null,published=d.reports.find(r=>r.period.slice(0,7)===state.period);
 if(!r&&!published)throw Error(tr("Bu dönem için yayımlanmış rapor yok."));const vals=r?[r.balance-r.net,r.income,r.expense,r.balance]:[published.opening_cents,published.income_cents,published.expense_cents,published.closing_cents];
 downloadCsv(`ayapark2-${state.period}-${state.mode==='demo'?'ornek':'rapor'}.csv`,[['Ayapark 2',state.mode==='demo'?tr("ÖRNEK VERİLER"):tr("Mali rapor")],[tr("Dönem"),state.period],...[tr("Açılış"),tr("Gelir"),tr("Gider"),tr("Kapanış")].map((l,i)=>[l,Number(vals[i])/100])]);
}
document.addEventListener('click',event=>{
 const blockButton=event.target.closest('[data-block]');
 if(blockButton){
  const block=blockButton.dataset.block;if(!['A','B'].includes(block))return;
  state.filter.block=state.filter.block===block?'all':block;
  for(const node of document.querySelectorAll('[data-block]'))node.setAttribute('aria-pressed',String(node.dataset.block===state.filter.block));
  $('unitResults').innerHTML=unitTable(state,filteredUnits(state));$('resultCount').textContent=filteredUnits(state).length+tr(' daire');
  return;
 }
 const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 try{
  if(action==='unit'){detailView={action,id:b.dataset.id};return showDetail(unitDetail(state,b.dataset.id));}
  if(action==='transaction'){if(can(state,'finance')){detailView={action,id:b.dataset.id};showDetail(transactionDetail(state,b.dataset.id));}return;}
  if(action==='staged')return staged();
  if(action==='print')return window.print();
  if(action==='export_report')return exportReport();
  if(action==='export_bank'){if(!can(state,'finance'))return;downloadCsv('ayapark2-banka-'+(state.mode==='demo'?'ornek':'kayitlar')+'.csv',[[tr("Tarih"),tr("Açıklama"),tr("Kategori"),tr("Tutar TL"),tr("Referans")],...state.data.transactions.filter(t=>state.filter.period==='all'||t.date.slice(0,7)===state.period).map(t=>[t.date,t.desc,t.category,t.cents/100,t.bank_reference||t.reference||''])]);return;}
  if(action==='import'){
   if(!can(state,'import'))return;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");$('commitImport').disabled=true;$('importDialog').showModal();return;
  }
  showForm(action,{id:b.dataset.id,unit:b.dataset.unit,entry:b.dataset.entry,charge:b.dataset.charge});
 }catch(error){toast(error.message);}
});
$('languageToggle').addEventListener('click',()=>{
 const controls=Array.from($('actionFields').querySelectorAll('input,select,textarea')).map(node=>({name:node.name,value:node.value,checked:node.checked}));
 setLanguage(getLanguage()==='tr'?'de':'tr');applyStaticLanguage();render();
 if($('detailDialog').open&&detailView){
  if(detailView.action==='staged')staged();
  else showDetail(detailView.action==='unit'?unitDetail(state,detailView.id):transactionDetail(state,detailView.id));
 }
 if($('actionDialog').open&&formAction){
  const built=buildForm(state,formAction.action,{period:state.period,...formAction.args});
  $('actionTitle').textContent=built.title;$('actionFields').innerHTML=built.body;
  for(const saved of controls){const node=$('actionFields').querySelector(`[name="${saved.name}"]`);if(node){node.value=saved.value;if(node.type==='checkbox')node.checked=saved.checked;}}
 }
 document.dispatchEvent(new Event('ay2:languagechange'));
});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
$('roleSelect').addEventListener('change',event=>{if(state.mode!=='demo')return;closeDialogs();state.data.role=event.target.value;render();});
document.addEventListener('input',event=>{
 if(event.target.id==='unitSearch'){state.filter.q=event.target.value;$('unitResults').innerHTML=unitTable(state,filteredUnits(state));$('resultCount').textContent=filteredUnits(state).length+tr(" daire");}
 if(event.target.id==='txnSearch'){state.filter.q=event.target.value;$('transactionResults').innerHTML=transactionTable(state);}
});
document.addEventListener('change',event=>{
 const id=event.target.id;
 if(['statusFilter','txnFilter','periodFilter'].includes(id)){
  const key={statusFilter:'status',txnFilter:'type',periodFilter:'period'}[id];state.filter[key]=event.target.value;
  if(id==='statusFilter'){$('unitResults').innerHTML=unitTable(state,filteredUnits(state));$('resultCount').textContent=filteredUnits(state).length+tr(" daire");}else $('transactionResults').innerHTML=transactionTable(state);
 }
 if(id==='reportPeriod'&&/^\d{4}-\d{2}$/.test(event.target.value)){state.period=event.target.value;render();}
});
$('cancelAction').addEventListener('click',()=>{if(!writeBusy)$('actionDialog').close();});
$('actionDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('actionForm').addEventListener('submit',async event=>{
 event.preventDefault();if(writeBusy||!formAction)return;const attempt=epoch;
 try{
  const {action,context}=formAction,payload=payloadFor(action,new FormData($('actionForm')),context);
  writeBusy=true;$('saveAction').disabled=true;$('cancelAction').disabled=true;$('actionMessage').textContent=tr("Kaydediliyor…");
  await mutate(action==='ignore_staged'?'confirm_staged':action,payload);
  if(attempt!==epoch)return;$('actionDialog').close();toast(state.stale?tr("Kaydedildi; görünüm yenilenemedi. Yenile düğmesine basın."):state.mode==='demo'?tr("Örnek çalışma alanında kaydedildi."):tr("Kayıt tamamlandı."));
 }catch(error){if(attempt===epoch){$('actionMessage').textContent=error.message;$('actionMessage').classList.add('error');}}
 finally{writeBusy=false;$('saveAction').disabled=false;$('cancelAction').disabled=false;}
});
$('connectionButton').addEventListener('click',async()=>{
 if(state.mode==='demo'){$('loginMessage').textContent='';$('loginDialog').showModal();return;}
 epoch++;closeDialogs();state.mode='demo';state.data=fullDemo();state.stale=false;navigate('overview');
 try{await api.logout();toast(tr("Oturum kapatıldı."));}catch{toast(tr("Bu sekmedeki oturum temizlendi; sunucu çıkışı doğrulanamadı."));}
});
$('cancelLogin').addEventListener('click',()=>$('loginDialog').close());
$('loginDialog').addEventListener('close',()=>{$('password').value='';if(loginBusy){epoch++;void api.logout().catch(()=>{});loginBusy=false;$('loginSubmit').disabled=false;}});
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(loginBusy)return;loginBusy=true;const attempt=++epoch;$('loginSubmit').disabled=true;$('loginMessage').textContent=tr("Hesap ve erişim yetkileri doğrulanıyor…");$('loginMessage').classList.remove('error');
 try{await api.login($('email').value.trim(),$('password').value);$('password').value='';const loaded=await api.load();if(attempt!==epoch)return;state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.mode='connected';state.stale=false;state.period=loaded.transactions.map(t=>t.date.slice(0,7)).sort().at(-1)||new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}).slice(0,7);loginBusy=false;$('loginDialog').close();$('loginForm').reset();navigate('overview');toast(tr("Hesabınız açıldı."));}
 catch(error){if(attempt!==epoch)return;await api.logout().catch(()=>{});if(attempt!==epoch)return;$('loginMessage').textContent=error.message;$('loginMessage').classList.add('error');}
 finally{if(attempt===epoch){loginBusy=false;$('loginSubmit').disabled=false;}}
});
$('refreshButton').addEventListener('click',async()=>{
 if(state.mode!=='connected')return;const attempt=epoch;$('refreshButton').disabled=true;
 try{await reload();toast(tr("Kayıtlar güncellendi."));}
 catch(error){if(attempt!==epoch)return;if([400,401,403].includes(error.status)){epoch++;closeDialogs();void api.logout().catch(()=>{});state.mode='demo';state.data=fullDemo();navigate('overview');toast(tr("Erişim doğrulanamadı. Yeniden giriş yapın."));}else{state.stale=true;render();toast(tr("Veriler yenilenemedi. Ekranda önceki okuma var."));}}
 finally{$('refreshButton').disabled=false;}
});
$('csvFile').addEventListener('change',async()=>{
 const generation=++fileGeneration,file=$('csvFile').files[0];importPayload=null;$('commitImport').disabled=true;if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error(tr("Dosya en fazla 2 MB olabilir."));if(!file.name.toLowerCase().endsWith('.csv'))throw Error(tr("CSV dosyası seçin."));
  const raw=await file.text();if(generation!==fileGeneration)return;const parsed=parseCsv(raw);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');if(generation!==fileGeneration)return;
  importPayload={source:file.name,digest,entries:parsed.entries.map(t=>({date:t.date,desc:t.desc,cents:t.cents,category:tr("Diğer")}))};
  $('importPreview').innerHTML=`<strong>${parsed.entries.length}${tr(" satır · ")}${parsed.duplicates}${tr(" dosya içi olası tekrar")}</strong><p class="fine">${tr("Henüz kayıt oluşturulmadı. Sunucu aynı hareketleri tekrar kaydetmez. Banka referansı bulunmayan aynı tarih/açıklama/tutarlı CSV satırları tekrar kabul edilmez; ayrı gerçek hareketler için bankanın referanslı kaydını kullanın.")}</p><div class="table-wrap"><table><caption>${tr("İlk 5 satır")}</caption><thead><tr><th>${tr("Tarih")}</th><th>${tr("Açıklama")}</th><th>${tr("Tutar")}</th></tr></thead><tbody>${parsed.entries.slice(0,5).map(t=>`<tr><td>${e(t.date)}</td><td>${e(t.desc)}</td><td>${money(t.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  $('commitImport').disabled=false;
 }catch(error){if(generation===fileGeneration)$('importPreview').textContent=error.message;}
});
$('commitImport').addEventListener('click',async()=>{
 if(!importPayload||writeBusy)return;const attempt=epoch,payload=importPayload;writeBusy=true;$('commitImport').disabled=true;
 try{const r=await mutate('import',payload);if(attempt!==epoch)return;importPayload=null;$('importPreview').textContent=`${r.inserted}${tr(" hareket kaydedildi, ")}${r.duplicates}${tr(" tekrar atlandı.")}${state.stale?tr(" Görünümü yenileyin."):''}`;toast(tr("Dosya kontrolü ve aktarımı tamamlandı."));}
 catch(error){if(attempt===epoch){$('importPreview').textContent=error.message;$('commitImport').disabled=false;}}
 finally{writeBusy=false;}
});
$('importDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('importDialog').addEventListener('close',()=>{fileGeneration++;importPayload=null;$('csvFile').value='';$('importPreview').textContent=tr("Henüz dosya seçilmedi.");});
applyStaticLanguage();
document.documentElement.lang=getLanguage();
document.dispatchEvent(new Event('ay2:languagechange'));
navigate(location.hash.slice(1)||'overview');
