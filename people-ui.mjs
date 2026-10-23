import {t as tr} from './i18n.mjs';
import {escapeHtml as e} from './core.mjs';
import {activeAt} from './v3-domain.mjs';
import {can,heading,card,button,badge,date} from './ui.mjs';
import {roleLabel} from './v3-ui.mjs';
const role=l=>badge(roleLabel(l.role),'role-badge role-'+l.role);
export function peoplePage(s){
 if(!can(s,'people'))return '';
 const d=s.data,q=String(s.peopleQuery||'').toLocaleLowerCase(),filter=s.peopleFilter||'all';
 const people=(d.persons||[]).filter(p=>{const ls=d.links.filter(l=>l.person_id===p.id);return (filter!=='unassigned'||!ls.some(l=>activeAt(l)))&&[p.full_name,p.email,p.phone,...ls.map(l=>d.units.find(u=>u.id===l.unit_id)?.code)].join(' ').toLocaleLowerCase().includes(q);});
 return heading(s,tr('Kişiler'),tr('Kişiyi bir kez kaydedin, ilgili dairelere bağlayın.'),button(tr('Yeni kişi'),'person','',true))+`<div class="toolbar"><input type="search" id="peopleSearch" aria-label="${tr('Kişi ara')}" placeholder="${tr('Ad, telefon, e-posta veya daire ara')}" value="${e(s.peopleQuery||'')}"><select id="peopleFilter" aria-label="${tr('Kişi filtresi')}"><option value="all">${tr('Tüm kişiler')}</option><option value="unassigned" ${filter==='unassigned'?'selected':''}>${tr('Güncel dairesi olmayanlar')}</option></select></div><div class="provider-grid">${people.map(p=>{const ls=d.links.filter(l=>l.person_id===p.id);return card(e(p.full_name),'',`<p>${e(p.phone||'—')}</p><p>${e(p.email||'—')}</p><div class="row-actions">${ls.filter(l=>activeAt(l)).map(l=>`<span>${e(d.units.find(u=>u.id===l.unit_id)?.code||'—')} ${role(l)}</span>`).join('')||`<span class="muted">${tr('Güncel daire bağlantısı yok.')}</span>`}</div>`,button(tr('Düzenle'),'person_manage',`data-id="${e(p.id)}"`));}).join('')||`<p>${tr('Kişi bulunamadı.')}</p>`}</div>`;
}
export function personManager(s,id){
 if(!can(s,'people'))return null;const d=s.data,p=d.persons.find(p=>p.id===id);if(!p)return null;
 const links=d.links.filter(l=>l.person_id===id).sort((a,b)=>Number(activeAt(b))-Number(activeAt(a)));
 return `<h2 id="detailTitle">${e(p.full_name)}</h2><section class="person-card"><h3>${tr('Kişi bilgileri')}</h3><p>${e(p.phone||'—')} · ${e(p.email||'—')}</p>${p.notes?`<p class="pre-wrap">${e(p.notes)}</p>`:''}${button(tr('Kişi bilgilerini düzenle'),'person',`data-id="${e(id)}"`)}</section><section class="person-card"><div class="row"><h3>${tr('Daire bağlantıları')}</h3>${button(tr('Daireye bağla'),'person_link',`data-id="${e(id)}"`)}</div>${links.map(l=>`<article class="person-card"><div class="row">${role(l)}<strong>${e(d.units.find(u=>u.id===l.unit_id)?.code||'—')}</strong>${badge(tr(activeAt(l)?'Güncel':'Geçmiş'),'neutral')}</div><p>${tr('Başlangıç')}: ${l.starts_on?date(l.starts_on):tr('Bilinmiyor')} · ${tr('Bitiş')}: ${l.ends_on?date(l.ends_on):'—'}</p><div class="row-actions">${button(tr('Daireyi aç'),'unit',`data-id="${e(l.unit_id)}"`)}${button(tr('Giriş / çıkış tarihleri'),'edit_link',`data-id="${e(l.id)}"`)}${l.role==='tenant'&&!l.ends_on?button(tr('Sakin değiştir'),'switch_tenant',`data-id="${e(l.id)}"`):''}</div></article>`).join('')||`<p>${tr('Henüz daire bağlantısı yok.')}</p>`}</section>`;
}
