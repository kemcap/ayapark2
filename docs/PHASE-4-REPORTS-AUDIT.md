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

Bei fehlender tatsächlicher Finanz-/Gemeinschaftsfreigabe zeigt die Berichtsseite einen Zugangshinweis statt einer scheinbaren Null-Euro-Übersicht und Exportbuttons. Ein manuell ausgelöster Export prüft die Berechtigung ebenfalls.

## Noch offen

- Explizite endgültige Monats-/Jahresabschlüsse mit getrennt bestätigter Quellenvollständigkeit und Bankabstimmung, dokumentierten offenen Zuordnungen sowie strengeren Jahresregeln. Der derzeitige Report ist eine Übersicht und darf nicht als bestätigter Abschluss bezeichnet werden.
- Veröffentlichung ausschließlich aggregierter Finanzübersichten für eine ausdrücklich gewählte öffentliche Zielgruppe; keine automatische Freigabe bestehender privater Daten.
- Beschluss-/Sonderumlagenabnahme einschließlich historischer Eigentümer und Nachweisen. Vorhandene Verteilungs-/Entwurfs-/Superadmin-Logik wiederverwenden.

Nächster Schritt: Abschlussvorschau und dokumentierte Superadmin-Finalisierung mit Erhalt der Originale, Schutz abgeschlossener Zeiträume und nachvollziehbarer Wiederöffnung. Echte Bank-/Bewohnerdaten bleiben von Tests unberührt.


## Explizite Abschlüsse – vorbereitet und isoliert getestet

Neue getrennte RPCs und Metadatentabelle; ursprüngliche Forderungen, Zahlungen und veröffentlichte Zwischenberichte bleiben erhalten. Nur tatsächlicher Superadmin kann die Vorschau laden, finalisieren oder begründet wieder öffnen. Verwaltung/Bewohner sehen keine privaten Quellenvermerke. Jede Finalisierung verlangt denselben aktuellen Datenfingerprint, einen exakt übereinstimmenden separat eingegebenen Bankendsaldo, Quellenreferenz und zwei ausdrücklich gesetzte Bestätigungen (vollständiger Bankauszug / Bankabgleich). Diese Bestätigungen sind fachliche Erklärungen des Administrators; die Software beweist keine externe Quellenvollständigkeit. Noch laufende Zeiträume sind gesperrt. Wiederholte identische Requests sind idempotent; geänderte Wiederholungen werden abgewiesen.

Monatsabschluss lässt ausdrücklich dokumentierte ungeklärte Zahlungseingänge zu; spätere Zuordnungen dürfen diese bereinigen, verändern aber den historischen Abschluss-Snapshot nicht. Jahresabschluss setzt zwölf abgeschlossene Kalendermonate, keine ungeklärten Zahlungseingänge und keine ungeprüften Übernahmen voraus. Das ist bewusst eine strengere Jahresfreigabe. Ein Anfangsbestand erst innerhalb des Jahres gestattet keinen scheinbar vollständigen Jahresabschluss ohne die fehlenden Monatsabschlüsse.

Datenbanktrigger schützen alle alten/neuen direkten und RPC-Schreibwege: rückwirkende Bank-/Forderungsänderungen bis einschließlich Ende eines aktiven Abschlusses, Gegenbuchungen auf geschützte Originale und Änderung des Anfangsbestands. Jahresabschlüsse schützen zusätzlich betroffene Zuordnungen, Guthaben und historische Übernahmen. Auch frühere Zeiträume sind geschützt, weil deren Buchungen den kumulierten Abschlussbanksaldo bestimmen. Wiederöffnung erfolgt erst nach späteren Abschlüssen; bei Monaten zuerst den zugehörigen Jahresabschluss öffnen. Grund, Akteur und Zeitpunkt bleiben protokolliert, Original-Snapshot bleibt erhalten. Keine Löschung von Finanzhistorie als Rücknahmeverfahren.

Oberfläche unter Berichte nur für verbundenen tatsächlichen Superadmin, nicht in Rollenvorschau/Demo. Vorschau erfordert aktive Zeitraumwahl. Bankbetrag wird centgenau ohne Gleitkommarechnung umgewandelt. Pflichtbestätigungen sind standardmäßig leer. Fehlgeschlagener Speicherversuch behält dieselbe Request-ID; erneuter Klick kann dasselbe Ergebnis abrufen. Quellen/Notizen werden escaped und beim Schließen aus dem Dialog entfernt. Sitzungs-/Standortwechsel entwertet laufende Antworten.

Nachweise: 46 PGlite-Prüfungen mit synthetischen Identitäten, darunter Monats-/Jahresregeln, exakte Bankprüfung, veraltete Vorschau, Wiederholungskonflikt, Sperren von Rückdatierung/Gegenbuchung/Anfangsbestand/Jahreszuordnung/Übernahme, RLS und Audit sowie Wiederöffnungsreihenfolge. 22 native Chromium-Prüfungen DE/TR: Pflichtbestätigungen, exakte Beträge, identischer Wiederholungsrequest, XSS-Abgrenzung, begründete Wiederöffnung, Berechtigungsentzug und Leeren privater Dialogdaten. Keine echten Abschlüsse erzeugt. Veröffentlichung separat zu bestätigen.


Backend-Veröffentlichung 30.10.2026 bestätigt: Migration 20261030201427_explicit_period_closing_and_reopening aktiv. Rein lesende Prüfung: 0 echte Abschlussdatensätze, RLS aktiv, kein Client-INSERT und keine anonyme Finalisierung. Keine bestehenden Finanz-/Bewohner-/Authdatensätze geändert. 50 aktuelle Finanz-, 31 Finanzabnahme-, 16 Bankimport-, 84 Rechte-, 23 Kontakt- und 43 Historienprüfungen mit installierter neuer Abschlusssicherung erfolgreich; allgemeine Suite 299/299. Frontend-Rollout noch offen.


## Getrennte Summenfreigaben – getestet, Backend installiert

Explizite, standardmäßig leere Freigabetabelle; keine Umwandlung alter Reports oder Abschlüsse. Superadmin wählt einen aktiven bestätigten Abschluss und ausdrücklich entweder aktuelle berechtigte Gemeinschaft (mit Anmeldung) oder öffentliches Internet ohne Anmeldung und setzt eine separate Pflichtbestätigung. Kein automatischer Publikationsschritt bei Finanzabschluss. Idempotente Requests, protokollierte Rücknahme, keine physische Löschung der Freigabehistorie.

Ausgabe ausschließlich aus festen Datums-/Betragsfeldern: Art, Zeitraum, Anfang, Einnahmen, Ausgaben, sonstige Bankbewegungen und Ende plus Freigabe-ID/-zeitpunkt. Keine Quellenreferenz, Freitextnotiz, Personen-/Kontodaten, interne Snapshot-Fingerprints oder Akteur-ID. Direkte Tabellenleserechte für anonyme Nutzer und Aufruf der internen Projektionsfunktion gesperrt. Gemeinschafts-RPC verlangt echten aktuellen berechtigten Eigentümer/Mieter oder Finanzrecht; ein ehemaliger Bewohner erhält dadurch keine Gemeinschaftsrechte. Öffentliche RPC hat absichtlich kein Auth-Erfordernis, kann aber nur tatsächlich öffentlich freigegebene aktive Abschlusssummen liefern, maximal die 100 jüngsten Freigaben. Wiederöffnung blendet beide Zielgruppen sofort aus; ein späterer neuer Abschluss muss neu freigegeben werden.

Separate statische Ansicht public-reports.html?site=… fragt ausschließlich diese öffentliche Projektion ab, ohne Account-Token, Cookies oder Kontospeicher. Keine Suche über alle Anlagen. DE/TR, PDF-Druck und Excel aus demselben eingeschränkten Datenmodell. Leere Freigaben ergeben keine erfundenen Zahlen oder Exportaktionen. Ungültiger Link verursacht keine Backend-Abfrage; Fehler beim Aktualisieren entfernen alte Zahlen aus der Anzeige. Monats- und Jahreszeilen werden ausdrücklich nicht miteinander summiert. Private App zeigt zusätzlich die getrennte Gemeinschaftsübersicht und nur dem tatsächlichen Superadmin Freigabe-/Rücknahmebedienung.

29 isolierte SQL-Prüfungen, 24 native Browserprüfungen, vier zusätzliche Datenmodelltests (insgesamt 303 allgemeine Tests). Backend-Version 20261030202050 aktiv; rein lesend 0 echte Freigaben und 0 echte Abschlüsse bestätigt. Advisor-Sammelgruppen unverändert; die bewusst öffentliche RPC ist als Ausnahme im anonymen Security-Definer-Sammelhinweis zu bewerten. Keine pauschale Sicherheitsabnahme aller anderen Hinweise. Frontend-Rollout separat zu bestätigen. Nächster Fachpunkt: Beschluss-/Sonderumlagenabnahme.


## Veröffentlichung bestätigt

#69 und #70 nach erfolgreicher CI 41121725509 / 41122681590 gemergt; Hauptzweig 7e7033b83ab57d7364ccd6e97ca8b3c30eb0214d. Pages 41122968436 erfolgreich; acht ausgelieferte Anwendungsdateien einschließlich beider neuer Oberflächen bytegleich verifiziert. Kein echter Abschluss und keine echte Summenfreigabe angelegt. Frühere Hinweise „Frontend-Rollout offen“ dieser beiden Schritte sind überholt. Sonderumlagen werden im separaten Entwicklungsbranch vorbereitet, nicht vorzeitig live gebucht. Siehe PHASE-4-LEVY-AUDIT.md.


Gezielte Folgekorrektur 31.10.2026: Nach bestätigter Freigabe verwirft der Browser deren Wiederholungs-ID. Nach späterer Rücknahme erhält eine erneute bewusste Freigabe damit eine neue ID; bei unklarem fehlgeschlagenem Versuch bleibt sie unverändert. Bisher konnte eine neue Freigabe nach Rücknahme mit der alten ID lediglich das frühere zurückgenommene Ergebnis zurückliefern. 26 tatsächliche Browserprüfungen einschließlich dieser DE/TR-Regressionsfälle bestanden. Keine Backend-/Datensatzänderung; Veröffentlichung separat bestätigen.


Folgekorrektur veröffentlicht: #73, CI 41134168564 und Pages 41134428061 erfolgreich, main 9a8827f8cfa8b2c88fd82b24fcdc47b96b51d585. Neue bestätigte Freigabe verwirft ihre Wiederholungs-ID; spätere Neufreigabe nach Rücknahme funktioniert. 26 Browserprüfungen bestanden. Früherer Veröffentlichung-offen-Vermerk damit überholt.

Live-Auslieferung der drei betroffenen Dateien app.mjs, index.html und report-release-ui.mjs bytegleich mit #73 bestätigt.
