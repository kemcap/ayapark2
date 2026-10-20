import {escapeHtml as e,money,roleName,parseCsv} from './core.mjs';
import {fullDemo,demoCommand,refreshDebts,monthlySummary} from './ledger.mjs';
import {AyaparkApi} from './api.mjs';
import {icon,labels,pages,can,visible,renderPage,unitTable,filteredUnits,transactionTable,unitDetail,transactionDetail,button,date} from './ui.mjs';
import {buildForm,payloadFor} from './forms.mjs';
const $=id=>document.getElementById(id),api=new AyaparkApi();
const state={data:fullDemo(),mode:'demo',page:'overview',period:'2026-10',filter:{q:'',block:'all',status:'all',type:'all',period:'all'},stale:false};
let epoch=0,loginBusy=false,writeBusy=false,formAction=null,toastTimer,fileGeneration=0,importPayload=null;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,8000);}
function render(focus=false){
 if(!pages(state).includes(state.page))state.page='overview';
 if(location.hash!=='#'+state.page)history.replaceState(null,'','#'+state.page);
 const d=state.data,own=d.role==='resident';document.title=labels[state.page]+' · Ayapark 2';
 $('nav').innerHTML=pages(state).map(p=>`<a href="#${p}" ${p===state.page?'aria-current="page"':''}>${icon(p)}${p==='units'&&own?'Dairem':p==='dues'&&own?'Aidat durumum':labels[p]}</a>`).join('');
 $('breadcrumb').textContent=roleName(d.role)+' / '+labels[state.page];
 $('roleControl').hidden=state.mode!=='demo';$('roleSelect').value=d.role;
 $('modeBadge').textContent=state.mode==='demo'?'Örnek veriler':'Bağlı hesap';$('modeBadge').classList.toggle('connected',state.mode!=='demo');
 $('contextText').textContent=state.mode==='demo'?'Örnek çalışma alanı · Değişiklikler bu sayfayla sınırlıdır.':state.stale?'Kayıt kaydedildi; görünüm yenilenemedi. Yenile düğmesine basın.':'Son okuma '+(d.loadedAt||'')+' · Kayıtlar hesabınızın yetkileriyle gösterilir.';
 $('footerMode').textContent=state.mode==='demo'?'Örnek veriler':'Supabase · V2 kayıtları';$('connectionButton').textContent=state.mode==='demo'?'Hesabımla giriş':'Çıkış yap';$('refreshButton').hidden=state.mode==='demo';
 $('content').innerHTML=renderPage(state);
 for(const [id,value] of [['blockFilter',state.filter.block],['statusFilter',state.filter.status],['txnFilter',state.filter.type],['periodFilter',state.filter.period]])if($(id))$(id).value=value;
 if(focus)$('content').focus({preventScroll:true});
}
function navigate(page){state.page=page;state.filter={q:'',block:'all',status:'all',type:'all',period:'all'};render(true);window.scrollTo({top:0,behavior:'instant'});}
function closeDialogs(){for(const id of ['detailDialog','actionDialog','importDialog'])if($(id).open)$(id).close();$('detailContent').textContent='';$('actionFields').textContent='';}
async function reload(){const attempt=epoch,loaded=await api.load();if(attempt!==epoch||state.mode!=='connected')throw Error('Oturum değişti.');state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.stale=false;render();}
async function mutate(action,payload){
 if(state.mode==='demo'){const r=demoCommand(state.data,action,payload);refreshDebts(state.data);render();return r;}
 const attempt=epoch,result=await api.command(state.data.site.id,action,payload);if(attempt!==epoch)throw Error('Oturum değişti.');
 try{await reload();}catch(error){if(attempt!==epoch)throw error;state.stale=true;render();}
 return result;
}
function permissionFor(action){return ['settings','permissions','publish_report'].includes(action)?'admin':action==='person'?'people':action==='announcement'?'announcements':action==='import'?'import':'finance';}
function showForm(action,args={}){
 if(writeBusy)throw Error('Önce devam eden işlemin tamamlanmasını bekleyin.');
 if(!can(state,permissionFor(action)))throw Error('Bu işlem için yetkiniz yok.');
 if($('detailDialog').open)$('detailDialog').close();
 const built=buildForm(state,action,{period:state.period,...args});formAction={action,context:built.context};
 $('actionTitle').textContent=built.title;$('actionFields').innerHTML=built.body;$('actionMessage').textContent='';$('actionMessage').classList.remove('error');$('actionDialog').showModal();
}
function showDetail(html){if(!html)return;$('detailContent').innerHTML=html;if(!$('detailDialog').open)$('detailDialog').showModal();}
function staged(){
 if(!can(state,'finance'))return;
 const rows=state.data.staged.filter(x=>!x.confirmed_charge&&!x.ignored_reason);
 showDetail(`<div class="dialog-kicker">DEVİR KONTROLÜ</div><h2 id="detailTitle">Eski bakiye kayıtları</h2><p class="muted">Listeler tek kez alındı. Belge başlığındaki dönem ve basım tarihi farklı olabilir. Daire, dönem ve mükerrer kayıt kontrolü yapın.</p><div class="table-wrap"><table><thead><tr><th>Kişi / Kaynak daire</th><th class="numeric">Tutar</th><th>İşlem</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${e(r.person_label)}<small class="block-small">${e(r.unit_hint||'Daire belirtilmedi')} · ${r.kind==='enforcement'?'İcra listesi':'Genel liste'}</small></td><td class="numeric">${money(Number(r.cents))}</td><td>${button('Teyit et','confirm_staged',`data-id="${e(r.id)}"`)}${button('Hariç tut','ignore_staged',`data-id="${e(r.id)}"`)}</td></tr>`).join('')||'<tr><td colspan="3">Bekleyen devir kaydı yok.</td></tr>'}</tbody></table></div>`);
}
function downloadCsv(filename,rows){const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';const safe=v=>/^[=+@\-\t\r]/.test(String(v))?"'"+v:v;const csv='\uFEFF'+rows.map(r=>r.map(v=>cell(typeof v==='number'?v.toLocaleString('tr-TR',{useGrouping:false,maximumFractionDigits:2}):safe(v))).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReport(){
 const d=state.data,r=can(state,'finance')?monthlySummary(d,state.period):null,published=d.reports.find(r=>r.period.slice(0,7)===state.period);
 if(!r&&!published)throw Error('Bu dönem için yayımlanmış rapor yok.');const vals=r?[r.balance-r.net,r.income,r.expense,r.balance]:[published.opening_cents,published.income_cents,published.expense_cents,published.closing_cents];
 downloadCsv(`ayapark2-${state.period}-${state.mode==='demo'?'ornek':'rapor'}.csv`,[['Ayapark 2',state.mode==='demo'?'ÖRNEK VERİLER':'Mali rapor'],['Dönem',state.period],...['Açılış','Gelir','Gider','Kapanış'].map((l,i)=>[l,Number(vals[i])/100])]);
}
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 try{
  if(action==='unit')return showDetail(unitDetail(state,b.dataset.id));
  if(action==='transaction'){if(can(state,'finance'))showDetail(transactionDetail(state,b.dataset.id));return;}
  if(action==='staged')return staged();
  if(action==='print')return window.print();
  if(action==='export_report')return exportReport();
  if(action==='export_bank'){if(!can(state,'finance'))return;downloadCsv('ayapark2-banka-'+(state.mode==='demo'?'ornek':'kayitlar')+'.csv',[['Tarih','Açıklama','Kategori','Tutar TL','Referans'],...state.data.transactions.filter(t=>state.filter.period==='all'||t.date.slice(0,7)===state.period).map(t=>[t.date,t.desc,t.category,t.cents/100,t.bank_reference||t.reference||''])]);return;}
  if(action==='import'){
   if(!can(state,'import'))return;importPayload=null;$('csvFile').value='';$('importPreview').textContent='Henüz dosya seçilmedi.';$('commitImport').disabled=true;$('importDialog').showModal();return;
  }
  showForm(action,{id:b.dataset.id,unit:b.dataset.unit,entry:b.dataset.entry,charge:b.dataset.charge});
 }catch(error){toast(error.message);}
});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
$('roleSelect').addEventListener('change',event=>{if(state.mode!=='demo')return;closeDialogs();state.data.role=event.target.value;render();});
document.addEventListener('input',event=>{
 if(event.target.id==='unitSearch'){state.filter.q=event.target.value;$('unitResults').innerHTML=unitTable(state,filteredUnits(state));$('resultCount').textContent=filteredUnits(state).length+' daire';}
 if(event.target.id==='txnSearch'){state.filter.q=event.target.value;$('transactionResults').innerHTML=transactionTable(state);}
});
document.addEventListener('change',event=>{
 const id=event.target.id;
 if(['blockFilter','statusFilter','txnFilter','periodFilter'].includes(id)){
  const key={blockFilter:'block',statusFilter:'status',txnFilter:'type',periodFilter:'period'}[id];state.filter[key]=event.target.value;
  if(id==='blockFilter'||id==='statusFilter'){$('unitResults').innerHTML=unitTable(state,filteredUnits(state));$('resultCount').textContent=filteredUnits(state).length+' daire';}else $('transactionResults').innerHTML=transactionTable(state);
 }
 if(id==='reportPeriod'&&/^\d{4}-\d{2}$/.test(event.target.value)){state.period=event.target.value;render();}
});
$('cancelAction').addEventListener('click',()=>{if(!writeBusy)$('actionDialog').close();});
$('actionDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('actionForm').addEventListener('submit',async event=>{
 event.preventDefault();if(writeBusy||!formAction)return;const attempt=epoch;
 try{
  const {action,context}=formAction,payload=payloadFor(action,new FormData($('actionForm')),context);
  writeBusy=true;$('saveAction').disabled=true;$('cancelAction').disabled=true;$('actionMessage').textContent='Kaydediliyor…';
  await mutate(action==='ignore_staged'?'confirm_staged':action,payload);
  if(attempt!==epoch)return;$('actionDialog').close();toast(state.stale?'Kaydedildi; görünüm yenilenemedi. Yenile düğmesine basın.':state.mode==='demo'?'Örnek çalışma alanında kaydedildi.':'Kayıt tamamlandı.');
 }catch(error){if(attempt===epoch){$('actionMessage').textContent=error.message;$('actionMessage').classList.add('error');}}
 finally{writeBusy=false;$('saveAction').disabled=false;$('cancelAction').disabled=false;}
});
$('connectionButton').addEventListener('click',async()=>{
 if(state.mode==='demo'){$('loginMessage').textContent='';$('loginDialog').showModal();return;}
 epoch++;closeDialogs();state.mode='demo';state.data=fullDemo();state.stale=false;navigate('overview');
 try{await api.logout();toast('Oturum kapatıldı.');}catch{toast('Bu sekmedeki oturum temizlendi; sunucu çıkışı doğrulanamadı.');}
});
$('cancelLogin').addEventListener('click',()=>$('loginDialog').close());
$('loginDialog').addEventListener('close',()=>{$('password').value='';if(loginBusy){epoch++;void api.logout().catch(()=>{});loginBusy=false;$('loginSubmit').disabled=false;}});
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(loginBusy)return;loginBusy=true;const attempt=++epoch;$('loginSubmit').disabled=true;$('loginMessage').textContent='Hesap ve erişim yetkileri doğrulanıyor…';$('loginMessage').classList.remove('error');
 try{await api.login($('email').value.trim(),$('password').value);$('password').value='';const loaded=await api.load();if(attempt!==epoch)return;state.data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};state.mode='connected';state.stale=false;state.period=loaded.transactions.map(t=>t.date.slice(0,7)).sort().at(-1)||new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}).slice(0,7);loginBusy=false;$('loginDialog').close();$('loginForm').reset();navigate('overview');toast('Hesabınız açıldı.');}
 catch(error){if(attempt!==epoch)return;await api.logout().catch(()=>{});if(attempt!==epoch)return;$('loginMessage').textContent=error.message;$('loginMessage').classList.add('error');}
 finally{if(attempt===epoch){loginBusy=false;$('loginSubmit').disabled=false;}}
});
$('refreshButton').addEventListener('click',async()=>{
 if(state.mode!=='connected')return;const attempt=epoch;$('refreshButton').disabled=true;
 try{await reload();toast('Kayıtlar güncellendi.');}
 catch(error){if(attempt!==epoch)return;if([400,401,403].includes(error.status)){epoch++;closeDialogs();void api.logout().catch(()=>{});state.mode='demo';state.data=fullDemo();navigate('overview');toast('Erişim doğrulanamadı. Yeniden giriş yapın.');}else{state.stale=true;render();toast('Veriler yenilenemedi. Ekranda önceki okuma var.');}}
 finally{$('refreshButton').disabled=false;}
});
$('csvFile').addEventListener('change',async()=>{
 const generation=++fileGeneration,file=$('csvFile').files[0];importPayload=null;$('commitImport').disabled=true;if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('Dosya en fazla 2 MB olabilir.');if(!file.name.toLowerCase().endsWith('.csv'))throw Error('CSV dosyası seçin.');
  const raw=await file.text();if(generation!==fileGeneration)return;const parsed=parseCsv(raw);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');if(generation!==fileGeneration)return;
  importPayload={source:file.name,digest,entries:parsed.entries.map(t=>({date:t.date,desc:t.desc,cents:t.cents,category:'Diğer'}))};
  $('importPreview').innerHTML=`<strong>${parsed.entries.length} satır · ${parsed.duplicates} dosya içi olası tekrar</strong><p class="fine">Henüz kayıt oluşturulmadı. Sunucu aynı hareketleri tekrar kaydetmez. Banka referansı bulunmayan aynı tarih/açıklama/tutarlı CSV satırları tekrar kabul edilmez; ayrı gerçek hareketler için bankanın referanslı kaydını kullanın.</p><div class="table-wrap"><table><caption>İlk 5 satır</caption><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr></thead><tbody>${parsed.entries.slice(0,5).map(t=>`<tr><td>${e(t.date)}</td><td>${e(t.desc)}</td><td>${money(t.cents)}</td></tr>`).join('')}</tbody></table></div>`;
  $('commitImport').disabled=false;
 }catch(error){if(generation===fileGeneration)$('importPreview').textContent=error.message;}
});
$('commitImport').addEventListener('click',async()=>{
 if(!importPayload||writeBusy)return;const attempt=epoch,payload=importPayload;writeBusy=true;$('commitImport').disabled=true;
 try{const r=await mutate('import',payload);if(attempt!==epoch)return;importPayload=null;$('importPreview').textContent=`${r.inserted} hareket kaydedildi, ${r.duplicates} tekrar atlandı.${state.stale?' Görünümü yenileyin.':''}`;toast('Dosya kontrolü ve aktarımı tamamlandı.');}
 catch(error){if(attempt===epoch){$('importPreview').textContent=error.message;$('commitImport').disabled=false;}}
 finally{writeBusy=false;}
});
$('importDialog').addEventListener('cancel',event=>{if(writeBusy)event.preventDefault();});
$('importDialog').addEventListener('close',()=>{fileGeneration++;importPayload=null;$('csvFile').value='';$('importPreview').textContent='Henüz dosya seçilmedi.';});
navigate(location.hash.slice(1)||'overview');
