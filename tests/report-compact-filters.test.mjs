import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reportControls,reportV3,dateFilters} from '../v3-ui.mjs?v=5.9.59';
import {fullDemo} from '../ledger.mjs?v=5.8.1';
import {selectedRange} from '../v3-domain.mjs?v=5.9.26';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.9.28';

const makeState=()=>({mode:'demo',data:fullDemo(),page:'reports',reportFilter:{preset:'all'},filter:{preset:'all'},reportGroup:'year',expenseDistributionYear:'report',financeChartView:'bar'});

test('report period, graph grouping and year appear within one compact toolbar',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const s=makeState(),range=selectedRange(s,'report'),html=reportControls(s,range,'year');
  assert.match(html,/class="report-filter-surface"/);
  assert.equal((html.match(/class="toolbar date-toolbar"/g)||[]).length,1);
  assert.match(html,/data-range="report" data-range-field="preset"/);
  assert.match(html,/id="reportGroup"/);
  assert.match(html,/id="reportYear"/);
  assert(html.indexOf('data-range-field="preset"')<html.indexOf('id="reportGroup"'));
  assert(html.indexOf('id="reportGroup"')<html.indexOf('id="reportYear"'));
  assert.match(html,/id="reportGroup"[\s\S]*?value="year" selected/);
  assert.match(html,/<span class="fine">/);
  const complete=reportV3(s);
  assert.equal((complete.match(/class="report-filter-surface"/g)||[]).length,1);
  assert.equal((complete.match(/id="reportGroup"/g)||[]).length,1);
  assert.equal((complete.match(/id="reportYear"/g)||[]).length,1);
  assert.match(complete,/id="incomeExpenseViz"/);
  assert.match(complete,/id="expenseDistributionYear"/);
 }finally{setLanguage(previous);}
});

test('custom date range retains both date inputs without another filter row',()=>{
 const previous=getLanguage();
 try{
  setLanguage('de');
  const s=makeState();
  s.reportFilter={preset:'custom',from:'2025-01-01',to:'2026-10-31'};
  const rangeBefore=selectedRange(s,'report');
  const html=reportControls(s,rangeBefore,'month');
  assert.equal((html.match(/class="toolbar date-toolbar"/g)||[]).length,1);
  assert.match(html,/data-range-field="from"/);
  assert.match(html,/data-range-field="to"/);
  assert.match(html,/value="2025-01-01"/);
  assert.match(html,/value="2026-10-31"/);
  assert.match(html,/id="reportGroup"[\s\S]*?value="month" selected/);
  assert.deepEqual(selectedRange(s,'report'),rangeBefore);
 }finally{setLanguage(previous);}
});

test('bank account toolbar is unchanged, financial filter CSS stacks on narrower screens',async()=>{
 const s=makeState();
 const html=dateFilters(s,'bank');
 assert.match(html,/class="toolbar date-toolbar"/);
 assert.doesNotMatch(html,/report-filter-field/);
 const css=await readFile(new URL('../report-filters.css',import.meta.url),'utf8');
 const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/\.report-filter-surface \.toolbar\.date-toolbar/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(index,/report-filters\.css\?v=5\.9\.59/);
});
