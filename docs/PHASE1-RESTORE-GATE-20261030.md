# AyaPark 2 – Phase 1 Restore-Gate (30.10.2026)

**Status: Vorbereitung weitergeführt; Phase 1 nicht abgeschlossen.**
Dieser Bericht dokumentiert eine lesende Bestandsaufnahme und synthetische Tests. Er ist kein Nachweis eines erfolgreichen realen Restores.

## 1. Verifizierter Betriebsstand

- Supabase-Produktivprojekt: eisozwhhinqszfikemot, ACTIVE_HEALTHY, PostgreSQL 17.11.
- Public-Schema: 42 Tabellen, alle mit RLS, 46 Policies. Das ist keine Berechtigungsprüfung der Policies.
- Auth-Schema: 27 Tabellen. Privates Schema ay_auth_private: zwei Tabellen.
- Supabase Storage: 0 Buckets, 0 Objekte. Echter Storage-Dateirestore aus der laufenden Produktion ist daher derzeit nicht nachweisbar.
- Installierte Extensions: pg_stat_statements 1.11, pgcrypto 1.3, plpgsql 1.0, supabase_vault 0.3.1, uuid-ossp 1.1.
- Sieben aktive Edge Functions: site-invite-resident, ay3-user-access, ay3-whatsapp-invite, ay3-site-open-claims, ay3-password-login, ay3-access-requests und ay3-admin-recovery.
- Alle sieben Live-index.ts-Dateien sind bytegenau in main vorhanden. Zusätzliche Module sind ebenfalls im Repo vorhanden; teilweise abweichende relative Importpfade bei der Deployment-Verpackung müssen beim Wiederaufbau berücksichtigt werden.
- Privater Google-Drive-Ordner AyaPark2-Backups, nicht geteilt: vier verschlüsselte .dump.age-Dateien und eine test.age-Datei gefunden.
- Jüngste gefundene Datenbanksicherung: ayapark2-20261030-055736.dump.age, 720287 Bytes.
- Der separate DB-Backup-Workflow auf main existiert bereits und darf nicht doppelt eingerichtet werden. Seine .dump.age-Datei enthält weder ein Git-Bundle noch Storage-Dateibytes oder alle Plattformkonfigurationen.
- Der vollständige .tar.age-Backupentwurf in Draft-PR #52 bleibt gesperrt. Der Vergleich mit main zeigte 14 Commits voraus und 82 zurück; vor Merge zwingend synchronisieren.

## 2. Neues Offline-Prüfwerkzeug

Datei: scripts/backup/check_dump_offline.py
Tests: scripts/backup/test_check_dump_offline.py

Die Prüfung verarbeitet ausschließlich einen bereits lokal entschlüsselten PostgreSQL-Custom-Dump. Sie ruft PostgreSQL 17 pg_restore --version und pg_restore --list auf, prüft Kern-Tabellendaten und die private Guard-Funktion und führt einen vollständigen lesenden Payload-Scan über pg_restore --file /dev/null durch. Sie baut **keine Datenbankverbindung** auf und schreibt keine SQL-Datei.

Ergebnis: sechs synthetische Python-Unittests bestanden. Weder ein echter Dump noch ein echter Restore wurde damit getestet.

## 3. Nächster lokaler Ablauf (Mac; keine privaten Dateien teilen)

1. Bei Google Cloud die Audience-Einstellung der eigenen Backup-OAuth-App kontrollieren: Testing oder In production. Nicht ohne Prüfung umstellen. Keine Tokens mitteilen.
2. Die jüngste .dump.age-Datei aus AyaPark2-Backups herunterladen und einem erfolgreichen Actions-Lauf zuordnen.
3. Lokal age und PostgreSQL-17-pg_restore aufrufen und ihre Version prüfen.
4. Einen geschützten Ordner außerhalb von iCloud/Drive/Dropbox-Synchronisierung einrichten. Im Terminal vorher umask 077 ausführen.
5. Mit dem bereits bestehenden privaten age-Schlüssel **nur lokal** entschlüsseln:

    age --decrypt --identity "/SICHERER/PFAD/identity.txt" --output "/LOKAL/geschuetzt/ayapark2.dump" "/Downloads/ayapark2-20261030-055736.dump.age"

6. Im Checkout dieses Entwicklungsbranches ausführen:

    python3 scripts/backup/check_dump_offline.py "/LOKAL/geschuetzt/ayapark2.dump"

7. Nur Erfolg/Fehler, PostgreSQL-Version und OAuth-Status melden; keine Schlüssel, Dump-Dateien, vollständigen Inhaltslisten oder privaten Daten in Chat oder GitHub übertragen.

Auch ein erfolgreicher Offline-Scan beweist keine Datenbank-Wiederherstellung, funktionierende Authentifizierung oder RLS.

## 4. Verbindliche, noch offene Abnahmetests

- [ ] Echtes verschlüsseltes Backup lokal entschlüsselt und komplett offline eingelesen; Datei und Actions-Lauf zugeordnet.
- [ ] Frische, leere, kompatible, **isolierte** PostgreSQL-17/Supabase-Testumgebung bestimmt. Das produktive Projekt und ein eventuell bereits verwendetes Auth-Staging dürfen nicht Restore-Ziel sein.
- [ ] Extensions, Custom-Rollen, Grants, ACLs, Default Privileges, Auth-/Storage-Versionsunterschiede und Wiederherstellungsreihenfolge dokumentiert. Der aktive Dump verwendet --no-owner --no-acl und enthält allein nicht alle Berechtigungsinformationen.
- [ ] Datenbankschema und Daten wirklich importiert; Tabellen- und Beziehungsprüfungen gegen denselben Snapshot bestanden.
- [ ] Auth-Benutzer, Identitäten, Login und Recovery mit rein isolierten Testzugängen geprüft.
- [ ] Zugriffsverweigerung und erlaubte Aktionen per RLS für anonymous, Bewohner A/B, Verwaltung und Superadmin isoliert getestet.
- [ ] Storage-Metadaten und private synthetische Testdateien samt Policies in isolierter Umgebung wiederhergestellt.
- [ ] Git-Bundle ohne Ursprung-GitHub rekonstruiert, exakte Refs/Objekte verifiziert; Frontend und alle sieben Edge Functions einschließlich relativer Imports startfähig.
- [ ] Keine Live-Callbacks, SMS, E-Mails, Webhooks oder Cron-Jobs aus dem Testsystem.
- [ ] Portabilität zu self-hosted Supabase/anderem Hoster isoliert belegt; erforderliche neue Keys/OAuth/SMTP/URLs dokumentiert und getrennt gesichert.
- [ ] Verschlüsseltes gesamtes .tar.age-Archiv extern hochgeladen, unabhängig heruntergeladen und vollständig wiederhergestellt.
- [ ] Backup-Monitoring, Retention, Restore-Intervall, KVKK und tolerierbarer Datenverlust geklärt.
- [ ] Erst danach ausdrückliche Nutzerfreigabe für Merge und Aktivierung des gesperrten Gesamtbackup-Workflows.

## 5. Quellen

- https://github.com/kemcap/ayapark2/blob/main/.github/workflows/ayapark2-database-backup.yml
- https://github.com/kemcap/ayapark2/pull/52
- https://supabase.com/docs/guides/self-hosting/restore-from-platform
- docs/BACKUP-RESTORE-PREPARATION.md

**Kein echter Restore wurde durchgeführt. Keine Live-Systemänderung, kein Merge, kein neuer Workflow-Lauf oder neue Aktivierung bei diesem Arbeitsschritt.**


## 6. Cloud-first-Ausführung (Fortsetzung 30.10.2026)

**Festlegung:** Beibehaltung des privaten Google-Drive-Ordners AyaPark2-Backups als externes Backupziel. Google-Cloud-Projekt stellt bisher nur OAuth für Drive bereit; weder ein neuer Google-Cloud-Storage-Bucket noch ein kostenpflichtiger Dienst wird eingerichtet. Es gibt **keine Notwendigkeit, den Mac als Backupspeicher zu verwenden**.

**Neuer synthetischer Integrationstest**, nur auf dem Entwicklungsbranch:
- `scripts/backup/test_synthetic_restore.sh`: erstellt mit einem temporären PostgreSQL-17-Docker-Container ausschließlich künstliche Auth-, Wohnungs-, Buchungs- und RLS-Daten; exportiert im Umfang des aktiven DB-Workflows, verschlüsselt mit einem *frisch erzeugten, nach Test gelöschten* age-Testschlüssel, entschlüsselt, kontrolliert das Archiv und importiert es in eine neue leere Datenbank. Prüft anschließend Beispieldaten und erlaubte/verbotene RLS-Sichten.
- `.github/workflows/phase1-synthetic-restore.yml`: führt ausschließlich die synthetischen Unit-/Integrationstests bei Pull Requests in den Backup-Entwicklungsbranch aus. Berechtigung nur `contents: read`. **Keine Produktionssecrets, keine Google-Drive-Token, keine Supabase-URLs, keine Einwohnerdaten; keine tägliche Zeitplanung.**
- Für die zusätzlichen synthetischen Docker-/age-Tests ist bislang **kein erfolgreich abgeschlossener CI-Lauf nachgewiesen**. Sie bleiben *vorbereitet / CI ausstehend*. Die sechs Unit-Tests des Offline-Dump-Skripts wurden in der Entwicklungsumgebung eigenständig erfolgreich ausgeführt.

**Wichtigste Sicherheitsgrenze:** Der tatsächliche produktive .dump.age-Dump kann mit dem in GitHub abgelegten öffentlichen age-Schlüssel **nicht** entschlüsselt werden. Ein echter Cloud-Restore benötigt die Entschlüsselungsfähigkeit in einer gesondert geschützten temporären Umgebung und eine ausdrückliche Freigabe für den Umgang mit sensiblen Auth-/Bewohner-/Finanzdaten dort. Der private Wiederherstellungsschlüssel bleibt nach bisheriger Vereinbarung ausschließlich beim Benutzer; er wird **nicht** in GitHub-Secrets, Drive oder ChatGPT hochgeladen. Ohne eine sichere, ausdrücklich genehmigte Schlüsselübergabe oder lokale Entschlüsselung ist der vollständige *echte* Cloud-Restore technisch nicht durchführbar.

**Nächster Ablauf nach synthetischem CI:** 1) CI-Lauf und Fehler vollständig überprüfen/korrigieren; 2) OAuth-Status prüfen; 3) gesichertes, isoliertes reales Restore-Ziel und sichere Schlüsselverwendung gemeinsam festlegen, ohne Live-Daten zu verändern; 4) echten Restore mit Auth-/RLS-/Storage-/Git-Checks nachweisen; 5) erst dann Gesamtarchiv und Backupautomatisierung nach Freigabe aktivieren. Real-Restore, Gesamtsnapshot und Aktivierung bleiben offen.


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
