import {expenseDistributionModel} from './expense-distribution.mjs?v=5.9.57';
import {escapeHtml as esc,money} from './core.mjs?v=5.8.1';
import {locale,t as tr} from './i18n.mjs?v=5.9.28';
import {expenseDonutChart} from './finance-charts.mjs?v=5.9.58';

export function expenseDistributionPanel(s,reportRange={}){
 const de=locale().startsWith('de'),t=(a,b)=>de?a:b;
 const model=expenseDistributionModel(s.data,reportRange,s.expenseDistributionYear||'report');
 const yearOptions=[['report',t('Berichtszeitraum','Rapor dönemi')],['all',t('Alle Jahre','Tüm yıllar')],...model.years.map(y=>[y,y])];
 const periodLabel=model.selected==='report'
  ?(reportRange.from||reportRange.to)?[reportRange.from||'…',reportRange.to||'…'].join(' – '):t('Gesamter Berichtszeitraum','Tüm rapor dönemi')
  :model.selected==='all'?t('Alle erfassten Jahre','Kayıtlı tüm yıllar'):model.selected;
 const count=model.categories.length;
 const formatPercent=new Intl.NumberFormat(de?'de-DE':'tr-TR',{maximumFractionDigits:1,minimumFractionDigits:0});
 const items=model.categories.map(([category,value])=>{
  const percentage=model.total>0?value/model.total*100:0;
  const percentLabel=formatPercent.format(percentage)+' %';
  return '<div class="expense-distribution-item">'+
   '<div class="expense-distribution-item-head"><span class="expense-distribution-item-name">'+esc(tr(category))+'</span>'+
   '<span class="expense-distribution-item-values"><strong>'+money(value)+'</strong><small>'+esc(percentLabel)+'</small></span></div>'+
   '<progress value="'+value+'" max="'+Math.max(model.total,value,1)+'" aria-label="'+esc(tr(category))+': '+esc(percentLabel)+'"></progress></div>';
 }).join('');
 const options=yearOptions.map(([value,label])=>'<option value="'+esc(value)+'" '+(model.selected===value?'selected':'')+'>'+esc(label)+'</option>').join('');
 return '<section id="expenseDistributionPanel" class="expense-distribution-panel" aria-label="'+t('Ausgabenverteilung','Gider dağılımı')+'">'+
  '<div class="expense-distribution-toolbar">'+
   '<div class="expense-distribution-heading"><strong>'+t('Auswertung nach Jahr','Yıllara göre dağılım')+'</strong><small>'+t('Dieser Filter verändert nur die Ausgabenverteilung.','Bu filtre yalnızca gider dağılımını değiştirir.')+'</small></div>'+
   '<label class="expense-distribution-filter"><span>'+t('Jahr auswählen','Yıl seç')+'</span><select id="expenseDistributionYear" aria-controls="expenseDistributionResults">'+options+'</select></label></div>'+
  '<div id="expenseDistributionResults" class="expense-distribution-results">'+
   '<div class="expense-distribution-summary"><div><span>'+t('Ausgaben im ausgewählten Zeitraum','Seçilen dönemdeki giderler')+'</span>'+
   '<strong>'+money(model.total)+'</strong></div><div class="expense-distribution-meta"><span>'+esc(periodLabel)+'</span><span>'+count+' '+t(count===1?'Kategorie':'Kategorien','kategori')+'</span></div></div>'+
   (items?expenseDonutChart(model):'')+
   (items?'<details class="fch-expense-details"><summary>'+t('Alle Kategorien mit Beträgen anzeigen','Tüm kategorilerin tutarlarını göster')+'</summary><div class="expense-distribution-items">'+items+'</div></details>':
    '<p class="expense-distribution-empty">'+t('Für diesen Zeitraum sind keine Ausgaben erfasst. Wähle ein anderes Jahr.','Bu döneme ait kayıtlı gider yok. Başka bir yıl seç.')+'</p>')+
  '</div></section>';
}
