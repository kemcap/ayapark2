import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {donutModel,donutViz,cartesianViz,incomeExpenseChart,expenseDonutChart} from '../finance-charts.mjs?v=5.10.0';
import {expenseDistributionModel} from '../expense-distribution.mjs?v=5.10.0';
import {expenseDistributionPanel} from '../expense-distribution-ui.mjs?v=5.10.0';
import {reportV3} from '../v3-ui.mjs?v=5.10.0';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.10.0';
const summary={income:2400000,expense:1500000,buckets:[
 {period:'2025',income:800000,expense:300000},
 {period:'2026',income:1600000,expense:1200000}
]};
const data={summaryDays:[
 {date:'2025-02-02',income_cents:800000,expense_cents:300000,categories:{Temizlik:200000,Havuz:100000}},
 {date:'2026-02-03',income_cents:1600000,expense_cents:1200000,categories:{Temizlik:600000,Havuz:600000}}
],transactions:[]};

test('donut uses exact integer amounts and nonnegative percentages without rewriting ledger data',()=>{
 const entries=[{label:'Electricity',value:150000},{label:'Cleaning',value:50000}];
 const snapshot=JSON.stringify(entries),m=donutModel(entries);
 assert.equal(m.total,200000);
 assert.equal(m.segments[0].percent,75);
 assert.equal(m.segments[1].percent,25);
 const html=donutViz(entries,{id:'test',centerLabel:'Total',centerAmount:200000});
 assert.match(html,/stroke-dasharray="75\.00000 25\.00000"/);
 assert.match(html,/stroke-dashoffset="-75\.00000"/);
 assert.match(html,/tabindex="0"/);
 assert.match(html,/data-chart-label="Electricity"/);
 assert.equal(JSON.stringify(entries),snapshot);
});

test('pie chart for income and expenses toggles view without changing summary or year filter',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  for(const view of ['donut','bar','line']){
   const s={financeChartView:view,reportFilter:{preset:'all'},expenseDistributionYear:'2025'};
   const copy=JSON.stringify(s),html=incomeExpenseChart(s,summary);
   assert.match(html,new RegExp('data-finance-chart-view="'+view+'" aria-pressed="true"'));
   assert.match(html,/data-finance-chart-view="donut"/);
   assert.match(html,/data-finance-chart-view="bar"/);
   assert.match(html,/data-finance-chart-view="line"/);
   assert.match(html,/data-chart-root="cashflow"/);
   assert.match(html,/data-inspector-label/);
   assert.match(html,/data-year="2025"/);
   assert.equal(JSON.stringify(s),copy);
  }
  assert.match(incomeExpenseChart({financeChartView:'donut'},summary),/class="fch-donut-svg"/);
  assert.match(incomeExpenseChart({financeChartView:'bar'},summary),/class="fch-bar fch-income"/);
  assert.match(incomeExpenseChart({financeChartView:'line'},summary),/class="fch-point fch-income-point"/);
 }finally{setLanguage(previous);}
});

test('bar and line chart use calendar periods and preserve both financial series',()=>{
 const bars=cartesianViz(summary.buckets,{type:'bar'});
 const line=cartesianViz(summary.buckets,{type:'line'});
 assert.match(bars,/2025/);
 assert.match(bars,/2026/);
 assert.match(bars,/data-chart-label="Einnahmen · 2025"|data-chart-label="Gelir · 2025"/);
 assert.match(bars,/data-chart-label="Ausgaben · 2026"|data-chart-label="Gider · 2026"/);
 assert.match(line,/class="fch-line fch-income-line"/);
 assert.match(line,/class="fch-line fch-expense-line"/);
 assert.match(line,/pathLength="1"/);
 assert.match(line,/class="fch-area fch-income-area"/);
 assert.equal((line.match(/class="fch-point /g)||[]).length,4);
 assert.match(cartesianViz([]),/keine Daten|veri yok/i);
});

test('expense category donut respects the independent year while report overview remains intact',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const range={from:'2026-01-01',to:'2026-12-31'};
  const m=expenseDistributionModel(data,range,'2025');
  assert.equal(m.total,300000);
  assert.deepEqual(m.categories,[['Temizlik',200000],['Havuz',100000]]);
  const html=expenseDistributionPanel({data,expenseDistributionYear:'2025'},range);
  assert.match(html,/id="expenseDistributionYear"/);
  assert.match(html,/fch-expense-chart/);
  assert.match(html,/fch-donut-arc/);
  assert.match(html,/66,7 %/);
  assert.match(html,/fch-expense-details/);
  assert(!html.includes('2026-02-03'));
  assert.deepEqual(range,{from:'2026-01-01',to:'2026-12-31'});
 }finally{setLanguage(previous);}
});

test('income charts and expense donut both appear inside the actual finance report',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const s={data:fullDemo(),mode:'demo',reportFilter:{preset:'all'},financeChartView:'line',expenseDistributionYear:'report'};
  const html=reportV3(s);
  assert.match(html,/id="incomeExpenseViz"/);
  assert.match(html,/id="expenseDistributionPanel"/);
  assert.match(html,/class="fch-line fch-income-line"/);
  assert.match(html,/id="expenseDistributionYear"/);
  assert.match(html,/id="reportGroup"/);
  assert.match(html,/id="reportYear"/);
 }finally{setLanguage(previous);}
});

test('empty datasets render safe empty state, encoded labels and still expose chosen graph controls',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  assert.match(incomeExpenseChart({financeChartView:'donut'},{income:0,expense:0,buckets:[]}),/fch-empty/);
  const mal='<img src=x onerror="alert(1)">';
  const svg=donutViz([{label:mal,value:100}],{id:'category',centerLabel:'Test',centerAmount:100});
  assert(!svg.includes(mal));
  assert(svg.includes('&lt;img'));
  assert.match(expenseDonutChart({total:0,categories:[]}),/fch-empty/);
 }finally{setLanguage(previous);}
});

test('UI uses one chart module, local re-render, accessible keyboard and reduced motion styles',async()=>{
 const files=['../v3-ui.mjs?v=5.10.0','../app.mjs?v=5.10.0','../expense-distribution-ui.mjs?v=5.10.0','../finance-charts.css','../index.html'];
 const [view,app,expense,css,index]=await Promise.all(files.map(f=>readFile(new URL(f,import.meta.url),'utf8')));
 assert.match(view,/incomeExpenseChart\(s,summary\)/);
 assert.match(expense,/expenseDonutChart\(model\)/);
 assert.match(app,/state\.financeChartView=view/);
 assert.match(app,/current\.outerHTML=incomeExpenseChart\(state,summary\)/);
 assert.match(app,/function inspectFinanceChart/);
 assert.match(app,/data-finance-chart-view/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(index,/finance-charts\.css\?v=[\d.]+/);
});
