# AyaPark 2 – Verbindliche Projekt-Roadmap und Fortschrittsliste
## Aufgaben veröffentlicht; Alt-Einstiege geprüft – 31.10.2026

PR #79 gemergt: main b8af467a5e55c5ac132517a7f0d153e905aabe01, CI 41178664364 erfolgreich, Pages 41178752049 erfolgreich. Backendmigration 20261031065623 aktiv und 0 echte Aufgaben bestätigt, RLS/Client-/Anonymgrenzen geprüft. 35 SQL-/52 native DE/TR-Browserprüfungen und 326 allgemeine Tests bestanden. Interne Terminhinweise beim Laden, keine automatische Folgeanlage/Bestellung/Zahlung/Nachricht. Details PHASE-6-TASKS-AUDIT.md. Reale Gesamtabnahme bleibt separat offen.

Nächsten P0-Restpunkt gefunden: /old/ leitete weiter, drei tiefere alte Login-/API-Oberflächen waren weiterhin vorhanden. Im separaten Branch fix/retired-legacy-entrypoints-20261031 durch bestehende Weiterleitungslogik ersetzt. 18 native Prüfungen mit/ohne JavaScript, Callback-/Fallback-Erhalt, keine alten Formulare/externen Requests. Noch nicht veröffentlicht; Details LEGACY-ENTRYPOINT-AUDIT.md. Danach dokumentierte Forderungshinweise7/21/interne Prüfung35 gegen Implementierung abgleichen. Backup weiterhin übersprungen.

## Archiv veröffentlicht, Aufgaben lokal geprüft – 31.10.2026

PR #78 gemergt: main 8fe18db9be53506b2215330abc9d9cf43d0d4ec5, CI 41178154418 erfolgreich, Pages 41178235871 erfolgreich. Neun Dateien (App/API/Index/Archivmodule/CSS/Recoverygraph) live bytegleich geprüft. Backendmigration 20261031064800 aktiv: privater 10-MiB-Bucket, 0 echte Dokument-/Versammlungs-/Objektzeilen, RLS und restriktive Storagegrenzen bestätigt. API-Aufrufliste für bereits veröffentlichte Abschlüsse/Freigaben/Umlagen/Budget gezielt repariert; 325 allgemeine Tests einschließlich echter Clientintegration erfolgreich. 50 Archiv-SQL- und 70 Archiv-Browserprüfungen. Echte Storage-Übertragung und reale Auth-/Geräteabnahme bleiben ausdrücklich offen; vorbereitete Originaldateiablage ist technisch veröffentlicht, nicht als vollständige reale Abnahme markieren.

Danach Aufgabenliste implementiert und lokal geprüft: vorhandene Verwaltungsmitglieder/Dienstleister/Dateirechte, Termin/Priorität/Status, interne Fälligkeit beim Laden, bewusste manuelle Wiederholung nur nach erledigter Vorlage. 35 SQL-/52 native DE/TR-Browserprüfungen (375/1440px), Details PHASE-6-TASKS-AUDIT.md. Keine automatische Folgeaufgabe, Nachricht, Bestellung oder Zahlung. Aufgabenrollout noch separat offen. Backup bleibt übersprungen.


## Privates Archiv lokal abgenommen – 31.10.2026

Privates Datei-/Versammlungsarchiv im separaten Branch vorbereitet: unveränderte Originalbytes, authentifizierte Rücklese mit SHA-256, getrennte vollständige Dateifreigaben, keine öffentlichen URLs/Überschreibungen, begründete Rücknahme und eigene Versammlungs-/Karar-Defteri-Nachweise. 50 isolierte SQL-, 70 native DE/TR-Browserprüfungen bei 375/1440 px und 323 allgemeine Tests bestanden. Ein mobiler Dialogkopf-Überlauf behoben. Details und tatsächliche Prüfgrenzen: PHASE-6-ARCHIVE-AUDIT.md.

Noch keine Backend-/Frontend-Veröffentlichung dieses Archivschritts bestätigt. Tatsächliche Supabase-Storage-Übertragung mit realer Sitzung und restliche Auth-/Geräteabnahme bleiben offen; lokale Transporttests ersetzen sie nicht. Keine produktiven Dokumente/Bewohner-/Auth-/Finanzdaten für Tests verändert. Backup bleibt auf Nutzerwunsch übersprungen. Danach einfache Aufgaben/Terminerinnerungen mit manueller Wiederholungsanlage.

## Private Freigabeanfragen zusätzlich abgeschirmt – 31.10.2026

Beim anschließenden Archiv-Sicherheitsabgleich einen zweiten Lesepfad gefunden und gezielt geschlossen: Die bisherige allgemeine ay5_operations-Policy erlaubte Finanzlesern auch neue private Freigabepayloads. Arbeitsansichten waren bereits getrennt, diese direkte Verlaufstabelle benötigte aber eine zusätzliche restriktive Policy. Neue administrative Requests werden serverseitig als privat markiert; bekannte ältere Budget-/Rücklagenrequests ohne Markierung sind ebenfalls auf Superadmin-Lesen begrenzt. Historische Anfragen werden nicht umgeschrieben; identische Wiederholungen vor/nach der Härtung bleiben gültig. Gewöhnlicher Finanzverlauf bleibt lesbar.

57 isolierte Budgetprüfungen (vier zusätzliche Datenschutz-/Kompatibilitätsprüfungen), aktuelle Finanzsuite 50 und Finanzabnahme 31 erfolgreich. Backendmigration 20261030223550_private_administrative_request_payloads installiert. Keine echten Anfragedaten oder Finanz-/Authdaten verändert; zusätzlicher Leseschutz und Requestmarkierung. Repository-CI separat bestätigen. Archivarbeit wird danach mit diesem geschützten Requestprotokoll fortgesetzt.

## Phase 5 veröffentlicht – 31.10.2026

Budget/Rücklagen/Liquidität aus PR #74 nach erfolgreicher CI 41137806656 veröffentlicht; Hauptzweig 0c4476ecf4af87bfe6576ae9b4337008f32d6264. Pages 41138023176 erfolgreich. app.mjs, index.html, budget-planning.mjs, budget-planning-ui.mjs und budget-planning.css live bytegleich verifiziert. Backendmigration 20261030221947 aktiv; ursprünglicher Budgethash unverändert und keine echten Pläne/Bankzuordnungen/Rücklagenfreigaben zu Testzwecken angelegt.

53 Budget-SQL-, 66 native DE/TR-Browser-, neun reine Prognoseprüfungen und 317 allgemeine Tests bestanden. Alte Planpauschale ausdrücklich abgeglichen, tatsächliche Cash-Daten von Forderungen/Einnahmeannahmen getrennt und Rücklagenverwendung nur dokumentiert durch Superadmin, ohne Zahlung. Vorbereitungsvermerke „keine Backend-/UI-Integration“ aus älteren Zwischenständen sind für diesen veröffentlichten Schritt überholt. Details: PHASE-5-BUDGET-AUDIT.md.

Phase 6 beginnt mit privatem Datei-/Versammlungsarchiv. Bestand geprüft: derzeit keine Storage-Buckets oder Storage-Objektpolicies; vorhandene Rollen und Audits werden weiterverwendet. Upload/Download ausschließlich authentifiziert, Originale ohne öffentliche URLs oder Überschreiben; keine OCR, keine automatische Rechtsgültigkeitsprüfung. Noch keine Archiveinträge/Dateien produktiv erstellt. Danach einfache Aufgabenliste und interne Fälligkeits-/Überfälligkeitsanzeigen, Wiederholungen nur manuell. Reale Auth-/Mail-/Gerätegesamtabnahme bleibt offen. Backup gemäß Nutzerwunsch nicht erneut bearbeitet.

## Phase 5 integriert und lokal abgenommen – 31.10.2026

Vorhandene Budgetbasis beibehalten; Monats-/Jahrespositionen, Reparaturplanung und getrennte konservative/angenommene 3-/6-Monats-Liquidität ergänzt. Echte Cash-Berechnung zum serverseitigen Ist-Stichtag; offene Forderungen, künftige Bankdaten und bereits im Anfangsbestand enthaltene alte Bewegungen werden nicht als neues heutiges Geld gezählt. Echte Bankteilzuordnungen vermeiden doppelte Kosten; alte Planpauschalen werden ausdrücklich abgeglichen. Gesonderte dokumentierte Superadmin-Rücklagenfreigabe ändert nur Zweckbindung, niemals Bankkonto/Forderungen. Alte direkte Verringerung ohne diese Freigabe serverseitig gesperrt. Keine sechste delegierte Aufgabe.

Neun reine Prognoseprüfungen, 53 isolierte Budget-/Rechte-/Cash-/Rücklagenprüfungen und 66 native DE/TR-Browserprüfungen bei 375/1440 Pixeln bestanden; 317 allgemeine Tests und aktuelle Finanz-/Sonderumlagen-/Abschluss-/Historienregressionen erfolgreich. Details und genaue fachliche Grenzen: PHASE-5-BUDGET-AUDIT.md. Keine juristische Beschlussprüfung durch Software und keine reale Auth-/Mail-/Gerätegesamtabnahme behauptet.

Backendmigration 20261030221947 aktiv und rein lesend geprüft: 0 echte Planpositionen, Bankplanbindungen und Rücklagenfreigaben, bisheriger Budgethash unverändert. RLS/Clientgrenzen geprüft, Advisor-Sammelgruppen unverändert (bestehende Hinweise nicht pauschal gelöst). Keine Bewohner-/Auth-/Bank-/Forderungszeilen für Tests geändert. Frontend-CI und tatsächliche Auslieferung separat bestätigen. Ältere „nur Rechenkern / keine Backendintegration“-Hinweise gelten nicht mehr für diesen Entwicklungsstand.

Nächster Schritt nach Veröffentlichung: Phase 6 – privates Dokumenten-/Versammlungsarchiv und einfache Aufgaben/Erinnerungen, jeweils mit vorhandenen Rollen, RLS und Audit; keine öffentliche Originalbelegablage, keine OCR, keine automatische neue Wartungsaufgabe. Backup bleibt ausdrücklich übersprungen.

## Live-Abnahme Phase 4 bestätigt – 31.10.2026

Sonderumlagen (#72) vollständig technisch veröffentlicht und ausgelieferte Dateien geprüft: CI 41133654321, Pages 41133899050 erfolgreich, Backendmigration 20261030214643 aktiv. 55 SQL-, 74 DE/TR-Browser- und 308 allgemeine Tests sowie weitere Regressionen bestanden. Keine echten Forderungen, Reviews oder Auth-/Bewohnerdaten zu Testzwecken erzeugt/verändert. Externer unterschriebener Beschluss und manuelle fachliche Prüfung bleiben erforderlich; private Originaldateiablage folgt in Phase 6.

Anschließende Korrektur #73 ebenfalls veröffentlicht: Hauptzweig 9a8827f8cfa8b2c88fd82b24fcdc47b96b51d585, CI 41134168564 und Pages 41134428061 erfolgreich. Neue Berichtsfreigabe nach Rücknahme erhält eine neue Anfrage-ID; unklare Wiederholung behält ihre ID. 26 native Browserprüfungen bestanden. Frühere „CI-/Live-Nachweis folgt“-Vermerke dieses Fixes sind überholt. app.mjs, index.html und report-release-ui.mjs live bytegleich mit dem geprüften Fix bestätigt.

Der nächste Arbeitsschritt liegt bereits separat als Draft-PR #74 vor: https://github.com/kemcap/ayapark2/pull/74 . Phase-5-Prognosekern mit neun neuen Prüfungen und erfolgreicher GitHub-CI 41134227055 vorbereitet; keine Backend-/UI-Veröffentlichung. Konservative Bankliquidität bleibt von Forderungen und angenommenen Geldeingängen getrennt, auch über Jahresgrenzen und bei überfälligen Kosten. Nächste konkrete Integration: serverseitiger Ist-Stichtag, Erhalt/Abgleich alter Budgetwerte, Monats-/Jahresplanpositionen mit Audit/RLS und echten Bankteilzuordnungen, danach getrennte Rücklagenfreigabe und DE/TR-Oberfläche. Siehe PHASE-5-BUDGET-AUDIT.md.

Noch offen: vollständige Phase 5, private Dokumente/Versammlungen, Aufgaben/Erinnerungen und reale Auth-/Mail-/Gerätegesamtabnahme. Backup weiterhin übersprungen. Keine pauschale Fertigmeldung des Gesamtprojekts.

## Sonderumlagen veröffentlicht, Phase 5 begonnen – 31.10.2026

PR #72 nach erfolgreicher CI 41133654321 gemergt; Hauptzweig d7277a32c851da81f79e00cf23de2b219b809187. Pages 41133899050 erfolgreich. Live ausgelieferte app.mjs, index.html, levy-review-ui.mjs, levy-review.css, finance-forms.mjs, finance-v5.mjs, v3-ui.mjs und forms.mjs bytegleich geprüft. Backendmigration 20261030214643 aktiv; keine echten Reviews/Kapitalentwürfe oder Buchungen für die Abnahme angelegt. Frühere Hinweise „nur vorbereitet/Frontend-Rollout offen“ dieses Schritts sind damit überholt.

Nachweise: 55 isolierte Sonderumlagen-SQL-, 74 native DE/TR-Browserprüfungen, 308 allgemeine Tests und aktuelle Finanz-/Historien-/Abschlussregressionen erfolgreich. Einzelheiten einschließlich externer Beschlussreferenz statt noch ausstehendem privatem Dateiarchiv: PHASE-4-LEVY-AUDIT.md. Keine pauschale juristische oder vollständige Auth-/Mail-/Geräteabnahme.

Zusätzlich gezielt korrigiert: Nach Rücknahme einer Finanzsummenfreigabe muss eine neue Freigabe eine frische Anfrage-ID verwenden; nur die Wiederholung eines unklaren fehlgeschlagenen Versuchs behält dieselbe ID. Sonst konnte das Backend die alte zurückgenommene Freigabe korrekt zurückliefern, während die Oberfläche eine neue Entscheidung vermuten ließ. 26 native Freigabe-Browserprüfungen einschließlich DE/TR-Rücknahme-/Neufreigabe bestanden. Keine Änderung an tatsächlichen Freigabezeilen oder Backend erforderlich. CI-/Live-Nachweis dieser kleinen Frontendkorrektur folgt separat.

Nächster Roadmapschritt bereits sicher vorbereitet: Phase 5 Budget/Rücklagen/Liquidität. Bestandsabgleich in PHASE-5-BUDGET-AUDIT.md und neun reine Prognoseprüfungen im separaten Branch feature/budget-liquidity-preparation-20261031. Noch keine Backend-/UI-Integration oder Veröffentlichung. Offene Forderungen erhöhen niemals den echten Bankbestand; konservative Linie ohne erwartete Geldeingänge, getrenntes Einnahmeszenario, überfällige Kosten sichtbar, bestätigter Rücklageneinsatz und bereits bankgebuchte Teilbeträge getrennt. Alte summarische Budgetwerte müssen bei Integration ausdrücklich abgeglichen werden, damit nichts vergessen oder doppelt abgezogen wird.

Danach offen: privates Dokumenten-/Versammlungsarchiv, Aufgaben/Erinnerungen und restliche reale Auth-/Mail-/Geräteabnahme. Backup weiterhin gemäß Nutzerauftrag übersprungen.

## Sonderumlagen vollständig lokal geprüft, Backend aktiv – 31.10.2026

Vorhandene Entwurfs-/Restcent-Verteilung und Superadmin-Freigabe gezielt erweitert: eigene Eigentümervorschau, getrennte private Beschlussreferenz und drei explizite Prüfbestätigungen, dokumentierter Verantwortlichkeitszeitpunkt sowie zusätzliche endgültige Buchungsbestätigung. Historische Eigentümer nur ausdrücklich und bei zeitlich belegter Zuordnung, keine Altlastenübertragung auf Nachfolger. Neue Kapital-Sammelforderungen ausschließlich über die dokumentierte bestehende Entwurfsfreigabe; direkter V5-Aufruf gesperrt. Kein zweites Buchungs-/Verteilungssystem.

55 isolierte SQL-, 74 native DE/TR-Browserprüfungen bei 375/1440 Pixeln und 308 allgemeine Tests bestanden; weitere aktuelle Finanz-/Historien-/Import-/Abschlussregressionen erfolgreich. Umfang, Rollen-/Quellengrenzen und Rückfallstrategie: PHASE-4-LEVY-AUDIT.md. Keine automatische juristische Beschluss-/Mehrheitsprüfung. Externer unterschriebener Nachweis bleibt über private Referenz auffindbar; Dateiarchiv ist weiterhin Phase 6.

Backendmigration 20261030214643 aktiv und schreibgeschützt geprüft: 0 Reviewzeilen, 0 offene echte Kapitalentwürfe, RLS aktiv, kein direkter Clientzugriff auf den internen Finanzkern und keine anonyme Review-Ausführung. Keine produktiven Bewohner-/Auth-/Finanzzeilen geändert. GitHub-CI und tatsächliche Frontend-Auslieferung dieses Schritts noch separat bestätigen. Ältere Hinweise „nur Vorbereitung/keine Buchungsintegration“ sind für den jetzt geprüften Entwicklungsstand überholt, bedeuten aber keinen bereits bestätigten Frontend-Livegang.

Nächster Schritt nach Veröffentlichung: Phase 5 Budget/Rücklagen/Liquidität. Bestehende Budgetbasis zuerst prüfen und weiterverwenden; Monats-/Jahresplanung und vorsichtige 3–6-Monats-Vorschau ergänzen. Nur echte Bankmittel als liquide Mittel behandeln, erwartete Forderungseingänge getrennt halten; keine automatische Rücklagenentnahme oder Zahlung. Backup bleibt auf ausdrücklichen Nutzerwunsch übersprungen.

## Bestätigter Live-Stand und laufende Sonderumlagenvorbereitung – 30.10.2026

Abschlüsse (#69) und getrennte Summenfreigaben (#70) nach erfolgreicher CI veröffentlicht. Hauptzweig 7e7033b83ab57d7364ccd6e97ca8b3c30eb0214d; CI #69: 41121725509, CI #70: 41122681590 jeweils erfolgreich. Pages 41122968436 erfolgreich. Der frühere Pages-Lauf für #69 wurde durch den nachfolgenden #70-Lauf ersetzt; keinen separaten #69-Pages-Erfolg behaupten. Live ausgelieferte app.mjs, index.html, period-closing-ui.mjs, public-reports.html, public-reports.mjs, public-reports.css, report-release-ui.mjs und released-report-model.mjs bytegleich mit dem geprüften Release. Backendmigrationen 20261030201427 und 20261030202050 aktiv, weiterhin 0 echte Abschlüsse/Freigaben. Keine automatisch veröffentlichten Finanzsummen und keine produktiven Testbuchungen.

303 allgemeine Tests, 46 Abschluss-SQL-, 29 Freigabe-SQL-, 22 Abschluss-Browser- und 24 Freigabe-Browserprüfungen bestanden. Frühere Hinweise „Frontend noch offen“ dieser abgeschlossenen Schritte sind überholt. Pflichtbestätigungen für echte Bankabschlüsse und tatsächliche Summenfreigaben bleiben bewusste Bedienhandlungen des Superadmins.

Nächster Roadmapschritt bereits begonnen: Sonderumlagen-/Beschlussnachweise. Bestandsabgleich in PHASE-4-LEVY-AUDIT.md; vorhandene Verteilungs- und Entwurfsfreigabe wird weiterverwendet. Im separaten Branch feature/levy-review-preparation-20261030: neuer Entwicklungskandidat levy-review.sql mit 28 isolierten Prüfungen für private Beschlussdokumentation, explizite eigene Eigentümervorschau, historischen Verantwortlichkeitszeitpunkt, Entwurfsbindung, Widerruf und Audit. **Nur vorbereitet und getestet, nicht produktiv installiert.** UI, Bindung an endgültige Buchungsfreigabe, historische Auswahl in diesem Buchungsweg und Gesamtabnahme bleiben offen. Kein neuer produktiver Schuldner-/Beschlussdatensatz und keine echte Forderung erzeugt. Nicht als fertige Sonderumlagenfunktion markieren.

Danach weiterhin offen: Budget/Rücklagen/Liquidität, private Dokumente/Versammlungen, Aufgaben/Erinnerungen sowie restliche Auth-/Mail-/Gerätegesamtabnahme. Backup gemäß ausdrücklichem Nutzerauftrag nicht erneut bearbeitet.

## Abschlussfunktion veröffentlicht; Summenfreigabe folgt – 30.10.2026

PR #69 nach erfolgreicher CI 41121725509 gemergt; Hauptzweig a3b4a067a5b66101d75aae8ae3cc265de88b02b7. Backend-Abschlüsse (Migration 20261030201427) aktiv, Frontend-Pages-Auslieferung wird separat bestätigt. 46 Abschluss-SQL-, 22 Browser- und 299 allgemeine Prüfungen sowie aktuelle Finanz-/Rechte-/Historienregressionen bestanden. Kein echter Zeitraum abgeschlossen.

Danach unmittelbar umgesetzt und isoliert geprüft: ausdrückliche Summenfreigabe je bestätigtem Abschluss und Zielgruppe „berechtigte aktuelle Gemeinschaft“ oder „öffentlich ohne Anmeldung“. Standardmäßig keine Veröffentlichung. Nur fest erlaubte Datums-/Betragsfelder, keine Roh-Snapshots, Quellenreferenzen, Notizen, Schuldner, Kontodaten oder Akteur-IDs. Rücknahme protokolliert; Wiederöffnung des ursprünglichen Abschlusses blendet bestehende Freigaben automatisch aus. Persönliche Bereiche und alte Zwischenberichte unverändert. 29 synthetische SQL- und 24 native DE/TR-Browserprüfungen; 303 allgemeine Tests einschließlich vier neuer Datenprojektionsprüfungen bestanden.

Backendmigration 20261030202050_opt_in_aggregate_report_releases installiert und rein lesend bestätigt: 0 Freigabezeilen, 0 Abschlusszeilen, kein anonymer Tabellenzugriff/Publikationsaufruf/private Projektionsaufruf. Nur die fest begrenzte öffentliche Summen-RPC ist absichtlich anonym aufrufbar; sie liefert ohne manuell freigegebene aktive Abschlüsse ein leeres Array. Bestehende Advisor-Gruppen unverändert; deren Sammelhinweis auf anonym ausführbare Security-Definer-Funktionen enthält jetzt diese beabsichtigte, geprüfte öffentliche Projektion. Nicht als allgemeine Behebung aller Advisor-Hinweise ausgeben.

Frontend-Veröffentlichung der Summenfreigabe noch offen. Danach als nächster Roadmapschritt: Sonderumlage/Beschlussnachweise und historische Schuldner-/Verteilungsschlüssel gegen vorhandenen Forderungsentwurfs- und Superadmin-Freigabeablauf prüfen und gezielt vervollständigen. Danach Budget/Rücklagen und einfache Verwaltungswerkzeuge. Keine erneute Backupbearbeitung.

## Bestätigter Rollout und nächster Abschluss-Schritt – 30.10.2026

Direkter PDF-/Excel-Import (#65), aktuelle Finanzabnahme (#66) und eingeschränkte Excel-/PDF-Exporte mit persönlichen Zahlungsnachweisen (#67) sind veröffentlicht. Hauptzweig nach #67: 03a223eb12f0c42d74ee157fd4ee2dcb4cc5a24e. CI 41083523757 und Pages 41084770953 erfolgreich; ausgelieferte app.mjs, index.html, export.html, report-export-domain.mjs, export-page.mjs, xlsx-export.mjs und lokaler XLSX-Schreibbaustein bytegleich geprüft. Frühere Hinweise „Rollout noch offen“ dieser drei Schritte sind damit überholt.

Nächster Schritt implementiert und isoliert geprüft: explizite Monats-/Jahresabschlussvorschau, Quellen-/Bankbestätigung, unveränderliches Abschlussprotokoll, serverseitige Buchungssperren sowie begründete Wiederöffnung. 46 synthetische SQL- und 22 native DE/TR-Browserprüfungen bestanden; vorhandene Finanz-/Rechtefunktionen werden zusätzlich mit installierten, aber noch nicht aktivierten Abschlusssperren geprüft. Technische Details: PHASE-4-REPORTS-AUDIT.md. Backend- und Frontend-Veröffentlichung dieses neuen Schritts werden separat bestätigt. Kein echter Zeitraum automatisch abgeschlossen, keine Bewohner-/Bank-/Authdaten geändert. Backup bleibt gemäß Nutzerauftrag übersprungen.

Danach: ausdrückliche Freigabe rein aggregierter Finanzübersichten, Beschluss-/Sonderumlagenabnahme, Budget/Rücklagen, privates Dokumenten-/Versammlungsarchiv, Aufgaben/Erinnerungen und verbleibende vollständige Rollen-/Auth-/Geräteabnahme. Vor jeder Ergänzung bestehende Funktionen prüfen. Nicht alle Roadmapaufgaben sind abgeschlossen.

## Berichte und persönliche Exporte – 30.10.2026

Phase-4-Ist/Soll geprüft; bestehende CSV-/Datums-/Diagrammfunktionen weiterverwendet. Ergänzt und lokal getestet: echte Excel-Exporte für Summen und berechtigte Bankdaten, gesonderte PDF-Exportansicht sowie persönliche Zahlungsnachweise nur für eigene Personen-IDs oder tatsächliche Finanzverwaltung. Keine Übernahme fremder Teilbeträge bei gemeinsamer Wohnung/Zahlung. Texte sicher escaped, Excel-Formel-Injection verhindert, Betragstypen centgenau, Vorschau/Demo auch in exportierten Daten gekennzeichnet. Keine echten personenbezogenen oder Finanzdatensätze geändert.

299 allgemeine Tests und 22 tatsächliche DE/TR-Browserprüfungen erfolgreich; Excel mit unabhängiger Anwendung lesbar, PDF-Drucklayout visuell geprüft. Details und genaue Nachweisgrenzen: PHASE-4-REPORTS-AUDIT.md. GitHub-Rollout wird separat bestätigt. Weiter offen: endgültige Monats-/Jahresabschlüsse, ausdrückliche öffentliche Summenfreigabe und Beschluss-/Sonderumlagenabnahme. Nächster Schritt ist die dokumentierte Abschlussfinalisierung mit nachvollziehbarer Wiederöffnung, nicht eine Neuerstellung bereits vorhandener Berichte.

## Aktuelle Finanz-/Korrekturabnahme – 30.10.2026

31 zusätzliche SQL-Prüfungen mit dem aktuellen relevanten Migrationspaket bestanden: Forderungszeiträume, Teil-/Vollzahlung, Zuordnungswiederholung mit/ohne Guthaben, Ablehnung geänderter Wiederholung und Überzuordnung, Erhalt ursprünglicher Schuldner/Buchungen bei Archivierung, Stornohindernisse, Gegenbuchungen und periodeübergreifender Kassen-/Berichtsabgleich einschließlich Transfers. Entzogene Finanzrechte sperren selbst exakte Wiederholungen und fehlerhafte Payloads, bevor Finanzdetails verarbeitet werden. Ausführung ausschließlich in PGlite mit künstlichen Identitäten. Bestehende ältere Baseline bleibt erhalten. Neuer Befehl test:finance:audit:sql und zusätzliche CI-Ausführung.

Zusammen mit 50 aktuellen V5-Finanzprüfungen, 16 Bankimportprüfungen, nativer PDF-/XLSX-Quellenprüfung und tatsächlicher synthetischer Importbedienung sind Quellenlesen, Saldenkontrolle und anschließende Zuordnung technisch getrennt geprüft. Daraus wird keine neue fachliche Bestätigung oder Korrektur echter Produktivbuchungen abgeleitet. Finanzoriginale unverändert.

Nächster Schritt: Berichts-/Export- und Abschlusslogik in Phase 4 abgleichen, vorhandene PDF-/CSV-Funktionen weiterverwenden und fehlende Excel-/Beleg-/Abschlussregeln gezielt ergänzen. Backup weiterhin übersprungen.

## Direkter PDF-/XLSX-Import – 30.10.2026

Implementiert und lokal geprüft: unterstützte Yapi-Kredi-Text-PDFs und Excel-Vorlagen werden direkt auf dem Gerät gelesen und an die bestehende CSV-/Saldenvorschau übergeben. Kein externer Konvertierungsdienst und keine neue Buchungslogik. Mehrseitige Beschreibungen und Gebühren bleiben erhalten; mehrere Excel-Blätter verlangen explizite Auswahl mit eigenem Batch-Hash. Nicht lesbare/mehrdeutige Quellen, Formeln und aktive Excel-Inhalte bleiben gesperrt. Grenzen: 2 MB, 2.000 Bewegungen, PDF höchstens 100 Seiten; gescannte/unbekannte PDF-Layouts und nicht unterstützte Tabellenspalten erfordern überprüfte CSV-Aufbereitung. Details: PHASE-3-IMPORT-AUDIT.md.

293 allgemeine Tests, 17 native Dateiextraktionsprüfungen, 34 neue tatsächliche DE/TR-Importformularprüfungen und 58 bestehende Browserregressionen erfolgreich. Drei vorhandene Auszüge mit insgesamt 63 Seiten durch den nativen Browser-Lesepfad geprüft; keine produktiven Datensätze geschrieben. Vendor-Quellen/Lizenzen/Hashes und reproduzierbarer Build versioniert; Abhängigkeitsscan ohne bekannte Schwachstelle. Rollout wird nach GitHub-CI separat bestätigt.

Nächster Schritt: aktuelle Finanz-/Korrekturabnahme vollständig durchspielen und danach Berichte/Abschlüsse bearbeiten. Fortlaufende geprüfte Veröffentlichung ist freigegeben; Backup bleibt übersprungen.

## Bestätigter Rollout 30.10.2026 – Releases #62 bis #64

Bankimport-Dublettenschutz (#62), rein lesende PDF-Quellenprüfung (#63) und CSV-Saldenvorschau mit Sperre widersprüchlicher Angaben (#64) sind nach main übernommen. Aktueller Hauptzweig: 23489cfd649efa8c81d87f4a3fd822fa1a698bd4. CI für den letzten PR-Head: 41067609710 erfolgreich; Pages-Deployment: 41067714654 erfolgreich. Live ausgelieferte app.mjs, index.html und import-review.mjs sind bytegleich mit dem geprüften Stand. Backendmigration 20261030133658 aktiv und schreibgeschützt bestätigt; Advisor-Gruppen vor/nach Änderung unverändert. Keine produktiven Bewohner-, Auth- oder Finanzdatensätze zu Testzwecken geändert.

Nachweise: 281 allgemeine Tests, 84 aktuelle Aufgabenrechteprüfungen, 23 Kontakt-, 43 Historien-, 50 aktuelle Finanz-, 16 Bankimport- und 11 PDF-Strukturprüfungen erfolgreich. 58 lokale tatsächliche Browserprüfungen der Import-/Kontaktoberflächen in DE/TR bei 320–1440 px erfolgreich; ausschließlich synthetische Daten, keine externen Anfragen. Keine pauschale Gesamtgeräte-/Mail-/Auth-E2E-Abnahme.

Nächster offener Fachpunkt: direkte PDF-/XLSX-Parser mit vollständigen Beschreibungen, Mehrseiten- und Spaltenzuordnung vor die vorhandene Vorschau integrieren; aktuell weiterhin nur CSV in der Live-Importmaske. Fortlaufende Abarbeitung und direkte Veröffentlichung geprüfter Änderungen sind ausdrücklich freigegeben. Backup bleibt übersprungen.

## Importvorschau und mobile Kontaktfreigabe – 30.10.2026

PR #63 (PDF-Strukturprüfung) nach erfolgreicher CI 41065619848 veröffentlicht; Pages-Lauf 41065968751 erfolgreich. Der nächste umgesetzte Schritt ergänzt die bestehende CSV-Vorschau um Einnahmen, Ausgaben, Netto und eine exakte Prüfung vorhandener laufender Salden. Beide Druckreihenfolgen und fehlende Zwischenangaben werden berücksichtigt. Widersprüchliche Salden sperren den Importbutton vor Erstellung des Importpayloads; Beträge werden niemals passend gerechnet. Ohne ausreichende Saldoangaben bleibt die Quelle ausdrücklich ungeprüft; Anfangssaldo und Seitenvollständigkeit benötigen weiterhin separate Bestätigung. Dies ist eine zusätzliche Eingabeprüfung der Oberfläche, keine neue Buchungslogik oder Ersatz für serverseitige Rechte.

Acht neue reine Regressionstests bestanden, gesamte JavaScript-Suite 281/281. Nach dem fehlgeschlagenen Standarddownload wurde eine separate lokale Chromium-Testumgebung erfolgreich eingerichtet. 58 tatsächliche Browserprüfungen in DE/TR bei 320/375/768/1440 px bestanden: tatsächlicher Importbutton bei widersprüchlichen Salden gesperrt, fehlende Salden sichtbar ungeprüft, Kontaktfreigabe verlangt unabhängige Bestätigung, keine horizontale Überbreite, keine gefundenen WCAG-A/AA-Verstöße in der geprüften Kontaktkomponente, keine Laufzeitfehler oder externen Anfragen. Ausschließlich synthetische Daten; kein produktiver Account verwendet. Evidenz: qa/results/phase2-import-browser.json und wiederholbarer Test qa/phase2-import-browser.mjs. Keine pauschale Abnahme aller Rollen, Geräte, Mail- oder Authabläufe.

**Nächster offener Schritt:** PDF-/XLSX-Lesen einschließlich vollständiger Beschreibungen/Mehrseiten-/Tabellenzuordnung in denselben kontrollierten Vorschaupfad integrieren. Bis dahin akzeptiert die Live-Maske weiterhin ausschließlich CSV.

## Phase 3 fortgesetzt – Quellenprüfung

PR #62 nach erfolgreichem CI-Lauf 41064856278 in main veröffentlicht (c8374bd51eba370faa5d0af4da1ac8d60585e68a); Backendmigration 20261030133658 bereits aktiv. Anschließend lokalen, rein lesenden PDF-Struktur-/Saldencheck für zwei bekannte Banklayouts ergänzt: 11 synthetische Tests bestanden. Kein DB-Zugriff und keine Buchung durch das Werkzeug. Vollständigkeits-, Anfangssaldo- und Zuordnungsgrenzen ausdrücklich festgehalten. Details und die drei getrennten Quellen-/Saldo-/Zuordnungsabnahmen: [PHASE-3-IMPORT-AUDIT.md](PHASE-3-IMPORT-AUDIT.md).

Nächste Umsetzung: direkte PDF-/XLSX-Parser vor die bestehende Importvorschau integrieren, zunächst Mehrseiten-/Beschreibungs-/Tabellenadapter isoliert absichern. CSV bleibt der einzige gegenwärtige Importdateityp der Live-Maske. Geräte-/Browser-/Mailabnahme weiterhin offen.

## Fortsetzung 30.10.2026 – Eigentümerwechsel und Finanzimport

**Backend veröffentlicht:** deduplicate_bank_movements_within_import, Supabase-Version 20261030133658. Neue Funktionsdefinition schreibgeschützt bestätigt (43f8931c425ffbc08f92aa0ebd90746c); anonyme Ausführung weiterhin gesperrt. Repository-/CI-Veröffentlichung wird separat bestätigt.

43 Historienprüfungen bestehen einschließlich echter Assignment-Befehle: Eigentümerwechsel, wiederholte Anfragen, getrennte Wohnungszugänge, Mehrfachzuordnungen und Zutrittsentzug. Sämtliche synthetischen Forderungs-, Bank- und Zuordnungszeilen bleiben beim Wechsel bytegleich; ursprünglicher Schuldner und Konto-ID bleiben erhalten. Zwölf zentrale Funktionsdefinitionen des isolierten Fixtures wurden vor der Korrektur schreibgeschützt mit Produktion abgeglichen: alle identisch.

50 Finanzprüfungen laufen zusätzlich gegen das relevante aktuelle Migrationspaket (test:finance:sql): Teilzahlungen, oldest-first innerhalb derselben Schuldart, Guthaben, unveränderliche Originale, Storno und Freigaben. Die ältere V5-Baseline bleibt separat erhalten. Ein zentraler Fixture-Loader vermeidet auseinanderlaufende Migrationslisten; er ersetzt keinen vollständigen Live-Schemaexport.

Bankimportfehler reproduziert: dieselbe Referenz konnte innerhalb einer Datei bei geänderter Beschreibung oder laufendem Saldo doppelt gebucht werden. Der Import filtert nun vor der Anlage des Batches auch innerhalb der Anfrage anhand der bereits zwischen Dateien geltenden Identität (Datum, Betrag, Referenz; ohne Referenz zusätzlich Beschreibung). Unterschiedliche echte Referenzen bleiben getrennt. 16 CSV-/SQL-Prüfungen belegen Vorher-/Nachher, separate Gebühren, genaue Centbeträge, Überlappungen, Wiederholungen, unveränderte Originalzeilen und atomaren Rollback. Keine automatische Forderungszuordnung. Migration ersetzt ausschließlich die geprüfte command-Funktion mit Ausgangshash-Schutz, ohne bestehende Finanzdaten oder Rechte zu ändern. Rückfall: geprüfte vorige command-Definition aus 20261030044641 wiederherstellen; keine Datenlöschung oder automatische Dublettenbereinigung.

GitHub-CI führt künftig die aktuellen Rechte-, Kontakt-, Historien-, Finanz- und Bankimportprüfungen zusätzlich zu den bisherigen Prüfungen aus. Allgemeine Suite 273/273. Browser-/Mail-/Geräteabnahme bleibt offen: der lokale Chromium-Download lieferte kein gültiges Archiv; kein erfolgreicher Browserlauf wird daraus behauptet.

**Nächster konkreter Fachpunkt:** PDF-/XLSX-Importpfad gegen den vorhandenen CSV-Vorschau-/Prüfablauf abgleichen und die getrennte Bank-/Saldo-/Zuordnungsabnahme vervollständigen. Derzeit akzeptiert die Importmaske ausschließlich CSV; externe Konvertierungsanleitung ist vorhanden, direkter PDF-/XLSX-Import ist noch nicht umgesetzt. Backup weiterhin gemäß Nutzerauftrag übersprungen.


## Rollout bestätigt – Kontaktfreigaben und Historie

30.10.2026: Kontaktfreigaben (#59), Wiederherstellung des persönlichen historischen RLS-Zugriffs (#60) und historische Wohnungsbezeichnungen ohne neue aktuelle Zugriffsrechte (#61) sind produktiv. Pages und zugehörige CI-Läufe jeweils erfolgreich; zuletzt 41017986234/41017982098. Allgemeine Suite 273/273; Kontakt-SQL 23 und aktueller Historien-Vorher-/Nachher-Test 28 erfolgreich. Keine echten Bewohner-, Kontakt-, Auth- oder Finanzdatensätze zu Testzwecken verändert.

Offen bleibt die durchgängige Geräte-/Bedienabnahme und der weitere Finanz-/Bankabgleich. Authentifizierte Browser-/Mail-End-to-End-Tests wurden durch diese isolierten Nachweise nicht ersetzt.

## Historienanzeige vervollständigt – 30.10.2026

Zusätzlicher reproduzierter Frontendfehler: Nach Ende einer aktuellen Wohnungszuordnung konnte die Wohnungsbezeichnung bei einer eigenen historischen Forderung fehlen. API-Mapping behält nun die vom Server erlaubten Metadaten solcher Wohnungen. ownIds und aktuelle Navigation werden nicht erweitert, fremde Schuldner bleiben aus der persönlichen Historie ausgeschlossen. Ein Vorher-/Nachher-Regressionstest belegt Bezeichnung und Zugriffstrennung. Allgemeine Testsuite jetzt 273/273.

Kontaktworkflow (#59) und RLS-Historienkorrektur (#60) sind produktiv, jeweilige Pages- und CI-Läufe erfolgreich. Die neue reine Frontendkorrektur wird als eigener Release nachgeführt. Gesamtroadmap bleibt offen; Phase-2-Geräte-/Bedienabnahme sowie Finanz-/Bankabgleich aus Phase 3 stehen weiterhin aus.

## Historien-RLS korrigiert – 30.10.2026

Die Prüfung mit den relevanten aktuellen Migrationen reproduzierte einen echten Rückschritt: Die Wohnungs-RLS aus dem 29.10. enthielt keinen persönlichen historischen Schuldnerzugriff mehr. Korrektur als restore_personal_charge_history produktiv angewendet (Supabase-Version 20261030065637). Forderungs- und Zahlungszuordnungszugriff erlaubt wieder eigene historische Forderungen, zusätzlich zur unverändert begrenzten aktuellen Wohnungssicht. Fremde Wohnungen, rohe Bankdaten und entzogene Zugänge bleiben gesperrt. Originalschuldner und Buchungsdaten wurden nicht geändert.

28 isolierte Vorher-/Nachher-Prüfungen mit dem relevanten aktuellen Migrationspaket bestanden. Das alte Baseline-Historienskript bleibt zusätzlich erhalten. Tests und aus der tatsächlich vergebenen Provider-Version benannte Migration sind im Repository versioniert (#60). Die CLI wurde wegen blockierter Telemetrie nicht erneut ausgeführt; der geprüfte SQL-Text wurde über den verbundenen Supabase-Migrationsdienst angewendet.

Kontaktänderungsanträge aus PR #59 ebenfalls produktiv; Pages-Deployment 41016521336 und CI-Lauf 41016403144 erfolgreich. 272 allgemeine Tests und 23 Kontakt-SQL-Prüfungen bestanden. Keine produktiven Kontakt-Testanträge erzeugt.

## Kontaktänderungsanträge – 30.10.2026

Eigene Kontaktdaten können in Einstellungen als Antrag eingereicht und vor Entscheidung zurückgezogen werden. Die Superadmin-Freigabeliste zeigt alte/neue Werte und verlangt unabhängige Prüfung sowie Begründung. RLS, eigene Konto-/Anlagenzuordnung, idempotente Einreichung/Entscheidung und ein Konfliktschutz gegen zwischenzeitliche Änderungen werden serverseitig geprüft. Delegierte Verwaltung darf verknüpfte Kontakte nicht über Personenbearbeitung am Freigabeweg vorbei ändern.

Umfang ausdrücklich Personenverzeichnis: Auth-E-Mail/-Telefon, Passwort und Konto-ID bleiben unverändert. Die UI erklärt dies. Änderungen von Login-Adressen benötigen weiterhin den gesonderten Identitäts-/Auth-Prozess. Auditinformationen bleiben erhalten; es werden keine echten Bewohner zu Testzwecken verändert.

23 isolierte SQL-Prüfungen und 272 allgemeine Tests erfolgreich, darunter drei neue UI-Tests. Nächste Phase-2-Abnahme: Wechsel-/Historienfälle und durchgängige mobile/Rollen-Bedienung; keine pauschale Vollabnahme allein aus Unit-/SQL-Tests.

## Bestätigter Live-Stand 30.10.2026

Fünf Aufgabenrechte über PR #57 produktiv (0e23429a0fc06bfc9c0744a88d5b571ce99793a7). Ergänzender Altberechtigungs-Schutz über PR #58 nach main übernommen (dbeb43b4c0efd9fd300ecbd6fbfee716846a5d49), Backendfunktion nach Migration schreibgeschützt verifiziert. Bestehende Grant-Zuweisungen unverändert. 269 allgemeine Tests und 84 isolierte SQL-Prüfungen erfolgreich. Kontaktänderungsanträge bleiben der nächste offene Fachpunkt.

## Zusätzliche Phase-2-Prüfung 30.10.2026

PR #57 mit den fünf Aufgabenrechten ist produktiv; Pages-Lauf 41005590291 erfolgreich, task-permissions/forms/api ausgeliefert und inhaltsgleich geprüft. Recovery blieb nachweislich Superadmin-only; isolierte Wiederherstellung behält die Account-ID.

Die anschließende Übergangsprüfung ergänzt den Superadmin-Schutz für manuelle Buchungen, Kategorie-/Schuldneränderungen, Budgetänderungen und Ausnahmen auch bei noch nicht auf die fünf Rechte umgestellten alten Finanzberechtigungen. Lesen und normale Zahlungszuordnung bleiben erhalten. Entsprechende Buttons und Formulare sind ebenfalls geschützt. 84 SQL-Prüfungen des neuen Gesamtpakets und 269 allgemeine Tests bestanden. Keine Mitgliedschaften, Kontakte oder Finanzoriginale zu Testzwecken verändert.

Offener nächster Punkt: eigener nachvollziehbarer Kontaktänderungsantrag mit Superadmin-Prüfung; bestehende Zugangsanfragen sind davon zu unterscheiden. Weitere Phase-2-Historienabnahme und Phasen 3–6 bleiben offen.

## Maßgeblicher Fortschritt 30.10.2026 – fünf Aufgabenrechte

Die fünf Rechte sind in der Vergabeoberfläche und serverseitig verbunden. Speicherung erfolgt über ay3_set_task_grants, nur durch Superadmin. Keine automatische Übertragung alter breiter Rechte. Bisherige Berechtigungen bleiben bis zur ausdrücklichen Speicherung kompatibel; danach ersetzt der explizite Aufgabensatz die alten Rechte. Leere Auswahl entzieht alle delegierten Aufgaben. Kritische Finanzen, Recovery, Rollenvergabe und Veröffentlichungen von Finanzberichten bleiben Superadmin-Aufgaben.

Personen-/Beziehungsbefehle prüfen die jeweilige Aufgabe, auch bei direkten privaten Aufrufen. Bearbeitung von Rolle oder Zuordnungsdaten benötigt Bewohnerwechselrecht. Bankrecht erlaubt Zuordnung, aber keine Korrektur bestehender Finanzoriginale. Ankündigungsrecht funktioniert getrennt. Einladungen prüfen das neue Recht bei Ausstellung und Einlösung; Entzug sperrt auch offene Einladungen. Forderungsvorbereitung erhält nur die benötigten Personen-/Beziehungs-/Ausnahmedaten, keine Bankbewegungen allein durch dieses Recht.

Nachweise: 269 allgemeine Tests bestanden, 72 isolierte SQL-Prüfungen einschließlich delegierter Einladung, Rechteentzug, einmaliger Einlösung, tatsächlicher Zahlungszuordnung und Ankündigung. Elf Live-Ausgangshashes vor Rollout identisch. Keine produktiven Testpersonen oder Buchungen angelegt. Kandidat 20261030044641_phase2_task_rights_enforcement.sql; Veröffentlichung wird gesondert bestätigt.

Nächste Phase-2-Prüfung: durchgängige Kontaktänderungs-/Recovery-Freigaben und Bewohnerwechselhistorie mit den neuen Aufgabenrechten. Gesamtroadmap noch nicht vollständig abgeschlossen.

## Aktueller Arbeitsauftrag 30.10.2026 – Phase 2

Der Nutzer hat angewiesen, den Backup-Part zu überspringen und ohne erneute Einrichtung/Tests mit Phase 2 fortzufahren. Historische Backup-Nachweise bleiben unverändert; übersprungene Restore-Punkte werden nicht als neu getestet markiert.

Aktiver Branch: `feature/phase2-role-permission-audit-20261030`, aus main `2c55873506c1e132067876efae12cdc6e42fa358`. [PHASE-2-ROLES-AUDIT.md](PHASE-2-ROLES-AUDIT.md) enthält den Ist/Soll-Abgleich und die Umsetzungsreihenfolge. Neue isolierte Rechte-Matrix: 369 bestanden; bestehende SQL-Prüfungen: 226 bestanden. Allgemeine Testsuite: 249 bestanden / 13 Fehler, keine allgemeine Releasefreigabe. Keine produktiven Rechte geändert.

**Abgeschlossen im Entwicklungsstand:** vier kritische Finanzkorrekturen in command/command_v2 und Oberfläche auf Superadmin beschränkt; 28 SQL- und 2 UI-Prüfungen bestanden, keine produktive Migration. **Nächster konkreter Schritt:** fünf delegierbare Aufgabenrechte samt Entwurfs-/Freigabeablauf konsistent umsetzen. Keine Rückkehr zum Backup-Part ohne neuen Nutzerauftrag.

Stand: 29.10.2026 · Projekt: `kemcap/ayapark2` · Produktivbranch: `main`

**Aktueller Abgleich 29.10.2026:** Phase 0 historisch dokumentiert; Phase 1 teilweise produktiv umgesetzt. Im Hauptzweig läuft bereits eine separate tägliche verschlüsselte Datenbanksicherung. Vollständige portable Sicherung und isolierter DB-/Auth-/Storage-Restore bleiben offen.

## Neuerer Hauptzweig – maßgeblicher Betriebsstand

- Hauptzweig geprüft bei `ebb19543c3d0b695164fb94098fdb2c522b30200`; [Pages-Deployment 40945090260](https://github.com/kemcap/ayapark2/actions/runs/40945090260) erfolgreich.
- [DB-Workflow in main](https://github.com/kemcap/ayapark2/blob/main/.github/workflows/ayapark2-database-backup.yml): täglich **03:17 Europe/Istanbul**. [Lauf 40945224444](https://github.com/kemcap/ayapark2/actions/runs/40945224444), Backup-Job und Export-/Upload-Schritt erfolgreich.
- Dieser Workflow exportiert public/auth/ay2_private/ay_auth_private, prüft Dump-Verzeichniseinträge, verschlüsselt mit age und vergleicht den SHA-256-Hash mit dem aus Drive zurückgelesenen Ciphertext. Er ist **nicht** der gesperrte Komplettentwurf dieses PRs und benötigt dessen Aktivierungsvariable nicht.
- Kein Git-Bundle, keine Storage-Dateien und keine vollständige Plattformkonfiguration im aktiven DB-Backup. Export ohne Owner/ACL; kein fachlicher Restore aus dem erfolgreichen Job ableitbar.
- Schlüsselanlage, getrennte Schlüsselkopie und lokaler verschlüsselter Testdatei-Rundlauf wurden vom Nutzer bestätigt. OAuth-Produktionsstatus und langfristige Token-Nutzbarkeit bleiben zu bestätigen.
- PR #52 bleibt Entwurf. Alte Aussagen über fehlende Secrets/Uploads/Automatisierung beziehen sich auf dessen historischen Vorbereitungsstand und dürfen nicht auf main übertragen werden.
- Haupt-/Nebenaufträge und Überschneidungen der offenen PRs sind aktuell in [SECONDARY-CHANGES.md auf main](https://github.com/kemcap/ayapark2/blob/main/SECONDARY-CHANGES.md) abgeglichen. #42 durch #44/#45 ersetzt; #46 überschneidet sich mit #48; #38/#39 teilweise durch #49 beziehungsweise #43/#51 abgedeckt. Keine PRs aufgrund dieses Abgleichs geschlossen.


## Arbeitsregeln

- Die **30 verbindlichen Produktentscheidungen** stehen ausführlich in `docs/AYA-PARK-2-CONTEXT-HANDOFF.md`. Diese Roadmap ist die *Abarbeitungsliste*, nicht ein Ersatz für die Spezifikation.
- Schritt für Schritt; nach jeder Aufgabe Status, Ergebnis, Nachweise, offene Fragen und **den nächsten konkreten Schritt** eintragen.
- Nur nach echten Nachweisen ein Kästchen abhaken. Code im Entwurfsbranch bedeutet **nicht**, dass etwas produktiv eingerichtet oder getestet ist.
- Der Nutzer hat die fortlaufende Abarbeitung und direkte Veröffentlichung erfolgreich geprüfter Änderungen ausdrücklich freigegeben. Keine erneute Rückfrage pro Release. Produktive Bewohner-, Finanz- oder Auth-Datensätze dürfen nicht zu Testzwecken verändert werden. Fachliche Änderungen an diesen Daten benötigen weiterhin ausdrückliche Freigabe. Backup bleibt übersprungen; keine neue Aktivierung.
- Vor kritischen Schritten: geprüfte Sicherung und isolierte Wiederherstellungsprobe.
- **Supabase Free behalten**; keinen kostenpflichtigen Dienst ohne gesonderte Entscheidung aktivieren.
- Bei Chatwechsel zuerst beide Dateien lesen, den tatsächlichen GitHub-/Supabase-Stand neu prüfen und beim nächsten offenen Punkt fortfahren.
- Änderungen an GitHub und den Dateien im ChatGPT-Projekt **synchronisieren sich nicht automatisch**. GitHub ist die führende, versionierte Fassung; ChatGPT-Projektdateien bei wichtigen Meilensteinen neu hochladen.

## Legende

- `[x]` abgeschlossen und anhand angegebener Grundlage bestätigt.
- `[ ]` offen; auch vorbereitete, aber nicht getestete Änderungen bleiben offen.
- `BLOCKIERT` benötigt vorher einen anderen Schritt oder ausdrückliche Freigabe.

## Phase 0 – Bestandsaufnahme und Sicherheitsgrundlage (P0)

- [x] GitHub `main` auf Commit `a4a9d8c44b56d32c0aa0ac73aa6eb613ae19b89e` (28.10.) schreibgeschützt geprüft.
- [x] Supabase-Produktivprojekt read-only geprüft: PostgreSQL 17.11, 2 Blöcke/20 Wohnungen, 39 Public-Tabellen (RLS aktiviert).
- [x] Vorhandene Finanz-/Anmelde-Module und vorhandenen CI-Workflow im Code identifiziert.
- [x] Zum Prüfzeitpunkt: keine Storage-Buckets/Storage-Dateien; kein täglicher Backup-Workflow in `main`.
- [ ] Aktuelles Live-Deployment, Weiterleitung von `/old/` und möglicherweise öffentlich erreichbare historische Dateien gezielt überprüfen.
- [ ] Supabase-Advisor-Hinweise zu `SECURITY DEFINER`, Auth-Passwortschutz und drei RLS-Tabellen ohne Policy fachlich prüfen; nicht pauschal Zugriffsrechte erweitern.
- [ ] Verbindliche Backupprozedur inklusive Restore-Ziel, maximal tolerierbarem Datenverlust, Betreiberkontakten und Prüfkriterien festhalten.

## Phase 1 – Vollständige portable Backups (auf Nutzerwunsch übersprungen; historischer Nachweisstand)

Entwicklungsbranch `feature/free-backup-preparation-20261028`, **Draft PR #52**: https://github.com/kemcap/ayapark2/pull/52

### 1.1 Entwurf – teilweise erledigt

- [x] Separaten Branch und Draft PR anlegen, ohne `main` zu verändern.
- [x] Standardmäßig gesperrten GitHub-Actions-Workflow anlegen (`AYAPARK_BACKUP_ENABLED` nicht gesetzt).
- [x] Read-only-Skriptentwürfe für PostgreSQL, Auth-Daten, Storage-Metadaten und Datei-Downloads bereitstellen.
- [x] Skript für `age`-Verschlüsselung, externen `rclone`-Upload, Prüfsummen und Offline-Integritätskontrolle bereitstellen.
- [x] Sicherheits-/Einrichtungsanleitung `docs/FREE-BACKUP-SETUP.md` erstellen.
- [x] Shell-Syntax und sechs synthetische Offline-Quellcode-/Archivtests laut PR #52 geprüft. Keine vollständige DB-/Storage-Integration daraus ableiten.

### 1.2 Portabilität – historischer, derzeit übersprungener Arbeitsstand

- [x] Git-Bundle aller im vollständigen Checkout vorhandenen Referenzen und erreichbaren Historie in den **verschlüsselten** Sicherungsprozess integriert; isolierter Git-Restore getestet. Verschlüsselungs-/Offsite-Rundlauf bleibt in 1.4 offen.
- [x] Versionierte Website, HTML, CSS, JS, Assets, Design und Edge-Function-Code im Git-Bundle erfasst; Ref-/Tree-Inventar und unabhängige Wiederherstellung geprüft.
- [ ] Infrastruktur-/Konfigurationsinventar ohne Geheimnisse vervollständigen (Checkliste `docs/BACKUP-RECOVERY-INVENTORY.md` ergänzt; Livewerte noch offen): GitHub Pages, Supabase-Projekt-, Auth-/SMTP-/OAuth- und Storage-Einstellungen; dokumentieren, welche Secrets bei Umzug *neu gesetzt* werden müssen.
- [ ] Prüfen, dass Backup auch bei Totalverlust von GitHub und bei Supabase-Migration auf Self-Hosting nutzbar ist.
- [x] Git-Bundle-Inhalt und Wiederherstellung in ein **neues isoliertes** Repository nachgewiesen: 6 Offline-Integrationstests; zusätzlich tatsächliches Repo mit 62 Referenzen und Git-Objektprüfung (`fsck --full --strict`).

### 1.3 Einmalige Nutzer-Einrichtung (teilweise abgeschlossen)

- [x] Privaten Google-Drive-Ordner `AyaPark2-Backups` vom Benutzer angelegt.
- [x] age-Schlüsselpaar lokal erzeugt und getrennte Schlüsselkopie laut Nutzer gesichert; keinen privaten Schlüssel teilen.
- [x] rclone/Drive eingerichtet; Ordnerzugriff sowie Upload, Download und lokale Entschlüsselung der Testdatei vom Nutzer erfolgreich bestätigt.
- [ ] Google-OAuth-Status für langfristige unbeaufsichtigte Nutzung prüfen.
- [x] Funktionsfähige Secrets für den separaten DB-Workflow in main durch erfolgreichen Lauf indirekt belegt; keine Geheimniswerte ausgelesen. Aktivierungsvariable des Komplettentwurfs #52 weiterhin nicht aus diesem Lauf ableitbar.

### 1.4 Restore-Prüfung und Freigabe (noch offen)

- [ ] Exportvollständigkeit der Anwendungsschemas, Rollen, Auth-Daten und RLS testen; Supabase-verwaltete Schemas nicht blind restaurieren.
- [x] Separater produktiver DB-Workflow: verschlüsselter Export nach Drive, Ciphertext zurückgelesen und SHA-256 verglichen (Lauf oben).
- [ ] Echten DB-Dump lokal entschlüsseln und kontrollieren; Testdatei-Entschlüsselung ersetzt diesen Nachweis nicht.
- [ ] Restore-Durchlauf in **isoliertem Testsystem**: Datenbank, Personen, Buchungen, Berechtigungen, Auth und Storage-Dateien validieren.
- [ ] Separaten Wiederherstellungsplan für externen Anbieter/selbst gehostetes Supabase festhalten.
- [ ] Geheimnisbehandlung, Drive-Speichergrenzen, monatliche Sicherungsstichproben und vierteljährliche Restore-Tests klären.
- [ ] Erst nach erfolgreich dokumentierten Prüfungen: **ausdrückliche Nutzerfreigabe** für Merge nach `main` und `AYAPARK_BACKUP_ENABLED=true`.
- [ ] Erst nach Freigabe und erfolgreich nachvollzogenem realen Sicherungslauf: Automatisierung als aktiv kennzeichnen.

## Phase 2 – Personen, Rollen, Berechtigungen (P1)

- [x] Repository-Ist/Soll-Abgleich aller drei Rollen und fünf delegierbaren Verwaltungsrechte; vorhandene Module und Überschneidungen geprüft. Siehe `PHASE-2-ROLES-AUDIT.md`; keine Live-Backend-Abnahme.
- [x] Teilaufgabe Entwicklungsstand: reverse/unallocate/void_charge/void_credit serverseitig und in der UI auf Superadmin begrenzt; 28 isolierte SQL- und 2 UI-Prüfungen bestanden. Produktiv veröffentlicht über #55.
- [ ] Übrige kritische Finanzfreigaben und fünf getrennte Aufgabenrechte vollständig umsetzen und integriert abnehmen.
- [x] Fünf getrennte Aufgabenrechte und Aidat-/Umlagenentwurf mit Superadmin-Endfreigabe umgesetzt und veröffentlicht (#56/#57); bestehende Altzuweisungen werden erst bei ausdrücklichem Speichern umgestellt.
- [x] 13 bestehende allgemeine Testfehler fachlich aufgelöst und veröffentlicht (#55); allgemeine Suite inzwischen 269/269 erfolgreich.
- [x] Registrierung/Einladungen, administrative Wiederherstellung, Kontaktfreigaben, Historie und RLS mit synthetischen Identitäten geprüft (84 aktuelle Rechte-/Einladungs-/Recovery-, 23 Kontakt- und 43 Historienprüfungen; kein echter Mail-/Auth-Browser-E2E).
- [x] Eigentümerwechsel, Mehrfachzuordnungen, Altlasten und Zutrittsentzug isoliert mit unveränderter Finanzhistorie getestet (43 aktuelle Historienprüfungen; kein Geräte-/Mail-E2E).
- [ ] Barrierefreie mobile Bedienung, DE/TR und eindeutige Freigabetexte prüfen.
- [ ] Durchgängige Phase-2-Gesamtabnahme vervollständigen. Grundsätzliche Live-Freigabe liegt vor; offene Geräte-/Mail-/Auth-E2E-Prüfungen nicht als bestanden behaupten.

## Phase 3 – Finanzkern und Bankimporte (P1)

- [x] Teilzahlungen, oldest-first-Zuordnung, Stornos und Schuldartgetrenntheit im aktuellen relevanten Migrationspaket isoliert geprüft (50 Finanzprüfungen).
- [x] Aidat-/Umlagen-Entwurf und Superadmin-Endfreigabe isoliert geprüft und produktiv (#56–#58); tatsächliche Buchung, Wiederholung und Ablehnung ohne Finanzwirkung getestet.
- [x] Unterstützte PDF-/CSV-/XLSX-Importpfade, Gebühren und Mehrfachimport-Dubletten isoliert und im nativen Browser geprüft; nicht unterstützte Formate bleiben gesperrt. Veröffentlicht #65; tatsächliche Live-Dateien geprüft.
- [ ] Abstimmung der Bankbewegungen, Salden und Zuordnung in drei getrennten Prüfschritten durchspielen.
- [x] Finanzkorrekturen mit Erhalt der Originale, Gegenbuchungen, Audit und Superadmin-Schutz isoliert im aktuellen Migrationspaket abgenommen (31 zusätzliche Finanz-/Zeitraumprüfungen, 50 V5-Finanzprüfungen, aktuelle Rechteprüfungen).

## Phase 4 – Berichte, Abschluss, Beschlüsse (P1)

- [x] Aggregierte öffentliche Berichte technisch von persönlichen Details getrennt; explizite Freigabe/Rücknahme je Zielgruppe, 29 SQL-/24 Browserprüfungen, veröffentlicht #70. Keine echten Summen freigegeben.
- [x] PDF-/Excel-Exporte, persönliche Zahlungsbelege und Monats-/Jahresabschluss-Regeln isoliert und im nativen Browser getestet, veröffentlicht #67/#69; kein echter Abschluss angelegt.
- [x] Sonderumlagenablauf mit externer geprüfter Beschlussreferenz, Verteilung, eigener Eigentümereinsicht und historischer Verantwortung umgesetzt, getestet und veröffentlicht #72. Tatsächliche juristische Beschlussprüfung bleibt extern/manuell; private Dateiablage ist Phase 6.
- [x] Audit-Trail für Summenfreigabe/Rücknahme, Finanzkorrektur und Sonderumlagen-Nachweis/Entscheidung isoliert verifiziert (29 Freigabe-, 31 Korrektur- und 55 Sonderumlagenprüfungen). Keine Prüfung oder Freigabe eines echten Beschlusses behauptet.

## Phase 5 – Budget, Rücklagen, Liquidität (P2)

- [x] Monats-/Jahresbudget, Reparaturplanung und getrennte konservative/angenommene 3-/6-Monats-Vorschau integriert, getestet und veröffentlicht #74.
- [x] Echte Bankliquidität zum aktuellen Ist-Stichtag von Forderungen und Einnahmeannahmen getrennt; Voröffnung/Future und echte Bankteilzuordnungen geprüft, veröffentlicht #74.
- [x] Technischer Superadmin-Freigabeablauf für Rücklagenverwendung mit externer Nachweisreferenz/Begründung und Audit geprüft/veröffentlicht #74; tatsächliche Beschlussgültigkeit bleibt extern/manuell, keine Zahlung ausgelöst.

## Phase 6 – Einfache Verwaltungswerkzeuge (P2)

- [x] Privates Dokumentenarchiv technisch veröffentlicht #78; Kategorien/Namenssuche/authentifizierter Originaldownload/Audits/RLS geprüft. Echte Storage-/Auth-Sitzungsabnahme separat offen, kein OCR.
- [x] Einfaches Sitzungs-/Beschlussarchiv technisch veröffentlicht #78; getrennte Originaldateirechte und externe Karar-Defteri-Prüfung. Keine automatische Rechtsgültigkeitsprüfung.
- [x] Aufgabenliste mit Zuständigkeit/Termin/Priorität/Status, Dienstleister-/geschützten Dokumentverweisen veröffentlicht #79.
- [x] Bewusste manuelle Folgeanlage und interne automatische Fälligkeit beim Laden veröffentlicht #79; keine automatische neue Aufgabe/externen Nachrichten.

## Wiederkehrendes Gate vor jedem produktiven Release

- [ ] Expliziter Geltungsbereich; schriftlich festhalten, welche bestehende Funktion verändert wird.
- [ ] Unabhängiges jüngstes Backup und Restore-Weg verifiziert.
- [ ] Tests in isolierter Umgebung erfolgreich; keine Live-Testbuchungen.
- [ ] RLS-/Auth-/Finanz-Regressionssuite bestanden; DE/TR und Mobilansichten geprüft.
- [ ] Migrations- und Rückfallplan dokumentiert; Datenerhalt nach Rollback gewährleistet.
- [x] Grundsätzliche Nutzerfreigabe für fortlaufende geprüfte Releases erteilt; keine wiederholte Bestätigung pro Release erforderlich.
- [ ] Rollout kontrolliert durchgeführt und tatsächliche Ergebnisse protokolliert.

## Nächster Schritt – Übergabe an nächsten Chat

**Aktuelle nächste Aufgabe: direkten PDF-/XLSX-Lesepfad vor die bestehende Importvorschau integrieren.** Die Quellenprüfung und die exakte CSV-Saldenprüfung sind umgesetzt; direkte Dateiformate bleiben offen. Mehrseiten-, Beschreibungs- und Spaltenadapter zunächst mit synthetischen Daten absichern. Details: `docs/PHASE-3-IMPORT-AUDIT.md`. Backup ausdrücklich übersprungen; nicht erneut einrichten oder auf einen Restore umschwenken. Aktuellen Hauptzweig und neueste Fortschrittsnotiz prüfen; ältere Zwischenstände darunter sind historische Nachweise.

**Projektkontext:** `docs/AYA-PARK-2-CONTEXT-HANDOFF.md`
**Backup-Anleitung:** `docs/FREE-BACKUP-SETUP.md`
**Draft PR:** https://github.com/kemcap/ayapark2/pull/52

## Prüfnachweis 29.10.2026 — Teilaufgabe Quellcode

- `python3 -B scripts/backup/test_source_backup.py`: 6 bestanden (Branches/Tags/Remote-Refs, isolierter Restore ohne Ursprungsrepo, flacher Checkout, ungesicherte Änderungen, LFS-/Submodule-Abbruch, Format-2-Vollständigkeit und Korruption).
- Tatsächlicher Repository-Spiegel: 62 Referenzen, 1.676.595 Byte Bundle; unabhängiger Clone und `git fsck --full --strict` bestanden. Erfasster `origin/main`: `5ba166cf2960f68cd52eac5b63a44f477fd41645`.
- `bash -n scripts/backup/backup.sh` und `git diff --check` bestanden.
- Nur Quellcode- und Archivintegrität geprüft; keine Behauptung eines erfolgreichen Datenbank-/Auth-/Storage-Restores. Workflow bleibt deaktiviert.

## Prüfnachweis 30.10.2026 – Übernahme und Restore-Vorbereitung

- [x] Alle drei Übergabedokumente vollständig gelesen; tatsächlichen main-/PR-/Branch-Stand verglichen. main: `2c55873506c1e132067876efae12cdc6e42fa358`; Pages-Lauf 40955767893 erfolgreich. PR #52 weiterhin Draft; vor diesem Abgleich 51 Commits hinter main / 10 voraus.
- [x] Aktiven DB-Workflow gelesen und Erfolg des Export-/Upload-Schritts in Job 123698719576 / Lauf 40945224444 direkt geprüft. Kein neuer Backup-Lauf gestartet.
- [x] Veraltete Übergabe-/Anleitungsangaben zum fehlenden Backupbetrieb eingeordnet. Nutzerbestätigte lokale Einrichtung nicht erneut angefordert.
- [x] [BACKUP-RESTORE-PREPARATION.md](BACKUP-RESTORE-PREPARATION.md) ergänzt: aktuelle .dump.age-Sicherung vom .tar.age-Entwurf unterschieden; lokale Entschlüsselung/Inhaltsprüfung und isolierte Restore-Kriterien vorbereitet.
- [ ] Tatsächliche lokale Entschlüsselung, kompatibles isoliertes Ziel und vollständiger DB-/Auth-/RLS-/Storage-/App-Restore bleiben offen. Kein Restore-Erfolg behauptet.

Nächster Schritt: Abschnitt 3 der neuen Anleitung lokal durchführen (OAuth-Status, echte Datei herunterladen, mit vorhandenem privaten Schlüssel lokal entschlüsseln und mit PostgreSQL 17 auflisten). Danach isolierten versionsgebundenen Importplan erstellen. Produktionsdaten, main, Secrets und Workflow-Aktivierung wurden bei diesem Abgleich nicht verändert.


## Fehlerbereinigung 30.10.2026

Die 13 fehlgeschlagenen allgemeinen Prüfungen wurden behoben. Ergebnis: **264/264 bestanden, 0 fehlgeschlagen**, keine Tests deaktiviert. Anwendungskorrekturen: persönliche historische Forderungen zusätzlich zur berechtigten Wohnungssicht erhalten; deutschen Sprachcode korrekt auswerten; Cacheversionen derselben Laufzeitmodule über App/Recovery konsistent verwenden. Testkorrekturen: Detaildialog-Funktion gezielt isolieren, neue Devir-API-Antwort im Mock berücksichtigen, zusätzliche CSS-Klasse akzeptieren, überholte persönliche Sichtannahmen an die beschlossene gemeinsame Wohnungssicht anpassen. Fremde Wohnungen und private Kontaktdaten bleiben in den Prüfungen ausgeschlossen. Kein Live-Deployment oder produktiver Datenbankzugriff.

## Nächster Entwicklungsstand 30.10.2026 – Aufgabenrechte und Forderungsentwürfe

Migrationskandidat `20261029214410_phase2_task_grants_charge_drafts.sql`: exakt fünf explizite Aufgabenrechte (people_manage, occupancy_invite, charges_prepare, bank_reconcile, announcements_publish), keine automatische Übernahme breiter alter Grants. Vergabe nur durch tatsächlichen Superadmin an vorhandene Verwaltung. Neue Tabellen mit RLS; Clients erhalten nur SELECT, Änderungen über geprüfte RPCs; EXECUTE für PUBLIC/anon gesperrt.

Unveränderliche Forderungsentwürfe: Einreichung ohne Finanzbuchung, Superadmin-Entscheidung mit anlagenbezogener Sperre und Zeilensperre, Ablehnung ohne Buchung, erfolgreiche Freigabe über vorhandenen V5-Finanzkern, Wiederholung ohne Doppelbuchung. Fehler bei Freigabe lassen den Entwurf unverändert offen. Audit bei Vergabe, Einreichung und Entscheidung.

Nachweis: `npm run test:tasks:sql` **45 bestanden**, einschließlich Einzelrechte-Isolation, fehlender Superadmin-Eskalation, verbotener Selbstfreigabe, RLS, realer synthetischer Buchung und Freigabe-Idempotenz. Kein Produktivzugriff.

**Nur Grundlage vorbereitet, nicht vollständig integriert:** Bestehende Legacy-Rechte und direkte Finanzwege sind noch unverändert. Der neue Freigabeablauf darf deshalb nicht als durchgängig erzwungen gelten. Oberfläche, Workspace-/Edge-Actor-Anbindung der fünf Rechte und Absicherung aller alten direkten Finalisierungswege bleiben der nächste zusammenhängende Arbeitsschritt. Nicht vor dieser Integration veröffentlichen. Keine produktive Migration oder Live-Veröffentlichung erfolgt.

## Produktivfreigabe und erster Rollout 30.10.2026

Der Nutzer hat die bisherige Pflicht zur Einzelfreigabe aufgehoben und direkte Veröffentlichung geprüfter abgeschlossener Änderungen sowie notwendige Schema-/Funktionsänderungen ausdrücklich autorisiert. Keine produktiven Datensätze zu Testzwecken verändern. Backup-Part weiterhin überspringen.

Finanzkorrektur-Migration produktiv erfolgreich ausgeführt. Live-Hashes danach: command a75bf42bd300f17caa5790d99fa38f67, command_v2 8ba594c7cd5c2f334b2f45ae6c66ef35. Funktionsdefinitionen entsprechen dem isoliert geprüften Kandidaten. PR #55 erfolgreich nach main gemergt: 8e9b3dff20500ef048532ddacd38f6457a75d680. Pages-Deployment 40962059631 gestartet. Vorher allgemeine Tests 264/264, Korrekturen 28, SQL-Audit 120 und V5 50 bestanden. Spätere Aufgabenrechte-/Entwurfsgrundlage ausdrücklich nicht mitveröffentlicht.

Nächster Auftrag bleibt vollständige Aufgabenrechte-/Entwurfsintegration; hierfür keine erneute pauschale Live-Erlaubnis einholen. Vor Veröffentlichung weiterhin isoliert prüfen und tatsächlich ausgelieferten Stand verifizieren.

Pages-Deployment 40962059631 **erfolgreich abgeschlossen**; zugehöriger CI-Lauf 40962030729 ebenfalls erfolgreich. Veröffentlichung des Frontends dadurch belegt; authentifizierter Endnutzerablauf ohne Testkontoeingriff nicht erneut durchgespielt.

## Forderungsentwurf-Integration 30.10.2026

Monats-/Sammelforderungen werden im verbundenen Frontend nun über ay3_submit_charge_draft eingereicht. Die DE/TR-Oberfläche erklärt, dass dabei noch keine Forderung entsteht. Freigabeliste zeigt Fälligkeit, Beschlussgrundlage, Gesamtbetrag, Wohnung und Schuldner; Freigabe/Ablehnung nur Superadmin, keine Vorschau-Schreibzugriffe. Die alten direkten Finalisierungswege sind serverseitig für delegierte Verwaltung gesperrt, einschließlich privater command-/command_v2-Aufrufe und V5-Sammel-/Monatsbuchungen. Bestehende Originale werden nicht umgeschrieben.

Nachweise: 266 allgemeine Tests bestanden; 49 isolierte SQL-Prüfungen des Entwurfs-/Buchungsablaufs bestanden. Live-Ausgangshashes aller drei zu ersetzenden Funktionen stimmen mit dem Kandidaten überein. Fünf Aufgabenrechte sind als explizite Grundlage enthalten; vollständige Vergabeoberfläche und Anbindung der übrigen vier Aufgabenrechte bleiben offen. Keine pauschale Phase-2-Abnahme.


Backend-Veröffentlichung 30.10.2026 bestätigt: Migration 20261030201427_explicit_period_closing_and_reopening aktiv. Rein lesende Prüfung: 0 echte Abschlussdatensätze, RLS aktiv, kein Client-INSERT und keine anonyme Finalisierung. Keine bestehenden Finanz-/Bewohner-/Authdatensätze geändert. 50 aktuelle Finanz-, 31 Finanzabnahme-, 16 Bankimport-, 84 Rechte-, 23 Kontakt- und 43 Historienprüfungen mit installierter neuer Abschlusssicherung erfolgreich; allgemeine Suite 299/299. Frontend-Rollout noch offen.

Integrationskorrektur 31.10.2026: Beim tatsächlichen API-Client fehlten die freigegebenen RPC-Namen für Historienzuordnung, Abschlüsse/Summenfreigaben, Sonderumlagen und Budget. Die bisherigen synthetischen UI-Tests umgingen diese Aufrufliste. Explizite Liste ergänzt (keine Wildcard, keine serverseitige Rechteänderung); neue Regression führt die von den Controllern verwendeten Aufrufe durch den wirklichen authentifizierten Client und prüft unbekannte Endpunkte/Sitzungswechsel. Früherer technischer Release-Nachweis dieser Module war hinsichtlich dieses Clientwegs unvollständig; keine echten Backend-/Finanzdaten dadurch geändert.
