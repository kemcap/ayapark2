import {personPicker,bindPersonPicker} from './person-picker.mjs?v=20261104-person-picker-fix';
import {fieldError} from './ui-feedback.mjs?v=5.10.1';
import {t as tr,getLanguage} from './i18n.mjs?v=5.10.0';
import {escapeHtml as e,randomId} from './core.mjs?v=perf1';
import {activeAt,dateValid,norm,personName,today} from './v3-domain.mjs?v=perf1';
import {suggestedOwnerEnd,dayBefore} from './owner-history.mjs?v=20261104';
const transferText=(de,trText,en)=>getLanguage()==='tr'?trText:getLanguage()==='en'?en:de;
export const assignmentRoles=[['owner','Ev sahibi'],['tenant','Kiracı'],['representative','Temsilci']];
export const historicalRoles=[['historical_owner','Eski Ev Sahibi'],['historical_tenant','Eski Kiracı'],['historical_representative','Eski Temsilci']];
export const removalReasons=role=>[['mistake','Yanlışlıkla eklendi'],['ended',role==='owner'?'Mülkiyet ilişkisi sona erdi':role==='tenant'?'Kiracılık sona erdi':'Temsilcilik sona erdi'],['other','Diğer neden']];
const select=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}" aria-label="${e(tr(label))}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(tr(l))}</option>`).join('')}</select></label>`;
const field=(name,label,type='text',value='',attrs='')=>`<label class="field">${tr(label)}<input name="${name}" aria-label="${e(tr(label))}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const notes=value=>`<label class="field">${tr('Notlar (isteğe bağlı)')}<textarea name="notes" rows="3" maxlength="5000">${e(value||'')}</textarea></label>`;
const personFields=p=>field('first_name','Ad','text',p?.first_name||'','required maxlength="75"')+field('last_name','Soyad','text',p?.last_name||'','required maxlength="75"')+field('phone','Telefon (isteğe bağlı)','tel',p?.phone||'','maxlength="60"')+field('email','E-posta (isteğe bağlı)','email',p?.email||'','maxlength="254"')+notes(p?.notes);
const dates=l=>`<details class="assignment-more"><summary>${tr('Diğer bilgiler (isteğe bağlı)')}</summary><p class="fine">${tr('Tarihler yalnızca bilgi içindir. Güncel rolü veya dairenin kullanımını değiştirmez.')}</p>${field('starts_on','Başlangıç (isteğe bağlı)','date',l?.starts_on||'')}<label class="field">${tr('Bitiş (isteğe bağlı)')}<input name="ends_on" type="date" value="${e(l?.ends_on||'')}"><small data-owner-auto-note hidden>${tr('Automatisch: ein Tag vor dem nächsten Eigentümer')}</small></label></details>`;
export function buildAssignmentForm(d,action,args={}){
 const l=d.links.find(x=>x.id===args.id),p=d.persons.find(x=>x.id===(l?.person_id||args.person));
 if(action!=='assignment_add'&&!l)throw Error(tr('Kayıt bulunamadı.'));
 const unit=args.unit||l?.unit_id||d.units[0]?.id,context={request_id:randomId(),id:l?.id,unit_id:unit,person_id:p?.id,revision:l?.revision??1};
 const unitName=d.units.find(u=>u.id===unit)?.code||'',role=assignmentRoles.find(([v])=>v===l?.role)?.[1]||'';
 const intro=`<p class="assignment-context"><strong>${e(unitName)}</strong>${p?' · '+e(p.full_name):''}${role?' · '+e(tr(role)):''}</p>`;
 let title,body;
 if(action==='assignment_owner_transfer'){
  if(l?.role!=='owner'||!activeAt(l))throw Error(transferText('Aktuellen Eigentümer auswählen.','Güncel maliki seçin.','Select the current owner.'));
  const activeOwners=d.links.filter(x=>x.unit_id===unit&&x.role==='owner'&&activeAt(x));
  if(activeOwners.length!==1)throw Error(transferText('Mehrere Eigentümer: Anteile zuerst einzeln prüfen.','Birden fazla malik: Önce payları kontrol edin.','Multiple owners: review their shares first.'));
  title=transferText('Eigentümerwechsel','Malik değişimi','Ownership transfer');
  const candidatePeople=d.persons.filter(x=>x.id!==l.person_id&&!x.archived_at);
  body=intro+
   `<p class="info-strip">${transferText('Der bisherige Eigentümer wird im Verlauf gespeichert. Seine Person und seine Finanzdaten bleiben erhalten.','Önceki malik geçmişte saklanır. Kişi ve mali kayıtlar korunur.','The former owner remains in history. The person and financial records are preserved.')}</p>`+
   `<fieldset class="person-choice"><legend>${transferText('Neuer Eigentümer','Yeni malik','New owner')}</legend><label><input type="radio" name="person_mode" value="existing" checked>${transferText('Vorhandene Person auswählen','Kayıtlı kişi seç','Select existing person')}</label><label><input type="radio" name="person_mode" value="new">${transferText('Neue Person anlegen','Yeni kişi oluştur','Create new person')}</label></fieldset>`+
   `<div id="existingPersonFields">${personPicker(candidatePeople)}</div><div id="newPersonFields" hidden>${personFields(null)}</div>`+
   field('effective_on',transferText('Eigentumsübergang am','Mülkiyet devir tarihi','Ownership transfer date'),'date',today(),`required max="${today()}"`)+
   `<label class="check-field"><input type="checkbox" name="keep_as_tenant" checked>${transferText('Bisheriger Eigentümer bleibt als Mieter in der Wohnung','Eski malik dairede kiracı olarak kalıyor','Former owner remains in the apartment as tenant')}</label>`+
   `<label class="check-field"><input type="checkbox" name="confirmation" required>${transferText('Eigentümerwechsel und unveränderte Finanzhistorie bestätigen','Malik değişimini ve mali kayıtların korunmasını onaylıyorum','Confirm ownership change and preservation of financial history')}</label>`+
   `<p class="fine">${transferText('Keine automatische Schuldübertragung. Bei mehreren Eigentümern ist eine separate Prüfung erforderlich.','Borçlar otomatik devredilmez. Birden fazla malik varsa ayrı inceleme gerekir.','Debts are not automatically transferred. Multiple owners require a separate review.')}</p>`;
 }
 else if(action==='assignment_remove'){
  title=tr('Rolü kaldır');body=intro+select('reason','Kaldırma nedeni',[['','Neden seçin'],...removalReasons(l.role)])+`<div id="removalNote" hidden>${field('note','Not (isteğe bağlı)','text','','maxlength="500"')}</div><p class="fine">${tr('Yalnızca bu dairedeki rol kaldırılır. Kişi, diğer roller ve açık borçlar korunur. İşlem geçmişte saklanır.')}</p>`;
 }else if(action==='assignment_restore'){
  title=tr('Rolü geri getir');body=intro+`<p>${tr('Bu rol yeniden güncel olarak eklenecek. Önceki kayıt geçmişte korunur.')}</p>`;
 }else if(action==='assignment_edit'){
  title=tr('Kişiyi ve rolü düzenle');body=intro+personFields(p)+select('role','Dairedeki rol',assignmentRoles,l.role)+select('additional_role','Ek rol ekle',[['','Ek rol yok'],...assignmentRoles])+dates(l);
 }else{
  title=tr('Kişi ekle');
  body=(args.unit?`<p class="assignment-context"><strong>${e(unitName)}</strong></p>`:select('unit_id','Daire',d.units.map(u=>[u.id,u.code]),unit))+
   `<fieldset class="person-choice"><legend>${tr('Kişi seçimi')}</legend><label><input type="radio" name="person_mode" value="existing" ${args.person==='__new__'?'':'checked'}>${tr('Kayıtlı kişi seç')}</label><label><input type="radio" name="person_mode" value="new" ${args.person==='__new__'?'checked':''}>${tr('Yeni kişi oluştur')}</label></fieldset>`+
   `<div id="existingPersonFields">${personPicker(d.persons,p?.id||'')}</div><div id="newPersonFields" hidden>${personFields(null)}</div>`+
   select('role','Dairedeki rol',[...assignmentRoles,...historicalRoles],'tenant')+dates(null);
 }
 if(['assignment_add','assignment_edit','assignment_restore'].includes(action))body+=`<details><summary>${tr('Temsilci bildirim yetkisi')}</summary><p>${tr('Yalnızca temsilci rolü için. Ek borç oluşturmaz.')}</p><label class="check-field"><input type="checkbox" name="mandate_owners" ${l?.mandates?.includes('owners')?'checked':''}>${tr('Malik duyurularını alabilir')}</label><label class="check-field"><input type="checkbox" name="mandate_residents" ${l?.mandates?.includes('residents')?'checked':''}>${tr('Sakin duyurularını alabilir')}</label></details>`;
 return {title,body:`<div class="assignment-form" data-unit="${e(unit)}" data-former-owner="${e(action==='assignment_owner_transfer'?l.person_id:'')}">${body}</div>`,context};
}
export function updateAssignmentForm(container,d,changed=''){
 const mode=container.querySelector('[name="person_mode"]:checked')?.value;
 if(mode){
  const fresh=mode==='new',old=container.querySelector('#existingPersonFields'),newFields=container.querySelector('#newPersonFields');old.hidden=fresh;newFields.hidden=!fresh;
  for(const node of old.querySelectorAll('input,select'))node.disabled=fresh;
  for(const node of newFields.querySelectorAll('input,textarea')){node.disabled=!fresh;node.required=fresh&&['first_name','last_name'].includes(node.name);}
  bindPersonPicker(container,container.dataset.formerOwner?d.persons.filter(p=>p.id!==container.dataset.formerOwner):d.persons);
 }
 const role=container.querySelector('[name="role"]')?.value,start=container.querySelector('[name="starts_on"]')?.value,end=container.querySelector('[name="ends_on"]');
 if(end){
  const unit=container.querySelector('[name="unit_id"]')?.value||container.dataset.unit;
  const person=container.querySelector('[name="person_id"]')?.value||null;
  const computed=role==='historical_owner'?suggestedOwnerEnd(d.links,unit,start,person):null;
  const note=container.querySelector('[data-owner-auto-note]');
  if(computed){end.value=computed;end.readOnly=true;end.dataset.ownerAuto='true';end.classList.add('owner-auto-date');end.setAttribute('aria-readonly','true');}
  else {if(end.dataset.ownerAuto==='true')end.value='';end.readOnly=false;end.dataset.ownerAuto='false';end.classList.remove('owner-auto-date');end.removeAttribute('aria-readonly');}
  if(note)note.hidden=!computed;
 }
 const reason=container.querySelector('[name="reason"]'),note=container.querySelector('#removalNote');if(reason&&note){note.hidden=reason.value!=='other';note.querySelector('input').disabled=note.hidden;}
}
export function assignmentPayload(action,form,ctx){
 if(action==='assignment_owner_transfer'){
  const effective_on=String(form.get('effective_on')||'').trim();
  const new_person=form.get('person_mode')==='new';
  const new_owner_id=new_person?null:String(form.get('person_id')||'').trim()||null;
  const first_name=String(form.get('first_name')||'').trim();
  const last_name=String(form.get('last_name')||'').trim();
  if(!dateValid(effective_on)||effective_on>today())throw fieldError(transferText('Gültiges Datum bis heute wählen.','Bugüne kadar geçerli bir tarih seçin.','Choose a valid date up to today.'),'effective_on');
  if(!new_person&&!new_owner_id)throw fieldError(tr('Kişi seçin.'),'person_id');
  if(new_owner_id===ctx.person_id)throw fieldError(transferText('Bitte eine andere Person auswählen.','Farklı bir kişi seçin.','Select a different person.'),'person_id');
  if(new_person&&(!first_name||!last_name))throw fieldError(tr('Ad ve soyad gerekli.'),!first_name?'first_name':'last_name');
  if(!form.has('confirmation'))throw fieldError(transferText('Bitte Wechsel bestätigen.','Lütfen devri onaylayın.','Please confirm the transfer.'),'confirmation');
  return {request_id:ctx.request_id,id:ctx.id,unit_id:ctx.unit_id,revision:ctx.revision,
   effective_on,keep_as_tenant:form.has('keep_as_tenant'),confirmation:true,new_person,new_owner_id,
   ...(new_person?{first_name,last_name,phone:String(form.get('phone')||'').trim(),email:String(form.get('email')||'').trim(),notes:String(form.get('notes')||'').trim()}: {})};
 }
 const p={request_id:ctx.request_id,id:ctx.id,unit_id:ctx.unit_id,revision:ctx.revision};for(const[k,v]of form)if(k!=='person_search')p[k]=String(v).trim();
 if(action==='assignment_add'){p.new_person=p.person_mode==='new';if(!p.new_person&&!p.person_id)throw fieldError(tr('Kişi seçin.'),'person_id');}
 if(action==='assignment_edit'||action==='assignment_add'&&p.new_person){if(!p.first_name||!p.last_name)throw fieldError(tr('Ad ve soyad gerekli.'),!p.first_name?'first_name':'last_name');}
 if(['assignment_add','assignment_edit'].includes(action)){
  if(action==='assignment_add'&&p.role.startsWith('historical_')){p.historical=true;p.role=p.role.slice('historical_'.length);}
  if(!assignmentRoles.some(([r])=>r===p.role))throw Error(tr('Geçerli bir rol seçin.'));
  for(const key of ['starts_on','ends_on']){if(p[key]&&!dateValid(p[key]))throw fieldError(tr('Geçerli bir tarih girin veya boş bırakın.'),key);p[key]=p[key]||null;}
  if(p.starts_on&&p.ends_on&&p.ends_on<p.starts_on)throw fieldError(tr('Bitiş tarihi başlangıç tarihinden önce olamaz.'),'ends_on');
 }
 if(action==='assignment_remove'&&!['mistake','ended','other'].includes(p.reason))throw fieldError(tr('Kaldırma nedenini seçin.'),'reason');
 if(['assignment_add','assignment_edit','assignment_restore'].includes(action))p.mandates=[...(form.has('mandate_owners')?['owners']:[]),...(form.has('mandate_residents')?['residents']:[])];
 return p;
}
const canonicalPayload=value=>JSON.stringify(value,(_key,item)=>
 item&&typeof item==='object'&&!Array.isArray(item)
  ?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)))
  :item);
export function applyAssignmentDemo(d,action,p){
 const prior=p.request_id?d.audit.find(x=>x.action===action&&x.details?.request_id===p.request_id):null;
 if(prior){
  if(!prior.details?.payload||canonicalPayload(prior.details.payload)!==canonicalPayload(p))
   throw Error(tr('Bu istek farklı değerlerle kaydedildi.'));
  return {ok:true,already_recorded:true};
 }
 const clone=structuredClone(d),result=changeDemo(clone,action,p);Object.assign(d,clone);return result;
}
function changeDemo(d,action,p){
 if(action==='assignment_owner_transfer')return demoOwnerTransfer(d,p);
 const l=d.links.find(x=>x.id===p.id),before=l?{...l}:null;
 if(action!=='assignment_add'&&!l)throw Error(tr('Kayıt bulunamadı.'));
 if(l&&p.revision!==undefined&&Number(p.revision)!==(l.revision??1))throw Error(tr('Kayıt değişti. Görünümü yenileyip tekrar deneyin.'));
 if(action==='assignment_edit'&&!activeAt(l))throw Error(tr('Bu rol arşivde. Önce geri getirin.'));
 const unit=l?.unit_id||p.unit_id;if(!d.units.some(u=>u.id===unit))throw Error(tr('Daire bulunamadı.'));
 let pid=l?.person_id||p.person_id,id=l?.id;
 const add=(role,starts,ends,source)=>{
  const existing=d.links.find(x=>x.unit_id===unit&&x.person_id===pid&&x.role===role&&activeAt(x));if(existing)return existing.id;
  const row={id:randomId(),unit_id:unit,person_id:pid,role,active:true,starts_on:starts||null,ends_on:ends||null,revision:1,responsibility:source?.responsibility||'',primary_contact:source?.primary_contact||false};d.links.push(row);return row.id;
 };
 if(action==='assignment_remove'){if(!['mistake','ended','other'].includes(p.reason))throw fieldError(tr('Kaldırma nedenini seçin.'),'reason');Object.assign(l,{active:false,archived_at:new Date().toISOString(),archive_reason:p.reason,archive_note:p.note||'',revision:(l.revision??1)+1});}
 else if(action==='assignment_restore'){id=add(l.role,l.starts_on,l.ends_on,l);}
 else {
  if(!assignmentRoles.some(([r])=>r===p.role))throw Error(tr('Geçerli bir rol seçin.'));
  if(action==='assignment_add'&&p.new_person){pid=randomId();d.persons.push({id:pid,first_name:p.first_name,last_name:p.last_name,full_name:p.first_name+' '+p.last_name,phone:p.phone||'',email:p.email||'',notes:p.notes||'',language:'tr'});}
  const person=d.persons.find(x=>x.id===pid);if(!person)throw Error(tr('Kişi seçin.'));
  if(action==='assignment_edit'||p.new_person){if(!(p.first_name??person.first_name)||!(p.last_name??person.last_name))throw Error(tr('Ad ve soyad gerekli.'));for(const key of ['first_name','last_name','phone','email','notes'])if(p[key]!==undefined)person[key]=p[key];person.full_name=person.first_name+' '+person.last_name;}
  if(action==='assignment_edit'&&l.role===p.role){Object.assign(l,{starts_on:p.starts_on||null,ends_on:p.ends_on||null,revision:(l.revision??1)+1});}
  else {if(l)Object.assign(l,{active:false,archive_reason:'role_changed',archived_at:new Date().toISOString(),revision:(l.revision??1)+1});id=add(p.role,p.starts_on,p.ends_on,l);}
  if(p.additional_role&&p.additional_role!==p.role){if(!assignmentRoles.some(([r])=>r===p.additional_role))throw Error(tr('Geçerli bir rol seçin.'));add(p.additional_role,p.starts_on,p.ends_on);}
 }
 const changed=d.links.find(x=>x.id===id);if(changed&&p.mandates)changed.mandates=changed.role==='representative'?[...new Set(p.mandates)]:[];
 d.audit.unshift({id:randomId(),action,at:new Date().toISOString(),details:{request_id:p.request_id,payload:structuredClone(p),before,after:changed?{...changed}:null,reason:p.reason,note:p.note,person_id:pid}});return {ok:true,id};
}

function demoOwnerTransfer(d,p){
 const former=d.links.find(l=>l.id===p.id&&l.unit_id===p.unit_id&&l.role==='owner'&&activeAt(l));
 if(!former)throw Error('Current owner not found');
 if(Number(p.revision)!==(former.revision??1))throw Error('Assignment changed; refresh.');
 if(!dateValid(p.effective_on)||p.effective_on>today()||former.starts_on&&p.effective_on<=former.starts_on)throw Error('Invalid transfer date');
 if(d.links.filter(l=>l.unit_id===p.unit_id&&l.role==='owner'&&activeAt(l)).length!==1)throw Error('Multiple owners: manual review required');
 let newOwner=p.new_person?null:d.persons.find(x=>x.id===p.new_owner_id&&!x.archived_at);
 if(p.new_person){
  if(!p.first_name||!p.last_name)throw Error('New owner name required');
  newOwner={id:randomId(),first_name:p.first_name,last_name:p.last_name,full_name:p.first_name+' '+p.last_name,
   phone:p.phone||'',email:p.email||'',notes:p.notes||'',language:'tr'};
  d.persons.push(newOwner);
 }
 if(!newOwner||newOwner.id===former.person_id)throw Error('Choose another owner');
 const before={...former};
 Object.assign(former,{active:false,ends_on:dayBefore(p.effective_on),ends_on_auto:false,
   archive_reason:'ownership_transfer',archived_at:new Date().toISOString(),revision:(former.revision??1)+1});
 const newLink={id:randomId(),unit_id:former.unit_id,person_id:newOwner.id,role:'owner',
   starts_on:p.effective_on,ends_on:null,active:true,revision:1};
 d.links.push(newLink);
 let tenant=d.links.find(l=>l.unit_id===former.unit_id&&l.person_id===former.person_id&&l.role==='tenant'&&activeAt(l));
 if(p.keep_as_tenant&&!tenant){
  tenant={id:randomId(),unit_id:former.unit_id,person_id:former.person_id,role:'tenant',
   starts_on:p.effective_on,ends_on:null,active:true,revision:1};
  d.links.push(tenant);
 }
 d.audit.unshift({id:randomId(),action:'assignment_owner_transfer',at:new Date().toISOString(),
   details:{request_id:p.request_id,before,after:newLink,tenant_id:p.keep_as_tenant?tenant?.id:null}});
 return {ok:true,new_owner_link_id:newLink.id,tenant_link_id:p.keep_as_tenant?tenant?.id:null};
}
