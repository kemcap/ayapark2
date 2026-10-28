import {t as tr,getLanguage} from './i18n.mjs?v=5.8.1';
import {escapeHtml as e,money} from './core.mjs?v=5.8.1';

const columns=['Su dijital kafa','Aidat','Asansör','Bina kapısı bakımı','Havuz','Demirbaş','Su arıtma bakımı'];
const entryValue=(r,k)=>Number((r.categories||{})[k]||0);
const amount=v=>v?money(v):'—';

export function devirArchive(s){
 const d=s.data;
 const allowed=new Set(d.role==='resident'?(d.ownIds||[]):(d.units||[]).map(u=>u.id));
 const rows=(d.devirSnapshot||[]).filter(r=>allowed.has(r.unit_id)).sort((a,b)=>a.source_row-b.source_row);
 if(!rows.length)return '';
 const de=getLanguage()==='de',total=rows.reduce((sum,r)=>sum+Number(r.total_cents||0),0);
 const names=new Map((d.units||[]).map(u=>[u.id,u.code]));
 const unitCode=r=>names.get(r.unit_id)||'—';
 const role=r=>e(tr(r.source_role==='owner'?'Ev sahibi':'Kiracı'));
 const categoryCells=r=>columns.map(k=>'<td class="amount">'+amount(entryValue(r,k))+'</td>').join('');
 const desktopRows=rows.map(r=>'<tr><th scope="row">'+e(unitCode(r))+'</th><td>'+e(r.source_name)+'</td><td>'+role(r)+'</td>'+categoryCells(r)+'<td class="amount"><strong>'+money(Number(r.total_cents))+'</strong></td></tr>').join('');
 const categoriesTotals=columns.map(k=>'<td class="amount">'+amount(rows.reduce((sum,r)=>sum+entryValue(r,k),0))+'</td>').join('');
 const desktop='<div class="table-wrap balance-desktop"><table class="balance-matrix"><thead><tr><th>'+e(tr('Daire'))+'</th><th>'+e(tr('Borçlu'))+'</th><th>'+e(tr('Tür'))+'</th>'+columns.map(k=>'<th>'+e(tr(k))+'</th>').join('')+'<th>'+e(tr('Toplam'))+'</th></tr></thead><tbody>'+desktopRows+'<tr class="archive-total-row"><th colspan="3">'+e(tr('Toplam'))+'</th>'+categoriesTotals+'<td class="amount"><strong>'+money(total)+'</strong></td></tr></tbody></table></div>';
 const mobile='<div class="balance-mobile"><div class="balance-mobile-total"><span>'+e(de?'Archivsumme':'Devir listesi toplamı')+'</span><strong>'+money(total)+'</strong></div>'+rows.map(r=>'<details class="balance-mobile-item archive-person"><summary><strong class="balance-mobile-unit">'+e(unitCode(r))+'</strong><span class="balance-mobile-person">'+e(r.source_name)+'<small>'+role(r)+'</small></span><strong>'+money(Number(r.total_cents))+'</strong></summary><dl>'+columns.filter(k=>entryValue(r,k)).map(k=>'<div><dt>'+e(tr(k))+'</dt><dd>'+money(entryValue(r,k))+'</dd></div>').join('')+'</dl></details>').join('')+'</div>';
 const header=de?'Übernommene Original-Salden':'Devir alınan orijinal bakiye listesi';
 const actionOpen=de?'Archiv anzeigen':'Devir listesini aç';
 const actionClose=de?'Archiv schließen':'Devir listesini kapat';
 const explanation=de?'Unveränderter Stand aus der detaillierten Saldenliste vom 09.10.2026. Zeitraum laut Original: 01.01.2020–30.10.2026. Spätere Zahlungen verändern diese Archivwerte nicht.':'09.10.2026 tarihli eski yönetimden devralınan kategori detaylı bakiye listesinin sabit kaydıdır. Kaynaktaki dönem: 01.01.2020–30.10.2026. Sonraki ödemeler bu arşiv tutarlarını değiştirmez.';
 return '<details class="devir-archive"><summary class="devir-archive-toggle"><span class="devir-archive-title"><strong>'+e(header)+'</strong><small>09.10.2026 · '+e(de?'Historischer Stand':'Eski yönetim devir kaydı')+'</small></span><span class="devir-archive-amount">'+money(total)+'</span><span class="devir-archive-action"><span class="devir-archive-open">'+e(actionOpen)+'</span><span class="devir-archive-close">'+e(actionClose)+'</span><span class="devir-archive-chevron" aria-hidden="true">⌄</span></span></summary><div class="devir-archive-content"><p class="fine">'+e(explanation)+'</p>'+desktop+mobile+'</div></details>';
}
