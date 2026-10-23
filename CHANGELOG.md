# Ayapark 2

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
