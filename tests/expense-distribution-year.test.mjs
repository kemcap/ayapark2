import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expenseDistributionModel} from '../expense-distribution.mjs?v=5.9.57';
import {expenseDistributionPanel} from '../expense-distribution-ui.mjs?v=5.9.57';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {reportV3} from '../v3-ui.mjs?v=5.9.57';
import {selectedRange} from '../v3-domain.mjs?v=5.9.26';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.9.28';

const rows=[
 {date:'2024-02-15',income_cents:0,expense_cents:130000,categories:{Temizlik:80000,Peyzaj:50000}},
 {date:'2025-07-11',income_cents:0,expense_cents:240000,categories:{Havuz:200000,Temizlik:40000}},
 {date:'2026-03-22',income_cents:0,expense_cents:350000,categories:{Elektrik:250000,Temizlik:100000}}
];
const d={summaryDays:rows,transactions:[]};
test('expense year filter offers actual source years newest-first and each year is isolated',()=>{
 const year=expenseDistributionModel(d,{from:'2026-01-01',to:'2026-12-31'},'2025');
 assert.deepEqual(year.years,['2026','2025','2024']);
 assert.equal(year.selected,'2025');
 assert.deepEqual(year.range,{from:'2025-01-01',to:'2025-12-31'});
 assert.equal(year.total,240000);
 assert.deepEqual(year.categories,[['Havuz',200000],['Temizlik',40000]]);
});

test('default report selection follows global range; all years is an explicit separate option',()=>{
 const range={from:'2026-01-01',to:'2026-12-31'};
 assert.equal(expenseDistributionModel(d,range,'report').total,350000);
 assert.equal(expenseDistributionModel(d,range,'all').total,720000);
 assert.equal(expenseDistributionModel(d,range,'2024').total,130000);
 assert.equal(expenseDistributionModel(d,range,'2020').selected,'report');
 assert.equal(expenseDistributionModel(d,{from:'2026-01-01',to:'2026-12-31'},'report').categories[0][0],'Elektrik');
});

test('year filter updates category labels and local total without mutating report range',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const s={data:d,expenseDistributionYear:'2025'};
  const reportRange={from:'2026-01-01',to:'2026-12-31'};
  const before=JSON.stringify(reportRange);
  const html=expenseDistributionPanel(s,reportRange);
  assert.match(html,/<select id="expenseDistributionYear"/);
  assert.match(html,/<option value="2025" selected>2025<\/option>/);
  assert.match(html,/Berichtszeitraum/);
  assert.match(html,/Alle Jahre/);
  assert.match(html,/Nur die Ausgabenverteilung|Dieser Filter verändert nur die Ausgabenverteilung/);
  assert.match(html,/Havuz|Pool/);
  assert.match(html,/83,3 %/);
  assert(!html.includes('Elektrik'));
  assert.equal(JSON.stringify(reportRange),before);
  assert.equal(s.expenseDistributionYear,'2025');
 }finally{setLanguage(previous);}
});

test('expense-only filter is embedded inside financial report and preserves page date filtering',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const s={data:fullDemo(),mode:'demo',page:'reports',reportFilter:{preset:'all'},expenseDistributionYear:'report',reportGroup:'year'};
  const rangeBefore=selectedRange(s,'report');
  const html=reportV3(s);
  assert.match(html,/id="reportYear"/);
  assert.match(html,/id="expenseDistributionYear"/);
  assert.match(html,/id="expenseDistributionPanel"/);
  assert.match(html,/id="expenseDistributionResults"/);
  assert.deepEqual(selectedRange(s,'report'),rangeBefore);
 }finally{setLanguage(previous);}
});

test('no matching expense years present accessible zero-state, not fabricated amounts',()=>{
 const previous=getLanguage();
 try{
  setLanguage('tr');
  const s={data:d,expenseDistributionYear:'2024'};
  assert.match(expenseDistributionPanel(s,{}),/2024/);
  const html=expenseDistributionPanel({data:{summaryDays:[],transactions:[]},expenseDistributionYear:'report'},{});
  assert.match(html,/Bu döneme ait kayıtlı gider yok/);
  assert.match(html,/id="expenseDistributionYear"/);
 }finally{setLanguage(previous);}
});

test('category display escapes source values and year selection is a local DOM update',async()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const result=expenseDistributionPanel({data:{summaryDays:[{date:'2026-01-01',expense_cents:1000,income_cents:0,categories:{'<img src=x onerror=alert(1)>':1000}}],transactions:[]},expenseDistributionYear:'report'},{});
  assert(!result.includes('<img src=x'));
  assert(result.includes('&lt;img'));
 }finally{setLanguage(previous);}
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.match(app,/id==='expenseDistributionYear'/);
 assert.match(app,/panel\.outerHTML=expenseDistributionPanel\(state,selectedRange\(state,'report'\)\)/);
 const css=await readFile(new URL('../expense-distribution.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/focus-visible/);
 const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/expense-distribution\.css\?v=5\.9\.57/);
});
