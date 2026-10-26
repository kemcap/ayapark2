import {buildAssignmentForm,assignmentPayload} from './assignments.mjs?v=5.4.0';
import {effectiveOccupancy} from './relationships.mjs?v=5.4.0';
import {announcementTime,validateAnnouncement} from './announcement-validation.mjs?v=5.4.0';
import {t as tr} from './i18n.mjs?v=5.4.0';
import {escapeHtml as e,randomId,money} from './core.mjs?v=5.4.0';
import {field,buildLegacyForm,payloadLegacy} from './forms.mjs?v=5.4.0';
import {today,personName,personLinks,activeAt,dateValid} from './v3-domain.mjs?v=5.4.0';
import {roleLabel} from './v3-ui.mjs?v=5.4.0';
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
  body=`<fieldset class="person-choice"><legend>${tr('Kişi seçimi')}</legend><label class="check-field"><input type="radio" name="person_mode" value="existing" checked>${tr('Kayıtlı kişi seç')}</label><label class="check-field"><input type="radio" name="person_mode" value="new">${tr('Yeni kişi oluştur')}</label></fieldset><div id="accessExisting">${sel('person_id','Kişi',personOptions(d))}</div><div id="accessNew" hidden>${field('first_name',tr('Ad'),'text','','maxlength="75" disabled')}${field('last_name',tr('Soyad'),'text','','maxlength="75" disabled')}${field('email',tr('E-posta'),'email','','maxlength="254" disabled')}</div>`+sel('access_role','Erişim rolü',[['resident',tr('Site Sakini')],['deputy',tr('Yönetim')],['manager',tr('Süper Admin')]],'deputy')+`<p class="fine">${tr('Yönetim için daire ilişkisi gerekmez. Sakin erişimi için güncel bir daire ilişkisi ve her durumda geçerli e-posta gerekir. Bu işlem e-posta göndermez.')}</p>`+check('confirmation','Erişimi tanımlamayı onaylıyorum.');
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
 else if(action==='person'){
  const p=d.persons?.find(x=>x.id===args.id);context.person_id=p?.id||'';const unit=args.unit;
  title=tr(p?'Kişi bilgilerini düzenle':'Yeni kişi');
  body=field('first_name',tr('Ad'),'text',p?.first_name||'','required maxlength="75"')+field('last_name',tr('Soyad'),'text',p?.last_name||'','required maxlength="75"')+field('phone',tr('Telefon'),'tel',p?.phone||'','maxlength="60"')+field('email',tr('E-posta'),'email',p?.email||'','maxlength="254"')+sel('language','İletişim dili',[['tr','Türkçe'],['de','Deutsch'],['en','English'],['fr','Français'],['ru','Русский'],['other',tr('Başka dil')]],p?.language||'tr')+text('notes','Notlar',p?.notes||'')+(s.data.role==='super'?sel('auth_user_id','Uygulama hesabı',[['',tr('Hesap bağlanmadı')],...[...new Map([...(d.residentAccounts||[]).map(a=>[a.user_id,a.label||a.user_id]),...(d.staff||[]).map(a=>[a.user_id,a.name||a.email||tr('Ad bağlanmadı')]),...(p?.auth_user_id?[[p.auth_user_id,p.full_name]]:[])]).entries()]],p?.auth_user_id||''):'');
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
  const p=d.providers.find(p=>p.id===args.id);title=tr(p?'Hizmeti düzenle':'Hizmet ekle');body=field('name',tr('Firma / kişi'),'text',p?.name||'','required maxlength="150"')+sel('category','Alan',['Temizlik','Peyzaj','Elektrik','Asansör','Havuz','Tesisat','Diğer'].map(c=>[c,tr(c)]),p?.category||'Temizlik')+field('contact',tr('Yetkili'),'text',p?.contact||'','maxlength="150"')+field('phone',tr('Telefon'),'tel',p?.phone||'','maxlength="60"')+field('email',tr('E-posta'),'email',p?.email||'','maxlength="254"')+sel('status','Durum',[['preferred',tr('Tercih edilen')],['backup',tr('Alternatif')],['avoid',tr('Tekrar çalışılmasın')]],p?.status||'preferred');
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
 const special=['person_link','occupancy','edit_link','user_access','staff_remove','person','link','end_link','unlink','switch_tenant','bind_charge','credit','void_credit','match_rule','announcement','provider','provider_note','classify_entry'];
 if(!special.includes(action)){const p=payloadLegacy(action,form,ctx);if(action==='charge'&&(p.period_from||p.period_to)&&(!dateValid(p.period_from)||!dateValid(p.period_to)||p.period_to<p.period_from))throw Error(tr('Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.'));if(action==='entry'&&p.category==='Diğer'&&!p.desc)throw Error(tr('Açıklama gerekli.'));return p;}
 if(action==='staff_remove'&&(!form.has('confirmation')||!ctx.user_id))throw Error(tr('Devam etmek için onay kutusunu işaretleyin.'));
 if(action==='staff_remove'&&String(form.get('reason')||'').trim().length<3)throw Error(tr('En az üç karakterlik gerekçe yazın.'));
 if(action==='user_access'&&((form.get('person_mode')!=='new'&&!form.get('person_id'))||!form.has('confirmation')))throw Error(tr('Kişi seçin ve erişimi onaylayın.'));
 const p={...ctx};for(const[k,v]of form)p[k]=String(v).trim();const get=k=>String(form.get(k)||'').trim();
 if(['void_credit'].includes(action)&&!form.has('confirmation'))throw Error(tr('Devam etmek için onay kutusunu işaretleyin.'));
 if(action==='person'&&(!get('first_name')||!get('last_name')))throw Error(tr('Ad ve soyad gerekli.'));
 if(action==='staff_remove'){p.user_id=ctx.user_id;p.confirmation=true;}
 p.primary_contact=form.has('primary_contact');if(action==='user_access'){p.confirmation=true;p.new_person=get('person_mode')==='new';if(p.new_person&&(!get('first_name')||!get('last_name')||!get('email')))throw Error(tr('Ad, soyad ve geçerli e-posta gerekli.'));}
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
 if(action==='provider_note'&&!get('body'))throw Error(tr('Not yazın.'));
 return p;
}
