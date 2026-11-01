# AYA PARK 2 – Performance audit, 1 November 2026

Baseline: `b8a01e18c03c41c05f6d89e7f59ad672d77b7e07` (main at audit start).
Candidate: branch `perf/mobile-audit-20261101`. No deployment or database migration
is included in this change. All numbers below are measured, unless explicitly
identified as a simulation or cumulative server statistic.

## Scope and safeguards

Reviewed the active module graph, initial authenticated load, A/B filtering,
apartment dialogs, page navigation, ledger calculation indexes, bank pagination,
search, reports, background refresh, recurring animation and service worker.
No production forms were submitted, no account was created and no financial,
person, permission or other application rows were written. Production database
access consisted of project metadata and SELECTs against pg_stat_statements.
Existing source PDFs were not needed and were neither imported nor modified.

Every stylesheet, logo, icon and other asset remains byte-for-byte unchanged.
Existing roles, Turkish/German/English, endpoints and authorization checks remain.
Application financial values are not cached across renders or sessions. No RLS,
index, function, region or schema changes were made.

## Findings and changes

1. **Formatting on every cell.** `money`, `date`, `monthName` and Istanbul's current
   day repeatedly constructed Intl formatters. `formatters.mjs` now caches only
   immutable formatter configurations, keyed by locale/currency/format; each cache
   is capped at 24 entries. Actual dates and amounts are always formatted afresh.
   Currency symbols, rounding, nulls, and timezone behavior remain identical.
2. **Repeated normalization during payment suggestions.** Names, apartment codes,
   aliases and repeated descriptions were lowercased and normalized repeatedly for
   every transaction/card. Normalized strings now share the existing synchronous
   render index. `finally` discards it after each render, including failures and
   nested projections. No suggestions, permissions or balances are persisted.
3. **Quadratic reversal scans.** `buildSummaryDays` searched all transactions for
   every transaction. It now constructs a reversal-ID Set once, then performs the
   same exclusion/grouping rules in a linear pass. Transfers, reversal pairs,
   amounts, categories and insertion order are preserved.
4. **Network waterfalls.** Draft, contact, task and claim-hold workspaces waited
   unnecessarily for the main workspace and for one another. They now start in
   the existing parallel load group after site and role identification. Request
   count, per-role conditions, result projection, required/optional failure
   handling and session-generation rejection remain unchanged. There are no new
   endpoints or speculative data reads. Peak concurrent reads increase modestly;
   query counts do not increase.
5. **Duplicate modules.** The active graph loaded `api.mjs`, `people-ui.mjs` and
   `v3-ui.mjs` under conflicting cache keys. Canonical import keys now give each
   module one identity. Many one-line import changes are cache invalidation for
   this fix and the changed dependencies; they are not rewrites of those modules.
6. **Layout thrashing every three seconds.** The apartment affordance interleaved
   class writes with an `offsetWidth` read for each card. Writes and the restart
   read are now batched. The 700 ms animation, 3 s interval, reduced-motion support,
   and hidden-page handling are retained. One shared cleanup timer replaces up to
   20 individual timers.

### Confirmed existing behavior retained

A/B buttons and occupancy/debt filters change existing DOM visibility; they do not
reload the API or regenerate the page. Apartment dialogs render locally. Page
navigation replaces `#content`; changing to incremental DOM patching would be a
larger, riskier refactor without evidence that it is necessary for this 20-unit
app. Connected navigation intentionally records an existing `page_view` telemetry
RPC; that is not a workspace fetch and was not removed. Background refresh reads
again at the existing cadence (90 seconds / guarded resume), and skips open
editors, dialogs, hidden documents and busy operations. All refresh semantics
were kept rather than introducing potentially stale financial/permission caches.
The service worker remains network-only and does not cache account responses.
Bank pagination and on-demand PDF/XLSX parser loading were already implemented.

## Measured results

### Browser interactions

Chromium 153.0.8010.0, synthetic production demo, local HTTP server. All external
requests blocked. Median handler/event processing plus a forced style/layout
flush; **not end-to-end phone latency or production network measurements**.
The 390 px viewport uses 4x CPU throttling; 1440 px uses 1x. Samples span all three
languages and roles. Raw samples are in `tests/evidence/performance-20261101/browser.json`.

| Operation | 390 px before | 390 px after | 1440 px before | 1440 px after |
| --- | ---: | ---: | ---: | ---: |
| Navigation | 56.4 ms | 25.1 ms | 14.8 ms | 7.7 ms |
| Open apartment, small demo | 31.5 ms | 30.8 ms | 9.6 ms | 7.0 ms |
| A/B toggle | 33.6 ms | 35.6 ms | 8.1 ms | 7.3 ms |

Navigation improves about 55% in the narrow emulation. The small-demo apartment
and A/B narrow-view differences are within run noise; **no material speedup is
claimed for those two cases**. Retained-node assertions prove the A/B path still
does not replace card DOM. Extra module requests: **3 → 0**. Forced layouts in one
20-card affordance tick: **21 → 1** in the recorded run (test budget permits 2
for renderer timing variability).

All **117 rendered-content comparisons** and **2 pixel-identical apartment-page
PNG comparisons** passed. No browser exceptions or external requests occurred.
No screenshots or resident data are stored in the repository. Browser tests also
exercise bank and person navigation; CPU tests cover settings and the other
renderers. They are not exhaustive tests of every administrative mutation flow.

### CPU / identical HTML generation

Node v24.22.1, seven measured samples after two warmups, alternating before/after
order on identical input. 180 cases: small demo and a synthetic fixture with 1,729
bank entries plus 1,200 extra charges/allocations, three languages, three roles,
and eligible pages. Every output compared byte-for-byte equal before timing.
Representative **Turkish Superadmin scaled fixture**, medians:

| Renderer | Before | After |
| --- | ---: | ---: |
| Overview | 500.03 ms | 127.01 ms |
| Apartments | 355.70 ms | 86.75 ms |
| Apartment detail | 237.38 ms | 12.77 ms |
| Dues | 379.70 ms | 42.35 ms |
| Bank page | 6.04 ms | 0.47 ms |
| Reports | 2.14 ms | 0.89 ms |
| People | 2.79 ms | 0.35 ms |

CPU results exclude DOM/network. Not every renderer benefits: settings remains
about 0.2 ms (noise); no universal percentage improvement is claimed. Fixture
size is a scaling test, not a statement of the current production row count.
Raw per-role/language/page results: `render-cpu.json` in the same evidence folder.

### Load scheduling model

Six measured samples after a warmup, **artificial 25 ms delay per request**.
Identical final objects and identical request multisets are asserted each time.
These are controlled scheduling measurements, **not measured live login times**.

| Server role | Requests, unchanged | Before | After |
| --- | ---: | ---: | ---: |
| manager | 16 | 151.90 ms | 101.33 ms |
| deputy | 15 | 177.51 ms | 126.65 ms |
| resident | 15 | 177.03 ms | 126.60 ms |

The improvement removes two serial request phases. Production gain depends on
network latency, database contention and the main workspace's execution time.

### Production database, read-only diagnostic

Project status: `ACTIVE_HEALTHY`, PostgreSQL 17, region `ap-southeast-1` (Singapore).
Cumulative pg_stat_statements means at the start of the audit:

| RPC | Calls | Mean SQL execution time |
| --- | ---: | ---: |
| ay5_workspace | 1,325 | 179.48 ms |
| ay3_review_state | 1,422 | 70.10 ms |
| ay3_financial_summary | 1,522 | 53.07 ms |
| ay3_staff_directory | 1,170 | 15.21 ms |
| ay3_draft_workspace | 518 | 8.44 ms |
| ay6_task_workspace | 425 | 9.58 ms |
| ay3_contact_workspace | 488 | 3.93 ms |
| ay6_claim_hold_workspace | 438 | 3.34 ms |

These aggregate historical statistics mix roles and prior code/data states; they
are not a controlled SQL benchmark and are not before/after evidence. No query
statistics were reset and no production workload or EXPLAIN ANALYZE impersonation
was run. Existing database optimizations in `PERFORMANCE.md` were reviewed rather
than reapplied. No schema tuning is justified solely by these cumulative values.

## Regression checks and existing test repairs

- Baseline suite: **397/405 passed**, eight failures before any change.
- Final suite: **414/414 passed**. Added nine tests cover formatter equivalence,
  Istanbul midnight, eviction, scoped normalization and cache disposal, reversal
  summary equivalence, parallel workspace starts, session switches and failures.
- The module-identity failure was a real production graph issue, fixed in source.
- Three login-harness failures came from missing mocks for existing app-event and
  person-login hooks. Completed the mocks; did not alter login behavior.
- Four overview tests expected the superseded all-time display / old stylesheet
  version. Updated them to the existing rolling-12-month contract, including an
  out-of-range fixture and unchanged current account balance. No UI or accounting
  behavior changed to make these tests pass.
- Existing isolated PGlite SQL suites: **120 + 50 assertions passed**. Synthetic
  identities only, no production credentials.
- All production stylesheets/assets unchanged; no Supabase files changed.
- `git diff --check`, syntax checks, production module graph and local entrypoint
  references pass. A pinned Playwright dependency and browser CI workflow make
  structural/performance regressions repeatable. The CI current-checkout test
  uses loose budgets, not fragile single-digit millisecond thresholds.

Reproduction commands and environment overrides: `tests/README.md`.

## Remaining limits and safe follow-up

1. Production sign-in, live payload transfer and real Android/iOS devices were not
   measured. A 4x desktop CPU throttle cannot reproduce a particular phone, radio,
   browser, or thermal state. Record those separately if users still see delays.
2. Singapore hosting can add latency for Turkey/Germany. No region move was
   attempted; it would require a separate migration and authentication test plan.
3. The workspace still loads the current full authorized financial dataset, and
   navigation still renders each selected page. At much larger scale, server-side
   pagination/summary APIs and targeted page loading deserve a separate change.
   Current safe optimizations avoid changing data scope or stale-balance behavior.
4. More concurrent independent reads can increase instantaneous DB contention.
   If real load regresses under concurrency, revert the `api.mjs` scheduling hunk
   independently; formatter/render/layout improvements remain useful.
5. This audit does not prove every existing production permission policy or every
   administrative mutation. Those were preserved, not redesigned. No new access
   grants or persistent data caches were introduced.
6. Existing UI/CSS complexity still dominates some A/B layout work. An unmeasured
   visual/layout refactor was deliberately avoided to preserve the exact design.

## Rollback and release

Review and merge the focused PR to release through the repository's normal Pages
process. No live deployment is implied by local or branch verification. Revert the
candidate commit to undo the optimization; there is no database rollback or data
restoration. Keep import keys consistent when reverting or shipping follow-ups.
