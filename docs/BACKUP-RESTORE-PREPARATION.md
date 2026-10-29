# AyaPark 2 – echte Sicherung prüfen und Restore vorbereiten

Stand: 30.10.2026 (Europe/Istanbul). **Nur Vorbereitung; kein Restore ausgeführt.**

## 1. Verifizierter Ausgangspunkt

- main: `2c55873506c1e132067876efae12cdc6e42fa358`; Pages-Lauf [40955767893](https://github.com/kemcap/ayapark2/actions/runs/40955767893) erfolgreich.
- DB-Workflow: `.github/workflows/ayapark2-database-backup.yml`. Zeitplan 00:17 UTC / 03:17 Istanbul, ohne Aktivierungsvariable des PR #52.
- [Backup-Job 123698719576](https://github.com/kemcap/ayapark2/actions/runs/40945224444): Export/Prüfung/Verschlüsselung/Upload-Schritt erfolgreich. Das belegt diesen Lauf, keine lückenlose tägliche Laufhistorie.
- PR #52: offen, Draft; geprüfter Head `c1c08843169a225ee562b45c5cc92f34972a048b`, 10 Commits voraus und 51 hinter main. Vor Integration neuen Vergleich durchführen.
- Nutzerbestätigte Schlüssel-/rclone-Einrichtung laut Roadmap übernehmen; privaten Schlüssel nicht erneut erzeugen oder anfordern.

## 2. Zwei unterschiedliche Sicherungsformate

| Sicherung | Inhalt | Lokale Prüfung |
|---|---|---|
| Aktives main: `ayapark2-YYYYMMDD-HHMMSS.dump.age` | Ein PostgreSQL-Custom-Dump mit public, auth, ay2_private, ay_auth_private; ohne Owner/ACL | age entschlüsseln, dann PostgreSQL-17-`pg_restore --list` |
| Entwurf #52: `ayapark2-….tar.age` | Paket mit getrennten DB-Dumps, Storage-Dateien, Git-Bundle und Inventar | age entschlüsseln, dann `verify_snapshot.py`; vollständiger Restore zusätzlich erforderlich |

Den aktiven Dump nicht an `verify_snapshot.py` übergeben. Ein Inhaltsverzeichnis beweist weder erfolgreiche Wiederherstellung noch korrekte Berechtigungen.

## 3. Nächste Schritte auf Kemals Mac

1. Google Cloud Console → Projekt der eigenen Backup-OAuth-App → **Google Auth Platform → Audience / Zielgruppe**. Prüfen, ob die externe App noch im Testmodus oder bereits in Produktion ist. Nur den Status mitteilen, keine Client-Secrets oder Tokens. Nichts neu autorisieren oder umstellen, bevor der Status geklärt ist.
2. Im privaten Drive-Ordner **AyaPark2-Backups** die jüngste erfolgreich hochgeladene Datei mit Endung `.dump.age` herunterladen. Den Dateinamen mit dem zugehörigen erfolgreichen Actions-Lauf abgleichen.
3. Terminal öffnen. Werkzeuge und Versionen prüfen:
   ```sh
   command -v age
   command -v pg_restore
   pg_restore --version
   ```
   Für diese Prüfung PostgreSQL 17 verwenden. Fehlt pg_restore oder ist es älter, zuerst den passenden Client bereitstellen; keinen Restoreversuch starten.
4. Einen neuen lokalen Arbeitsordner auf einem geschützten, möglichst verschlüsselten Datenträger anlegen, außerhalb von iCloud-/Drive-/Dropbox-Synchronisierung. Mit `umask 077` arbeiten. Der entschlüsselte Dump enthält personenbezogene Finanz- und Auth-Daten.
5. In den Befehlen unten die drei Pfade durch tatsächliche lokale Pfade ersetzen. Die Ausgabedateien dürfen noch nicht existieren. Die private Schlüsseldatei bleibt an ihrem sicheren Ort und wird ausschließlich lokal gelesen:
   ```sh
   umask 077
   age --decrypt --identity "/PFAD/ZUR/BESTEHENDEN/identity.txt" \
     --output "/LOKALER/PRUEFORDNER/ayapark2.dump" \
     "/PFAD/ZUM/DOWNLOAD/ayapark2-ZEITSTEMPEL.dump.age"
   pg_restore --list "/LOKALER/PRUEFORDNER/ayapark2.dump" \
     > "/LOKALER/PRUEFORDNER/archive-index.txt"
   ```
   Der zweite Befehl liest nur die lokale Datei; er verbindet sich mit keiner Datenbank. Bei einem Fehler stoppen. Weder Dump, Schlüssel noch vollständiges Inhaltsverzeichnis in den Chat hochladen.
6. Lokal kontrollieren, dass Einträge für `auth users`, `public ay2_entries`, `public site_units`, `ay2_private guard_person_identity` sowie Daten in `ay_auth_private` vorhanden sind. Nur Erfolg/Fehler und Werkzeugversion mitteilen; Fehlermeldungen vorher auf vertrauliche Daten prüfen.

## 4. Isolierter Restore – vorbereitetes Prüfprotokoll

**Noch nicht ausgeführt.** Vor dem Import ein neues, leeres, lokal isoliertes Supabase-Testsystem mit kompatibler PostgreSQL-/Auth-Version und eigenen Testzugängen bestimmen. Bestehendes Auth-Staging ist ohne gesonderte Bestandsprüfung kein leeres Restore-Ziel. Die Produktions-Projekt-ID `eisozwhhinqszfikemot` ist als Ziel verboten.

- Keine Produktions-URLs, SMTP-Zugänge, Webhooks, Provider-Secrets, Cron-Aufträge oder Push-/E-Mail-Versand aktivieren. Zielzugänge und Browser-Origin ausdrücklich prüfen.
- PostgreSQL-/Extension-Versionen, Custom-Rollen, ACLs, Default-Privileges und verwaltete Auth-Schemas inventarisieren. main exportiert ohne Owner/ACL und ohne separate globale Rollen; Originalrechte sind daher nicht allein aus dem Dump bewiesen.
- Importplan für Anwendungsschemas und Auth-Tabellen getrennt prüfen; verwaltete Auth-Struktur nicht blind über eine andere Supabase-Version schreiben. Erst danach konkrete Restore-Befehle erstellen.
- Vor Import Wiederherstellungsziel, Versionen, Quelllauf/Dateihash und Abbruchkriterien dokumentieren.
- Danach Tabellenvollständigkeit, exakte Datensätze/Beziehungen, Wohnungen, Forderungen, Bankbewegungen und Zahlungszuordnungen gegen denselben Snapshot prüfen. Historische Bestandszahlen sind keine Sollwerte für neue Dumps.
- RLS mit Bewohner A/B, Verwaltung (fünf Einzelrechte), Superadmin und anonymem Zugriff prüfen. Testsitzungen und Änderungen nur im isolierten Ziel.
- Auth-Benutzer/Identitäten/Passworthashes und Login-/Recovery-Funktion prüfen, ohne echte Bewohner anzuschreiben oder Produktionspasswörter anzufordern. Falls hierfür ein synthetisches Testkonto nötig ist, ausschließlich im isolierten Ziel anlegen.
- Storage mit synthetischen Dateien, Metadaten und privaten Bucket-Policies separat testen. Aktiver DB-Dump enthält keine Storage-Objekte.
- Website aus gesichertem Git-Bundle ohne Zugriff auf ursprüngliches GitHub starten; Edge Functions mit separat dokumentierter Konfiguration bereitstellen und testen.
- Ergebnis pro Prüfung: vorbereitet / bestanden / fehlgeschlagen / nicht geprüft. Erst alle notwendigen Nachweise erlauben Gesamtfreigabe. Keine Aktivierung oder Veröffentlichung ohne ausdrückliche Zustimmung.

## 5. Noch offene Nachweise

OAuth-Dauerbetrieb; echte Dump-Entschlüsselung; DB-/Auth-/RLS-/Storage-Restore; vollständiges Konfigurationsinventar; Rollen-/ACL-Rekonstruktion; vollständiger externer Gesamtsnapshot und Download; Anbieterwechsel; Aufbewahrung, Monitoring, Wiederholungsintervalle und maximal tolerierbarer Datenverlust.

**Nächster konkreter Schritt:** Nutzer führt Abschnitt 3 lokal durch; parallel kann das nicht geheime Plattforminventar ergänzt werden. Danach kompatibles isoliertes Ziel und versionsgebundenen Importplan festlegen. Den aktiven DB-Workflow nicht nochmals einrichten, den Entwurf nicht aktivieren.
