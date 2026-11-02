import {escapeHtml as e} from './core.mjs?v=perf1';
import {remaining,paid} from './ledger.mjs?v=perf1';
const state={q:'',status:'all',unit:'all',period:'all',sort:'new',page:1};
let context=null;
const limit=()=>typeof window!=='undefined'&&window.matchMedia('(max-width:700px)').matches?10:20;
function candidates(){
 if(!context)return [];
 const {s,list}=context,d=s.data;
 const q=state.q.trim().toLocaleLowerCase();
 return list.filter(c=>{
  const unit=d.units.find(u=>u.id===c.unit_id);
  if(state.unit!=='all'&&unit?.id!==state.unit)return false;
  const left=remaining(d,c);
  if(state.status==='open'&&left<=0)return false;
  if(state.status==='paid'&&left!==0)return false;
  if(state.status==='partial'&&!(left>0&&paid(d,c.id)>0))return false;
  if(state.period!=='all'&&!(c.due_on||'').startsWith(state.period))return false;
  if(q&&!([unit?.code,c.label,c.category,d.persons?.find(p=>p.id===c.person_id)?.full_name,String(c.cents/100)].filter(Boolean).join(' ').toLocaleLowerCase().includes(q)))return false;
  return true;
 }).sort((a,b)=>state.sort==='old'?(a.due_on||'').localeCompare(b.due_on||''):state.sort==='amount'?b.cents-a.cents:state.sort==='balance'?remaining(d,b)-remaining(d,a):(b.due_on||'').localeCompare(a.due_on||''));
}
function refresh(){
 const root=document.getElementById('ay-charge-browser');if(!root||!context)return;
 const hits=candidates(),size=limit(),pages=Math.max(1,Math.ceil(hits.length/size));state.page=Math.min(state.page,pages);
 const view=hits.slice((state.page-1)*size,state.page*size);
 root.querySelector('[data-charge-results]').innerHTML=context.render(view);
 root.querySelector('[data-charge-count]').textContent=`${hits.length} Treffer · ${context.list.length} gesamt`;
 root.querySelector('[data-charge-pagination]').innerHTML=`<span>Seite ${state.page} von ${pages}</span><div class="row-actions"><button type="button" class="button small" data-charge-page="-1" ${state.page<=1?'disabled':''}>‹</button><button type="button" class="button small" data-charge-page="1" ${state.page>=pages?'disabled':''}>›</button></div>`;
}
let bound=false;
function bind(){
 if(bound||typeof document==='undefined')return;bound=true;
 document.addEventListener('input',ev=>{const t=ev.target;if(!t.closest?.('#ay-charge-browser')||!t.matches('[data-charge-filter]'))return;state[t.dataset.chargeFilter]=t.value;state.page=1;refresh();});
 document.addEventListener('change',ev=>{const t=ev.target;if(!t.closest?.('#ay-charge-browser')||!t.matches('[data-charge-filter]'))return;state[t.dataset.chargeFilter]=t.value;state.page=1;refresh();});
 document.addEventListener('click',ev=>{const t=ev.target.closest?.('[data-charge-page]');if(!t)return;state.page+=Number(t.dataset.chargePage);refresh();});
}
export function chargeBrowser(s,list,render){
 context={s,list,render};bind();
 const units=[...s.data.units].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
 const months=[...new Set(list.map(c=>(c.due_on||'').slice(0,7)).filter(Boolean))].sort().reverse();
 const sel=(key,options,label)=>`<label class="field"><span>${label}</span><select data-charge-filter="${key}">${options.map(([v,t])=>`<option value="${e(v)}" ${state[key]===v?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;
 const toolbar=`<div class="ay-charge-filters"><label class="field ay-charge-search"><span>Suche / Ara</span><input data-charge-filter="q" value="${e(state.q)}" placeholder="Wohnung, Schuldner, Forderung …"></label>${sel('status',[['all','Alle'],['open','Offen'],['paid','Bezahlt'],['partial','Teilbezahlt']],'Status')}${sel('unit',[['all','Alle Wohnungen'],...units.map(u=>[u.id,u.code])],'Wohnung')}${sel('period',[['all','Alle Zeiträume'],...months.map(m=>[m,m])],'Zeitraum')}${sel('sort',[['new','Neueste zuerst'],['old','Älteste zuerst'],['amount','Höchster Betrag'],['balance','Höchster offener Saldo']],'Sortierung')}</div>`;
 const html=`<div id="ay-charge-browser">${toolbar}<p class="fine" data-charge-count></p><div data-charge-results></div><div class="ay-charge-pagination" data-charge-pagination></div></div>`;
 queueMicrotask(()=>refresh());
 return html;
}
