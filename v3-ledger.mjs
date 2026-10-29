import {applyAssignmentDemo} from './assignments.mjs?v=5.9.4';
import {randomId} from './core.mjs?v=5.8.1';
import {t as tr} from './i18n.mjs?v=5.8.1';
import {activeAt,personLinks,today,effectivePayer,buildSummaryDays,creditAvailable} from './v3-domain.mjs?v=5.9.26';
export function enrichDemo(d){
 d.persons=[{id:'demo-owner',first_name:'Deniz',last_name:'Örnek',full_name:'Deniz Örnek',language:'de',phone:'',email:'',notes:''},{id:'demo-tenant',first_name:'Sakin',last_name:'Örnek',full_name:'Sakin Örnek',language:'tr',notes:''},{id:'demo-former',first_name:'Eski',last_name:'Örnek',full_name:'Eski Örnek',language:'tr',notes:''}];
 d.links=[{id:'demo-owner-link',person_id:'demo-owner',unit_id:'A-4',role:'owner',starts_on:'2022-01-01'}, {id:'demo-tenant-link',person_id:'demo-tenant',unit_id:'A-4',role:'tenant',starts_on:'2026-10-01'}, {id:'demo-former-link',person_id:'demo-former',unit_id:'A-4',role:'tenant',starts_on:'2025-01-01',ends_on:'2026-09-30'}];
 d.charges.push({id:'demo-own-charge',unit_id:'A-4',person_id:'demo-tenant',link_id:'demo-tenant-link',category:'Aidat',label:'2026-10',due_on:'2026-10-05',period_from:'2026-10-01',period_to:'2026-10-31',cents:360000,payer:'tenant',reference:'own-demo'}, {id:'demo-former-charge',unit_id:'A-4',person_id:'demo-former',link_id:'demo-former-link',category:'Aidat',label:'2026-09',due_on:'2026-09-05',cents:720000,payer:'tenant',reference:'former-demo'});
 for(const l of d.links){l.active=activeAt(l);l.revision=1;}d.ownPersonIds=['demo-tenant'];d.credits=[];d.matchRules=[];d.providers=[];d.providerNotes=[];d.acknowledgements=[];
 d.announcements[0]={...d.announcements[0],priority:'normal',author_label:'Örnek Yönetici',revision:1};
 d.charges.forEach(c=>{if(c.label==='Örnek devir bakiyesi')c.label='Açık borç';});d.summaryDays=buildSummaryDays(d);return d;
}
export function demoV3(d,action,p){
 if(action.startsWith('assignment_'))return applyAssignmentDemo(d,action,p);
 const id=()=>randomId(),now=()=>new Date().toISOString();let ident;
 if(action==='occupancy'){
  const u=d.units.find(u=>u.id===p.unit_id);if(!u||!['occupied','vacant','unknown'].includes(p.status))throw Error(tr('Geçerli bir kullanım durumu seçin.'));u.occupancy_status=p.status;d.occupancyChanges=[...(d.occupancyChanges||[]).filter(x=>x.unit_id!==u.id||x.effective_on!==today()),{unit_id:u.id,effective_on:today(),status:p.status}];
 }else if(action==='person'){
  const person=d.persons.find(x=>x.id===p.person_id);ident=person?.id||id();const item={...p,id:ident,full_name:(p.first_name+' '+p.last_name).trim()};
  if(person)Object.assign(person,item);else d.persons.push(item);
  if(p.unit_id)applyAssignmentDemo(d,'assignment_add',{...p,person_id:ident});
 }else if(action==='bind_charge'){
  const c=d.charges.find(c=>c.id===p.id),l=d.links.find(l=>l.id===p.link_id);if(!c||!l||c.person_id||l.unit_id!==c.unit_id)throw Error(tr('Kişi seçin.'));c.person_id=l.person_id;c.link_id=l.id;
 }else if(action==='classify_entry'){const t=d.transactions.find(t=>t.id===p.id);if(t)t.category=p.category;d.summaryDays=buildSummaryDays(d);
 }else if(action==='credit'){
  const old=d.credits.find(x=>x.request_id===p.request_id);if(old){if(['entry_id','unit_id','person_id','cents'].some(k=>old[k]!==p[k]))throw Error(tr('Bu istek farklı değerlerle kaydedildi.'));return {id:old.id};}
  const t=d.transactions.find(t=>t.id===p.entry_id),used=d.allocations.filter(a=>a.entry_id===t?.id&&!a.void_reason).reduce((n,a)=>n+a.cents,0);
  if(!t||t.cents<=0||t.reversal_of||d.transactions.some(x=>x.reversal_of===t.id)||p.cents<=0||p.cents>t.cents-used-creditAvailable(d,t)||!d.links.some(l=>l.unit_id===p.unit_id&&l.person_id===p.person_id))throw Error(tr('Tutar ödeme bakiyesini aşıyor.'));
  ident=id();d.credits.push({...p,id:ident});
 }else if(action==='void_credit'){const c=d.credits.find(c=>c.id===p.id);if(c)c.void_reason=p.reason;
 }else if(action==='match_rule'){ident=id();d.matchRules.push({...p,id:ident});
 }else if(action==='provider'){const old=d.providers.find(x=>x.id===p.id);ident=old?.id||id();if(old)Object.assign(old,p);else d.providers.push({...p,id:ident});
 }else if(action==='provider_note'){ident=id();d.providerNotes.unshift({...p,id:ident,created_at:now(),author_label:'Örnek Yönetici'});
 }else if(action==='acknowledge'){const a=d.announcements.find(x=>x.id===p.id);if(a)d.acknowledgements.push({announcement_id:a.id,revision:a.revision||1,user_id:d.userId||'demo'});
 }else return null;
 return {id:ident,ok:true};
}
export function bindDemoCharge(d,c,p){const l=p.link_id?d.links.find(x=>x.id===p.link_id&&x.unit_id===c.unit_id):effectivePayer(d,c.unit_id,c.payer,c.due_on);if(l){c.person_id=l.person_id;c.link_id=l.id;}return c;}
