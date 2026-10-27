# AYAPARK 2 – Block 5: Wohnungsübersicht

Stand: 27.10.2026. Entwicklungsbranch: `fix/block5-building-responsive-20261027`, Basis: `main` (`0488652ed9c1b2e73293ebdc233a6f7ec72ce6fe`). Keine Änderung an `main`, produktiver Datenbank oder personenbezogenen Datensätzen.

## Umsetzung

- Beide Gebäudeblöcke bleiben in der bestehenden Reihenfolge **B – A**. Die Blöcke werden über die **tatsächlich verfügbare Breite ihrer Grid-Umgebung** mit `repeat(auto-fit,minmax(min(100%,560px),1fr))` nebeneinander platziert, sofern der Platz für beide reicht, sonst untereinander. So bleibt die Übersicht auch innerhalb schmalerer Dashboard-Karten korrekt.
- In **Classic und Modern** behalten die Wohnungskarten pro Block **genau zwei Spalten**. Veraltete Abweichungen wurden beseitigt: Modern ab 1500 px (drei Spalten), Modern unter 360 px (eine Spalte), Classic unter 540 px (eine Spalte) sowie eine ältere 760-px-Einspalten-Regel.
- Schmale Wohnungskarten verwenden kleinere Innenabstände und flexible Textumbrüche für Personen, Beträge, Kategorien und Statushinweise. Es wird keine horizontale Mindestbreite für Kacheln erzwungen.
- CSS-Referenzen in `index.html` wurden versioniert, damit die Korrektur bei einer späteren freigegebenen Veröffentlichung nicht aus altem Browsercache überdeckt wird.
- Bestehende Forderungskategorien, Detailaktionen, normale Schulden versus Klärungsbedarf und Rollenberechtigungen wurden **fachlich nicht verändert**.

## Bekannte fachliche Grenze: Etagen

Die vorhandene Einheitentabelle `site_units` hat Nummern und Blockzuordnung, aber kein gesondertes Etagenfeld. Die aktuelle Oberfläche sortiert Wohnungen je Block nach Nummer und bildet jeweils nebeneinanderliegende Paare. **Ob etwa 1/2, 3/4, 5/6, 7/8 und 9/10 den realen Etagen entsprechen, ist nicht durch diese Daten verifiziert.** Kein Etagenlabel und keine zusätzliche Zuordnung wurden erfunden. Diese Zuordnung ist vor endgültiger Abnahme anhand eines Bauplans oder einer bestätigten Gebäudeliste abzugleichen.

## Prüfungen

- Ein neuer Node-Regressionssatz `tests/block5-building-layout.test.mjs` prüft das CSS, die Zwei-Spalten-Regeln, die B/A-Reihenfolge in DE/TR und die Aktualisierung der CSS-Versionen.
- Code-Sichtung bestätigt: In beiden CSS-Dateien gibt es keine aktiven expliziten Ein- oder Drei-Spalten-Ausnahmen für `.unit-card-grid`; die Responsive-Anordnung richtet sich nach der Grid-Breite.
- **Nicht behauptet:** Der neue Test wurde bisher nicht lokal per `npm test` ausgeführt und es wurde kein tatsächlicher Browser-/Touch-/Screenreader-Test durchgeführt. Die CI-Prüfung des Pull Requests soll erst den automatisierten Testlauf belegen.

## Freigabekriterien

1. CI einschließlich `npm test` grün.
2. Visuelle Browsermatrix bei 320 / 375 / 390 / 430 / 768 / 1024 / 1440 / 1920 px, Classic/Modern, Hell/Dunkel und Deutsch/Türkisch: keine horizontalen Überläufe; genau zwei Wohnungskarten pro Blockzeile.
3. B links, A rechts, wenn die tatsächliche Inhaltsbreite für zwei Blöcke genügt; sonst untereinander.
4. Etagenpaarung mit realen Bau-/Wohnungsdaten bestätigt oder vor Veröffentlichung ausdrücklich als offene fachliche Anforderung freigegeben.
5. Keine unerwünschten Änderungen an Finanzwerten, Personennamen, Klärungsdialogen, Sicherheit und Rollen.
6. Merge/Deployment nur nach ausdrücklicher Freigabe.
