import {taskOptions} from './task-permissions.mjs?v=5.9.28';
import {buildFinanceForm,financePayload} from './finance-forms.mjs?v=5.9.39';
import {buildV3Form,payloadV3} from './v3-forms.mjs?v=5.9.43';
import {t as tr} from './i18n.mjs?v=5.9.28';
import {escapeHtml as e,money,randomId} from './core.mjs?v=5.8.1';
import {remaining,unassigned} from './ledger.mjs?v=5.9.39';
import {personName,creditAvailable} from './v3-domain.mjs?v=5.9.26';
import {analyzeStage} from './reconcile.mjs?v=5.8.1';
export const field=(name,label,type='text',value='',attrs='')=>`<label class="field">${tr(label)}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const select=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${String(v)===String(value)?'selected':''}>${e(tr(l))}</option>`).join('')}</select></label>`;
const check=(name,label,checked=false)=>`<label class="check-field"><input type="checkbox" name="${name}" ${checked?'checked':''}>${tr(label)}</label>`;
const text=(name,label,value='',max=5000)=>`<label class="field">${tr(label)}<textarea name="${name}" maxlength="${max}" required rows="5">${e(value)}</textarea></label>`;
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const amount=(label=tr("Tutar (TL)"),value='')=>field('amount',label,'text',value,`inputmode="decimal" required placeholder="${e(tr('Tutar girin'))}"`);
const payers=[['review','Sorumlu teyit edilmeli'],['tenant','Site sakini'],['owner','Kat maliki']];
const categories=['Aidat','Havuz','Asansör','Demirbaş','Devir','İcra','Temizlik','Peyzaj','Elektrik','Banka masrafı','Transfer','İade','Diğer'];
const cat=()=>select('category',tr("Kategori"),categories.map(x=>[x,x]),'Aidat');
export function buildLegacyForm(s,action,args={}){
 const d=s.data,unitOptions=d.units.map(u=>[u.id,u.code]);let title='',body='',context={...args,request_id:randomId()};
 if(action==='charge'||action==='monthly'){
  title=action==='monthly'?tr("Aylık aidat oluştur"):tr("Borç ekle");body=(action==='charge'?select('unit_id',tr("Daire"),unitOptions,args.unit):'')+field('label',tr("Açıklama"),'text',action==='monthly'?s.period+' aidatı':'','required maxlength="200"')+field('due_on',tr("Vade"),'date',s.period+'-01','required')+amount()+select('payer',tr("Sorumlu taraf"),payers,action==='monthly'?'tenant':'review')+(action==='charge'?cat():check('confirmation',`${d.units.length}${tr(" daireye birer aidat kaydı oluşturulacağını onaylıyorum.")}`));
  context.reference='manual:'+context.request_id;
 }
 else if(action==='entry'){title=tr("Manuel hesap hareketi");body=field('date',tr("İşlem tarihi"),'date',today(),'required')+field('desc',tr("Açıklama"),'text','','required maxlength="500"')+cat()+select('direction',tr("Hareket türü"),[['in',tr("Tahsilat / gelir")],['out',tr("Gider")]])+amount()+field('reference',tr("Banka / belge referansı"),'text','','maxlength="100"');}
 else if(action==='allocate'){
  title=tr("Ödemeyi borçla eşleştir");const entries=d.transactions.filter(t=>t.cents>0&&!t.reversal_of&&!d.transactions.some(x=>x.reversal_of===t.id)&&unassigned(d,t)-creditAvailable(d,t)>0),charges=d.charges.filter(c=>remaining(d,c)>0);
  if(!entries.length||!charges.length)throw Error(tr("Eşleştirme için açık borç ve kullanılabilir tahsilat gerekli."));
  body=select('entry_id',tr("Tahsilat"),entries.map(t=>[t.id,t.date+' · '+t.desc.slice(0,60)+tr(" · Kullanılabilir ")+money(unassigned(d,t)-creditAvailable(d,t))]),args.entry)+select('charge_id',tr("Borç"),charges.map(c=>[c.id,(d.units.find(u=>u.id===c.unit_id)?.code||'')+' · '+c.label+' · '+personName(d,c.person_id)+' · '+c.due_on+tr(" · Kalan ")+money(remaining(d,c))]),args.charge)+amount()+`<p class="fine">${tr("Kısmi ödeme desteklenir. Aynı tahsilatı birden fazla borca ayrı ayrı eşleştirebilirsiniz.")}</p>`;
 }
 else if(['reverse','unallocate','void_charge'].includes(action)){title={reverse:tr("Storno oluştur"),unallocate:tr("Eşleştirmeyi kaldır"),void_charge:tr("Borcu iptal et")}[action];body=`<div class="info-strip">${tr("Bu işlem gerekçesiyle kaydedilir. Mevcut kayıt geçmişten silinmez.")}</div>`+text('reason',tr("Gerekçe"),'',500)+check('confirmation',tr("Düzeltmeyi onaylıyorum."));}
 else if(action==='person'){
  const p=d.people.find(p=>p.id===args.id);title=p?tr("Kişi bilgilerini düzenle"):tr("Kişi ekle");body=(p?'':select('unit_id',tr("Daire"),unitOptions,args.unit))+field('full_name',tr("Ad soyad"),'text',p?.full_name||'','required maxlength="150"')+select('relation',tr("İlişki"),[['owner',tr("Kat maliki")],['tenant',tr("Kiracı")]],p?.relation||'owner')+field('email',tr("E-posta"),'email',p?.email||'','maxlength="254"')+field('phone',tr("Telefon"),'tel',p?.phone||'','maxlength="60"')+(p?check('active',tr("Aktif kişi"),p.active):'');
 }
 else if(action==='announcement'){const a=d.announcements.find(a=>a.id===args.id);title=a?tr("Duyuruyu düzenle"):tr("Duyuru oluştur");body=field('title',tr("Başlık"),'text',a?.title||'','required maxlength="150"')+text('body',tr("Duyuru metni"),a?.body||'')+check('published',tr("Site sakinlerine yayımla"),a?.published||false);}
 else if(action==='permissions'){title=tr("Yönetim yetkileri");const taskMode=Array.isArray(d.taskGrants),caps=taskMode?(d.taskGrants.find(p=>p.user_id===args.id)?.tasks||[]):d.permissions.find(p=>p.user_id===args.id)?.capabilities||[];body=`<p class="muted">${tr("Bu yetkiler yalnızca V3 alanı içindir. Süper Admin yetkisi vermez.")}</p>`+(taskMode?taskOptions():[['finance',tr("Mali kayıtlar ve ödeme eşleştirme")],['import',tr("Banka dosyası içe aktarma")],['people',tr("Kişi kayıtları")],['announcements',tr("Duyuru oluşturma ve yayımlama")]]).map(([k,l])=>check(k,l,caps.includes(k))).join('')+(taskMode?'<input type="hidden" name="task_mode" value="1"><p class="fine">'+tr('Kaydetmek eski yetkileri bu beş görevle değiştirir. Seçilmeyen görevler kapalı kalır.')+'</p>':'');}
 else if(action==='settings'){title=tr("Defter açılışı");body=field('opening_date',tr("Açılış tarihi"),'date',today(),'required')+amount(tr("Açılış bakiyesi (TL)"),'0,00');}
 else if(action==='publish_report'){title=tr("Aylık mali raporu yayımla");body=`<p>${e(s.period)}${tr(" döneminin ortak toplamları site sakinlerine açılacak. Kişisel banka açıklamaları rapora dahil edilmez.")}</p><p class="fine">${tr("Aynı döneme ait önceki rapor güncellenir. Verilerin tamlığını kontrol edin.")}</p>`+check('confirmation',tr("Tutarları kontrol ettim, raporu yayımla."));}
 else if(action==='confirm_staged'){
  const r=d.staged.find(x=>x.id===args.id);if(!r)throw Error(tr("Kayıt bulunamadı."));const review=analyzeStage(r,d);title=tr("Devir kaydını doğrula");body=`<div class="info-strip"><strong>${e(r.person_label)}</strong><br>${tr("Belgedeki daire: ")}${e(r.unit_hint||tr("Belirtilmedi"))}<br>${tr("Tutar: ")}${money(Number(r.cents))}<br>${tr("Kaynak: ")}${e(r.source)}</div><p class="fine">${tr("Belge tarihini, daireyi, sorumlu kişiyi ve aynı borcun başka kayıtta bulunmadığını kontrol edin. Teyit edilmeden bu kayıt tahsilata dahil olmaz.")}</p>`+`<div class="fine">${review.warnings.map(w=>`<p class="error">${e(w)}</p>`).join('')}${review.unitEvidence.length?`<p>${tr("Banka dayanağı: ")}`+review.unitEvidence.map(x=>e(x.code)+' · '+e(x.date)+' · Ref. '+e(x.reference)+(x.shared?tr(" (ortak ödeme)"):'')).join('<br>')+'</p>':''}${review.paymentCandidates.length?`<p>${tr("Sonraki tahsilat adayı: ")}`+review.paymentCandidates.map(x=>e(x.date)+' · '+money(x.cents)+' · Ref. '+e(x.reference)).join('<br>')+'</p>':''}</div>`+select('unit_id',tr("Doğrulanan daire"),[['',tr("Daire seçin")],...unitOptions],review.suggestedUnitId||'')+select('payer',tr("Sorumlu taraf"),payers,action==='monthly'?'tenant':'review')+check('confirmation',tr("Daire ve tutarı kontrol ettim; açılış borcu olarak kaydet."));
 }
 else if(action==='ignore_staged'){title=tr("Devir kaydını hariç tut");body=text('reason',tr("Gerekçe (ör. mükerrer veya yanlış kayıt)"),'',500)+check('confirmation',tr("Bu kayıt açık borca dönüştürülmesin."));}
 else throw Error(tr("İşlem bulunamadı."));
 return {title,body,context};
}
export function payloadLegacy(action,form,context){
 const get=n=>String(form.get(n)||'').trim(),bool=n=>form.has(n);let p={...context};
 for(const [k,v] of form)if(k!=='confirmation')p[k]=String(v).trim();
 if(['monthly','reverse','unallocate','void_charge','publish_report','confirm_staged','ignore_staged'].includes(action)&&!bool('confirmation'))throw Error(tr("Devam etmek için onay kutusunu işaretleyin."));
 if(['entry','charge','monthly','allocate','settings'].includes(action)){
  const raw=get('amount');if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))throw Error(tr("Tutarı 3.600,00 biçiminde yazın."));
  const cents=Math.round(Number(raw.replaceAll('.','').replace(',','.'))*100);if(!Number.isSafeInteger(cents)||Math.abs(cents)>900000000000)throw Error(tr("Tutar geçersiz."));
  if(action!=='settings'&&cents<=0)throw Error(tr("Pozitif tutar yazın; gelir/gider türünü ayrıca seçin."));
  p.cents=action==='entry'&&get('direction')==='out'?-cents:cents;if(action==='settings')p.opening_cents=cents;
 }
 if(['reverse','unallocate','void_charge','ignore_staged'].includes(action)&&get('reason').length<3)throw Error(tr("En az üç karakterlik gerekçe yazın."));
 if(action==='person'){p.active=context.id?bool('active'):true;if(!p.full_name)throw Error(tr("Ad soyad gerekli."));}
 if(action==='announcement')p.published=bool('published');
 if(action==='permissions'){p.user_id=context.id;if(bool('task_mode'))p.tasks=taskOptions().map(([key])=>key).filter(bool);else p.capabilities=['finance','import','people','announcements'].filter(bool);}
 if(action==='publish_report')p.period=context.period+'-01';
 if(action==='confirm_staged'&&!p.unit_id)throw Error(tr("Daire seçin."));
 if(action==='ignore_staged'){p.ignore_reason=p.reason;}
 return p;
}

export const buildForm=(s,action,args)=>buildFinanceForm(s,action,args)||buildV3Form(s,action,args);
export function payloadFor(action,form,ctx){try{return ctx.v5?financePayload(action,form,ctx):payloadV3(action,form,ctx);}catch(error){error.message=tr(error.message);throw error;}}
