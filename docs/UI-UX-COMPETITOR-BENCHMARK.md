# AyaPark 2 – UI/UX-Wettbewerbsrecherche und Vergleichsmaßstab

Stand: 30.10.2026 · Status: **Erste öffentlich belegte Desktop-/Mobile-Produktrecherche, KEIN vollständiger UX-Benchmark**
Geltungsbereich: AyaPark 2 (20 Wohnungen, 2 Blöcke, Superadmin/Verwaltung/Bewohner, DE/TR).

## Methodik / Grenzen
- Ausgangslage: Bisherige `AUDIT-20261026.md`, `UI-UX-AUDIT-V4.md`, `MODERN-DESIGN.md` prüfen **primär AyaPark 2 selbst** (Funktionen, Navigation, Accessibility, Tests).
- Am 30.10.2026 wurden **öffentliche Herstellerseiten** von vier türkischen Hausverwaltungsangeboten und UX-Standards überprüft.
- Die Herstellerseiten beschreiben Fähigkeiten und Abläufe, sind **Marketing-/Produktbeschreibungen**. Ohne echten autorisierten Testzugang keine Aussage, dass konkrete UI-Flows gut funktionieren, welche Screens wirklich erscheinen oder wie performant sie sind.
- **NICHT durchgeführt**: Produkt-Demos mit Login, systematische Screenshot-/Videokodierung, heuristische Einzelbewertung der vier UI, unabhängige Nutzertests, Zeitmessungen oder Barrierefreiheitsprüfungen der Wettbewerber.
- Einzelne Umsetzungsvorschläge unten sind **eigene Hypothesen für AyaPark**, kein angeblich nachgewiesenes Design des Wettbewerbers. Keine blinde Kopie fremder UI, Texte, Grafiken oder Code.

## A. Belegte Vergleichsanbieter (offizielle Anbieterquellen)

### Apsiyon
Offizielle Produktseite: https://www.apsiyon.com/urunler/apsiyon
Manager-Mobil-App: https://www.apsiyon.com/yonetici-mobil-uygulama
**Hersteller beschreibt:** nach Eigentümer/Mieter/Wohnung/Kategorie differenziertes Aidat; automatische Bankzuordnung; Finanzen/Reporting; Bewohner- und Personenmanagement; Aufgaben, Einladungen und mobile Manager-Übersicht.
**AyaPark-Fragen:** Welche 3–5 Informationen helfen dem Superadmin morgens zuerst? Wie trennen wir Bankimport und endgültige Buchungsfreigabe? Kann man Wohnung, Person und offene Forderung mit wenigen klaren Schritten verbinden?
**Nicht belegt:** tatsächliche Navigationshierarchie, Anzahl Klicks, Qualität konkreter Screens.

### Yönetimcell
Startseite: https://yonetimcell.com/
Funktionsseite: https://yonetimcell.com/site-apartman-yonetim-program-ozellikleri.html
**Hersteller beschreibt:** rollenspezifische Zugänge; Zugriff auf Salden und ggf. aggregierte Berichte; Excel-Export; separate Historie früherer Eigentümer/Mieter und Mehrfachzuordnungen.
**AyaPark-Fragen:** Ist die Trennung Eigentümer/Kiracı und Altlasten ohne Missverständnisse verständlich? Sind sensible Daten in Bewohneransichten tatsächlich getrennt? Lässt sich Historie nachvollziehen, ohne den aktuellen Bewohner zu belasten?
**Nicht belegt:** echte Layouts, Auth-/RLS-Qualität oder Barrierefreiheitsstandard der Konkurrenz.

### AidatPro
Offizielle Website: https://www.aidatpro.com.tr/
Aidat-Produktseite: https://www.aidatpro.com.tr/ozellikler/aidat-ve-tahsilat-takibi
**Hersteller beschreibt:** separate Verwaltungs- und Bewohnerbereiche; offene Salden, aktuelle Zahlungen, Mitteilungen, Aufgaben/Anfragen und Berichte.
**AyaPark-Fragen:** Welche Kennzahlen und Handlungsaufforderungen sind im eigenen Dashboard entscheidungsrelevant? Trennung zwischen offenem Betrag, Zahlungseingang, unklarer Zuordnung und echtem Fehler.
**Nicht belegt:** in der Werbung gezeigte Beispielwerte als echte Kundenresultate oder unabhängig gemessene UX.

### Yönetion
Offizielle Feature-Seite: https://yonetion.com/ozellikler/
**Hersteller beschreibt:** Excel-Bankliste importieren, Zahlungseingänge anhand Verwendungszweck vorschlagen und zur Bestätigung stellen; getrennte Rollen; Mitteilungen und ein vereinfachter Gesamtüberblick.
**AyaPark-Fragen:** Schrittfolge Import → Vorschlag → nachvollziehbare Prüfung → Freigabe → verbuchte Zuordnung, mit Mehrfachzuordnung und Gebühren- bzw. Dubletten-Schutz.
**Nicht belegt:** Sicherheit der tatsächlichen Zuordnung, Einhaltung unserer Finanzlogik oder Qualität der Rückgängig-Funktion.

## B. Allgemeine und überprüfbare UX-Standards

- Nielsen Norman Group: https://www.nngroup.com/articles/ten-usability-heuristics/
  - Systemstatus immer verständlich anzeigen; Fehler möglichst verhindern; relevante Optionen sichtbar machen statt Auswendiglernen; verständliche Fehlermeldungen und Korrekturwege.
- Nielsen Norman Group – Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
  - Häufige Aufgaben zuerst; seltene/erweiterte Funktionen hinter erkennbarer sekundärer Ebene, **ohne** wichtige Aktionen zu verstecken.
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
  - Ziel WCAG 2.2 AA. Wichtig: Kriterium 2.5.8 fordert grundsätzlich **24×24 CSS-Pixel** oder definierte Ausnahmen/Abstände; 44 px ist AyaParks **eigenes Komfortziel** und nicht pauschal die WCAG-AA-Schwelle.
- Android Developers – Responsive Navigation: https://developer.android.com/develop/ui/views/layout/build-responsive-navigation
  - Navigation an Bildschirmbreite/Anwendungsaufgaben anpassen; kompakte Navigation, Rail oder seitliches Menü je nach Anzahl von Zielen und verfügbarem Platz.

## C. Konkrete AyaPark-UI/UX-Hypothesen (erst nach Ist-Prüfung entscheiden)

| Thema | Vorgesehener Vergleich / Designhypothese | Nachweis vor Umsetzung |
|---|---|---|
| Superadmin-Dashboard | Ungeklärte Bankeingänge, offene Forderungen, nächste genehmigungspflichtige Aktion; klare Trennung der Kennzahlen | Aufgabenanalyse mit echten Rollen, aktuelle Screens/Flows |
| Bewohner-Startseite | Eigene fällige Posten, Zahlungsstand, relevante Bekanntmachungen; keine fremden Schuldnerlisten | RLS- und Rolle-Tests, 5 synthetische typische Fälle |
| Navigation mobil | Direkt sichtbare Hauptbereiche statt unklarer horizontaler Tab-Slider, höchstens eine klare Unterebene | Geräte-/Viewport-Matrix, Einhandbedienung |
| Navigation Desktop | Frequente Verwaltungsfunktionen auffindbar; Bündelung nur wenn Such-/Klicktests besser sind | Zeit-/Schrittvergleich bisher gegen Prototyp |
| Bank-/Buchungsflüsse | Vorschau, Zuordnungsbeleg, explizite Freigabe, nachvollziehbares Storno statt irreversiblem Editieren | Fehlerfälle, doppelte Referenzen, geteilte Zahlungen, striktes RLS |
| Personen-/Wechsel | Aktuelle und historische Wohnungszuordnung mit klarer Gültigkeit und Schuldnertrennung | synthetische Eigentümer-/Mieterwechsel und rechtliche Regel |
| DE/TR, Anmeldung | Klarer Einstieg für bestehende Konten vs Erstaktivierung; Formularzustand bei Sprachewechsel erhalten | realistische Tests beider Sprachen, Auth-Regression |
| Designsystem | Bestehendes Modern-Design auf Funktionalität prüfen, Tokens vereinheitlichen, Kontrast und Schriftgrößen sichern | WCAG-Prüfung, Dark/Light, Schriftvergrößerung |
| Performance | Keine Daten aus Übersicht ausblenden, bloß um sie schneller erscheinen zu lassen; gezielt laden und aggregieren | echte Browser-Metriken, korrektes Saldo-/Audit-Ergebnis |

## D. Geplante echte Vergleichsstudie – offene Checkliste

- [ ] Aktuelle Referenzoberflächen je Anbieter aus legal zugänglicher offizieller Demo/Screenshot/Videodokumentation identifizieren, Datum/Quelle und Zugangsgrenzen festhalten.
- [ ] Vergleichsmatrix mit denselben Aufgaben pro Anbieter anlegen: Resident sieht eigene Schuld; Verwalter findet Person/Wohnung; Bankzuordnung prüfen; Mitteilung veröffentlichen; Storno; Berichte.
- [ ] Pro Aufgabe Navigationstiefe, Klicks, Verständlichkeit, Fehlerprävention und mobile Lesbarkeit erheben; bei fehlendem Zugang `nicht geprüft` statt erfundenen Wert eintragen.
- [ ] 5–7 synthetische AyaPark-Testfälle für Bewohner/Verwaltung/Superadmin, inkl. ältere/unerfahrene Nutzer, Deutsch/Türkisch.
- [ ] Ist-Screens der aktuell veröffentlichten AyaPark-Version aufnehmen und mit vorhandenen Audits abgleichen; vorhandene Features und spätere Korrekturen nicht doppelt bauen.
- [ ] UX-Backlog priorisieren: P0 Berechtigung/Datenverlust/Verwirrung bei Buchungen, P1 alltäglicher Ablauf/Mobilnavigation, P2 rein visuelle Verbesserung.
- [ ] Pro Verbesserung messbare Akzeptanzkriterien, Vorher-/Nachher-Tests, Screenshot-Dokumentation und Rückfallplan festlegen.
- [ ] Vor echtem Redesign separaten Branch/Prototyp, Review und ausdrückliche Freigabe einholen.

## E. Entscheidung für AyaPark

Keine kommerzielle Vollsuite nachbauen. Zweckmäßig ist ein **kleiner, klarer, schneller und sicherer** Verwaltungsarbeitsplatz für genau 20 Wohnungen mit drei Rollen. Etablierte Anbieter dienen zur **Aufgaben- und Musteranalyse**, nicht als Verpflichtung zur Übernahme ihrer Funktionsmenge.

**Status:** Wettbewerber-Literaturrecherche dokumentiert; tatsächliches Interface-Benchmarking und AyaPark-Gegenmessung stehen aus. Eine spätere Implementierung oder Designfreigabe wird aus diesem Dokument nicht behauptet.
