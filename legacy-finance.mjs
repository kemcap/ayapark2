// Read-only grouping of inherited balances. All values remain integer kurus.
// Apsiyon source figures are displayed only if they reconcile with posted legacy charges.
// Payment allocations, not unassigned bank receipts, reduce inherited balances.
export const isLegacyCharge=c=>{
 const reference=String(c.reference||'');
 return reference.startsWith('staged:')||
  reference.startsWith('devir-')||
  reference.startsWith('purpose-split-20261015-')||
  c.distribution_basis?.kind==='purpose-specific-subdivision-of-devir'||
  c.distribution_basis?.kind==='purpose-tagged component of inherited category';
};
const numeric=v=>Number(v)||0;
export function legacyFinance(d,unitId,claims){
 const old=claims.filter(isLegacyCharge),current=claims.filter(c=>!isLegacyCharge(c));
 const oldIds=new Set(old.map(c=>c.id)),payByCharge=new Map();
 for(const a of d.allocations||[])if(!a.void_reason&&oldIds.has(a.charge_id))payByCharge.set(a.charge_id,(payByCharge.get(a.charge_id)||0)+numeric(a.cents));
 const gross=old.reduce((n,c)=>n+numeric(c.cents),0);
 const paid=[...payByCharge.values()].reduce((n,c)=>n+c,0);
 const open=gross-paid;
 const snapshots=(d.devirSnapshot||[]).filter(row=>row.unit_id===unitId);
 const sourceTotals=new Map();
 for(const row of snapshots)for(const [name,cents] of Object.entries(row.categories||{}))sourceTotals.set(name,(sourceTotals.get(name)||0)+numeric(cents));
 const categories=[...sourceTotals.entries()].map(([name,cents])=>({name,cents}));
 const sourceGross=snapshots.reduce((n,row)=>n+numeric(row.total_cents),0);
 const sourceVerified=snapshots.length>0&&sourceGross===gross&&categories.reduce((n,c)=>n+c.cents,0)===gross;
 const sourceDates=[...new Set(snapshots.map(row=>row.source_date).filter(Boolean))];
 // No silent reconciliation: when exact source/category sum differs, present entered charges instead.
 const fallbackGroups=new Map();
 for(const c of old){
   const originalId=c.distribution_basis?.source_original_charge_id||c.distribution_basis?.source_original_id||c.id;
   const base=old.find(x=>x.id===originalId)||c;
   const key=String(base.id);
   const name=String(base.label||base.category||'—').replace(/^.*? · /,'')||String(base.category||'—');
   if(!fallbackGroups.has(key))fallbackGroups.set(key,{name,cents:0});
   fallbackGroups.get(key).cents+=numeric(c.cents);
 }
 const fallback=[...fallbackGroups.values()];
 const byPerson=new Map();
 for(const c of old){
  const id=c.person_id||'not-assigned',g=byPerson.get(id)||{personId:id,gross:0,paid:0,open:0,count:0};
  g.gross+=numeric(c.cents);g.paid+=payByCharge.get(c.id)||0;g.open+=numeric(c.cents)-(payByCharge.get(c.id)||0);g.count++;byPerson.set(id,g);
 }
 return {old,current,gross,paid,open,categories:sourceVerified?categories:fallback,
  sourceVerified,sourceDate:sourceVerified&&sourceDates.length===1?sourceDates[0]:null,
  persons:[...byPerson.values()],paidChargeIds:new Set([...payByCharge.keys()])};
}
