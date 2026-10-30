# Phase 2 – Rollen und Einzelrechte: Ist/Soll-Abgleich

## Zusätzliche Phase-2-Prüfung 30.10.2026

PR #57 mit den fünf Aufgabenrechten ist produktiv; Pages-Lauf 41005590291 erfolgreich, task-permissions/forms/api ausgeliefert und inhaltsgleich geprüft. Recovery blieb nachweislich Superadmin-only; isolierte Wiederherstellung behält die Account-ID.

Die anschließende Übergangsprüfung ergänzt den Superadmin-Schutz für manuelle Buchungen, Kategorie-/Schuldneränderungen, Budgetänderungen und Ausnahmen auch bei noch nicht auf die fünf Rechte umgestellten alten Finanzberechtigungen. Lesen und normale Zahlungszuordnung bleiben erhalten. Entsprechende Buttons und Formulare sind ebenfalls geschützt. 84 SQL-Prüfungen des neuen Gesamtpakets und 269 allgemeine Tests bestanden. Keine Mitgliedschaften, Kontakte oder Finanzoriginale zu Testzwecken verändert.

Offener nächster Punkt: eigener nachvollziehbarer Kontaktänderungsantrag mit Superadmin-Prüfung; bestehende Zugangsanfragen sind davon zu unterscheiden. Weitere Phase-2-Historienabnahme und Phasen 3–6 bleiben offen.

## Maßgeblicher Fortschritt 30.10.2026 – fünf Aufgabenrechte

Die fünf Rechte sind in der Vergabeoberfläche und serverseitig verbunden. Speicherung erfolgt über ay3_set_task_grants, nur durch Superadmin. Keine automatische Übertragung alter breiter Rechte. Bisherige Berechtigungen bleiben bis zur ausdrücklichen Speicherung kompatibel; danach ersetzt der explizite Aufgabensatz die alten Rechte. Leere Auswahl entzieht alle delegierten Aufgaben. Kritische Finanzen, Recovery, Rollenvergabe und Veröffentlichungen von Finanzberichten bleiben Superadmin-Aufgaben.

Personen-/Beziehungsbefehle prüfen die jeweilige Aufgabe, auch bei direkten privaten Aufrufen. Bearbeitung von Rolle oder Zuordnungsdaten benötigt Bewohnerwechselrecht. Bankrecht erlaubt Zuordnung, aber keine Korrektur bestehender Finanzoriginale. Ankündigungsrecht funktioniert getrennt. Einladungen prüfen das neue Recht bei Ausstellung und Einlösung; Entzug sperrt auch offene Einladungen. Forderungsvorbereitung erhält nur die benötigten Personen-/Beziehungs-/Ausnahmedaten, keine Bankbewegungen allein durch dieses Recht.

Nachweise: 269 allgemeine Tests bestanden, 72 isolierte SQL-Prüfungen einschließlich delegierter Einladung, Rechteentzug, einmaliger Einlösung, tatsächlicher Zahlungszuordnung und Ankündigung. Elf Live-Ausgangshashes vor Rollout identisch. Keine produktiven Testpersonen oder Buchungen angelegt. Kandidat 20261030044641_phase2_task_rights_enforcement.sql; Veröffentlichung wird gesondert bestätigt.

Nächste Phase-2-Prüfung: durchgängige Kontaktänderungs-/Recovery-Freigaben und Bewohnerwechselhistorie mit den neuen Aufgabenrechten. Gesamtroadmap noch nicht vollständig abgeschlossen.

Stand: 30.10.2026 (Europe/Istanbul). Basis: main `2c55873506c1e132067876efae12cdc6e42fa358`.
Branch: `feature/phase2-role-permission-audit-20261030`.
**Status: Codeprüfung und isolierte Tests abgeschlossen; vier kritische Finanzkorrekturen im Entwicklungsstand auf Superadmin beschränkt. Fünf Zielberechtigungen und Produktivabnahme bleiben offen.**

Der Nutzer hat den Backup-Arbeitsschritt ausdrücklich übersprungen. Keine erneute Einrichtung, keine Backup-Tests und keine Aktivierung in dieser Aufgabe. Daraus wird keine zusätzliche technische Restore-Bestätigung abgeleitet.

## Verifizierter Bestand

- `api.mjs:131` bildet technische Mitgliedschaften `manager` auf Superadmin und `deputy`/`auditor` auf Verwaltung ab. Ohne Verwaltungsmitgliedschaft wird die Bewohneransicht verwendet. `auditor` ist ein bestehender technischer Wert, keine neu einzuführende vierte Produktrolle.
- `ay2_private.can` bindet Rechte an `auth.uid()`, Anlage und tatsächliche `site_staff_memberships`. Nutzer-Metadaten sind keine Rechtequelle. Maßgeblicher Code im lokalen Schemafixture: `tests/sql/schema.sql:897`.
- `ay2_permissions` erlaubt vier delegierbare Werte: `people`, `finance`, `import`, `announcements`. `admin` ist nicht delegierbar. Quelle: Constraint in `tests/sql/schema.sql:118`, Eingabe und Anzeige in `forms.mjs:34/57`, `settings-ui.mjs:6`.
- Serverrechte, RLS und Befehlsprüfung existieren bereits. Keine neue parallele Rollenverwaltung erforderlich.
- Personen-/Beziehungshistorie, Einladungen, administrative Recovery, Registrierungsstatus und Rollenvorschau existieren bereits. Offene Varianten #27/#28/#29/#40/#41/#42/#46 nicht pauschal übernehmen; `SECONDARY-CHANGES.md` beschreibt Überschneidungen.
- Eigentümer, Mieter und Vertreter sind fachliche Beziehungen und verleihen keine Verwaltungsrechte.

**Grenze des Nachweises:** Fixture stammt aus einem älteren dokumentierten Schema und wird pro Test mit ausgewählten echten SQL-Dateien erweitert. Kein Live-Schema exportiert, keine produktiven Mitgliedschaften/Policies/Edge-Deployments geprüft. SQL-Dateien und Frontend-Code belegen Repository-Verhalten, nicht automatisch den aktuellen Backend-Deploystand.

## Beschlossene fünf Verwaltungsrechte

| Beschlossene Aufgabe | Vorhandener Mechanismus | Lücke / nächster Eingriff |
|---|---|---|
| Wohnungen/Personen bearbeiten | `people`, Zuordnungsbefehle und Personen-UI vorhanden | Von Bewohnerwechsel und Einladungen trennen; Archiv/Purge/Kontozugriff weiterhin gesondert schützen |
| Bewohnerwechsel/Einladungen | Zuordnungswechsel unter `people`; Einladungs-/Provisionierungsfunktionen prüfen `manager` | Eigenes Recht, serverseitige Actor-Prüfung und Edge-Handler gemeinsam umstellen; keine reine UI-Freigabe |
| Aidat/Umlagen vorbereiten | `finance`; `charge`, `monthly`, `monthly_v5`, `batch_charge` buchen direkt | Entwurf und endgültige Superadmin-Freigabe fehlen als getrennte Rechte-/Statusgrenze |
| Unklare Bankzuordnungen klären | `finance` für `allocate`/`auto_allocate`, eigener `import`-Schalter | Lesen/Zuordnen von Storno, Forderungsstorno, Entkoppeln, manuellen Finanzbuchungen und Finalisierung trennen |
| Ankündigungen veröffentlichen | `announcements`, V5-Publikation, Zielgruppen und Bestätigungen vorhanden | Vorhandenes Recht gezielt übernehmen; Regression für Zielgruppe, Revision, Start/Ende behalten |

### Priorisierte Abweichungen

1. **Finanzkritische Aktionen sind zu breit delegierbar.** V4 `command`/`command_v2` lassen `reverse`, `unallocate`, `void_charge` unter `finance` zu. V5 lässt Monats-/Sammelforderungen ebenfalls unter `finance` zu. Quelle: `20261025073340_v4_finance_release_safety.sql:30/212`, `20261025194333_v5_notifications_finance.sql:100`. Das widerspricht den Beschlüssen 5, 13 und 14. Kein Nachweis eines tatsächlichen Missbrauchs oder einer derzeit entsprechend berechtigten Produktivperson.
2. **Fünf fachliche Aufgabenrechte fehlen.** Vier bestehende technische Flags sind nicht mit den fünf beschlossenen delegierbaren Rechten gleichzusetzen; `admin` ist kein fünftes Verwaltungsrecht.
3. **Einladungen bleiben managergebunden.** Beispiele: `20261027174427_people_invitation_eligibility.sql:41/59/83/122`. Eine neue Checkbox allein könnte diese Anforderung nicht erfüllen.
4. **Bestehende Tests haben widersprüchliche Sichtbarkeitsannahmen.** Neuere Tests erlauben gemeinsame Wohnungsschulden; ältere erwarten ausschließlich persönliche Schuldpositionen. Vor Änderungen am Datenschutzmodell den neueren ausdrücklichen Wohnungsschulden-Beschluss mit der ursprünglichen Spezifikation abgleichen. Nicht einfach bestehende Erwartungen lockern.

## Ausgeführte Tests

Alle Tests lokal, ohne Datenbank-URL, Produktivkonten oder Produktionsänderungen; Installation mit `npm ci --ignore-scripts` aus dem vorhandenen Lockfile.

| Prüfung | Ergebnis | Bedeutung |
|---|---|---|
| Neue `npm run test:roles:sql` | 369 bestanden | Beide technischen Verwaltungsrollen, alle 16 Kombinationen der vier bestehenden Flags; Anlage-Isolation; keine admin-Selbstvergabe; gefälschte User-Metadaten; Rechteentzug; verwaiste Grants; Bewohner; anonyme Aufrufe |
| `npm run test:sql` | 120 bestanden | Bestehende isolierte Audit-/Finanz-/Berechtigungsprüfungen |
| `npm run test:v5:sql` | 50 bestanden | V5-Finanz-/Publikations-/Scope-Prüfungen |
| `npm run test:people:sql` | 29 + 27 bestanden | Einladungen und historische personenbezogene Rechte; kein GoTrue-/E-Mail-E2E-Nachweis |
| `npm test` | 249 bestanden, 13 fehlgeschlagen | Hauptzweig noch nicht allgemein grün; neue Testdatei liegt außerhalb dieses bestehenden Globs |

Die 13 Fehler betreffen: Detaildialog-Mock/Eventlistener (1), Detailsicht (1), Performance-API-Mocks ohne neuen Devir-Datensatz (4), Modulidentität `api.mjs?v=5.9.0` gegenüber `?v=5.9.24` (1), persönliche gegenüber wohnungsbezogener Schuldprojektion (4), veraltete Überschriften-/UI-Erwartungen (2). Diese Einordnung ist eine erste Fehleranalyse; kein pauschaler Beweis, dass ausschließlich Tests fehlerhaft sind.

Die bestehenden `npm test`-Dateien und Anwendungsmodule wurden in diesem Arbeitsschritt nicht verändert. Eine grüne Rechte-Matrix ist keine Gesamtabnahme der Anwendung und keine Bestätigung der fünf neuen Aufgabenrechte.

## Nächste Umsetzung – in kleinen zusammenhängenden Schritten

1. Kritische Finanzaktionen zuerst an die Superadmin-Freigabe binden. Alle Aufrufpfade berücksichtigen: public-RPCs, private ausführbare Funktionen, Legacy/V4/V5 und UI. Originalbuchung/Audit und Idempotenz unverändert erhalten. Mit einem synthetischen bevollmächtigten Verwaltungsmitglied beweisen, dass es weiterhin Bankzuordnungen klären, aber keine kritischen Finanzkorrekturen ausführen kann. Superadmin-Positivtests und Fehlercode `42501` vor Payload-Verarbeitung verlangen.
2. Fünf fachliche Rechte zentral definieren und mit DB-Constraint, `can`, Workspace, Formularen und Edge-Actor-Prüfungen konsistent umsetzen. Technische Namen und Datenmigration explizit versionieren. Alte breite `finance`-/`people`-Werte nicht still in neue privilegierte Rechte übersetzen. Bis zur gezielten Vergabe gilt für neue delegierte Aktionen deny-by-default.
3. Aidat-/Umlagenentwurf von endgültiger Buchung trennen; nur Superadmin finalisiert. Kein rein optischer Entwurfszustand bei bereits erzeugten Forderungen.
4. Überholte Tests anhand nachgewiesener fachlicher Entscheidungen aktualisieren; echten Modulversionskonflikt beheben. Danach aktuelles Backend schreibgeschützt vergleichen und freigegebene isolierte Integration ausführen.
5. Vor Produktivmigration separate ausdrückliche Freigabe. Eine separat geprüfte Migrationsvorbereitung liegt vor; keine produktiven Rechte wurden geändert.

## Abgeschlossener Folgeschritt: kritische Finanzkorrekturen

**Vorbereitet und lokal getestet, nicht veröffentlicht:** Migration `supabase/migrations/20261029212437_phase2_superadmin_finance_corrections.sql` ergänzt in beiden tatsächlich buchenden Funktionen `command` und `command_v2` eine Superadmin-Prüfung für `reverse`, `unallocate`, `void_charge`, `void_credit`. Sie erfolgt vor jeder ID-/Payload-Auswertung. V5 unterstützt diese vier Korrekturaktionen nicht; reguläre V5-Zuordnungen erreichen weiterhin den geschützten Legacy-Kern. Ein Schutz nur im public-RPC wäre wegen vorhandener privater Aufrufpfade unzureichend.

Die Migration enthält vollständige unveränderte Funktionssnapshots mit dieser einen ergänzten Autorisierung. Signaturen/OIDs, bestehende ACLs, SECURITY-DEFINER-Eigenschaft und search_path bleiben erhalten. Ein vorgeschalteter Body-Hashvergleich akzeptiert nur die geprüfte Ausgangsfassung oder dieselbe bereits gehärtete Fassung. Backend-Drift führt zum atomaren Abbruch; keine unbekannten neueren Funktionsänderungen überschreiben.

Die UI zeigt diese vier Korrekturen nur mit `admin`; die zentrale Aktionsprüfung in `app.mjs` verlangt ebenfalls `admin`. Zahlungsvorschläge und neue Zuordnungen bleiben für Verwaltung mit bestehendem Finanzrecht verfügbar. Die übrigen breiten Finanzrechte sind damit ausdrücklich noch nicht in die fünf beschlossenen Aufgabenrechte umgebaut.

Zusätzliche Nachweise:
- `npm run test:corrections:sql`: **28 bestanden**, einschließlich Rechteentzug vor ungültiger UUID-Verarbeitung, privatem Umgehungspfad, positiver Zuordnung durch Verwaltung, Idempotenz, allen vier Superadmin-Korrekturen, unverändertem Original, Audit-Actor, erhaltenen Funktions-ACLs/OIDs, Wiederholbarkeit der Migration und Abbruch bei synthetischem Backend-Drift.
- `node --test tests/finance-correction-access.test.mjs`: **2 bestanden**, Verwaltung behält Zuordnung, Superadmin behält Korrekturen.
- Vorhandene `test:sql` und `test:v5:sql` führen nun die Kandidatenmigration vor ihren Assertions aus: **120 + 50 bestanden**.
- JS-Syntax und `git diff --check` bestanden.

### Kontrollierter späterer Rollout (nicht ausgeführt)

Vor Freigabe aktuellen Live-Funktionsstand schreibgeschützt vergleichen und Migrationsplan prüfen. Backend zuerst und UI danach nur mit ausdrücklicher Freigabe ausrollen. Modul-Cacheversionen und bestehende Modulidentitätsfehler vor einem Frontendrelease konsistent beheben. Kein automatischer Rollback: ein Zurücknehmen würde die alten breiteren Korrekturrechte wieder öffnen und benötigt eine eigene Entscheidung. Datenbestände werden durch die Kandidatenmigration nicht umgeschrieben.

Nächster Schritt: fünf fachliche Aufgabenrechte und der Entwurfs-/Endfreigabeablauf; 13 bestehende allgemeine Testfehler vor einem Release fachlich auflösen. Offizielle Grundlage zu Funktions-EXECUTE und RLS: https://supabase.com/docs/guides/api/securing-your-api (30.10.2026 geprüft). Supabase-Changelog auf relevante Änderungen gesichtet; keine neuen Plattform-/Auth-/RLS-Einstellungen werden eingeführt.

Allgemeine Suite nach der Korrektur erneut geprüft: **251 bestanden / dieselben 13 Fehler**, insgesamt 264 Tests einschließlich der zwei neuen UI-Tests. Keine zusätzlichen allgemeinen Fehler durch diesen Kandidaten.

## Fehlerbereinigung 30.10.2026

Die 13 fehlgeschlagenen allgemeinen Prüfungen wurden behoben. Ergebnis: **264/264 bestanden, 0 fehlgeschlagen**, keine Tests deaktiviert. Anwendungskorrekturen: persönliche historische Forderungen zusätzlich zur berechtigten Wohnungssicht erhalten; deutschen Sprachcode korrekt auswerten; Cacheversionen derselben Laufzeitmodule über App/Recovery konsistent verwenden. Testkorrekturen: Detaildialog-Funktion gezielt isolieren, neue Devir-API-Antwort im Mock berücksichtigen, zusätzliche CSS-Klasse akzeptieren, überholte persönliche Sichtannahmen an die beschlossene gemeinsame Wohnungssicht anpassen. Fremde Wohnungen und private Kontaktdaten bleiben in den Prüfungen ausgeschlossen. Kein Live-Deployment oder produktiver Datenbankzugriff.

## Nächster Entwicklungsstand 30.10.2026 – Aufgabenrechte und Forderungsentwürfe

Migrationskandidat `20261029214410_phase2_task_grants_charge_drafts.sql`: exakt fünf explizite Aufgabenrechte (people_manage, occupancy_invite, charges_prepare, bank_reconcile, announcements_publish), keine automatische Übernahme breiter alter Grants. Vergabe nur durch tatsächlichen Superadmin an vorhandene Verwaltung. Neue Tabellen mit RLS; Clients erhalten nur SELECT, Änderungen über geprüfte RPCs; EXECUTE für PUBLIC/anon gesperrt.

Unveränderliche Forderungsentwürfe: Einreichung ohne Finanzbuchung, Superadmin-Entscheidung mit anlagenbezogener Sperre und Zeilensperre, Ablehnung ohne Buchung, erfolgreiche Freigabe über vorhandenen V5-Finanzkern, Wiederholung ohne Doppelbuchung. Fehler bei Freigabe lassen den Entwurf unverändert offen. Audit bei Vergabe, Einreichung und Entscheidung.

Nachweis: `npm run test:tasks:sql` **45 bestanden**, einschließlich Einzelrechte-Isolation, fehlender Superadmin-Eskalation, verbotener Selbstfreigabe, RLS, realer synthetischer Buchung und Freigabe-Idempotenz. Kein Produktivzugriff.

**Nur Grundlage vorbereitet, nicht vollständig integriert:** Bestehende Legacy-Rechte und direkte Finanzwege sind noch unverändert. Der neue Freigabeablauf darf deshalb nicht als durchgängig erzwungen gelten. Oberfläche, Workspace-/Edge-Actor-Anbindung der fünf Rechte und Absicherung aller alten direkten Finalisierungswege bleiben der nächste zusammenhängende Arbeitsschritt. Nicht vor dieser Integration veröffentlichen. Keine produktive Migration oder Live-Veröffentlichung erfolgt.

## Forderungsentwurf-Integration 30.10.2026

Monats-/Sammelforderungen werden im verbundenen Frontend nun über ay3_submit_charge_draft eingereicht. Die DE/TR-Oberfläche erklärt, dass dabei noch keine Forderung entsteht. Freigabeliste zeigt Fälligkeit, Beschlussgrundlage, Gesamtbetrag, Wohnung und Schuldner; Freigabe/Ablehnung nur Superadmin, keine Vorschau-Schreibzugriffe. Die alten direkten Finalisierungswege sind serverseitig für delegierte Verwaltung gesperrt, einschließlich privater command-/command_v2-Aufrufe und V5-Sammel-/Monatsbuchungen. Bestehende Originale werden nicht umgeschrieben.

Nachweise: 266 allgemeine Tests bestanden; 49 isolierte SQL-Prüfungen des Entwurfs-/Buchungsablaufs bestanden. Live-Ausgangshashes aller drei zu ersetzenden Funktionen stimmen mit dem Kandidaten überein. Fünf Aufgabenrechte sind als explizite Grundlage enthalten; vollständige Vergabeoberfläche und Anbindung der übrigen vier Aufgabenrechte bleiben offen. Keine pauschale Phase-2-Abnahme.
