# Drei verständliche Oberflächensprachen – 31.10.2026

## Umfang und klare Begriffe

Englisch ergänzt Türkisch und Deutsch. Keine weiteren Sprachen hinzugefügt. Standard bleibt Türkisch; vorhandene Spracheinstellungen werden nicht umgestellt. Oben wechselt die Sprachschaltfläche TR → DE → EN → TR; unter Einstellungen → Sprache lassen sich alle drei direkt auswählen. Passwort-Wiederherstellung und öffentliche Berichte unterstützen ebenfalls Englisch.

1.279 zentrale türkische Quelltexte sind vollständig mit Deutsch und Englisch abgedeckt. Die englische Sammlung enthält außerdem die neueren direkt formulierten Dialoge: insgesamt 1.873 eindeutige verfasste Texte/Fragmente. Keine externen Übersetzungsdienste, neuen Laufzeitabhängigkeiten oder laufenden Kosten.

Kurze Handlungswörter und verständliche Sätze wurden geprüft. Besonders wichtig:

| Bedeutung | Deutsch | Türkisch | Englisch |
| --- | --- | --- | --- |
| Regelmäßiger Beitrag | Hausgeld | Aidat | Maintenance fees |
| Offener Betrag | Offener Betrag | Açık tutar | Amount due |
| Forderung | Forderung | Borç | Charge |
| Tatsächlicher Zahlungseingang | Zahlung | Ödeme | Payment |
| Zuordnung zur Forderung | Zahlungszuordnung | Ödeme eşleştirme | Payment match |
| Separates Guthaben | Guthaben | Alacak bakiyesi | Credit |

Der zuvor deutsche Begriff „Guthaben“ in der türkischen Oberfläche wurde durch „Alacak bakiyesi“ ersetzt. Rechtliche Hinweise behalten notwendige Unterscheidungen, Bedingungen und amtliche Links. Ihre Übersetzung ist keine neue Rechtsberatung oder neue Gesetzesprüfung. Keine Behauptung einer unabhängigen muttersprachlichen Abnahme aller Texte.

## Schutz und Verhalten

Nur ausdrücklich verfasste Oberflächentexte werden übersetzt. Namen, Kontaktdaten, Bankbeschreibungen, gespeicherte Forderungstitel, Notizen, Mitteilungen und Dokumentinhalte bleiben Originaldaten. Vorhandene deutsche Mitteilungsfassungen erscheinen weiterhin bei Deutsch; Englisch zeigt gespeicherte Originaltexte, solange keine eigene englische Fassung vorhanden ist. Keine automatische Übersetzung privater Inhalte.

Englische Anzeige verwendet en-GB; Geld bleibt TRY/TL und wird intern unverändert in ganzen Kuruş geführt. Formate von Bankimporten und Eingabevorgaben werden nicht durch die Anzeigesprache geändert. Exporte übersetzen Überschriften und Hinweise, erhalten Beträge und Originaldaten und behalten dieselben Zugriffskontrollen.

Der Sprachwechsel erhält offene Formulare und Eingaben. Ein vorhandener Fehler mit einer nicht definierten Aktionsvariablen beim erneuten Rendern eines offenen Formulars wurde im betroffenen Handler korrigiert. Alle aktiven Modulimporte verwenden konsistente Cacheversionen.

## Datenbank und Prüfungen

Migration `20261031170253_english_language_preference` am 31.10.2026 erfolgreich angewendet. Sie erweitert ausschließlich die Sprach-Allowlist in `ay3_preferences(jsonb)` um `en`. Besitzerbindung, Anmeldung, RLS, Funktionsrechte und übrige Feldvalidierung bleiben erhalten. Keine Personen-, Buchungs- oder Authdaten geändert. Fingerprint aller vorhandenen gespeicherten Einstellungen vor und nach der DDL identisch.

- 399 allgemeine JavaScript-Tests bestanden, einschließlich sechs neuer Sprachtests: vollständige Wörterbuchabdeckung, bekannte Textfragmente, Sprachen/Locales, Exportzugriff/Originaldaten, Mitteilungen und Zahlungshinweise.
- Zehn isolierte SQL-Prüfungen bestanden: drei Sprachen, anonyme Ablehnung, eigene Speicherung, ungültige Felder und idempotente Migration ohne Änderung vorhandener Einstellungen. In GitHub-CI aufgenommen.
- 100 native synthetische Browserprüfungen: sieben Seiten, drei Sprachen, 375 und 1.440 Pixel, Sprachzyklus/Neuladen, unveränderter eingegebener Name bei geöffnetem Formular, Wiederherstellung und öffentliche Berichte. Keine Browserfehler oder externen Anfragen. Nachweis: `qa/results/english-language-browser-20261031.json`.
- 31 zusätzliche Browserprüfungen für echte lokale XLSX-Downloads, PDF-/Druckansichten und den geschützten Popup-Kanal in Deutsch, Türkisch und Englisch bestanden; Originaldaten und eigene Nachweise bleiben getrennt, keine externen Anfragen.
- Bestehende echte Mobilgeräte-/PWA-/Mailabnahme bleibt separat offen. Synthetische Browserprüfungen verwenden keine produktiven Zugänge.

## Veröffentlicht und live geprüft

[PR #105](https://github.com/kemcap/ayapark2/pull/105) nach erfolgreicher vollständiger CI zusammengeführt. Live-Stand `68cb7a8b73fac098445829afd5c2d017cad06fbe`; CI `41222999248`, Pages `41223197330` erfolgreich. Die 75 geänderten ausgelieferten Laufzeitdateien einschließlich Englisch-Wörterbuch, Sprachsteuerung, App, Anmeldung, Wiederherstellung und Exportmodulen mit dem getesteten Stand bytegleich verglichen. Nachweis: `qa/results/english-language-release-20261031.json`.

Englisch ist damit tatsächlich veröffentlicht. In Einstellungen → Sprache lässt es sich direkt auswählen; oben schaltet die Sprachtaste TR → DE → EN. Bestehende Benutzer müssen ihre Sprache nicht umstellen. Es gibt keine zusätzlichen laufenden Kosten; Supabase bleibt Free.

Nächster gesonderter Abnahmepunkt: bestehende echte Zugänge auf dem eigenen Smartphone/PWA einschließlich dauerhaftem Anmeldestatus und eigener Mailzustellung prüfen. Diese reale Geräteabnahme wird durch lokale Browser- und Live-Dateiprüfungen nicht ersetzt. Keine weiteren Finanzkorrekturen ohne konkrete Freigabe. Backup bleibt ausdrücklich übersprungen.
