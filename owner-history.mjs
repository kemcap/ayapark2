// Owner periods are date-based; archived history is not a current access grant.
export const dayBefore=iso=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;
 const date=new Date(iso+'T00:00:00Z');
 return Number.isFinite(date.getTime())?new Date(date.getTime()-86400000).toISOString().slice(0,10):null;
};
const owners=(links,unit)=>Array.isArray(links)?links.filter(l=>l.unit_id===unit&&l.role==='owner'&&l.archive_reason!=='duplicate_history'):[];
export function suggestedOwnerEnd(links,unit,startsOn,personId=null){
 if(!startsOn||!/^\d{4}-\d{2}-\d{2}$/.test(startsOn))return null;
 const later=owners(links,unit).filter(l=>l.starts_on&&l.starts_on>startsOn&&l.person_id!==personId).map(l=>l.starts_on).sort()[0];
 return later?dayBefore(later):null;
}
export function displayedOwnerEnd(links,link){
 if(link.ends_on)return {date:link.ends_on,automatic:false};
 if(link.role!=='owner'||!link.starts_on||link.active)return {date:null,automatic:false};
 const date=suggestedOwnerEnd(links,link.unit_id,link.starts_on,link.person_id);
 return {date,automatic:!!date};
}
export function ownerHistoryIssues(links,unit){
 const rows=owners(links,unit),seen=new Set(),duplicateIds=[],overlaps=[];
 for(const l of rows){
  if(l.active||l.archive_reason!=='historical_import'||!l.starts_on)continue;
  const key=l.person_id+'|'+l.starts_on;
  if(seen.has(key))duplicateIds.push(l.id);else seen.add(key);
 }
 for(const l of rows){
  if(!l.starts_on||!l.ends_on||l.active)continue;
  const next=rows.filter(n=>n.person_id!==l.person_id&&n.starts_on&&n.starts_on>l.starts_on).map(n=>n.starts_on).sort()[0];
  if(next&&l.ends_on>=next)overlaps.push(l.id);
 }
 return {duplicateIds,overlaps,count:duplicateIds.length+overlaps.length};
}
