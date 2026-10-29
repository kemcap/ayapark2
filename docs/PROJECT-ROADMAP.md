# AyaPark 2 – Verbindliche Projekt-Roadmap und Fortschrittsliste

## Aktueller Arbeitsauftrag 30.10.2026 – Phase 2

Der Nutzer hat angewiesen, den Backup-Part zu überspringen und ohne erneute Einrichtung/Tests mit Phase 2 fortzufahren. Historische Backup-Nachweise bleiben unverändert; übersprungene Restore-Punkte werden nicht als neu getestet markiert.

Aktiver Branch: `feature/phase2-role-permission-audit-20261030`, aus main `2c55873506c1e132067876efae12cdc6e42fa358`. [PHASE-2-ROLES-AUDIT.md](PHASE-2-ROLES-AUDIT.md) enthält den Ist/Soll-Abgleich und die Umsetzungsreihenfolge. Neue isolierte Rechte-Matrix: 369 bestanden; bestehende SQL-Prüfungen: 226 bestanden. Allgemeine Testsuite: 249 bestanden / 13 Fehler, keine allgemeine Releasefreigabe. Keine produktiven Rechte geändert.

**Abgeschlossen im Entwicklungsstand:** vier kritische Finanzkorrekturen in command/command_v2 und Oberfläche auf Superadmin beschränkt; 28 SQL- und 2 UI-Prüfungen bestanden, keine produktive Migration. **Nächster konkreter Schritt:** fünf delegierbare Aufgabenrechte samt Entwurfs-/Freigabeablauf konsistent umsetzen. Keine Rückkehr zum Backup-Part ohne neuen Nutzerauftrag.

Stand: 29.10.2026 · Projekt: `kemcap/ayapark2` · Produktivbranch: `main`

**Aktueller Abgleich 29.10.2026:** Phase 0 historisch dokumentiert; Phase 1 teilweise produktiv umgesetzt. Im Hauptzweig läuft bereits eine separate tägliche verschlüsselte Datenbanksicherung. Vollständige portable Sicherung und isolierter DB-/Auth-/Storage-Restore bleiben offen.

## Neuerer Hauptzweig – maßgeblicher Betriebsstand

- Hauptzweig geprüft bei `ebb19543c3d0b695164fb94098fdb2c522b30200`; [Pages-Deployment 40945090260](https://github.com/kemcap/ayapark2/actions/runs/40945090260) erfolgreich.
- [DB-Workflow in main](https://github.com/kemcap/ayapark2/blob/main/.github/workflows/ayapark2-database-backup.yml): täglich **03:17 Europe/Istanbul**. [Lauf 40945224444](https://github.com/kemcap/ayapark2/actions/runs/40945224444), Backup-Job und Export-/Upload-Schritt erfolgreich.
- Dieser Workflow exportiert public/auth/ay2_private/ay_auth_private, prüft Dump-Verzeichniseinträge, verschlüsselt mit age und vergleicht den SHA-256-Hash mit dem aus Drive zurückgelesenen Ciphertext. Er ist **nicht** der gesperrte Komplettentwurf dieses PRs und benötigt dessen Aktivierungsvariable nicht.
- Kein Git-Bundle, keine Storage-Dateien und keine vollständige Plattformkonfiguration im aktiven DB-Backup. Export ohne Owner/ACL; kein fachlicher Restore aus dem erfolgreichen Job ableitbar.
- Schlüsselanlage, getrennte Schlüsselkopie und lokaler verschlüsselter Testdatei-Rundlauf wurden vom Nutzer bestätigt. OAuth-Produktionsstatus und langfristige Token-Nutzbarkeit bleiben zu bestätigen.
- PR #52 bleibt Entwurf. Alte Aussagen über fehlende Secrets/Uploads/Automatisierung beziehen sich auf dessen historischen Vorbereitungsstand und dürfen nicht auf main übertragen werden.
- Haupt-/Nebenaufträge und Überschneidungen der offenen PRs sind aktuell in [SECONDARY-CHANGES.md auf main](https://github.com/kemcap/ayapark2/blob/main/SECONDARY-CHANGES.md) abgeglichen. #42 durch #44/#45 ersetzt; #46 überschneidet sich mit #48; #38/#39 teilweise durch #49 beziehungsweise #43/#51 abgedeckt. Keine PRs aufgrund dieses Abgleichs geschlossen.


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
- [x] Shell-Syntax und sechs synthetische Offline-Quellcode-/Archivtests laut PR #52 geprüft. Keine vollständige DB-/Storage-Integration daraus ableiten.

### 1.2 Portabilität vollständig machen – **NÄCHSTE TECHNISCHE AUFGABE**

- [x] Git-Bundle aller im vollständigen Checkout vorhandenen Referenzen und erreichbaren Historie in den **verschlüsselten** Sicherungsprozess integriert; isolierter Git-Restore getestet. Verschlüsselungs-/Offsite-Rundlauf bleibt in 1.4 offen.
- [x] Versionierte Website, HTML, CSS, JS, Assets, Design und Edge-Function-Code im Git-Bundle erfasst; Ref-/Tree-Inventar und unabhängige Wiederherstellung geprüft.
- [ ] Infrastruktur-/Konfigurationsinventar ohne Geheimnisse vervollständigen (Checkliste `docs/BACKUP-RECOVERY-INVENTORY.md` ergänzt; Livewerte noch offen): GitHub Pages, Supabase-Projekt-, Auth-/SMTP-/OAuth- und Storage-Einstellungen; dokumentieren, welche Secrets bei Umzug *neu gesetzt* werden müssen.
- [ ] Prüfen, dass Backup auch bei Totalverlust von GitHub und bei Supabase-Migration auf Self-Hosting nutzbar ist.
- [x] Git-Bundle-Inhalt und Wiederherstellung in ein **neues isoliertes** Repository nachgewiesen: 6 Offline-Integrationstests; zusätzlich tatsächliches Repo mit 62 Referenzen und Git-Objektprüfung (`fsck --full --strict`).

### 1.3 Einmalige Nutzer-Einrichtung (teilweise abgeschlossen)

- [x] Privaten Google-Drive-Ordner `AyaPark2-Backups` vom Benutzer angelegt.
- [x] age-Schlüsselpaar lokal erzeugt und getrennte Schlüsselkopie laut Nutzer gesichert; keinen privaten Schlüssel teilen.
- [x] rclone/Drive eingerichtet; Ordnerzugriff sowie Upload, Download und lokale Entschlüsselung der Testdatei vom Nutzer erfolgreich bestätigt.
- [ ] Google-OAuth-Status für langfristige unbeaufsichtigte Nutzung prüfen.
- [x] Funktionsfähige Secrets für den separaten DB-Workflow in main durch erfolgreichen Lauf indirekt belegt; keine Geheimniswerte ausgelesen. Aktivierungsvariable des Komplettentwurfs #52 weiterhin nicht aus diesem Lauf ableitbar.

### 1.4 Restore-Prüfung und Freigabe (noch offen)

- [ ] Exportvollständigkeit der Anwendungsschemas, Rollen, Auth-Daten und RLS testen; Supabase-verwaltete Schemas nicht blind restaurieren.
- [x] Separater produktiver DB-Workflow: verschlüsselter Export nach Drive, Ciphertext zurückgelesen und SHA-256 verglichen (Lauf oben).
- [ ] Echten DB-Dump lokal entschlüsseln und kontrollieren; Testdatei-Entschlüsselung ersetzt diesen Nachweis nicht.
- [ ] Restore-Durchlauf in **isoliertem Testsystem**: Datenbank, Personen, Buchungen, Berechtigungen, Auth und Storage-Dateien validieren.
- [ ] Separaten Wiederherstellungsplan für externen Anbieter/selbst gehostetes Supabase festhalten.
- [ ] Geheimnisbehandlung, Drive-Speichergrenzen, monatliche Sicherungsstichproben und vierteljährliche Restore-Tests klären.
- [ ] Erst nach erfolgreich dokumentierten Prüfungen: **ausdrückliche Nutzerfreigabe** für Merge nach `main` und `AYAPARK_BACKUP_ENABLED=true`.
- [ ] Erst nach Freigabe und erfolgreich nachvollzogenem realen Sicherungslauf: Automatisierung als aktiv kennzeichnen.

## Phase 2 – Personen, Rollen, Berechtigungen (P1)

- [x] Repository-Ist/Soll-Abgleich aller drei Rollen und fünf delegierbaren Verwaltungsrechte; vorhandene Module und Überschneidungen geprüft. Siehe `PHASE-2-ROLES-AUDIT.md`; keine Live-Backend-Abnahme.
- [x] Teilaufgabe Entwicklungsstand: reverse/unallocate/void_charge/void_credit serverseitig und in der UI auf Superadmin begrenzt; 28 isolierte SQL- und 2 UI-Prüfungen bestanden. Keine produktive Anwendung.
- [ ] Übrige kritische Finanzfreigaben und fünf getrennte Aufgabenrechte vollständig umsetzen und integriert abnehmen.
- [ ] Fünf getrennte Aufgabenrechte und Aidat-/Umlagenentwurf mit Superadmin-Endfreigabe konsistent implementieren.
- [ ] 13 bestehende allgemeine Testfehler fachlich auflösen; keine pauschale Lockerung von Datenschutztests.
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

**Nächste Aufgabe: echtes Backup isoliert wiederherstellen.** Aktive DB-Sicherung nicht erneut einrichten. Zunächst OAuth-Dauerbetrieb bestätigen und einen realen verschlüsselten Dump lokal herunterladen/entschlüsseln, danach ausschließlich in einem isolierten Restore-Ziel Datenbank, Auth und Berechtigungen prüfen. Privater Schlüssel bleibt beim Nutzer. Parallel Plattforminventar und fehlenden Storage-/Git-Umfang vervollständigen. PR #52 mit main abgleichen, bevor ein zweiter Workflow aktiviert oder ein alter Entwurf gemergt wird.

**Projektkontext:** `docs/AYA-PARK-2-CONTEXT-HANDOFF.md`
**Backup-Anleitung:** `docs/FREE-BACKUP-SETUP.md`
**Draft PR:** https://github.com/kemcap/ayapark2/pull/52

## Prüfnachweis 29.10.2026 — Teilaufgabe Quellcode

- `python3 -B scripts/backup/test_source_backup.py`: 6 bestanden (Branches/Tags/Remote-Refs, isolierter Restore ohne Ursprungsrepo, flacher Checkout, ungesicherte Änderungen, LFS-/Submodule-Abbruch, Format-2-Vollständigkeit und Korruption).
- Tatsächlicher Repository-Spiegel: 62 Referenzen, 1.676.595 Byte Bundle; unabhängiger Clone und `git fsck --full --strict` bestanden. Erfasster `origin/main`: `5ba166cf2960f68cd52eac5b63a44f477fd41645`.
- `bash -n scripts/backup/backup.sh` und `git diff --check` bestanden.
- Nur Quellcode- und Archivintegrität geprüft; keine Behauptung eines erfolgreichen Datenbank-/Auth-/Storage-Restores. Workflow bleibt deaktiviert.

## Prüfnachweis 30.10.2026 – Übernahme und Restore-Vorbereitung

- [x] Alle drei Übergabedokumente vollständig gelesen; tatsächlichen main-/PR-/Branch-Stand verglichen. main: `2c55873506c1e132067876efae12cdc6e42fa358`; Pages-Lauf 40955767893 erfolgreich. PR #52 weiterhin Draft; vor diesem Abgleich 51 Commits hinter main / 10 voraus.
- [x] Aktiven DB-Workflow gelesen und Erfolg des Export-/Upload-Schritts in Job 123698719576 / Lauf 40945224444 direkt geprüft. Kein neuer Backup-Lauf gestartet.
- [x] Veraltete Übergabe-/Anleitungsangaben zum fehlenden Backupbetrieb eingeordnet. Nutzerbestätigte lokale Einrichtung nicht erneut angefordert.
- [x] [BACKUP-RESTORE-PREPARATION.md](BACKUP-RESTORE-PREPARATION.md) ergänzt: aktuelle .dump.age-Sicherung vom .tar.age-Entwurf unterschieden; lokale Entschlüsselung/Inhaltsprüfung und isolierte Restore-Kriterien vorbereitet.
- [ ] Tatsächliche lokale Entschlüsselung, kompatibles isoliertes Ziel und vollständiger DB-/Auth-/RLS-/Storage-/App-Restore bleiben offen. Kein Restore-Erfolg behauptet.

Nächster Schritt: Abschnitt 3 der neuen Anleitung lokal durchführen (OAuth-Status, echte Datei herunterladen, mit vorhandenem privaten Schlüssel lokal entschlüsseln und mit PostgreSQL 17 auflisten). Danach isolierten versionsgebundenen Importplan erstellen. Produktionsdaten, main, Secrets und Workflow-Aktivierung wurden bei diesem Abgleich nicht verändert.


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

## Forderungsentwurf-Integration 30.10.2026

Monats-/Sammelforderungen werden im verbundenen Frontend nun über ay3_submit_charge_draft eingereicht. Die DE/TR-Oberfläche erklärt, dass dabei noch keine Forderung entsteht. Freigabeliste zeigt Fälligkeit, Beschlussgrundlage, Gesamtbetrag, Wohnung und Schuldner; Freigabe/Ablehnung nur Superadmin, keine Vorschau-Schreibzugriffe. Die alten direkten Finalisierungswege sind serverseitig für delegierte Verwaltung gesperrt, einschließlich privater command-/command_v2-Aufrufe und V5-Sammel-/Monatsbuchungen. Bestehende Originale werden nicht umgeschrieben.

Nachweise: 266 allgemeine Tests bestanden; 49 isolierte SQL-Prüfungen des Entwurfs-/Buchungsablaufs bestanden. Live-Ausgangshashes aller drei zu ersetzenden Funktionen stimmen mit dem Kandidaten überein. Fünf Aufgabenrechte sind als explizite Grundlage enthalten; vollständige Vergabeoberfläche und Anbindung der übrigen vier Aufgabenrechte bleiben offen. Keine pauschale Phase-2-Abnahme.
