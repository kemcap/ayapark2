# AyaPark 2 – Projektübergabe / Fortsetzungskontext

## Aktueller Arbeitsauftrag 30.10.2026 – Phase 2

Der Nutzer hat angewiesen, den Backup-Part zu überspringen und ohne erneute Einrichtung/Tests mit Phase 2 fortzufahren. Historische Backup-Nachweise bleiben unverändert; übersprungene Restore-Punkte werden nicht als neu getestet markiert.

Aktiver Branch: `feature/phase2-role-permission-audit-20261030`, aus main `2c55873506c1e132067876efae12cdc6e42fa358`. [PHASE-2-ROLES-AUDIT.md](PHASE-2-ROLES-AUDIT.md) enthält den Ist/Soll-Abgleich und die Umsetzungsreihenfolge. Neue isolierte Rechte-Matrix: 369 bestanden; bestehende SQL-Prüfungen: 226 bestanden. Allgemeine Testsuite: 249 bestanden / 13 Fehler, keine allgemeine Releasefreigabe. Keine produktiven Rechte geändert.

**Abgeschlossen im Entwicklungsstand:** vier kritische Finanzkorrekturen in command/command_v2 und Oberfläche auf Superadmin beschränkt; 28 SQL- und 2 UI-Prüfungen bestanden, keine produktive Migration. **Nächster konkreter Schritt:** fünf delegierbare Aufgabenrechte samt Entwurfs-/Freigabeablauf konsistent umsetzen. Keine Rückkehr zum Backup-Part ohne neuen Nutzerauftrag.

## Maßgeblicher Abgleich 30.10.2026 – älteren Angaben vorziehen

GitHub am 30.10.2026 geprüft: main `2c55873506c1e132067876efae12cdc6e42fa358`, erfolgreiches Pages-Deployment 40955767893. Im Hauptzweig existiert bereits ein separater aktiver DB-Backup-Workflow (`ayapark2-database-backup.yml`, 03:17 Istanbul). Der Export-/Prüf-/Verschlüsselungs-/Upload-Schritt im Lauf 40945224444 ist erfolgreich. Sein Ergebnis ist **.dump.age**, kein Gesamtarchiv. Keine vollständige Laufhistorie oder erfolgreiche Wiederherstellung daraus ableiten.

PR #52 bleibt offen/Draft; Head vor diesem Dokumentationsabgleich `c1c08843169a225ee562b45c5cc92f34972a048b`, 10 Commits voraus / 51 hinter main. Sein **Gesamtbackup-Entwurf bleibt gesperrt**. Keine Aktivierungsvariable ausgelesen oder geändert. Eine neue Aktivierung ist nicht erfolgt.

Schlüsselanlage, getrennte Schlüsselkopie und rclone-Test sind laut neuerer Roadmap bereits nutzerbestätigt. Aussagen weiter unten zu „noch keine Secrets / kein Upload / keine Automation“ sind **historische Aussagen zum Entwurf**, keine Beschreibung des neueren Hauptzweigs.

**Nächste Aufgabe:** echten Dump lokal entschlüsseln und anschließend isolierten DB-/Auth-/RLS-/Storage-Restore durchführen. Sichere Vorbereitung und konkrete lokale Anleitung: [BACKUP-RESTORE-PREPARATION.md](BACKUP-RESTORE-PREPARATION.md). Weder Entschlüsselung noch vollständiger Restore sind bisher nachgewiesen. Aktiven DB-Workflow nicht doppelt einrichten.


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


## Fehlerbereinigung 30.10.2026

Die 13 fehlgeschlagenen allgemeinen Prüfungen wurden behoben. Ergebnis: **264/264 bestanden, 0 fehlgeschlagen**, keine Tests deaktiviert. Anwendungskorrekturen: persönliche historische Forderungen zusätzlich zur berechtigten Wohnungssicht erhalten; deutschen Sprachcode korrekt auswerten; Cacheversionen derselben Laufzeitmodule über App/Recovery konsistent verwenden. Testkorrekturen: Detaildialog-Funktion gezielt isolieren, neue Devir-API-Antwort im Mock berücksichtigen, zusätzliche CSS-Klasse akzeptieren, überholte persönliche Sichtannahmen an die beschlossene gemeinsame Wohnungssicht anpassen. Fremde Wohnungen und private Kontaktdaten bleiben in den Prüfungen ausgeschlossen. Kein Live-Deployment oder produktiver Datenbankzugriff.

## Nächster Entwicklungsstand 30.10.2026 – Aufgabenrechte und Forderungsentwürfe

Migrationskandidat `20261029214410_phase2_task_grants_charge_drafts.sql`: exakt fünf explizite Aufgabenrechte (people_manage, occupancy_invite, charges_prepare, bank_reconcile, announcements_publish), keine automatische Übernahme breiter alter Grants. Vergabe nur durch tatsächlichen Superadmin an vorhandene Verwaltung. Neue Tabellen mit RLS; Clients erhalten nur SELECT, Änderungen über geprüfte RPCs; EXECUTE für PUBLIC/anon gesperrt.

Unveränderliche Forderungsentwürfe: Einreichung ohne Finanzbuchung, Superadmin-Entscheidung mit anlagenbezogener Sperre und Zeilensperre, Ablehnung ohne Buchung, erfolgreiche Freigabe über vorhandenen V5-Finanzkern, Wiederholung ohne Doppelbuchung. Fehler bei Freigabe lassen den Entwurf unverändert offen. Audit bei Vergabe, Einreichung und Entscheidung.

Nachweis: `npm run test:tasks:sql` **45 bestanden**, einschließlich Einzelrechte-Isolation, fehlender Superadmin-Eskalation, verbotener Selbstfreigabe, RLS, realer synthetischer Buchung und Freigabe-Idempotenz. Kein Produktivzugriff.

**Nur Grundlage vorbereitet, nicht vollständig integriert:** Bestehende Legacy-Rechte und direkte Finanzwege sind noch unverändert. Der neue Freigabeablauf darf deshalb nicht als durchgängig erzwungen gelten. Oberfläche, Workspace-/Edge-Actor-Anbindung der fünf Rechte und Absicherung aller alten direkten Finalisierungswege bleiben der nächste zusammenhängende Arbeitsschritt. Nicht vor dieser Integration veröffentlichen. Keine produktive Migration oder Live-Veröffentlichung erfolgt.

## Produktivfreigabe und erster Rollout 30.10.2026

Der Nutzer hat die bisherige Pflicht zur Einzelfreigabe aufgehoben und direkte Veröffentlichung geprüfter abgeschlossener Änderungen sowie notwendige Schema-/Funktionsänderungen ausdrücklich autorisiert. Keine produktiven Datensätze zu Testzwecken verändern. Backup-Part weiterhin überspringen.

Finanzkorrektur-Migration produktiv erfolgreich ausgeführt. Live-Hashes danach: command a75bf42bd300f17caa5790d99fa38f67, command_v2 8ba594c7cd5c2f334b2f45ae6c66ef35. Funktionsdefinitionen entsprechen dem isoliert geprüften Kandidaten. PR #55 erfolgreich nach main gemergt: 8e9b3dff20500ef048532ddacd38f6457a75d680. Pages-Deployment 40962059631 gestartet. Vorher allgemeine Tests 264/264, Korrekturen 28, SQL-Audit 120 und V5 50 bestanden. Spätere Aufgabenrechte-/Entwurfsgrundlage ausdrücklich nicht mitveröffentlicht.

Nächster Auftrag bleibt vollständige Aufgabenrechte-/Entwurfsintegration; hierfür keine erneute pauschale Live-Erlaubnis einholen. Vor Veröffentlichung weiterhin isoliert prüfen und tatsächlich ausgelieferten Stand verifizieren.

Pages-Deployment 40962059631 **erfolgreich abgeschlossen**; zugehöriger CI-Lauf 40962030729 ebenfalls erfolgreich. Veröffentlichung des Frontends dadurch belegt; authentifizierter Endnutzerablauf ohne Testkontoeingriff nicht erneut durchgespielt.
