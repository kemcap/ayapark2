import {getLanguage} from './i18n.mjs?v=5.8.1';
import {escapeHtml as escape,money} from './core.mjs?v=5.8.1';

const labels={
 own:['Dairelerimin açık borçları','Meine offenen Forderungen'],
 site:['Sitenin toplam açık alacakları','Offene Forderungen der gesamten Wohnanlage'],
 ownNote:['Yalnızca erişim yetkiniz olan daireleriniz','Nur Ihre berechtigten Wohnungen'],
 siteNote:['Tüm 20 daire; dairelerinizin borçları zaten dahildir','Alle Wohnungen; Ihre Forderungen sind bereits enthalten'],
 notAdd:['Bu iki tutar toplanmaz.','Beide Beträge dürfen nicht addiert werden.'],
 unavailable:['Şu anda hesaplanamıyor','Derzeit nicht verfügbar'],
 detail:['Daire bazında döküm','Aufschlüsselung nach Wohnung'],
 pending:['Eşleştirilmemiş tahsilatlar','Noch nicht zugeordnete Zahlungseingänge'],
 pendingNote:['Ödemeler eşleştirilene kadar açık borçlardan düşülmez.','Diese Eingänge mindern offene Forderungen erst nach Zuordnung.'],
 staged:['Kontrol bekleyen eski kayıtlar','Alte Forderungen in Prüfung'],
 stagedNote:['Onaylanmamış kayıtlar toplam açık borca dahil değildir.','Nicht bestätigte Posten sind in den offenen Forderungen nicht enthalten.'],
 source:['Tahakkuklar eksi geçerli ödeme eşleştirmeleri. Banka bakiyesi değildir.','Forderungen abzüglich gültiger Zahlungszuordnungen; kein Bankguthaben.'],
 units:['daire','Wohnungen']
};
const text=(id)=>labels[id]?.[getLanguage()==='de'?1:0]||id;
const valid=value=>Number.isSafeInteger(value)&&value>=0;
export function residentClaimsCards(s){
 const stats=s.data.siteClaims;
 const owned=valid(stats?.own_total_cents)?money(stats.own_total_cents):text('unavailable');
 const site=valid(stats?.site_total_cents)?money(stats.site_total_cents):text('unavailable');
 const count=stats?.site_unit_count??20;
 const hint=text('siteNote').replace('20',String(count));
 return `<article class="card claim-metric"><div class="card-head"><div><h2>${text('own')}</h2><p>${text('ownNote')}</p></div></div><strong class="large-amount">${owned}</strong></article>`+
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
