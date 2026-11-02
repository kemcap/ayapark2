import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseAmount,monthlyAidatSettings} from '../monthly-aidat-ui.mjs';
import {setLanguage} from '../i18n.mjs?v=5.10.0';

test('amounts are exact integer kuruş and locale format is validated',()=>{
  assert.equal(parseAmount('3600'),360000);
  assert.equal(parseAmount('3.600,12'),360012);
  assert.equal(parseAmount('0,01'),1);
  for(const value of ['1e5','-1','1.0','1 000','12,345','',null]){
    assert.equal(Number.isNaN(parseAmount(value)),true,String(value));
  }
});
test('monthly dues settings explain opt-in and expose valid payer and day choices',()=>{
  for(const [lang,title] of [['de','Monatliche Hausgeldforderungen'],['tr','Aylık aidat otomasyonu'],['en','Automatic monthly dues']]){
    setLanguage(lang);
    const html=monthlyAidatSettings();
    assert.ok(html.includes(title));
    assert.match(html,/type="checkbox" name="enabled"/);
    assert.match(html,/min="1" max="28"/);
    assert.match(html,/value="occupant"/);
    assert.match(html,/value="owner"/);
    assert.match(html,/value="tenant"/);
    assert.match(html,/name="basis_ref"/);
    assert.match(html,/name="amount"/);
  }
});
test('private monthly job, manager gate, forward-only activation and uniqueness guard are documented in schema',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261102173000_automatic_monthly_aidat.sql',import.meta.url),'utf8');
  assert.match(sql,/REVOKE ALL ON FUNCTION ay2_private\.ay13_run_monthly_aidat\(\) FROM PUBLIC, anon, authenticated, service_role/i);
  assert.match(sql,/role='manager'/);
  assert.match(sql,/interval '1 month'/);
  assert.match(sql,/ON CONFLICT\(site_id,unit_id,reference\) DO NOTHING/);
  assert.match(sql,/ambiguous_debtor/);
  assert.match(sql,/CREATE EXTENSION IF NOT EXISTS pg_cron/);
});
