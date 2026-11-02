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
