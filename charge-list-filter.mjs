import {escapeHtml as e} from './core.mjs?v=perf1';
import {remaining,paid} from './ledger.mjs?v=20261105-owner-transfer';
import {locale} from './i18n.mjs?v=5.10.0';

const state={q:'',status:'all',block:'all',unit:'all',period:'all',sort:'new',page:1,view:'compact'};
let context=null,bound=false;
const copy={
 de:{search:'Wohnung, Name oder Forderung suchen',searchHint:'Suchbegriff eingeben',all:'Alle',open:'Offen',partial:'Teilbezahlt',paid:'Bezahlt',status:'Status',block:'Block',units:'Wohnung',allUnits:'Alle Wohnungen',period:'Zeitraum',allPeriods:'Alle Zeiträume',sort:'Sortieren',new:'Neueste zuerst',old:'Älteste zuerst',amount:'Höchster Betrag',balance:'Höchster offener Betrag',filters:'Weitere Filter',compact:'Kompakt',detail:'Tabelle',hits:'Treffer',of:'von',page:'Seite',reset:'Filter zurücksetzen',none:'Keine passenden Forderungen gefunden.',prev:'Vorherige Seite',next:'Nächste Seite',views:'Darstellung'},
 tr:{search:'Daire, kişi veya borç ara',searchHint:'Aramak için yazın',all:'Tümü',open:'Açık',partial:'Kısmen ödendi',paid:'Ödendi',status:'Durum',block:'Blok',units:'Daire',allUnits:'Tüm daireler',period:'Dönem',allPeriods:'Tüm dönemler',sort:'Sıralama',new:'En yeni önce',old:'En eski önce',amount:'En yüksek tutar',balance:'En yüksek açık bakiye',filters:'Diğer filtreler',compact:'Kompakt',detail:'Tablo',hits:'sonuç',of:'/',page:'Sayfa',reset:'Filtreleri temizle',none:'Filtrelerle eşleşen borç bulunamadı.',prev:'Önceki sayfa',next:'Sonraki sayfa',views:'Görünüm'},
 en:{search:'Search apartment, person or charge',searchHint:'Enter a search term',all:'All',open:'Open',partial:'Partly paid',paid:'Paid',status:'Status',block:'Block',units:'Apartment',allUnits:'All apartments',period:'Period',allPeriods:'All periods',sort:'Sort by',new:'Newest first',old:'Oldest first',amount:'Largest amount',balance:'Largest balance',filters:'More filters',compact:'Compact',detail:'Table',hits:'matches',of:'of',page:'Page',reset:'Reset filters',none:'No matching charges found.',prev:'Previous page',next:'Next page',views:'View'}
};
const t=key=>(copy[locale().slice(0,2)]||copy.de)[key];
const limit=()=>typeof window!=='undefined'&&window.matchMedia('(max-width:700px)').matches?10:20;
function candidates(){
 if(!context)return [];
 const {s,list}=context,d=s.data,q=state.q.trim().toLocaleLowerCase();
 const units=new Map(d.units.map(u=>[u.id,u]));
 return list.filter(c=>{
  const unit=units.get(c.unit_id);
  if(state.block!=='all'&&!String(unit?.block||'').toUpperCase().startsWith(state.block))return false;
  if(state.unit!=='all'&&unit?.id!==state.unit)return false;
  const left=remaining(d,c);
  if(state.status==='open'&&left<=0)return false;
  if(state.status==='paid'&&(left!==0||c.void_reason))return false;
  if(state.status==='partial'&&!(left>0&&paid(d,c.id)>0))return false;
  if(state.period!=='all'&&!(c.due_on||'').startsWith(state.period))return false;
  if(q&&!([unit?.code,c.label,c.category,d.persons?.find(p=>p.id===c.person_id)?.full_name,String(c.cents/100)].filter(Boolean).join(' ').toLocaleLowerCase().includes(q)))return false;
  return true;
 }).sort((a,b)=>state.sort==='old'?(a.due_on||'').localeCompare(b.due_on||''):state.sort==='amount'?b.cents-a.cents:state.sort==='balance'?remaining(d,b)-remaining(d,a):(b.due_on||'').localeCompare(a.due_on||''));
}
function refresh(){
 if(typeof document==='undefined')return;
 const root=document.getElementById('ay-charge-browser');if(!root||!context)return;
 const hits=candidates(),size=limit(),pages=Math.max(1,Math.ceil(hits.length/size));
 state.page=Math.max(1,Math.min(state.page,pages));
 const view=hits.slice((state.page-1)*size,state.page*size);
 root.querySelector('[data-charge-results]').innerHTML=hits.length||!context.list.length?context.render(view):`<div class="dues-no-results"><p>${e(t('none'))}</p><button type="button" class="button" data-charge-reset>${e(t('reset'))}</button></div>`;
 root.querySelectorAll('[data-charge-view]').forEach(el=>{el.hidden=el.dataset.chargeView!==state.view;});
 root.querySelectorAll('[data-charge-view-toggle]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.chargeViewToggle===state.view));});
 root.querySelectorAll('[data-charge-status]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.chargeStatus===state.status));});
 root.querySelectorAll('[data-charge-block]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.chargeBlock===state.block));});
 root.querySelector('[data-charge-count]').textContent=`${hits.length} ${t('hits')} · ${t('of')} ${context.list.length}`;
 root.querySelector('[data-charge-pagination]').innerHTML=pages<=1?'':`<span>${e(t('page'))} ${state.page} / ${pages}</span><div class="row-actions"><button type="button" class="button small" data-charge-page="-1" aria-label="${e(t('prev'))}" ${state.page<=1?'disabled':''}>‹</button><button type="button" class="button small" data-charge-page="1" aria-label="${e(t('next'))}" ${state.page>=pages?'disabled':''}>›</button></div>`;
}
function reset(){
 Object.assign(state,{q:'',status:'all',block:'all',unit:'all',period:'all',sort:'new',page:1});
 const root=document.getElementById('ay-charge-browser');
 if(!root)return;
 root.querySelectorAll('[data-charge-filter]').forEach(node=>{node.value=state[node.dataset.chargeFilter];});
 refresh();
}
function bind(){
 if(bound||typeof document==='undefined')return;bound=true;
 const update=ev=>{const field=ev.target;if(!field.closest?.('#ay-charge-browser')||!field.matches('[data-charge-filter]'))return;state[field.dataset.chargeFilter]=field.value;state.page=1;refresh();};
 document.addEventListener('input',ev=>{if(ev.target.matches?.('input[data-charge-filter]'))update(ev);});
 document.addEventListener('change',update);
 document.addEventListener('click',ev=>{
  const target=ev.target.closest?.('#ay-charge-browser button');if(!target)return;
  if(target.matches('[data-charge-view-toggle]')){state.view=target.dataset.chargeViewToggle;try{localStorage.setItem('ayapark-charge-view',state.view);}catch(_){}refresh();}
  else if(target.matches('[data-charge-page]')){state.page+=Number(target.dataset.chargePage);refresh();}
  else if(target.matches('[data-charge-status]')){state.status=target.dataset.chargeStatus;state.page=1;const field=document.querySelector('#ay-charge-browser [data-charge-filter="status"]');if(field)field.value=state.status;refresh();}
  else if(target.matches('[data-charge-block]')){state.block=target.dataset.chargeBlock;state.page=1;refresh();}
  else if(target.matches('[data-charge-reset]'))reset();
 });
}
export function chargeBrowser(s,list,render){
 context={s,list,render};if(!state.viewInitialized){try{state.view=localStorage.getItem('ayapark-charge-view')==='detail'?'detail':'compact';}catch(_){}state.viewInitialized=true;}bind();
 const unitMap=new Map(s.data.units.map(u=>[u.id,u]));
 const units=[...new Map(list.map(c=>[c.unit_id,unitMap.get(c.unit_id)]).filter(([,u])=>u).map(([id,u])=>[id,u])).values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
 const months=[...new Set(list.map(c=>(c.due_on||'').slice(0,7)).filter(Boolean))].sort().reverse();
 const sel=(key,options,label)=>`<label class="field"><span>${e(label)}</span><select data-charge-filter="${key}">${options.map(([v,label])=>`<option value="${e(v)}" ${state[key]===v?'selected':''}>${e(label)}</option>`).join('')}</select></label>`;
 const pill=(attr,val,label,group)=>`<button type="button" class="dues-pill" ${attr}="${val}" aria-pressed="${state[group]===val}">${e(label)}</button>`;
 const statuses=[['all',t('all')],['open',t('open')],['partial',t('partial')],['paid',t('paid')]];
 const blocks=[['all',t('all')],['A','A'],['B','B']];
 const toolbar=`<div class="dues-filter-panel"><label class="field dues-search"><span>${e(t('search'))}</span><input type="search" data-charge-filter="q" value="${e(state.q)}" placeholder="${e(t('searchHint'))}" autocomplete="off"></label><div class="dues-filter-row"><fieldset class="dues-filter-group"><legend>${e(t('status'))}</legend><div class="dues-pills">${statuses.map(([v,l])=>pill('data-charge-status',v,l,'status')).join('')}</div></fieldset><fieldset class="dues-filter-group"><legend>${e(t('block'))}</legend><div class="dues-pills">${blocks.map(([v,l])=>pill('data-charge-block',v,l,'block')).join('')}</div></fieldset></div><details class="dues-more-filters"><summary>${e(t('filters'))}</summary><div class="ay-charge-filters">${sel('unit',[['all',t('allUnits')],...units.map(u=>[u.id,u.code])],t('units'))}${sel('period',[['all',t('allPeriods')],...months.map(m=>[m,m])],t('period'))}${sel('sort',[['new',t('new')],['old',t('old')],['amount',t('amount')],['balance',t('balance')]],t('sort'))}</div><button type="button" class="button small" data-charge-reset>${e(t('reset'))}</button></details></div>`;
 const initial=candidates().slice(0,limit());
 const html=`<div id="ay-charge-browser">${toolbar}<div class="ay-charge-toolbar"><p class="fine" role="status" aria-live="polite" data-charge-count></p><div class="dues-view-toggle" role="group" aria-label="${e(t('views'))}"><button type="button" class="button small" data-charge-view-toggle="compact" aria-pressed="${state.view==='compact'}">${e(t('compact'))}</button><button type="button" class="button small" data-charge-view-toggle="detail" aria-pressed="${state.view==='detail'}">${e(t('detail'))}</button></div></div><div data-charge-results>${render(initial)}</div><div class="ay-charge-pagination" data-charge-pagination></div></div>`;
 queueMicrotask(()=>refresh());
 return html;
}
