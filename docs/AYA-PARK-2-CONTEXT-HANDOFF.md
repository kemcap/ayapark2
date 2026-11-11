# AyaPark 2 – Projektübergabe / Fortsetzungskontext

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


## Fortsetzung 30.10.2026 – aktueller Phase-1-Zwischenstand

Der bisherige Backup-Entwurf aus PR #52 bleibt gesperrt; der aktive DB-Workflow auf main ist davon unabhängig. Ein neuer separater Arbeitsbranch feature/phase1-restore-preflight-20261030 baut auf dem PR-#52-Branch auf. Dort liegen ein ausschließlich lokaler PostgreSQL-17-Dump-Preflight, sechs synthetisch bestandene Unit-Tests und docs/PHASE1-RESTORE-GATE-20261030.md. **Es gab keinen echten Restore, keinen Merge, keine Aktivierung und keine produktive Änderung.**

Read-only am 30.10. live bestätigt: 42 Public-Tabellen mit RLS, 0 Storage-Buckets/Objekte, sieben aktive Edge Functions, PostgreSQL 17.11. Die sieben Live-index.ts-Dateien stimmen mit GitHub main überein, Module benötigen bei Redeployment teilweise angepasste relative Importpfade. In privatem Google Drive liegen vier .dump.age-Archive und eine Testdatei; kein Gesamt-.tar.age-Archiv nachgewiesen.

**Nächstes Gate:** echtes .dump.age lokal mit dem bereits vorhandenen privaten age-Schlüssel auf dem geschützten Gerät entschlüsseln und offline prüfen; anschließend ein ganz neues isoliertes Restore-Ziel und versionsgebundene Auth-/RLS-/Storage-Tests durchführen. Secret-Dateien nicht im Chat teilen. Erfolgreiches Gesamtbackup und vollständiger Restore bleiben zwingende Voraussetzung für Freigabe/Phase-1-Abschluss.


### Cloud-first-Abgleich 30.10.2026

- [x] Google Drive (privater Ordner AyaPark2-Backups) bleibt externes Speicherziel, Google Cloud bisher OAuth-Anbindung; kein GCS-Bucket und kein kostenpflichtiger Plan aktiviert.
- [x] `scripts/backup/test_synthetic_restore.sh` und `.github/workflows/phase1-synthetic-restore.yml` für eine cloudbasierte PostgreSQL-17-/age-/RLS-Wiederherstellungsprobe ausschließlich mit künstlichen Daten in separatem Branch vorbereitet. Keine Produktionssecrets, keine Live-Verbindungen.
- [x] Sechs Unit-Tests für Offline-Dump-Prüfung tatsächlich lokal erfolgreich durchgelaufen.
- [ ] GitHub-Actions-Synthetic-Restore-CI: erfolgreicher Lauf **noch nicht nachgewiesen**; Teststatus vor Freigabe prüfen.
- [ ] Echte Produktiv-.dump.age-Datei sicher entschlüsseln und isoliert wiederherstellen. Privater age-Schlüssel bleibt beim Benutzer; Cloud-Verwendung personenbezogener Daten und Entschlüsselung benötigen ausdrücklich genehmigten Sicherheitsablauf. Kein echter Restore stattgefunden.
- [ ] Gesamtbackup, externer .tar.age-Rundlauf, Verschlüsselung, Storage/Git/Edge-Function-/Auth- und Migrationstests weiter offen.

Aktueller ausführlicher Plan und Sicherheitsgrenzen: `docs/PHASE1-RESTORE-GATE-20261030.md`. Ältere Mac-only-Anweisungen sind keine Entscheidung für den Backup-Speicher; der Speicherort bleibt Google Drive.


## Prüfnachweis 30.10.2026 – erweiterter kompletter SYNTHETISCHER Cloud-Test

- [x] GitHub Actions Lauf **41098709384**, Job synthetic-restore **SUCCESS**: 12 Python-Unit-Tests sowie verschlüsselter PostgreSQL-17-Dump, Entschlüsselung, isolierter DB-Restore und RLS-Positiv-/Negativprüfungen bestanden. Job-Logs tatsächlich überprüft.
- [x] Zusätzlicher portabler synthetischer Test scripts/backup/test_portable_archive.py ergänzt: eigener Mini-Git-Repo-/Assets-/Edge-Function-Stand; private synthetische Storage-Datei; Manifest mit SHA-256; tar→age, Entschlüsselung, Archiv-Prüfung, Git-Spiegel-Clone ohne Ursprungsrepo; kaputte/fehlende Storage-Datei wird erkannt.
- [x] Erster erweiterter Lauf **41099538759** meldete FAIL. **Ursache tatsächlich gefunden:** export_storage.py schreibt Storage-Pfade im index.json relativ zum Storage-Ordner (`objects/…`), verify_snapshot.py verglich aber gegen Manifest-Pfade relativ zum Archiv (`storage/objects/…`). Das wurde in verify_snapshot.py korrigiert und die Pfadvalidierung verbessert.
- [x] GitHub Actions Lauf **41099870196** zum korrigierten Stand **SUCCESS**: synthetischer vollständiger Archivtest und PostgreSQL-17-/RLS-Restore erfolgreich (kein Real-Dump, keine Produktiv-Secrets).
- [x] scripts/backup/backup.sh: Nach Google-Drive-Upload für vollständige .tar.age-Sicherung wird künftig tatsächlicher Remote-Ciphertext per rclone cat gelesen und SHA-256 mit lokalem Ciphertext verglichen. **Dieser Remote-Schritt wurde noch nicht mit einem echten vollständigen Google-Drive-Backup getestet.**
- [ ] Echter vollständiger verschlüsselter Projekt-Snapshot (.tar.age) von Produktion nach Google Drive und unabhängige Wiederherstellung weiterhin offen; Gesamtbackup-Workflow bleibt gesperrt.
- [ ] Echtes vorhandenes .dump.age mit privatem age-Schlüssel in geschützter Umgebung entschlüsseln; DB/Auth/RLS/Storage-/App-Restore auf frischer isolierter Umgebung noch offen.
- [ ] OAuth-Produktionseinstellung und langfristige rclone-Token-Eignung noch prüfen. Keine neuen Secrets in GitHub abgelegt.
- [ ] Veralteten Draft PR #52 vor Zusammenführung in main mit aktuellem Produktivbranch abgleichen. Draft #68 bleibt zunächst auf #52 gestapelt. **Kein Merge und keine Aktivierung ohne ausdrückliche Freigabe.**

**Nächster Sicherheits-Gate:** Für echten Restore ist die bisher nur auf dem Mac gesicherte private age-Identity notwendig. Die Backups bleiben in Google Drive; Mac ist nicht Backupspeicher. Ein Cloud-Restore mit echten Bewohner-/Auth-/Finanzdaten kann ohne den privaten Schlüssel nicht vollständig durchgeführt werden. Vor Übergabe der Entschlüsselungsfähigkeit an eine Cloud-Testumgebung ist ein gesondertes, ausdrücklich freigegebenes Vorgehen zum Schutz dieser Daten zu definieren.


## Echt ausgeführtes separates App-Quellcode-Backup – 30.10.2026

**Status dieser Teilaufgabe: erfolgreich gesichert und Remote-Ciphertext geprüft.** Keine realen Datenbankdaten berührt; kein Live-Deploy und keine Änderung an `main`.

- One-time-Workflow (nur Push des neuen Workflowfiles im bestehenden Entwicklungsbranch): `.github/workflows/phase1-app-source-backup.yml`.
- Echter GitHub-Actions-Lauf: https://github.com/kemcap/ayapark2/actions/runs/41100797096; Job-Protokoll enthält `Standalone source bundle and isolated mirror restore verified.` sowie `APP SOURCE BACKUP VERIFIED`.
- Ziel: privater Ordner `AyaPark2-Backups` auf dem bestehenden Google Drive. Echter neuer Datei-Eintrag mit ID `1UZ2EDu-76R3mwh_DLBeLKgTA5HVfQ_JB`: https://drive.google.com/file/d/1UZ2EDu-76R3mwh_DLBeLKgTA5HVfQ_JB/view .
- Dateiname: `ayapark2-app-source-20261030T174118Z-41100797096.tar.age`.
- Tatsächliche Größe: **2.673.480 Bytes** (Google-Drive-Metadaten separat geprüft).
- Verschlüsselt mit demselben bestehenden **öffentlichen age-Empfänger** wie das tägliche Datenbankbackup; kein privater Schlüssel übertragen, keine neuen Geheimnisse erstellt.
- Gesicherter `origin/main`-Commit: `03a223eb12f0c42d74ee157fd4ee2dcb4cc5a24e`; Live-Hauptbranch vor Backup abgeglichen. Enthalten ist der Git-Bundle-Snapshot mit allen erreichten Referenzen, versioniertem App-Quellcode, Designs, Dateien in `assets/`, Edge-Function-Quellcode, Tags und erreichbarer Versionshistorie. **Nicht** gesichert sind unversionierte lokale Daten, GitHub-Issues/-PRs, Secrets, externe Dokumente oder produktive Datenbank.
- Verschlüsselter SHA-256-Prüfwert (lokal berechnet und durch unabhängiges `rclone cat` des tatsächlich von Google Drive erneut heruntergeladenen Ciphertexts erfolgreich bestätigt): `f6ad740ee4799892e9545abf3a550ad188851490aa6baee96f447838112d901f`.
- Das Git-Bundle wurde **vor Verschlüsselung unabhängig rekonstruiert** und `git fsck --full --strict` geprüft. **Nicht** durchgeführt wurde eine wirkliche `age`-Entschlüsselung dieses *realen* Archivs mit der privaten age-Identity (liegt nur beim Benutzer). Dieser letzte Test sowie der echte Datenbank-/Auth-/RLS-/Storage-/App-Restore sind weiterhin offene Phase-1-Gates.
- Täglicher DB-only-Workflow bleibt unverändert; kein zweiter DB-Workflow oder automatischer App-Sicherungs-Zeitplan aktiviert.
