# Ayapark 2 · V3.10

Browser app with Supabase Auth and row-level data access.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Owner-only preview: https://ayapark2-v2-private.kemcap.chatgpt.site

V3.10 adds a guided, bilingual relationship workflow: ownership transfer, owner staying as tenant, tenant replacement, departure, tenant buying the unit, correction with reason, and adding a person with a role from either direction. A review step precedes one atomic save. Existing debts, payments, authentication identities and management privileges stay unchanged.

Ownership/tenancy dates and actual occupancy remain separate. Dated occupancy records take effect on their selected day; future changes do not prematurely mark a unit vacant. Existing and planned relationships remain visible in history. Corrections retain an audit snapshot; overlapping tenants, owner-coverage gaps, stale records and duplicate retries are checked by the server.

Validation: 67 automated regression tests and 16 authenticated SQL assertions passed, plus targeted desktop/mobile browser checks. SQL fixtures are rolled back. Apply `supabase/relationship-workflow.sql` after the existing schema; `tests/relationships.sql` reproduces the integration checks. The V3.9 quality corrections remain included.

Read AUTH-SETUP.md for remaining mail configuration and real-device verification. Password is the default login method; System is the default appearance. Browser sessions persist until logout, local data removal, or server-side expiry/revocation.

The public distribution contains application code and fictitious test data. Bank statements and resident records remain outside the repository. The browser receives only the public client key; permissions are enforced server-side. Role preview does not change memberships or server authorization.

Run `node --test tests/*.test.mjs`. Application assets are in the repository root. GitHub Pages uses the root distribution and preserves the original application under `old/`.
