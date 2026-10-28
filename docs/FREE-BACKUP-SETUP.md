# AyaPark 2 – kostenloser Backup-Prototyp (Phase 1)

Status: **PREPARED / NICHT AKTIVIERT**. Stand: 28.10.2026.
Branch: `feature/free-backup-preparation-20261028`. **Nicht mit `main` mergen, bevor die Prüfungen abgeschlossen und ausdrücklich freigegeben sind.**

## 1. Was existiert bereits?

- `.github/workflows/free-daily-backup.yml` startet nach einer **späteren Freigabe** täglich um 04:41 Uhr türkischer Zeit (01:41 UTC).
- Der Backup-Job ist **hart gesperrt**, solange die GitHub-Repository-Variable `AYAPARK_BACKUP_ENABLED` nicht ausdrücklich auf `true` gesetzt wurde. Diese Variable wird jetzt **nicht** erstellt.
- `scripts/backup/backup.sh` liest `public`, `ay2_private`, `ay_auth_private`, sowie separat Daten aus `auth` und Storage-Metadaten. Für die derzeitige PostgreSQL-17-Datenbank wird ein Postgres-17-`pg_dump` im Docker-Container verwendet.
- `scripts/backup/export_storage.py` lädt tatsächliche Dateien separat lesend über die Storage-API herunter und erstellt ein Manifest. Derzeit hat das Produktivprojekt **0 Storage-Buckets**. Dieses Skript ist für spätere Buckets vorbereitet und muss bei vorhandenen Dateien separat getestet werden.
- Die Ausgabedateien und Prüfsummen werden in einen Stream gepackt und sofort mittels `age` verschlüsselt. **Keine unverschlüsselten Sicherungen werden im GitHub-Repository oder in GitHub Actions Artifacts gespeichert.**
- `rclone` lädt nur die **verschlüsselte** Sicherung zum externen Speicher hoch und prüft anschließend, ob der Ziel-Dateiname aufgelistet wird. Eine separate vollständige Download-/Restoreprüfung folgt noch.
- `scripts/backup/verify_snapshot.py` kontrolliert die Integrität des nach privater Entschlüsselung erzeugten Archivs; es **stellt keine Datenbank wieder her**.

## 2. Warum ist diese Vorbereitung noch nicht produktionsreif?

Der Job wurde mit **keiner echten Supabase-Verbindung** ausgeführt. Offen sind insbesondere:

1. tatsächliche Auth-/Storage-Dump-Berechtigungen und Exportvollständigkeit;
2. read-only Verbindung über Supabase **Session Pooler**, nicht Transaction Pooler;
3. verschlüsselter Download, Integritätsprüfung und echter Wiederherstellungstest in einem **isolierten** Projekt;
4. Prüfung, ob alle verwalteten Auth-Daten und benutzerdefinierten Datenbankobjekte in einer neuen Supabase-Umgebung wiederherstellbar sind;
5. späterer Test mit echten, aber nicht personenbezogenen Beispiel-Dateien in einem Test-Storage-Bucket;
6. Aufbewahrung und Speicherverbrauch auf dem kostenlosen Ziel überwachen; automatische Löschung absichtlich noch nicht vorgesehen;
7. mögliche rechtliche Anforderungen (KVKK) an die grenzüberschreitende Speicherung verschlüsselter personenbezogener Daten beurteilen.

Ein logischer Dump ist **nicht** gleich einem vollständigen Wiederherstellungspunkt von Supabase: Plattformkonfiguration, E-Mail-Provider, Edge-Function-Secrets, API-Schlüssel und die verwaltete Auth-Infrastruktur müssen gesondert dokumentiert beziehungsweise wiederhergestellt werden. Niemals ein Auth-Dump ungeprüft direkt in das produktive System importieren.

## 3. Benötigte kostenlose Bausteine

- **Supabase Free** – bleibt unverändert.
- **GitHub Actions** – aus dem verfügbaren kostenfreien Minutenkontingent.
- **Google Drive** oder ein vergleichbares rclone-kompatibles Ziel mit genügend kostenlosem Speicher.
- **age** – kostenloses, authentifiziertes Verschlüsselungswerkzeug. Der private Entschlüsselungsschlüssel verbleibt **außerhalb von GitHub und Supabase**.
- **rclone** – kostenloser Client, der nur die verschlüsselte Sicherung überträgt.

Für Google Drive erfordert rclone aktuell die Einrichtung eines eigenen Google-OAuth-Client-IDs/-Secrets. Die frühere, gemeinsam benutzte rclone-Client-ID wird 2026 eingestellt. Für die erstmalige Einrichtung ist ein Computer wesentlich einfacher als ein Smartphone.

## 4. Anleitung – zuerst vorbereiten, NICHT aktivieren

### Schritt A: Privaten age-Schlüssel auf deinem Computer erstellen

1. `age` lokal installieren.
2. Auf deinem eigenen, geschützten Computer ausführen: `age-keygen -o ayapark2-recovery-identity.txt`.
3. Die ausgegebene **public key / recipient**-Zeile beginnend mit `age1` bereithalten; die Datei `ayapark2-recovery-identity.txt` enthält den **privaten** Schlüssel und darf **niemals** in GitHub, Drive, WhatsApp oder diesen Chat kopiert werden.
4. Den privaten Schlüssel an mindestens zwei getrennten geschützten Orten sichern. Ohne ihn ist eine verschlüsselte Sicherung nicht entschlüsselbar.

### Schritt B: Google Drive für rclone einrichten

1. Auf einem eigenen Gerät `rclone` installieren.
2. Bei Google einen eigenen OAuth-Client für rclone einrichten, anschließend `rclone config` starten und einen Remote mit dem Namen `drive` für Google Drive anlegen. Nicht den vor der Einstellung stehenden geteilten Client verwenden.
3. `rclone lsd drive:` testen. Es ist keine produktive AyaPark-Datenbankverbindung notwendig.
4. Die lokale `rclone.conf` enthält Zugangsdaten und Refresh-Token. Sie muss als **geheimer Inhalt** behandelt werden. Ihre Base64-Darstellung ist **keine Verschlüsselung** und dient ausschließlich dem sicheren Transport in ein GitHub-Secret.
5. Das gewünschte Zielverzeichnis z. B. `drive:ayapark2-backups` festlegen. Nicht öffentlich teilen.

### Schritt C: GitHub-Konfiguration (erst nach Prüfung)

In GitHub `kemcap/ayapark2` → **Settings → Secrets and variables → Actions**:

| Typ | Name | Inhalt |
|---|---|---|
| Repository Secret | `AYAPARK_BACKUP_DB_URL` | Supabase **Session Pooler**-Postgres-Verbindungs-URL des produktiven Projekts, mit bestehenden Zugangsdaten und SSL |
| Repository Secret | `AYAPARK_BACKUP_SERVICE_ROLE_KEY` | Serverseitiger Supabase-Service-Schlüssel für ausschließlich lesenden Storage-Export |
| Repository Secret | `AYAPARK_BACKUP_RCLONE_CONFIG_B64` | Base64 der autorisierten rclone.conf; GitHub-Secret, **nicht** in Repository-Dateien |
| Repository Variable | `AYAPARK_BACKUP_AGE_RECIPIENT` | Öffentlicher age-Empfängerschlüssel (`age1...`) |
| Repository Variable | `AYAPARK_BACKUP_REMOTE_DEST` | Etwa `drive:ayapark2-backups` |
| Repository Variable | `AYAPARK_BACKUP_ENABLED` | **Vorläufig NICHT setzen!** Erst nach expliziter Freigabe auf `true` setzen. |

Die nötige Datenbankverbindung findest du im Supabase-Dashboard unter **Connect → Session Pooler**. Es ist nicht notwendig, bestehende Datenbankpasswörter ohne Anlass zurückzusetzen. Keine Geheimnisse als GitHub-*Variable* speichern.

GitHub-Secrets werden einem Workflow mit entsprechendem Zugriff zugänglich: Auf Branch- und Workflow-Schutz sowie begrenzte Repository-Schreibrechte achten. Der Service-Schlüssel **umgeht RLS** und darf nie in die öffentliche App eingebettet werden.

### Schritt D: Sichere Tests

1. Workflow- und Skript-Syntax ohne Zugangsdaten lokal testen.
2. Auf isolierten Testdaten prüfen, ob die Dumps, Dateiexporte, Verschlüsselung und rclone-Übertragung wie erwartet funktionieren.
3. Aus dem externen Speicher ein archiviertes Paket herunterladen.
4. Lokal entschlüsseln: `age -d -i /sicherer/pfad/ayapark2-recovery-identity.txt -o snapshot.tar ayapark2-....tar.age`.
5. Manifest und SHA-256-Werte prüfen: `python3 scripts/backup/verify_snapshot.py snapshot.tar`.
6. Die Dumpinhalte zunächst inspizieren: `tar -xf snapshot.tar -C /isolierter/ordner` und `pg_restore --list /isolierter/ordner/db/application.dump`. Nur aus **vertrauenswürdigem** selbst erstelltem Backup entpacken.
7. Anschließend eine fachlich geprüfte Wiederherstellung ausschließlich auf einem **isolierten** Testsystem durchführen. Nicht blind in ein bestehendes oder produktives Projekt einspielen.
8. Rollen, 20 Wohnungen, Forderungen, Bankdaten, Zuordnungen, Auth-Flows, RLS und Storage-Dateien kontrollieren. Für Auth und verwaltete Schemas sind unter Umständen zusätzliche platform-spezifische Restore-Schritte erforderlich.
9. Den geprüften Backupumfang, die Wiederherstellungsgrenzen und die maximal mögliche Datenverlustspanne dokumentieren.

Ein bestandener SHA-256-Test belegt **Dateiintegrität**, nicht eine erfolgreiche Anwendung-/Auth-Wiederherstellung.

### Schritt E: Aktivierung nach ausdrücklicher Freigabe

Erst nach erfolgreich abgeschlossenem Test den Workflow nach `main` übernehmen und `AYAPARK_BACKUP_ENABLED=true` setzen. GitHub führt Zeitpläne nur aus dem Standardbranch aus. Eine reine Datei im Feature-Branch führt **noch keine täglichen Backups** aus.

Anschließend einen manuellen Lauf verifizieren: GitHub → **Actions → AyaPark 2 Free Backup → Run workflow**. GitHub-Actions-Fehlermeldungen aktivieren und Sicherungsergebnisse regelmäßig prüfen. Die Speicherung auf dem Drive-Ziel kontrollieren, ebenso Quoten und Wiederherstellbarkeit.

## 5. Sicherheit, Grenzen und Kosten

- Der Backup-Job greift ausschließlich **lesend** auf Supabase zu. Das Ziel ist ein **anderes** System, und nur dort schreibt der Job neue verschlüsselte Archive.
- Das Skript ist absichtlich auf das konkrete AyaPark-Projekt beschränkt. Bei späteren Schema-/Postgres-Updates muss die Exportliste überprüft werden.
- **RLS aktiviert** ist keine Garantie für korrekte Policies. Backup-Tools mit priviligierten Zugängen sind separat abzusichern.
- Keine laufenden Kosten vorgesehen, **sofern** alle Anbieter innerhalb der jeweiligen kostenlosen Kontingente bleiben.
- Es wurde bewusst **keine automatische Backup-Löschung** eingebaut. So werden nicht vorschnell die einzigen wiederherstellbaren Sicherungen entfernt. Eine sichere Aufbewahrungs-/Löschregel folgt nach dem ersten geprüften Restore.
- Ein täglicher Snapshot kann im Ernstfall einen Datenverlust bis zum letzten erfolgreichen Backup bedeuten.
- Backups können große Mengen hochsensibler Bewohner-, Bank- und Auth-Daten enthalten. Es dürfen nur verschlüsselte Archive auf externe Cloud-Ziele übertragen werden.

## 6. Was derzeit noch nicht passiert ist

Keine neuen GitHub-Secrets/Variablen, kein Workflowlauf, kein Backup aus Produktionsdaten, keine neue Supabase-Storage-Bucket, keine neue Supabase-Policy, keine SQL-Migration, keine Veröffentlichung oder Änderung von `main`. Die Branch-Dateien sind allein ein überprüfbarer **Entwurf**.

Referenzen:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/storage/management/download-objects
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://rclone.org/drive/
