import {apartmentAmounts} from './seven-ux.mjs?v=5.8.1';
import {t as tr} from './i18n.mjs?v=5.8.1';
import {escapeHtml as e,money} from './core.mjs?v=5.8.1';
import {activeAt,personName} from './v3-domain.mjs?v=5.8.1';
import {can,heading,card,button,badge,date} from './ui.mjs?v=5.8.1';
import {remaining} from './ledger.mjs?v=5.8.1';
import {roleLabel} from './v3-ui.mjs?v=5.8.1';
import {removalReasons} from './assignments.mjs?v=5.8.1';
import {recoveryEligible} from './admin-recovery-ui.mjs?v=5.8.1';
import {inviteEligible} from './invite-ui.mjs?v=5.8.1';
import {getLanguage} from './i18n.mjs?v=5.8.1';
const loc=(de,trText)=>getLanguage()==='de'?de:trText;
const recoveryButton=(s,p)=>recoveryEligible(s,p)?button(getLanguage()==='de'?'Zugang wiederherstellen':'Erişimi yenile','recover_person',`data-id="${e(p.id)}"`):'';
const invitationButton=(s,p)=>recoveryButton(s,p)+(inviteEligible(s,p)?button(getLanguage()==='de'?(p.auth_user_id?'Link erneuern':'Einladen'):(p.auth_user_id?'Davet linki':'Davet et'),'invite_person',`data-id="${e(p.id)}"`):'');
export const historicalRoleLabel=r=>tr({owner:'Eski ev sahibi',tenant:'Eski kiracı',representative:'Eski yetkili kişi'}[r]||'Eski kişi');
const role=l=>badge(activeAt(l)?roleLabel(l.role):historicalRoleLabel(l.role),'role-badge role-'+l.role);
export function assignmentCard(s,l,showUnit=false,{showAmount=true}={}){
 const d=s.data,p=d.persons.find(p=>p.id===l.person_id),current=activeAt(l),oldDebt=!activeAt(l)&&can(s,'finance')?(d.charges||[]).filter(c=>c.link_id===l.id&&!c.void_reason).reduce((sum,c)=>sum+remaining(d,c),0):0,reason=removalReasons(l.role).find(([v])=>v===l.archive_reason)?.[1]||(l.archive_reason==='role_changed'?'Rol değiştirildi':'Önceki kayıt');
 return `<article class="person-card assignment-card"><div class="row">${role(l)}<strong>${e(p?.full_name||personName(d,l.person_id))}</strong>${showAmount&&(apartmentAmounts(d,l.unit_id).persons.get(l.person_id)||0)>0?`<small class="person-open-amount">${money(apartmentAmounts(d,l.unit_id).persons.get(l.person_id))} ${tr('açık')}</small>`:''}${showUnit?`<span>${e(d.units.find(u=>u.id===l.unit_id)?.code||'')}</span>`:''}${!current?badge(tr('Arşiv'),'neutral'):''}</div>${p?.phone||p?.email?`<p>${e(p.phone||'')} ${e(p.email||'')}</p>`:''}${p?.notes?`<p class="pre-wrap">${e(p.notes)}</p>`:''}${l.responsibility?`<p>${e(l.responsibility)}</p>`:''}${l.primary_contact?badge(tr('İlk aranacak kişi')):''}${l.starts_on||l.ends_on?`<p class="fine">${tr('Bilgi tarihleri')}: ${l.starts_on?date(l.starts_on):'—'} – ${l.ends_on?date(l.ends_on):'—'}</p>`:''}${!current?`<p class="fine">${e(tr(reason))}${l.archived_at?' · '+date(l.archived_at):''}${l.archive_note?' · '+e(l.archive_note):''}</p>`:''}${oldDebt>0?`<p class="former-person-debt"><strong>${tr('Eski kişiye ait açık borç')}:</strong> ${money(oldDebt)}</p>`:''}${can(s,'people')?`<div class="row-actions">${current?button(tr('Düzenle'),'assignment_edit',`data-id="${e(l.id)}"`)+button(tr('Kaldır'),'assignment_remove',`data-id="${e(l.id)}"`):p?.archived_at?'':button(tr('Geri getir'),'assignment_restore',`data-id="${e(l.id)}"`)}</div>`:''}</article>`;
}
export function peoplePage(s){
 if(!can(s,'people'))return '';
 const d=s.data,q=String(s.peopleQuery||'').toLocaleLowerCase(),filter=s.peopleFilter||'all';
 const people=d.persons.filter(p=>{
  const ls=d.links.filter(l=>l.person_id===p.id);
  if(filter==='archived'?!p.archived_at:!!p.archived_at)return false;
  if(filter==='unassigned'&&ls.some(l=>activeAt(l)))return false;
  return [p.full_name,p.email,p.phone,...ls.map(l=>d.units.find(u=>u.id===l.unit_id)?.code)]
   .join(' ').toLocaleLowerCase().includes(q);
 });
 return heading(s,tr('Kişiler'),tr('Kişiyi bir kez kaydedin, ilgili dairelere bağlayın.'),button(tr('Yeni kişi'),'person','',true))
  +`<div class="toolbar"><input type="search" id="peopleSearch" aria-label="${tr('Kişi ara')}" placeholder="${tr('Ad, telefon, e-posta veya daire ara')}" value="${e(s.peopleQuery||'')}"><select id="peopleFilter" aria-label="${tr('Kişi filtresi')}"><option value="all" ${filter==='all'?'selected':''}>${tr('Tüm kişiler')}</option><option value="unassigned" ${filter==='unassigned'?'selected':''}>${tr('Güncel dairesi olmayanlar')}</option><option value="archived" ${filter==='archived'?'selected':''}>${loc('Archiv','Arşiv')}</option></select></div><div class="provider-grid">${people.map(p=>card(e(p.full_name),'',`<p>${e(p.phone||'—')}</p><p>${e(p.email||'—')}</p>${p.archived_at?`<div class="info-strip">${loc('Archiviert','Arşivlendi')}: ${e(p.archive_note||'—')}</div>`:''}<div class="row-actions">${d.links.filter(l=>l.person_id===p.id&&activeAt(l)).map(l=>`<span>${e(d.units.find(u=>u.id===l.unit_id)?.code||'—')} ${role(l)}</span>`).join('')||`<span class="muted">${tr('Güncel daire bağlantısı yok.')}</span>`}</div>`,button(loc('Details','Detay'),'person_manage',`data-id="${e(p.id)}"`)+(p.archived_at?'':invitationButton(s,p)))).join('')||`<p>${tr('Kişi bulunamadı.')}</p>`}</div>`;
}
export function personManager(s,id){
 if(!can(s,'people'))return null;
 const p=s.data.persons.find(p=>p.id===id);if(!p)return null;
 const ls=s.data.links.filter(l=>l.person_id===id),current=ls.filter(l=>activeAt(l)),history=ls.filter(l=>!activeAt(l));
 const archived=!!p.archived_at;
 const lifecycle=can(s,'admin')
  ? (archived?button(loc('Wiederherstellen','Arşivden çıkar'),'person_restore',`data-id="${e(id)}"`):'')
    +button(loc('Löschen / Archivieren','Sil / Arşivle'),'person_lifecycle',`data-id="${e(id)}"`)
  :'';
 return `<h2 id="detailTitle">${e(p.full_name)}</h2>${archived?`<div class="info-strip"><strong>${loc('Archivierte Person','Arşivlenen kişi')}</strong><p>${e(p.archive_note||'—')}</p></div>`:''}<section class="person-card"><h3>${tr('Kişi bilgileri')}</h3><p>${e(p.phone||'—')} · ${e(p.email||'—')}</p>${p.notes?`<p class="pre-wrap">${e(p.notes)}</p>`:''}${archived?'':button(tr('Kişi bilgilerini düzenle'),'person',`data-id="${e(id)}"`)} ${archived?'':invitationButton(s,p)} ${lifecycle}</section><section><div class="row"><h3>${tr('Güncel roller')}</h3>${archived?'':button(tr('Kişi ekle'),'assignment_add',`data-person="${e(id)}"`)}</div>${current.map(l=>assignmentCard(s,l,true)).join('')||`<p>${tr('Güncel daire bağlantısı yok.')}</p>`}</section>${history.length?`<details class="assignment-history"><summary>${tr('Önceki roller')} (${history.length})</summary>${history.map(l=>assignmentCard(s,l,true)).join('')}</details>`:''}`;
}
