import {t as tr} from './i18n.mjs';
import {escapeHtml as e,randomId} from './core.mjs';
import {today,dateValid,activeAt,personName} from './v3-domain.mjs';
export const relationshipKinds=[['owner_change','Ev sahibi değişti'],['owner_to_tenant','Ev sahibi kiracı olarak kalıyor'],['tenant_change','Kiracı değişti'],['moveout','Kiracı çıktı, yeni kiracı yok'],['tenant_to_owner','Kiracı daireyi satın aldı'],['correction','Hatalı kaydı düzelt'],['add','Kişi ve rol ekle']];
const roles=[['owner','Ev sahibi'],['tenant','Kiracı'],['representative','Temsilci']];
const roleName=r=>tr(roles.find(x=>x[0]===r)?.[1]||'Kişi');
const select=(name,label,options,value='')=>`<label class="field">${tr(label)}<select name="${name}" aria-label="${e(tr(label))}">${options.map(([v,l])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(l)}</option>`).join('')}</select></label>`;
const input=(name,label,type='text',value='',attrs='')=>`<label class="field">${tr(label)}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
export const previousDay=day=>new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10);
export const linkVersion=l=>JSON.stringify([l.id,l.person_id,l.unit_id,l.role,l.starts_on||null,l.ends_on||null]);
export function buildRelationshipForm(d,args={}){
 const link=d.links.find(l=>l.id===args.id),unit=args.unit||link?.unit_id||d.units[0]?.id;
 return {title:tr('Daire ilişkisini değiştir'),context:{request_id:randomId(),unit_id:unit,preferred_link:link?.id,preferred_person:args.person||'',kind:args.kind||'owner_change',versions:Object.fromEntries(d.links.map(l=>[l.id,linkVersion(l)])),relationshipData:d},body:`<div id="relationshipEditor"><p class="fine">${tr('Önce değişikliği seçin, sonra bilgileri kontrol edip birlikte kaydedin.')}</p>${select('unit_id','Daire',d.units.map(u=>[u.id,u.code]),unit)}${select('kind','Ne değişti?',relationshipKinds.map(([v,l])=>[v,tr(l)]),args.kind||'owner_change')}<div id="relationshipFields"></div><p class="info-strip">${tr('Mevcut borçlar, ödemeler ve hesap yetkileri değişmez.')}</p></div><section id="relationshipReview" class="review-panel" hidden aria-live="polite"></section>`};
}
export function updateRelationshipForm(container,d,ctx,changed=''){
 const get=n=>container.querySelector(`[name="${n}"]`)?.value||'',kind=get('kind'),unit=get('unit_id'),box=container.querySelector('#relationshipFields');
 if(!box)return;
 if(box.dataset.kind===kind&&box.dataset.unit===unit&&!['link_id'].includes(changed))return;
 const old={};for(const n of box.querySelectorAll('[name]'))old[n.name]=n.type==='checkbox'?n.checked:n.value;
 const all=d.links.filter(l=>l.unit_id===unit),want=kind.startsWith('owner')?'owner':['tenant_change','moveout','tenant_to_owner'].includes(kind)?'tenant':null;
 const choices=all.filter(l=>kind==='correction'||(!l.ends_on&&(!want||l.role===want)));
 let selected=changed==='link_id'?old.link_id:choices.some(l=>l.id===ctx.preferred_link)?ctx.preferred_link:choices[0]?.id||'';
 const l=all.find(l=>l.id===selected),persons=[['',tr('Kişi seçin.')],...d.persons.map(p=>[p.id,p.full_name]),['__new__',tr('Yeni kişi')]];
 let html='';
 if(kind!=='add')html+=select('link_id','Değiştirilecek kayıt',choices.length?choices.map(l=>[l.id,personName(d,l.person_id)+' · '+roleName(l.role)+' · '+(l.starts_on||'?')+' – '+(l.ends_on||tr('Devam ediyor'))]):[['',tr('Uygun kayıt yok. Önce hatalı kaydı düzeltin veya kişi ve rol ekleyin.')]],selected);
 if(kind==='tenant_to_owner')html+=select('owner_link_id','Biten ev sahipliği kaydı',[['',tr('Değiştirilecek kaydı seçin.')],...all.filter(x=>x.role==='owner'&&!x.ends_on).map(x=>[x.id,personName(d,x.person_id)])]);
 if(kind==='correction')html+=`<p class="info-strip">${tr('Bu seçenek yanlış kaydı düzeltir. Gerçek bir değişiklik için diğer seçenekleri kullanın.')}</p>`+select('role','Doğru rol',roles.map(([v,l])=>[v,tr(l)]),l?.role||'owner')+input('starts_on','Başlangıç','date',l?.starts_on||'')+`<label class="check-field"><input name="start_unknown" type="checkbox" ${!l?.starts_on?'checked':''}>${tr('Başlangıç tarihi bilinmiyor')}</label>`+input('ends_on','Bitiş','date',l?.ends_on||'')+input('reason','Düzeltme nedeni','text','','required minlength="3" maxlength="500"');
 else {
  html+=input(kind==='moveout'?'departure_on':'effective_on',kind==='moveout'?'Çıkış tarihi (son oturulan gün)':'Yeni durumun ilk günü','date',today(),'required')+`<p class="fine">${tr(kind==='moveout'?'Kira ilişkisi bu gün sona erer. Yeni kullanım ertesi gün başlar.':'Eski ilişki bir önceki gün sona erer. Bu tarih, yeni durumun ilk günüdür.')}</p>`;
  if(['owner_change','owner_to_tenant','tenant_change','add'].includes(kind))html+=select('person_id',kind.startsWith('owner')?'Yeni ev sahibi':kind==='tenant_change'?'Yeni kiracı':'Kişi',persons,ctx.preferred_person||'')+`<div id="newRelationshipPerson" hidden>${input('first_name','Ad','text','','maxlength="75"')}${input('last_name','Soyad','text','','maxlength="75"')}${input('phone','Telefon','tel','','maxlength="60"')}${input('email','E-posta','email','','maxlength="254"')}</div>`;
  if(kind==='add')html+=select('role','Rol',roles.map(([v,l])=>[v,tr(l)]),'owner');
 }
 html+=select('occupancy',kind==='correction'?'Bugünkü kullanım':'Değişiklik tarihinde kullanım',[['keep',tr('Kullanımı değiştirme')],['occupied',tr('Dolu')],['vacant',tr('Boş')]],['owner_to_tenant','tenant_change','tenant_to_owner'].includes(kind)?'occupied':kind==='moveout'?'vacant':'keep')+`<p class="fine">${tr('Mülkiyet ve dairede oturmak farklıdır. Ev sahibi oturmaya devam ediyorsa Dolu seçin. Gelecek tarihli kullanım, o gün geçerli olur.')}</p>`;
 box.innerHTML=html;box.dataset.kind=kind;box.dataset.unit=unit;
 if(changed==='link_id')for(const n of box.querySelectorAll('[name]'))if(!['role','starts_on','ends_on','start_unknown','link_id'].includes(n.name)&&old[n.name]!==undefined){if(n.type==='checkbox')n.checked=old[n.name];else n.value=old[n.name];}
 if(l)box.dataset.version=linkVersion(l);else delete box.dataset.version;
}
const overlap=(a,b)=>(!a.ends_on||!b.starts_on||a.ends_on>=b.starts_on)&&(!b.ends_on||!a.starts_on||b.ends_on>=a.starts_on);
function covered(owners,from,to){
 let cursor=from||'0001-01-01';
 for(const o of owners.slice().sort((a,b)=>(a.starts_on||'0001-01-01').localeCompare(b.starts_on||'0001-01-01'))){
  if(o.ends_on&&o.ends_on<cursor)continue;if(o.starts_on&&o.starts_on>cursor)return false;if(!o.ends_on||to&&o.ends_on>=to)return true;cursor=new Date(Date.parse(o.ends_on+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 }return false;
}
export function relationshipPayload(form,ctx,d,version){
 const p={request_id:ctx.request_id};for(const[k,v]of form)p[k]=String(v).trim();p.expected=version||ctx.versions?.[p.link_id]||'';p.owner_expected=ctx.versions?.[p.owner_link_id]||'';p.start_unknown=form.has('start_unknown');
 if(p.kind==='moveout'){if(!dateValid(p.departure_on))throw Error(tr('Geçerli bir çıkış tarihi girin.'));p.effective_on=new Date(Date.parse(p.departure_on+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
 if(p.person_id==='__new__'){p.person_id='';p.new_person=true;}else p.new_person=false;
 if(!p.start_unknown&&p.kind==='correction'&&!dateValid(p.starts_on))throw Error(tr('Başlangıç tarihini girin veya bilinmiyor seçin.'));
 if(p.start_unknown)p.starts_on=null;
 planRelationship(d,p);return p;
}
export function planRelationship(d,p){
 const fail=m=>{throw Error(tr(m));},kind=p.kind,unit=d.units.find(u=>u.id===p.unit_id);
 if(!unit)fail('Daire bulunamadı.');if(!relationshipKinds.some(([k])=>k===kind))fail('Değişiklik türünü seçin.');
 const links=d.links.map(l=>({...l})),persons=d.persons.map(x=>({...x})),l=links.find(l=>l.id===p.link_id&&l.unit_id===unit.id),original=d.links.find(x=>x.id===l?.id);
 if(kind!=='add'&&!l)fail('Değiştirilecek kaydı seçin.');
 if(l&&p.expected!==linkVersion(original))fail('Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.');
 if(kind!=='correction'&&l?.ends_on)fail('Bu ilişki zaten sona ermiş veya bitişi planlanmış. Tarihi düzeltmek için Hatalı kaydı düzelt seçin.');
 if(kind.startsWith('owner')&&l?.role!=='owner'||['tenant_change','moveout','tenant_to_owner'].includes(kind)&&l?.role!=='tenant')fail('Seçilen kayıt bu değişiklik için uygun değil.');
 const day=kind==='correction'?p.starts_on:p.effective_on;
 if(kind!=='correction'&&!dateValid(day))fail('Geçerli bir değişiklik tarihi girin.');
 if(kind!=='correction'&&l?.starts_on&&day<=l.starts_on)fail('Değişiklik mevcut başlangıçtan sonra olmalı. Yanlış kayıt için Hatalı kaydı düzelt seçin.');
 if(!['keep','occupied','vacant'].includes(p.occupancy))fail('Geçerli bir kullanım durumu seçin.');
 if(kind==='correction'&&(!p.reason||p.reason.length<3))fail('Düzeltme nedenini yazın.');
 if(kind==='correction'&&(p.ends_on&&!dateValid(p.ends_on)||day&&p.ends_on&&p.ends_on<day))fail('Bitiş tarihi başlangıç tarihinden önce olamaz.');
 let pid=p.person_id,newPerson;
 if(['owner_change','owner_to_tenant','tenant_change','add'].includes(kind)){
  if(p.new_person){if(!p.first_name||!p.last_name)fail('Ad ve soyad gerekli.');newPerson={id:'__new_person__',first_name:p.first_name,last_name:p.last_name,full_name:p.first_name+' '+p.last_name,phone:p.phone||'',email:p.email||'',language:'tr',notes:''};persons.push(newPerson);pid=newPerson.id;}
  else if(!persons.some(x=>x.id===pid))fail('Kişi seçin.');
  if(l&&pid===l.person_id)fail('Yeni kişi önceki kişiyle aynı olamaz. Rol değişimi veya hatalı kaydı düzelt seçeneğini kullanın.');
 }
 const added=[];const add=(person,role)=>{const row={id:'__new_link_'+added.length,unit_id:unit.id,person_id:person,role,starts_on:day,ends_on:null,responsibility:'',primary_contact:false};links.push(row);added.push(row);};
 if(kind==='correction'){if(!roles.some(([r])=>r===p.role))fail('Geçerli bir rol seçin.');Object.assign(l,{role:p.role,starts_on:day||null,ends_on:p.ends_on||null});}
 else if(kind==='add'){if(!roles.some(([r])=>r===p.role))fail('Geçerli bir rol seçin.');add(pid,p.role);}
 else {if(kind==='tenant_to_owner'){const owner=links.find(x=>x.id===p.owner_link_id&&x.unit_id===unit.id&&x.role==='owner'&&!x.ends_on);if(!owner)fail('Biten ev sahipliği kaydını seçin.');if(p.owner_expected!==linkVersion(owner))fail('Kayıt başka bir işlemde değişti. Görünümü yenileyip tekrar kontrol edin.');if(owner.starts_on&&day<=owner.starts_on)fail('Değişiklik mevcut başlangıçtan sonra olmalı. Yanlış kayıt için Hatalı kaydı düzelt seçin.');owner.ends_on=previousDay(day);}
 l.ends_on=previousDay(day);if(kind==='owner_change'||kind==='owner_to_tenant')add(pid,'owner');if(kind==='owner_to_tenant')add(l.person_id,'tenant');if(kind==='tenant_change')add(pid,'tenant');if(kind==='tenant_to_owner')add(l.person_id,'owner');}
 const touched=kind==='correction'?[l]:added,unitLinks=links.filter(x=>x.unit_id===unit.id),owners=unitLinks.filter(x=>x.role==='owner');
 for(const x of touched){const conflict=unitLinks.find(y=>x.id!==y.id&&(x.person_id===y.person_id&&x.role===y.role||x.role==='tenant'&&y.role==='tenant')&&overlap(x,y));if(conflict)throw Error(tr('Bu dönemde çakışan bir kayıt var. Kiracı değişimi seçin veya tarihleri düzeltin.')+' '+personName(d,conflict.person_id)+' · '+roleName(conflict.role)+' · '+(conflict.starts_on||'?')+' – '+(conflict.ends_on||tr('Devam ediyor')));if(x.role==='tenant'&&!covered(owners,x.starts_on,x.ends_on))fail('Bu dönemin tamamı için ev sahibi kaydı gerekli. Önce ev sahibi bilgisini kontrol edin.');}
 if(original?.role==='owner')for(const x of unitLinks.filter(x=>x.role==='tenant')){const from=kind==='correction'?x.starts_on:!x.starts_on||x.starts_on<day?day:x.starts_on;if(x.ends_on&&from&&x.ends_on<from)continue;if(!covered(owners,from,x.ends_on))fail('Değişiklik devam eden kiracı veya temsilciyi ev sahibisiz bırakıyor. Yeni ev sahibini aynı işlemde belirtin.');}
 if(p.occupancy==='vacant'&&unitLinks.some(x=>x.role==='tenant'&&activeAt(x,kind==='correction'?today():day)))fail('Bu tarihte kiracı kaydı devam ediyor. Önce kiracı çıkışını kaydedin veya Dolu seçin.');
 const occupancyDay=kind==='correction'?today():day;const events=(d.occupancyChanges||[]).filter(x=>p.occupancy==='keep'||x.unit_id!==unit.id||x.effective_on!==occupancyDay).map(x=>({...x}));if(p.occupancy!=='keep')events.push({unit_id:unit.id,effective_on:kind==='correction'?today():day,status:p.occupancy,request_id:p.request_id});
 const name=id=>persons.find(x=>x.id===id)?.full_name||'',summary=[];
  if(touched.some(x=>x.role==='representative'&&!covered(owners,x.starts_on,x.ends_on)))summary.push(tr('Seçilen dönemde ev sahibi bilgileri eksik. Temsilci kaydını yine de ekleyebilirsiniz.'));
 if(kind==='correction')summary.push(name(l.person_id)+' · '+roleName(l.role)+' · '+(l.starts_on||tr('Bilinmiyor'))+' – '+(l.ends_on||tr('Devam ediyor')));
 else {if(l)summary.push(name(l.person_id)+' · '+roleName(original.role)+' · '+tr('Bitiş')+': '+l.ends_on);for(const x of added)summary.push(name(x.person_id)+' · '+roleName(x.role)+' · '+tr('Başlangıç')+': '+x.starts_on);}
 if(kind==='tenant_to_owner'){const owner=d.links.find(x=>x.id===p.owner_link_id);summary.unshift(name(owner.person_id)+' · '+roleName('owner')+' · '+tr('Bitiş')+': '+previousDay(day));}
 summary.push(tr(p.occupancy==='keep'?'Kullanım değişmez.':p.occupancy==='occupied'?'Daire dolu olarak gösterilir.':'Daire boş olarak gösterilir.')+(p.occupancy!=='keep'?' · '+(kind==='correction'?today():day):''));
 return {links,persons,events,summary,newPerson,added,unit};
}
// Use the same complete, inclusive owner-history rule for guided and direct edits.
export function tenantOwnerCovered(links,unitId){
 const owners=links.filter(l=>l.unit_id===unitId&&l.role==='owner');
 return links.filter(l=>l.unit_id===unitId&&l.role==='tenant').every(l=>covered(owners,l.starts_on||null,l.ends_on||null));
}
export function effectiveOccupancy(d,unit,day=today()){
 const events=(d.occupancyChanges||[]).slice().reverse().filter(x=>x.unit_id===unit.id&&x.effective_on<=day).sort((a,b)=>b.effective_on.localeCompare(a.effective_on));return events[0]?.status||unit.occupancy_status;
}
export function applyRelationshipDemo(d,p){
 if((d.relationshipRequests||[]).includes(p.request_id))return {ok:true,already_recorded:true};
 const plan=planRelationship(d,p),personId=plan.newPerson?randomId():null;
 if(plan.newPerson)plan.newPerson.id=personId;
 for(const x of plan.added){x.id=randomId();if(x.person_id==='__new_person__')x.person_id=personId;}
 d.persons=plan.persons;d.links=plan.links;d.occupancyChanges=plan.events;d.relationshipRequests=[...(d.relationshipRequests||[]),p.request_id];
 d.audit.unshift({id:randomId(),action:'relationship_change',at:new Date().toISOString(),details:{kind:p.kind,reason:p.reason,summary:plan.summary}});
 return {ok:true};
}
