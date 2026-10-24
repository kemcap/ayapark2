import {t as tr} from './i18n.mjs';
import {escapeHtml as e} from './core.mjs';
import {activeAt,personName} from './v3-domain.mjs';
import {can,heading,card,button,badge,date} from './ui.mjs';
import {roleLabel} from './v3-ui.mjs?v=3.14.1';
import {removalReasons} from './assignments.mjs';
const role=l=>badge(roleLabel(l.role),'role-badge role-'+l.role);
export function assignmentCard(s,l,showUnit=false){
 const d=s.data,p=d.persons.find(p=>p.id===l.person_id),current=activeAt(l),reason=removalReasons(l.role).find(([v])=>v===l.archive_reason)?.[1]||(l.archive_reason==='role_changed'?'Rol değiştirildi':'Önceki kayıt');
 return `<article class="person-card assignment-card"><div class="row">${role(l)}<strong>${e(p?.full_name||personName(d,l.person_id))}</strong>${showUnit?`<span>${e(d.units.find(u=>u.id===l.unit_id)?.code||'')}</span>`:''}${!current?badge(tr('Arşiv'),'neutral'):''}</div>${p?.phone||p?.email?`<p>${e(p.phone||'')} ${e(p.email||'')}</p>`:''}${p?.notes?`<p class="pre-wrap">${e(p.notes)}</p>`:''}${l.responsibility?`<p>${e(l.responsibility)}</p>`:''}${l.primary_contact?badge(tr('İlk aranacak kişi')):''}${l.starts_on||l.ends_on?`<p class="fine">${tr('Bilgi tarihleri')}: ${l.starts_on?date(l.starts_on):'—'} – ${l.ends_on?date(l.ends_on):'—'}</p>`:''}${!current?`<p class="fine">${e(tr(reason))}${l.archived_at?' · '+date(l.archived_at):''}${l.archive_note?' · '+e(l.archive_note):''}</p>`:''}${can(s,'people')?`<div class="row-actions">${current?button(tr('Düzenle'),'assignment_edit',`data-id="${e(l.id)}"`)+button(tr('Kaldır'),'assignment_remove',`data-id="${e(l.id)}"`):button(tr('Geri getir'),'assignment_restore',`data-id="${e(l.id)}"`)}</div>`:''}</article>`;
}
export function peoplePage(s){
 if(!can(s,'people'))return '';const d=s.data,q=String(s.peopleQuery||'').toLocaleLowerCase(),filter=s.peopleFilter||'all';
 const people=d.persons.filter(p=>{const ls=d.links.filter(l=>l.person_id===p.id);return(filter!=='unassigned'||!ls.some(l=>activeAt(l)))&&[p.full_name,p.email,p.phone,...ls.map(l=>d.units.find(u=>u.id===l.unit_id)?.code)].join(' ').toLocaleLowerCase().includes(q);});
 return heading(s,tr('Kişiler'),tr('Kişiyi bir kez kaydedin, ilgili dairelere bağlayın.'),button(tr('Yeni kişi'),'person','',true))+`<div class="toolbar"><input type="search" id="peopleSearch" aria-label="${tr('Kişi ara')}" placeholder="${tr('Ad, telefon, e-posta veya daire ara')}" value="${e(s.peopleQuery||'')}"><select id="peopleFilter" aria-label="${tr('Kişi filtresi')}"><option value="all">${tr('Tüm kişiler')}</option><option value="unassigned" ${filter==='unassigned'?'selected':''}>${tr('Güncel dairesi olmayanlar')}</option></select></div><div class="provider-grid">${people.map(p=>card(e(p.full_name),'',`<p>${e(p.phone||'—')}</p><p>${e(p.email||'—')}</p><div class="row-actions">${d.links.filter(l=>l.person_id===p.id&&activeAt(l)).map(l=>`<span>${e(d.units.find(u=>u.id===l.unit_id)?.code||'—')} ${role(l)}</span>`).join('')||`<span class="muted">${tr('Güncel daire bağlantısı yok.')}</span>`}</div>`,button(tr('Düzenle'),'person_manage',`data-id="${e(p.id)}"`))).join('')||`<p>${tr('Kişi bulunamadı.')}</p>`}</div>`;
}
export function personManager(s,id){
 if(!can(s,'people'))return null;const p=s.data.persons.find(p=>p.id===id);if(!p)return null;
 const ls=s.data.links.filter(l=>l.person_id===id),current=ls.filter(l=>activeAt(l)),history=ls.filter(l=>!activeAt(l));
 return `<h2 id="detailTitle">${e(p.full_name)}</h2><section class="person-card"><h3>${tr('Kişi bilgileri')}</h3><p>${e(p.phone||'—')} · ${e(p.email||'—')}</p>${p.notes?`<p class="pre-wrap">${e(p.notes)}</p>`:''}${button(tr('Kişi bilgilerini düzenle'),'person',`data-id="${e(id)}"`)}</section><section><div class="row"><h3>${tr('Güncel roller')}</h3>${button(tr('Kişi ekle'),'assignment_add',`data-person="${e(id)}"`)}</div>${current.map(l=>assignmentCard(s,l,true)).join('')||`<p>${tr('Güncel daire bağlantısı yok.')}</p>`}</section>${history.length?`<details class="assignment-history"><summary>${tr('Önceki roller')} (${history.length})</summary>${history.map(l=>assignmentCard(s,l,true)).join('')}</details>`:''}`;
}
