# Ayapark 2 – Block 3: Anmeldung und Erstaktivierung

## Status (Entwicklungsbranch)

Basis: `main` bei V5.1, keine Änderung am produktiven Code oder an produktiven Supabase-Daten.

### In dieser Branch umgesetzt
- Zwei Einstiegskarten auf der Anmeldemaske: **Bereits Zugang** und **Zugang erstmals aktivieren**.
- Der erste Weg öffnet die bestehende Anmeldung mit Passwort oder E-Mail-Code.
- Der zweite Weg verwendet den bestehenden einmaligen E-Mail-Code und die vorhandene erstmalige Passwortvergabe. Eine verifizierte Sitzung wird unmittelbar zur Passwortvergabe wiederverwendet.
- Zurück-Navigation, verständliche deutsche/türkische Beschriftungen, mobile Layout-Regeln, sichtbare Tastatur-Fokuszustände und Unterstützung für reduzierte Animationen.
- Kein WhatsApp-Login, keine öffentliche Registrierung, keine Änderung an Rollen, Wohnungs- oder Finanzdaten.
- Neue Regressionstests für die Wegeauswahl und Erstanmeldung.

### Bereits vorher vorhanden und weiterhin verwendet
- E-Mail-Code mit `create_user: false`: kein automatisches Self-Sign-up durch unbekannte E-Mail-Adressen.
- E-Mail/Passwort-Anmeldung, persistente Sitzung, erstmalige Passwortvergabe und Wiederherstellung mit Code-Fallback.
- Autorisierte Benutzerzugänge werden serverseitig über den vorhandenen Freischaltungsablauf angelegt.

### Externe Konfiguration und Prüfungen – noch offen
1. **Google OAuth:** Einen Anbieter im Google Cloud Console konfigurieren, den Provider in Supabase freischalten, erlaubte Callback-/Redirect-URLs konfigurieren und die sichere Verknüpfung mit bestehenden, freigegebenen Auth-Konten testen. Unbekannte Google-Nutzer dürfen auch bei erfolgreicher Identitätsprüfung keine Daten sehen.
2. **Apple OAuth:** Service ID und Sign-in-Key im Apple Developer Portal einrichten; Key-Lebenszyklus berücksichtigen; `Hide My Email` darf nicht automatisch ein zweites berechtigtes Konto oder eine Wohnungszuordnung erzeugen.
3. **E-Mail-Recovery:** In Supabase Authentication → URL Configuration die aktuelle App-URL und `reset.html` erlauben, und die Reset-Password-E-Mail-Vorlage mit `{{ .ConfirmationURL }}` verifizieren. Die GitHub-Änderung allein kann die live konfigurierte Vorlage nicht ersetzen.
4. **Echte E2E-Tests:** Kontoaktivierung, Wiederherstellung und Google/Apple-Kontoverknüpfung dürfen nur an einem ausdrücklich autorisierten Testkonto und mit konfigurierten Providern getestet werden.

**Google- und Apple-Anmeldeschaltflächen sind bewusst noch nicht aktiviert.** Eine funktionsfähig wirkende Oberfläche ohne bestätigte Provider-Konfiguration oder sichere Zuordnung könnte echte Nutzer in einen fehlerhaften oder unsicheren Anmeldeablauf schicken.

### Einführung
Nur nach Review und ausdrücklicher Freigabe nach `main` übernehmen. Vorher Regressionstests ausführen (`npm test`) und auf Android, iPhone sowie Desktop prüfen. Keine produktiven Supabase-Migrationen notwendig für die reine Zwei-Wege-UI.
