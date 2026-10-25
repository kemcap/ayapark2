# V5 – Umsetzungs- und Prüfstand

## Ausgangspunkt / Wiederherstellung

25. Oktober 2026: main V4.0 `f124431e4229d595127daa9f72a010137be4e29d`. Modern-Entwurf `ff225f98099fd38d17a8f3a34e2c4e539c39edb6`. Eigene Branch `feature/v5-finance-notifications`, beinhaltet Modern. Produktion und die bereits verbundene Modern-Site werden nicht überschrieben.

Die Live-Datenbank wurde ausschließlich über Metadaten lesend geprüft. Finanzdaten und personenbezogene Dokumente werden nicht in Git eingecheckt. Der vorhandene Beschluss wird nicht automatisch als Beitragsbefreiung interpretiert. Jede Ausnahme verlangt Zeitraum, Begründung und Beschlussreferenz; Vergütung erzeugt keine stille Verrechnung.

## Plan

1. Vorhandene versionierte Lesebestätigungen erweitern: Zielgruppen, optionale wichtige Pop-ups, Glocke, lokale Superadmin-Teststeuerung.
2. Kompakter Header, vier mobile Hauptbereiche, Installation im Bewohner-Dashboard, Modern als Standard, Symbolwährungen und gemeinsame Klickflächen.
3. Additive Finanzvorgänge: Sammelforderungen mit Vorschau/Idempotenz, monatliche Ausnahmen, getrennte Schuldnergruppen und älteste Forderungen zuerst mit Bestätigung/Guthaben.
4. Serverseitige Wohnungssicht und Empfängerprüfung einschließlich ausdrücklicher Vertretervollmacht, ohne rohe Bankdaten für Bewohner freizugeben.
5. Recht & Informationen mit offiziellen Quellen und dokumentiertem Prüfstand.
6. Node-/isolierte PostgreSQL-Tests, Browserprüfung DE/TR, kleine/große Ansichten; eigener synthetischer Teststand, GitHub-Entwurf ohne produktive Migration/Veröffentlichung.

## Sicherheitsprinzip

Neue Tabellen mit RLS, keine direkten Schreibrechte für Browserrollen. Neue Buchungen ausschließlich über autorisierte, serialisierte RPCs. Bestehende Kategorien und Buchungen bleiben erhalten. Migration und Rückfallstrategie werden als Review-Artefakte geliefert; produktive Ausführung erfordert gesonderte Freigabe. Lokale Datenbank: PGlite mit synthetischen Konten und Fixtures, keine produktive URL.

## Ergebnis

Implementiert und lokal geprüft. Abschlussbericht, Testzahlen, amtliche Quellen und Einführung/Rückfall: [V5-REVIEW.md](V5-REVIEW.md). 168 JavaScript-, 120 bestehende und 46 neue SQL-Prüfungen erfolgreich. 924 Hauptansichten, 392 zusätzliche Formularansichten und 144 klassische Varianten ohne horizontalen Überlauf; 112 ausgewählte Axe-Prüfungen ohne gemeldete Verstöße. Getrennte private Vorschau ausschließlich mit synthetischen Daten. Keine produktive Migration oder Veröffentlichung auf GitHub Pages.
