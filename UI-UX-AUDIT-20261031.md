# Ayapark 2 · UI/UX-Audit und Korrekturen

Geprüfte Ausgangsversion: `03887eba777478f2a610fa8d997f9e61b1bd1f41` auf `main`.

## Umfang

Die zehn Hauptbereiche wurden anhand des aktuellen Codes und einer isolierten Browserfassung mit synthetischen Daten geprüft: Übersicht, Wohnungen, Personen, Forderungen, Bankbewegungen, Berichte, Mitteilungen, Dienstleister, Informationen und Einstellungen. Die Rollen Superadmin, Verwaltung und Bewohner sowie Deutsch, Türkisch und Englisch sind berücksichtigt. Für Bewohner werden acht zulässige Bereiche geprüft.

Die Produktionsanwendung bleibt eine native Modul-Anwendung. Nur die Browser-Testfassung wird mit esbuild gebündelt. Ihr Preview-Modus sperrt echte API-Aufrufe; `connect-src 'none'` verhindert zusätzlich Verbindungen. Es wurden keine Konten, Einladungen, Bankbuchungen oder Datenbanktabellen verändert.

## Befunde und umgesetzte Korrekturen

| Bereich | Fehler / Auswirkung | Korrektur |
| --- | --- | --- |
| Navigation | „Zum Inhalt“ änderte die Route zu `#content`, was die Übersicht öffnen und Filter zurücksetzen konnte. | Sprung fokussiert den Inhalt der aktuellen Seite; direkte `#content`-Sprünge erhalten die tatsächliche Route. |
| Mobile Navigation | Ausgeklappte Gruppen ließen sich nicht mit Escape schließen. | Escape schließt die Gruppe und führt zum Auslöser zurück. Klick außerhalb schließt ohne Fokusübernahme. |
| Filter / Einstellungen | Seitenersetzung entfernte den aktiven Such-, Datums- oder Auswahlfokus. | Gemeinsame Fokuswiederherstellung über stabile IDs/Attribute, einschließlich Textauswahl und aufklappbarer Vorfahren. Dialoge und zwischenzeitlich gewählte Kontrollen werden respektiert. |
| Personensuche | Verzögerte Suche konnte nach einem Seitenwechsel erneut rendern und den Fokus zurückholen. | Timer wird beim Navigieren abgebrochen; Rückruf prüft Seite, Sitzung und ursprüngliches Eingabeelement. |
| Bankbewegungen | Suche und Typfilter behielten eine alte Seitennummer bei. | Geänderte Suche/Filter beginnen auf der ersten Ergebnisseite. |
| Leere Bankliste | Keine erklärende Meldung bei null Treffern. | Übersetzter Leerzustand; beide Seitenbuttons bleiben deaktiviert. |
| Suchergebnisse | Dynamische Trefferzahlen wurden nicht zuverlässig angekündigt. | Statusbereiche mit höflicher, vollständiger Screenreader-Ankündigung. |
| Teilaktualisierung | Ersetzte Tabellen erhielten nicht erneut mobile Spaltenlabels und Betragsmaskierung. | Nach Such-, Block- und Typfilterupdates werden beide Erweiterungen erneut angewendet. |
| Tabellen | `colspan` verschob folgende mobile Spaltenlabels. Leere Forderungstabellen hatten bei ausgeblendeter Wohnungsspalte die falsche Spaltenzahl. | Spaltenindex berücksichtigt Spannweiten; Leerzustand nutzt die tatsächliche Spaltenzahl. |
| Personenauswahl | Pfeiltaste bei leerer Trefferliste konnte auf eine nicht vorhandene Option zugreifen. | Leere Listen halten den aktiven Index bei `-1`; keine ungültige aktive Option. |
| Personenauswahl | Home/End blockierten die normale Textbearbeitung; Aufwärtsnavigation startete nicht am Listenende. | Home/End bleiben native Texteingabetasten; initialer Pfeil nach oben wählt den letzten Treffer. |
| Personenauswahl | Combobox meldete auch geschlossen `aria-expanded=true`. | Zustand wird beim Öffnen und Schließen synchronisiert; aktive Referenz wird beim Schließen entfernt. |
| Dunkelmodus | Personensuche verwendete weiße Flächen und feste Hervorhebungsfarben. | Flächen, Schrift und Fokus verwenden die bestehenden Farbvariablen. |
| Formularfehler | Fehler konnten an versteckten Feldern oder in weiterhin geschlossenen äußeren Bereichen hängen. | Sichtbarer Auswahlbutton erhält Fehlerbeschreibung und Fokus; alle aufklappbaren Vorfahren öffnen sich. Bei anderen versteckten Feldern wird die Fehlerzusammenfassung fokussiert. |
| Formularfehler | Auswahländerungen entfernten alte Fehlerzustände nicht durchgehend. | Sowohl `input` als auch `change` bereinigen Feld- und Personenauswahlfehler; ausgewählte Radiobuttons werden bevorzugt. |
| Hintergrundaktualisierung | Zusätzliche Timer und Wiederaufnahme-Handler umgingen die bestehende Eingabeschutzprüfung. | Datenaktualisierung läuft durch den gemeinsamen Idle-Pfad; laufende Eingaben, Dialoge und Schreibvorgänge werden berücksichtigt. |
| Statusmeldung | Ein fehlgeschlagenes Lesen konnte als „gespeichert, Ansicht nicht aktualisiert“ beschrieben werden. | Neutrale Meldung erklärt, dass weiterhin der vorherige Datenstand gezeigt wird. |
| Mobile Berichtsfilter | 13-Pixel-Schrift und feste 40-Pixel-Höhe waren zu klein und konnten auf iOS Eingabezoom auslösen. | Mindestens 16 Pixel / `1rem`, mindestens 44 Pixel Höhe und flexible Höhe auf kleinen Displays. |
| Erstaktivierung | Passwortfelder hatten keine Sichtbarkeitskontrollen wie Anmeldung und Reset. | Beide Felder besitzen beschriftete Augenbuttons. Gemeinsame Bindung ist wiederholbar ohne doppelte Listener; Dialogschließen und Seitenverlassen blenden Passwörter wieder aus. |
| Englische Oberfläche | Darstellungsmenü und Tooltips blieben Türkisch. | Eigene englische Bezeichnungen für System, Light, Dark und das Auswahlmenü. |
| Saldenübersicht | Transparente Beschreibung hatte nur 3,22:1 Kontrast. | Erklärung, Personenmetadaten, Summe und aufgeklappter Button bleiben deckend; bestehende Textfarbvariablen werden genutzt. |
| Kontostand im Dunkelmodus | Hervorgehobene Karte kombinierte dunkle lokale Schriftfarben mit dunkler geerbter Innenfläche; Kontrast teils nur 1,19:1. | Innenfläche und Rahmen verwenden die zur hervorgehobenen Karte gehörenden lokalen Farben. |
| Diagramme mit großer Schrift | Drei Umschaltbuttons verbreiterten Berichte auf sehr schmalen Displays. | Schrumpfbare Container; gleich breite, mehrzeilige Buttons mit Symbol über Text auf kleinen Displays. Kein Abschneiden oder Verbergen der Beschriftung. |

Geänderte Module und Styles erhalten neue Cache-Versionen. Alle Produktionsimporte eines geänderten Moduls nutzen dieselbe Version, damit keine doppelten Modulzustände entstehen.

## Reproduzierbare Prüfung

```bash
npm ci --ignore-scripts
npm test
node qa/prepare-ui-ux-audit.mjs /workspace/ayapark-ui-audit
sites-preview start /workspace/ayapark-ui-audit
```

Die vom Preview-Werkzeug ausgegebene Adresse mit `/audit.html` öffnen. Die Checkbox startet zusätzlich große Schrift im hellen/dunklen Modern-Design und im dunklen klassischen Design. Die separate `/mobile-preview.html` dient der manuellen Bedienprüfung.

Die Standardmatrix umfasst 336 Ansichten: vier Rahmenbreiten (320/390/768/1440 Pixel), drei Rollen und drei Sprachen. Die Variantenmatrix umfasst 252 Ansichten mit großer Schrift, drei Darstellungen und drei Rahmenbreiten (320/390/1440 Pixel), auf Deutsch. Scrollleisten verkleinern den tatsächlichen Inhaltsviewport; beide Werte stehen im Ergebnis. Layout, Überschrift und sichtbare Laufzeitfehler werden für jede Ansicht erfasst. axe prüft pro Matrixkombination die Hauptseiten am 390-Pixel-Rahmen mit WCAG-A/AA-Regeln.

## Grenzen

Automatische Barrierefreiheitsprüfungen ersetzen keinen vollständigen Screenreader- oder Nutzertest. Diese Prüfung umfasst synthetische Rollenansichten und ausgewählte Formulare/Interaktionen. Authentifizierte Produktionsabläufe, echte Einladungszustellungen, Dateiuploads, alle möglichen Datenlängen und sämtliche Gerätekombinationen sind damit nicht vollständig nachgewiesen. Die vorhandenen fachlichen Tests prüfen ergänzend Berechtigungs-, Finanz- und Formularlogik.

## Abschlussergebnis

- 405 automatisierte Tests erfolgreich, 0 fehlgeschlagen.
- 336 Standardansichten und 252 zusätzliche Varianten erfolgreich geprüft. Kein horizontaler Seitenüberlauf und keine von den ausgeführten axe-Prüfungen gemeldeten Verstöße. Insgesamt 112 axe-Prüfläufe.
- Manuell im Browser bestätigt: Escape-Navigation, Bank-Leerzustand, Datumsfokus und Inhaltssprung unter Erhalt von Route und Filter.
- Ergänzende DOM-Prüfung bestätigt leere Personensuche, Combobox-Zustand und Fehlerfokus in verschachtelten Bereichen.
- Protokolle: `qa/results/ui-ux-matrix-20261031.json`, `qa/results/ui-ux-variants-20261031.json`, `qa/results/ui-ux-summary-20261031.json`.
- Visueller Nachweis mit Beispieldaten: `qa/results/ui-ux-mobile-berichte-20261031.jpg`.
