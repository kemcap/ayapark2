# Datenbank- und Ladeoptimierung · V3.15

Stand: 24. Oktober 2026. Projekt: Ayapark 2, Supabase eisozwhhinqszfikemot.

## Ergebnis

Die Optimierung verändert keine Personen-, Wohnungs-, Buchungs-, Forderungs- oder Rechte-Daten. Ein Vergleich aller 33 öffentlichen Anwendungstabellen vor und nach der Migration ergab identische Inhalte. Alle 20 Wohnungen bleiben erhalten.

Drei bestehende SELECT-Richtlinien (Buchungen, Änderungsprotokoll, Klärungsquittungen) ermitteln die erlaubten Anlagen einmal pro SQL-Anweisung. Die bisherigen Berechtigungsfunktionen bleiben unverändert. Keine neue SECURITY-DEFINER-Funktion, keine erweiterten Grants und keine persistente Speicherung von Berechtigungen im Browser.

Die Prüfsignaturen für Klärungshinweise aggregieren Zuordnungen, Guthaben und Stornos einmal je Anlage. Die Signaturen enthalten weiterhin auch aufgehobene Zuordnungen/Guthaben und sämtliche bisher berücksichtigten Felder. Dadurch bleiben bestehende Quittungen gültig; geänderte Quellen erscheinen weiterhin erneut zur Prüfung.

Im Browser werden Wohnungsbilanzen mit einmalig aufgebauten Zuordnungstabellen berechnet. Administrator-Kontozuordnungen laden parallel zum Arbeitsbereich statt erst anschließend. Es gibt keinen neuen Daten-Cache, der veraltete Rechte oder Salden behalten könnte.

## Messung

Fünf sequenzielle Durchläufe pro Phase, dieselbe Manager-Identität, derselbe Datenbestand, SQL-Zeit mit clock_timestamp. Median, Millisekunden:

| Abfrage | Vorher | Nachher |
| --- | ---: | ---: |
| Arbeitsbereich | 93,49 | 45,63 |
| Klärungshinweise | 62,52 | 22,85 |
| Änderungsprotokoll, 10 Zeilen | 39,35 | 2,22 |
| Finanzübersicht | 10,39 | 9,95 |

Separate EXPLAIN-ANALYZE-Prüfung der Buchungszeilen: 50,99 → 3,24 ms. Der Ausführungsplan zeigt die Berechtigungsmenge als einmaligen InitPlan statt einer Funktionsprüfung je Buchungszeile.

Das sind Datenbankzeiten, keine Ende-zu-Ende-Messungen von Smartphones oder einer produktiven Anmeldung. Netzwerk, Übertragung und Darstellung kommen hinzu. Die Datenbank liegt in Singapur (ap-southeast-1); ein Regionswechsel wurde nicht vorgenommen.

## Tests

- 124 Node-Tests, darunter Salden mit aufgehobenen Zuordnungen, Überzahlungen, Resident-/Verwaltungsansichten, parallele Ladevorgänge und Pagination.
- 89 SQL-Prüfungen: identische Arbeitsbereiche, Zeilenmengen, Prüfsignaturen, Finanzübersichten und Protokolle für bestehende Manager und Verwaltungen mit/ohne Zusatzrechten sowie fremde und anonyme Identitäten; alle 33 Anwendungstabellen unverändert.
- Temporäre Skalierungsdaten: 10.618 Buchungen einschließlich Stornos, 30.000 Zuordnungen, 20.000 Guthaben; 6.687 alte/neue Signaturen exakt identisch.
- Browser-Smoke-Test mit Beispieldaten; keine produktiven Formulare abgesendet.
- Security Advisor vor/nach: identische Kategorien und Anzahlen. Vorhandene Hinweise sind nicht als behoben deklariert.
- Übernommene Regression korrigiert: Wohnungskarten begrenzen Namen in der Bewohneransicht wieder auf eigene Personen; Suchtests für Quell-/Distributionspfade repariert.

SQL-Tests verwenden temporäre Tabellen und ROLLBACK. Der Vergleichstest stellt alte Definitionen nur innerhalb seiner Transaktion wieder her; nach ROLLBACK gilt der vorherige aktive Stand. Nicht als Lasttest mit vielen parallelen Nutzern auf Produktion ausführen.

## Sicherung und Rückweg

Vor Änderungen wurde eine separate Anwendungsdatensicherung erstellt: alle 33 public-Tabellen in einem konsistenten SQL-Lese-Snapshot, Funktionen sowie Schema-/Policy-/Index-Metadaten. Die private Sicherung enthält 3.695 Zeilen. Keine Sicherungsdaten im Git-Repository.

Dies ist KEIN vollständiger pg_dump oder vollständiges Supabase-Projekt-Backup. Auth-Konten, Passwort-Hashes/Sitzungen, Storage-Dateien, SMTP und Projekteinstellungen sind nicht enthalten. Eine vollständige Wiederherstellung wurde nicht getestet. Die JSON-Struktur, Tabellenanzahl und Prüfsummen der Sicherung wurden geprüft.

Das Projekt nutzt den Free-Tarif. Die regulären täglichen zugänglichen Supabase-Backups werden für Pro, Team und Enterprise angeboten. Ein regelmäßiges vollständiges Offsite-Backup ist damit durch diese einmalige Sicherung nicht eingerichtet. Empfehlung: vollständigen CLI-/pg_dump-Export mit isoliertem Wiederherstellungstest und dauerhaftem Backup-Zeitplan einrichten oder einen passenden Tarif mit täglichen Backups wählen. Keine kostenpflichtige Umstellung vorgenommen.

Gezielter Rückweg für diese Optimierung: supabase/rollback/read_performance.sql. Er stellt ausschließlich die vorherigen Funktions-/Policy-Definitionen wieder her. Kein Zurückspielen alter Finanzdaten nötig.

## Weitere sinnvolle Schritte

1. Vollständige, regelmäßige Backups einschließlich separater Storage-Sicherung und Wiederherstellungsprobe einrichten.
2. Bei weiterhin langen Ladezeiten Netzwerkzeiten aus Deutschland/Türkei messen; einen separaten Umzugsplan in eine nähere Region prüfen. Ein Umzug betrifft API-Adressen, Auth und Konfiguration und braucht eine eigene getestete Migration.
3. Bei wesentlich wachsendem Buchungsbestand den Arbeitsbereich in gezielt geladene Bank-/Berichtsseiten aufteilen; dabei Wohnungssalden und Matching serverseitig vollständig halten.
4. Indizes nur nach tatsächlichen Abfrageplänen ergänzen. 17 MB Gesamtgröße und wenige tausend Datensätze rechtfertigen keine pauschale Bereinigung oder zusätzliche Indizes auf jede Fremdschlüsselspalte. Bestehende ungenutzte Indizes und alte Tabellen wurden erhalten.

Quellen: https://supabase.com/docs/guides/platform/backups und https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations


## Performance-Audit vom 1. November 2026

Aktuelle Frontend-/Ladeoptimierungen mit reproduzierbaren Browser-, CPU- und
Regressionstests: [vollständiger Bericht](docs/PERFORMANCE-AUDIT-20261101.md).
Die dortige Optimierung verändert keine produktiven Daten oder Datenbankschemata.
