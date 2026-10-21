# V2-Abschlussstand – 20.10.2026

**Private App:** https://ayapark2-v2-private.kemcap.chatgpt.site

**Quellbranch:** `kemcap/ayapark2`, `ayapark-v2`. Die alte Website wurde nicht veröffentlicht, ersetzt oder gemergt.

## Fertig implementiert

- Neues responsives Design und durchgehende Wohnungsdetails.
- Bestehender Supabase-Login und drei Ansichten mit serverseitigen V2-Zusatzrechten.
- Eigener Bank-/Forderungs-/Zahlungsbereich mit integerbasierten Geldbeträgen.
- CSV-Vorschau, Import, Wiederholungsschutz, manuelle Buchung und Storno.
- Einzel- und Monatsforderungen, Teilzahlungen, Zuordnung und begründete Korrekturen.
- Geschützte Prüfliste für Altbestände; Bestätigen oder mit Begründung ausschließen.
- Personenpflege, Archivstatus, Duyurular und gemeinsame Monatsberichte.
- CSV-/Druckexport, Auditverlauf und konsistente Abfragen.
- Geschützter Import des bereitgestellten Bankbestands: 1.714 Buchungen, Salden vollständig abgeglichen.

## Bestätigte Datenbankänderungen

Nur neue V2-Objekte wurden angelegt. Bestehende Tabellen, Policies, Auth-Einstellungen und Funktionen bleiben unverändert.

| Supabase-Version | Name |
| --- | --- |
| 20261020145217 | ayapark_v2_isolated_finance |
| 20261020150258 | ayapark_v2_consistent_workspace |
| 20261020150554 | ayapark_v2_idempotent_allocation |

Elf neue öffentliche Tabellen mit RLS; keine anonymen Tabellen- oder RPC-Freigaben. Drei öffentliche Funktionen laufen als Aufrufer; die geschützte Implementierung prüft jede Schreiboperation. Gleichzeitige V2-Finanzbefehle werden je Site serialisiert. Ein erneuter Zuordnungsauftrag mit derselben Request-ID wird nicht doppelt gebucht; veränderte Werte mit derselben ID werden abgewiesen.

## Validierung

- 22 automatische Tests bestanden, darunter echte Postgres-RLS-Tests mit Manager, Verwaltungsmitglied, Bewohner und fremdem Benutzer.
- Syntaxkontrollen aller Module und HTML-/DOM-Verweise bestanden.
- Verbundenes Projekt: berechtigter Manager erhält 1.714 Buchungen, 22 Prüffälle und 0 bestätigte übernommene Forderungen.
- Neuer Bankbestand: letzter Buchungstag 11.10.2026. Datenbankanzahl und Gesamtbetrag entsprechen der geprüften Extraktion; echte Beträge sind nicht im öffentlichen Quellcode enthalten.
- Supabase-Berater meldet keine zusätzlichen V2-Sicherheitsbefunde. Vorhandene Altbefunde bleiben dokumentiert.
- Private Bereitstellung wurde vom Hosting-Dienst als erfolgreich bestätigt.

## Noch fachlich abzunehmen

Die **Software-Kernabläufe sind implementiert**. Eine vollständige Produktivfreigabe oder Ablösung des Altsystems ist noch nicht erfolgt.

1. Die 22 Altbestände in „Aidat & borçlar → Devir kayıtlarını incele“ Wohnung und Verantwortlichem zuordnen. Zeitraum, Mehrfachausdrucke und İcra-Überschneidungen prüfen.
2. Die Oberfläche im Desktop- und Mobilbrowser mit echten Rollen-Logins abnehmen. In dieser Umgebung war kein unterstützter interaktiver Browsertest verfügbar.
3. Vor einer öffentlichen Umstellung die alten öffentlichen Forderungszugriffe in einer abgestimmten Migration schließen. Bestehende Bewohner dürfen dabei nicht unerwartet ausgesperrt werden.

Die separate private App kann bereits aufgerufen werden. Sie startet mit Beispieldaten; echte V2-Änderungen sind erst nach Supabase-Anmeldung mit passenden Rechten möglich.


## Fortschritt 21.10.2026: Altbestandsprüfung

- Die Originalseiten wurden zusätzlich visuell geprüft; drei unvollständige/fehlerhafte Wohnungshinweise im geschützten V2-Prüfbestand korrigiert. Keine Forderung bestätigt oder Zahlung zugeordnet.
- Die Prüfansicht zeigt nun belegte Wohnungsangaben, vorsichtige Vorschläge aus passenden Bankbeschreibungen und die zugrunde liegenden Datums-/Referenzhinweise.
- Im vorhandenen Bestand ergeben sich 11 explizite Wohnungsangaben und 7 ergänzende Vorschläge aus Bankbeschreibungen. Vier Fälle benötigen weiterhin eine Blockbestätigung. Vorschläge sind keine fachliche Freigabe.
- Ein späterer namens- und betragsgleicher Geldeingang wird gesondert hervorgehoben. Parallele allgemeine und İcra-Fälle derselben Person werden zur Überschneidungsprüfung markiert.
- Keine personenbezogenen Prüfdaten oder Beleginhalte werden im öffentlichen Quellcode gespeichert.
- 31 Tests bestanden. Zusätzlich im Desktop-Browser mit Beispieldaten geprüft: Teilzahlung korrekt verarbeitet, Bewohneransicht begrenzt und Devir-Dialog mit Vorauswahl sowie ausdrücklicher Bestätigung geöffnet. Die Request-ID-Erzeugung wurde für HTTP-Vorschauen korrigiert. Echter Passwort-Login und Mobilgerät-Abnahme bleiben offen.

Prüfansicht mit ausschließlich fiktiven Daten: [Screenshot](docs/devir-pruefung-beispiel.jpg).

## Fortschritt 21.10.2026: Helle und dunkle Darstellung

- Kleine Mond-/Sonnentaste oben rechts; per Maus und Tastatur bedienbar, mit zugänglicher Zustandsanzeige.
- Auswahl wird ausschließlich lokal als Darstellungspräferenz gespeichert. Ohne Auswahl folgt die App der Systemeinstellung. Frühe Initialisierung verhindert einen unnötigen hellen Zwischenstand.
- Navigation, Statusanzeigen, Tabellen, Formulare und Dialoge verwenden passende helle/dunkle Farben. Druckberichte behalten die helle Palette.
- Desktop-Browserprüfung mit Beispieldaten: Umschalten in beide Richtungen, Tastaturbedienung, Speicherung nach Neuladen und Dialogfarben geprüft. Alle 31 bestehenden Tests bestanden; Syntaxprüfung und Git-Diff-Prüfung ohne Fehler.
- Keine Datenbankänderung. Die Änderung betrifft ausschließlich V2; `main` und die alte Live-Anwendung bleiben unverändert.

Dunkle Ansicht mit ausschließlich fiktiven Daten: [Screenshot](docs/dark-mode-beispiel.jpg).


## Fortschritt 21.10.2026: Deutsche Entwicklungsansicht

- DE-/TR-Sprachtaste unmittelbar links neben dem Tag-/Nacht-Schalter; Auswahl bleibt lokal nach Neuladen erhalten. Der Wechsel benötigt keinen externen Dienst und meldet Benutzer nicht ab.
- Menüs, Formulare, Hinweise und lokale Fehlermeldungen in Deutsch; Datum und Geldanzeige folgen der Sprache. Originalinhalte und technische Kategorie-/Rollenwerte bleiben unverändert. Nicht zugeordnete Servermeldungen bleiben im Original.
- Direkte A-/B-Blocktasten statt des bisherigen Dropdowns. Erneutes Antippen des aktiven Blocks hebt den Filter auf. Suche und Statusfilter gelten weiterhin zusätzlich.
- 34 Tests bestanden, einschließlich Sprachwechsel aller Ansichten, unverändertem Originalinhalt, unveränderten Formularwerten und Rollenfilterung. Desktop-Browserprüfung: Deutsch/Türkisch in beide Richtungen, Sprache nach Neuladen, Blockfilter und deutsches Forderungsformular.
- Bestehende Live-Version, Datenbank und die vorgemerkte größere Designänderung wurden nicht verändert.

## Vorgemerkte Wünsche – noch nicht umgesetzt

- Gebäudefarben: helle Oberfläche in gebrochenem Weiß, Anthrazit und Terrakotta; dunkle Oberfläche in Anthrazit mit weichen Kupferakzenten. Grün bleibt für positive Status.
- Schematische Gebäudemarke; Gebäudefoto für einen geeigneten größeren Bereich. Die konkrete Ausführung ist noch abzustimmen.
- Kompakte Haupt-/Unterkategorien mit Umbruch auf ein 2×2-Raster bei schmalen oder vergrößerten Ansichten.
- Wohnungsplan nach Skizze: B links, A rechts; jeweils 9/10, 7/8, 5/6, 3/4, 1/2 von oben nach unten.
- Suche nach gespeicherten Eigentümer-/Mieternamen mit Verweis auf die zugeordnete Wohnung, unter bestehenden Zugriffsrechten.
- Leerstand (Boş) durch einen dezenten Rotton klarer von bewohnt (Dolu) unterscheiden, zusätzlich zur Beschriftung.
- Englisch und gegebenenfalls weitere Sprachen später.

Deutsche Ansicht mit ausschließlich fiktiven Daten: [Screenshot](docs/deutsch-blockfilter-beispiel.jpg).
