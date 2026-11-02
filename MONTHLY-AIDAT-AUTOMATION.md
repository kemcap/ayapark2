# AYAPARK 2 – Monatliche Aidat-Automatik (Entwicklung)

Stand: 02.11.2026 · Branch `feature/monthly-aidat-automation-20261102`.

## Bedienung

Nach Freigabe und Produktiv-Deployment: **Einstellungen → Monatliche Hausgeldforderungen / Aylık aidat otomasyonu** (nur Superadmin).
- Betrag je Wohnung in TL, Fälligkeitstag **1–28** (sonst wären Februar-Termine uneinheitlich).
- Schuldnerregel: Mieter sonst Eigentümer (Standard), nur Eigentümer, nur Mieter.
- Referenz auf einen gültigen Hausverwaltungs- bzw. Beschlussnachweis.
- Schalter zur Aktivierung/Deaktivierung. **Standardmäßig AUS**, keine unbemerkten Forderungen.
- Aktivierung beginnt **frühestens ab dem 01. des Folgemonats**. Bei Aktivierung im November 2026 werden keine November-Forderungen rückwirkend generiert; erster möglicher Monat ist Dezember 2026.
- Monatlicher serverseitiger Job läuft am Monatsbeginn um 06:10 Uhr türkischer Zeit. Ein täglicher Wiederholungsversuch fängt vorübergehende Ausfälle ab; die DB verhindert erneute Ausführung für einen bereits protokollierten Monat.

## Buchungsregeln

- **Nur Forderungen**: Keine Bankbewegungen, Zahlungseingänge, Zahlungsausgleich oder tatsächliche Bankguthaben werden verändert.
- Erzeugt Aidat-Forderungen mit Referenz `monthly:YYYY-MM-01` (kompatibel mit dem bereits vorhandenen manuellen Monats-Assistenten), Periodengrenzen, `general`-Gruppe, `created_by`, Rechnungsgrundlage und Zuordnung zu einer **eindeutig** verantwortlichen Person.
- Existierende Monats-Aidat-Forderungen oder dieselbe Referenz werden nicht neu angelegt; UNIQUE auf Standort, Wohnung und Referenz schützt zusätzlich gegen Parallelität.
- Vorhandene echte Aidat-Befreiungen werden respektiert; widersprüchliche Beträge als Problem protokolliert.
- Bei fehlendem/mehrdeutigem Schuldner wird die Wohnung **nicht** belastet. Stattdessen steht die Wohnung mit Grund und ggf. Kandidatenanzahl im Laufprotokoll unter Einstellungen. Der Superadmin bereinigt die Beziehungen und erstellt die übersprungene Forderung bei Bedarf über die vorhandene manuelle Funktion.
- Ein ehemaliger Bewohner wird nicht automatisch als aktueller Schuldner ausgewählt; nur aktive, nicht archivierte Beziehungen innerhalb des Fälligkeitsdatums.
- Eine fehlgeschlagene Transaktion führt nicht zu einer halben ungeprüften Buchung. Kein eigenständiges Ausgleichen von alten Verbindlichkeiten.

## Sicherheit

- Einstellungen lesen/schreiben nur verifizierte Superadmin-Sessions, doppelt serverseitig geprüft.
- Privater Cron-Ausführungspunkt nicht über die API für Browser/Residents/Verwalter verfügbar.
- Append-only Prüfspur für Einstellungen und pro Monat ein Ausführungsprotokoll.
- Die Einstellung aktiviert **keinen** automatischen Ausgleich von Bankeingängen. Dieser wird gesondert behandelt.

## Tests und Freigabe

- Staging-Migration am 02.11.2026 erfolgreich auf `ayapark-auth-staging` installiert. Produktion unverändert.
- Im zurückgerollten Staging-Transaktions-Test: eine eindeutige Wohnung erhielt korrekt 3.600 TL für den 05.11.2026, die andere mit zwei Mietern wurde übersprungen und protokolliert. Wiederholter Cron-Lauf erzeugte nichts doppelt. Alle synthetischen Testdaten nach `ROLLBACK` entfernt, keine Testforderungen verblieben.
- Manager-RPC speichern/lesen wurde mit synthetischer Sitzung im ROLLBACK geprüft; erstmalige Aktivierung am 02.11.2026 begann korrekt am 01.12.2026.
- Vor Produktivinstallation: GitHub CI, Browserprüfung DE/TR/EN, Prüfung der Echt-Daten-Zuordnungen ohne Schreiben, additive Migrationsfreigabe und Pages-Deployment. **Den Schalter erst bei geprüften Wohnungspersonen aktivieren.**

### Bekannter Prüfbedarf bei aktuell produktiven Stammdaten

Mindestens einige Wohnungen haben **mehrere aktiv markierte Eigentümer/Mieter**. Daher ist nicht automatisch garantiert, dass beim ersten Lauf alle 20 Forderungen entstehen. Vor Aktivierung Rollen und Wohnungsbeziehungen prüfen, insbesondere B-10. Dies ist gewollt: kein stillschweigender falscher Schuldner.
