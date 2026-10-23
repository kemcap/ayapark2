import {buildRelationshipForm,relationshipPayload,effectiveOccupancy,linkVersion} from './relationships.mjs';
import {announcementTime,validateAnnouncement} from './announcement-validation.mjs';
import {t as tr} from './i18n.mjs';
import {escapeHtml as e,randomId,money} from './core.mjs';
import {field,buildLegacyForm,payloadLegacy} from './forms.mjs';
import {today,personName,personLinks,activeAt,dateValid} from './v3-domain.mjs';
import {roleLabel} from './v3-ui.mjs';
const sel=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const text=(name,label,value='')=>`<label class="field">${tr(label)}<textarea name="${name}" maxlength="5000" rows="3">${e(value)}</textarea></label>`;
const check=(name,label,checked=false)=>`<label class="check-field"><input type="checkbox" name="${name}" ${checked?'checked':''}>${tr(label)}</label>`;
const amount=()=>field('amount',tr('Tutar (TL)'),'text','','inputmode="decimal" required placeholder="'+e(tr('Tutar girin'))+'"');
const roles=['owner','tenant','representative'].map(r=>[r,roleLabel(r)]);
const personOptions=d=>[['',tr('Kişi seçin.')],...(d.persons||[]).map(p=>[p.id,p.full_name])];
export function buildV3Form(s,action,args={}){
 if(action==='relationship_change')return buildRelationshipForm(s.data,args);
 const d=s.data;let title='',body='',context={...args,request_id:randomId()};
 if(action==='user_access'){
  title=tr('Kullanıcı erişimi');
  body=sel('person_id','Kişi',personOptions(d))+sel('access_role','Erişim rolü',[['resident',tr('Site Sakini')],['deputy',tr('Yönetim')],['manager',tr('Süper Admin')]],'resident')+`<p class="fine">${tr('Kişinin e-posta adresi ve güncel daire ilişkisi kayıtlı olmalıdır. Kullanıcı giriş ekranından kod ister. Bu işlem e-posta göndermez.')}</p>`+check('confirmation','Erişimi tanımlamayı onaylıyorum.');
 }
 else if(action==='occupancy'){
  const u=d.units.find(u=>u.id===args.unit);context.unit_id=args.unit;title=tr('Kullanımı düzenle');body=sel('status','Kullanım',[['occupied',tr('Dolu')],['vacant',tr('Boş')],['unknown',tr('Bilinmiyor')]],u?effectiveOccupancy(d,u):'unknown')+`<p class="fine">${tr('Kullanım durumu kişi kaydından ayrıdır. Ev sahibi dairede oturabilir; eski borçlar değişmez.')}</p>`;
 }
 else if(action==='edit_link'){
  const l=d.links.find(l=>l.id===args.id);if(!l)throw Error(tr('Kayıt bulunamadı.'));context.link_start=l.starts_on;
  title=tr('Giriş / çıkış tarihleri');body=`<p>${e(personName(d,l.person_id))}</p>`+field('starts_on',tr('Başlangıç'),'date',l.starts_on||'')+check('start_unknown','Başlangıç tarihi bilinmiyor',!l.starts_on)+field('ends_on',tr('Çıkış tarihi'),'date',l.ends_on||'')+`<p class="fine">${tr('Gerçek tarihleri girin. Kayıt veya içe aktarma tarihi giriş tarihi değildir. Çıkış boşsa ilişki devam eder.')}</p>`;
 }
 else if(action==='person'){
  const p=d.persons?.find(x=>x.id===args.id);context.person_id=p?.id||'';const unit=args.unit;
  title=tr(p?'Kişi bilgilerini düzenle':'Yeni kişi');
  body=field('first_name',tr('Ad'),'text',p?.first_name||'','required maxlength="75"')+field('last_name',tr('Soyad'),'text',p?.last_name||'','required maxlength="75"')+field('phone',tr('Telefon'),'tel',p?.phone||'','maxlength="60"')+field('email',tr('E-posta'),'email',p?.email||'','maxlength="254"')+sel('language','İletişim dili',[['tr','Türkçe'],['de','Deutsch'],['en','English'],['fr','Français'],['ru','Русский'],['other',tr('Başka dil')]],p?.language||'tr')+text('notes','Notlar',p?.notes||'')+(s.data.role==='super'?sel('auth_user_id','Uygulama hesabı',[['',tr('Hesap bağlanmadı')],...(d.residentAccounts||[]).map(a=>[a.user_id,a.label||a.user_id])],p?.auth_user_id||''):'');
  if(unit&&!p){context.unit_id=unit;const owner=personLinks(d,unit).some(l=>l.role==='owner');body+=`<p class="info-strip">${tr(owner?'Rol ve başlangıç tarihini seçin.':'Kiracı eklemek için önce ev sahibini kaydedin. Temsilciyi şimdi ekleyebilirsiniz.')}</p>`+sel('role','Rol',owner?roles:roles.filter(([r])=>r!=='tenant'),'owner')+field('starts_on',tr('Başlangıç'),'date','','required')+check('start_unknown','Başlangıç tarihi bilinmiyor')+field('responsibility',tr('Sorumluluk'),'text','','maxlength="1000"')+check('primary_contact','İlk aranacak kişi');}
 }
 else if(action==='person_link'){
  context.person_id=args.id;title=tr('Daireye bağla');body=sel('unit_id','Daire',d.units.map(u=>[u.id,u.code]))+sel('role','Rol',roles,'owner')+field('starts_on',tr('Başlangıç'),'date','','required')+check('start_unknown','Başlangıç tarihi bilinmiyor')+field('ends_on',tr('Bitiş'),'date')+field('responsibility',tr('Sorumluluk'),'text','','maxlength="1000"')+check('primary_contact','İlk aranacak kişi');
 }
 else if(action==='link'){
  if(!(d.persons||[]).length)throw Error(tr('Önce bir kişi ekleyin.'));context.unit_id=args.unit;
  title=tr('Kayıtlı kişi bağla');body=sel('person_id','Kişi',personOptions(d))+sel('role','Rol',roles,'owner')+field('starts_on',tr('Başlangıç'),'date','','required')+check('start_unknown','Başlangıç tarihi bilinmiyor')+field('ends_on',tr('Bitiş'),'date')+field('responsibility',tr('Sorumluluk'),'text','','maxlength="1000"')+check('primary_contact','İlk aranacak kişi')+`<p class="fine">${tr('Kiracı için ev sahibi kaydı gereklidir. Temsilci bağımsız olarak eklenebilir.')}</p>`;
 }
 else if(action==='unlink'){
  const l=d.links.find(x=>x.id===args.id);if(!l)throw Error(tr('Kayıt bulunamadı.'));
  context.id=l.id;context.expected=linkVersion(l);title=tr('Hatalı bağlantıyı kaldır');
  body=`<div class="info-strip"><strong>${e(personName(d,l.person_id))}</strong> · ${e(d.units.find(u=>u.id===l.unit_id)?.code||'—')} · ${e(roleLabel(l.role))}</div>`+
   `<p class="fine">${tr('Yanlış atanan rolü kaldırın. Kişi ve banka kayıtları korunur. Gerçek taşınma veya görev bitişinde Bağlantıyı bitir seçeneğini kullanın.')}</p>`+
   field('reason',tr('Kaldırma gerekçesi'),'text','','required minlength="3" maxlength="500"')+
   check('confirmation','Bu yanlış bağlantıyı kaldırmayı onaylıyorum.');
 }
 else if(action==='switch_tenant'||action==='end_link'){
  const l=d.links.find(l=>l.id===args.id);if(!l)throw Error(tr('Kayıt bulunamadı.'));context.link_start=l.starts_on;
  title=tr(action==='switch_tenant'?'Sakin değiştir':'Bağlantıyı bitir');body=`<p>${e(personName(d,l.person_id))} · ${e(d.units.find(u=>u.id===l.unit_id)?.code)}</p>`+field('ends_on',tr('Çıkış tarihi'),'date',today(),'required');
  if(action==='end_link')body+=`<p class="fine">${tr('Seçilen gün rolün son günüdür. Ertesi gün artık güncel görünmez.')}</p>`;
  if(action==='switch_tenant')body+=sel('person_id','Yeni sakin',[...personOptions(d).filter(([id])=>id!==l.person_id),['__new__',tr('Yeni kişi')]])+`<div id="newTenantFields" hidden>${field('first_name',tr('Ad'),'text','','maxlength="75"')}${field('last_name',tr('Soyad'),'text','','maxlength="75"')}${field('phone',tr('Telefon'),'tel','','maxlength="60"')}${field('email',tr('E-posta'),'email','','maxlength="254"')}${text('notes','Notlar')}</div>`+field('starts_on',tr('Giriş tarihi'),'date','','required')+`<p class="info-strip">${tr('Açık borçlar önceki kişide kalır. Yeni sakine aktarılmaz.')}</p>`+check('confirmation','Değişikliği onaylıyorum.');
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
  return built;
 }
 return {title,body,context};
}
export function payloadV3(action,form,ctx){
 if(action==='relationship_change')return relationshipPayload(form,ctx,ctx.relationshipData,ctx.version);
 const special=['person_link','occupancy','edit_link','user_access','person','link','end_link','unlink','switch_tenant','bind_charge','credit','void_credit','match_rule','announcement','provider','provider_note','classify_entry'];
 if(!special.includes(action)){const p=payloadLegacy(action,form,ctx);if(action==='charge'&&(p.period_from||p.period_to)&&(!dateValid(p.period_from)||!dateValid(p.period_to)||p.period_to<p.period_from))throw Error(tr('Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.'));if(action==='entry'&&p.category==='Diğer'&&!p.desc)throw Error(tr('Açıklama gerekli.'));return p;}
 if(action==='user_access'&&(!form.get('person_id')||!form.has('confirmation')))throw Error(tr('Kişi seçin ve erişimi onaylayın.'));
 const p={...ctx};for(const[k,v]of form)p[k]=String(v).trim();const get=k=>String(form.get(k)||'').trim();
 if(['switch_tenant','void_credit','unlink'].includes(action)&&!form.has('confirmation'))throw Error(tr('Devam etmek için onay kutusunu işaretleyin.'));
 if(action==='unlink'&&(get('reason').length<3||get('reason').length>500))throw Error(tr('En az üç karakterlik gerekçe yazın.'));
 if(action==='person'&&(!get('first_name')||!get('last_name')))throw Error(tr('Ad ve soyad gerekli.'));
 p.start_unknown=form.has('start_unknown');if(p.start_unknown)p.starts_on=null;
 if(['person_link','link','edit_link'].includes(action)||(action==='person'&&ctx.unit_id)){if(!p.start_unknown&&!dateValid(get('starts_on')))throw Error(tr('Başlangıç tarihini girin veya bilinmiyor seçin.'));}
 if(['person_link','edit_link','end_link','switch_tenant','link'].includes(action)){const start=action==='end_link'||action==='switch_tenant'?ctx.link_start:p.starts_on;if(get('ends_on')&&!dateValid(get('ends_on')))throw Error(tr('Geçerli bir çıkış tarihi girin.'));if(start&&get('ends_on')&&get('ends_on')<start)throw Error(tr('Çıkış tarihi başlangıç tarihinden önce olamaz.')+' '+tr('Kayıtlı başlangıç')+': '+start);}
 if(action==='unlink')p.confirmation=true;
 p.primary_contact=form.has('primary_contact');if(action==='user_access')p.confirmation=true;
 if(['link','switch_tenant','bind_charge'].includes(action)&&!get(action==='bind_charge'?'link_id':'person_id'))throw Error(tr('Kişi seçin.'));
 if(action==='switch_tenant'){if(p.person_id==='__new__'){p.person_id='';if(!get('first_name')||!get('last_name'))throw Error(tr('Ad ve soyad gerekli.'));}p.confirmation=true;if(!get('ends_on')||!get('starts_on')||get('starts_on')<=get('ends_on'))throw Error(tr('Tarih aralığını kontrol edin.'));}
 if(action==='void_credit'&&get('reason').length<3)throw Error(tr('Gerekçe gerekli.'));
 if(['credit','match_rule'].includes(action)){const l=ctx.targets.find(l=>l.id===get('target'));if(!l)throw Error(tr('Kişi seçin.'));p.unit_id=l.unit_id;p.person_id=l.person_id;delete p.targets;
  if(action==='credit')p.cents=payloadLegacy('allocate',form,ctx).cents;
  if(action==='match_rule'&&get('alias').length<4&&get('iban').replace(/\s/g,'').length<15)throw Error(tr('Gönderen adı veya IBAN gerekli.'));
 }
 if(action==='announcement'){
  if(!get('title')||!get('body'))throw Error(tr('Başlık ve metin gerekli.'));p.published=form.has('published');
  for(const k of ['starts_at','ends_at'])p[k]=announcementTime(get(k));
  validateAnnouncement(p);
 }
 if(action==='provider_note'&&!get('body'))throw Error(tr('Not yazın.'));
 return p;
}
