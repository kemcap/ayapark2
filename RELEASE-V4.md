# V4.0 – freigegebene Produktionsfassung

Freigabe durch Kemal: „Okay, gerne live gehen.“ am 25. Oktober 2026 (Europe/Istanbul).

## Umfang
Die geprüften UI-/Formular-/Accessibility-Korrekturen und Render-/Ladeoptimierungen aus PR #20 gehen in die Produktionsfassung über. Anmeldung, persistente Sitzungen, Kontowiederherstellung und der bisherige Installationsablauf sind wieder aktiv. CSP erlaubt weiterhin ausschließlich das eigene Supabase-Backend. Die frühere private V4-Demovorschau bleibt gesondert als Vorschau erhalten.

D1 (grundlegende Menüstruktur) und D2 (größerer Dashboard-Umbau) sind weiterhin Empfehlungen und nicht Teil dieses Releases. Sie wurden nicht als umgesetzt ausgegeben.

## Drei behobene SQL-Befunde
- Fachliche Vorprüfungen delegierter Finanzaktionen erfolgen erst nach Berechtigungsprüfung. Auch ungültige Eingaben eines unberechtigten Nutzers ergeben keine Finanzdetails.
- Eine exakt wiederholte Zahlungszuordnung wird nach Rechteprüfung und innerhalb der bestehenden Sperre anhand der ursprünglichen vollständigen Nutzlast erkannt, bevor spätere Guthaben das verfügbare Restgeld verändern. Andere Beträge/Objekte bleiben unzulässig. Entzogene Rechte verhindern auch Wiederholungen.
- Neue beziehungsweise ausdrücklich erneut veröffentlichte Berichte verwenden dieselbe Bruttokonvention wie die bestehende Live-Auswertung: Stornopaare und Transfers werden aus Einnahmen/Ausgaben herausgerechnet. Der tatsächliche Geldbestand berücksichtigt weiterhin alle Bewegungen. `cash_adjustment_cents` weist die Differenz separat aus, sodass `Schluss = Anfang + Einnahmen - Ausgaben + Geldbestandskorrektur` gilt. Dies deckt insbesondere monatsübergreifende Stornos ab. Die bestehende Integritätsprüfung wird durch eine entsprechend vollständige Gleichung ersetzt, nicht entfernt. Vorhandene veröffentlichte Beträge bleiben erhalten; nur die neue Spalte wird mit 0 ergänzt. Kein Bericht wird automatisch neu veröffentlicht.

## Validierung
141/141 Node-Anwendungstests und 120/120 isolierte PostgreSQL-Prüfungen in PGlite. Die Finanztests wurden erweitert um Wiederholung nach Guthaben, geänderte Wiederholungen, entzogene Finanzrechte, ungültige Nutzlast vor Autorisierung, Transfers, monatsübergreifende Stornos und die Kontostandgleichung.

Erneute Browserprüfung der Release-Komponenten: 840 Ansichten, sieben Breiten 320–1440 px, DE/TR, hell/dunkel, drei Rollen; kein horizontaler Seitenüberlauf. 52 axe-Prüfungen ohne bestätigte automatische Verstöße. Frühere zusätzliche Formular-/Theme-Prüfungen sind im Audit dokumentiert. Keine vollständige WCAG-Zertifizierung und keine Prüfung auf physischen Smartphones.

Echter SMTP-Versand und erstmalige Kontoaktivierung sind nicht durch einen realen Versandtest bestätigt. Keine Bewohner-E-Mail wurde als Test angeschrieben. SMTP-Einstellungen werden durch dieses Release nicht verändert.

## Schutz und Rückweg
Produktionsbasis V3.15: `deef766bbc22f2aa7b7bb4d6bf8b2ffc64e74c4c`, zentral gesichert auf `baseline/v3.15-before-v4`. Vorherige Anwendungsdatensicherung bleibt erhalten; kein vollständiges Supabase/Auth/Storage-Backup behauptet. Die zwei tatsächlich produktiven Befehlsdefinitionen wurden vor der Änderung gelesen und mit der isolierten Fixture verglichen. Vor-/Nachvergleich aller 33 Anwendungstabellen erfolgt mit Zeilenzahl und sortiertem JSON-Hash; die neue, standardmäßig 0 gesetzte Berichtsspalte wird dafür ausgeklammert.

Frontend: Merge rückgängig machen und V3.15-Artefakte neu veröffentlichen. Backend: `supabase/rollback/v4-finance.sql` stellt das alte Befehlsverhalten kompatibel wieder her. Die additive Berichtsspalte und die vollständige Kontostandprüfung bleiben dabei erhalten, damit inzwischen veröffentlichte Berichte nicht beschädigt werden. Kein pauschales Zurückspielen alter Finanzdaten. Die frühere Einschränkung des Legacy-Lesezugangs bleibt bestehen.

Produktive Migration: `20261025073340_v4_finance_release_safety`. Vor-/Nachvergleich aller 33 Anwendungstabellen ohne Wert- oder Zeilenzahländerung (zusätzliche Berichtsspalte ausgeklammert). Isoliert außerdem geprüft: bestehender Bericht bleibt vollständig erhalten, neue Kontostandprüfung weist inkonsistente Werte ab, kompatibler Rollback erhält alle Daten und erlaubt späteres Wiederveröffentlichen. Sicherheits-Advisor: identische Befunde vor und nach der Migration, ohne Berücksichtigung des Prüfzeitpunkts; keine neue Warnung. GitHub-Pages-Veröffentlichung erfolgreich: Release-Merge `fe2a4829e093af70f10b4ce3c6b7dca1d3604949`, Workflow `40173365459`. Browser zeigt V4.0 und die reguläre Anmeldemaske mit Passwort als Standard. Bestehende GPT-Site ebenfalls erfolgreich auf V4.0: Source `b7e24ef4d86f8d5be72e6324ae5a7d3d1d6e64f7`, Deployment `appgdep_6addb18c62d88191a49e43af882ec6c4`. Alle 50 statischen Quelldateien stimmen bytegenau überein. Produktiver schreibgeschützter Autorisierungs-Smokecheck bestanden.

Nachprüfung: Alle Modulimporte erhalten dieselbe Cacheversion, damit bestehende Browser keine Mischung aus alten V3- und neuen V4-Modulen laden. Geteilte Sprach-/Sitzungszustände behalten dabei jeweils eine kanonische Modul-URL. Diese Auslieferungskorrektur ändert keine fachlichen Abläufe. Tag `v4.0` ist lokal am Release-Merge erstellt. Remote-Tag und GitHub-Release sind noch offen: kein passender Connector-Schreibweg und keine zusätzliche GitHub-Webanmeldung vorhanden.
