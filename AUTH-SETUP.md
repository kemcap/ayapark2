# Ayapark 2 · V3.3 authentication

## Deployment configuration still required

Supabase Authentication → Email templates → Magic Link: retain the existing link and add the one-time token:

```html
<h2>Ayapark 2</h2>
<p>Giriş kodunuz / Dein Anmeldecode: <strong>{{ .Token }}</strong></p>
<p><a href="{{ .ConfirmationURL }}">Giriş yap / Anmelden</a></p>
```

Under Authentication → URL Configuration, retain existing URLs and allow:

- `https://kemcap.github.io/ayapark2/`
- `https://kemcap.github.io/ayapark2/reset.html`
- `https://ayapark2-v2-private.kemcap.chatgpt.site/`
- `https://ayapark2-v2-private.kemcap.chatgpt.site/reset.html`

Use `https://kemcap.github.io/ayapark2/` as Site URL after the migration. Existing emails retain their original URLs; request a fresh email after configuration.

For arbitrary residents, a working custom SMTP provider is required if the default Supabase mail service restricts recipients to organization members. Test delivery with an authorized real account after SMTP/template configuration. No user password was changed and no invitation or OTP email was sent by automated tests.

## User onboarding

A manager records the person's email and current apartment relationship, then selects Benutzerzugang / Kullanıcı erişimi in settings. This prepares an unconfirmed Auth account and grants the selected role through a server-only transaction. It does not send an email. The user requests an OTP on the login screen; verification proves mailbox ownership. All account creation and role assignment is authorized server-side against the manager membership. Existing management roles are not silently downgraded.

## Persistent sessions

Normal sessions persist in browser localStorage, scoped to the application's base path. Credentials are never written to source code, URLs, logs, Cache Storage or reports. Refresh tokens rotate, with Web Locks coordinating tabs where supported. Account access is verified with Auth when restoring; database policies determine each user's data rights. Network outages preserve the saved session. Logout removes it and revokes the current session; other tabs clear their view on storage changes. Each device/browser has an independent session. Recovery uses a separate memory-only client.

System is the default appearance, manual selection persists. Installation is optional. The service worker is network-only; there is no offline finance/account cache.

## Remaining checks

Real OTP delivery, real password recovery after URL configuration, phone installation and a real persistent login require an authorized user/device. The original building photo was not available in the current source or attached source documents. Financial source confirmations remain a separate review and were not guessed.
