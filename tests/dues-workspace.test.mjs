import test from 'node:test';
import assert from 'node:assert/strict';
import {fullDemo} from '../ledger.mjs?v=perf1';
import {prepareV5Demo} from '../finance-demo.mjs?v=perf1';
import {duesV3} from '../v3-ui.mjs?v=dues-redesign-20261103';
import {setLanguage} from '../i18n.mjs?v=5.10.0';

const state=role=>{
 const data=prepareV5Demo(fullDemo());
 data.role=role;
 if(role==='resident')data.capabilities={};
 return {data,mode:'demo',page:'dues',filter:{},period:'2026-10'};
};

test('resident dues provide current and former charges separately without create buttons',()=>{
 setLanguage('de');
 const html=duesV3(state('resident'));
 assert.match(html,/dues-kpis/);
 assert.match(html,/dues-claims/);
 assert.match(html,/dues-payments/);
 assert.match(html,/dues-analysis/);
 assert.match(html,/Öffene|Offener Betrag/);
 assert.match(html,/Früher|früher|früherer Bewohner/);
 assert.doesNotMatch(html,/data-action="monthly_v5"/);
 assert.doesNotMatch(html,/data-action="batch_charge"/);
});

test('authorized managers see distinct monthly-dues and other-charge actions',()=>{
 setLanguage('tr');
 const html=duesV3(state('super'));
 assert.match(html,/data-action="monthly_v5"/);
 assert.match(html,/data-action="batch_charge"/);
 assert.match(html,/data-charge-block="A"/);
 assert.match(html,/data-charge-status="partial"/);
 setLanguage('en');
 const translated=duesV3(state('super'));
 assert.match(translated,/Outstanding balance/);
 assert.match(translated,/Search apartment, person or charge/);
 setLanguage('tr');
});


test('financial indicators remain non-interactive and broken in-page hash routes are absent',()=>{
 setLanguage('de');
 const html=duesV3(state('super'));
 assert.match(html,/class="dues-jump"/);
 for(const id of ['dues-claims','dues-payments','dues-analysis','dues-create'])
  assert.match(html,new RegExp('data-dues-jump="'+id+'"'),'button should target '+id);
 assert.doesNotMatch(html,/href="#dues-/);
 const summary=html.match(/<section class="dues-kpis"[\s\S]*?<\/section>/)?.[0];
 assert.ok(summary,'financial indicators must be visible');
 assert.equal((summary.match(/<(?:button|a)\b|role="button"|tabindex=/g)||[]).length,0,'summary numbers must not be actions');
 assert.match(html,/data-action="monthly_v5"/,'monthly dues action must remain available');
 assert.match(html,/data-action="batch_charge"/,'other charge action must remain available');
 assert.match(html,/<details id="dues-payments"/,'payment accordion must still be available');
 setLanguage('tr');
});


test('unapplied received payments are not mislabeled as overpayments in DE, TR, or EN',()=>{
 const s=state('super');
 s.data.credits=[{id:'test-credit',unit_id:s.data.units[0].id,person_id:s.data.persons?.[0]?.id||'',cents:360000,debt_group:'legacy',void_reason:null}];
 const expected={de:'Noch nicht verrechnete Zahlungen',tr:'Henüz mahsup edilmemiş ödemeler',en:'Unapplied payments'};
 for(const [lang,label] of Object.entries(expected)){
  setLanguage(lang);
  const html=duesV3(s);
  assert.match(html,new RegExp(label));
  assert.doesNotMatch(html,/Fazla ödemeler/);
 }
 setLanguage('tr');
});
