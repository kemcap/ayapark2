## V4.0 Entwicklungsvorschau · 2026-10-25 · kein Produktivrelease

- Gemeinsame Entwicklungsbranch auf Basis V3.15 plus separatem Datenbank-Audit; keine produktiven Datenbankänderungen durch diesen UI-Auftrag.
- Entfernen statt technischer Archivierungsaktion; rollenabhängiger Grund und unveränderter Historien-/Finanzschutz.
- Feldbezogene Fehlermeldungen, Datenerhalt und Fokus; nach Abbrechen oder Speichern zur geöffneten Wohnung/Person zurückkehren.
- Konsistente Touchgrößen, Formular-/Fokus-/Dialog-Tokens und semantische Tabellenlabels.
- CSV-Hilfe an die neunspaltige Vorlage angepasst; Strukturfehler in DE/TR.
- Getrennte Beispieldaten-Vorschau mit Browser-/API-Netzwerksperre. Kein Merge und keine Änderung der bestehenden Pages-/GPT-Version.
- Größere Navigations-, Dashboard- und Backendänderungen als Freigabevorschläge dokumentiert. Ergebnisse und Testgrenzen: UI-UX-AUDIT-V4.md.

## V3.15 · 2026-10-24

- Cache allowed-site sets once per SQL statement in three existing read policies, preserving the same permission checks and grants.
- Aggregate review fingerprint inputs once per site; preserve previous signatures including voided records and reversals.
- Compute apartment balances in linear passes and load administrator resident-account links in parallel.
- Keep resident apartment-card names scoped to their own person identities; retain upstream V3.14.1–V3.14.3 changes.
- 124 Node tests, 89 rolled-back SQL assertions, 6,687 equivalent synthetic review signatures. All 33 public application tables unchanged after migration; no new security advisor findings.
- Separate private application-data snapshot taken; not a complete Supabase/Auth/Storage backup. See PERFORMANCE.md for measured results, backup limitations and follow-up recommendations.

## V3.14.3 · 2026-10-24

- Apartment history labels now distinguish former owners, tenants and authorized representatives. Their outstanding debts remain attributed to the former person and appear only to finance-authorized users.
- The archive action explains that its history preserves relations; incorrect entries require a separate permanent correction.
- On A9, erroneous historical Abdullah Çınar and Fatima Özçelik owner links were erased in Supabase with audit records; Muneeb Ansari is archived as a former tenant, with his 6,620 TL enforcement claim linked to his old role and the original B-9 source hint retained for verification.
- Client scripts and styles updated to V3.14.3.

## V3.14.2 · 2026-10-24

- Show B block on the left and A block on the right in Overview and Apartments; list B1–B10 and A1–A10 row by row in two card columns per block.
- Widen the Overview apartment area, narrow the right-hand next-tasks panel, and preserve responsive layouts on smaller screens.
- Bust entrypoint/style/module caches under V3.14.2; no person or financial records changed.

## V3.14.1 · 2026-10-24

- Refresh apartment-card UI assets using versioned module/style URLs to prevent older cached JavaScript from hiding owner, tenant and authorized-person names after deployment.
- No Supabase person, apartment or financial data changed.

## V3.14 · 2026-10-24

- Add Ayapark 2 brand palette from meadow, sky and caramel facade tones, with light/dark surfaces.
- Add a contrast switch beside the palette; hue-preserving high contrast for every look and stronger controls, navigation and focus states.
- Rebuild preview and reset as two desktop columns, one mobile column. Full reset restores every appearance preference, Turkish and automatic theme.
- Preserve existing explicit language choices and upstream V3.13.3/V3.13.4 first-password/recovery and header-image changes.
- 106 Node tests; palette persistence checked with a rolled-back SQL transaction; desktop/mobile visual and contrast checks.

## V3.13.2 · 2026-10-24

- Match page backgrounds, cards/dialogs, sidebar and header surfaces to each color palette in both light and dark modes. Classic keeps the original appearance.
- Keep high-contrast overrides and semantic warning/debt colors. Header browser chrome follows the selected surface color.
- Verified eight palette/mode combinations for body/secondary-text contrast, existing regression tests and browser appearance.

## V3.13.1 · 2026-10-24

- Mark the original palette as Classic (default), with a palette-only reset.
- Remove the animation preference control; respect device reduced-motion settings automatically.
- Explain the optional amount privacy control in German and Turkish. No financial or permission changes.

## V3.13 · 2026-10-24

- Compact apartment information; clarification panel collapsed by default with direct actions and multi-selection. Reviewed items retain actor/time/source fingerprint without changing finance records.
- External management contacts can be entered during access setup. Corrected email validation and legacy resident-person FK handling; clearer provisioning errors.
- Staff identity and localized rights replace internal UUID/role labels. Audit pagination 10/50/100, default 10, fetched on demand. Bookkeeping setup collapsed.
- Personal account-synced appearance: five palettes and preloaders, text size, contrast, density, reduced motion, language and optional amount privacy. Only the existing theme control remains in the header.
- Delayed CSS loading indicators; parallel independent reads, render-scoped payment index, debounced person search and a people icon.
- Validation: 94 Node tests and 54 rolled-back SQL assertions; mobile/desktop, DE/TR and permissions checks. Email delivery not exercised with real accounts.

## V3.12 · 2026-10-24

- Replace apartment transfer wizards and three add buttons with one searchable person/role form. Direct editing supports role changes and an additional role without ending/recreating relationships manually.
- Add explicit current/archived link state, technical revision/timestamps and role-specific removal reasons. Preserve persons, other assignments, original financial links, memberships and authentication identities. Archived roles can be restored.
- Remove owner coverage, single-tenant and historic overlap gates from current assignment writes. Optional dates are annotations; occupancy remains separate.
- Show actual unpaid charge categories next to apartment balances, with “Mehrere Posten” for mixed categories. Information panels separate ordinary debts from concrete clarification issues and candidate unmatched payments; all use permitted source data.
- Use “Saldo prüfen” in German. Preserve dark mode and fix narrow-form controls. Refresh apartment/person details after writes.
- Validation: 82 Node tests; 26 authenticated rolled-back SQL assertions; German/Turkish desktop/mobile browser scenarios. Production finance, person, membership and unit checksums are unchanged.

## V3.10 · 2026-10-23

- Replace separate relationship date/switch actions with a guided change form, available from apartment and person editing in German and Turkish.
- Support ownership transfer, owner staying as tenant, tenant replacement/departure, tenant purchase, erroneous-role/date correction with reason, and atomic person creation with a role.
- Review the complete change before saving. Server validates site permissions, role compatibility, date order, tenant overlaps, owner coverage, stale edits and idempotent retries under a per-site transaction lock.
- Preserve original debt/person/link assignments, payments, authentication identities and management rights. Audit stores the previous relationships and correction reason.
- Keep physical occupancy separate and date its changes. Future occupancy takes effect on the selected date; manual occupancy updates use the same history. Planned relationships are labeled clearly.
- Validation: 67 Node regression tests, 16 rolled-back authenticated SQL assertions, browser checks for review/save/error behavior and responsive layout.

## V3.9 · 2026-10-23

- Residents see their own open debts after departure in dues and apartment details; another person's debts remain hidden.
- New CSV income/expense columns require unsigned positive amounts. Legacy signed CSV and signed running balances remain supported. Apartment hints accept only A-1–A-10/B-1–B-10 or blank.
- Confirmed existing server correction for charge periods, added a guarded installation script and seven transactional SQL checks. Client requires a complete chronological pair when a period is supplied.
- Scheduled announcements count correctly in the overview and compare actual instants across time zones.
- Invalid bank/report ranges show a specific message. Report totals and print/export controls are withheld until the range is valid; calculations and CSV export reject invalid ranges.
- Provider categories translate and can be searched in German without changing stored categories or names.
- Validation: 58 Node tests, 72 extended audit checks, 7 SQL assertions, targeted browser scenarios. Real email delivery, physical phone installation and multi-day session verification remain separate acceptance work.

# Ayapark 2

## 3.8

- Soften header colors with neutral surfaces in both themes.
- Replace the appearance dropdown with automatic, sun and moon icons; retain device default and saved manual choice.
- Remove the decorative A2 avatar and hide the redundant connected-account badge; keep demo identification.
- Make manual refresh an accessible icon with a loading state.

## 3.7

- Keep help disclosures in normal document flow within dialogs; prevent left-edge clipping.
- Focus the dialog heading and reset scroll when switching details; suppress automatic focus/hover expansion in dialogs.
- Preserve page hover help, native keyboard/touch toggling and resident claim scoping.
- Prepare the bilingual email-code template and record remaining deployment/device prerequisites honestly.

## 3.6

- Close the login dialog after both password/code sign-in and automatic session restoration.
- Prevent background restoration from superseding an in-progress manual sign-in.
- Preserve cancellation and failed-login behavior; add regression coverage.

## 3.5

- Restore Super-Admin-only view switching for real connected accounts.
- Preview standard Admin and selected apartment/person resident views.
- Keep preview read-only and preserve the actual server role.
- Restore full data when returning to Super-Admin; reset on logout.
- Add searchable Persons with standalone creation and apartment assignments in both directions.
- Consolidate apartment contact actions under Edit, including entry/departure and tenant replacement.
- Expose a safe read-only provider contact directory to authenticated residents.
- Add a theme-aware, illustrated Android/iPhone installation guide.
- Fix announcement list rendering after creation; validate schedules and show specific errors.


## 3.4

- Default to password login; email codes remain optional.
- Put clear, colored owner/tenant badges before person names.
- Add direct occupancy editing and entry/departure editing, including unknown starts.
- Reject reversed dates with specific translated errors before saving and on the server.
- Keep confirmed financial claims unchanged when editing occupancy dates.
- Unknown starts do not automatically assign historic monthly charges.


## 3.3

- Persist verified sessions across reloads and refresh tokens in the background; clear on logout.
- Add email code sign-in, keep password recovery and visibility controls.
- Add manager-controlled account provisioning with server-checked roles and apartment links.
- Add installable manifest, icons and home screen instructions; no private offline cache.
- Keep System as default appearance and persist manual Light/Dark choice.
- Preserve current-language flags, flat desktop navigation and provider colors/notes.
- Mail template, redirect configuration and real account delivery verification remain deployment requirements.


## 3.2

- Search apartment contacts, roles, notes and source debt labels with permission checks.
- Flat desktop menu, four outlined mobile categories, aligned desktop controls.
- Apartment cards with occupancy, confirmed balances, former debts and clarification reasons.
- Hover and keyboard explanations; touch toggles remain available.
- Current-language flag, System/Light/Dark appearance, provider status colors and notes.
- Imported balance dates are reference dates, not invented installment due dates.
- Source reconciliation is recorded separately in the protected database audit log; financial and personal source data are excluded from static assets.

Version rule: small published changes increment the decimal part; major updates increment the first number.
