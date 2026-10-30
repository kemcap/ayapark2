# AyaPark 2 — Wiederaufbau-Inventar ohne Geheimnisse

Stand: 29.10.2026. Dies ist eine Checkliste, **kein Export aktueller Live-Einstellungen**.
Unbeobachtete Werte müssen vor Backup-Aktivierung separat erhoben werden. Niemals
Passwörter, Schlüssel, Tokens, SMTP-Passwörter oder OAuth-Secrets hier eintragen.

| Baustein | Bekannte Grundlage / Wiederaufbau |
|---|---|
| Quellcode | `source/repository.bundle`, `source/refs.json`, `source/head-tree.txt`; alle im Checkout vorhandenen Referenzen mit erreichbarer Historie |
| Website/Design | Root-HTML, CSS, JavaScript und `assets/` im Git-Bundle; keine lokalen unversionierten Änderungen |
| GitHub Pages | Repository `kemcap/ayapark2`, Produktivbranch `main`, Root-Verzeichnis laut Projekt-README; Pages-Einstellungen und Domains vor Aktivierung live bestätigen |
| Öffentliche URL | `https://kemcap.github.io/ayapark2/`; bei Anbieterwechsel neue Zieladresse und Redirects konfigurieren |
| Backend | Supabase-Projekt `eisozwhhinqszfikemot`; zuvor PostgreSQL 17.11 erfasst. Aktuelle Serverversion/Erweiterungen vor Restore neu erfassen |
| DB-Struktur/RLS | `db/application.dump`; Migrationen und SQL-Dateien unter `supabase/` im Bundle; verwaltete Schemas nicht blind importieren |
| Auth-Daten | `db/auth-data.dump`; technische Plattformkompatibilität und Login nach Restore separat prüfen |
| Auth-Einstellungen | Site URL, Redirect-Allowlist, E-Mail-Vorlagen, OTP-Länge/TTL, Sessions, Registrierungs-/Passwortregeln: Livewerte noch nicht in diesem Inventar erfasst |
| SMTP/OAuth | Aktivierte Provider, Absender, Host/Port, Client-IDs und Redirects noch zu erfassen. Zugangsdaten separat neu setzen |
| Storage | `db/storage-metadata.dump` und `storage/index.json` plus Objektdateien; Bucket-Einstellungen, Limits und Policies nach Restore überprüfen |
| Edge Functions | Quellcode unter `supabase/functions/`; Deploymentstatus, Runtime-Konfiguration und Secret-Namen aktuell separat prüfen |
| CI/Automation | `.github/workflows/` im Bundle. Backup-Aktivierung bleibt bis vollständigem Restore-Test und Nutzerfreigabe gesperrt |
| Anbieterwechsel | Neue Datenbank-/Auth-/Storage-/Function-Instanz bereitstellen, kompatible Supabase-Dienste bzw. Self-Hosting einrichten, URLs/Schlüssel anpassen und alle Funktionen isoliert prüfen |

## Secrets separat wiederherstellen oder neu ausstellen

- Supabase-Datenbankpasswort/Verbindungs-URL und Betreiberzugang.
- API-/Service-Schlüssel; Frontend-Publishable-Key und Backend-URL kontrolliert ersetzen.
- Edge-Function-Secrets: **tatsächliche Namensliste noch live zu erheben**, Werte nicht exportieren.
- SMTP-Zugang und OAuth-Client-Secrets der tatsächlich aktiven Provider.
- GitHub-Repository-/Deploymentzugriff und erforderliche Actions-Secrets.
- `AYAPARK_BACKUP_DB_URL`, `AYAPARK_BACKUP_SERVICE_ROLE_KEY`, `AYAPARK_BACKUP_RCLONE_CONFIG_B64`.
- `AYAPARK_BACKUP_AGE_RECIPIENT`, `AYAPARK_BACKUP_REMOTE_DEST`; `AYAPARK_BACKUP_ENABLED` bleibt aus.
- Privater age-Schlüssel außerhalb des Backups und außerhalb von GitHub aufbewahren;
  Drive-/rclone-Autorisierung unabhängig wiederherstellen.

## Quellcode ohne ursprüngliches GitHub wiederherstellen

Nach privater Entschlüsselung und bestandener Archiv-Integritätsprüfung, nur in einem
neuen isolierten Verzeichnis mit selbst erstelltem vertrauenswürdigem Backup:

```sh
git clone --mirror /isoliert/source/repository.bundle /isoliert/ayapark2.git
git -C /isoliert/ayapark2.git bundle verify /isoliert/source/repository.bundle
git -C /isoliert/ayapark2.git fsck --full --strict
git clone /isoliert/ayapark2.git /isoliert/website
git -C /isoliert/website switch --detach HEAD
```

`refs.json` enthält die Soll-Referenzen und den exakten HEAD-Commit. Die HEAD-Version
kann der Backup-Branch sein; für die Produktivversion den gesicherten `main`-Commit
auswählen. Remote-Tracking-Referenzen bleiben im Spiegel erhalten; beispielsweise
`refs/remotes/origin/main` kann bei Bedarf als lokaler Branch rekonstruiert werden.
Keine Remotes aus `.git/config` oder Zugangsdaten werden mitgesichert. Ein neuer
Git-Host kann aus diesem Spiegel befüllt werden, sobald sein Zugriff eingerichtet ist.

Der Export verweigert flache Historien sowie erreichbare Submodule oder LFS-Pointer,
da deren externe Dateien sonst fehlen könnten. Er sichert erreichbare Git-Objekte,
keine gelöschten unerreichbaren Objekte, Issues, PR-Kommentare, Actions-Logs,
Release-Anhänge, Secrets oder unversionierte Dateien.


## Externe Originaldokumente außerhalb der App (Abgleich 30.10.2026)

Das automatisierte Gesamtbackup erfasst Git-Objekte, definierte Datenbank-Schemas und Supabase-Storage-Buckets. **Dateien, die nur in ChatGPT-Projektdateien, lokalen Mac-Ordnern, einem externen Verwaltungsprogramm, privaten E-Mails oder nicht erfassten Drive-Ordnern liegen, werden dadurch nicht automatisch mitgesichert.** Dies betrifft potenziell Verwaltungs-, Banken-, Abrechnungs- und Karar-Defteri-Originale.

- Vor Phase-1-Abnahme Inventar der relevanten Originaldokumente und ihren aktuellen Speicherort erfassen (ohne die PDFs oder personenbezogene Inhalte in dieses Repo zu kopieren).
- Diese Dokumente entweder im späteren privaten Storage-Archiv mit RLS aufnehmen und dessen Datei-Backup testen oder separat verschlüsselt an mindestens einem unabhängigen Ort archivieren.
- Originaldateien und rechtsverbindliche Papierunterlagen dürfen nicht durch die App-Kopie ersetzt werden.
- Bestehender Stand: Supabase Storage live mit 0 Buckets und 0 Objekten geprüft; die aktuell nachgewiesenen Drive-Dateien sind DB-Dumps und eine Testdatei. **Die Originaldokumente sind damit nicht als gesichert nachgewiesen.**
