# Password recovery fix · 22.10.2026

The old resident portal treated recovery sessions as ordinary sign-ins, so the user landed on the old dashboard without a password form. A live invalid-token routing check also confirmed that the new private Site was not accepted as a Supabase redirect URL.

This change adds `dist/reset.html` using the V3 styles, verified recovery sessions, a new-password form, expired-link handling, and a return to the login screen. The login dialog now links to the recovery page. Password visibility controls are available on login and recovery forms. Text supports Turkish and German. No bank data or existing role assignments are changed. The legacy public portal is unchanged.

Required Supabase configuration: Authentication → URL Configuration → Redirect URLs → add the exact URL:

`https://ayapark2-v2-private.kemcap.chatgpt.site/reset.html`

Keep existing redirects and Site URL. Start new password requests from the new recovery page so `redirect_to` is supplied. Dashboard-triggered recovery emails can continue to use the legacy Site URL. Previously sent emails do not acquire the new redirect.

Recovery tokens are removed from the address bar before API requests. Sessions are held in memory, verified by Auth, and are never used to load financial data. Successful password changes clear the form and sign out the recovery session. Passwords are sent only to Supabase Auth over HTTPS.

Validation: mocked API tests cover requests, token/hash verification, session races, denied updates and cleanup. No real user's password is changed as a test. End-to-end recovery remains pending until the redirect is allowed and the user sets a new password from a fresh email.

Follow-up: a real browser request exposed `Failed to execute 'fetch' on 'Window': Illegal invocation`. The default API client stored the unbound native function and invoked it with the API instance as its receiver. Use a wrapper that calls `globalThis.fetch` with its global receiver. This affects login and every real API request, including recovery. A receiver-specific regression test supplements the injected-fetch tests; the live public Auth settings GET is used for browser verification without changing a real password or reading financial data.
