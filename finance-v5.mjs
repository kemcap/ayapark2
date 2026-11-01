import {activeAt,creditAvailable} from './v3-domain.mjs?v=perf1';
import {remaining,unassigned} from './ledger.mjs?v=perf1';
export const financeLinkAt=(l,day,{historical=false}={})=>(historical?((l.active!==false&&!l.archived_at)||!!(l.starts_on&&l.ends_on)):(l.active!==false&&!l.archived_at))&&(!l.starts_on||l.starts_on<=day)&&(!l.ends_on||l.ends_on>=day);
export const chargeCategories=['Genel Gider / İşletme','Bakım ve Onarım','Demirbaş'];
export const debtGroup=c=>!c.debt_group||c.debt_group==='legacy'?'legacy:'+c.category:c.debt_group;
export function amountCents(raw){
 const value=String(raw??'').trim();if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value))throw Error('Tutarı 3.600,00 biçiminde yazın.');
 const [whole,fraction='']=value.replaceAll('.','').split(',');const cents=Number(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')));
 if(!Number.isSafeInteger(cents)||cents<=0||cents>900000000000)throw Error('Pozitif ve geçerli tutar gerekli.');return cents;
}
export function distribute(cents,ids,mode='total',weights={}){
 const sorted=[...new Set(ids)].sort();if(!sorted.length||sorted.length!==ids.length||sorted.length>20||!Number.isSafeInteger(cents)||cents<=0||cents>900000000000)throw Error('Daire ve tutarı kontrol edin.');
 if(!['total','per_unit','shares'].includes(mode))throw Error('Dağıtım türünü seçin.');
 const ws=sorted.map(id=>mode==='shares'?Number(weights[id]):1);if(ws.some(w=>!Number.isSafeInteger(w)||w<=0||w>1000000000))throw Error('Her daire için geçerli arsa payı gerekli.');
 const sum=ws.reduce((a,b)=>a+BigInt(b),0n),total=BigInt(cents);let values=ws.map(w=>mode==='per_unit'?cents:Number(total*BigInt(w)/sum));
 if(mode!=='per_unit'){let rest=cents-values.reduce((a,b)=>a+b,0);const order=ws.map((w,i)=>({i,r:total*BigInt(w)%sum})).sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1);for(let i=0;i<rest;i++)values[order[i].i]++;}
 if(values.some(n=>n<=0)||values.reduce((a,b)=>a+b,0)>900000000000)throw Error('Dağıtım tutarını kontrol edin.');
 return sorted.map((unit_id,i)=>({unit_id,cents:values[i]}));
}
export function selectedUnits(d,p){
 let units=d.units.filter(u=>p.scope==='all'||p.scope===u.block||p.scope==='selected'&&(p.unit_ids||[]).includes(u.id));
 const excluded=p.exclusions||[];if(excluded.some(x=>!x.reason?.trim()||x.reason.trim().length<3||!units.some(u=>u.id===x.unit_id)))throw Error('Hariç tutulan her daire için gerekçe gerekli.');
 units=units.filter(u=>!excluded.some(x=>x.unit_id===u.id));if(!units.length)throw Error('Daire seçin.');return units;
}
export function batchPreview(d,p){
 const units=selectedUnits(d,p),rows=distribute(p.cents,units.map(u=>u.id),p.distribution,p.weights);
 const levy=p.debt_group==='capital'&&p.liability_on;
 return rows.map(row=>{const link=d.links.find(l=>l.id===p.debtors?.[row.unit_id]&&l.unit_id===row.unit_id&&(levy?l.role==='owner':['owner','tenant'].includes(l.role))&&financeLinkAt(l,levy||p.due_on,{historical:!!levy}));if(!link)throw Error('Her daire için sorumlu kişiyi seçin.');return {...row,link_id:link.id,person_id:link.person_id};});
}
export function paymentPlan(d,{entry_id,unit_id,person_id,group}){
 const entry=d.transactions.find(t=>t.id===entry_id);if(!entry||entry.cents<=0||entry.reversal_of||d.transactions.some(t=>t.reversal_of===entry_id))throw Error('Geçerli tahsilat bulunamadı.');
 if(!d.links.some(l=>l.unit_id===unit_id&&l.person_id===person_id))throw Error('Kişi seçin.');
 let available=unassigned(d,entry)-creditAvailable(d,entry);if(available<=0)throw Error('Kullanılabilir ödeme yok.');const original=available,allocations=[];
 const charges=d.charges.filter(c=>c.unit_id===unit_id&&c.person_id===person_id&&debtGroup(c)===group&&!c.void_reason&&remaining(d,c)>0).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.id.localeCompare(b.id));
 for(const c of charges){const cents=Math.min(available,remaining(d,c));if(cents>0)allocations.push({charge_id:c.id,cents,due_on:c.due_on});available-=cents;}
 return {entry_id,unit_id,person_id,group,available_cents:original,allocations,credit_cents:available};
}
export function availableBudget(d){if(!d.budget||d.summaryBalance==null)return null;return Number(d.summaryBalance)-Number(d.budget.restricted_cents)-Number(d.budget.planned_cents);}
