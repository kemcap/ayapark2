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
 const snapshot=(d.devirSnapshot||[]).find(row=>row.unit_id===unitId);
 const categories=Object.entries(snapshot?.categories||{}).map(([name,cents])=>({name,cents:numeric(cents)}));
 const sourceVerified=!!snapshot&&numeric(snapshot.total_cents)===gross&&categories.reduce((n,c)=>n+c.cents,0)===gross;
 // No silent reconciliation: when exact source/category sum differs, present entered charges instead.
 const fallback=old.filter(c=>!String(c.reference||'').startsWith('purpose-split-20261015-')).map(c=>({
   name:String(c.label||c.category||'—').replace(/^.*?(?: · |\/ )/,'')||String(c.category||'—'),cents:numeric(c.cents)
 }));
 if(!sourceVerified){
   for(const c of old.filter(c=>String(c.reference||'').startsWith('purpose-split-20261015-'))){
     const link=c.distribution_basis?.source_original_charge_id||c.distribution_basis?.source_original_id;
     const oldItem=old.find(r=>r.id===link);
     if(oldItem){const index=fallback.findIndex(x=>x.reference===link);if(index>=0)fallback[index].cents+=numeric(c.cents);else fallback.push({name:oldItem.category,cents:numeric(c.cents),reference:link});}
     else fallback.push({name:c.category||'—',cents:numeric(c.cents)});
   }
 }
 const byPerson=new Map();
 for(const c of old){
  const id=c.person_id||'not-assigned',g=byPerson.get(id)||{personId:id,gross:0,paid:0,open:0,count:0};
  g.gross+=numeric(c.cents);g.paid+=payByCharge.get(c.id)||0;g.open+=numeric(c.cents)-(payByCharge.get(c.id)||0);g.count++;byPerson.set(id,g);
 }
 return {old,current,gross,paid,open,categories:sourceVerified?categories:fallback,
  sourceVerified,sourceDate:sourceVerified?snapshot.source_date:null,
  persons:[...byPerson.values()],paidChargeIds:new Set([...payByCharge.keys()])};
}
