# Ayapark 2 – V2.0

Private Arbeitsversion: https://ayapark2-v2-private.kemcap.chatgpt.site

Diese Version wird im Branch `ayapark-v2` entwickelt. GitHub Pages und die bisherigen HTML-Seiten bleiben unverändert. V2 verwendet vorhandene Auth-Konten, Site-Mitgliedschaften und Wohnungen, ergänzt aber einen eigenen Finanz- und Verwaltungsbereich mit `ay2_*`-Tabellen. V2-Schreibvorgänge ändern keine Tabellen der alten Anwendung.

## Bedienung

Die Vorschau startet im **Beispielmodus**. Hier lassen sich alle Abläufe ohne echte Buchungen testen und die drei Ansichten wechseln. Beispieländerungen gelten nur bis zum Neuladen der Seite.

**„Hesabımla giriş“** öffnet das bestehende Supabase-Konto. Danach gelten echte Daten und die serverseitigen Berechtigungen. Zugangsdaten werden nicht im Quellcode hinterlegt. Tokens bleiben im Speicher des aktuellen Tabs. Nach Neuladen ist eine erneute Anmeldung nötig.

1. **Genel bakış:** datierter Buchungsstand, bestätigte Forderungen, Wohnungen und nächste Schritte.
2. **Daireler:** Suche, Filter, Wohnungsdetails, Personen und Zahlungsverlauf.
3. **Aidat & borçlar:** Einzel- und Monatsforderungen, Verantwortlicher, Fälligkeit, Teilzahlungen, begründete Korrekturen und Devir-Prüfliste.
4. **Banka hareketleri:** Suche, Monatsfilter, CSV-Import, manuelle Buchung, Zahlungszuordnung, Storno und CSV-Export.
5. **Mali raporlar:** Monatsauswertung, Kategorien, CSV-/Druckexport und Veröffentlichung einer anonymen Zusammenfassung für Bewohner.
6. **Duyurular:** Entwürfe, Bearbeitung und Veröffentlichung.
7. **Erişim & ayarlar:** einzelne Zusatzrechte, Eröffnungsdaten und unveränderlicher V2-Auditverlauf.

Die bestehende Verwaltung bleibt für neue Auth-Konten und Portal-Einladungen verlinkt. V2-Personen sind eigene Verwaltungsdaten und vergeben keine Login-Rechte. Die App ruft keine Einladungs- oder E-Mail-Sendefunktion automatisch auf.

## Datenübernahme

- **1.714 Bankbuchungen** aus dem bereitgestellten Auszug wurden nach vollständiger Prüfung sämtlicher laufender Salden in die geschützten V2-Tabellen übernommen.
- Der Auszug enthält Buchungen vom 11.01.2022 bis 11.10.2026. Der abgeglichene Saldo steht nur im geschützten V2-Arbeitsbereich. Dies ist ein datierter Auszugsstand, kein heutiger Online-Bankstand.
- **20 allgemeine Altsalden** und **2 İcra-Salden** sind nur als Prüffälle gespeichert. Mehrfach gedruckte Seiten wurden nicht mehrfach übernommen. Die Summen werden nur im geschützten Arbeitsbereich verarbeitet. Diese Bestände dürfen nicht ungeprüft addiert oder als bestätigte aktuelle Schuld behandelt werden.
- Namen/Wohnungshinweise stammen teilweise aus unzuverlässiger Texterkennung. Die allgemeine Liste enthält zudem einen abweichenden Zeitraum im Kopf. Deshalb müssen Wohnung, Zeitraum, Verantwortlicher und Überschneidungen vor Umwandlung in eine Forderung bestätigt werden.
- Bankzahlung und Forderung sind getrennt: Ein Geldeingang reduziert eine Schuld erst durch ausdrückliche Zuordnung. Teilzahlungen und Aufteilung auf mehrere Forderungen werden unterstützt.
- Die Steuer-/Identifikationsnummern im Bankbeschreibungstext wurden beim Import entfernt. Original-PDFs, personenbezogene JSON-Dateien und Datenbankinhalte liegen **nicht** im öffentlichen Repository oder im statischen Vorschaupaket.

## Rollen

| Ansicht | Bestehende Mitgliedschaft | V2-Rechte |
| --- | --- | --- |
| Süper Admin | `manager` | Alle V2-Funktionen, Zusatzrechte und Berichte freigeben |
| Yönetim | `deputy` / `auditor` | Zusätzliche Rechte werden einzeln vergeben |
| Site Sakini | aktive `site_resident_units`-Zuordnung | Eigene Forderungen und Zahlungen, veröffentlichte gemeinsame Berichte und Duyurular |

Zusatzrechte: `finance`, `import`, `people`, `announcements`. Nur der Manager vergibt sie. Ein Verwaltungsmitglied kann sich nicht selbst hochstufen. Rechte gelten für V2; die bestehenden Berechtigungen der alten Anwendung wurden nicht geändert.

Alle neuen Tabellen haben RLS. Direkte Schreibzugriffe durch Browserrollen sind gesperrt. Der transaktionale Befehl `ay2_command` prüft Auth-Identität, Site, Zusatzrecht und fachliche Grenzen. Die privilegierte Implementierung liegt im nicht exponierten Schema `ay2_private`; öffentliche Wrapper laufen als Aufrufer. `ay2_workspace` liefert einen konsistenten Finanzstand in einer SQL-Anweisung unter Aufrufer-RLS.

## CSV

UTF-8, höchstens 2 MB / 2.000 Zeilen; Vorschau vor dem ausdrücklichen Import:

```csv
tarih;aciklama;tutar
2026-10-20;Ekim aidatı;3.600,00
2026-10-20;Havuz bakımı;-2.500,00
```

Datum `YYYY-MM-DD`, türkisches Zahlenformat. Einfache CSV-Zeilen ohne Bankreferenz werden über Datum/Beschreibung/Betrag dedupliziert. Zwei tatsächlich verschiedene Zahlungen mit identischen Werten müssen anhand ihrer Bankreferenz geprüft werden. Der geprüfte PDF-Import verwendet zusätzlich Referenz und laufenden Saldo; Gebühren mit gleicher Dekont-Nummer bleiben erhalten.

Das Werkzeug `tools/prepare_bank.py` extrahiert den unterstützten Yapı-Kredi-Auszug, prüft jede Saldoentwicklung und entfernt Identifikationsnummern. Der generierte Inhalt gehört in ein privates, ignoriertes Verzeichnis. Es ist kein universeller PDF-Parser. XLSX und beliebige gescannte PDFs werden von der Browseroberfläche nicht importiert.

## Entwicklung und Tests

Statische App ohne Build-Schritt oder Laufzeitpakete. `api.mjs`, `core.mjs`, `ledger.mjs`, `ui.mjs`, `forms.mjs`, `app.mjs`, `styles.css` und `index.html` werden zusammen per HTTP ausgeliefert. Nicht direkt als `file://` öffnen.

```bash
cd v2
npm ci --ignore-scripts
npm test
```

`@electric-sql/pglite` ist eine exakt fixierte Entwicklungsabhängigkeit für echte lokale Postgres-/RLS-Tests. Es wird nicht an Browser ausgeliefert. Die 31 Tests prüfen Finanzsummen, Teilzahlungen, Überbuchungsschutz, Wiederholungen, Rollen, Cross-Site-Schutz, Veröffentlichung, CSV, Escaping, Formulare, Token-Erneuerung und Sitzungsabbrüche.

Die drei V2-Migrationsdateien tragen die vom verbundenen Supabase-Projekt zurückgegebenen Versionen. Sie setzen die vorhandenen `site_*`-Tabellen und Auth-Struktur voraus. Die zehn älteren Datenbankmigrationen sind nicht vollständig aus diesem Repository rekonstruierbar; dies ist kein vollständiges Neuaufsetzen eines leeren Supabase-Projekts.

Keine Supabase-CLI erneut ausführen, um den hier blockierten Schritt zu umgehen: Die automatische Sicherheitsprüfung blockierte deren externe Analyseanfrage. Die Änderungen wurden stattdessen über die verbundene Supabase-Schnittstelle angewendet; die bestätigte Migrationshistorie ist dokumentiert.

## Prüfgrenzen und offene Freigabe

- Private Veröffentlichung ist bestätigt. `main` bleibt bei `b0bb314b145fbf1f2d274dcbaeed9db2dd02bdef`.
- Desktop-Browserprüfung mit Beispieldaten durchgeführt: Übersicht, Wohnungsdetail, Teilzahlungsformular, Bewohneransicht und Devir-Prüfdialog funktionieren. Ein Fehler bei Request-IDs in HTTP-Vorschauen wurde behoben. Echter Passwort-Login und Mobilgerät-Abnahme stehen weiterhin aus. RLS und Geschäftslogik sind mit lokalem Postgres sowie lesend im verbundenen Projekt geprüft.
- 22 Altbestände erfordern eine fachliche Zuordnung in der Oberfläche. Sie wurden absichtlich nicht als bestätigte Forderungen verbucht.
- Die öffentlich lesbare Altforderungstabelle und vorhandene Sicherheitsberater-Hinweise der alten Anwendung bleiben offen. Eine Änderung würde das unverändert zu erhaltende Live-System betreffen. V2 verwendet diese Tabelle nicht.
- Vor einer Ablösung der bisherigen Anwendung müssen die Altbestände bestätigt und Desktop, Mobilgerät sowie reale Rollen-Logins praktisch abgenommen werden.

Weitere Details: `AUDIT.md` und `RELEASE.md`.


### Unterstützte Altbestandsprüfung

`reconcile.mjs` erzeugt ausschließlich Hinweise: klare Angaben aus dem Wohnungshinweis, jüngere passende Bankbeschreibungen, mögliche spätere Zahlungen und parallele Devir-/İcra-Fälle. Namen und Referenzen kommen erst nach berechtigter Anmeldung aus dem geschützten Bestand. Es werden keine tatsächlichen Personen oder Beträge als Regeln im Quellcode hinterlegt. Bei geteilten Überweisungen wird ausdrücklich vor einer vollständigen Zuordnung zu nur einer Wohnung gewarnt. Ohne passenden Beleg bleibt der Block offen. Die Bestätigung im Dialog ist weiterhin erforderlich.
