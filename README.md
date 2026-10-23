# Ayapark 2 · V3.9

Browser app with Supabase Auth and row-level data access.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Owner-only preview: https://ayapark2-v2-private.kemcap.chatgpt.site

V3.9 fixes visibility of a resident's own debts after departure, validates import direction and apartment hints, preserves charge periods without immediate person assignment, corrects scheduled announcement counts and time-zone comparisons, validates report/bank ranges before calculations or export, and translates provider categories in German.

Validation: 58 automated regression tests and 72 extended audit checks passed. Seven authenticated SQL assertions for charge periods passed in a rolled-back fixture. The server-side period correction was already installed and was verified rather than replaced. `supabase/charge-period.sql` preserves that correction in the source; `tests/charge-period.sql` reproduces its checks.

Read AUTH-SETUP.md for remaining mail configuration and real-device verification. Password is the default login method; System is the default appearance. Browser sessions persist until logout, local data removal, or server-side expiry/revocation.

The public distribution contains application code and fictitious test data. Bank statements and resident records remain outside the repository. The browser receives only the public client key; permissions are enforced server-side. Role preview does not change memberships or server authorization.

Run `node --test tests/*.test.mjs`. The private Site source keeps assets in `dist/`. GitHub Pages uses the root distribution and preserves the original application under `old/`.
