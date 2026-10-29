# AyaPark 2 – Verbindliche Projekt-Roadmap und Fortschrittsliste

Stand: 29.10.2026 · Projekt: `kemcap/ayapark2` · Produktivbranch: `main`

**Status:** Phase 0 (erste read-only Bestandsaufnahme) abgeschlossen, Sicherheitsbefunde noch zu prüfen; **Phase 1 (kostenlose und vollständige Backups) in Vorbereitung**. Noch keine Live-Daten-/Schema-/Einstellungsänderungen aufgrund dieser Roadmap.

## Arbeitsregeln

- Die **30 verbindlichen Produktentscheidungen** stehen ausführlich in `docs/AYA-PARK-2-CONTEXT-HANDOFF.md`. Diese Roadmap ist die *Abarbeitungsliste*, nicht ein Ersatz für die Spezifikation.
- Schritt für Schritt; nach jeder Aufgabe Status, Ergebnis, Nachweise, offene Fragen und **den nächsten konkreten Schritt** eintragen.
- Nur nach echten Nachweisen ein Kästchen abhaken. Code im Entwurfsbranch bedeutet **nicht**, dass etwas produktiv eingerichtet oder getestet ist.
- Keine produktive Datenbankänderung, RLS-Freigabe, Auth-/Storage-Einstellung, Veröffentlichung oder Backup-Aktivierung ohne Freigabe des Benutzers.
- Vor kritischen Schritten: geprüfte Sicherung und isolierte Wiederherstellungsprobe.
- **Supabase Free behalten**; keinen kostenpflichtigen Dienst ohne gesonderte Entscheidung aktivieren.
- Bei Chatwechsel zuerst beide Dateien lesen, den tatsächlichen GitHub-/Supabase-Stand neu prüfen und beim nächsten offenen Punkt fortfahren.
- Änderungen an GitHub und den Dateien im ChatGPT-Projekt **synchronisieren sich nicht automatisch**. GitHub ist die führende, versionierte Fassung; ChatGPT-Projektdateien bei wichtigen Meilensteinen neu hochladen.

## Legende

- `[x]` abgeschlossen und anhand angegebener Grundlage bestätigt.
- `[ ]` offen; auch vorbereitete, aber nicht getestete Änderungen bleiben offen.
- `BLOCKIERT` benötigt vorher einen anderen Schritt oder ausdrückliche Freigabe.

## Phase 0 – Bestandsaufnahme und Sicherheitsgrundlage (P0)

- [x] GitHub `main` auf Commit `a4a9d8c44b56d32c0aa0ac73aa6eb613ae19b89e` (28.10.) schreibgeschützt geprüft.
- [x] Supabase-Produktivprojekt read-only geprüft: PostgreSQL 17.11, 2 Blöcke/20 Wohnungen, 39 Public-Tabellen (RLS aktiviert).
- [x] Vorhandene Finanz-/Anmelde-Module und vorhandenen CI-Workflow im Code identifiziert.
- [x] Zum Prüfzeitpunkt: keine Storage-Buckets/Storage-Dateien; kein täglicher Backup-Workflow in `main`.
- [ ] Aktuelles Live-Deployment, Weiterleitung von `/old/` und möglicherweise öffentlich erreichbare historische Dateien gezielt überprüfen.
- [ ] Supabase-Advisor-Hinweise zu `SECURITY DEFINER`, Auth-Passwortschutz und drei RLS-Tabellen ohne Policy fachlich prüfen; nicht pauschal Zugriffsrechte erweitern.
- [ ] Verbindliche Backupprozedur inklusive Restore-Ziel, maximal tolerierbarem Datenverlust, Betreiberkontakten und Prüfkriterien festhalten.

## Phase 1 – Vollständige portable Backups (P0; AKTIV)

Entwicklungsbranch `feature/free-backup-preparation-20261028`, **Draft PR #52**: https://github.com/kemcap/ayapark2/pull/52

### 1.1 Entwurf – teilweise erledigt

- [x] Separaten Branch und Draft PR anlegen, ohne `main` zu verändern.
- [x] Standardmäßig gesperrten GitHub-Actions-Workflow anlegen (`AYAPARK_BACKUP_ENABLED` nicht gesetzt).
- [x] Read-only-Skriptentwürfe für PostgreSQL, Auth-Daten, Storage-Metadaten und Datei-Downloads bereitstellen.
- [x] Skript für `age`-Verschlüsselung, externen `rclone`-Upload, Prüfsummen und Offline-Integritätskontrolle bereitstellen.
- [x] Sicherheits-/Einrichtungsanleitung `docs/FREE-BACKUP-SETUP.md` erstellen.
- [ ] Skripte statisch prüfen und mit synthetischen isolierten Beispieldaten tatsächlich testen.

### 1.2 Portabilität vollständig machen – **NÄCHSTE TECHNISCHE AUFGABE**

- [x] Git-Bundle aller im vollständigen Checkout vorhandenen Referenzen und erreichbaren Historie in den **verschlüsselten** Sicherungsprozess integriert; isolierter Git-Restore getestet. Verschlüsselungs-/Offsite-Rundlauf bleibt in 1.4 offen.
- [x] Versionierte Website, HTML, CSS, JS, Assets, Design und Edge-Function-Code im Git-Bundle erfasst; Ref-/Tree-Inventar und unabhängige Wiederherstellung geprüft.
- [ ] Infrastruktur-/Konfigurationsinventar ohne Geheimnisse vervollständigen (Checkliste `docs/BACKUP-RECOVERY-INVENTORY.md` ergänzt; Livewerte noch offen): GitHub Pages, Supabase-Projekt-, Auth-/SMTP-/OAuth- und Storage-Einstellungen; dokumentieren, welche Secrets bei Umzug *neu gesetzt* werden müssen.
- [ ] Prüfen, dass Backup auch bei Totalverlust von GitHub und bei Supabase-Migration auf Self-Hosting nutzbar ist.
- [x] Git-Bundle-Inhalt und Wiederherstellung in ein **neues isoliertes** Repository nachgewiesen: 6 Offline-Integrationstests; zusätzlich tatsächliches Repo mit 62 Referenzen und Git-Objektprüfung (`fsck --full --strict`).

### 1.3 Einmalige Nutzer-Einrichtung (noch offen)

- [x] Privaten Google-Drive-Ordner `AyaPark2-Backups` vom Benutzer angelegt.
- [ ] age-Schlüsselpaar auf dem eigenen Computer erzeugen; privaten Schlüssel getrennt sicher verwahren und nie teilen.
- [ ] rclone installieren, eigenen Google-Drive-OAuth-Zugang einrichten, Lesezugriff auf den Ordner prüfen.
- [ ] Google-OAuth-Status für langfristige unbeaufsichtigte Nutzung prüfen.
- [ ] Nur nach Anweisung und Review: GitHub Secrets/Variablen für verschlüsselte Remote-Backups sicher konfigurieren; **Aktivierungsvariable bleibt aus**.

### 1.4 Restore-Prüfung und Freigabe (noch offen)

- [ ] Exportvollständigkeit der Anwendungsschemas, Rollen, Auth-Daten und RLS testen; Supabase-verwaltete Schemas nicht blind restaurieren.
- [ ] Verschlüsselten Export in externem Speicher hochladen und wieder herunterladen, Entschlüsselung und SHA-256 prüfen.
- [ ] Restore-Durchlauf in **isoliertem Testsystem**: Datenbank, Personen, Buchungen, Berechtigungen, Auth und Storage-Dateien validieren.
- [ ] Separaten Wiederherstellungsplan für externen Anbieter/selbst gehostetes Supabase festhalten.
- [ ] Geheimnisbehandlung, Drive-Speichergrenzen, monatliche Sicherungsstichproben und vierteljährliche Restore-Tests klären.
- [ ] Erst nach erfolgreich dokumentierten Prüfungen: **ausdrückliche Nutzerfreigabe** für Merge nach `main` und `AYAPARK_BACKUP_ENABLED=true`.
- [ ] Erst nach Freigabe und erfolgreich nachvollzogenem realen Sicherungslauf: Automatisierung als aktiv kennzeichnen.

## Phase 2 – Personen, Rollen, Berechtigungen (P1)

- [ ] Ist/Soll-Abgleich aller drei Rollen und fünf delegierbaren Verwaltungsrechte; doppelte Implementierung vermeiden.
- [ ] Registrierung/Einladungen, Wiederherstellung, Kontaktfreigaben, Historie und RLS mit synthetischen Identitäten testen.
- [ ] Eigentümerwechsel, Mehrfachzuordnungen, Altlasten und Zutrittsentzug mit unveränderter Finanzhistorie testen.
- [ ] Barrierefreie mobile Bedienung, DE/TR und eindeutige Freigabetexte prüfen.
- [ ] Isolierter Release-Gate; keine Live-Freigabe ohne Zustimmung.

## Phase 3 – Finanzkern und Bankimporte (P1)

- [ ] Teilzahlungen, oldest-first-Zuordnung, Stornos und Schuldartgetrenntheit prüfen.
- [ ] Aidat-/Umlagen-Entwurf und Superadmin-Endfreigabe prüfen.
- [ ] PDF/CSV/XLSX-Import, Bankgebühren und Mehrfachimport-Dubletten testen.
- [ ] Abstimmung der Bankbewegungen, Salden und Zuordnung in drei getrennten Prüfschritten durchspielen.
- [ ] Finanzkorrekturen nachvollziehbar und ohne Löschen historischer Buchungen absichern.

## Phase 4 – Berichte, Abschluss, Beschlüsse (P1)

- [ ] Aggregierte öffentliche Berichte von persönlichen Details vollständig trennen.
- [ ] PDF-/Excel-Exporte, persönliche Zahlungsbelege und Monats-/Jahresabschluss-Regeln testen.
- [ ] Sonderumlage nach gültiger Beschlussgrundlage und Verteilungsschlüssel umsetzen.
- [ ] Audit-Trail für Veröffentlichung, Finanzkorrektur und Beschlussnachweise verifizieren.

## Phase 5 – Budget, Rücklagen, Liquidität (P2)

- [ ] Monats-/Jahresbudget, Reparaturplanung und 3–6-Monats-Vorschau ergänzen.
- [ ] Echte Bankliquidität von bloßen offenen Forderungen unterscheiden.
- [ ] Rücklagen-/Entnahmefreigaben und rechtliche Beschlussgrundlagen prüfen.

## Phase 6 – Einfache Verwaltungswerkzeuge (P2)

- [ ] Einfaches Dokumentenarchiv mit privaten Supabase-Storage-Buckets, Kategorien, Namenssuche, Download, Audits und RLS; kein OCR.
- [ ] Einfaches Sitzungs-/Beschlussarchiv für unterschriebene Dokumente und Karar Defteri.
- [ ] Aufgabenliste mit Verantwortlichkeit, Termin und Status.
- [ ] Manuelle Wiederholungsanlage und automatische Terminerinnerung; keine automatische neue Aufgabe.

## Wiederkehrendes Gate vor jedem produktiven Release

- [ ] Expliziter Geltungsbereich; schriftlich festhalten, welche bestehende Funktion verändert wird.
- [ ] Unabhängiges jüngstes Backup und Restore-Weg verifiziert.
- [ ] Tests in isolierter Umgebung erfolgreich; keine Live-Testbuchungen.
- [ ] RLS-/Auth-/Finanz-Regressionssuite bestanden; DE/TR und Mobilansichten geprüft.
- [ ] Migrations- und Rückfallplan dokumentiert; Datenerhalt nach Rollback gewährleistet.
- [ ] **Nutzerfreigabe erteilt**.
- [ ] Rollout kontrolliert durchgeführt und tatsächliche Ergebnisse protokolliert.

## Nächster Schritt – Übergabe an nächsten Chat

**Aktuell Phase 1.3 vorbereiten:** Quellcode-/Git-Bundle-Export in PR #52 integriert und isoliert wiederhergestellt. Als nächstes lokale Werkzeuge `age`/`age-keygen`/`rclone` auf dem Gerät des Benutzers prüfen und einrichten; privaten Schlüssel ausschließlich dort erzeugen. Parallel bleibt das Vervollständigen des tatsächlichen Plattforminventars aus 1.2 offen. Kein produktiver Export, Offsite-Upload oder Verschlüsselungs-/Gesamt-Restoretest wurde ausgeführt. Produktivdaten, `main`, Supabase und GitHub-Secrets unverändert lassen.

**Projektkontext:** `docs/AYA-PARK-2-CONTEXT-HANDOFF.md`
**Backup-Anleitung:** `docs/FREE-BACKUP-SETUP.md`
**Draft PR:** https://github.com/kemcap/ayapark2/pull/52

## Prüfnachweis 29.10.2026 — Teilaufgabe Quellcode

- `python3 -B scripts/backup/test_source_backup.py`: 6 bestanden (Branches/Tags/Remote-Refs, isolierter Restore ohne Ursprungsrepo, flacher Checkout, ungesicherte Änderungen, LFS-/Submodule-Abbruch, Format-2-Vollständigkeit und Korruption).
- Tatsächlicher Repository-Spiegel: 62 Referenzen, 1.676.595 Byte Bundle; unabhängiger Clone und `git fsck --full --strict` bestanden. Erfasster `origin/main`: `5ba166cf2960f68cd52eac5b63a44f477fd41645`.
- `bash -n scripts/backup/backup.sh` und `git diff --check` bestanden.
- Nur Quellcode- und Archivintegrität geprüft; keine Behauptung eines erfolgreichen Datenbank-/Auth-/Storage-Restores. Workflow bleibt deaktiviert.
