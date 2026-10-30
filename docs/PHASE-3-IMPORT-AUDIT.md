# Phase 3 – Bankimport und Abgleich
## Bestätigter Rollout 30.10.2026 – Releases #62 bis #64

Bankimport-Dublettenschutz (#62), rein lesende PDF-Quellenprüfung (#63) und CSV-Saldenvorschau mit Sperre widersprüchlicher Angaben (#64) sind nach main übernommen. Aktueller Hauptzweig: 23489cfd649efa8c81d87f4a3fd822fa1a698bd4. CI für den letzten PR-Head: 41067609710 erfolgreich; Pages-Deployment: 41067714654 erfolgreich. Live ausgelieferte app.mjs, index.html und import-review.mjs sind bytegleich mit dem geprüften Stand. Backendmigration 20261030133658 aktiv und schreibgeschützt bestätigt; Advisor-Gruppen vor/nach Änderung unverändert. Keine produktiven Bewohner-, Auth- oder Finanzdatensätze zu Testzwecken geändert.

Nachweise: 281 allgemeine Tests, 84 aktuelle Aufgabenrechteprüfungen, 23 Kontakt-, 43 Historien-, 50 aktuelle Finanz-, 16 Bankimport- und 11 PDF-Strukturprüfungen erfolgreich. 58 lokale tatsächliche Browserprüfungen der Import-/Kontaktoberflächen in DE/TR bei 320–1440 px erfolgreich; ausschließlich synthetische Daten, keine externen Anfragen. Keine pauschale Gesamtgeräte-/Mail-/Auth-E2E-Abnahme.

Nächster offener Fachpunkt: direkte PDF-/XLSX-Parser mit vollständigen Beschreibungen, Mehrseiten- und Spaltenzuordnung vor die vorhandene Vorschau integrieren; aktuell weiterhin nur CSV in der Live-Importmaske. Fortlaufende Abarbeitung und direkte Veröffentlichung geprüfter Änderungen sind ausdrücklich freigegeben. Backup bleibt übersprungen.

## Importvorschau und mobile Kontaktfreigabe – 30.10.2026

PR #63 (PDF-Strukturprüfung) nach erfolgreicher CI 41065619848 veröffentlicht; Pages-Lauf 41065968751 erfolgreich. Der nächste umgesetzte Schritt ergänzt die bestehende CSV-Vorschau um Einnahmen, Ausgaben, Netto und eine exakte Prüfung vorhandener laufender Salden. Beide Druckreihenfolgen und fehlende Zwischenangaben werden berücksichtigt. Widersprüchliche Salden sperren den Importbutton vor Erstellung des Importpayloads; Beträge werden niemals passend gerechnet. Ohne ausreichende Saldoangaben bleibt die Quelle ausdrücklich ungeprüft; Anfangssaldo und Seitenvollständigkeit benötigen weiterhin separate Bestätigung. Dies ist eine zusätzliche Eingabeprüfung der Oberfläche, keine neue Buchungslogik oder Ersatz für serverseitige Rechte.

Acht neue reine Regressionstests bestanden, gesamte JavaScript-Suite 281/281. Nach dem fehlgeschlagenen Standarddownload wurde eine separate lokale Chromium-Testumgebung erfolgreich eingerichtet. 58 tatsächliche Browserprüfungen in DE/TR bei 320/375/768/1440 px bestanden: tatsächlicher Importbutton bei widersprüchlichen Salden gesperrt, fehlende Salden sichtbar ungeprüft, Kontaktfreigabe verlangt unabhängige Bestätigung, keine horizontale Überbreite, keine gefundenen WCAG-A/AA-Verstöße in der geprüften Kontaktkomponente, keine Laufzeitfehler oder externen Anfragen. Ausschließlich synthetische Daten; kein produktiver Account verwendet. Evidenz: qa/results/phase2-import-browser.json und wiederholbarer Test qa/phase2-import-browser.mjs. Keine pauschale Abnahme aller Rollen, Geräte, Mail- oder Authabläufe.

**Nächster offener Schritt:** PDF-/XLSX-Lesen einschließlich vollständiger Beschreibungen/Mehrseiten-/Tabellenzuordnung in denselben kontrollierten Vorschaupfad integrieren. Bis dahin akzeptiert die Live-Maske weiterhin ausschließlich CSV.


Stand: 30.10.2026. Backup gemäß Nutzerauftrag übersprungen.

## Bereits veröffentlicht

PR #62 verhindert wiederholte Bankbewegungen innerhalb eines Imports bei abweichender Beschreibung oder laufendem Saldo. Migration 20261030133658 ersetzt nur die geprüfte command-Funktion. Keine bestehenden Bank-, Forderungs-, Zuordnungs- oder Auth-Datensätze geändert. 16 isolierte CSV-/SQL-Prüfungen bestanden; 50 aktuelle Finanzprüfungen und 43 aktuelle Historienprüfungen sind zusätzlich in GitHub-CI verankert. Lauf 41064856278 erfolgreich.

## Quellenprüfung vorbereitet und getestet

`scripts/import/inspect_bank_statement.py` ist ein lokales, rein lesendes Prüfwerkzeug für die beiden vorhandenen Yapi-Kredi-Text-PDF-Layouts. Es liest mit Poppler `pdftotext`, verarbeitet Datums-/Betrags-/Saldo-/Referenzspalten und kontrolliert jede aufeinanderfolgende Saldenänderung in Druckreihenfolge, bei neuesten-zuerst-Auszügen umgekehrt. Gebühren bleiben eigene negative Bewegungen. Tages-/Eröffnungs-/Schlusszeilen sind keine Transaktionen. Unbekannte datierte Zeilen, unlesbare oder mehrdeutige Layouts werden nicht still übersprungen. Ausgaben enthalten ausschließlich Prüfkennzahlen, keine Namen, IBANs, Beschreibungen, Beträge oder Referenzen. Es gibt keinen DB-Zugriff und keinen Buchungsbefehl.

Elf synthetische Python-Prüfungen decken beide Zahlenformate, Gebühren, Chronologie, gleiche Uhrzeiten, Saldenabweichungen, unbekannte/defekte Zeilen, doppelte Referenzen und datensparsame Ausgabe ab. Keine zusätzlichen Python-Pakete nötig. CLI-Lesen echter PDFs benötigt lokal Poppler (`pdftotext`).

Zusätzliche read-only Quellenprobe mit drei vom Nutzer bereitgestellten Auszügen: 1.714, 16 und 51 erkannte Bewegungen; jeweils keine unlesbare datierte Bewegungszeile und keine Abweichung zwischen benachbarten Salden. Nur diese strukturellen Nachweise werden versioniert. Keine Rohdaten oder vollständigen Konvertierungen im Repository.

**Nachweisgrenzen:** Eine passende Saldenfolge belegt weder einen unabhängig verifizierten Anfangssaldo noch die vollständige Übernahme aller Originalseiten oder eine richtige Zuordnung zu Bewohnern. Moderne Auszüge enthalten keine eigenständige Bankreferenz; aus Zeitstempeln werden keine Referenzen erfunden. Gescannten/hybriden PDFs darf aus leerem Extraktionstext keine Vollständigkeit bescheinigt werden. `posting_authorized` bleibt immer false. Keine automatische Buchung aus einem bestandenen Quellencheck.

## Drei getrennte Abnahmen

1. **Quelldatei und Bewegungen:** Alle Seiten/Bewegungen einschließlich Gebühren einzeln übernehmen; Referenzen und Vorzeichen bewahren; unlesbare Zeilen gezielt zur manuellen Prüfung vorlegen. Derzeit CSV-Vorschau und lokaler PDF-Strukturcheck vorhanden; direkter PDF-/XLSX-Import offen.
2. **Bank und Saldo:** Anfangssaldo separat gegen den verifizierten Auszug bestätigen; Einnahmen/Ausgaben und jeden verfügbaren laufenden Saldo prüfen. Überlappende Auszüge deduplizieren; keine Salden erzwingen oder Originalbeträge korrigieren. Derzeit synthetischer CSV-/SQL-Abgleich und strukturelle PDF-Saldenfolge geprüft; vollständiger importierter Quellenabgleich offen.
3. **Forderungszuordnung:** Erst nach Quellen-/Saldoabnahme Schuldner, Wohnung, Schuldart und Verwendungszweck prüfen. Keine Ableitung aus unbestätigten Namen oder Wohnungshinweisen. Vorhandene FIFO-/Teilzahlungs-/Guthabenlogik ist mit aktuellem Migrationspaket getestet; reale Zuordnung benötigt fachliche Prüfung und darf nicht als Test verändert werden.

## Nächste Umsetzung

Direkten PDF-/XLSX-Lesepfad mit striktem Format-/Spalten-Mapping und Vollständigkeitsanzeige vor die bestehende CSV-Vorschau setzen. Mehrdeutige oder unlesbare Dateien müssen im Entwurf bleiben. Extraktion im Browser benötigt lokal versionierte, geprüfte Parser; keine Übertragung privater Bankauszüge an externe Konvertierungsdienste. Zunächst Deskriptions-/Mehrseiten-/Tabellenadapter mit synthetischen Fixtures prüfen, danach dieselbe lokale Quellenprobe wiederholen. Die Finanzbuchungs-RPC und deren Endfreigaben werden weiterverwendet; keine parallele Buchungslogik.

Geräte-, echte Browser- und E-Mail-End-to-End-Abnahme aus Phase 2 bleibt gesondert offen. Der fehlgeschlagene lokale Chromium-Download ist kein erfolgreicher UI-Test und kein Grund, andere unabhängige Vorbereitungen anzuhalten.
