// Pure source checks only: no allocation, no changes to source rows or amounts.
export function reviewImport(entries){
 if(!Array.isArray(entries)||!entries.length)throw new TypeError('Import entries required');
 let incomeCents=0,expenseCents=0;
 for(const row of entries){
  if(!Number.isSafeInteger(row.cents)||row.balance_cents!=null&&!Number.isSafeInteger(row.balance_cents))throw new TypeError('Invalid source amount');
  if(row.cents>0)incomeCents+=row.cents;else expenseCents-=row.cents;
 }
 if(!Number.isSafeInteger(incomeCents)||!Number.isSafeInteger(expenseCents))throw new TypeError('Source total exceeds exact integer range');
 const knownBalances=entries.filter(row=>row.balance_cents!=null).length;
 const inspect=rows=>{let previous=null,pending=0n,checked=0,mismatches=0;for(const row of rows){
  if(previous!=null)pending+=BigInt(row.cents);
  if(row.balance_cents!=null){
   if(previous!=null){checked++;if(previous+pending!==BigInt(row.balance_cents))mismatches++;}
   previous=BigInt(row.balance_cents);pending=0n;
  }
 }return {checked,mismatches};};
 const forward=inspect(entries),reverse=inspect([...entries].reverse());
 const chosen=forward.mismatches<=reverse.mismatches?forward:reverse;
 const direction=knownBalances<2?'unknown':forward.mismatches===0?'oldest-first':reverse.mismatches===0?'newest-first':'unknown';
 return {incomeCents,expenseCents,netCents:incomeCents-expenseCents,knownBalances,checkedTransitions:chosen.checked,mismatches:chosen.mismatches,direction,
  status:knownBalances<2?'unavailable':chosen.mismatches?'mismatch':knownBalances===entries.length?'consistent':'partial',
  mayImport:knownBalances<2||chosen.mismatches===0};
}
