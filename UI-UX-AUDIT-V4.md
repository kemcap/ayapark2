# Ayapark 2 – gemeinsamer UI/UX-, Performance- und Logikaudit für V4
Stand des ursprünglichen Audits: 25. Oktober 2026 (Europe/Istanbul). Die folgenden Entwicklungsbefunde sind historisch. Für die anschließend ausdrücklich freigegebene Produktionsfassung und die drei inzwischen behobenen SQL-Befunde siehe RELEASE-V4.md. D1/D2 bleiben größere offene Empfehlungen.

## Schutz des Ausgangsstands
- Produktion: V3.15, Commit `deef766bbc22f2aa7b7bb4d6bf8b2ffc64e74c4c`.
- Entwicklung: `ayapark-v4`, aufbauend auf dem separaten Datenbank-Audit `7051bf6b0a5e25127d21bf78012c1af894560bfd`. Dessen Frontend-Performance- und Sitzungswechselkorrekturen sind damit im gemeinsamen Auftrag enthalten.
- Lokaler Tag: `v3.15-before-v4`. Das Hochladen eines echten Tags war mit den verfügbaren GitHub-Schreibwegen nicht möglich. Als zusätzliche zentrale Sicherungsreferenz wurde der GitHub-Branch `baseline/v3.15-before-v4` am exakten Produktivcommit erstellt. Ein Branch ist kein unveränderlicher Tag.
- Kein Merge nach main, keine Änderung der bestehenden GitHub-Pages- oder GPT-Produktionsbindung. Keine produktiven Datenbankänderungen in diesem UI-Auftrag.
- Eine getrennte private V4-Vorschau verwendet ausschließlich Beispieldaten. API-Clients und Browser-CSP sperren Netzwerkzugriffe auf das Live-Backend; Recovery ist ebenfalls gesperrt. Es werden keine Konten erstellt und keine E-Mails versandt.

## A. Gesamtbewertung
Die Anwendung besitzt bereits eine solide fachliche Grundlage: rollenabhängige Navigation, 20 feste Wohnungen, direkte Personen-/Rollenverwaltung, getrennte Belegung, nachvollziehbare Finanzbeziehungen, ausklappbare Klärungshinweise, Light/Dark Mode und sechs Farbwelten.

Die Oberfläche ist in den geprüften Standardansichten bereits responsiv. Ein vollständiges optisches Neuschreiben ist aus diesem Befund nicht gerechtfertigt. Die wichtigsten Verbesserungen liegen in der Orientierung während einer Aufgabe, verständlichen Begriffen, konsistenten Fehlern und der Trennung häufig benötigter Aktionen von Einrichtung und Sonderfällen.

V4 ist noch kein fertiger und freigegebener Ersatz für V3.15. Größere Strukturentscheidungen und drei offene SQL-Befunde stehen ausdrücklich aus.

## B. Bestandsaufnahme und Prioritäten
| ID | Priorität / Häufigkeit | Befund | Behandlung |
|---|---|---|---|
| U1 | Hoch / täglich | Zugeordnete Personen wurden mit „Ins Archiv verschieben“ statt der gewünschten einfachen Aktion „Entfernen“ angeboten. Die technische Speicherweise dominierte die Aufgabe. | In V4 „Bearbeiten“ und „Entfernen“; kurzer rollenabhängiger Grund, klare Erklärung zum Erhalt von Person, anderen Rollen und Forderungen. |
| U2 | Hoch / bei Korrekturen | Fachliche Eingabefehler erschienen unter dem Formular ohne sichere Zuordnung zum betroffenen Feld. | Strukturierte Feldfehler für Personenauswahl, Namen, freiwillige Datumsangaben und Entfernungsgrund; Fokus, aria-invalid und beschriebener Fehler. Native Pflichtfeld-/E-Mail-Fehler ebenfalls direkt am Feld. Unbekannte Serverfehler bleiben als fokussierte Meldung sichtbar. |
| U3 | Hoch / täglich | Ein Aktionsdialog schloss die zuvor geöffnete Wohnung. Abbrechen führte zur Hintergrundseite zurück; nach einer Zahlungszuordnung musste die Wohnung erneut geöffnet werden. | Ursprung des Formulars wird gespeichert. Abbrechen/Escape und erfolgreiche Speicherung kehren zur passenden Wohnung bzw. Person zurück. Bei fehlgeschlagener Speicherung bleiben Eingaben erhalten. |
| U4 | Mittel / wiederkehrend | Importhilfe beschrieb drei Spalten, obwohl der aktuelle Download neun Spalten verwendet. Strukturfehler des neuen CSV-Parsers waren englische Techniktexte. | Anleitung an tatsächliche Vorlage angeglichen, Hilfe einklappbar, Einnahmen/Ausgaben erklärt, Fehler mit Zeilenbezug in DE/TR. Parserregeln und Legacy-Unterstützung bleiben unverändert. |
| U5 | Mittel / mobil häufig | Einzelne Header-/Formularbedienelemente lagen unter der angestrebten komfortablen Touchgröße; Fokusregeln waren für Textareas uneinheitlich. | 44-px-Ziel für zentrale Buttons, größere Labelklickflächen, sichtbarer Fokus für Textarea/Summary, mobile Eingaben mindestens 16 px. 44 px ist ein Komfortziel; WCAG 2.2 AA hat ein differenziertes 24-px-Kriterium mit Ausnahmen. |
| U6 | Mittel / mobil | Einheitliche Tabellenbeschriftung fehlte als wiederverwendbare Komponente; leere Tabellenzeilen konnten unpassende Spaltenlabels bekommen. | Idempotentes enhanceTables-Modul, Spaltenüberschriften mit scope, keine falsche Beschriftung zusammengefasster Leerzeilen. Bestehende mobile Karten-/Zeilendarstellungen bleiben erhalten. |
| U7 | Mittel / Gestaltung | Viele gewachsene CSS-Überschreibungen und feste Abstände erschweren Wartung. | Kleine gemeinsame V4-Tokens für Abstände, Touchgrößen, Radien und Dialogschatten. Vorhandene Theme-/Statusfarben bleiben maßgeblich. Vollständiger CSS-Neuaufbau als größere Änderung vorgeschlagen, nicht vorgetäuscht. |
| U8 | Mittel / Dashboard | Detailreiche Wohnungsliste und zahlreiche Kontextinformationen konkurrieren mit den nächsten Aufgaben. | Vorschlag D2, noch nicht umgesetzt. Bestehende Wohnungskacheln und finanzielle Hinweise bleiben erhalten. |
| U9 | Mittel / Navigation | Desktop-Einträge sind überwiegend flach; mobil steckt Kommunikation mit Einstellungen in „Weitere Bereiche“. | Vorschlag D1, noch nicht umgesetzt. Bestehende aktive Menüpunkte und rollenabhängige Ziele bleiben erhalten. |
| U10 | Hoch / Freigabe | Datenbank-Audit hat drei rote Finanz-/Autorisierungstests. | Freigabeblocker, siehe Datenbank-Abhängigkeiten. Keine UI-Beschriftung verdeckt diese Fehler. |
| U11 | Mittel / Aktivierung | Einrichtung eines Benutzerzugangs sendet laut bestehendem Ablauf nicht automatisch eine Aktivierungs-E-Mail. SMTP-Zustand ist nicht durch diesen UI-Test geklärt. | Bestehender Hinweis erhalten. Kein Versand simuliert oder als erfolgreich behauptet; kontrollierter Integrationstest bleibt nötig. |

### Bereits umgesetzt – kein neuer Assistent nötig
- Person hinzufügen: vorhandene Person suchen oder neue Person mit Vor-/Nachname und freiwilligen Kontaktdaten anlegen; Rolle wählen; speichern.
- Mehrere Eigentümer, Mieter, Vertreter, Rollen und Wohnungen je Person.
- Rollen direkt bearbeiten, zusätzlich vergeben, entfernen und wiederherstellen.
- Anfang/Ende sind freiwillige Informationen; aktive Zuordnungen und Belegung sind unabhängig.
- Normale offene Forderungen sind nicht automatisch Klärungsfälle.
- Schuldart wird aus tatsächlich offenen Forderungen ermittelt; mehrere Arten werden zusammengefasst.
- „Saldo prüfen“ ist bereits vorhanden. Nicht erneut umbenannt.
- Klärungsdetails sind einklappbar, Karteninformationen kompakt. Finanzielle Korrekturen werden nicht durch bloßes Abhaken vorgetäuscht.

## C. Umgesetzte Verbesserungen
Geänderte Frontend-Komponenten: ui-feedback.mjs, ui-accessibility.mjs, v4-ui.css sowie bestehende Formular-, Personen-, Import- und Anwendungsmodule.

- Einheitliche Fehlerdarstellung mit Fokus und Screenreader-Zuordnung, ohne Formularwerte zu löschen.
- Verständliche Entfernen-Aktion mit unveränderter Archiv-/Audit-Semantik.
- Rückkehr zum Aufgabenursprung bei Abbrechen/Escape und nach erfolgreicher Speicherung, einschließlich Teilzahlungen.
- Klarere CSV-Hilfe passend zur realen Downloadvorlage; keine versteckte Änderung von Importregeln.
- Konsistente Touchgrößen, Formulare, Fokuszustände und themengerechte Dialog-/Toast-Flächen.
- Kleine zentrale Designtokens; alle sechs bestehenden Farbwelten, Light/Dark und hoher Kontrast bleiben erhalten.
- Browser-Vorschau gegen produktive Netzwerkzugriffe abgesichert und sichtbar als Beispieldaten markiert.
- Vorherige Audit-Optimierungen für wiederholte Zahlungsvorschläge, Stornos, Guthaben, Bankfilter und Sitzungswechsel integriert. Deren alte Messwerte werden nicht als neue V4-Verbesserung ausgegeben.

## D. Vorher/Nachher – realistische Aufgaben
| Aufgabe | Vorher | V4-Stand / Nachweis |
|---|---|---|
| Mieter in geöffneter A-7 hinzufügen | Bereits einfacher Ablauf; keine Eigentümerhistorie nötig. | Ablauf bewusst gleich kurz belassen. Im Browser neue Beispielperson ohne Datum/Kontakt angelegt; Rolle Mieter, Hinweis auf fehlenden Eigentümer blockiert nicht. |
| Vorhandene Person wählen | Suche und Auswahl bereits vorhanden. | Im Browser bestehende Beispielperson zusätzlich A-1 zugeordnet. |
| Mieter zu Eigentümer ändern | Direktes Rollenfeld bereits vorhanden. | Im Browser direkt geändert; kein Wechselassistent, keine Belegungsentscheidung. |
| Falschen Vertreter A-1 entfernen | Drei Aktionen: Archivieren, Grund wählen, bestätigen. | Gleiche drei Aktionen mit verständlichem „Entfernen“; Vertreter „versehentlich hinzugefügt“ im Browser entfernt. Historie und zentrale Person bleiben erhalten. Kein erfundener Rückgang der Klickzahl behauptet. |
| Eigentümerbearbeitung abbrechen | Wohnung musste erneut geöffnet werden. | Einmal Abbrechen führt direkt zur zuvor geöffneten A-4 zurück, Fokus auf Überschrift. Im Browser geprüft. |
| Teilzahlung zuordnen | Nach Speicherung Rückkehr zur Hintergrundübersicht. | Im Browser 1.000 TL auf 3.600-TL-Beispielforderung zugeordnet; A-4 bleibt geöffnet und zeigt 2.600 TL sowie „Teilweise bezahlt“. |
| Fehlender Nachname | Browsermeldung bzw. allgemeine Fehlerrückmeldung. | Name bleibt erhalten; Nachname erhält Fehlertext, aria-invalid und Fokus. Im Browser geprüft. |
| Demirbaş B-6 identifizieren | Kategorieanzeige bereits vorhanden. | Separater synthetischer B-6-Test: 7.500 TL mit Demirbaş, normale bekannte Schuld erzeugt keinen Klärungsfehler. Keine Behauptung über den heutigen produktiven B-6-Saldo. |
| Person finden / Block wechseln | Suchfeld und A/B-Schaltflächen vorhanden. | Automatisierte Such-/Zuordnungs-/Blocktests bleiben grün. Grundstruktur nicht ohne Freigabe geändert. |
| Erstes Adminpasswort | Kontoanlage und Codebestätigung existieren; Versand hängt von Auth/SMTP ab. | Vorhandene Mock-Tests für Codeprüfung, Passwortabgleich und Loginabschluss bestehen. Echten Versand oder Live-Aktivierung nicht getestet. |
| Wichtige Mitteilung finden | Priorität, Zeitfenster und prominente Darstellung vorhanden. | Bestehende Ankündigungs-/Prioritäts-/Zeitfenstertests bestehen; Formular und Seite zusätzlich responsiv geprüft. |

Es wurden keine echten Bewohner angelegt, Rollen verändert, Forderungen gebucht oder Zahlungen zugeordnet. Sämtliche interaktiven Änderungen erfolgten in flüchtigen Beispieldaten der abgesicherten Vorschau.

## E. Mobile Qualität und Accessibility
- 840 Layoutkombinationen: sieben Breiten (320/375/390/430/768/1024/1440), DE/TR, hell/dunkel, Superadmin/Verwaltung/Bewohner und jeweils verfügbare Hauptbereiche plus wichtige Dialoge.
- Ausgangsstand: kein horizontaler Seitenüberlauf. V4 nach Korrektur: ebenfalls kein horizontaler Seitenüberlauf. Ein durch die größeren Bedienelemente neu aufgetretener deutscher Forderungs-Header-Überlauf bei 320 px wurde vor Abschluss behoben.
- Weitere 196 Formularansichten: Zahlungszuordnung, Ankündigung, Zugang, Person, Monatsbeitrag, Rechte und Import; keine Seitenüberläufe.
- 144 zusätzliche Varianten mit großer Schrift: alle sechs Farbwelten, normale/hohe Kontraste, hell/dunkel, 320 und 1440 px, Wohnungsliste/Personenzuordnung/Erscheinungsbild; keine Seitenüberläufe.
- 80 axe-core-Prüfungen in der V4-Matrix mit Regeln aus WCAG 2 A/AA, 2.1 AA und 2.2 AA: keine bestätigten automatischen Verstöße. Die automatische Kontrastprüfung meldete teilweise „manuell prüfen“; daraus wird kein vollständiges WCAG-Zertifikat abgeleitet.
- Rechnerische Prüfung zentraler Text-/Flächenpaare für alle sechs Farbwelten in beiden Modi, zusätzlich vorhandene Hochkontrasttests. Druckregeln und Kurz-Hexfarben werden im Test korrekt behandelt.
- Tatsächliche Fokusbewegung zum Fehlerfeld und zurück zur Wohnungsüberschrift im Browser geprüft.

Grenzen: Desktop-Chromium mit verkleinerten iframe-Viewports ist kein physisches iPhone-/Android-Gerät. Bildschirmtastatur, VoiceOver/TalkBack, reale Einhandbedienung und vollständige Zoom-/Screenreader-Abnahme bleiben offen. Die Matrix prüft echte Komponenten und CSS, nicht jede Permutation realer Datenlängen. Inhalten aus gespeicherten Bankbeschreibungen oder Personennamen wird keine automatische Übersetzung aufgezwungen.

## F. Größere Empfehlungen – vor Umsetzung freizugeben
### D1 – Navigation ordnen, bestehende Ziele erhalten
Desktop: Übersicht; Gruppe Wohnen (Wohnungen, Personen); Gruppe Finanzen (Forderungen, Zahlungen, Berichte); Kommunikation & Service (Ankündigungen, Telefonbuch); Einstellungen am unteren Ende. Keine neue Fachfunktion und kein Umbenennen von Datenbankrollen.

Mobil: vier Hauptziele Übersicht, Wohnen, Finanzen, Mehr; darin höchstens eine Unterebene. Bewohner erhalten nur ihre passenden Ziele. Begründung: häufige Aufgaben bleiben direkt, Administration tritt optisch zurück. Die endgültigen Bezeichnungen sind in beiden Sprachen gemeinsam abzustimmen.

### D2 – Dashboard nach Handlungsbedarf priorisieren
Drei ruhige Kennzahlen oben; danach konkrete nächste Aufgaben mit Direktaktionen, wichtige Mitteilungen und die 20 Wohnungen weiterhin direkt erreichbar darunter. Aktuelle Forderungen, historische Schuldner und tatsächliche Klärung getrennt halten. Keine normalen Schulden als Datenfehler markieren. Begründung: zuerst sehen, wo eine Handlung nötig ist.

### D3 – Backend-Abhängigkeiten kontrolliert lösen
1. Finance-Autorisierung vor fachlichen Prüfungen; Fremdkonten dürfen keine finanzspezifischen Validierungsdetails erhalten.
2. Exakten wiederholten Zuordnungsrequest nach erfolgreicher Autorisierung vor der heutigen Guthaben-/Verfügbarkeitsprüfung wiedererkennen. Geänderten Payload weiterhin ablehnen; bei entzogenen Rechten auch Retries sperren.
3. Fachliche Berichtskonvention festlegen. Empfehlung: neue veröffentlichte Berichte wie die laufende Übersicht berechnen, also vollständig stornierte Paare aus Einnahmen/Ausgaben herausnehmen; bestehende veröffentlichte Berichte nicht still überschreiben.

Diese Änderungen benötigen isolierte Migrations-/Regressionstests und deine Freigabe. Die dazugehörigen aktuellen roten Tests wurden nicht deaktiviert oder als bestanden ausgegeben.

Weitere spätere Maßnahmen: Workspace gezielt aufteilen und Bankdaten serverseitig paginieren, dabei vollständige Salden/Matching erhalten; vollständiges CSS konsolidieren; Aktivierung mit einem kontrollierten Testkonto testen; vollständige regelmäßige Supabase-/Auth-/Storage-Backups mit Wiederherstellungsprobe einrichten. Kein Tarifwechsel und kein Regionsumzug vorgenommen.

## G. Testergebnisse und Freigabestatus
- Node: **140/140 bestanden**.
- Isoliertes PGlite/PostgreSQL: **110/113 bestanden**, drei bekannte bestehende Fehler bleiben rot (Retry nach Guthaben, Bericht-Bruttosummen, Fehlerkanal vor Finance-Autorisierung). Testumgebung hat keine produktive Verbindung und keine echten Konten.
- UI: 840 Standardansichten + 196 zusätzliche Formularansichten + 144 Theme-/Schriftvarianten in Chromium geprüft; keine Seitenüberläufe in diesen Fällen.
- Automatische Accessibility-Prüfung: 80 V4-Fälle, keine bestätigten Verstöße; Kontrast-Nachprüfung und Grenzen oben beachten.
- Manuelle Browseraufgaben: A-7 Neuanlage ohne Daten, direkter Rollenwechsel, A-1 Vertreter hinzufügen/entfernen, Pflichtfeldfehler mit Datenerhalt, Eigentümerformular abbrechen und Teilzahlung mit aktualisiertem Wohnungsdialog.
- Vorhandene DB-Sicherung und isolierter public-Daten-Restore sind im übernommenen AUDIT-20261025.md dokumentiert. Vollständiger Supabase-Projekt-Restore einschließlich Auth/Storage bleibt unbewiesen; dieser UI-Auftrag hat keinen Produktiv-Restore durchgeführt.
- Produktive Anmeldung, Mailzustellung, native Mobilgeräte und reale Schreibkonkurrenz wurden nicht als erfolgreich getestet behauptet.

**Status: Entwicklungsvorschau und Draft-PR. Kein Merge, keine Produktionsfreigabe.** Vor der nächsten größeren Umsetzung D1–D3 freigeben; vor Livegang außerdem alle Finanz-/Rechtetests grün, passende Testumgebung und Backup-/Rollback-Nachweise herstellen.

## Reproduktion
`npm ci --ignore-scripts`, `npm test`, `npm run test:sql`. SQL beendet derzeit bewusst mit Fehlerstatus für die drei bekannten Befunde.
`npm run qa:prepare` erzeugt einen getrennten UI-Testordner mit synthetischen Daten und fest gepinntem axe-core. Im Browser zuerst Standardmatrix, dann zusätzliche Formulare und Theme-/Schriftvarianten starten. QA-Matrix ist Komponententest; interaktive Abläufe separat in der aktuellen Vorschau durchführen.

Quellen zur Bewertung: https://www.w3.org/TR/WCAG22/ und https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ . Details zum bestehenden DB-Audit: AUDIT-20261025.md und tests/README.md.

