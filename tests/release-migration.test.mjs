import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('V4 migration and compatible rollback preserve published data and enforce cash reconciliation',async()=>{
 const db=new PGlite();
 try{
  await db.exec(await readFile(new URL('./sql/schema.sql',import.meta.url),'utf8'));
  await db.exec(`INSERT INTO public.ay2_reports(site_id,period,opening_cents,income_cents,expense_cents,closing_cents,published_by) VALUES('20000000-0000-0000-0000-000000000001','2026-09-01',100,900,300,700,'10000000-0000-0000-0000-000000000001')`);
  const before=(await db.query('select to_jsonb(r) as report from public.ay2_reports r')).rows[0].report;
  await db.exec(await readFile(new URL('../supabase/migrations/20261025073340_v4_finance_release_safety.sql',import.meta.url),'utf8'));
  const after=(await db.query("select to_jsonb(r)-'cash_adjustment_cents' as report,cash_adjustment_cents from public.ay2_reports r")).rows[0];
  assert.deepEqual(after.report,before);assert.equal(Number(after.cash_adjustment_cents),0);
  await db.exec(`INSERT INTO public.ay2_reports(site_id,period,opening_cents,income_cents,expense_cents,closing_cents,cash_adjustment_cents,published_by) VALUES('20000000-0000-0000-0000-000000000001','2026-10-01',100,900,300,750,50,'10000000-0000-0000-0000-000000000001')`);
  const current=(await db.query('select to_jsonb(r) as report from public.ay2_reports r order by period')).rows;
  await assert.rejects(db.exec("UPDATE public.ay2_reports SET closing_cents=99999 WHERE period='2026-10-01'"),/check constraint/);
  await db.exec(await readFile(new URL('../supabase/rollback/v4-finance.sql',import.meta.url),'utf8'));
  assert.deepEqual((await db.query('select to_jsonb(r) as report from public.ay2_reports r order by period')).rows,current);
  // Old publishing behavior remains valid after rollback even for a report with a nonzero adjustment.
  await db.exec(`INSERT INTO public.ay2_settings(site_id,opening_date,opening_cents,initialized) VALUES('20000000-0000-0000-0000-000000000001','2026-01-01',100,true);
   SET ROLE authenticated;SELECT set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',false);
   SELECT public.ay2_command('20000000-0000-0000-0000-000000000001','publish_report','{"period":"2026-10-01"}');RESET ROLE;`);
  const republished=(await db.query("select closing_cents,cash_adjustment_cents from public.ay2_reports where period='2026-10-01'")).rows[0];
  assert.equal(Number(republished.closing_cents),100);assert.equal(Number(republished.cash_adjustment_cents),0);
 }finally{await db.close();}
});
