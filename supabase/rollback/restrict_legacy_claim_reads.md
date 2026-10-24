# Legacy read restriction: recovery information

Applied in production as `20261024234358_restrict_legacy_claim_reads`.
No application rows changed. The old state is available in the audit schema
fixture: anon SELECT grant and policy `USING(true)` for anon/authenticated.

The exact SQL reversal below would **reopen the confirmed public disclosure**.
It is documentation for a controlled incident recovery decision, not an ordinary
deployment rollback. Do not execute automatically or run it from application code.
Prefer retaining this restriction while investigating any legacy UI problem.

```sql
BEGIN;
SET LOCAL lock_timeout='2s';
ALTER POLICY read_public_ayapark_claims ON public.ayapark_claims
 TO anon, authenticated USING (true);
GRANT SELECT ON public.ayapark_claims TO anon;
COMMIT;
```

No full data restore is required for this permission-only change. Restoring an
older full schema can reintroduce the disclosure; reapply the restriction and
verify anonymous denial and authorized manager access after any such restore.
