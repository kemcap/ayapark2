# Reproducible audit tests

Use Node 24. Install the pinned test dependency with `npm ci --ignore-scripts`.
The browser application still has no build step or runtime npm dependency.

```sh
npm test
npm run test:sql
npm run bench:audit
git worktree add --detach ../ayapark-baseline deef766bbc22f2aa7b7bb4d6bf8b2ffc64e74c4c
node tests/benchmark-overview.mjs ../ayapark-baseline
```

`test:sql` creates an in-memory PGlite PostgreSQL instance. It accepts no database
URL or credentials. The schema fixture reconstructs the 33 public application
tables, 52 application functions, constraints, indexes, policies and triggers
observed on 25 October 2026 before the legacy-read hardening. The legacy-access
suite applies the real restriction migration inside its rolled-back fixture transaction. Auth contains ID/email/metadata test placeholders,
not Supabase Auth accounts. No production rows are included. All fixture users
use synthetic IDs and `example.invalid` addresses.

Historical findings from the pre-V4 fixture (resolved by the V4 safety migration,
which the runner now applies before the tests):

1. Allocation retry after a credit fails before reaching the existing idempotency check.
2. Published reports include reversal pairs in gross income/expense; the live
   financial summary excludes both. Closing cash still agrees. The accounting
   convention must be decided before changing either calculation.
3. An unrelated authenticated allocation request can receive a finance-specific
   validation error before authorization. It does not perform a write, but
   authorization must precede these checks.

Current checks: `npm run test:sql` passes 120 assertions. `npm run test:v5:sql`
passes 50 additional assertions for V5. Both run in isolated PGlite and have no
production credentials. They do not prove mail delivery, concurrent PostgREST
transactions, or a complete Supabase project restore. See AUDIT-20261026.md for
the current UI audit, browser verification limits and separate release gate.

The existing `read-performance.sql` and `read-performance-benchmark.sql` scripts
temporarily replace policies/functions. They are **not production read-only
diagnostics**, even though they roll back. Run them only on an isolated database.
The scale test also creates synthetic temporary fixtures. This audit did not run
any of these definition-changing scripts against production.

The fixture is a test baseline, not a deployable migration history or a complete
Supabase project. Refresh it deliberately after schema changes, including grants
and identities. Concurrent transactions, mail delivery, PostgREST behavior and
real mobile rendering require separate integration checks.

## Phase 2 capability boundary matrix

`npm run test:roles:sql` executes 369 assertions in an in-memory database with
synthetic identities, no connection URL and no production credentials. It tests
all 16 combinations of the four existing flags for deputy/auditor membership,
site isolation, forged user metadata, stale grants and membership revocation.
This verifies existing boundaries, not implementation of the five target task
permissions. See `docs/PHASE-2-ROLES-AUDIT.md` for gaps and baseline failures.

`npm run test:corrections:sql` applies the prepared correction migration only to
in-memory synthetic PostgreSQL, including function-body drift rejection, ACL/OID
preservation, staff allocation and Superadmin correction/audit positives. The
ordinary SQL audit and V5 runners apply this candidate too. No production schema
or credentials are used.

## Performance audit, 1 November 2026

Use an immutable baseline, never the moving live checkout:

```sh
git worktree add --detach ../ayapark-performance-baseline b8a01e18c03c41c05f6d89e7f59ad672d77b7e07
npm ci --ignore-scripts
npm run bench:performance -- ../ayapark-performance-baseline
npm run bench:load -- ../ayapark-performance-baseline
npx playwright install chromium
npm run test:performance:browser -- ../ayapark-performance-baseline
```

`bench:performance` compares identical HTML across 180 synthetic cases and reports
seven measured CPU samples after two warmups. It excludes DOM and network.
`bench:load` compares API results and request multisets with an artificial 25 ms
per-request delay. Those numbers demonstrate scheduling only, not live latency.

The browser test serves both checkouts itself on a random loopback port and blocks
all external requests. It exercises the real demo app at 390 and 1440 px, all three
roles and languages, block filters, apartment dialogs, and navigation. The narrow
viewport uses 4x CPU throttling, not a real phone. It compares rendered HTML and
apartment screenshots against the baseline, checks retained card DOM nodes,
counts duplicate module requests and forced layouts, and enforces loose 150/200 ms
median interaction budgets on the small demo. CI runs the current checkout alone;
the immutable baseline comparison is a separate audit command. Configure
`CHROMIUM_PATH` and `CHROMIUM_ARGS` (JSON array) to use a preinstalled browser;
`PERF_OUTPUT` and `PERF_SCREENSHOT_DIR` optionally save results and images.

No performance test connects to production, authenticates a real account, or
submits a live form. See `docs/PERFORMANCE-AUDIT-20261101.md` and the raw JSON
in `tests/evidence/performance-20261101/` for measurements and limitations.
