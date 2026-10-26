import {fieldError} from './ui-feedback.mjs?v=5.3.1';
import {t as tr} from './i18n.mjs?v=5.3.1';
import {escapeHtml as e,randomId} from './core.mjs?v=5.3.1';
import {activeAt,dateValid,norm,personName} from './v3-domain.mjs?v=5.3.1';
export const assignmentRoles=[['owner','Ev sahibi'],['tenant','Kiracı'],['representative','Temsilci']];
export const removalReasons=role=>[['mistake','Yanlışlıkla eklendi'],['ended',role==='owner'?'Mülkiyet ilişkisi sona erdi':role==='tenant'?'Kiracılık sona erdi':'Temsilcilik sona erdi'],['other','Diğer neden']];
const select=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}" aria-label="${e(tr(label))}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(tr(l))}</option>`).join('')}</select></label>`;
const field=(name,label,type='text',value='',attrs='')=>`<label class="field">${tr(label)}<input name="${name}" aria-label="${e(tr(label))}" type="${type}" value="${e(value)}" ${attrs}></label>`;
const notes=value=>`<label class="field">${tr('Notlar (isteğe bağlı)')}<textarea name="notes" rows="3" maxlength="5000">${e(value||'')}</textarea></label>`;
const personFields=p=>field('first_name','Ad','text',p?.first_name||'','required maxlength="75"')+field('last_name','Soyad','text',p?.last_name||'','required maxlength="75"')+field('phone','Telefon (isteğe bağlı)','tel',p?.phone||'','maxlength="60"')+field('email','E-posta (isteğe bağlı)','email',p?.email||'','maxlength="254"')+notes(p?.notes);
const dates=l=>`<details class="assignment-more"><summary>${tr('Diğer bilgiler (isteğe bağlı)')}</summary><p class="fine">${tr('Tarihler yalnızca bilgi içindir. Güncel rolü veya dairenin kullanımını değiştirmez.')}</p>${field('starts_on','Başlangıç (isteğe bağlı)','date',l?.starts_on||'')}${field('ends_on','Bitiş (isteğe bağlı)','date',l?.ends_on||'')}</details>`;
export function buildAssignmentForm(d,action,args={}){
 const l=d.links.find(x=>x.id===args.id),p=d.persons.find(x=>x.id===(l?.person_id||args.person));
 if(action!=='assignment_add'&&!l)throw Error(tr('Kayıt bulunamadı.'));
 const unit=args.unit||l?.unit_id||d.units[0]?.id,context={request_id:randomId(),id:l?.id,unit_id:unit,person_id:p?.id,revision:l?.revision??1};
 const unitName=d.units.find(u=>u.id===unit)?.code||'',role=assignmentRoles.find(([v])=>v===l?.role)?.[1]||'';
 const intro=`<p class="assignment-context"><strong>${e(unitName)}</strong>${p?' · '+e(p.full_name):''}${role?' · '+e(tr(role)):''}</p>`;
 let title,body;
 if(action==='assignment_remove'){
  title=tr('Rolü kaldır');body=intro+select('reason','Kaldırma nedeni',[['','Neden seçin'],...removalReasons(l.role)])+`<div id="removalNote" hidden>${field('note','Not (isteğe bağlı)','text','','maxlength="500"')}</div><p class="fine">${tr('Yalnızca bu dairedeki rol kaldırılır. Kişi, diğer roller ve açık borçlar korunur. İşlem geçmişte saklanır.')}</p>`;
 }else if(action==='assignment_restore'){
  title=tr('Rolü geri getir');body=intro+`<p>${tr('Bu rol yeniden güncel olarak eklenecek. Önceki kayıt geçmişte korunur.')}</p>`;
 }else if(action==='assignment_edit'){
  title=tr('Kişiyi ve rolü düzenle');body=intro+personFields(p)+select('role','Dairedeki rol',assignmentRoles,l.role)+select('additional_role','Ek rol ekle',[['','Ek rol yok'],...assignmentRoles])+dates(l);
 }else{
  title=tr('Kişi ekle');
  body=(args.unit?`<p class="assignment-context"><strong>${e(unitName)}</strong></p>`:select('unit_id','Daire',d.units.map(u=>[u.id,u.code]),unit))+
   `<fieldset class="person-choice"><legend>${tr('Kişi seçimi')}</legend><label><input type="radio" name="person_mode" value="existing" ${args.person==='__new__'?'':'checked'}>${tr('Kayıtlı kişi seç')}</label><label><input type="radio" name="person_mode" value="new" ${args.person==='__new__'?'checked':''}>${tr('Yeni kişi oluştur')}</label></fieldset>`+
   `<div id="existingPersonFields">${field('person_search','Kişi ara','search','','placeholder="'+e(tr('Ad, telefon veya e-posta ara'))+'"')}${select('person_id','Kişi',[['','Kişi seçin.'],...d.persons.map(p=>[p.id,p.full_name])],p?.id||'')}</div><div id="newPersonFields" hidden>${personFields(null)}</div>`+
   select('role','Dairedeki rol',assignmentRoles,'tenant')+dates(null);
 }
 if(['assignment_add','assignment_edit','assignment_restore'].includes(action))body+=`<details><summary>${tr('Temsilci bildirim yetkisi')}</summary><p>${tr('Yalnızca temsilci rolü için. Ek borç oluşturmaz.')}</p><label class="check-field"><input type="checkbox" name="mandate_owners" ${l?.mandates?.includes('owners')?'checked':''}>${tr('Malik duyurularını alabilir')}</label><label class="check-field"><input type="checkbox" name="mandate_residents" ${l?.mandates?.includes('residents')?'checked':''}>${tr('Sakin duyurularını alabilir')}</label></details>`;
 return {title,body:`<div class="assignment-form">${body}</div>`,context};
}
export function updateAssignmentForm(container,d,changed=''){
 const mode=container.querySelector('[name="person_mode"]:checked')?.value;
 if(mode){
  const fresh=mode==='new',old=container.querySelector('#existingPersonFields'),newFields=container.querySelector('#newPersonFields');old.hidden=fresh;newFields.hidden=!fresh;
  for(const node of old.querySelectorAll('input,select'))node.disabled=fresh;
  for(const node of newFields.querySelectorAll('input,textarea')){node.disabled=!fresh;node.required=fresh&&['first_name','last_name'].includes(node.name);}
  const list=old.querySelector('[name="person_id"]'),q=norm(old.querySelector('[name="person_search"]').value),value=list.value;
  const matches=d.persons.filter(p=>!q||norm([p.full_name,p.phone,p.email].join(' ')).includes(q));
  list.innerHTML=`<option value="">${e(tr(matches.length?'Kişi seçin.':'Kişi bulunamadı.'))}</option>`+matches.map(p=>`<option value="${e(p.id)}" ${p.id===value?'selected':''}>${e(p.full_name)}</option>`).join('');
 }
 const reason=container.querySelector('[name="reason"]'),note=container.querySelector('#removalNote');if(reason&&note){note.hidden=reason.value!=='other';note.querySelector('input').disabled=note.hidden;}
}
export function assignmentPayload(action,form,ctx){
 const p={request_id:ctx.request_id,id:ctx.id,unit_id:ctx.unit_id,revision:ctx.revision};for(const[k,v]of form)if(k!=='person_search')p[k]=String(v).trim();
 if(action==='assignment_add'){p.new_person=p.person_mode==='new';if(!p.new_person&&!p.person_id)throw fieldError(tr('Kişi seçin.'),'person_id');}
 if(action==='assignment_edit'||action==='assignment_add'&&p.new_person){if(!p.first_name||!p.last_name)throw fieldError(tr('Ad ve soyad gerekli.'),!p.first_name?'first_name':'last_name');}
 if(['assignment_add','assignment_edit'].includes(action)){
  if(!assignmentRoles.some(([r])=>r===p.role))throw Error(tr('Geçerli bir rol seçin.'));
  for(const key of ['starts_on','ends_on']){if(p[key]&&!dateValid(p[key]))throw fieldError(tr('Geçerli bir tarih girin veya boş bırakın.'),key);p[key]=p[key]||null;}
  if(p.starts_on&&p.ends_on&&p.ends_on<p.starts_on)throw fieldError(tr('Bitiş tarihi başlangıç tarihinden önce olamaz.'),'ends_on');
 }
 if(action==='assignment_remove'&&!['mistake','ended','other'].includes(p.reason))throw fieldError(tr('Kaldırma nedenini seçin.'),'reason');
 if(['assignment_add','assignment_edit','assignment_restore'].includes(action))p.mandates=[...(form.has('mandate_owners')?['owners']:[]),...(form.has('mandate_residents')?['residents']:[])];
 return p;
}
export function applyAssignmentDemo(d,action,p){
 if(d.audit.some(x=>x.action===action&&x.details?.request_id===p.request_id))return {ok:true,already_recorded:true};
 const clone=structuredClone(d),result=changeDemo(clone,action,p);Object.assign(d,clone);return result;
}
function changeDemo(d,action,p){
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
 d.audit.unshift({id:randomId(),action,at:new Date().toISOString(),details:{request_id:p.request_id,before,after:changed?{...changed}:null,reason:p.reason,note:p.note,person_id:pid}});return {ok:true,id};
}
