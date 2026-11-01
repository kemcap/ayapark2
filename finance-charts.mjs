import {uiText} from './language-text.mjs?v=5.10.0';
import {escapeHtml as e,money} from './core.mjs?v=perf1';
import {locale,t as tr} from './i18n.mjs?v=5.10.0';

const de=()=>locale().startsWith('de');
const t=(g,trText)=>(locale().slice(0,2)==='tr'?(trText):(uiText(g,locale().slice(0,2))));
const currency=v=>money(Math.round(v));
const pct=v=>new Intl.NumberFormat((locale().slice(0,2)==='tr'?('tr-TR'):(uiText("de-DE",locale().slice(0,2)))),{maximumFractionDigits:1}).format(v)+' %';
const num=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const colors=10;
const color=i=>'var(--fch-color-'+(i%colors)+')';
const tooltipAttrs=(label,value,percent='')=>' data-chart-label="'+e(label)+'" data-chart-value="'+e(currency(value))+'" data-chart-percent="'+e(percent)+'"';
const guide=(prefix,label,value,percentage)=>tooltipAttrs(label,value,percentage)+' tabindex="0" role="img" aria-label="'+e(label+': '+currency(value)+(percentage?' · '+percentage:''))+'"';

export function donutModel(entries){
 const clean=entries.filter(x=>num(x.value)>0).map(x=>({label:String(x.label),value:num(x.value)}));
 const total=clean.reduce((n,x)=>n+x.value,0);
 return {total,segments:clean.map(x=>({...x,percent:total?x.value/total*100:0}))};
}

// SVG paths are native, keyboard-focusable and data-driven; no runtime CDN or third-party tracking.
export function donutViz(entries,{id,centerLabel,centerAmount,subtitle='',compact=false}={}){
 const model=donutModel(entries),radius=105,stroke=29;
 let offset=0;
 const arcs=model.segments.map((s,i)=>{
  const dash=s.percent.toFixed(5),start=offset;offset+=s.percent;
  return '<circle class="fch-donut-arc" cx="160" cy="160" r="'+radius+'" pathLength="100" fill="none" stroke="'+color(i)+'" stroke-width="'+stroke+'" stroke-dasharray="'+dash+' '+(100-s.percent).toFixed(5)+'" stroke-dashoffset="'+(-start).toFixed(5)+'" stroke-linecap="butt" style="--arc-order:'+i+';"'+guide(id,s.label,s.value,pct(s.percent))+'><title>'+e(s.label+' · '+currency(s.value)+' · '+pct(s.percent))+'</title></circle>';
 }).join('');
 const center=compact?'fch-donut fch-donut-compact':'fch-donut';
 return '<div class="'+center+'" data-chart-scope="'+e(id)+'"><div class="fch-donut-stage">'+
   '<svg class="fch-donut-svg" viewBox="0 0 320 320" role="group" aria-label="'+e(subtitle||centerLabel)+'">'+
   '<circle cx="160" cy="160" r="'+radius+'" fill="none" stroke="var(--fch-track)" stroke-width="'+stroke+'"/>'+
   '<g transform="rotate(-90 160 160)">'+arcs+'</g></svg>'+
   '<div class="fch-donut-center" aria-hidden="true"><span>'+e(centerLabel)+'</span><strong>'+e(currency(centerAmount??model.total))+'</strong>'+
   (subtitle?'<small>'+e(subtitle)+'</small>':'')+'</div></div>'+
   (model.segments.length?'<div class="fch-donut-legend" aria-label="'+t('Diagrammlegende','Grafik açıklaması')+'">'+model.segments.map((s,i)=>
    '<button type="button" class="fch-legend-item" data-chart-series="'+i+'"'+tooltipAttrs(s.label,s.value,pct(s.percent))+
     '><i class="fch-legend-dot" style="background:'+color(i)+'"></i><span>'+e(s.label)+'</span><strong>'+e(pct(s.percent))+'</strong><small>'+e(currency(s.value))+'</small></button>'
   ).join('')+'</div>':
    '<p class="fch-empty">'+t('Für diesen Zeitraum liegen keine Daten vor.','Bu döneme ait veri yok.')+'</p>')+
 '</div>';
}
const shortNumber=v=>{
 const units=v/100;
 return new Intl.NumberFormat((locale().slice(0,2)==='tr'?('tr-TR'):(uiText("de-DE",locale().slice(0,2)))),{notation:'compact',maximumFractionDigits:1}).format(units);
};
const xLabel=period=>/^\d{4}-\d{2}$/.test(period)?period.slice(5)+'/'+period.slice(2,4):period;

export function cartesianViz(buckets,{type='bar'}={}){
 if(!buckets.length)return '<p class="fch-empty">'+t('Im gewählten Zeitraum sind keine Daten vorhanden.','Seçilen dönemde veri yok.')+'</p>';
 const width=Math.max(790,buckets.length*79+92),height=340,left=71,top=25,bottom=280,right=width-28,plotHeight=bottom-top,plotWidth=right-left;
 const max=Math.max(1,...buckets.map(r=>Math.max(num(r.income),num(r.expense))));
 const niceMax=Math.ceil(max/Math.pow(10,Math.floor(Math.log10(max))))*Math.pow(10,Math.floor(Math.log10(max)));
 const y=v=>bottom-(num(v)/niceMax)*plotHeight;
 const x=i=>left+(i+.5)*plotWidth/buckets.length;
 const labels=buckets.map(b=>String(b.period));
 const ticks=Array.from({length:5},(_,i)=>i/4);
 const grid=ticks.map(r=>'<g class="fch-gridline"><line x1="'+left+'" y1="'+y(niceMax*r).toFixed(1)+'" x2="'+right+'" y2="'+y(niceMax*r).toFixed(1)+'"/><text text-anchor="end" x="'+(left-13)+'" y="'+(y(niceMax*r)+4).toFixed(1)+'">'+e(shortNumber(niceMax*r))+'</text></g>').join('');
 const xlabels=buckets.map((b,i)=>'<text class="fch-x-label" text-anchor="middle" x="'+x(i).toFixed(1)+'" y="'+(bottom+25)+'">'+e(xLabel(labels[i]))+'</text>').join('');
 const grad='<defs><linearGradient id="fch-income-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--fch-income)" stop-opacity=".24"/><stop offset="100%" stop-color="var(--fch-income)" stop-opacity="0"/></linearGradient>'+
 '<linearGradient id="fch-expense-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--fch-expense)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--fch-expense)" stop-opacity="0"/></linearGradient></defs>';
 let marks='';
 if(type==='bar'){
  const bw=Math.min(21,Math.max(9,plotWidth/buckets.length*.25));
  marks=buckets.map((b,i)=>{
   return [['income',num(b.income),-bw-2,t('Einnahmen','Gelir')],['expense',num(b.expense),2,t('Ausgaben','Gider')]].map(([kind,v,dx,label])=>{
    const py=y(v),h=Math.max(0,bottom-py);
    return '<rect class="fch-bar fch-'+kind+'" x="'+(x(i)+dx).toFixed(2)+'" y="'+py.toFixed(2)+'" width="'+bw+'" height="'+h.toFixed(2)+'" rx="5"'+guide(kind,label+' · '+labels[i],v)+'><title>'+e(label+' · '+labels[i]+' · '+currency(v))+'</title></rect>';
   }).join('');
  }).join('');
 }else{
  const series=[['income',t('Einnahmen','Gelir')],['expense',t('Ausgaben','Gider')]];
  marks=series.map(([kind,label])=>{
   const points=buckets.map((b,i)=>[x(i),y(num(b[kind]))]);
   const path=points.map(([px,py],i)=>(i?'L':'M')+px.toFixed(2)+' '+py.toFixed(2)).join(' ');
   const area=path+' L'+points.at(-1)[0].toFixed(2)+' '+bottom+' L'+points[0][0].toFixed(2)+' '+bottom+' Z';
   return '<path class="fch-area fch-'+kind+'-area" d="'+area+'" fill="url(#fch-'+kind+'-area)"/>'+
    '<path class="fch-line fch-'+kind+'-line" d="'+path+'" pathLength="1" fill="none" stroke="var(--fch-'+kind+')" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+
    buckets.map((b,i)=>{
     const v=num(b[kind]);
     return '<circle class="fch-point fch-'+kind+'-point" cx="'+x(i).toFixed(2)+'" cy="'+y(v).toFixed(2)+'" r="6.5" fill="var(--fch-'+kind+')" stroke="var(--paper)" stroke-width="3"'+guide(kind,label+' · '+b.period,v)+'><title>'+e(label+' · '+b.period+' · '+currency(v))+'</title></circle>';
    }).join('');
  }).join('');
 }
 return '<div class="fch-plot-scroll" tabindex="0" aria-label="'+t('Diagramm horizontal verschiebbar','Grafik yatay kaydırılabilir')+'"><svg class="fch-plot" viewBox="0 0 '+width+' '+height+'" style="--fch-plot-min:'+width+'px" role="group" aria-label="'+t('Einnahmen und Ausgaben nach Zeitraum','Döneme göre gelir ve gider')+'">'+grad+
  grid+'<line class="fch-axis" x1="'+left+'" y1="'+bottom+'" x2="'+right+'" y2="'+bottom+'"/>'+marks+xlabels+
  '<text class="fch-axis-unit" x="'+left+'" y="17">'+e(t('Türkische Lira (₺)','Türk lirası (₺)'))+'</text></svg></div>';
}
export function incomeExpenseChart(s,summary){
 const view=['donut','bar','line'].includes(s.financeChartView)?s.financeChartView:'bar';
 const values=[{label:t('Einnahmen','Gelir'),value:num(summary.income)},{label:t('Ausgaben','Gider'),value:num(summary.expense)}];
 const segmented='<div class="fch-switch" role="group" aria-label="'+t('Diagrammtyp auswählen','Grafik türünü seç')+'">'+
  [['donut',t('Kreis','Halka'),'<circle cx="10" cy="10" r="7" stroke-dasharray="24 9" />'],
   ['bar',t('Balken','Sütun'),'<path d="M4 17V10h4v7M10 17V4h4v13M16 17v-8h4v8"/>'],
   ['line',t('Verlauf','Çizgi'),'<path d="m2 16 5-5 5 2 6-8" />']
  ].map(([v,label,icon])=>'<button type="button" class="fch-switch-button" data-finance-chart-view="'+v+'" aria-pressed="'+String(v===view)+'" title="'+e(label)+'"><svg viewBox="0 0 22 22" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg><span>'+e(label)+'</span></button>').join('')+'</div>';
 const content=view==='donut'?donutViz(values,{id:'cashflow',centerLabel:t('Geldbewegungen','Toplam hareket'),centerAmount:num(summary.income)+num(summary.expense),subtitle:t('Gesamtvolumen','Toplam hacim')})
  :cartesianViz(summary.buckets,{type:view});
 const periods=[...new Set(summary.buckets.map(b=>String(b.period).slice(0,4)))].filter(y=>/^\d{4}$/.test(y));
 const quickYears=periods.length>1?'<div class="fch-year-jump"><span>'+t('Jahr genauer ansehen','Yılı ayrıntılı göster')+':</span>'+periods.map(y=>'<button type="button" data-year="'+e(y)+'">'+e(y)+'</button>').join('')+'</div>':'';
 return '<section id="incomeExpenseViz" class="fch-income-expense" data-chart-root="cashflow" aria-label="'+t('Interaktives Einnahmen-Ausgaben-Diagramm','Etkileşimli gelir gider grafiği')+'">'+
  '<div class="fch-viz-head"><div class="fch-viz-kicker">'+t('FINANZÜBERSICHT','MALİ GÖRÜNÜM')+'</div>'+segmented+'</div>'+
  '<div class="fch-legend-bar"><span class="fch-legend-key fch-legend-income">'+t('Einnahmen','Gelir')+'</span><span class="fch-legend-key fch-legend-expense">'+t('Ausgaben','Gider')+'</span></div>'+
  '<div class="fch-chart-frame">'+content+'</div>'+
  '<div class="fch-inspector" aria-live="polite" data-default-label="'+t('Datenpunkt wählen oder berühren','Veri noktasını seç veya dokun')+'" data-default-value="'+e(currency(num(summary.income)-num(summary.expense)))+'" data-default-extra="'+t('Differenz Einnahmen − Ausgaben','Gelir ve gider farkı')+'"><span data-inspector-label>'+t('Datenpunkt wählen oder berühren','Veri noktasını seç veya dokun')+'</span><strong data-inspector-value>'+e(currency(num(summary.income)-num(summary.expense)))+'</strong><small data-inspector-extra>'+t('Differenz Einnahmen − Ausgaben','Gelir ve gider farkı')+'</small></div>'+
  quickYears+'</section>';
}
export function expenseDonutChart(model){
 const sumCategories=model.categories.reduce((n,[,v])=>n+num(v),0);
 const rest=Math.max(0,num(model.total)-sumCategories);
 const entries=model.categories.map(([label,value])=>({label:tr(label),value}));
 if(rest>0)entries.push({label:t('Weitere / nicht zugeordnet','Diğer / sınıflandırılmamış'),value:rest});
 return '<div class="fch-expense-chart" data-chart-root="expense">'+
  donutViz(entries,{id:'expense',centerLabel:t('Gesamtausgaben','Toplam gider'),centerAmount:num(model.total),subtitle:t('Nach Kategorien','Kategorilere göre'),compact:true})+
  '<div class="fch-inspector" aria-live="polite" data-default-label="'+t('Kategorie auswählen','Kategori seç')+'" data-default-value="'+e(currency(num(model.total)))+'" data-default-extra="'+t('Summe des gewählten Zeitraums','Seçilen dönemin toplamı')+'"><span data-inspector-label>'+t('Kategorie auswählen','Kategori seç')+'</span><strong data-inspector-value>'+e(currency(num(model.total)))+'</strong><small data-inspector-extra>'+t('Summe des gewählten Zeitraums','Seçilen dönemin toplamı')+'</small></div></div>';
}
