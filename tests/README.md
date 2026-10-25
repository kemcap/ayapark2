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

The SQL runner deliberately exits **1** for three reproduced existing defects:

1. Allocation retry after a credit fails before reaching the existing idempotency check.
2. Published reports include reversal pairs in gross income/expense; the live
   financial summary excludes both. Closing cash still agrees. The accounting
   convention must be decided before changing either calculation.
3. An unrelated authenticated allocation request can receive a finance-specific
   validation error before authorization. It does not perform a write, but
   authorization must precede these checks.

Do not mark these tests passing or merge a database change until they are resolved
and reviewed. Frontend unit tests are a separate passing suite.

The existing `read-performance.sql` and `read-performance-benchmark.sql` scripts
temporarily replace policies/functions. They are **not production read-only
diagnostics**, even though they roll back. Run them only on an isolated database.
The scale test also creates synthetic temporary fixtures. This audit did not run
any of these definition-changing scripts against production.

The fixture is a test baseline, not a deployable migration history or a complete
Supabase project. Refresh it deliberately after schema changes, including grants
and identities. Concurrent transactions, mail delivery, PostgREST behavior and
real mobile rendering require separate integration checks.
