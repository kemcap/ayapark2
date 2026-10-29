# Phase 2 – Rollen und Einzelrechte: Ist/Soll-Abgleich

Stand: 30.10.2026 (Europe/Istanbul). Basis: main `2c55873506c1e132067876efae12cdc6e42fa358`.
Branch: `feature/phase2-role-permission-audit-20261030`.
**Status: Codeprüfung und isolierte Tests abgeschlossen; Zielberechtigungen noch nicht implementiert oder produktiv abgenommen.**

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
5. Vor Produktivmigration separate ausdrückliche Freigabe. Dieser Branch enthält keine deploybare Rechte-Migration und ändert keine produktiven Rechte.
