> Historischer Entwicklungsbericht vor der Freigabe. V5 ist inzwischen nach ausdrücklicher Anweisung produktiv veröffentlicht; aktueller Status, Sicherungsnachweis und Grenzen: [RELEASE-V5.md](RELEASE-V5.md).

# Ayapark 2 V5 – Implementierung, Prüfung und Freigabe

Prüfdatum: 25.10.2026. Entwicklungsbranch: `feature/v5-finance-notifications`.

## A. Gesamtbewertung und Umfang

Funktionsfähiger Entwicklungsstand auf Basis von main V4.0 `f124431e4229d595127daa9f72a010137be4e29d` und dem noch nicht veröffentlichten Modern-Stand `ff225f98099fd38d17a8f3a34e2c4e539c39edb6` (PR #22). Modern ist jetzt der Standard für Geräte ohne gespeicherte Designwahl. Explizite klassische Einstellungen und deren Farbwelten bleiben erhalten. Die Auswahl liegt unter Mehr → Einstellungen → Erscheinungsbild → Design.

Die produktive Datenbank wurde nur über Metadaten gelesen: Tabellen/RLS, Policies und vorhandene Funktionsdefinitionen. Die bestehenden versionierten Bestätigungen, Autorisierung und Buchungsfunktionen wurden weiterverwendet. Keine produktiven Schreibtests, Migrationen, Einspielung von Beispieldaten oder Veröffentlichung auf GitHub Pages. Auch die bereits verbundene Modern-Site wurde nicht überschrieben.

## B. Behobene Probleme nach Priorität

| Priorität | Problem | Umsetzung / Nachweis |
| --- | --- | --- |
| Hoch | Eine bloße UI-Freigabe würde wohnungsbezogene Finanztransparenz nicht sicher ermöglichen. | Neue serverseitige Wohnungssicht für aktuelle Zuordnungen; fremde Wohnungen gesperrt. Rohe Bankdaten bleiben verwaltungsintern. SQL-Rollentests. |
| Hoch | Zahlungsüberschüsse und mehrere Schuldner dürfen nicht ungeprüft verrechnet werden. | Vorschau pro Zahlung, Wohnung, Person und Forderungsgruppe; älteste Fälligkeit zuerst; Restguthaben; veraltete Vorschau wird abgewiesen. |
| Hoch | Sammelforderungen können bei Wiederholung oder Teilfehlern doppelt/teilweise entstehen. | Eine Transaktion, Vorgangs-ID und payloadgebundene Idempotenz; serverseitig neu berechnete Beträge; vollständiger Rollback bei Fehlern. |
| Hoch | Bestätigung einer alten Mitteilungsversion oder einer fremden Zielgruppe. | Benutzer-, Zielgruppen- und Versionsprüfung im RPC; bestehende Bestätigungen bleiben historisch erhalten. |
| Mittel | Unklare Trennung von Beitragsbefreiung und Verwaltervergütung. | Eigene befristete Regeln mit Beschlussreferenz; Vergütung reduziert Hausgeld nicht automatisch und erzeugt keinen Bankumsatz. |
| Mittel | Unübersichtliche mobile Navigation und große Kopfbedienung. | Vier untere Hauptbereiche, ein nur bei Bedarf geöffnetes Untermenü, kompakte Kopfzeile mit beschrifteten Symbolen. |
| Mittel | Verschachtelte Ausnahmeregel verlor den Rückweg zum Hausgeldformular. | Im Browser entdeckt und behoben; Eingaben bleiben beim Speichern und Abbrechen erhalten. |
| Niedrig | Währungsformat, Designzugriff und Installation uneinheitlich. | ₺/€, einheitliche Formatierung, Design in Einstellungen, Bewohner-Installationsbanner mit siebentägigem Ausblenden. |

## C. Tatsächlich implementiert

- Glocke mit ungelesener Anzahl, Titel/Datum/Priorität/Status und direktem Öffnen. Normale Mitteilungen ohne automatisches Pop-up; wichtige optional bei Anmeldung; dringende mit nicht per Escape schließbarer Bestätigung.
- Empfänger: alle, Eigentümer, Mieter/Bewohner, Vertreter, Wohnungen oder Blöcke. Mehrfachrollen erzeugen keine doppelten Mitteilungen. Zusätzliche Eigentümer-/Bewohnermitteilungen für Vertreter setzen eine ausdrücklich gespeicherte Vollmacht voraus; Mandatsänderungen werden mit Vorher/Nachher protokolliert.
- Deutsche und türkische Mitteilungstexte mit bestehendem türkischem Rückfalltext. Bearbeiten erzeugt eine neue bestätigungspflichtige Revision; reine Bearbeitung erhöht ebenfalls die Revision (bewusst konservative vorhandene Logik).
- Superadmin-Test mit dem angeforderten zweisprachigen Text: anzeigen, bestätigen, zurücksetzen, erneut öffnen, deaktivieren. Die Teststeuerung arbeitet ausschließlich im Arbeitsspeicher und ruft keine Bestätigungs- oder Versand-RPCs auf. Ein Neuladen entfernt den Test. Das gilt auch beim Superadmin-Test in einer später produktiven Installation.
- Sammelforderungen: alle/A/B/ausgewählt, begründete Ausnahmen, Gesamtbetrag/Festbetrag/Anteile, ausdrückliche Schuldnerzuordnung, bestätigte centgenaue Vorschau. Historische Kategorien bleiben erhalten.
- Monatliches Hausgeld mit befristeten Ausnahmen und Historie; Deaktivieren statt Löschen. Abweichender Referenzbetrag stoppt die Befreiung zur erneuten Beschlussprüfung.
- Ausgabe, neue Forderung und Zahlungsausgleich bleiben separate Funktionen. Budgethinweis ist ohne gepflegte Rücklagen und Planbeträge ausdrücklich unbekannt.
- Wohnungssicht zeigt Forderungen und zugehörige Zahlungen ohne eine fremde Verpflichtung als persönliche Schuld des angemeldeten Bewohners zu bezeichnen. Historische persönliche Forderungen bleiben sichtbar, begründen aber keinen Zugriff auf fremde Wohnungskonten.
- Recht & Informationen mit sieben kurzen zweisprachigen Themen und amtlichen Quellen.

## D. Performance und Messgrenzen

Keine behaupteten Prozentverbesserungen und keine neuen Messungen an produktiven Konten. Eine Sammelforderung verwendet clientseitig **einen Command-RPC**, auch bei 20 Wohnungen; die bestehende Datenaktualisierung folgt getrennt. Intern werden die bewährten Einzelfunktionen innerhalb derselben Transaktion verwendet. Ein Regressionstest sichert den RPC-Aufruf ab. Im alten UI waren solche Forderungen einzeln anzulegen; reale Vorher-/Nachher-Netzwerklatenzen wurden nicht gemessen.

Glocke und Mitteilungsübersicht nutzen die mit dem Workspace bereits geladenen Daten und erzeugen beim Öffnen keine zusätzliche Lesenanfrage. Die neue Workspace-Erweiterung bündelt Ausnahmen und Budget; keine Abfrage pro Wohnung. Ruhende angemeldete Ansichten aktualisieren sich frühestens nach 90 Sekunden beziehungsweise bei Rückkehr zum Fenster mit Mindestabstand; nicht während einer offenen Eingabemaske. Keine neue Realtime-Infrastruktur für 20 Wohnungen.

Zwei gezielte Indizes für aktuelle Ausnahmen und Forderungsgruppe/Fälligkeit. Die bereits optimierte finanzgeschützte Bankpolicy wurde nicht ersetzt. Produktionspläne, Locks unter echter Parallelbelastung und reale mobile Netzwerkzeiten sind noch nicht gemessen.

## E. Reproduzierbare Prüfung

```sh
npm ci
npm test
npm run test:sql
npm run test:v5:sql
node qa/prepare.mjs /workspace/sites/ayapark-v5-qa
sites-preview start /workspace/sites/ayapark-v5-qa
```

SQL-Tests initialisieren PGlite ausschließlich im Arbeitsspeicher mit synthetischen Konten und der Schema-Fixture. Sie akzeptieren keine Datenbank-URL. Die neue Migration wird nur dort angewandt. `test:sql` prüft zusätzlich die bestehende V4-Suite.

Browser: lokale QA-Seite öffnen, Modern auswählen, „Gesamte Matrix prüfen“, dann „Weitere Formulare prüfen“. Klassisch wählen und „Schrift und Farbwelten prüfen“. Die Matrix prüft 320/375/390/430/768/1024/1440 Pixel, DE/TR, Hell/Dunkel und die passenden drei Rollen. Axe-Core prüft die ausgewählten Fälle bei 390 Pixeln auf WCAG A/AA; das ist keine umfassende manuelle Barrierefreiheitszertifizierung.

- JavaScript-Suite: **168 bestanden, 0 fehlgeschlagen** (einschließlich 20 neuer V5-Tests).
- Bestehende SQL-Suite: **120 bestanden, 0 fehlgeschlagen**.
- Neue SQL-Suite: **46 bestanden, 0 fehlgeschlagen**, darunter 1/10/20 Wohnungen, Anteilsschlüssel, Rollback/Idempotenz, Ausnahme/Vergütung, Teilzahlung/Guthaben, Stornohistorie, fremde Wohnung/Bankdaten, Zielgruppen/Versionen/Vertretermandate und anonymer Zugriff.
- Browser-Hauptmatrix: **924 Ansichten**, kein horizontaler Überlauf; **56 Axe-Prüfungen**, keine gemeldeten Verstöße.
- Zusätzliche Formulare/Pop-ups: **392 Ansichten**, kein horizontaler Überlauf; **56 Axe-Prüfungen**, keine gemeldeten Verstöße. Letzte Wiederholung nach den abschließenden Formularkorrekturen separat protokolliert.
- Klassische Farbwelten, große Schrift und Kontrastvarianten: **144 Ansichten**, kein horizontaler Überlauf.
- Interaktiver Browser-Smoke-Test: Testmitteilung anzeigen → Gelesen → zurücksetzen → erneut öffnen → Gelesen → deaktivieren; Sammelforderung 100,01 ₺ auf 20 Wohnungen mit bestätigter Speicherung; Zahlung 3.600 ₺ auf richtigen aktuellen Schuldner, historische 7.200 ₺ unverändert; befristbare Testausnahme und Rückkehr zum ausgefüllten Hausgeldformular, Vorschau 19 × 3.600 ₺ = 68.400 ₺.

Die Belege in `qa/results/` enthalten ausschließlich synthetische Daten. Desktop-, mobile und Pop-up-Aufnahmen liegen in `qa/evidence/`.

## F. Migration und sichere Einführung

Migration: `supabase/migrations/20261025194333_v5_notifications_finance.sql`, über Supabase CLI erzeugt. Additive Felder/Tabellen, RLS und gezielt erweiterte Funktionen/Policies. Keine Löschung oder Umschreibung bestehender Finanzdatensätze. Historische Gruppen erhalten einen konservativen Kategorie-Rückfall; keine automatische Umklassifizierung.

**Noch nicht auf Produktion angewandt.** Vor Einführung:

1. Tatsächliche Supabase-Backups, Aufbewahrung und Wiederherstellungsmöglichkeit im gewählten Tarif überprüfen; eine aktuelle Sicherung/isolierte wiederherstellbare Kopie und einen Restore-Test nachweisen. Diese Backups wurden in dieser Runde nicht als verfügbar bestätigt. Git ist kein Datenbankbackup.
2. Aktuelle vollständige Schema-/Funktionsdefinitionen mit der Fixture abgleichen, insbesondere seit dem Ausgangsstand neu eingegangene Migrationen.
3. Migration in einer separaten Supabase-Testumgebung samt Rollen/Auth und PostgREST testen. PGlite ersetzt den SQL-Kern, nicht die gesamte Supabase-Plattform.
4. Ausdrückliche Freigabe für produktive Migration und App-Veröffentlichung einholen. Neue Frontendversion setzt `ay5_workspace`, `ay5_command` und `ay5_payment_plan` voraus; diese Reihenfolge beachten.
5. Zunächst Migration, dann freigegebenen Frontendstand veröffentlichen und kontrollierte Anmeldung/Rollenprüfung durchführen. Vor realen Buchungen die Vorschau und Beschlussgrundlagen durch die Verwaltung prüfen lassen.

### Rückfallstrategie

Vor Migration kann vollständig auf den dokumentierten Git-Ausgangspunkt zurückgegangen werden. Nach Migration neue Tabellen/Felder und Buchungshistorie erhalten: **kein Down-Script mit DROP/DELETE/TRUNCATE**. Bei Problemen zunächst die drei neuen öffentlichen V5-RPCs für `authenticated` sperren und das V5-Frontend aus dem Verkehr nehmen. Den zuvor gesicherten Frontendstand wiederherstellen; gezielte Korrektur als neue Vorwärtsmigration.

Die gezielten Mitteilungs-/Bestätigungsprüfungen und der Schutz roher Bankdaten dürfen beim Rückfall nicht durch eine alte breite Policy ersetzt werden. Bereits gezielt versendete Mitteilungen müssen auch im alten Frontend serverseitig geschützt bleiben. Bereits gebuchte Forderungen, Zuordnungen, Guthaben und Bestätigungen werden nicht „zurückgesetzt“; fachliche Korrekturen erfolgen über protokollierte Storno-/Korrekturvorgänge. Ein Schema-Restore nach neuen realen Buchungen benötigt gesonderte Abstimmung, sonst gingen neue Daten verloren.

## G. Offene Grenzen und Empfehlungen

- Keine produktive Freigabe durch diesen Entwicklungsstand. Echte Authentifizierung nach Gerätewechsel, physische Android-/iOS-Geräte, native Installation und parallele Supabase-Transaktionen müssen im freigegebenen Staging folgen. Die dauerhafte Benutzer-/Versionsbestätigung ist im isolierten PostgreSQL-Kern geprüft.
- Standardmäßige Vertreter-Wohnungseinsicht setzt eine gültige aktuelle eingetragene Zuordnung voraus. Zusätzliche Empfängergruppen werden nur über die neue Vollmacht aktiviert; bestehende Vertreter erhalten keine stillschweigend erweiterten Benachrichtigungsmandate.
- Anteile werden je Vorgang bewusst eingegeben und als Verteilungsgrundlage gespeichert; es wurden keine realen Miteigentumsanteile geraten oder importiert. Zusammengehörige Gemeinschaftsschulden mit mehreren Eigentümern werden nicht automatisch rechtlich aufgeteilt: der ausdrückliche ausgewählte Schuldner und die Beschlussgrundlage bleiben maßgeblich.
- Revisionsnachvollziehbare App-Historie, keine Zusicherung einer externen steuerrechtlichen oder GoBD-Zertifizierung. Die Datenbankadministration bleibt ein privilegierter Zugriff außerhalb normaler App-Rechte.
- Budgetanzeige setzt gepflegte Zweckbindung/Planbeträge voraus. Sie ersetzt weder Wirtschaftsplanbeschluss noch Liquiditätsprüfung.
- Browser können eine außerhalb des Browsers bereits installierte/entfernte App nicht auf allen Plattformen zuverlässig erkennen. Standalone-Modus und vorhandene Installationsereignisse werden berücksichtigt; iOS nutzt die Anleitung. Ausblenden gilt sieben Tage.
- Zusätzlich geprüft: Die vorhandene Rollenconstraint verhindert eine reine Schuldner-/Quellenrolle in aktuellen Wohnungszuordnungen. Die Wohnungssicht nennt Eigentümer/Mieter/Vertreter zusätzlich ausdrücklich; zukünftig beginnende Zuordnungen mit gesetztem Aktiv-Flag erweitern die Sicht nicht. Eigene historische Forderungen bleiben erhalten.
- Neue fachliche Beschlüsse nicht aus alten Dokumenten ableiten. Es wurde keine echte Beitragsbefreiung für eine benannte Person eingerichtet.

## Amtlicher Rechtsprüfstand

Geprüft am 25.10.2026 anhand amtlicher Quellen, einschließlich der 2026er Änderung 7579 zu KMK 35/37. Keine automatischen rechtlichen Forderungen oder Verzugsbeträge daraus erzeugt:

- Konsolidierter KMK, Justizministerium/UYAP: https://mevzuat.adalet.gov.tr/mevzuat/103807 (Art. 20, 22, 35, 36, 37, 38, 40).
- Verkündeter Gesetzestext 7579, TBMM: https://cdn.tbmm.gov.tr/KKBSPublicFile/D28/Y4/KanunMetni/4a0770ce-a99c-4076-869a-2a82df999e29.htm
- KVKK 6698: https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law
- KVKK-Veröffentlichung zu Schuldenlisten, Entscheidung 2026/348: https://www.kvkk.gov.tr/Icerik/8719/toplu-yapilarda-apartman-site-sakinlerine-ait-borc-bilgilerinin-ortak-yerlere-asilmasi-hakkinda-kamuoyu-duyurusu
