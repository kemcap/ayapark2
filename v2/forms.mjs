import {escapeHtml as e,money,randomId} from './core.mjs';
import {remaining,unassigned} from './ledger.mjs';
import {analyzeStage} from './reconcile.mjs';
export const field=(name,label,type='text',value='',attrs='')=>`<label class="field">${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const select=(name,label,options,value='')=>`<label class="field">${label}<select name="${name}">${options.map(([v,l])=>`<option value="${e(v)}" ${String(v)===String(value)?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const check=(name,label,checked=false)=>`<label class="check-field"><input type="checkbox" name="${name}" ${checked?'checked':''}>${label}</label>`;
const text=(name,label,value='',max=5000)=>`<label class="field">${label}<textarea name="${name}" maxlength="${max}" required rows="5">${e(value)}</textarea></label>`;
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'});
const amount=(label='Tutar (TL)',value='')=>field('amount',label,'text',value,'inputmode="decimal" required placeholder="3.600,00"');
const payers=[['review','Sorumlu teyit edilmeli'],['tenant','Site sakini'],['owner','Kat maliki']];
const categories=['Aidat','Havuz','Asansör','Demirbaş','Devir','İcra','Temizlik','Peyzaj','Elektrik','Banka masrafı','Diğer'];
const cat=()=>select('category','Kategori',categories.map(x=>[x,x]),'Aidat');
export function buildForm(s,action,args={}){
 const d=s.data,unitOptions=d.units.map(u=>[u.id,u.code]);let title='',body='',context={...args,request_id:randomId()};
 if(action==='charge'||action==='monthly'){
  title=action==='monthly'?'Aylık aidat oluştur':'Borç ekle';body=(action==='charge'?select('unit_id','Daire',unitOptions,args.unit):'')+field('label','Açıklama','text',action==='monthly'?s.period+' aidatı':'','required maxlength="200"')+field('due_on','Vade','date',s.period+'-01','required')+amount()+select('payer','Sorumlu taraf',payers,'review')+(action==='charge'?cat():check('confirmation',`${d.units.length} daireye birer aidat kaydı oluşturulacağını onaylıyorum.`));
  context.reference='manual:'+context.request_id;
 }
 else if(action==='entry'){title='Manuel hesap hareketi';body=field('date','İşlem tarihi','date',today(),'required')+field('desc','Açıklama','text','','required maxlength="500"')+cat()+select('direction','Hareket türü',[['in','Tahsilat / gelir'],['out','Gider']])+amount()+field('reference','Banka / belge referansı','text','','maxlength="100"');}
 else if(action==='allocate'){
  title='Ödemeyi borçla eşleştir';const entries=d.transactions.filter(t=>t.cents>0&&!t.reversal_of&&!d.transactions.some(x=>x.reversal_of===t.id)&&unassigned(d,t)>0),charges=d.charges.filter(c=>remaining(d,c)>0);
  if(!entries.length||!charges.length)throw Error('Eşleştirme için açık borç ve kullanılabilir tahsilat gerekli.');
  body=select('entry_id','Tahsilat',entries.map(t=>[t.id,t.date+' · '+t.desc.slice(0,60)+' · Kullanılabilir '+money(unassigned(d,t))]),args.entry)+select('charge_id','Borç',charges.map(c=>[c.id,(d.units.find(u=>u.id===c.unit_id)?.code||'')+' · '+c.label+' · Kalan '+money(remaining(d,c))]),args.charge)+amount()+`<p class="fine">Kısmi ödeme desteklenir. Aynı tahsilatı birden fazla borca ayrı ayrı eşleştirebilirsiniz.</p>`;
 }
 else if(['reverse','unallocate','void_charge'].includes(action)){title={reverse:'Storno oluştur',unallocate:'Eşleştirmeyi kaldır',void_charge:'Borcu iptal et'}[action];body='<div class="info-strip">Bu işlem gerekçesiyle kaydedilir. Mevcut kayıt geçmişten silinmez.</div>'+text('reason','Gerekçe','',500)+check('confirmation','Düzeltmeyi onaylıyorum.');}
 else if(action==='person'){
  const p=d.people.find(p=>p.id===args.id);title=p?'Kişi bilgilerini düzenle':'Kişi ekle';body=(p?'':select('unit_id','Daire',unitOptions,args.unit))+field('full_name','Ad soyad','text',p?.full_name||'','required maxlength="150"')+select('relation','İlişki',[['owner','Kat maliki'],['tenant','Kiracı']],p?.relation||'owner')+field('email','E-posta','email',p?.email||'','maxlength="254"')+field('phone','Telefon','tel',p?.phone||'','maxlength="60"')+(p?check('active','Aktif kişi',p.active):'');
 }
 else if(action==='announcement'){const a=d.announcements.find(a=>a.id===args.id);title=a?'Duyuruyu düzenle':'Duyuru oluştur';body=field('title','Başlık','text',a?.title||'','required maxlength="150"')+text('body','Duyuru metni',a?.body||'')+check('published','Site sakinlerine yayımla',a?.published||false);}
 else if(action==='permissions'){title='Yönetim yetkileri';const caps=d.permissions.find(p=>p.user_id===args.id)?.capabilities||[];body='<p class="muted">Bu yetkiler yalnızca V2 alanı içindir. Süper Admin yetkisi vermez.</p>'+[['finance','Mali kayıtlar ve ödeme eşleştirme'],['import','Banka dosyası içe aktarma'],['people','Kişi kayıtları'],['announcements','Duyuru oluşturma ve yayımlama']].map(([k,l])=>check(k,l,caps.includes(k))).join('');}
 else if(action==='settings'){title='Defter açılışı';body=field('opening_date','Açılış tarihi','date',today(),'required')+amount('Açılış bakiyesi (TL)','0,00');}
 else if(action==='publish_report'){title='Aylık mali raporu yayımla';body=`<p>${e(s.period)} döneminin ortak toplamları site sakinlerine açılacak. Kişisel banka açıklamaları rapora dahil edilmez.</p><p class="fine">Aynı döneme ait önceki rapor güncellenir. Verilerin tamlığını kontrol edin.</p>`+check('confirmation','Tutarları kontrol ettim, raporu yayımla.');}
 else if(action==='confirm_staged'){
  const r=d.staged.find(x=>x.id===args.id);if(!r)throw Error('Kayıt bulunamadı.');const review=analyzeStage(r,d);title='Devir kaydını doğrula';body=`<div class="info-strip"><strong>${e(r.person_label)}</strong><br>Belgedeki daire: ${e(r.unit_hint||'Belirtilmedi')}<br>Tutar: ${money(Number(r.cents))}<br>Kaynak: ${e(r.source)}</div><p class="fine">Belge tarihini, daireyi, sorumlu kişiyi ve aynı borcun başka kayıtta bulunmadığını kontrol edin. Teyit edilmeden bu kayıt tahsilata dahil olmaz.</p>`+`<div class="fine">${review.warnings.map(w=>`<p class="error">${e(w)}</p>`).join('')}${review.unitEvidence.length?'<p>Banka dayanağı: '+review.unitEvidence.map(x=>e(x.code)+' · '+e(x.date)+' · Ref. '+e(x.reference)+(x.shared?' (ortak ödeme)':'')).join('<br>')+'</p>':''}${review.paymentCandidates.length?'<p>Sonraki tahsilat adayı: '+review.paymentCandidates.map(x=>e(x.date)+' · '+money(x.cents)+' · Ref. '+e(x.reference)).join('<br>')+'</p>':''}</div>`+select('unit_id','Doğrulanan daire',[['','Daire seçin'],...unitOptions],review.suggestedUnitId||'')+select('payer','Sorumlu taraf',payers,'review')+check('confirmation','Daire ve tutarı kontrol ettim; açılış borcu olarak kaydet.');
 }
 else if(action==='ignore_staged'){title='Devir kaydını hariç tut';body=text('reason','Gerekçe (ör. mükerrer veya yanlış kayıt)','',500)+check('confirmation','Bu kayıt açık borca dönüştürülmesin.');}
 else throw Error('İşlem bulunamadı.');
 return {title,body,context};
}
export function payloadFor(action,form,context){
 const get=n=>String(form.get(n)||'').trim(),bool=n=>form.has(n);let p={...context};
 for(const [k,v] of form)if(k!=='confirmation')p[k]=String(v).trim();
 if(['monthly','reverse','unallocate','void_charge','publish_report','confirm_staged','ignore_staged'].includes(action)&&!bool('confirmation'))throw Error('Devam etmek için onay kutusunu işaretleyin.');
 if(['entry','charge','monthly','allocate','settings'].includes(action)){
  const raw=get('amount');if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))throw Error('Tutarı 3.600,00 biçiminde yazın.');
  const cents=Math.round(Number(raw.replaceAll('.','').replace(',','.'))*100);if(!Number.isSafeInteger(cents)||Math.abs(cents)>900000000000)throw Error('Tutar geçersiz.');
  if(action!=='settings'&&cents<=0)throw Error('Pozitif tutar yazın; gelir/gider türünü ayrıca seçin.');
  p.cents=action==='entry'&&get('direction')==='out'?-cents:cents;if(action==='settings')p.opening_cents=cents;
 }
 if(['reverse','unallocate','void_charge','ignore_staged'].includes(action)&&get('reason').length<3)throw Error('En az üç karakterlik gerekçe yazın.');
 if(action==='person'){p.active=context.id?bool('active'):true;if(!p.full_name)throw Error('Ad soyad gerekli.');}
 if(action==='announcement')p.published=bool('published');
 if(action==='permissions'){p.user_id=context.id;p.capabilities=['finance','import','people','announcements'].filter(bool);}
 if(action==='publish_report')p.period=context.period+'-01';
 if(action==='confirm_staged'&&!p.unit_id)throw Error('Daire seçin.');
 if(action==='ignore_staged'){p.ignore_reason=p.reason;}
 return p;
}
