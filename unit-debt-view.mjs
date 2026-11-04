import {activeAt,scopedCharges} from './v3-domain.mjs?v=perf1';
import {remaining} from './ledger.mjs?v=perf1';

// A unit balance is not a personal debt. Classify only by stored debtor/link identity,
// never by ownership dates alone and never transfer a charge to a successor.
export function isFormerCharge(d,c){
 const links=d.links||[];
 return !!links.find(l=>l.id===c.link_id&&!activeAt(l)) &&
  !links.some(l=>l.unit_id===c.unit_id&&l.person_id===c.person_id&&activeAt(l));
}
export function unitDebtBuckets(d,unitId,charges=scopedCharges(d)){
 const activePeople=new Set((d.links||[]).filter(l=>l.unit_id===unitId&&activeAt(l)).map(l=>l.person_id));
 const current=[],former=[],review=[];
 for(const c of charges||[]){
  if(c.unit_id!==unitId||c.void_reason)continue;
  if(isFormerCharge(d,c))former.push(c);
  else if(c.person_id&&activePeople.has(c.person_id))current.push(c);
  else review.push(c);
 }
 const open=rows=>rows.reduce((sum,c)=>sum+Math.max(0,Number(remaining(d,c))||0),0);
 return {current,former,review,currentOpen:open(current),formerOpen:open(former),reviewOpen:open(review),totalOpen:open(current)+open(former)+open(review)};
}
export function formerDebtGroups(d,charges){
 const groups=new Map();
 for(const c of charges||[]){
  const amount=Math.max(0,Number(remaining(d,c))||0);
  if(!amount)continue;
  const key=c.person_id||'unassigned';
  if(!groups.has(key))groups.set(key,{personId:c.person_id||null,open:0,charges:[]});
  const group=groups.get(key);group.open+=amount;group.charges.push(c);
 }
 return [...groups.values()].sort((a,b)=>b.open-a.open||String(a.personId).localeCompare(String(b.personId)));
}
