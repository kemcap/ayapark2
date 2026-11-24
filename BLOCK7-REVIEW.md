# AYAPARK 2 – Block 7: Personenverwaltung, Regression und Datenhistorie

Stand: 27.10.2026. Arbeitsbranch `qa/block7-person-history-20261027` auf Basis des aktuellen `main`. Kein Merge, keine Veröffentlichung und keine Änderung an der produktiven Supabase-Datenbank.

## Bestehende Funktionen (nicht neu entwickelt)

- Die vorhandene `assignment_add`-Maske erlaubt Auswahl einer bestehenden Person oder Anlage einer neuen Person mit optionalem Kontakt und Notizen.
- `assignment_edit` erlaubt Rollenwechsel und zusätzliche Rolle. Personen und Wohnungen können mehrere aktive Zuordnungen haben.
- `assignment_remove` archiviert die betroffene Rolle mit Grund; die Person und Forderungen bleiben bestehen.
- `assignment_restore` erstellt eine neue aktive Zuordnung und erhält die archivierte Beziehung und historische Forderungsidentität.
- `starts_on` und `ends_on` sind beschreibende, optionale Felder. Sie verändern nicht automatisch die explizite `active`-Markierung.
- Die V5-Speicherfunktion `ay2_private.ay5_command` verarbeitet Vertreter-Benachrichtigungsmandate und protokolliert Änderungen. Die innere Funktion `manage_assignment` alleine tut das **nicht**, dieser Umstand ist bei künftigen Änderungen zu beachten. Eine read-only Prüfung der produktiven Funktionen bestätigt die V5-Verarbeitung.

## Gezielte Korrektur

Der lokale Demo-Modus prüfte bei wiederholter `request_id` nicht, ob ein anderer Payload mit derselben Kennung eingereicht wurde; der SQL-Server lehnt dies dagegen ausdrücklich ab. Jetzt wird der ursprüngliche Payload in der lokalen Audit-Kopie gespeichert und bei erneuter Verwendung kanonisch verglichen: identische Anfrage = idempotent, abweichende Anfrage = Fehler, Daten unverändert. Reale Datenbankfunktion, Einladungen und Benutzerrollen bleiben unverändert.

## Neue Regressionstests

- Idempotenz inklusive abweichendem Payload und unveränderter Audit-/Datenlage
- dieselbe Person in mehreren Wohnungen mit isolierter Entfernung nur einer Rolle; historische Forderungen, Teilzahlungen und Guthaben unverändert
- Rollenwechsel mit mehreren Rollen, Archiv und Wiederherstellung
- ungültige optionale Daten und fehlende Löschbegründung ohne Teiländerung
- gezielte Vertreter-Benachrichtigungen und keine fremden Mandate nach Rollenwechsel
- getrennte Anzeige aktiver und ehemaliger Rollen, ohne Verwaltungsaktionen für Bewohner

## Freigabe / Restrisiken

- Automated CI `npm test` und bestehende isolierte `PGlite`-SQL-Testreihen prüfen.
- Keine produktiven Testmutationen; nur synthetische Testdaten.
- Manuelle Prüfung auf Mobilgeräten und mit echten, autorisierten Testkonten bleibt vor einer Freigabe offen.
- Vor einem späteren Merge müssen Browser-Modulversionen mit anderen offenen PRs harmonisiert werden (Block 5 #38 und Block 6 #39). Änderungen aus diesen beiden PRs sind hier nicht enthalten.
