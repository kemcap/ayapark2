import {uiText} from './language-text.mjs?v=5.10.0';
import {t as tr,getLanguage} from './i18n.mjs?v=5.10.0';
import {escapeHtml as e,money} from './core.mjs?v=5.10.0';

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
 const mobile='<div class="balance-mobile"><div class="balance-mobile-total"><span>'+e((getLanguage()==='tr'?('Devir listesi toplamı'):(uiText("Archivsumme",getLanguage()))))+'</span><strong>'+money(total)+'</strong></div>'+rows.map(r=>'<details class="balance-mobile-item archive-person"><summary><strong class="balance-mobile-unit">'+e(unitCode(r))+'</strong><span class="balance-mobile-person">'+e(r.source_name)+'<small>'+role(r)+'</small></span><strong>'+money(Number(r.total_cents))+'</strong></summary><dl>'+columns.filter(k=>entryValue(r,k)).map(k=>'<div><dt>'+e(tr(k))+'</dt><dd>'+money(entryValue(r,k))+'</dd></div>').join('')+'</dl></details>').join('')+'</div>';
 const header=(getLanguage()==='tr'?('Palmiye Yönetiminden Devralınan Bakiye Listesi'):(uiText("Von Palmiye Yönetim übernommene Saldenliste",getLanguage())));
 const explanation=(getLanguage()==='tr'?('Palmiye Yönetiminden devralınan borçların orijinal kayıt tutarlarıdır. Devir kayıt tarihi: 09.10.2026. Kaynak PDF dönemi: 01.01.2020–30.10.2026. Sonraki ödemeler bu tarihi listeyi değiştirmez.'):(uiText("Originalstand der von Palmiye Yönetim übernommenen Forderungen (Übernahmereferenz: 09.10.2026). Berichtszeitraum laut PDF: 01.01.2020–30.10.2026. Nachfolgende Zahlungen ändern diesen historischen Stand nicht.",getLanguage())));
 return '<details class="devir-archive"><summary class="devir-archive-toggle"><span class="devir-archive-title">'+e(header)+'</span><span class="devir-archive-date">09.10.2026</span><span class="devir-archive-chevron" aria-hidden="true">⌄</span></summary><div class="devir-archive-content"><div class="devir-archive-meta"><p class="fine">'+e(explanation)+'</p><span class="devir-archive-total">'+e((getLanguage()==='tr'?('Devir toplamı'):(uiText("Gesamtsaldo bei Übergabe",getLanguage()))))+': <strong>'+money(total)+'</strong></span></div>'+desktop+mobile+'</div></details>';
}
