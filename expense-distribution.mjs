import {financialSeries,buildSummaryDays} from './v3-domain.mjs?v=5.10.0';

// The year picker is local to the expense-distribution card.
// 'report' inherits the page date range; 'all' and YYYY override only this card.
export function expenseDistributionModel(data,reportRange={},selection='report'){
 const source={...data,summaryDays:data.summaryDays||buildSummaryDays(data)};
 const years=[...new Set(source.summaryDays.map(r=>String(r.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b.localeCompare(a));
 const selected=selection==='all'||selection==='report'||years.includes(selection)?selection:'report';
 const range=selected==='report'?reportRange:selected==='all'?{}:{from:selected+'-01-01',to:selected+'-12-31'};
 const summary=financialSeries(source,range,'year');
 const categories=summary.categories.filter(([,cents])=>cents>0)
  .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const total=Number(summary.expense)||0;
 return {years,selected,range,total,categories,
  maximum:Math.max(1,...categories.map(([,v])=>v))};
}
