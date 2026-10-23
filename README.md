# Ayapark 2 · V3.5

Browser app with Supabase Auth and row-level data access.

- Current app: https://kemcap.github.io/ayapark2/
- Archived original: https://kemcap.github.io/ayapark2/old/
- Owner-only preview: https://ayapark2-v2-private.kemcap.chatgpt.site

V3.5 adds Persons and apartment assignment in both directions, a unified contact Edit menu, illustrated phone installation, read-only Super-Admin role previews, and a safe resident provider directory. Announcement creation/list rendering and publication date validation are fixed.

Read AUTH-SETUP.md for remaining mail configuration and real-device verification. Password is the default login method; System is the default appearance. Browser sessions persist until logout, local data removal, or server-side expiry/revocation.

The public distribution contains application code and fictitious test data. Bank statements and resident records remain outside the repository. The browser receives only the public client key; permissions are enforced server-side. Role preview does not change memberships or server authorization.

Run `node --test tests/*.test.mjs`. The private Site source keeps assets in `dist/`. GitHub Pages uses the root distribution and preserves the original application under `old/`.
