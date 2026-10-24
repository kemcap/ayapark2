import {t as tr} from './i18n.mjs';
import {money} from './core.mjs';
import {can} from './ui.mjs';
import {remaining,unassigned} from './ledger.mjs';
import {scopedCharges,personLinks,personName,suggestUnits,creditAvailable} from './v3-domain.mjs';
import {analyzeStage} from './reconcile.mjs';
export const openUnitCharges=(s,u)=>scopedCharges(s.data).filter(c=>c.unit_id===u.id&&!c.void_reason&&remaining(s.data,c)>0);
export function unitDebtCategory(s,u){const kinds=[...new Set(openUnitCharges(s,u).map(c=>c.category||'Tür belirtilmedi'))];return kinds.length>1?tr('Birden fazla kalem'):kinds.length?tr(kinds[0]):'';}
export function apartmentInfo(s,u){
 const d=s.data,reasons=[],stages=[],debts=[],notices=[];
 const roleName=r=>tr({owner:'Ev sahibi',tenant:'Kiracı',representative:'Temsilci'}[r]||'Sorumlu kişi');
 for(const c of openUnitCharges(s,u)){
  const link=d.links.find(l=>l.id===c.link_id),who=personName(d,c.person_id),role=['owner','tenant'].includes(c.payer)?roleName(c.payer):link?roleName(link.role):'';
  const detail=[who,role].filter(Boolean).join(' · '),label=(detail?detail+' · ':'')+money(remaining(d,c))+' · '+tr(c.category||'Tür belirtilmedi');
  debts.push(label+' · '+tr('Neden: Açık tutar'));
  if(can(s,'finance')){
   if(!c.person_id)reasons.push(tr('Borç için borçlu henüz belirlenmedi.')+' '+label);
   else if(!who)reasons.push(tr('Borçlunun kişi bilgisi eksik.')+' '+label);
   // A preserved historical relationship is not itself an error.
   else if(c.link_id&&!link)reasons.push(tr('Borç kaydının kişi bağlantısı bulunamadı.')+' '+label);
  }
 }
 if(can(s,'finance')){
  for(const row of d.staged||[]){
   if(row.confirmed_charge||row.ignored_reason)continue;const check=analyzeStage(row,d),bare=/^\s*(\d{1,2})(?!\d)/.exec(row.unit_hint||'');
   if(check.suggestedUnitId===u.id||!check.suggestedUnitId&&bare&&Number(bare[1])===u.number){
    stages.push({row,check});reasons.push(tr('Devralınan alacak doğrulanmalı.')+' '+(row.person_label||tr('Kişi belirlenmedi'))+' · '+money(Number(row.cents))+' · '+tr(row.category||'Tür belirtilmedi')+(check.suggestedUnitId?'':' · '+tr('Blok teyidi gerekli.')));
    for(const warning of check.warnings)reasons.push(warning);
   }
  }
  for(const t of d.transactions||[]){
   if(t.cents<=0||t.reversal_of||d.transactions.some(x=>x.reversal_of===t.id))continue;
   const available=unassigned(d,t)-creditAvailable(d,t);if(available<=0)continue;
   const suggestion=suggestUnits(d,t);if(!suggestion.unitIds.includes(u.id))continue;
   reasons.push(tr(suggestion.ambiguous?'Ödemenin dairesi kesinleşmedi.':'Ödeme henüz bir borçla eşleştirilmedi.')+' '+money(available)+' · '+t.date+' · '+String(t.desc||'').slice(0,120));
  }
 }
 if(can(s,'people')){
  const current=personLinks(d,u.id);
  if(current.some(l=>l.role==='tenant')&&!current.some(l=>l.role==='owner'))notices.push(tr('Ev sahibi henüz kaydedilmedi. Kiracı kaydı geçerlidir.'));
  for(const l of current)if(!personName(d,l.person_id))reasons.push(tr('Rol için kişi bilgisi eksik.')+' '+roleName(l.role));
 }
 return {reasons:[...new Set(reasons)],stages,debts,notices};
}
