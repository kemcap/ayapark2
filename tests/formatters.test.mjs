import test from 'node:test';
import assert from 'node:assert/strict';
import {currencyFormatter,dateFormatter} from '../formatters.mjs?v=1';
import {money} from '../core.mjs?v=perf1';
import {date,monthName} from '../ui.mjs?v=perf1';
import {today} from '../v3-domain.mjs?v=perf1';
import {setLanguage} from '../i18n.mjs?v=5.10.0';

test('cached formatters preserve every supported language, currency, zero and null amount',()=>{
 for(const [language,locale] of [['tr','tr-TR'],['de','de-DE'],['en','en-GB']]){
  setLanguage(language);
  for(const currency of ['TRY','EUR','USD'])for(const amount of [null,0,-12345,100,999999999]){
   const expected=amount==null?'—':new Intl.NumberFormat(locale,{style:'currency',currency,currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(amount/100);
   assert.equal(money(amount,currency),expected);
  }
  for(const value of ['2026-01-01','2026-10-31T22:00:00Z','2024-02-29'])assert.equal(date(value),new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(value)));
  assert.equal(date(null),'—');
  assert.equal(monthName('2026-10'),new Intl.DateTimeFormat(locale,{month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date('2026-10-01')));
 }
 setLanguage('tr');
});
test('configuration is reused; values are always formatted afresh, including Istanbul midnight',()=>{
 assert.equal(currencyFormatter('tr-TR','TRY'),currencyFormatter('tr-TR','TRY'));
 assert.equal(dateFormatter('de-DE'),dateFormatter('de-DE'));
 const formatter=dateFormatter('sv-SE','day');
 assert.equal(formatter.format(new Date('2026-10-31T20:59:59Z')),'2026-10-31');
 assert.equal(formatter.format(new Date('2026-10-31T21:00:00Z')),'2026-11-01');
 assert.equal(today(),new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Istanbul'}));
});
test('formatter eviction never changes output or retains a failed constructor',()=>{
 const old=currencyFormatter('en-GB','TRY');
 for(let i=0;i<30;i++)currencyFormatter('en-GB',String.fromCharCode(65+i%26,65+Math.floor(i/26),65));
 const fresh=currencyFormatter('en-GB','TRY');assert.notEqual(old,fresh);assert.equal(fresh.format(-1.23),old.format(-1.23));
 assert.throws(()=>currencyFormatter('en-GB','invalid'));
 assert.equal(currencyFormatter('en-GB','EUR').format(1.23),new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(1.23));
});
