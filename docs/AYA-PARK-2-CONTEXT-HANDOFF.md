# AyaPark 2 – Projektübergabe / Fortsetzungskontext

Stand: **29.10.2026** · Status: **Phase 1 – Backupvorbereitung, NICHT produktiv aktiviert**.

> Diese Datei ist der dauerhafte Übergabepunkt für neue ChatGPT-Chats und Entwickler. Sie beschreibt **vereinbarte Anforderungen und nachgewiesene Stände**, nicht den Beweis, dass jede Funktion implementiert ist. Vor Änderungen den aktuellen GitHub-Stand und Supabase-Zustand erneut überprüfen. Keine persönlichen Kontodaten, Bankdetails, Passwörter, API-Keys oder Verschlüsselungsschlüssel in dieser Datei ergänzen.

## 1. Projekt und verbindliche Regeln

- Produkt: AyaPark 2, Site-Verwaltungsanwendung für zwei Blöcke A/B und insgesamt 20 Wohnungen in der Türkei.
- Live-Frontend: https://kemcap.github.io/ayapark2/
- GitHub: `kemcap/ayapark2`; Produktivbranch `main`.
- Supabase Free: Produktivprojektname `ayapark2`; Datenbank PostgreSQL. **Kein kostenpflichtiger Supabase-Plan gewünscht.**
- Login, Personenverwaltung, Finanzen, Dokumente, Datenschutz und mehrsprachige Oberfläche DE/TR.
- Rollen: Superadmin, eingeschränkt berechtigte Verwaltung, Bewohner. Eigentümer-/Mieter-/Vertreter-Zuordnungen sind **fachliche Beziehungen**, nicht automatisch erhöhte Systemrechte.
- Strikte Backend-Rechte/RLS und persönliche Schuldnerdaten-Isolierung, nicht nur Ausblenden im Frontend.
- **Vor kritischen Änderungen**: funktionsfähiges Backup + getestete Wiederherstellung, separater Entwicklungsbranch, reproduzierbare Tests, ausdrücklich genehmigter Livegang. Kein eigenmächtiges Verändern produktiver Finanz-/Bewohner-/Auth-Daten.
- Benutzerpräferenz: Jeden abgeschlossenen Schritt mit dem folgenden konkreten Schritt und ggf. detaillierter Benutzeranleitung verbinden. Kleine, fachlich saubere Schritte statt alles gleichzeitig. In deutscher Sprache kommunizieren.
- Backup-Mindestziel: Datenbank + Auth-/RLS-/Schema-Inhalte + Storage-Dateien + vollständiger App-Quellcode und Design + Git-Versionshistorie + Edge-Function-Quellcode + dokumentierte Plattformkonfiguration. Sichere unabhängige Wiederherstellung und Anbieterwechsel müssen möglich sein.

## 2. AyaPark-Akademie: 30 Entscheidungen (verbindliche Ziel-Spezifikation)

1. **Teilzahlungen:** älteste offene Forderung zuerst, falls kein zulässiger eindeutiger Zahlungszweck angegeben.
2. **Personen-/Bewohnerwechsel:** historische, zeitlich abgegrenzte Zuordnung und Erhalt alter Forderungen; keine neue Fremdschuld für Nachfolger.
3. **Eigentümer-/Mieterbelastung:** rechtlich sachgerechte Verantwortung je Kostenart, keine blinde Kategorieautomatik.
4. **Kostenverteilung:** rechtlich zutreffender Verteilungsschlüssel, ggf. Arsa Payı, mit nachvollziehbarer Beschlussgrundlage.
5. **Aidat:** monatliche Forderungsentwürfe, nur Superadmin finalisiert.
6. **Mahnung:** freundliche Hinweise an Tag 7 und 21; interne Prüfung ab Tag 35, keine automatische Rechtsverfolgung.
7. **Nachrichten:** App und ggf. E-Mail; WhatsApp manuell teilbar, keine kostenpflichtige SMS-/WhatsApp-API.
8. **Benachrichtigungen:** zentrale Regeln und zuständige Verwaltungsbefugnisse.
9. **Bewohnereinstellungen:** Sprache DE/TR selbst ändern; Änderungen an Identitäts-/Kontaktdaten werden geprüft.
10. **Kontaktdaten:** Anträge und Prüfung in zentraler Freigabeliste mit Audit-Trail.
11. **Kontozugang:** sichere Wiederherstellung nach Identitätsprüfung; bestehende Konto-ID möglichst behalten.
12. **Systemrollen:** Superadmin, Verwaltung, Bewohner; serverseitiges RLS und Rechteprüfung.
13. **Exakt fünf einzeln vergebbare Verwaltungsrechte:** (a) Wohnungen/Personen bearbeiten, (b) Bewohnerwechsel/Einladungen, (c) Aidat/Umlagen vorbereiten, (d) unklare Bankzuordnungen klären, (e) Ankündigungen veröffentlichen. Kritische Finanzen und Sicherheitsverwaltung bleiben beim Superadmin.
14. **Finanzkorrekturen:** Buchungsoriginal erhalten, nachvollziehbare Gegenbuchung, Freigabe durch Superadmin. Markierung/Prüfpause bei strittigen Fällen möglich.
15. **Bankimporte:** klare Treffer vorschlagen, unklare Fälle manuell zuordnen, keine Dubletten, Vorschau und Bestätigung.
16. **Importformate:** PDF/CSV/XLSX; historische Quellen abgleichen; Bankgebühren, Saldozeilen getrennt handhaben.
17. **Abstimmung:** Vollständigkeit der Bankbewegungen, Bank-/Buchsaldo, Forderungszuordnung als getrennte Kontrollstufen.
18. **Transparenz:** öffentliche aggregierte Finanzübersichten ohne persönliche Schuldnerdetails; persönliche Daten nur Berechtigten.
19. **Ausgaben/Exporte:** PDF und Excel nach Rolle; private persönliche Belege, administrative Berichte.
20. **Abschlüsse:** Monatsabschluss möglich bei abgestimmter Bank mit dokumentierten ungeklärten Zuordnungen; keine ungeklärte Bankdifferenz; Jahresabschluss strenger.
21. **Budget:** Monatsplan, Reparaturplanung, vorsichtige 3–6-Monats-Liquidität, nur echtes Geld als Bankbestand behandeln.
22. **Rücklagenziel:** nachvollziehbare Empfehlung/Planung, gesetzlich erforderliche Beschlüsse beachten.
23. **Rücklagenentnahme:** Superadmin-Freigabe, dokumentierte Notfälle, keine unbeaufsichtigte Zahlung.
24. **Sonderumlage B:** digital vorbereiten und Eigentümern zur Einsicht zeigen, erforderlicher rechtlicher Beschluss extern mit Nachweis, Superadmin schaltet endgültig frei; historische Eigentümer und Verteilung beachten.
25. **Versammlungen A:** einfach – Tagesordnung, Einladungsvorlagen, unterschriebene Beschlüsse und Protokolle archivieren; Anwesenheit, Vollmachten, Mehrheiten überwiegend manuell unter türkischem Recht/Karar Defteri.
26. **Aufträge A:** einfache Aufgabenliste mit Beschreibung, Verantwortlichem, Priorität, Datum, Status, optional Dienstleister und Dokumente. Keine komplexe Angebotsabwicklung. Finanzfreigaben bleiben unabhängig.
27. **Wartung A:** Aufgaben und Wiederholungen manuell anlegen; automatische Fälligkeitshinweise und Überfälligkeitsanzeige; keine automatische nächste Wartungsaufgabe.
28. **Dokumente A:** einfaches privates Dateiarchiv mit Kategorien, Namenssuche, Download; RLS und Audit; keine OCR/Volltextsuche/komplexe Verknüpfungen. Originalbelege/Karar Defteri rechtlich beachten.
29. **Backup B:** täglich Datenbank und Dateien separat automatisch, verschlüsselt außerhalb der Produktivsysteme, Zusatzauszug vor kritischen Updates, Monitoring, regelmäßiger Restore-Test; produktive Wiederherstellung ausschließlich nach Superadmin-Freigabe. **Supabase Free bleibt.**
30. **Umsetzungsreihenfolge:** P0 Sicherheit/Bestandsaufnahme, P0 Backups, P1 Rollen/Personen, P1 Finanzkern/Bankabstimmung, P1 Berichte/Abschlüsse/Umlagen, P2 Budget/Rücklagen, P2 einfache Verwaltung, wiederholte Test-/Release-Gates.

Das sind Anforderungen. Vor der Implementierung immer prüfen, welche Module bereits im aktuellen Code verfügbar sind, statt Funktionen doppelt zu bauen.

## 3. Technischer Ist-Stand (zuletzt schreibgeschützt am 28.10.2026 geprüft)

- `main` GitHub-Commit `a4a9d8c44b56d32c0aa0ac73aa6eb613ae19b89e` („Publish compact Palmiye original balance reference within category list v5.9.16“).
- Supabase Produktivprojekt `eisozwhhinqszfikemot`, Status ACTIVE_HEALTHY, PostgreSQL 17.11; weiteres aktives Projekt `ayapark-auth-staging` vorhanden.
- 2 Blöcke, 20 Wohnungen; 39 Tabellen in `public`, alle mit RLS aktiviert. 41 DB-Migrationen erfasst.
- Zum Prüfzeitpunkt: 1.734 Bankeinträge, 48 Forderungen, 12 Zahlungszuordnungen. Bloße Bestandszahlen, keine buchhalterische Validierung.
- **Supabase Storage: 0 Buckets / 0 Storage-Dateien.** Künftiges privates Dokumentenarchiv noch einzurichten.
- Bestehende UI-/Fachmodule u. a. `finance-forms.mjs`, `finance-v5.mjs`, `reconcile.mjs`, `v3-import.mjs`, `notifications.mjs`; CSV vorhanden, PDF/XLSX-Import nicht abschließend nachgewiesen.
- Aktuell `.github/workflows/invitation-checks.yml` für Tests, zuvor **kein täglicher Backup-Workflow** auf `main` gefunden.
- Supabase Advisors: auffällige `SECURITY DEFINER`-Execute-Rechte, deaktivierter Schutz vor geleakten Passwörtern, fehlende Policy für drei RLS-Tabellen (`ay3_invite_tokens`, `ay_access_requests`, `ayapark_admins`). Kein Beweis einer tatsächlichen Schwachstelle allein durch Advisor; bestehende Trigger-SIGNATURES und beabsichtigte Sperren berücksichtigen.
- Alte `/old/`-Seite wurde in älterem Audit als öffentlich mit Finanzbeträgen beschrieben; im aktuellen `main` ist `old/index.html` eine Redirect-Seite über `legacy-redirect.js`. LIVE-Deployment und historische öffentlich zugängliche Commit-Dateien gesondert prüfen.
- Keine laufende Backup-Automation oder vollständige getestete Produktivwiederherstellung nachgewiesen.

## 4. Aktueller aktiver Arbeitsschritt: KOSTENLOSE Backups vorbereiten

**Entwicklungsbranch:** `feature/free-backup-preparation-20261028`
**Draft-Pull-Request:** https://github.com/kemcap/ayapark2/pull/52
**Einrichtungsanleitung:** `docs/FREE-BACKUP-SETUP.md`

In diesem Branch vorbereitet (nicht ausgeführt):
- `.github/workflows/free-daily-backup.yml`: geplant 01:41 UTC = 04:41 Istanbul; Ausführung durch `vars.AYAPARK_BACKUP_ENABLED == 'true'` gesperrt (Variable bewusst nicht gesetzt). Zeitplanung erfolgt in GitHub nur aus `main`.
- `scripts/backup/backup.sh`: `pg_dump` im PostgreSQL-17-Container für `public`, `ay2_private`, `ay_auth_private`; zusätzlich `auth`-Daten und Storage-Metadaten. Mit age encrypt und rclone zum externen Speicher.
- `scripts/backup/export_storage.py`: getrennte Übertragung echter Storage-Dateien lesend.
- `scripts/backup/verify_snapshot.py`: Offline-Manifest-/Hashprüfung – **kein vollständiger Restore**.
- `docs/FREE-BACKUP-SETUP.md`: Ablauf, Geheimnisnamen, Risiken, Tests.

### Vom Benutzer bereits erledigt
- Privater Google-Drive-Ordner **AyaPark2-Backups** manuell angelegt.

### Noch NICHT erledigt
- age-Schlüsselpaar lokal erzeugen: Der **private** Schlüssel darf niemals in Chats/GitHub/Drive-Backups landen, nur öffentliche `age1...`-Empfänger-ID als GitHub-Variable.
- rclone Google-Drive-Zugang konfigurieren und testen; passende OAuth-App-Einstellung für unbeaufsichtigte Nutzung prüfen.
- GitHub Actions Secrets, rclone-Konfiguration und Variablen noch **nicht gesetzt**.
- Kein produktiver Dump, kein Backup, kein Joblauf, keine Änderung an Live-Daten, `main`, Supabase-Settings.
- Kompletter Export/Restore einschließlich verwalteter Auth-Objekte und Storage in isolierter Umgebung **noch ungetestet**.
- Prüfen, ob die derzeit vorbereiteten SQL-Dumps als vollständige Supabase-Recovery ausreichen; fehlende Konfigurationen, Edge-Function-Secrets und OAuth/SMTP gesondert absichern.

### NEUE USER-ANFORDERUNG: VOLLSTÄNDIGE PORTABILITÄT / GITHUB-UNABHÄNGIGKEIT
Der Benutzer hat ausdrücklich verlangt, dass das Backup nicht nur DB + Dateien, sondern **das ganze Projekt inklusive Design und GitHub-Code** enthält, um bei GitHub-Ausfall oder Umzug zu eigenem Hosting bzw. anderem DB-Anbieter unabhängig zu sein.
- **29.10. implementiert und isoliert geprüft:** `scripts/backup/export_source.py` sichert alle im vollständigen Checkout verfügbaren Referenzen und ihre erreichbare Historie als eigenständiges Git-Bundle, inklusive versioniertem Quellcode, Design, Assets und Edge Functions. 6 Offline-Tests bestanden; tatsächlicher Repo-Spiegel mit 62 Referenzen erfolgreich unabhängig wiederhergestellt. Keine lokalen unversionierten Dateien/Secrets werden kopiert. LFS/Submodule und flache Historien führen zum Abbruch statt unvollständiger Sicherung.
- Ergänzen: Dokumentiertes Infrastruktur-/Konfigurationsinventar (ohne Klartextsecrets), versionsgebundene DB-/Auth-/Edge-/Storage-Restore-Checkliste und echte isolierte Wiederherstellungsprobe.
- Beachten: Git-Bundle kann für sich keine GitHub-Account-/Actions-Secrets, Branch-Protection-Regeln oder externe Plattformkonfiguration sichern. Dafür gesonderte sichere Dokumentation und bei Bedarf Neuanlage.
- Für Anbieterwechsel: Self-hosted Supabase + PostgreSQL leichter als vollständiger Datenbank-/Auth-Wechsel. Shared Hosting kann ungeeignet sein. Anbieterwechsel und Wiederherstellung sind NICHT vollständig automatisch.
- **Nächste Teilaufgabe:** `age`, `age-keygen` und `rclone` auf dem Computer des Benutzers prüfen/einrichten; privaten age-Schlüssel ausschließlich dort erzeugen. `docs/BACKUP-RECOVERY-INVENTORY.md` enthält eine neue Checkliste; tatsächliche Auth-/SMTP-/OAuth-/Plattformwerte fehlen weiterhin. Verschlüsselter Gesamtlauf, Offsite-Übertragung und Datenbank-/Auth-/Storage-Restore bleiben ungeprüft. Workflow weiter gesperrt.

## 5. Sicherheit und Kommunikation

- Durchgängig deutsch und mit konkreten Schritten arbeiten; nachdem ein Schritt erledigt ist, sofort nächsten Schritt erklären, sofern Benutzer etwas tun muss.
- Keine behaupteten Erfolge ohne reale Tests.
- Nachvollziehbare Tests und Code-Review, PR als Entwurf behalten; keine Änderung produktiver Daten oder Live-App ohne ausdrückliche Freigabe.
- Keine Cloud-Secrets, Datenbankpasswörter, private age-Schlüssel oder vollständige OAuth-Tokens im Chat erfragen.
- Dauerhaftes Dokument nach jeder großen Entscheidung/Phase aktualisieren und Datum/Commit ergänzen, damit ein neuer Chat fortsetzen kann.
- In neuem Chat als Start: „Setze das AyaPark-2-Projekt anhand von `docs/AYA-PARK-2-CONTEXT-HANDOFF.md` auf Branch `feature/free-backup-preparation-20261028` fort. Lies die Datei sowie PR #52 und überprüfe den aktuellen Ist-Stand. Fahre mit der Ergänzung der vollständigen portablen Projektbackups fort; keine Liveänderungen ohne Freigabe.“

## 6. Relevante Links

- GitHub-Projekt: https://github.com/kemcap/ayapark2
- Live-App: https://kemcap.github.io/ayapark2/
- Backup-Entwurf PR: https://github.com/kemcap/ayapark2/pull/52
- Backup-Anleitung im Entwurfsbranch: https://github.com/kemcap/ayapark2/blob/feature/free-backup-preparation-20261028/docs/FREE-BACKUP-SETUP.md
- Supabase offizielle Migration zu Self-Hosting: https://supabase.com/docs/guides/self-hosting/restore-from-platform
