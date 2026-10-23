# Ayapark 2 · V3.3

Browser app with Supabase Auth and row-level data access.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Existing private preview: https://ayapark2-v2-private.kemcap.chatgpt.site

GitHub Pages publishes the root of main. Legacy portal entrypoints forward to the current app, preserving Auth callback fragments. Archived pages retain the previous application; their browser-local state belongs to their original application keys and is not automatically migrated into V3.

Read AUTH-SETUP.md before enabling OTP for residents. Code requests, password login and password recovery are available. Persisted sessions are scoped to the app path. New users are provisioned by a manager; the browser never receives privileged keys.

The repository contains interface code, server functions, schema snapshots, documentation and fictitious test data. Original bank statements and resident records stay outside GitHub. Public publishable client keys are intentional; access enforcement remains in the database and server functions.

Run `node --test tests/*.test.mjs`. The private Site source keeps tests with the dist layout.
