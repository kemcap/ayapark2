import {demoCommand} from './ledger.mjs?v=5.0.0';
import {randomId} from './core.mjs?v=5.0.0';
import {batchPreview,paymentPlan} from './finance-v5.mjs?v=5.0.0';
export const isFinanceV5=act=>['batch_charge','monthly_v5','auto_allocate','monthly_exception','disable_exception','budget'].includes(act);
export function demoFinanceCommand(data,action,p){
 const d=structuredClone(data);d.operations??=[];d.exceptions??=[];const payload={...p,_action:action},old=d.operations.find(x=>x.request_id===p.request_id);
 if(old){if(JSON.stringify(old.payload)!==JSON.stringify(payload))throw Error('Bu istek farklı değerlerle kaydedildi.');return {...old.result,already_recorded:true};}
 const operation_id=randomId();let result={ok:true,operation_id};
 if(action==='monthly_exception'){
  if(!d.units.some(u=>u.id===p.unit_id)||p.person_id&&!d.links.some(l=>l.unit_id===p.unit_id&&l.person_id===p.person_id)||!['exemption','remuneration'].includes(p.kind)||p.reason?.length<3||p.decision_ref?.length<3||!p.valid_from||p.valid_to&&p.valid_to<p.valid_from||!(p.reference_cents>0))throw Error('İstisna bilgilerini kontrol edin.');
  if(d.exceptions.some(x=>!x.disabled_at&&x.unit_id===p.unit_id&&x.kind===p.kind&&(!x.valid_to||x.valid_to>=p.valid_from)&&(!p.valid_to||p.valid_to>=x.valid_from)))throw Error('Bu dönem için istisna zaten var.');
  const row={...p,id:randomId(),created_at:new Date().toISOString()};d.exceptions.push(row);result.id=row.id;
 }else if(action==='disable_exception'){const x=d.exceptions.find(x=>x.id===p.id&&!x.disabled_at);if(!x||p.reason?.length<3)throw Error('Aktif istisna bulunamadı.');x.disabled_at=new Date().toISOString();}
 else if(action==='budget'){if(p.reason?.length<3||!Number.isSafeInteger(p.restricted_cents)||!Number.isSafeInteger(p.planned_cents)||p.restricted_cents<0||p.planned_cents<0)throw Error('Bütçe bilgilerini kontrol edin.');d.budget={...p};}
 else if(['batch_charge','monthly_v5'].includes(action)){
  if(!p.confirmed||p.basis_ref?.length<3)throw Error('Önizlemeyi onaylayın.');const rows=batchPreview(d,p);result.charges=[];result.excluded=[];
  for(const row of rows){const ex=action==='monthly_v5'&&d.exceptions.find(x=>!x.disabled_at&&x.kind==='exemption'&&x.unit_id===row.unit_id&&(!x.person_id||x.person_id===row.person_id)&&x.valid_from<=p.due_on&&(!x.valid_to||x.valid_to>=p.due_on));
   if(ex){if(Number(ex.reference_cents)!==row.cents)throw Error('İstisna tutarı değişti. Kararı yeniden kontrol edin.');result.excluded.push(ex);continue;}
   if(p.expected?.[row.unit_id]!==row.cents)throw Error('Önizleme değişti. Yeniden kontrol edin.');
   const reference=action==='monthly_v5'?'monthly:'+p.due_on.slice(0,7)+'-01':'batch:'+operation_id;if(d.charges.some(c=>c.unit_id===row.unit_id&&c.reference===reference))throw Error('Bu dönem için aidat zaten oluşturuldu.');
   const charge={...p,...row,id:randomId(),operation_id,category:action==='monthly_v5'?'Aidat':p.category,reference,distribution_basis:{distribution:p.distribution,weight:p.weights?.[row.unit_id]||1,basis_ref:p.basis_ref}};d.charges.push(charge);result.charges.push({id:charge.id,unit_id:row.unit_id,cents:row.cents});
  }
 }else{
  if(!p.confirmed)throw Error('Önizlemeyi onaylayın.');const plan=paymentPlan(d,p);if(JSON.stringify(plan)!==JSON.stringify(p.expected_plan))throw Error('Ödeme bakiyesi değişti. Yeniden kontrol edin.');
  for(const row of plan.allocations)demoCommand(d,'allocate',{request_id:randomId(),entry_id:p.entry_id,...row});
  if(plan.credit_cents){const id=randomId();demoCommand(d,'credit',{request_id:id,entry_id:p.entry_id,person_id:p.person_id,unit_id:p.unit_id,cents:plan.credit_cents,debt_group:p.group});}
  result=plan;
 }
 d.operations.push({id:operation_id,request_id:p.request_id,payload,result});d.audit.unshift({id:randomId(),action,at:new Date().toISOString(),details:{payload:p,result}});Object.assign(data,d);return result;
}
export function prepareV5Demo(d){
 d.userId='demo-user';d.v5=true;d.financialUnitIds=['A-4'];d.exceptions=[];d.budget=null;d.operations=[];
 for(const u of d.units){if(d.links.some(l=>l.unit_id===u.id))continue;const id='demo-person-'+u.id;d.persons.push({id,first_name:'Örnek',last_name:u.code,full_name:'Örnek '+u.code,language:'tr',notes:''});d.links.push({id:'demo-link-'+u.id,unit_id:u.id,person_id:id,role:'owner',active:true,starts_on:null,revision:1});}
 return d;
}
