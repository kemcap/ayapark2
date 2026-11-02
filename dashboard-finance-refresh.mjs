// Refresh only the financial numbers required by the dashboard.
// All data comes from the same two permission-checked RPCs already used by API.load().
const cents = value => {
  const number = Number(value);
  if(!Number.isSafeInteger(number))throw Error('Invalid finance amount from server.');
  return number;
};
export function dashboardFinancePatch(base,summary,workspace){
 if(!base?.site?.id||!summary||!workspace||
  !Array.isArray(workspace.charges)||!Array.isArray(workspace.allocations)||
  !Array.isArray(workspace.credits)||!Array.isArray(workspace.entries))
  throw Error('Incomplete finance data received; keeping existing totals.');
 const charges=workspace.charges.map(c=>({...c,cents:cents(c.cents)}));
 const allocations=workspace.allocations.map(a=>({...a,cents:cents(a.cents)}));
 const credits=workspace.credits.map(c=>({...c,cents:cents(c.cents)}));
 const transactions=workspace.entries.map(t=>({
  ...t,date:t.booked_on,desc:t.description,iban:t.sender_iban||'',cents:cents(t.cents)
 })).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 const paid=new Map(),debts=new Map();
 for(const a of allocations)if(!a.void_reason)paid.set(a.charge_id,(paid.get(a.charge_id)||0)+a.cents);
 for(const c of charges)if(!c.void_reason)debts.set(c.unit_id,(debts.get(c.unit_id)||0)+c.cents-(paid.get(c.id)||0));
 const balance=summary.balance_cents==null?null:cents(summary.balance_cents);
 const opening=summary.opening_cents==null?null:cents(summary.opening_cents);
 if(!Array.isArray(summary.days))throw Error('Incomplete finance summary received.');
 return {
  ...base,charges,allocations,credits,transactions,
  units:base.units.map(u=>({...u,debt:u.debt===null?null:debts.get(u.id)||0})),
  summaryBalance:balance,
  summaryOpening:opening,
  summaryDays:summary.days,
  sourceLastDate:summary.source_last_date??null
 };
}
