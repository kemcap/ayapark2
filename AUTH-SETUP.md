# Ayapark 2 · authentication and deployment checks

## Deployment configuration still required

Prepared template: `supabase/templates/magic-link.html`. Supabase Authentication → Email templates → Magic Link: retain the existing link and add the one-time token:

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

## First-time password and password recovery
- On sign-in choose **İlk kez şifre oluştur / Erstmals Passwort erstellen**, request an email code, confirm it, then enter a password. The same authenticated session is reused; no second email is needed.
- An emailed recovery callback arriving at the GitHub Pages root with `type=recovery` is forwarded to `reset.html` with the original one-time credentials intact.
- In **Supabase Authentication → URL Configuration** allow the exact GitHub Pages reset URL (`https://kemcap.github.io/ayapark2/reset.html`) and ensure the configured Site URL is current. Keep any intended private preview URLs only if still needed.
- In **Email Templates → Reset password**, use `{{ .ConfirmationURL }}` to preserve Supabase verification and `redirect_to`. A hardcoded bare reset.html URL without Supabase confirmation credentials will cause the email-request loop.
- Supabase dashboard redirect URLs and live email templates must be reviewed separately: repository changes cannot silently change them.
- Do not paste genuine OTPs or one-time recovery URLs into issues or chats. Only an authorized user can confirm end-to-end email delivery and password setting.

## Reset loop and OTP fallback (V3.13.4)
The reset email template in `supabase/templates/recovery.html` contains both `{{ .ConfirmationURL }}` and `{{ .Token }}`. **Copy this template into Supabase Authentication → Email Templates → Reset Password**; a GitHub code change alone does not modify the Supabase email template. A recovery link is one-use and expires. If a link fails, request a fresh reset email and enter its numeric code into `/reset.html` without clicking the link. The new form verifies the recovery code with `type: recovery` and only then permits setting a password. Check Authentication → URL Configuration for the GitHub Pages reset URL and set the current site URL. Never send recovery links or OTPs to support.

## User onboarding

A manager records the person's email and current apartment relationship, then selects Benutzerzugang / Kullanıcı erişimi in settings. This prepares an unconfirmed Auth account and grants the selected role through a server-only transaction. It does not send an email. The user requests an OTP on the login screen; verification proves mailbox ownership. All account creation and role assignment is authorized server-side against the manager membership. Existing management roles are not silently downgraded.

## Persistent sessions

Normal sessions persist in browser localStorage, scoped to the application's base path. Credentials are never written to source code, URLs, logs, Cache Storage or reports. Refresh tokens rotate, with Web Locks coordinating tabs where supported. Account access is verified with Auth when restoring; database policies determine each user's data rights. Network outages preserve the saved session. Logout removes it and revokes the current session; other tabs clear their view on storage changes. Each device/browser has an independent session. Recovery uses a separate memory-only client.

System is the default appearance, manual selection persists. Installation is optional. The service worker is network-only; there is no offline finance/account cache.

## Remaining checks

Real OTP delivery, real password recovery after URL configuration, phone installation and a real persistent login require an authorized user/device. The original building photo was not available in the current source or attached source documents. Financial source confirmations remain a separate review and were not guessed.

## Verification status · 23 October 2026

- The automated suite verifies persistent sessions, refresh rotation, invalid-session cleanup, manual sign-in vs. background restore, login-dialog completion and recovery isolation.
- Manifest scope and relative start URL are correct for GitHub Pages; PNG app icons match the declared 192×192 and 512×512 dimensions.
- Resident detail help was observed outside the dialog before the fix and measured fully inside it after the fix. Focus goes to the heading; help opens deliberately by click or keyboard. The reported browser renderer crash has not been reproduced, so its root cause is not claimed to be resolved.
- Dashboard email settings currently require sign-in in the working browser. The prepared template, redirect configuration and SMTP delivery are not claimed deployed or verified until that sign-in succeeds.
- Real phone installation, real resident onboarding, OTP delivery and a full recovery/password change need the user or an authorized real device/account. Automated tests do not change a user's password or send mail.
- Four historic balance items still require source clarification. They remain unposted rather than assigning financial liability from ambiguous evidence.
- No original building photograph was available in the current attachments or identified by the file search.

## Persönliche Einladungen ohne WhatsApp-/SMS-Anbieter

Vorbereiteter Ablauf: [RESIDENT-INVITATIONS.md](RESIDENT-INVITATIONS.md). Manuelle Identitätsprüfung mit Geräteanfrage, optional E-Mail-Code. Neue Provider und Nachrichtenkosten sind für die manuelle Freigabe nicht erforderlich. Noch nicht live aktiviert.
