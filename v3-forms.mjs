import {buildAssignmentForm,assignmentPayload} from './assignments.mjs?v=5.9.4';
import {effectiveOccupancy} from './relationships.mjs?v=5.8.1';
import {announcementTime,validateAnnouncement} from './announcement-validation.mjs?v=5.8.1';
import {t as tr,getLanguage} from './i18n.mjs?v=5.9.28';
import {escapeHtml as e,randomId,money} from './core.mjs?v=5.8.1';
import {field,buildLegacyForm,payloadLegacy} from './forms.mjs?v=5.9.56';
import {today,personName,personLinks,activeAt,dateValid} from './v3-domain.mjs?v=5.9.26';
import {roleLabel} from './v3-ui.mjs?v=5.9.54';
import {providerCategoryChoices,providerServices} from './provider-categories.mjs?v=5.9.53';

const loc=(de,trText)=>getLanguage()==='de'?de:trText;
const sel=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const text=(name,label,value='')=>`<label class="field">${tr(label)}<textarea name="${name}" maxlength="5000" rows="3">${e(value)}</textarea></label>`;
const check=(name,label,checked=false)=>`<label class="check-field"><input type="checkbox" name="${name}" ${checked?'checked':''}>${tr(label)}</label>`;
const amount=()=>field('amount',tr('Tutar (TL)'),'text','','inputmode="decimal" required placeholder="'+e(tr('Tutar girin'))+'"');
const personOptions=d=>[['',tr('Kişi seçin.')],...(d.persons||[]).map(p=>[p.id,p.full_name])];
export function buildV3Form(s,action,args={}){
 if(action.startsWith('assignment_'))return buildAssignmentForm(s.data,action,args);
 const d=s.data;let title='',body='',context={...args,request_id:randomId()};
 if(action==='user_access'){
  title=tr('Kullanıcı erişimi');
  const selected=d.persons.find(p=>p.id===args.person&&!p.archived_at);
  const linkedAccount=!!selected?.auth_user_id;
  body=`<fieldset class="person-choice"><legend>${tr('Kişi seçimi')}</legend><label class="check-field"><input type="radio" name="person_mode" value="existing" checked>${tr('Kayıtlı kişi seç')}</label><label class="check-field"><input type="radio" name="person_mode" value="new">${tr('Yeni kişi oluştur')}</label></fieldset><div id="accessExisting">${sel('person_id','Kişi',personOptions(d),selected?.id||'')}</div><div id="accessExistingEmail" hidden>${field('access_email',loc('E-Mail für den neuen Zugang','Yeni erişim için e-posta'),'email','','maxlength="254" autocomplete="email" disabled')}<p class="fine">${loc('Bei dieser Person ist noch kein Anmeldekonto und keine gültige E-Mail hinterlegt. Trage die Adresse hier ein; sie wird beim Zuweisen der Rolle im vorhandenen Personeneintrag gespeichert.','Bu kişinin giriş hesabı veya geçerli e-postası yok. Adresi buraya yaz; rol atanırken mevcut kişi kaydına kaydedilir.')}</p></div><div id="accessNew" hidden>${field('first_name',tr('Ad'),'text','','maxlength="75" disabled')}${field('last_name',tr('Soyad'),'text','','maxlength="75" disabled')}${field('email',tr('E-posta'),'email','','maxlength="254" disabled')}</div>`+sel('access_role','Erişim rolü',[['resident',tr('Site Sakini')],['deputy',tr('Yönetim')],['manager',tr('Süper Admin')]],'deputy')+`<p class="fine">${loc('Vorhandene Personen und Anmeldekonten werden wiederverwendet. Eine verknüpfte Anmeldung benötigt keine zusätzliche E-Mail-Adresse; nur für neue Konten ist eine gültige E-Mail erforderlich. Wohnungszuordnungen bleiben bestehen.','Kayıtlı kişi ve giriş hesabı yeniden kullanılır. Bağlı giriş hesabı için ayrıca e-posta gerekmez; yalnız yeni hesaplarda geçerli e-posta gerekir. Daire ilişkileri korunur.')}</p>`+(linkedAccount?`<p class="fine">${loc('Bestehendes Anmeldekonto erkannt – kein zweites Konto wird erstellt.','Mevcut giriş hesabı bulundu – ikinci hesap oluşturulmayacak.')}</p>`:'')+check('confirmation','Erişimi tanımlamayı onaylıyorum.');
 }
 else if(action==='staff_remove'){
  const member=d.staff.find(x=>x.user_id===args.id);
  if(!member)throw Error(tr('Yönetim üyesi bulunamadı.'));
  if(member.user_id===d.userId)throw Error(tr('Kendi yönetim erişiminizi kaldıramazsınız.'));
  if(member.role==='manager'&&d.staff.filter(x=>x.role==='manager').length<=1)throw Error(tr('Son Süper Admin kaldırılamaz.'));
  context.user_id=member.user_id;
  const label=member.name||d.persons.find(p=>p.auth_user_id===member.user_id)?.full_name||member.email||tr('Ad bağlanmadı');
  title=tr('Üyeyi kaldır');
  body=`<div class="info-strip"><strong>${e(label)}</strong><p>${tr('Bu kişinin yönetim yetkileri kaldırılacak. Kullanıcı hesabı, daire ilişkileri ve muhasebe kayıtları silinmeyecek.')}</p></div>`+
    `<label class="field">${tr('Gerekçe')}<textarea name="reason" minlength="3" maxlength="500" required rows="3"></textarea></label>`+
    check('confirmation','Yönetim üyeliğini kaldırmayı onaylıyorum.');
 }
 else if(action==='occupancy'){
  const u=d.units.find(u=>u.id===args.unit);context.unit_id=args.unit;title=tr('Kullanımı düzenle');body=sel('status','Kullanım',[['occupied',tr('Dolu')],['vacant',tr('Boş')],['unknown',tr('Bilinmiyor')]],u?effectiveOccupancy(d,u):'unknown')+`<p class="fine">${tr('Kullanım durumu kişi kaydından ayrıdır. Ev sahibi dairede oturabilir; eski borçlar değişmez.')}</p>`;
 }
 else if(action==='person_lifecycle'){
  const person=d.persons.find(x=>x.id===args.id);if(!person)throw Error(loc('Person nicht gefunden.','Kişi bulunamadı.'));
  context.person_id=person.id;context.expected_name=person.full_name;
  context.linked_login=!!person.auth_user_id;
  title=loc('Person löschen oder archivieren','Kişiyi sil veya arşivle');
  body=`<div class="info-strip"><strong>${e(person.full_name)}</strong><p>${loc('Archivieren erhält die Stammdaten mit Hinweis und verschiebt aktuelle Wohnungszuordnungen ins Archiv. Endgültig löschen entfernt den Personendatensatz und ungeschützte Verknüpfungen. Bei Finanzdaten ist endgültiges Löschen gesperrt. Ein verknüpfter Standortzugang kann nur mit zusätzlicher Bestätigung entzogen werden. Ein Supabase-Benutzerkonto wird niemals gelöscht.','Arşivleme kişi bilgilerini not ile saklar ve güncel daire bağlantılarını geçmişe taşır. Kalıcı silme kişi kaydını ve korunmayan ilişkilerini siler. Mali kayıt varsa kalıcı silme engellenir. Bağlı giriş için site erişimini kaldırmak ayrıca onaylanmalıdır. Kullanıcı hesabı silinmez.')}</p></div>`
   +`<fieldset><legend>${loc('Aktion auswählen','İşlem seç')}</legend><label class="check-field"><input type="radio" name="mode" value="archive" ${person.archived_at?'disabled':''}>${loc('Archivieren (mit Hinweis)','Arşivle (not ile)')}</label><label class="check-field"><input type="radio" name="mode" value="delete" checked>${loc('Endgültig löschen (unwiderruflich)','Kalıcı sil (geri alınamaz)')}</label></fieldset>`
   +`<label class="field">${loc('Archivierungshinweis (beim Archivieren erforderlich)','Arşiv notu (arşivleme için zorunlu)')}<textarea name="note" maxlength="500" rows="3"></textarea></label>`
   +field('verify_name',loc('Zur endgültigen Löschung Namen exakt eingeben','Kalıcı silmek için tam adı yazın'),'text','','autocomplete="off" maxlength="180"')
   +`<p class="fine">${loc('Zur endgültigen Löschung den Namen exakt wie oben eingeben. Buchungen und Anmeldekonten bleiben geschützt.','Kalıcı silmek için yukarıdaki tam adı birebir yazın. Mali kayıtlar ve giriş hesapları korunur.')}</p>`
   +(person.auth_user_id?
     `<div class="info-strip">${loc('Ein App-Konto ist verknüpft. Bei Archivierung bleibt der App-Zugang ohne gesonderte Auswahl bestehen. Vor endgültigem Löschen muss der Zugang zu dieser Anlage entzogen werden. Verwaltungsmitglieder müssen zuerst unter Einstellungen → Yönetim yetkileri entfernt werden. Das Auth-Konto bleibt in anderen Anlagen bestehen.','Uygulama hesabı bağlıdır. Arşivlerken ayrı seçim yapılmazsa giriş erişimi devam eder. Kalıcı silme için bu siteye erişim kaldırılmalıdır. Yönetim üyelikleri önce Ayarlar → Yönetim yetkileri bölümünde kaldırılmalıdır. Diğer sitelerdeki hesap korunur.')}</div>`
     +check('revoke_access',loc('App-Zugang zu Ayapark 2 entziehen (bei endgültigem Löschen erforderlich)','Ayapark 2 site erişimini kaldır (kalıcı silmek için zorunlu)')):'')
   +check('confirmation',loc('Ich bestätige die ausgewählte Aktion.','Seçilen işlemi onaylıyorum.'));
 }
 else if(action==='person_restore'){
  const person=d.persons.find(x=>x.id===args.id&&x.archived_at);if(!person)throw Error(loc('Archivierte Person nicht gefunden.','Arşivlenen kişi bulunamadı.'));
  context.person_id=person.id;title=loc('Person wiederherstellen','Kişiyi arşivden çıkar');
  body=`<div class="info-strip"><strong>${e(person.full_name)}</strong><p>${loc('Die Person erscheint wieder in der aktiven Liste. Alte Wohnungszuordnungen bleiben im Archiv.','Kişi aktif listeye döner. Eski daire bağlantıları arşivde kalır.')}</p></div>`
  +check('confirmation',loc('Wiederherstellung bestätigen','Arşivden çıkarmayı onayla'));
 }
 else if(action==='person'){
  const p=d.persons?.find(x=>x.id===args.id);context.person_id=p?.id||'';const unit=args.unit;
  title=tr(p?'Kişi bilgilerini düzenle':'Yeni kişi');
  body=field('first_name',tr('Ad'),'text',p?.first_name||'','required maxlength="75"')+field('last_name',tr('Soyad'),'text',p?.last_name||'','required maxlength="75"')+field('phone',tr('Telefon'),'tel',p?.phone||'','maxlength="60"')+field('email',tr('E-posta'),'email',p?.email||'','maxlength="254"')+sel('language','İletişim dili',[['tr','Türkçe'],['de','Deutsch'],['en','English'],['fr','Français'],['ru','Русский'],['other',tr('Başka dil')]],p?.language||'tr')+text('notes','Notlar',p?.notes||'')
  +(p?'':`<div class="person-initial-assignment">${sel('unit_id','Daire',[['',tr('Daire seçin.')],...(d.units||[]).map(u=>[u.id,u.code])],unit||'')}${sel('role','Dairedeki rol',[['',tr('Rol seçin.')],['owner',tr('Ev sahibi')],['tenant',tr('Kiracı')],['representative',tr('Temsilci')]])}<p class="fine">${tr('Kişi kaydedildiğinde daire ve rolü de aynı anda atanır.')}</p></div>`)
  +(s.data.role==='super'?sel('auth_user_id','Uygulama hesabı',[['',tr('Hesap bağlanmadı')],...[...new Map([...(d.residentAccounts||[]).map(a=>[a.user_id,a.label||a.user_id]),...(d.staff||[]).map(a=>[a.user_id,a.name||a.email||tr('Ad bağlanmadı')]),...(p?.auth_user_id?[[p.auth_user_id,p.full_name]]:[])]).entries()]],p?.auth_user_id||''):'');
 }
 else if(action==='bind_charge'){
  const c=d.charges.find(c=>c.id===args.id);title=tr('Sorumlu kişiyi seçin');body=sel('link_id','Kişi',[['',tr('Kişi seçin.')],...d.links.filter(l=>l.unit_id===c?.unit_id).map(l=>[l.id,personName(d,l.person_id)+' · '+roleLabel(l.role)+' · '+l.starts_on+(l.ends_on?' – '+l.ends_on:'')])])+`<p class="fine">${tr('Borç bu kişiye bağlanır. Sonraki sakin değişiklikleri bunu değiştirmez.')}</p>`;
 }
 else if(action==='classify_entry'){const t=d.transactions.find(t=>t.id===args.id);title=tr('Kategori seçin.');body=sel('category','Kategori',['Aidat','Havuz','Asansör','Demirbaş','Temizlik','Peyzaj','Elektrik','Banka masrafı','Transfer','İade','Diğer'].map(c=>[c,tr(c)]),t?.category||'Diğer');}
 else if(action==='credit'||action==='match_rule'){
  const t=d.transactions.find(t=>t.id===args.entry);if(!t)throw Error(tr('Kayıt bulunamadı.'));context.entry_id=t.id;
  title=tr(action==='credit'?'Fazla ödeme ayır':'Göndereni hatırla');
  body=sel('target','Daire / Kişi',[['',tr('Kişi seçin.')],...(d.links||[]).map(l=>[l.id,(d.units.find(u=>u.id===l.unit_id)?.code||'')+' · '+personName(d,l.person_id)+' · '+roleLabel(l.role)])]);
  if(action==='credit')body+=amount()+`<p class="fine">${tr('Bu tutar seçilen kişinin kullanılmamış ödemesi olarak tutulur. Bir borca işlemek için önce ayırmayı kaldırıp ödemeyi eşleştirin.')}</p>`;
  else body+=field('alias',tr('Gönderen adı'),'text','','maxlength="150"')+field('iban','IBAN','text','','maxlength="40"')+`<p class="fine">${tr('Bu kayıt yalnızca öneri üretir. Otomatik ödeme işlemez.')}</p>`;
  context.targets=d.links.map(l=>({id:l.id,person_id:l.person_id,unit_id:l.unit_id}));
 }
 else if(action==='void_credit'){title=tr('Ayırmayı kaldır');body=text('reason','Gerekçe')+check('confirmation','Düzeltmeyi onaylıyorum.');}
 else if(action==='announcement'){
  const a=d.announcements.find(a=>a.id===args.id);title=tr(a?'Duyuruyu düzenle':'Duyuru oluştur');
  const local=v=>v?new Date(v).toLocaleString('sv-SE',{timeZone:'Europe/Istanbul'}).slice(0,16).replace(' ','T'):'';
  body=field('title',tr('Başlık'),'text',a?.title||'','required maxlength="150"')+text('body','Duyuru metni',a?.body||'')+sel('priority','Önem',[['normal',tr('Normal')],['important',tr('Önemli')],['urgent',tr('Acil')]],a?.priority||'normal')+field('starts_at',tr('Yayın başlangıcı'),'datetime-local',local(a?.starts_at))+field('ends_at',tr('Yayın bitişi'),'datetime-local',local(a?.ends_at))+`<p class="fine">${tr('Saatler Türkiye saatidir. Başlangıç boşsa hemen yayımlanır. Bitiş boşsa süresiz kalır.')}</p><div class="publish-choice">${check('published','Yayımla',a?.published||false)}<span class="fine">${tr('Kapalıysa taslak olarak kaydedilir.')}</span></div>`;
  body+=check('popup_on_login','Sonraki girişte pop-up göster',a?.popup_on_login||false)+sel('target_kind','Alıcılar',[['all',tr('Herkes')],['owners',tr('Yalnız malikler')],['residents',tr('Yalnız kiracı / sakinler')],['representatives',tr('Yalnız temsilciler')],['units',tr('Seçili daireler')],['blocks',tr('Seçili bloklar')]],a?.target_kind||'all')+`<div data-notification-target="units" hidden>${d.units.map(u=>`<label class="check-field"><input type="checkbox" name="target_units" value="${e(u.id)}" ${a?.target_units?.includes(u.id)?'checked':''}>${e(u.code)}</label>`).join('')}</div><div data-notification-target="blocks" hidden>${['A','B'].map(b=>`<label class="check-field"><input type="checkbox" name="target_blocks" value="${b}" ${a?.target_blocks?.includes(b)?'checked':''}>${b} ${tr('Blok')}</label>`).join('')}</div><details><summary>Deutsch</summary>${field('title_de','Titel (Deutsch)','text',a?.title_de||'','maxlength="150"')}${text('body_de','Text (Deutsch)',a?.body_de||'')}</details><p class="fine">${tr('Düzenleme yeni bir sürüm oluşturur. Önceki onaylar geçmişte kalır.')}</p>`;

 }
 else if(action==='provider'){
  const p=d.providers.find(p=>p.id===args.id),selected=new Set(p?providerServices(p):[]),choices=providerCategoryChoices(d);
  const isSelected=x=>selected.has(x.name)||!p&&!selected.size&&x.name==='Temizlik';
  const initialSelection=choices.filter(isSelected).length;
  const notes=(d.providerNotes||[]).filter(n=>n.provider_id===p?.id).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const latest=notes[0];
  title=loc(p?'Dienstleister bearbeiten':'Dienstleister hinzufügen',p?'Hizmet veren düzenle':'Hizmet veren ekle');
  body=field('name',tr('Firma / kişi'),'text',p?.name||'','required maxlength="150"')
    +'<fieldset class="provider-category-choices" aria-describedby="providerCategoryHelp"><legend>'+loc('Dienstleistungen','Hizmet kategorileri')+'</legend>'
    +'<div class="provider-category-intro"><p>'+loc('Wähle eine oder mehrere passende Kategorien.','Bir veya birden fazla uygun kategori seç.')+'</p>'
    +'<output id="providerCategorySelectionCount" class="provider-category-count" aria-live="polite" aria-atomic="true">'+initialSelection+' / 8 '+loc('ausgewählt','seçildi')+'</output></div>'
    +'<div class="provider-category-grid">'+choices.map(x=>'<label class="provider-category-option"><input type="checkbox" name="categories" value="'+e(x.name)+'" '+(isSelected(x)?'checked':'')+'><span class="provider-category-option-name">'+e(tr(x.name))+'</span><span class="provider-category-check" aria-hidden="true"></span></label>').join('')+'</div>'
    +'<p class="provider-category-help" id="providerCategoryHelp">'+loc('Mindestens eine, maximal acht Kategorien. Weitere Kategorien kannst du über „Kategorien verwalten“ anlegen.','En az bir, en fazla sekiz kategori. Yeni kategorileri „Kategorileri yönet“ bölümünden ekleyebilirsin.')+'</p></fieldset>'
    +field('contact',tr('Yetkili'),'text',p?.contact||'','maxlength="150"')
    +field('phone',tr('Telefon'),'tel',p?.phone||'','maxlength="60"')
    +field('email',tr('E-posta'),'email',p?.email||'','maxlength="254"')
    +sel('status','Durum',[['preferred',tr('Tercih edilen')],['backup',tr('Alternatif')],['avoid',tr('Tekrar çalışılmasın')]],p?.status||'preferred')
    +(latest?'<input type="hidden" name="edit_note_id" value="'+e(latest.id)+'">'+text('edit_note_body',loc('Angezeigte Notiz bearbeiten','Görünen notu düzenle'),latest.body):
      text('new_note_body',loc('Notiz (optional)','Not (isteğe bağlı)')))
    +(latest?'<p class="fine">'+loc('Die vorhandene Notiz wird geändert, nicht dupliziert. Frühere Notizen bleiben erhalten.','Mevcut not güncellenir, kopyası oluşturulmaz. Önceki notlar korunur.')+'</p>':'');
 }
 else if(action==='provider_category'){
  title=loc('Dienstleister-Kategorien verwalten','Hizmet kategorilerini yönet');
  const cats=providerCategoryChoices(d).filter(c=>c.id);
  body=sel('operation',loc('Aktion','İşlem'),[['add',loc('Neue Kategorie','Yeni kategori')],['rename',loc('Umbenennen','Yeniden adlandır')],['delete',loc('Unbenutzte Kategorie löschen','Kullanılmayan kategoriyi sil')]],'add')
   +'<div id="providerCategoryExisting" hidden>'+sel('category_id',loc('Bestehende Kategorie','Mevcut kategori'),cats.map(c=>[c.id,c.name]))+'</div>'
   +'<div id="providerCategoryName">'+field('category_name',loc('Kategoriename','Kategori adı'),'text','','maxlength="60" required')+'</div>'
   +'<p class="fine">'+loc('Bei Umbenennung werden alle zugeordneten Dienstleister aktualisiert. Kategorien, die noch benutzt werden, können nicht gelöscht werden.','Adı değiştirilen kategori tüm hizmet verenlerde güncellenir. Kullanılan kategoriler silinemez.')+'</p>';
 }
 else if(action==='provider_note'){context.provider_id=args.id;title=tr('Deneyim notu');body=field('visit_on',tr('Hizmet tarihi'),'date',today())+text('body','Deneyim / Not');}
 else {
  const built=buildLegacyForm(s,action,args);
  if(['charge','monthly','allocate'].includes(action)){
   if(action==='charge')built.body+=sel('link_id','Sorumlu kişi',[['',tr('Sonra belirle')],...d.links.map(l=>[l.id,(d.units.find(u=>u.id===l.unit_id)?.code||'')+' · '+personName(d,l.person_id)+' · '+roleLabel(l.role)])])+field('period_from',tr('Dönem başlangıcı'),'date')+field('period_to',tr('Dönem bitişi'),'date');
   if(action==='monthly'){built.body=built.body.replace('placeholder="'+e(tr('Tutar girin'))+'"','placeholder="'+e(tr('Aidat tutarı'))+'"');}
   if(action==='monthly')built.body+=`<p class="fine">${tr('Dönemin sorumlu kişisi otomatik seçilir. Belirsiz kayıtlar kişi belirlenene kadar sakinlere gösterilmez.')}</p>`;
  }
  if(action==='entry'&&args.kind==='expense'){built.title=tr('Gider ekle');built.body=built.body.replace('value="in"','value="in"').replace('value="out"','value="out" selected');}
  return built;
 }
 return {title,body,context};
}
export function payloadV3(action,form,ctx){
 if(action.startsWith('assignment_'))return assignmentPayload(action,form,ctx);
 const special=['person_lifecycle','person_restore','person_link','occupancy','edit_link','user_access','staff_remove','person','link','end_link','unlink','switch_tenant','bind_charge','credit','void_credit','match_rule','announcement','provider','provider_category','provider_note','classify_entry'];
 if(!special.includes(action)){const p=payloadLegacy(action,form,ctx);if(action==='charge'&&(p.period_from||p.period_to)&&(!dateValid(p.period_from)||!dateValid(p.period_to)||p.period_to<p.period_from))throw Error(tr('Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.'));if(action==='entry'&&p.category==='Diğer'&&!p.desc)throw Error(tr('Açıklama gerekli.'));return p;}
 if(['person_lifecycle','person_restore'].includes(action)){
  if(!form.has('confirmation')||!ctx.person_id)throw Error(loc('Bestätigung erforderlich.','Onay gerekli.'));
  if(action==='person_restore')return {person_id:ctx.person_id,mode:'restore',note:'',confirmation:true,revoke_access:false};
  const mode=String(form.get('mode')||''),note=String(form.get('note')||'').trim();
  if(!['archive','delete'].includes(mode))throw Error(loc('Aktion auswählen.','İşlem seç.'));
  if(mode==='archive'&&(note.length<3||note.length>500))throw Error(loc('Archivierungshinweis mit 3 bis 500 Zeichen angeben.','Arşiv notu 3 ila 500 karakter olmalıdır.'));
  if(mode==='delete'&&String(form.get('verify_name')||'')!==ctx.expected_name)throw Error(loc('Den vollständigen Namen exakt eingeben.','Tam adı birebir yazın.'));
  const revoke_access=form.has('revoke_access')&&ctx.linked_login===true;
  if(mode==='delete'&&ctx.linked_login===true&&!revoke_access)throw Error(loc('Vor dem endgültigen Löschen den Entzug des Standortzugangs bestätigen.','Kalıcı silmeden önce site erişimini kaldırmayı onaylayın.'));
  return {person_id:ctx.person_id,mode,note,confirmation:true,revoke_access};
 }
 if(action==='staff_remove'&&(!form.has('confirmation')||!ctx.user_id))throw Error(tr('Devam etmek için onay kutusunu işaretleyin.'));
 if(action==='staff_remove'&&String(form.get('reason')||'').trim().length<3)throw Error(tr('En az üç karakterlik gerekçe yazın.'));
 if(action==='user_access'&&((form.get('person_mode')!=='new'&&!form.get('person_id'))||!form.has('confirmation')))throw Error(tr('Kişi seçin ve erişimi onaylayın.'));
 const p={...ctx};for(const[k,v]of form)p[k]=String(v).trim();const get=k=>String(form.get(k)||'').trim();
 if(['void_credit'].includes(action)&&!form.has('confirmation'))throw Error(tr('Devam etmek için onay kutusunu işaretleyin.'));
 if(action==='person'&&(!get('first_name')||!get('last_name')))throw Error(tr('Ad ve soyad gerekli.'));
 if(action==='person'&&!ctx.person_id){
  if(!get('unit_id'))throw Error(tr('Yeni kişi için daire seçin.'));
  if(!['owner','tenant','representative'].includes(get('role')))throw Error(tr('Yeni kişi için rol seçin.'));
 }
 if(action==='staff_remove'){p.user_id=ctx.user_id;p.confirmation=true;}
 p.primary_contact=form.has('primary_contact');if(action==='user_access'){p.confirmation=true;p.new_person=get('person_mode')==='new';if(p.new_person&&(!get('first_name')||!get('last_name')||!get('email')))throw Error(tr('Ad, soyad ve geçerli e-posta gerekli.'));if(!p.new_person&&get('access_email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('access_email')))throw Error(loc('Bitte eine gültige E-Mail-Adresse eingeben.','Lütfen geçerli bir e-posta adresi yazın.'));}
 if(action==='bind_charge'&&!get('link_id'))throw Error(tr('Kişi seçin.'));
 if(action==='void_credit'&&get('reason').length<3)throw Error(tr('Gerekçe gerekli.'));
 if(['credit','match_rule'].includes(action)){const l=ctx.targets.find(l=>l.id===get('target'));if(!l)throw Error(tr('Kişi seçin.'));p.unit_id=l.unit_id;p.person_id=l.person_id;delete p.targets;
  if(action==='credit')p.cents=payloadLegacy('allocate',form,ctx).cents;
  if(action==='match_rule'&&get('alias').length<4&&get('iban').replace(/\s/g,'').length<15)throw Error(tr('Gönderen adı veya IBAN gerekli.'));
 }
 if(action==='announcement'){
  if(!get('title')||!get('body'))throw Error(tr('Başlık ve metin gerekli.'));p.published=form.has('published');
  for(const k of ['starts_at','ends_at'])p[k]=announcementTime(get(k));
  p.popup_on_login=form.has('popup_on_login');p.target_units=form.getAll('target_units');p.target_blocks=form.getAll('target_blocks');
  validateAnnouncement(p);
 }
 if(action==='provider'){
  p.categories=[...new Set(form.getAll('categories').map(x=>String(x).trim()).filter(Boolean))];
  if(p.categories.length<1||p.categories.length>8)throw Error(loc('Bitte 1 bis 8 Dienstleistungen auswählen.','Lütfen 1 ila 8 hizmet seçin.'));
  delete p.category;
  if(get('edit_note_id')&&get('edit_note_body').length===0)throw Error(loc('Eine vorhandene Notiz darf nicht leer sein.','Var olan not boş bırakılamaz.'));
 }
 if(action==='provider_category'){
  p.operation=get('operation');
  p.name=get('category_name');p.category_id=get('category_id');
  if(!['add','rename','delete'].includes(p.operation)||p.operation!=='add'&&!p.category_id||p.operation!=='delete'&&!p.name)throw Error(loc('Bitte eine Kategorie und einen gültigen Namen angeben.','Kategori ve geçerli bir ad girin.'));
 }
 if(action==='provider_note'&&!get('body'))throw Error(tr('Not yazın.'));
 return p;
}
