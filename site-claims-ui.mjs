import {uiText} from './language-text.mjs?v=5.10.0';
import {getLanguage} from './i18n.mjs?v=5.10.0';
import {escapeHtml as escape,money} from './core.mjs?v=5.10.0';
import {scopedCharges} from './v3-domain.mjs?v=5.10.0';
import {remaining} from './ledger.mjs?v=5.10.0';

const labels={
 own:['Dairenin açık borçları','Offene Forderungen zur Wohnung'],
 ownMany:['Dairelerimin açık borçları','Offene Forderungen zu Ihren Wohnungen'],
 site:['Sitenin Toplam Alacakları','Offene Forderungen der gesamten Wohnanlage'],
 ownNote:['Erişim yetkiniz olan dairelerin borçları; bu tutarın tamamı size ait olmayabilir.','Forderungen zu Ihren Wohnungen – unabhängig davon, wer diese schuldet.'],
 siteNote:['Sitedeki 20 dairenin tüm açık borçları dahildir. Bu tutar kişisel borcunuz değildir.','Enthält alle 20 Wohnungen – keine persönliche Schuldsumme.'],
 notAdd:['Bu iki tutar toplanmaz.','Beide Beträge dürfen nicht addiert werden.'],
 unavailable:['Şu anda hesaplanamıyor','Derzeit nicht verfügbar'],
 detail:['Daire bazında döküm','Aufschlüsselung nach Wohnung'],
 pending:['Eşleştirilmemiş tahsilatlar','Noch nicht zugeordnete Zahlungseingänge'],
 pendingNote:['Ödemeler eşleştirilene kadar açık borçlardan düşülmez.','Diese Eingänge mindern offene Forderungen erst nach Zuordnung.'],
 staged:['Kontrol bekleyen eski kayıtlar','Alte Forderungen in Prüfung'],
 stagedNote:['Onaylanmamış kayıtlar toplam açık borca dahil değildir.','Nicht bestätigte Posten sind in den offenen Forderungen nicht enthalten.'],
 source:['Tahakkuklar eksi geçerli ödeme eşleştirmeleri. Banka bakiyesi değildir.','Forderungen abzüglich gültiger Zahlungszuordnungen; kein Bankguthaben.'],
 units:['daire','Wohnungen'],
 view:['Borç ve sorumlularını gör','Forderungen und zugeordnete Personen ansehen'],
 detailTitle:['Daireye ait açık borçlar','Offene Forderungen zur Wohnung'],
 detailNote:['Bu liste dairenize ait borçları gösterir. Görüntülemeniz borcun size ait olduğu anlamına gelmez.','Diese Übersicht zeigt Forderungen zu Ihren Wohnungen. Ihre Einsicht bedeutet nicht, dass Sie persönlich dafür zahlungspflichtig sind.'],
 responsible:['Kayıtlı sorumlu','Zugeordnete Person'],
 unknown:['Sorumlu kişi henüz belirlenmedi','Noch keiner Person zugeordnet'],
 hiddenPerson:['Kişi bilgisi görüntülenemiyor','Personendaten nicht verfügbar'],
 roleOwner:['Ev sahibi','Eigentümer/in'],
 roleTenant:['Kiracı','Mieter/in'],
 roleRepresentative:['Temsilci','Vertreter/in'],
 roleDebtor:['Borçlu','Schuldner/in'],
 due:['Vade','Fälligkeit'],
 itemDetail:['Borç detayları','Forderungsdetails'],
 none:['Bu dairede açık borç yok.','Keine offenen Forderungen für diese Wohnung.']
};
const text=(id)=>getLanguage()==='tr'?(labels[id]?.[0]||id):uiText(labels[id]?.[1]||id,getLanguage());
const valid=value=>Number.isSafeInteger(value)&&value>=0;

const roleText=role=>text(({owner:'roleOwner',tenant:'roleTenant',representative:'roleRepresentative',debtor:'roleDebtor'})[role]||'');
const dueText=day=>{if(!day)return '—';const value=new Date(day+'T12:00:00Z');return Number.isNaN(value.getTime())?escape(day):new Intl.DateTimeFormat((getLanguage()==='tr'?('tr-TR'):(uiText("de-DE",getLanguage()))),{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Istanbul'}).format(value);};
const debtorLabel=(d,c)=>{
 const person=d.persons?.find(p=>p.id===c.person_id);
 const role=person?.unit_roles?.find(x=>x.unit_id===c.unit_id&&['owner','tenant','representative'].includes(x.role))?.role||(['owner','tenant','representative','debtor'].includes(c.payer)?c.payer:'');
 const name=person?.full_name||(c.person_id?text('hiddenPerson'):text('unknown'));
 return name+(role?' · '+roleText(role):'');
};
export function residentClaimsDetail(s){
 const d=s.data;
 if(d.role!=='resident'||d.communityAccess===false)return '';
 const own=new Set(d.ownIds||[]);
 const units=(d.units||[]).filter(u=>own.has(u.id)).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
 const open=scopedCharges(d).filter(c=>!c.void_reason&&own.has(c.unit_id)&&remaining(d,c)>0);
 const body=units.map(unit=>{
  const rows=open.filter(c=>c.unit_id===unit.id).sort((a,b)=>String(a.due_on||'').localeCompare(String(b.due_on||'')));
  const sum=rows.reduce((n,c)=>n+remaining(d,c),0);
  const items=rows.map(c=>`<div class="claim-debt-row"><div class="claim-debt-main"><strong>${escape(c.label||c.category||'—')}</strong><small>${text('responsible')}: ${escape(debtorLabel(d,c))}</small><small>${text('due')}: ${dueText(c.due_on)}</small></div><div class="claim-debt-actions"><strong>${money(remaining(d,c))}</strong><button type="button" class="button" data-action="charge_detail" data-id="${escape(c.id)}">${text('itemDetail')}</button></div></div>`).join('');
  return `<section class="claim-unit-details"><div class="claim-unit-head"><h3>${escape(unit.code)}</h3><strong>${money(sum)}</strong></div>${items||`<p class="muted">${text('none')}</p>`}</section>`;
 }).join('');
 return `<div class="dialog-kicker">AYAPARK 2</div><h2 id="detailTitle">${text('detailTitle')}</h2><p class="fine">${text('detailNote')}</p><div class="claim-unit-detail-list">${body||`<p>${text('none')}</p>`}</div>`;
}
export function residentClaimsCards(s){
 const stats=s.data.siteClaims;
 const owned=valid(stats?.own_total_cents)?money(stats.own_total_cents):text('unavailable');
 const site=valid(stats?.site_total_cents)?money(stats.site_total_cents):text('unavailable');
 const count=stats?.site_unit_count??20;
 const ownCount=(s.data.ownIds||[]).length;
 const hint=text('siteNote').replace('20',String(count));
 return `<article class="card claim-metric"><div class="card-head"><div><h2>${text(ownCount>1?'ownMany':'own')}</h2><p>${text('ownNote')}</p></div></div><strong class="large-amount">${owned}</strong></article>`+
 `<article class="card claim-metric"><div class="card-head"><div><h2>${text('site')}</h2><p>${hint}</p></div></div><strong class="large-amount">${site}</strong><small>${text('notAdd')}</small></article>`;
}
export function residentClaimsPanel(s,{dashboard=false}={}){
 if(s.data.role!=='resident'||s.data.communityAccess===false)return '';
 const stats=s.data.siteClaims;
 const units=Array.isArray(stats?.own_units)?stats.own_units:[];
 const breakdown=units.length>1?`<article class="card claim-breakdown"><h2>${text('detail')}</h2><div class="claims-unit-list">${units.map(unit=>`<div class="contact-row"><strong>${escape(unit.code||'—')}</strong><span>${valid(unit.open_cents)?money(unit.open_cents):text('unavailable')}</span></div>`).join('')}</div></article>`:'';
 const pending=stats?.unmatched_entry_count>0
  ?`<p class="fine">${text('pending')}: <strong>${stats.unmatched_entry_count}</strong> · ${money(stats.unmatched_entry_cents)}. ${text('pendingNote')}</p>`:'';
 const staged=stats?.pending_source_count>0
  ?`<p class="fine">${text('staged')}: <strong>${stats.pending_source_count}</strong>. ${text('stagedNote')}</p>`:'';
 return `<section class="resident-claims-panel ${dashboard?'resident-dashboard-claims':''}" aria-label="${text('site')}"><div class="summary-grid">${residentClaimsCards(s)}</div>${breakdown}<div class="claims-notes"><p class="fine">${text('source')} ${text('notAdd')}</p>${pending}${staged}</div></section>`;
}
