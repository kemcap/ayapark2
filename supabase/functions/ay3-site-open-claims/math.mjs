// Pure, integer-cent receivables accounting shared by the private Edge function and tests.
const amount=value=>{
 const n=Number(value);
 if(!Number.isSafeInteger(n))throw Error('Invalid accounting amount');
 return n;
};
/** @param {{units?: Array<any>,charges?: Array<any>,allocations?: Array<any>,entries?: Array<any>,credits?: Array<any>,staged?: Array<any>,ownUnitIds?: Array<string>}} input */
export function calculateClaims({units=[],charges=[],allocations=[],entries=[],credits=[],staged=[],ownUnitIds=[]}) {
 const available=new Map(units.map(u=>[u.id,{unit_id:u.id,code:u.code,open_cents:0}]));
 const owned=new Set(ownUnitIds.filter(id=>available.has(id)));
 const paid=new Map(), assigned=new Map();
 for(const a of allocations)if(!a.void_reason){
  paid.set(a.charge_id,(paid.get(a.charge_id)||0)+amount(a.cents));
  assigned.set(a.entry_id,(assigned.get(a.entry_id)||0)+amount(a.cents));
 }
 for(const c of credits)if(!c.void_reason)
  assigned.set(c.entry_id,(assigned.get(c.entry_id)||0)+amount(c.cents));
 let site_total_cents=0,open_charge_count=0;
 for(const charge of charges){
  const target=available.get(charge.unit_id);
  if(!target||charge.void_reason)continue;
  const rest=Math.max(0,amount(charge.cents)-(paid.get(charge.id)||0));
  if(!rest)continue;
  target.open_cents+=rest;
  site_total_cents+=rest;
  open_charge_count++;
 }
 const own_units=[...owned].map(id=>available.get(id)).sort((a,b)=>String(a.code).localeCompare(String(b.code),'tr'));
 const own_total_cents=own_units.reduce((n,u)=>n+u.open_cents,0);
 const reversed=new Set(entries.filter(e=>e.reversal_of).map(e=>e.reversal_of));
 let unmatched_entry_count=0,unmatched_entry_cents=0;
 for(const entry of entries) {
  if(amount(entry.cents)<=0||entry.reversal_of||reversed.has(entry.id))continue;
  const outstanding=Math.max(0,amount(entry.cents)-(assigned.get(entry.id)||0));
  if(!outstanding)continue;
  unmatched_entry_count++;
  unmatched_entry_cents+=outstanding;
 }
 const pending_source_count=staged.filter(x=>!x.confirmed_charge&&!x.ignored_reason).length;
 return {site_total_cents,own_total_cents,own_units,site_unit_count:available.size,
  open_charge_count,unmatched_entry_count,unmatched_entry_cents,pending_source_count};
}
