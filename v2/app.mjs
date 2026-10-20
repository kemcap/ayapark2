import {escapeHtml as e,money,roleName,visibleUnits,allowedPages,summarize,demoData,parseCsv} from './core.mjs';
import {ReadonlyApi} from './api.mjs';
const $=id=>document.getElementById(id);
const api=new ReadonlyApi();
let data=demoData(),mode='demo',page='overview',filter={q:'',block:'all',status:'all',type:'all'},busy=false,epoch=0,toastTimer;
const paths={overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',units:'<path d="M4 21h16M6 21V4l6-2 6 2v17M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5"/>',dues:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',transactions:'<path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/>',reports:'<path d="M4 20h17M7 16V9m5 7V4m5 12v-5"/>',settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',up:'<path d="M6 17 18 5M6 5h12v12"/>',down:'<path d="M18 7 6 19M6 7v12h12"/>',wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4M4 5v14h17V7H5m16 5h-6v4h6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',plus:'<path d="M12 5v14M5 12h14"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.units}</svg>`;
const labels={overview:'Genel bakış',units:'Daireler',dues:'Aidat & borçlar',transactions:'Banka hareketleri',reports:'Mali raporlar',settings:'Erişim & ayarlar'};
const units=()=>visibleUnits(data.units,data.role,data.ownIds);
const finance=()=>mode==='demo';
const own=()=>data.role==='resident';
const date=value=>new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(value));
const go=(target,text)=>`<button class="text-button" data-go="${target}">${text}${icon('arrow')}</button>`;
const empty=(title,description)=>`<div class="empty"><div class="icon-box">${icon('reports')}</div><h3>${title}</h3><p>${description}</p></div>`;
const card=(title,subtitle,body,action='')=>`<article class="card"><div class="card-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>${body}</article>`;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function heading(title,description,actions=''){
 return `<div class="print-only">Ayapark 2 · ${mode==='demo'?'ÖRNEK VERİLER — RESMİ RAPOR DEĞİLDİR':'Bağlı hesap · Salt okunur'} · ${new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'})}</div><div class="page-heading"><div><div class="eyebrow">${mode==='demo'?'EKİM 2026 · ÖRNEK DÖNEM':'AYAPARK 2 · BAĞLI HESAP'}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function metric(label,value,note,type='reports',amber=false){return `<div class="metric"><div class="meta">${label}<span class="icon-box ${amber?'amber':''}">${icon(type)}</span></div><strong>${value}</strong><small>${note}</small></div>`;}
function balanceCard(){
 const s=summarize(data.transactions,data.opening||0);
 const value=own()?(units().length===1?e(units()[0].code):units().length+' daire'):money(finance()?s.balance:null);
 return `<div class="balance"><div class="meta">${icon(own()?'units':'wallet')}${own()?'Daireniz':'Site hesabı'}</div><div class="value">${value}</div><div class="balance-bottom"><span>${own()?'Size tanımlı bağımsız bölüm':finance()?'Örnek banka bakiyesi':'Banka defteri henüz bağlanmadı'}</span><span>${own()?'Kişisel görünüm':finance()?'20 Eki 2026':'Salt okunur'}</span></div></div>`;
}
function cashCard(){
 if(!finance())return card('Gelir & gider','Mali veriler',empty('Mali defter henüz hazır değil.','Banka hareketleri ve tahakkuklar bağlandığında doğrulanmış tutarlar burada görünecek.'));
 const s=summarize(data.transactions);
 return card('Bu ayın özeti','Ekim 2026 · tüm örnek hareketler',`<div class="cash-summary"><div><small>Tahsil edilen</small><strong>${money(s.income)}</strong></div><div class="expense"><small>Harcanan</small><strong>${money(s.expense)}</strong></div></div><div class="chart-track"><progress aria-label="Gelirin toplam hareketlere oranı" max="${s.income+s.expense}" value="${s.income}"></progress></div><div class="chart-caption"><span>Gelir %${Math.round(s.income/(s.income+s.expense)*100)}</span><span>Gider %${Math.round(s.expense/(s.income+s.expense)*100)}</span></div>`,go('reports','Rapor'));
}
function unitMap(){
 return ['A','B'].map(block=>{const list=units().filter(u=>u.block===block);if(!list.length)return '';return `<div class="section-label">${block} BLOK <span>${list.length} daire</span></div><div class="unit-grid">${list.map(u=>`<button class="unit-tile ${u.debt==null?'neutral':u.debt>0?'debt':''}" data-unit="${e(u.id)}" aria-label="${e(u.code)} · ${u.debt==null?'Mali bilgi yok':u.debt>0?'Açık bakiye '+money(u.debt):'Borç yok'}">${u.number}</button>`).join('')}</div>`;}).join('');
}
function activityRow(t){return `<div class="activity"><span class="icon-box ${t.cents<0?'amber':''}">${icon(t.cents>0?'down':'up')}</span><div class="detail"><b>${e(t.desc)}</b><small>${date(t.date)} · ${e(t.category)}</small></div><span class="amount ${t.cents>0?'in':'out'}">${t.cents>0?'+':''}${money(t.cents)}</span></div>`;}
function dashboard(){
 const debt=units().reduce((n,u)=>n+(u.debt||0),0),due=units().filter(u=>u.debt>0).length;
 const actions=own()?go('dues','Aidat durumum'):data.role==='super'&&finance()?`<button class="button primary" data-import>${icon('plus')}CSV önizle</button>`:'';
 const summary=balanceCard()+metric(own()?'Kalan borcunuz':'Toplam alacak',money(finance()?debt:null),finance()?(own()?'Örnek daire hesabı':due+' dairede açık bakiye'):'Tahakkuk defteri bekleniyor','clock',true)+metric(own()?'Tanımlı daire':'Daire durumu',String(units().length),own()?'Hesabınızla ilişkilendirilen':`${units().filter(u=>u.occupancy_status==='occupied').length} dolu · ${units().filter(u=>u.occupancy_status==='vacant').length} boş`,'units');
 const tasks=own()?`<div class="task"><span class="task-index">01</span><div><b>Aidat durumunu inceleyin</b><p>Kendi dairenizin hesabına buradan ulaşın.</p>${go('dues','Hesabı aç')}</div></div><div class="task"><span class="task-index">02</span><div><b>Sitenin mali raporu</b><p>Ortak gelir ve giderlere genel bakış.</p>${go('reports','Raporu incele')}</div></div>`:`<div class="task"><span class="task-index">01</span><div><b>${finance()?due+' dairenin açık bakiyesi var':'Daire kayıtlarını kontrol edin'}</b><p>${finance()?'Tahsilat takibine borç listesinden başlayın.':'Bağlı hesabın erişebildiği güncel daireler.'}</p>${go(finance()?'dues':'units',finance()?'Borçlara git':'Daireleri aç')}</div></div><div class="task"><span class="task-index">02</span><div><b>${finance()?'Banka dosyasını inceleyin':'Mali kayıtlar sonraki aşamada'}</b><p>${finance()?'İçe aktarmadan önce tarih ve tutarları kontrol edin.':'Banka, tahakkuk ve mahsup modeli hazırlanmalı.'}</p>${go('transactions','Banka hareketleri')}</div></div>`;
 const right=own()?`<div class="resident-card"><div class="eyebrow">SAKİN PANELİ</div><h2>Siteniz, elinizin altında.</h2><p class="muted">Kendi dairenize ait bilgileri ve ortak mali özeti tek yerden inceleyin.</p></div>`:card('Dairelere hızlı bakış','Detay için bir daire seçin.',unitMap()+`<div class="legend">${finance()?'<span><i></i>Borç yok</span><span><i class="amber"></i>Açık bakiye</span>':'<span>Mali durum henüz bağlı değil.</span>'}</div>`,go('units','Tümü'));
 return heading(own()?'Hoş geldiniz.':'Siteniz bugün nasıl?',own()?'Daireniz ve ortak yaşamınız hakkında bilmeniz gerekenler.':'Güncel durum, bekleyen işler ve mali görünüm bir arada.',actions)+`<div class="summary-grid">${summary}</div><div class="main-grid"><div>${cashCard()}${!own()?card('Son hesap hareketleri','En son gerçekleşen işlemler',finance()?data.transactions.slice(0,4).map(activityRow).join(''):empty('Henüz banka kaydı yok.','Bu sürümde canlı banka hesabına veya ödeme defterine bağlantı kurulmadı.'),go('transactions','Tümü')):card('Daire bilgileriniz','Hesabınıza tanımlı daireler',unitTable(units()))}</div><div class="overview-right"><div>${right}</div><div>${card(own()?'Hızlı erişim':'Sırada ne var?','İhtiyacınız olan yere doğrudan gidin.',tasks)}</div></div></div>`;
}
function unitTable(list,dues=false){
 return `<div class="table-wrap"><table><caption>${list.length} daire · ${finance()?'Örnek kayıtlar':'Hesabınızın erişebildiği kayıtlar'}</caption><thead><tr><th scope="col">Daire</th><th scope="col">${dues?'Mali durum':'Kullanım'}</th><th scope="col" class="numeric">Açık bakiye</th><th scope="col">Detay</th></tr></thead><tbody>${list.length?list.map(u=>`<tr><td><strong>${e(u.code)}</strong><small class="block-small">${e(u.block)} Blok</small></td><td>${dues?`<span class="badge ${u.debt==null?'neutral':u.debt>0?'amber':''}">${u.debt==null?'Henüz bağlı değil':u.debt>0?'Ödeme bekleniyor':'Borç yok'}</span>`:`<span class="badge ${u.occupancy_status==='occupied'?'':'neutral'}">${{occupied:'Dolu',vacant:'Boş',unknown:'Belirtilmedi'}[u.occupancy_status]||'Belirtilmedi'}</span>`}</td><td class="numeric">${money(u.debt)}</td><td><button class="unit-link" data-unit="${e(u.id)}" aria-label="${e(u.code)} detayını aç">İncele ↗</button></td></tr>`).join(''):'<tr><td colspan="4">Bu filtrelere uyan daire bulunamadı.</td></tr>'}</tbody></table></div>`;
}
function filtered(){const q=filter.q.toLocaleLowerCase('tr-TR').replaceAll(/\s/g,'');return units().filter(u=>u.code.toLocaleLowerCase('tr-TR').replaceAll('-','').includes(q.replaceAll('-',''))&&(filter.block==='all'||u.block===filter.block)&&(filter.status==='all'||(filter.status==='debt'?u.debt>0:filter.status==='paid'?u.debt===0:u.occupancy_status===filter.status)));}
function directory(dues=false){
 const statusOptions=dues?'<option value="debt">Borcu olanlar</option><option value="paid">Borcu olmayanlar</option>':'<option value="occupied">Dolu daireler</option><option value="vacant">Boş daireler</option><option value="unknown">Belirtilmedi</option>';
 return heading(dues?(own()?'Aidat durumum':'Aidat & borçlar'):(own()?'Dairem':'Daireler'),dues?'Açık bakiyeyi daire bazında inceleyin.':'Daireyi bulun, durumunu ve hesabını açın.')+(!finance()&&dues?'<div class="info-strip">Mali kayıtlar henüz bağlanmadı. Çizgi (—), sıfır borç anlamına gelmez.</div>':'')+`<div class="card"><div class="toolbar"><label class="sr-only" for="unitSearch">Daire ara</label><input type="search" id="unitSearch" placeholder="Daire ara · A-4, B-10" value="${e(filter.q)}"><label class="sr-only" for="blockFilter">Blok</label><select id="blockFilter"><option value="all">Tüm bloklar</option><option value="A">A Blok</option><option value="B">B Blok</option></select><label class="sr-only" for="statusFilter">Durum</label><select id="statusFilter"><option value="all">Tüm durumlar</option>${statusOptions}</select><span class="count" id="resultCount" aria-live="polite">${filtered().length} daire</span></div><div id="unitResults">${unitTable(filtered(),dues)}</div></div>`;
}
function bank(){
 return heading('Banka hareketleri','Ödemelerin ve harcamaların izini kaybetmeyin.',finance()&&data.role==='super'?'<button class="button primary" data-import>CSV önizle</button>':'')+(!finance()?card('Hesap defteri','Canlı mali kayıtlar',empty('Banka defteri henüz bağlanmadı.','Daire kayıtlarıyla banka hareketleri ayrı tutulur. Bu alanda henüz canlı para hareketi gösterilmiyor.')):`<div class="card"><div class="toolbar"><label class="sr-only" for="txnSearch">İşlem ara</label><input id="txnSearch" type="search" placeholder="Açıklama veya kategori ara" value="${e(filter.q)}"><label class="sr-only" for="txnFilter">Hareket türü</label><select id="txnFilter"><option value="all">Tüm hareketler</option><option value="in">Tahsilatlar</option><option value="out">Giderler</option></select></div><div id="transactionResults">${transactionTable()}</div></div>`);
}
function transactionTable(){const q=filter.q.toLocaleLowerCase('tr-TR');const list=data.transactions.filter(t=>(filter.type==='all'||(filter.type==='in'?t.cents>0:t.cents<0))&&(t.desc+' '+t.category).toLocaleLowerCase('tr-TR').includes(q));return `<div class="table-wrap"><table><caption>${list.length} örnek hareket</caption><thead><tr><th scope="col">Tarih</th><th scope="col">Açıklama</th><th scope="col">Kategori</th><th scope="col" class="numeric">Tutar</th></tr></thead><tbody>${list.map(t=>`<tr><td>${date(t.date)}</td><td>${e(t.desc)}</td><td><span class="badge neutral">${e(t.category)}</span></td><td class="numeric amount ${t.cents>0?'in':'out'}">${t.cents>0?'+':''}${money(t.cents)}</td></tr>`).join('')||'<tr><td colspan="4">Bu filtreye uyan hareket bulunamadı.</td></tr>'}</tbody></table></div>`;}
function reports(){
 if(!finance())return heading('Mali raporlar','Ortak yaşamın mali görünümü, açık ve anlaşılır.')+card('Yayımlanan raporlar','Doğrulanmış mali veriler',empty('Henüz yayımlanmış rapor yok.','Gerçek banka ve tahakkuk kayıtları bağlanmadan rapor veya tahmini toplam gösterilmez.'));
 const s=summarize(data.transactions,data.opening);const cats=new Map();data.transactions.filter(t=>t.cents<0).forEach(t=>cats.set(t.category,(cats.get(t.category)||0)-t.cents));
 return heading('Mali raporlar','Ekim 2026 · örnek kayıtlarla hesaplanan aylık özet.','<button class="button" id="printReport">Yazdır / PDF</button>')+'<div class="info-strip">Örnek rapor · Resmi hesap özeti değildir. Toplamlar aşağıdaki örnek hareketlerden hesaplanır.</div>'+`<div class="main-grid"><div>${card('Hesap özeti','Açılış + gelir − gider = kapanış',[['Dönem başı bakiyesi',data.opening],['Tahsilat',s.income],['Gider',s.expense],['Dönem farkı',s.net],['Dönem sonu bakiyesi',s.balance]].map(([label,value])=>`<div class="report-total"><span>${label}</span><strong>${money(value)}</strong></div>`).join(''))}</div><div>${card('Giderlerin dağılımı','Aynı dönemin gerçekleşen örnek giderleri',[...cats].map(([name,value])=>`<div class="distribution"><div class="row"><span>${e(name)}</span><strong>${money(value)}</strong></div><progress aria-label="${e(name)} gider payı" max="${s.expense}" value="${value}"></progress></div>`).join(''))}</div></div>`;
}
function settings(){return heading('Erişim & ayarlar','Doğru bilgi, doğru kişiye.')+`<div class="info-strip">${mode==='demo'?'Rol seçimi yalnızca örnek görünümü değiştirir.':'Rolünüz mevcut Supabase üyeliğinden doğrulandı: '+e(data.serverRole)+'.'} Kişiye özel ek izinler henüz uygulanmadı.</div>`+card('Üç görünüm, açık sorumluluklar','Mevcut aşamada canlı kayıtlar yalnızca okunabilir.',`<div class="table-wrap"><table><thead><tr><th scope="col">Görünüm</th><th scope="col">Erişim</th><th scope="col">Mevcut sunucu rolü</th></tr></thead><tbody><tr><td>Süper Admin</td><td>Tüm daireleri görüntüleme</td><td>manager</td></tr><tr><td>Yönetim</td><td>Yetkili daireleri görüntüleme</td><td>deputy / auditor</td></tr><tr><td>Site Sakini</td><td>Yalnızca kendi dairesi</td><td>Aktif daire bağlantısı</td></tr></tbody></table></div><p class="fine">Yönetim için ek izin tanımlama ve mali işlem onayları ayrı bir veritabanı geçişi gerektirir. Bu ekran izinleri değiştirmez.</p>`)+card('Bağlantı ve gizlilik',mode==='demo'?'Örnek veriler':'Mevcut Supabase projesi',`<p class="muted">${mode==='demo'?'Bu görünüm tamamen örnek kayıtlardan oluşur. Gerçek bilgileri okumak için hesabınızla giriş yapın.':'Daire bilgileri mevcut hesabınızın erişim kurallarıyla yüklenir. Oturum bu sekmenin belleğinde tutulur.'}</p><p class="fine">Sürüm 2.0 geliştirme · Mevcut canlı uygulama ve ortak veritabanı şeması değiştirilmedi.</p>`);}
function render(focus=false){
 if(!allowedPages(data.role).includes(page))page='overview';
 if(location.hash!=='#'+page)history.replaceState(null,'','#'+page);
 document.title=`${labels[page]} · Ayapark 2 V2`;
 $('nav').innerHTML=allowedPages(data.role).map(p=>`<a href="#${p}" ${p===page?'aria-current="page"':''}>${icon(p)}${p==='units'&&own()?'Dairem':p==='dues'&&own()?'Aidat durumum':labels[p]}</a>`).join('');
 $('breadcrumb').textContent=`${roleName(data.role)} / ${labels[page]}`;
 $('roleControl').hidden=mode!=='demo';$('roleSelect').value=data.role;
 $('modeBadge').textContent=mode==='demo'?'Örnek veriler':'Bağlı · salt okunur';$('modeBadge').classList.toggle('connected',mode!=='demo');
 $('contextText').textContent=mode==='demo'?'Tasarım önizlemesi · Tüm tutarlar örnektir.':`Daire kayıtları güncel · ${data.loadedAt||''} · Mali kayıtlar henüz bağlı değil.`;
 $('footerMode').textContent=mode==='demo'?'Örnek veriler':'Supabase · Salt okunur';
 $('connectionButton').textContent=mode==='demo'?'Hesabımla giriş':'Çıkış yap';$('refreshButton').hidden=mode==='demo';
 $('content').innerHTML=({overview:dashboard,units:()=>directory(false),dues:()=>directory(true),transactions:bank,reports,settings})[page]();
 if($('blockFilter'))$('blockFilter').value=filter.block;
 if($('statusFilter'))$('statusFilter').value=filter.status;
 if($('txnFilter'))$('txnFilter').value=filter.type;
 if(focus)$('content').focus({preventScroll:true});
}
function navigate(target){page=allowedPages(data.role).includes(target)?target:'overview';filter={q:'',block:'all',status:'all',type:'all'};render(true);window.scrollTo({top:0,behavior:'instant'});}
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
function openDetail(id){
 const u=units().find(u=>u.id===id);if(!u)return;
 $('detailContent').innerHTML=`<div class="dialog-kicker">${e(u.block)} BLOK · DAİRE DETAYI</div><h2 id="detailTitle">${e(u.code)}</h2><p class="muted">${finance()?'Örnek daire kaydı':'Hesabınızın erişebildiği güncel kayıt'}</p><div class="detail-grid"><div><small>Kullanım durumu</small><strong>${{occupied:'Dolu',vacant:'Boş',unknown:'Belirtilmedi'}[u.occupancy_status]||'Belirtilmedi'}</strong></div><div><small>Açık bakiye</small><strong>${money(u.debt)}</strong></div></div><p class="fine">${finance()?'Bu tutar yalnızca tasarım içindir. Ödeme talebi veya gerçek borç bildirimi değildir.':'Mali kayıtlar henüz bağlanmadı. “—” sıfır borç anlamına gelmez.'}</p>`;
 $('detailDialog').showModal();
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.go){if(location.hash==='#'+button.dataset.go)navigate(button.dataset.go);else location.hash=button.dataset.go;}
 if(button.dataset.unit)openDetail(button.dataset.unit);
 if(button.hasAttribute('data-import')&&mode==='demo'&&data.role==='super'){$('csvFile').value='';$('importPreview').textContent='Henüz dosya seçilmedi.';$('importDialog').showModal();}
 if(button.id==='printReport')window.print();
});
document.addEventListener('input',event=>{
 if(event.target.id==='unitSearch'){filter.q=event.target.value;$('unitResults').innerHTML=unitTable(filtered(),page==='dues');$('resultCount').textContent=filtered().length+' daire';}
 if(event.target.id==='txnSearch'){filter.q=event.target.value;$('transactionResults').innerHTML=transactionTable();}
});
document.addEventListener('change',event=>{
 if(event.target.id==='blockFilter'||event.target.id==='statusFilter'){filter[event.target.id==='blockFilter'?'block':'status']=event.target.value;$('unitResults').innerHTML=unitTable(filtered(),page==='dues');$('resultCount').textContent=filtered().length+' daire';}
 if(event.target.id==='txnFilter'){filter.type=event.target.value;$('transactionResults').innerHTML=transactionTable();}
});
$('roleSelect').addEventListener('change',event=>{if(mode!=='demo')return;data.role=event.target.value;['detailDialog','importDialog'].forEach(id=>{if($(id).open)$(id).close();});filter={q:'',block:'all',status:'all',type:'all'};render();});
$('connectionButton').addEventListener('click',async()=>{
 if(mode==='demo'){$('loginMessage').textContent='';$('loginDialog').showModal();return;}
 epoch++;mode='demo';data=demoData();navigate('overview');
 try{await api.logout();toast('Bu sekmedeki oturum kapatıldı.');}catch{toast('Bu sekmedeki oturum temizlendi. Sunucuda çıkış doğrulanamadı.');}
});
$('cancelLogin').addEventListener('click',()=>$('loginDialog').close());
$('loginDialog').addEventListener('close',()=>{
 $('password').value='';
 if(busy){epoch++;void api.logout().catch(()=>{});busy=false;$('loginSubmit').disabled=false;}
});
$('loginForm').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;const attempt=++epoch;
 $('loginSubmit').disabled=true;$('loginMessage').textContent='Hesabınız ve erişim yetkiniz doğrulanıyor…';$('loginMessage').classList.remove('error');
 try{
  await api.login($('email').value.trim(),$('password').value);$('password').value='';
  const loaded=await api.load();if(attempt!==epoch)return;
  data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};mode='connected';busy=false;$('loginDialog').close();$('loginForm').reset();navigate('overview');toast('Daire kayıtları yüklendi. Bu sürüm salt okunurdur.');
 }catch(error){
  if(attempt!==epoch)return;
  await api.logout().catch(()=>{});
  if(attempt!==epoch)return;
  $('loginMessage').textContent=error.message;$('loginMessage').classList.add('error');
 }finally{if(attempt===epoch){busy=false;$('loginSubmit').disabled=false;}}
});
$('refreshButton').addEventListener('click',async()=>{
 if(mode!=='connected')return;const attempt=epoch;$('refreshButton').disabled=true;
 try{const loaded=await api.load();if(attempt!==epoch||mode!=='connected')return;data={...loaded,loadedAt:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})};render();toast('Daire bilgileri güncellendi.');}
 catch(error){if(attempt!==epoch)return;if([401,403].includes(error.status)){epoch++;void api.logout().catch(()=>{});mode='demo';data=demoData();navigate('overview');toast('Erişim doğrulanamadı. Yeniden giriş yapın.');}else{$('contextText').textContent='Güncelleme başarısız · Ekranda önceki okumanın bilgileri var: '+(data.loadedAt||'');toast(error.message);}}
 finally{$('refreshButton').disabled=false;}
});
let fileRead=0;
$('csvFile').addEventListener('change',async()=>{
 const generation=++fileRead,file=$('csvFile').files[0];if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('Dosya en fazla 2 MB olabilir.');
  if(!file.name.toLowerCase().endsWith('.csv'))throw Error('Yalnızca CSV dosyaları desteklenir.');
  const text=await file.text();if(generation!==fileRead)return;
  const {entries,duplicates}=parseCsv(text);const s=summarize(entries);
  $('importPreview').innerHTML=`<strong>${entries.length} satır okundu · ${duplicates} olası tekrar</strong><p class="fine">Gelir ${money(s.income)} · Gider ${money(s.expense)}<br>Tekrarlar bu dosyanın içindeki eşleşmelerdir; banka kayıtlarıyla karşılaştırılmadı. Hiçbir kayıt aktarılmadı.</p><div class="table-wrap"><table><caption>İlk 5 satır · ${e(file.name)}</caption><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th></tr></thead><tbody>${entries.slice(0,5).map(t=>`<tr><td>${e(t.date)}</td><td>${e(t.desc)}</td><td>${money(t.cents)}${t.duplicate?' · Tekrar':''}</td></tr>`).join('')}</tbody></table></div>`;
 }catch(error){if(generation===fileRead)$('importPreview').textContent=error.message;}
});
$('importDialog').addEventListener('close',()=>{fileRead++;$('csvFile').value='';$('importPreview').textContent='Henüz dosya seçilmedi.';});
navigate(location.hash.slice(1)||'overview');
