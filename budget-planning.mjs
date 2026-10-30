// Forecast only: never creates a charge, changes a reserve, or initiates payment.
const MAX=900000000000;
function cents(value,{negative=false}={}){if(!Number.isSafeInteger(value)||Math.abs(value)>MAX||(!negative&&value<0))throw Error('Invalid plan amount');return value;}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Invalid plan date');return value;}
function add(a,b){return cents(a+b,{negative:true});}
function nextMonth(first,offset){const d=new Date(first+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,10);}
export function validatedPlan(items){
 if(!Array.isArray(items)||items.length>500)throw Error('Invalid plan');const ids=new Set();
 return items.map(item=>{if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id)||!['income','expense','repair'].includes(item.kind)||!['draft','approved','cancelled'].includes(item.status)||date(item.month).slice(8)!=='01')throw Error('Invalid plan item');ids.add(item.id);cents(item.cents);cents(item.booked_cents??0);if((item.booked_cents??0)>item.cents)throw Error('Booked plan amount exceeds plan');if(item.reserve_approved===true&&(item.kind==='income'||item.status!=='approved'))throw Error('Invalid reserve approval');return {...item,remaining_cents:item.cents-(item.booked_cents??0)};});
}
export function cashForecast({bankCents,asOf,restrictedCents=0,receivableCents=0,items=[],horizon=6}){
 date(asOf);cents(restrictedCents);cents(receivableCents);if(![3,6].includes(horizon))throw Error('Forecast horizon must be 3 or 6 months');
 const plan=validatedPlan(items),first=asOf.slice(0,7)+'-01';
 if(bankCents==null)return {available:false,asOf,receivable_cents:receivableCents,months:[]};
 cents(bankCents,{negative:true});let conservative=bankCents,scenario=bankCents,reserved=restrictedCents;
 const months=Array.from({length:horizon},(_,offset)=>{const month=nextMonth(first,offset),rows=plan.filter(p=>(p.month===month||(offset===0&&p.month<first))&&p.status!=='cancelled');
  const outgoing=rows.filter(p=>p.kind!=='income').reduce((n,p)=>add(n,p.remaining_cents),0),anticipated=rows.filter(p=>p.kind==='income').reduce((n,p)=>add(n,p.remaining_cents),0),approvedRelease=rows.filter(p=>p.kind!=='income'&&p.reserve_approved===true).reduce((n,p)=>add(n,p.remaining_cents),0);
  if(approvedRelease>reserved)throw Error('Planned reserve use exceeds restricted funds');
  conservative=add(conservative,-outgoing);scenario=add(add(scenario,-outgoing),anticipated);reserved-=approvedRelease;
  return {month,outgoing_cents:outgoing,anticipated_income_cents:anticipated,bank_without_new_income_cents:conservative,bank_with_anticipated_income_cents:scenario,restricted_cents:reserved,free_without_new_income_cents:add(conservative,-reserved),free_with_anticipated_income_cents:add(scenario,-reserved)};
 });
 return {available:true,asOf,bank_cents:bankCents,receivable_cents:receivableCents,months};
}
export function annualPlan(items,year){
 if(!Number.isInteger(year)||year<1900||year>9998)throw Error('Invalid plan year');const rows=validatedPlan(items).filter(p=>p.month.startsWith(year+'-')&&p.status!=='cancelled');
 return rows.reduce((result,p)=>{const key=p.kind==='income'?'planned_income_cents':p.kind==='repair'?'planned_repair_cents':'planned_expense_cents';result[key]=add(result[key],p.cents);const unpaid=p.kind==='income'?'unbooked_income_cents':'unbooked_cost_cents';result[unpaid]=add(result[unpaid],p.remaining_cents);return result;},{year,planned_income_cents:0,planned_expense_cents:0,planned_repair_cents:0,unbooked_income_cents:0,unbooked_cost_cents:0});
}
