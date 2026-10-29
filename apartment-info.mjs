import {t as tr} from './i18n.mjs?v=5.8.1';
import {money} from './core.mjs?v=5.8.1';
import {can} from './ui.mjs?v=5.9.0';
import {remaining,unassigned} from './ledger.mjs?v=5.8.1';
import {scopedCharges,personLinks,personName,suggestUnits,creditAvailable,isReversed} from './v3-domain.mjs?v=5.9.20';
import {analyzeStage} from './reconcile.mjs?v=5.8.1';
export const openUnitCharges=(s,u)=>scopedCharges(s.data).filter(c=>c.unit_id===u.id&&!c.void_reason&&remaining(s.data,c)>0);
export function unitDebtCategory(s,u){const kinds=[...new Set(openUnitCharges(s,u).map(c=>c.category||'Tür belirtilmedi'))];return kinds.length>1?tr('Birden fazla kalem'):kinds.length?tr(kinds[0]):'';}
export function apartmentInfo(s,u){
 const d=s.data,reasons=[],stages=[],debts=[],notices=[],issues=[];
 const add=(kind,id,label,short,amount,action,args={},reviewable=false)=>{
  const source=d.reviewState?.sources?.find(x=>x.kind===kind&&x.source_id===id);
  const fingerprint=source?.fingerprint||(s.mode==='demo'?JSON.stringify(kind==='stage'?d.staged.find(x=>x.id===id):{entry:d.transactions.find(x=>x.id===id),allocations:d.allocations.filter(x=>x.entry_id===id),credits:(d.credits||[]).filter(x=>x.entry_id===id)}):null);
  const receipt=(d.reviewState?.receipts||[]).find(r=>r.unit_id===u.id&&r.kind===kind&&r.source_id===id&&r.fingerprint===fingerprint);
  issues.push({key:kind+':'+id,kind,source_id:id,unit_id:u.id,label,short,amount,action,args,reviewable:reviewable&&!!fingerprint,fingerprint,receipt});
 };
 const roleName=r=>tr({owner:'Ev sahibi',tenant:'Kiracı',representative:'Temsilci'}[r]||'Sorumlu kişi');
 for(const c of openUnitCharges(s,u)){
  const link=d.links.find(l=>l.id===c.link_id),who=personName(d,c.person_id),role=['owner','tenant'].includes(c.payer)?roleName(c.payer):link?roleName(link.role):'';
  const detail=[who,role].filter(Boolean).join(' · '),label=(detail?detail+' · ':'')+money(remaining(d,c))+' · '+tr(c.category||'Tür belirtilmedi');
  debts.push(label+' · '+tr('Neden: Açık tutar'));
  if(can(s,'finance')){
   if(!c.person_id)add('charge',c.id,tr('Borç için borçlu henüz belirlenmedi.')+' '+label,tr('Borçlu eksik'),remaining(d,c),'bind_charge',{id:c.id});
   else if(!who)add('charge',c.id,tr('Borçlunun kişi bilgisi eksik.')+' '+label,tr('Kişi bilgisi eksik'),remaining(d,c),'bind_charge',{id:c.id});
   // A preserved historical relationship is not itself an error.
   else if(c.link_id&&!link)add('charge',c.id,tr('Borç kaydının kişi bağlantısı bulunamadı.')+' '+label,tr('Kişi bağlantısı eksik'),remaining(d,c),'bind_charge',{id:c.id});
  }
 }
 if(can(s,'finance')){
  for(const row of d.staged||[]){
   if(row.confirmed_charge||row.ignored_reason)continue;const check=analyzeStage(row,d),bare=/^\s*(\d{1,2})(?!\d)/.exec(row.unit_hint||'');
   if(check.suggestedUnitId===u.id||!check.suggestedUnitId&&bare&&Number(bare[1])===u.number){
    stages.push({row,check});
    add('stage',row.id,[tr('Devralınan alacak doğrulanmalı.')+' '+(row.person_label||tr('Kişi belirlenmedi'))+' · '+money(Number(row.cents))+' · '+tr(row.category||'Tür belirtilmedi'),...check.warnings].join(' '),tr('Devralınan alacak'),Number(row.cents),'confirm_staged',{id:row.id},true);
   }
  }
  for(const t of d.transactions||[]){
   if(t.cents<=0||t.reversal_of||isReversed(d,t))continue;
   const available=unassigned(d,t)-creditAvailable(d,t);if(available<=0)continue;
   const suggestion=suggestUnits(d,t);if(!suggestion.unitIds.includes(u.id))continue;
   add('payment',t.id,tr(suggestion.ambiguous?'Ödemenin dairesi kesinleşmedi.':'Ödeme henüz bir borçla eşleştirilmedi.')+' '+money(available)+' · '+t.date+' · '+String(t.desc||'').slice(0,120),tr('Ödeme girişi'),available,'transaction',{id:t.id},true);
  }
 }
 if(can(s,'people')){
  const current=personLinks(d,u.id);
  if(current.some(l=>l.role==='tenant')&&!current.some(l=>l.role==='owner'))notices.push(tr('Ev sahibi henüz kaydedilmedi. Kiracı kaydı geçerlidir.'));
  for(const l of current)if(!personName(d,l.person_id))add('link',l.id,tr('Rol için kişi bilgisi eksik.')+' '+roleName(l.role),tr('Kişi bilgisi eksik'),null,'assignment_edit',{id:l.id});
 }
 for(const issue of issues)if(!issue.receipt)reasons.push(issue.label);
 return {reasons:[...new Set(reasons)],stages,debts,notices,issues,openIssues:issues.filter(x=>!x.receipt),reviewedIssues:issues.filter(x=>x.receipt)};
}
