# Modern – alternative Gestaltung für Ayapark 2

Stand: 25. Oktober 2026. Grundlage: main `f124431e4229d595127daa9f72a010137be4e29d`.

Modern verwendet Kobaltblau, Limettengrün, dunkle Navigation, helle Flächen und die lokal eingebundene Manrope-Schrift (OFL-Lizenz in assets). Die Gebäudegrafik ist SVG. Karten, Tabellen, Formulare, Dialoge und die mobile Navigation verwenden weiterhin dieselben fachlichen Komponenten. Sanfte Einblendungen und eine dezente Bewegung der Grafik berücksichtigen die Systemeinstellung für reduzierte Bewegung.

## Auswahl und Grenzen

- Im Header oder unter Darstellung lässt sich zwischen Klassisch und Modern umschalten.
- Der bisherige Produktionsstandard bleibt Klassisch. Der neue Geräteschlüssel `ayapark2-design-v1` speichert nur diese Auswahl. Bestehende Farbwelten bleiben erhalten; Modern verwendet eigene Farben.
- Sprache, Hell/Dunkel, Schriftgröße, hoher Kontrast und Betragsausblendung verwenden die bestehenden Einstellungen. Die Konto-Einstellungsstruktur wird nicht erweitert.
- Keine SQL-Migration, keine neue Datenbankabfrage, keine Änderung an Berechtigungen, Buchungen oder Authentifizierung. Cache-Versionen des Modulgraphen werden gemeinsam aktualisiert, damit Sprach- und Einstellungszustände nach einem Update dieselben Modulinstanzen nutzen.
- GitHub Pages bleibt bis zur Prüfung und Freigabe des Pull Requests unverändert.

## Isolierte Vorschau

`node qa/prepare-modern-preview.mjs /absoluter/pfad/zum/separaten/projekt`

Der Builder kopiert statische Dateien, setzt beide Einstiegspunkte auf `ayapark-stage=preview` und sperrt Netzwerkverbindungen mit `connect-src 'none'`. Die bereits vorhandenen API-Sperren des Vorschaumodus bleiben aktiv. Es werden ausschließlich synthetische Daten aus `fullDemo()` verwendet. Änderungen in der Demo sind flüchtig. Die produktiven Quelldateien bleiben im Produktionsmodus. Ein bestehendes `.openai/hosting.json` wird nicht überschrieben.

## Reproduzierbare Prüfung

- `npm test`: bestehende Regressionstests plus sieben Tests für ungültige/gesperrte Gerätespeicherung, lokale Auswahl ohne neue Kontofelder, unveränderte fachliche Inhalte und übersetzte zugängliche Bedienelemente.
- `node qa/prepare.mjs /separates/qa-projekt`: Browser-Harness mit Modern/Klassisch-Auswahl, synthetischen Rollen und Daten. Hauptmatrix: 840 Ansichten über sieben Breiten (320–1440 CSS-Pixel), zwei Sprachen und zwei Darstellungen; zusätzliche Formulare und große Schrift/hoher Kontrast separat.
- Die automatische Kontrastprüfung misst den fertig eingeblendeten Zustand. Animationen sind nur im Harness abgeschaltet. Sichtprüfung und Bedienung erfolgen zusätzlich in der echten Vorschau mit Animationen.
- Automatische Prüfungen ersetzen keine vollständige manuelle Prüfung mit Screenreader oder auf echten Mobilgeräten. Es wurden keine produktiven Anmeldungsvorgänge oder schreibenden Live-Tests ausgeführt.

## Ergebnis dieses Stands

- 148 Node-Tests bestanden, keine Fehler.
- Hauptmatrix: 840 Ansichten, kein horizontaler Seitenüberlauf. 52 automatische axe-Prüfungen ohne gemeldeten Verstoß.
- Weitere Formulare: 196 Ansichten, kein horizontaler Seitenüberlauf. 28 axe-Prüfungen ohne gemeldeten Verstoß.
- Große Schrift und Kontrastvarianten: 144 Ansichten, kein horizontaler Seitenüberlauf.
- Kontrastbefunde bei Hilfstext und Hero-Kleintext wurden vor dem letzten Durchlauf behoben. Die verbliebenen automatischen Prüflücken betreffen unter anderem Kontrast auf dekorativen Grafiken; daraus folgt keine vollständige WCAG-Zertifizierung.
- Manuell in der tatsächlichen Vorschau: Navigation, Wechsel Klassisch/Modern und Fortbestand der Auswahl nach Neuladen.

Die Messung betrifft Darstellungsregressionen. Es wird keine Verbesserung der Datenbank- oder Ladezeit behauptet.
