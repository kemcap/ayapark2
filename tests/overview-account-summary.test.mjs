import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {overviewAccountCard,overviewV3,reportV3} from '../v3-ui.mjs?v=5.10.0';
import {fullDemo} from '../ledger.mjs?v=5.10.0';
import {money} from '../core.mjs?v=5.10.0';
import {setLanguage,getLanguage} from '../i18n.mjs?v=5.10.0';
import {financialSeries} from '../v3-domain.mjs?v=5.10.0';

const example={
 summaryBalance:970000,
 summaryOpening:120000,
 opening:120000,
 transactions:[],
 summaryDays:[
  {date:'2025-05-01',income_cents:900000,expense_cents:200000,categories:{Temizlik:200000}},
  {date:'2026-09-02',income_cents:350000,expense_cents:230000,categories:{Havuz:230000}}
 ],
 sourceLastDate:'2026-09-02'
};
test('overview explicitly separates total registered receipts, expenses and net current account balance',()=>{
 const previous=getLanguage();
 try{
  setLanguage('tr');
  const copy=structuredClone(example);
  const html=overviewAccountCard({data:copy});
  assert.match(html,/Site hesabı: gelir ve giderler/);
  assert.match(html,/Kayıtlara göre mevcut hesap bakiyesi/);
  assert.match(html,/Toplam kaydedilen gelirler \(aidat dahil\)/);
  assert.match(html,/Toplam kaydedilen giderler/);
  assert(html.includes(money(970000)));
  assert(html.includes(money(1250000)));
  assert(html.includes(money(430000)));
  assert.match(html,/Gelirler yalnızca aidat olmayabilir/);
  assert.match(html,/href="#reports"/);
  assert.equal(JSON.stringify(copy),JSON.stringify(example));
 }finally{setLanguage(previous);}
});
test('category totals match unfiltered finance report, not an independent bank-balance calculation',()=>{
 const totals=financialSeries(example,{},'year');
 assert.equal(totals.income,1250000);
 assert.equal(totals.expense,430000);
 assert.notEqual(example.summaryBalance,totals.income-totals.expense);
 const previous=getLanguage();
 try{
  setLanguage('de');
  const html=overviewAccountCard({data:example});
  assert.match(html,/Anlagenkonto: Einnahmen und Ausgaben/);
  assert.match(html,/Erfasste Einnahmen insgesamt/);
  assert.match(html,/Erfasste Ausgaben insgesamt/);
  assert.match(html,/Aktueller erfasster Kontostand/);
 }finally{setLanguage(previous);}
});
test('missing summary data never fabricates zero cumulative payments and missing balance is not shown as zero',()=>{
 const previous=getLanguage();
 try{
  setLanguage('tr');
  const html=overviewAccountCard({data:{summaryBalance:null,opening:null,transactions:[],summaryDays:[],sourceLastDate:null}});
  assert.match(html,/Kayıtlara göre mevcut hesap bakiyesi/);
  assert.doesNotMatch(html,/Toplam kaydedilen gelirler/);
  assert.doesNotMatch(html,/Toplam kaydedilen giderler/);
  assert.match(html,/—/);
 }finally{setLanguage(previous);}
});
test('dashboard and finance report retain same understandable bank-balance wording',()=>{
 const previous=getLanguage();
 try{
  setLanguage('tr');
  const d=fullDemo();
  const overview=overviewV3({data:d,mode:'demo'});
  assert.match(overview,/Kayıtlara göre mevcut hesap bakiyesi/);
  assert.match(overview,/Toplam kaydedilen gelirler/);
  assert.match(overview,/Toplam kaydedilen giderler/);
  const report=reportV3({data:d,mode:'demo',reportFilter:{preset:'all'},reportGroup:'year'});
  assert.match(report,/Kayıtlara göre mevcut hesap bakiyesi/);
 }finally{setLanguage(previous);}
});
test('new overview explanatory content is styled and loaded without affecting bank data',async()=>{
 const [css,html,source]=await Promise.all([
  readFile(new URL('../overview-account-summary.css',import.meta.url),'utf8'),
  readFile(new URL('../index.html',import.meta.url),'utf8'),
  readFile(new URL('../v3-ui.mjs?v=5.10.0',import.meta.url),'utf8')
 ]);
 assert.match(css,/\.overview-account-movements/);
 assert.match(css,/@media\(max-width:470px\)/);
 assert.match(html,/overview-account-summary\.css\?v=5\.9\.61/);
 assert.match(source,/overviewAccountCard\(s\)/);
 assert.match(source,/financialSeries\(\{\.\.\.d,summaryDays:days\},\{\},'year'\)/);
});
