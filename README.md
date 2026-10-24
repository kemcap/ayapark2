# Ayapark 2 · V3.12

Browser app with Supabase Auth and row-level data access.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Owner-only preview: https://ayapark2-v2-private.kemcap.chatgpt.site

V3.12: Relationship start dates can be omitted and then remain unknown. Undated changes and departures use today as the effective date, without changing historical finance records. This behavior is covered by targeted regressions.

V3.12 replaces transfer/date wizards with direct apartment-role editing. Apartments have one **Person hinzufügen / Kişi ekle** action. Choose an existing person with local search or create a person, choose the role, and save. Current assignments have **Bearbeiten / Düzenle** and **Entfernen / Kaldır**. Removal asks for one role-specific reason; free text and dates are optional.

Current assignments use an explicit `active` flag. Multiple owners, tenants, roles and apartments per person are supported without owner-coverage or historical overlap requirements. Removing or changing a role archives the former link; historical charges retain their original link and debtor. Restoring creates a current assignment while preserving its archived predecessor. Person edits never change authentication identities or application memberships. Occupancy is a separate action.

Apartment cards derive the small category label from actually outstanding charges. Ordinary debts have an information panel; unclear debtors, unverified imported claims and candidate unmatched payments are listed separately with actual amounts and evidence. Resident views retain their existing data scope.

Validation: **82 Node tests**, **26 authenticated SQL integration assertions** in rolled-back synthetic fixtures, German/Turkish browser flows and 320/390/1366 px layout checks including dark mode. Hashes of production charges, bank entries, allocations, credits, people, staff memberships, resident access and units remained identical before and after the work. All 20 production apartments remain unchanged.

Apply `supabase/migrations/20261024_simple_active_assignments.sql` after earlier migrations. The one-time backfill preserves each legacy link's current status according to its existing known dates; earlier/future links remain available in history. No historical dates or new roles are invented. Thereafter dates are informational and do not activate/deactivate links. `tests/assignments.sql` documents the isolated integration checks. The old date-transfer tests are replaced with tests for the new explicit-state behavior.

Read AUTH-SETUP.md for remaining mail configuration and real-device verification. Password is the default login method; System is the default appearance. Browser sessions persist until logout, local data removal, or server-side expiry/revocation.

The public distribution contains application code and fictitious test data. Bank statements and resident records remain outside the repository. The browser receives only the public client key; permissions are enforced server-side. Role preview does not change memberships or server authorization.

Run `node --test tests/*.test.mjs`. Application assets are in the repository root. GitHub Pages uses the root distribution and preserves the original application under `old/`.
