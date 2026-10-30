import {escapeHtml as e,randomId,money} from './core.mjs?v=5.8.1';
import {t as tr,getLanguage} from './i18n.mjs?v=5.9.28';
import {activeAt,personName} from './v3-domain.mjs?v=5.9.26';
import {financeLinkAt,amountCents,batchPreview,paymentPlan,chargeCategories,debtGroup,availableBudget} from './finance-v5.mjs?v=5.9.39';
const input=(n,label,type='text',value='',attrs='')=>`<label class="field">${tr(label)}<input name="${n}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const select=(n,label,values,value='')=>`<label class="field">${tr(label)}<select name="${n}">${values.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(tr(l))}</option>`).join('')}</select></label>`;
const check=(n,label,value='on')=>`<label class="check-field"><input type="checkbox" name="${n}" value="${e(value)}">${tr(label)}</label>`;
const amount=(n='amount',label='Tutar (TL)',value='')=>input(n,label,'text',value,'inputmode="decimal" required');
const groups=[['general','Genel borçlar'],['capital','Yatırım / demirbaş grubu'],['legal','Ayrı hukuki alacak grubu']];
const preview=()=>`<button type="button" class="button" data-finance-preview>${tr('Önizle')}</button><section id="financePreview" aria-live="polite"></section>${check('confirmed','Önizlemeyi ve sorumlu kişileri onaylıyorum.')}`;
export const financeActions=['batch_charge','monthly_v5','auto_allocate','monthly_exception','disable_exception','budget'];
export function buildFinanceForm(s,action,args={}){
 if(!financeActions.includes(action))return null;const d=s.data,context={request_id:randomId(),v5:true,unit_scope:Object.fromEntries(d.units.map(u=>[u.id,u.block])),...args};let body='',title='';
 if(['batch_charge','monthly_v5'].includes(action)){
  const monthly=action==='monthly_v5';title=tr(monthly?'Aidat oluştur':'Borç ekle');
  body=(monthly?'':select('category','Kategori',chargeCategories.map(x=>[x,x]),chargeCategories[0]))+input('label','Açıklama','text',monthly?s.period+' '+tr('Aidat'):'','required maxlength="200"')+amount()+input('due_on','Vade','date',s.period+'-01','required')+
   select('scope','Daire seçimi',[['all','Tüm daireler'],['A','Yalnız A Blok'],['B','Yalnız B Blok'],['selected','Seçili daireler']],'all')+
   (monthly?'<input name="distribution" type="hidden" value="per_unit">':select('distribution','Dağıtım',[['total','Toplamı paylaştır'],['per_unit','Daire başına sabit tutar'],['shares','Arsa payına göre']],'total'))+
   select('debtor_rule','Sorumlu önerisi',[['occupant','Kiracı varsa kiracı, yoksa ev sahibi'],['owner','Ev sahibi'],['tenant','Kiracı']],'occupant')+
   `<details class="finance-targets"><summary>${tr('Daireler ve sorumlu kişiler')}</summary><p>${tr('Önerileri kontrol edin. Kategori tek başına sorumlu kişiyi belirlemez.')}</p>${d.units.map(u=>`<section class="finance-target" data-finance-unit="${e(u.id)}" data-block-code="${e(u.block)}"><strong>${e(u.code)}</strong>${check('unit_ids',u.code,u.id)}${select('debtor:'+u.id,'Sorumlu kişi',[['','Kişi seçin.'],...d.links.filter(l=>l.unit_id===u.id&&['owner','tenant'].includes(l.role)&&financeLinkAt(l,s.period+'-01')).map(l=>[l.id,personName(d,l.person_id)+' · '+tr(l.role==='owner'?'Ev sahibi':'Kiracı')])])}${check('exclude', 'Hariç tut',u.id)}${input('exclude_reason:'+u.id,'Gerekçe')}${input('weight:'+u.id,'Arsa payı (tam sayı)','number','','min="1" max="1000000000"')}</section>`).join('')}</details>`+
   select('debt_group','Borç grubu',groups,'general')+(monthly?'':'<div data-levy-date hidden><label class="field">'+(getLanguage()==='de'?'Geprüfter Verantwortlichkeitszeitpunkt':'Kontrol edilen sorumluluk tarihi')+'<input name="liability_on" type="date"></label><p>'+(getLanguage()==='de'?'Bei Sonderumlagen Eigentümer ausdrücklich wählen. Frühere Eigentümer nur mit belegtem Zeitraum; keine automatische Schuldübertragung.':'Ek ödemede malik açıkça seçilir. Eski malik için belgeli dönem gerekir; borç otomatik aktarılmaz.')+'</p></div>')+input('basis_ref','Karar / dayanak referansı','text','','required minlength="3" maxlength="200"')+
   `<details><summary>${tr('Gelişmiş seçenekler')}</summary>${input('period_from','Dönem başlangıcı','date')}${input('period_to','Dönem bitişi','date')}</details>`;
  if(monthly&&(s.mode==='demo'?d.role==='super':d.capabilities?.admin))body+=`<details><summary>${tr('İstisnalar')}</summary>${exceptionList(d)}<p>${tr('Ücret / huzur hakkı aidattan otomatik düşülmez. Ayrı gider veya açıkça onaylanan ayrı işlem gerekir.')}</p><button type="button" class="button" data-action="monthly_exception">${tr('İstisna ekle')}</button></details>`;
  body+=preview();
 }else if(action==='auto_allocate'){
  title=tr('Ödeme eşleştir');body=select('entry_id','Tahsilat',[['','Tahsilat seçin'],...d.transactions.filter(t=>t.cents>0&&!t.reversal_of&&!d.transactions.some(x=>x.reversal_of===t.id)).map(t=>[t.id,t.date+' · '+money(t.cents)])],args.entry||'')+
  select('unit_id','Daire',[['','Daire seçin'],...d.units.map(u=>[u.id,u.code])],args.unit||'')+select('person_id','Sorumlu kişi',[['','Kişi seçin.']])+select('group','Borç grubu',[['','Borç grubunu seçin']])+`<p>${tr('Önce eski vadeler kapatılır. Fazla ödeme aynı kişi ve grup için alacak olarak saklanır. Açıklama zorunlu değildir.')}</p>`+preview();
 }else if(action==='monthly_exception'){
  title=tr('İstisna ekle');body=select('unit_id','Daire',d.units.map(u=>[u.id,u.code]),args.unit||d.units[0]?.id)+select('person_id','Kişi',[['','Dairenin tamamı'],...d.persons.map(p=>[p.id,p.full_name])])+select('kind','İstisna türü',[['exemption','Gerçek aidat muafiyeti'],['remuneration','Huzur hakkı / ayrı ücret']],'exemption')+amount('reference_amount','Referans tutar')+input('valid_from','Başlangıç','date',s.period+'-01','required')+input('valid_to','Bitiş (isteğe bağlı)','date')+input('reason','Gerekçe','text','','required minlength="3" maxlength="500"')+input('decision_ref','Karar / dayanak referansı','text','','required minlength="3" maxlength="200"')+`<p>${tr('Muafiyet yalnızca seçilen tutar ve dönem için geçerlidir. Huzur hakkı kaydı tek başına borç veya ödeme oluşturmaz.')}</p>`;
 }else if(action==='disable_exception'){
  title=tr('İstisnayı devre dışı bırak');context.id=args.id;body=input('reason','Gerekçe','text','','required minlength="3" maxlength="500"');
 }else{
  title=tr('Kullanılabilir bütçe');body=amount('restricted_amount','Amaca bağlı yedekler',String((d.budget?.restricted_cents||0)/100).replace('.',','))+amount('planned_amount','Planlanan giderler',String((d.budget?.planned_cents||0)/100).replace('.',','))+input('reason','Gerekçe','text','','required minlength="3" maxlength="500"');
 }
 return {title,body,context};
}
export function exceptionList(d){return (d.exceptions||[]).map(x=>`<article class="exception-row"><strong>${e(d.units.find(u=>u.id===x.unit_id)?.code||'')} · ${tr(x.kind==='exemption'?'Gerçek aidat muafiyeti':'Huzur hakkı / ayrı ücret')}</strong><p>${e(x.reason)} · ${e(x.decision_ref)} · ${money(x.reference_cents)}</p><small>${e(x.valid_from)} – ${e(x.valid_to||'∞')} · ${tr(x.disabled_at?'Devre dışı':'Aktif')}</small>${!x.disabled_at?`<button type="button" class="button" data-action="disable_exception" data-id="${e(x.id)}">${tr('Devre dışı bırak')}</button>`:''}</article>`).join('')||`<p>${tr('Kayıtlı istisna yok.')}</p>`;}
export function financePanel(s){const d=s.data,n=availableBudget(d);if(!(s.mode==='demo'?d.role==='super':d.capabilities?.admin))return `<section class="card"><h2>${tr('Finans araçları')}</h2><button class="button" data-action="auto_allocate">${tr('Ödeme eşleştir')}</button></section>`;return `<section class="card"><h2>${tr('Finans araçları')}</h2><div class="row-actions"><button class="button" data-action="entry" data-kind="expense">${tr('Gider ekle')}</button><button class="button" data-action="auto_allocate">${tr('Ödeme eşleştir')}</button><button class="button" data-action="monthly_exception">${tr('İstisna ekle')}</button><button class="button" data-action="budget">${tr('Kullanılabilir bütçe')}</button></div><p>${n===null?tr('Serbest bütçe henüz belirlenmedi.'):tr('Tahmini serbest tutar')+': '+money(n)}</p><p class="fine">${tr('Gider kaydı yeni sakin borcu oluşturmaz. Serbest tutar, nakit eksi amaca bağlı yedekler ve planlanan giderlerdir.')}</p><details><summary>${tr('İstisna geçmişi')}</summary>${exceptionList(d)}</details></section>`;}
export function updateFinanceForm(root,d,changed=''){
 const action=root.dataset.financeAction;if(!action)return;
 const val=n=>root.querySelector(`[name="${n}"]`)?.value||'';
 if(['batch_charge','monthly_v5'].includes(action)){
  const levy=action==='batch_charge'&&val('debt_group')==='capital',scope=val('scope'),mode=val('distribution'),rule=val('debtor_rule'),date=levy?val('liability_on'):val('due_on');
  const dateBlock=root.querySelector('[data-levy-date]');if(dateBlock){dateBlock.hidden=!levy;dateBlock.querySelector('input').required=levy;}
  for(const section of root.querySelectorAll('[data-finance-unit]')){
   const id=section.dataset.financeUnit,selected=scope==='all'||scope==='selected'||scope===section.dataset.blockCode;section.hidden=!selected;
   section.querySelector('[name="unit_ids"]').closest('label').hidden=scope!=='selected';
   const weights=section.querySelector(`[name="weight:${id}"]`);weights.closest('label').hidden=mode!=='shares';
   const reason=section.querySelector(`[name="exclude_reason:${id}"]`);reason.closest('label').hidden=!section.querySelector('[name="exclude"]').checked;
   const target=section.querySelector('select');if(!changed||['debtor_rule','due_on','liability_on','debt_group'].includes(changed)){
    const ls=d.links.filter(l=>l.unit_id===id&&date&&financeLinkAt(l,date,{historical:levy})&&(levy?l.role==='owner':['owner','tenant'].includes(l.role)));const role=rule==='occupant'?(ls.some(l=>l.role==='tenant')?'tenant':'owner'):rule;const eligible=ls.filter(l=>l.role===role);target.innerHTML=`<option value="">${tr('Kişi seçin.')}</option>`+ls.map(l=>`<option value="${e(l.id)}">${e(personName(d,l.person_id))} · ${tr(l.role==='owner'?'Ev sahibi':'Kiracı')}</option>`).join('');target.value=levy?'':eligible.length===1?eligible[0].id:'';
   }
  }
 }else if(action==='monthly_exception'){
  const person=root.querySelector('[name="person_id"]'),old=person.value,unit=val('unit_id');
  if(!changed||changed==='unit_id'){const ids=[...new Set(d.links.filter(l=>l.unit_id===unit).map(l=>l.person_id))];person.innerHTML=`<option value="">${tr('Dairenin tamamı')}</option>`+ids.map(id=>`<option value="${e(id)}">${e(personName(d,id))}</option>`).join('');if(ids.includes(old))person.value=old;}
 }else if(action==='auto_allocate'){
  const unit=val('unit_id'),person=root.querySelector('[name="person_id"]'),group=root.querySelector('[name="group"]');
  const oldPerson=person.value,oldGroup=group.value;
  if(!changed||changed==='unit_id')person.innerHTML=`<option value="">${tr('Kişi seçin.')}</option>`+[...new Set(d.links.filter(l=>l.unit_id===unit).map(l=>l.person_id))].map(id=>`<option value="${e(id)}">${e(personName(d,id))}</option>`).join('');
  if(!changed&&[...person.options].some(o=>o.value===oldPerson))person.value=oldPerson;
  if(!changed||['unit_id','person_id'].includes(changed)){
   const gs=[...new Set(d.charges.filter(c=>c.unit_id===unit&&c.person_id===person.value&&!c.void_reason).map(debtGroup))];group.innerHTML=`<option value="">${tr('Borç grubunu seçin')}</option>`+[...new Set([...gs,'general','capital','legal'])].map(g=>`<option value="${e(g)}">${e(tr(groups.find(([x])=>x===g)?.[1]||g.replace('legacy:',tr('Geçmiş')+' · ')))}</option>`).join('');
   if(!changed&&[...group.options].some(o=>o.value===oldGroup))group.value=oldGroup;
  }
 }
}
export function financePayload(action,form,ctx,{previewing=false}={}){
 const get=n=>String(form.get(n)||'').trim();const p={request_id:ctx.request_id};
 if(['batch_charge','monthly_v5'].includes(action)){
  Object.assign(p,{scope:get('scope'),unit_ids:form.getAll('unit_ids'),exclusions:form.getAll('exclude').map(unit_id=>({unit_id,reason:get('exclude_reason:'+unit_id)})),weights:{},debtors:{},distribution:get('distribution'),cents:amountCents(get('amount')),due_on:get('due_on'),label:get('label'),category:get('category'),debt_group:get('debt_group'),basis_ref:get('basis_ref'),period_from:get('period_from')||null,period_to:get('period_to')||null});
  p.exclusions=p.exclusions.filter(x=>p.scope==='all'||p.scope===ctx.unit_scope?.[x.unit_id]||p.scope==='selected'&&p.unit_ids.includes(x.unit_id));
  for(const[k,v]of form)if(k.startsWith('debtor:'))p.debtors[k.slice(7)]=v;else if(k.startsWith('weight:')&&v)p.weights[k.slice(7)]=Number(v);
  if(action==='batch_charge'&&p.debt_group==='capital'){p.liability_on=get('liability_on');if(!/^\d{4}-\d{2}-\d{2}$/.test(p.liability_on))throw Error(getLanguage()==='de'?'Verantwortlichkeitszeitpunkt wählen.':'Sorumluluk tarihini seçin.');}
  if(!p.label||!p.due_on||p.basis_ref.length<3)throw Error(tr('Açıklama, vade ve dayanak gerekli.'));
  if(p.period_from&&p.period_to&&p.period_to<p.period_from)throw Error(tr('Borç döneminin başlangıç ve bitiş tarihlerini kontrol edin.'));
 }else if(action==='auto_allocate'){
  for(const k of ['entry_id','unit_id','person_id','group']){p[k]=get(k);if(!p[k])throw Error(tr('Tahsilat, daire, kişi ve grup seçin.'));}
 }else if(action==='monthly_exception'){
  for(const k of ['unit_id','person_id','kind','valid_from','valid_to','reason','decision_ref'])p[k]=get(k)||null;p.reference_cents=amountCents(get('reference_amount'));
 }else if(action==='disable_exception'){p.id=ctx.id;p.reason=get('reason');}
 else if(action==='budget'){const zero=n=>get(n).match(/^0(?:,0{1,2})?$/)?0:amountCents(get(n));p.restricted_cents=zero('restricted_amount');p.planned_cents=zero('planned_amount');p.reason=get('reason');}
 const signature=JSON.stringify(p);
 if(!previewing&&['batch_charge','monthly_v5','auto_allocate'].includes(action)){
  if(!form.has('confirmed')||ctx.previewSignature!==signature)throw Error(tr('Önizlemeyi yeniden açın ve onaylayın.'));
  p.confirmed=true;if(action==='auto_allocate')p.expected_plan=ctx.preview;else p.expected=Object.fromEntries(ctx.preview.map(r=>[r.unit_id,r.cents]));
 }
 return p;
}
export function localFinancePreview(d,action,p){if(action==='auto_allocate')return paymentPlan(d,p);const rows=batchPreview(d,p);if(action==='monthly_v5')for(const row of rows){const ex=(d.exceptions||[]).find(x=>!x.disabled_at&&x.kind==='exemption'&&x.unit_id===row.unit_id&&(!x.person_id||x.person_id===row.person_id)&&x.valid_from<=p.due_on&&(!x.valid_to||x.valid_to>=p.due_on));if(ex){if(Number(ex.reference_cents)!==row.cents)throw Error(tr('İstisna tutarı değişti. Kararı yeniden kontrol edin.'));row.exempt=true;row.reason=ex.reason;}}return rows;}
export function financePreviewMarkup(d,action,value){const rows=action==='auto_allocate'?value.allocations:value;return `<h3>${tr('Önizleme')}</h3><div class="table-wrap"><table><thead><tr><th>${tr(action==='auto_allocate'?'Borç':'Daire / Kişi')}</th><th>${tr('Tutar')}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${action==='auto_allocate'?e(d.charges.find(c=>c.id===r.charge_id)?.label||r.charge_id):e(d.units.find(u=>u.id===r.unit_id)?.code||'')+' · '+e(personName(d,r.person_id))}${r.exempt?' · '+tr('Muaf')+' · '+e(r.reason):''}</td><td>${money(r.exempt?0:r.cents)}</td></tr>`).join('')}</tbody></table></div><p><strong>${tr('Toplam')}: ${money(rows.reduce((n,r)=>n+(r.exempt?0:r.cents),0))}</strong></p>${action==='auto_allocate'?`<p>${tr('Guthaben')}: <strong>${money(value.credit_cents)}</strong></p>`:''}`;}
