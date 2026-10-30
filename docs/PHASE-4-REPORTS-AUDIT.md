# Phase 4 – Berichte, Exporte und Abschlüsse

Stand: 30.10.2026. Vor jeder Ergänzung wurden bestehende Berichts-/CSV-/Druckfunktionen geprüft.

## Vorhanden und weiterverwendet

Die Berichtsseite bietet Datumsauswahl, aggregierte Jahres-/Monatsgruppen, getrennte Einnahmen/Ausgaben und CSV. Bankbewegungen sind nur für berechtigte Finanznutzer lesbar. Die bisherige PDF-Funktion druckte die gesamte aktuelle Anwendungsansicht. Finanzkorrekturen und Zeitraum-/Kassenabgleich sind mit dem aktuellen SQL-Paket zusätzlich in 31 Prüfungen abgesichert (#66).

## Ergänzte Exporte

Echte XLSX-Dateien für die aggregierte Finanzübersicht und berechtigte Bankbewegungen. Geldwerte sind numerische Cent-genaue Zellen, Text bleibt Text – auch bei einem führenden Gleichheitszeichen. Türkische Zeichen und doppelte Anführungszeichen bleiben erhalten. Keine Formeln oder externen Verknüpfungen erzeugt. Pinned fflate 0.8.3 wird als eigener lokaler Schreib-Baustein reproduzierbar gebaut; bestehender PDF-/XLSX-Leseparser unverändert.

PDF-Druck öffnet eine gesonderte Exportansicht mit ausschließlich dem ausgewählten Datenmodell; kein Druck anderer Dialoge oder Verwaltungsdaten aus dem restlichen DOM. Übertragung einmalig in-memory über Quellfenster-, Herkunfts- und Zufallstoken-Prüfung. Keine Personendaten in URL oder Browser-Dauerspeicher und kein Backend-Datenabruf der Exportseite. Alle Texte werden escaped, Datumsauswahl und Abgrenzung zu einem bestätigten Abschluss werden angegeben. PDF wird über den Browser-Druckdialog gespeichert.

Persönliche Zahlungsnachweise beziehen sich auf eine konkrete aktive Zahlungszuordnung. Bewohner erhalten nur Zuordnungen zu ihrer eigenen Personen-ID, einschließlich eigener historischer Forderungen. Eine gemeinsame Wohnung oder Bankzahlung berechtigt nicht zum Nachweis fremder Teilbeträge. Verwaltungszugriff benötigt tatsächliches Finanzleserecht. Keine fremden Personennamen, Sender-IBANs oder privaten Bankverwendungszwecke im persönlichen Nachweis. Stornierte Zuordnungen/Forderungen/Gegenbuchungen werden abgewiesen. Der Nachweis ist ausdrücklich ein Auszug aus Anwendungsdaten, kein Bankdekont und keine steuerliche Quittung. Demo-/Rollenvorschau wird als Beispieldatensatz gekennzeichnet, auch in Excel.

## Nachweise

299 allgemeine Tests einschließlich sechs neuer Export-/Datenschutz-/XLSX-Roundtrip-Prüfungen. 22 tatsächliche Browserprüfungen: DE/TR, echte Excel-Downloads und Rücklesen, Exportfenster/Tokenentfernung, PDF-Drucklayout, persönliche Datenabgrenzung, mobile Belegansicht, keine Daten ohne Quellfenster, keine Laufzeitfehler und keine externen Anfragen. PDF-Ausgaben jeweils eine A4-Seite und visuell geprüft; Excel zusätzlich mit unabhängigem openpyxl lesbar und Geldzellen numerisch formatiert. Ausschließlich künstliche Daten; keine echten Belege oder Quelldateien versioniert.

Bei fehlender tatsächlicher Finanz-/Gemeinschaftsfreigabe zeigt die Berichtsseite einen Zugangshinweis statt einer scheinbaren Null-Euro-Übersicht und Exportbuttons. Ein manuell ausgelöster Export prüft die Berechtigung ebenfalls.\n\n## Noch offen

- Explizite endgültige Monats-/Jahresabschlüsse mit getrennt bestätigter Quellenvollständigkeit und Bankabstimmung, dokumentierten offenen Zuordnungen sowie strengeren Jahresregeln. Der derzeitige Report ist eine Übersicht und darf nicht als bestätigter Abschluss bezeichnet werden.
- Veröffentlichung ausschließlich aggregierter Finanzübersichten für eine ausdrücklich gewählte öffentliche Zielgruppe; keine automatische Freigabe bestehender privater Daten.
- Beschluss-/Sonderumlagenabnahme einschließlich historischer Eigentümer und Nachweisen. Vorhandene Verteilungs-/Entwurfs-/Superadmin-Logik wiederverwenden.

Nächster Schritt: Abschlussvorschau und dokumentierte Superadmin-Finalisierung mit Erhalt der Originale, Schutz abgeschlossener Zeiträume und nachvollziehbarer Wiederöffnung. Echte Bank-/Bewohnerdaten bleiben von Tests unberührt.
