# Ayapark 2 · V4.0 Entwicklungsvorschau

Diese Branch ist **nicht zur Produktivveröffentlichung freigegeben**. Produktion bleibt V3.15. Die separate V4-Vorschau verwendet Beispieldaten; Live-API und Recovery sind gesperrt.

- [UI/UX-Audit, Verbesserungen und Freigabevorschläge](UI-UX-AUDIT-V4.md)
- [Release-Gates und Rollback](V4-RELEASE-PLAN.md)
- [Übernommener Datenbank-Audit](AUDIT-20261025.md)
- Tests: `npm test`, `npm run test:sql`, `npm run qa:prepare`. Die drei dokumentierten SQL-Baselinefehler bleiben rot.

---

# Ayapark 2 · V3.15

Browser app with Supabase Auth and row-level data access.

V3.15: Apartment history clearly labels former owners, tenants and representatives; outstanding debts appear next to the linked former role for finance-authorized users. A9 database corrections are logged; existing source hint B-9 (EK) is retained in the audit record for verification.


V3.14.2: B block appears left of A; each block uses two apartment-card columns in ascending number order. The overview's apartment panel is wider while the next-tasks panel is narrower, with responsive stacking for smaller screens. No database records changed.

V3.14: Appearance settings add the **Ayapark 2** palette, inspired by the uploaded building photo: meadow green, sky blue and caramel timber. Six looks support normal/high contrast in light/dark modes. A switch next to the palette improves text, inputs, buttons, cards, navigation and focus indicators without removing each palette's identity. The preview and full reset occupy separate desktop columns and stack on mobile. Reset restores all nine preferences, including Turkish language and automatic theme. Existing explicit language choices remain intact until reset. Personal settings remain owner-scoped; the only database change expands the palette validator allowlist.

Validation: 110 Node regression tests (including upstream first-password/recovery tests); 12 high-contrast palette/mode combinations checked for text, button, navigation and boundary contrast; new palette save tested in a rolled-back transaction; desktop and 320px mobile with very large text checked in the browser. No production person, finance, role or SMTP settings were changed by this appearance update.

V3.13.5: In **Verwaltungsrechte / Yönetim yetkileri**, the Superadmin can remove another management member after entering a reason and confirming the action. This revokes the site staff membership and supplementary capabilities, preserving the Supabase Auth user account, apartment relationships, accounting records, and audit history. Removing your own membership or the final manager is blocked by the database. Migration: `20261024194000_remove_management_member.sql`.

V3.13.4: Replaces the upper-left generic building icon with a 3 KB 96x96 WebP photo thumbnail; adds a recovery OTP fallback to the reset form and email template for cases where a reset link expires or redirects incorrectly. The published Supabase email template and Auth URL allowlist must still be configured in the dashboard, and the separate GPT preview is not automatically synchronized.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Owner-only preview: https://ayapark2-v2-private.kemcap.chatgpt.site

V3.13 adds compact, collapsed clarification tasks with direct actions, multi-selection and audited review receipts. Reviewing never creates payments, assigns debtors or confirms imported charges. Mandatory missing information must be corrected; receipts become stale when source records change. The selected record is preserved in review history.

V3.13.2 extends each non-classic palette to the page, cards/dialogs, sidebar, header and neutral surfaces in light and dark mode. Classic retains its existing surfaces. Device reduced-motion and high-contrast overrides remain active.

V3.13.1 labels the original palette as Classic (default), adds a palette-only reset, removes the manual animation setting in favor of the device preference, and explains amount privacy.

Personal appearance is under Settings for all roles: five CSS palettes, five CSS preloaders, font size, contrast, spacing, automatic device motion preference, amount privacy and language. The header retains only the existing automatic/light/dark switch. Preferences are owner-scoped in Supabase, cached locally, and pending offline changes retry on the next session. Indicators appear after 300 ms and add no network requests. Actual load completion controls dismissal.

Access setup supports existing people and new external contacts without apartment assignments for management. Email validation is corrected; provisioning reports specific authored errors. Legacy resident person foreign keys are not repointed or deleted. Staff names/email and localized rights replace UUID fragments/internal role names. Audit is loaded on demand with true backend pagination (10/50/100, default 10). Bookkeeping setup is collapsed under Bookkeeping details.

Performance: independent workspace, financial summary, review and staff requests run concurrently. Audit no longer travels with every workspace refresh; person search is debounced. A synchronous rendering index shares payment allocation sums without caching across mutations. A synthetic 500-charge/5,000-allocation benchmark gave identical totals at about 294 ms without indexing and 2 ms with indexing; this is not an end-to-end production speed claim.

Validation: 94 Node tests and 54 SQL assertions (28 comfort/access plus 26 assignment regressions), synthetic fixtures rolled back; no real auth accounts created or emails sent. Browser checks cover German/Turkish, role-specific settings, direct external-access fields, review selection/history, dark mode and 320px layout with large text. Real email delivery and cross-device behavior remain manual acceptance checks.

V3.12 replaces transfer/date wizards with direct apartment-role editing. Apartments have one **Person hinzufügen / Kişi ekle** action. Choose an existing person with local search or create a person, choose the role, and save. Current assignments have **Bearbeiten / Düzenle** and **Entfernen / Kaldır**. Removal asks for one role-specific reason; free text and dates are optional.

Current assignments use an explicit `active` flag. Multiple owners, tenants, roles and apartments per person are supported without owner-coverage or historical overlap requirements. Removing or changing a role archives the former link; historical charges retain their original link and debtor. Restoring creates a current assignment while preserving its archived predecessor. Person edits never change authentication identities or application memberships. Occupancy is a separate action.

Apartment cards derive the small category label from actually outstanding charges. Ordinary debts have an information panel; unclear debtors, unverified imported claims and candidate unmatched payments are listed separately with actual amounts and evidence. Resident views retain their existing data scope.

Validation: **82 Node tests**, **26 authenticated SQL integration assertions** in rolled-back synthetic fixtures, German/Turkish browser flows and 320/390/1366 px layout checks including dark mode. Hashes of production charges, bank entries, allocations, credits, people, staff memberships, resident access and units remained identical before and after the work. All 20 production apartments remain unchanged.

Apply `supabase/migrations/20261024_simple_active_assignments.sql` after earlier migrations. The one-time backfill preserves each legacy link's current status according to its existing known dates; earlier/future links remain available in history. No historical dates or new roles are invented. Thereafter dates are informational and do not activate/deactivate links. `tests/assignments.sql` documents the isolated integration checks. The old date-transfer tests are replaced with tests for the new explicit-state behavior.

Read AUTH-SETUP.md for remaining mail configuration and real-device verification. Password is the default login method; System is the default appearance. Browser sessions persist until logout, local data removal, or server-side expiry/revocation.

The public distribution contains application code and fictitious test data. Bank statements and resident records remain outside the repository. The browser receives only the public client key; permissions are enforced server-side. Role preview does not change memberships or server authorization.

Run `node --test tests/*.test.mjs`. Application assets are in the repository root. GitHub Pages uses the root distribution and preserves the original application under `old/`.

### Datenbank- und Ladeleistung (V3.15)

Messwerte, sichere Migration, Regressionstests und Backup-Grenzen: [PERFORMANCE.md](PERFORMANCE.md). Die produktive Migration ändert ausschließlich Lese-Policies und eine interne Prüfsignatur-Abfrage, keine Anwendungsdaten.
