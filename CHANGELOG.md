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
