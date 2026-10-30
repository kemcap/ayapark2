# AyaPark 2 – Research-First: vertiefte Bestands-, Wettbewerbs-, Rechts- und UX-Recherche

**Datum:** 30.10.2026 · **Status:** Erste strukturierte Primärquellen- und Desk-Research-Runde abgeschlossen. **Nicht** als vollständige empirische Tiefenrecherche, Live-Abnahme, Rechtsgutachten oder finale Roadmap ausgeben.
**Gilt für:** 20 Wohnungen in 2 Blöcken; Superadmin, Verwaltung und Bewohner; DE/TR; Supabase Free; Web-App/PWA; bestehende Produktivdaten.

## 0. Warum diese Forschung vorgeschaltet wird

Die 30 Lektionen dokumentieren **Anforderungen und Nutzerentscheidungen**. Die internen Dateien `AUDIT-20261026.md`, `UI-UX-AUDIT-V4.md`, `MODERN-DESIGN.md` dokumentieren überwiegend **AyaParks eigenen Code und die eigene Oberfläche**. `docs/UI-UX-COMPETITOR-BENCHMARK.md` enthält die anfängliche Herstellerrecherche. Keine dieser Quellen ersetzt systematische Untersuchung tatsächlicher fremder Benutzeroberflächen oder reale AyaPark-Usability-Tests.

Vor weiteren **P1/P2-Neuentwicklungen und Redesigns** müssen wir Annahmen anhand Quellen, echten Rollenabläufen und vorhandener Funktionalität überprüfen. **P0-Sicherheit, vorhandener Backupbetrieb und isolierter Restore-Test dürfen dadurch nicht ausgesetzt werden.**

## 1. Evidenzklassen

- **A – Primärrecht/amtliche Aufsicht:** offizielle KVKK-Bekanntmachungen, Gesetzestext; rechtliche Schlussfolgerungen für AyaPark als Interpretation markieren und ggf. juristisch prüfen.
- **B – Hersteller- / Plattformdokumentation:** Apsiyon, Yönetimcell, AidatPro, Yönetion und Supabase. Belegt nur, was Anbieter behaupten bzw. dokumentieren, **nicht** unabhängige Usability, tatsächliche Funktion oder Sicherheit.
- **C – anerkanntes Usability-/Barrierefreiheitsframework:** W3C/WAI, Nielsen Norman Group. Bewertungsmaßstab, keine Prüfung unserer konkreten App.
- **D – AyaPark-Code/alte Audits:** beobachteter damaliger Ist-Stand, Tests und Vorschläge; nach neueren Deployments erneut prüfen.
- **E – Hypothese:** eigene Design-/Architektur-Empfehlung. Erst nach Nachweis/Freigabe in die Umsetzung übernehmen.

Jede spätere Aufgabe erhält: Quelle + Datum, Ist/Soll, betroffene Rolle, Risiko, Entscheidung, Akzeptanzkriterium, Testnachweis, Freigabestatus.

## 2. Marktvergleich: Was die Hersteller belegen, was nicht

| Anbieter | Aus offiziellen Seiten belegbare Produktbeschreibung | Mögliche AyaPark-Lernfrage (Hypothese, keine UI-Prüfung) | Noch nicht geprüft |
|---|---|---|---|
| **Apsiyon** | Mobile Verwaltungsübersicht; Finanzen, Personen, Bankbewegungen, Aufgabenkontrolle, Kommunikation | Arbeitsorientiertes Superadmin-Dashboard und eindeutige Beleg-/Zahlungsstatus | Screens, Klickwege, reale Fehlerquote, Berechtigungsschutz |
| **Yönetimcell** | Getrennte aktuelle/frühere Eigentümer und Mieter, Mehrfachobjekte; bank-/Excel-basierte Verarbeitung; Bewohneransichten; Exporte | Personenhistorie und Altlasten vom aktuellen Bewohner klar trennen; Mehrfachzuordnungen ohne Datendopplung | Rolle-/Geräte-Tests, tatsächliche Datenbank- und UI-Sicherheit |
| **AidatPro** | Forderungs-/Zahlungs-/Ausgabenübersicht, offene Salden, Berichte, Mitteilungen und Anfragen | Eigene Verpflichtungen und Verwaltungsvorgänge visuell trennen; wenige sinnvolle Dashboard-Kennzahlen | echte UI-Zeitmessung, unabhängige Accessibility |
| **Yönetion** | Monatliche Aidat, Excel-Banklisten und vorgeschlagene Zuordnung mit menschlicher Bestätigung, getrennte Bewohner-/Admin-Ansichten | Bankimport als prüfen→zuordnen→bestätigen, niemals unerkannte Fehlbuchung still übernehmen | Algorithmussicherheit, verifizierte Buchungskorrekturen, rechtlich gültige digitale Beschlüsse |

**Nicht übernehmen ohne Bedarf:** Kartenzahlung/Payment-Gateway, bezahlte SMS, vollautomatische Verzugszinsen, Personalwirtschaft, Paket-/Besucher-/Reservierungsverwaltung, elektronische rechtlich verbindliche Beschlussfassung und komplexe ERP-Kontenrahmen. Für 20 Wohnungen sind diese Funktionen zunächst kein ausreichender Nutzenbeleg.

**Herstellerseiten / Recherchegrundlage:**
- https://www.apsiyon.com/sss (Mobile Management)
- https://yonetimcell.com/site-apartman-yonetim-program-ozellikleri.html
- https://aidatpro.com.tr/ozellikler/aidat-ve-tahsilat-takibi
- https://yonetion.com/ozellikler/

Die Anbieterseiten liefern Funktionsumfang, aber **noch keine umfassenden Screenshots oder unabhängigen Usability-Messungen**.

## 3. Rechtliche Anforderungen mit Priorität vor Design

### 3.1 Datenschutz beim Anzeigen von Schuldnerdaten – A (amtliche Quelle, 2026)

Die türkische Datenschutzbehörde erläutert mit Grundsatzbeschluss **2026/348 vom 18.02.2026**, dass personenbezogene Schuldnerlisten nicht durch Aushang in allgemein zugänglichen Bereichen offengelegt werden dürfen. Sie verweist dagegen auf zielgerichtete, nicht für unbefugte Dritte zugängliche Kommunikationswege, wobei Datensparsamkeit und berechtigter Empfängerkreis maßgeblich bleiben.

**Konsequenz für AyaPark (zu testen, nicht automatisch Rechtsprechung ersetzen):**
- Öffentliche Start-/Berichtsseite: nur wirklich nicht-personenbeziehbare aggregierte Finanzinformationen.
- Bewohner: eigene Daten und nachweislich berechtigter Einblick; keine zufällige Offenlegung über Wohnungscodes, Suche, PDF-Links, Export und alte URLs.
- Eigentümer-/Kontrollrechte: gegebenenfalls rechtlich gebotene Informationen über andere Posten **gezielt** an berechtigten Empfängerkreis; **nicht** pauschal 'alle Schuldnerdaten für alle verboten'.
- Jede Ansicht und jeder Export mit Datenminimierung, authentifiziertem Zugriff, RLS, Audit und Rollen-/Negativtests. Keine Veröffentlichung mit nur kosmetisch versteckten Daten.

**Primärquelle:** https://www.kvkk.gov.tr/Icerik/8719/toplu-yapilarda-apartman-site-sakinlerine-ait-borc-bilgilerinin-ortak-yerlere-asilmasi-hakkinda-kamuoyu-duyurusu

### 3.2 Eigentümer, Mieter, Kostenverteilung – A/B (Gesetzestext)

Kat Mülkiyeti Kanunu Nr. 634, Art. 20 nennt unterschiedliche Aufteilungssysteme abhängig von Kostenart bzw. anderer rechtmäßiger Vereinbarung, Art. 22 behandelt die Haftung von Personen, die eine Wohnung dauerhaft nutzen, und Grenzen der Mieterhaftung. Eine bloße App-Voreinstellung 'immer Mieter' oder 'immer Eigentümer' ist daher für die rechtsverbindliche Schuldnerstellung ungeeignet. Vor Massenverteilung sind **Yönetim Planı**, wirksame Beschlüsse und konkrete Schuldart zu prüfen.

**Konsequenz (Interpretation, bei Bedarf lokale Rechtsberatung):** pro Umlage Kategorie/Rechtsgrundlage, Verteilungsschlüssel, tatsächlich verpflichtete Person, Auswirkung bei Eigentümer-/Mieterwechsel, Vorschau und Superadmin-Freigabe getrennt abbilden. Eine gegenüber der Verwaltung haftende Person und interne Kostentragung zwischen Eigentümer/Mieter müssen fachlich unterscheidbar bleiben.

**Gesetzestext:** https://mevzuat.mturkoglu.av.tr/belge/634/madde/20 und https://mevzuat.mturkoglu.av.tr/belge/634/kat-mulkiyeti-kanunu (Art. 22). Für endgültige Auslegung amtliche konsolidierte Fassung/Rechtsberatung ergänzen.

### 3.3 Externe verschlüsselte Backups und grenzüberschreitende Verarbeitung – A

KVKK Art. 9 sieht Regelungen und Garantien für Auslandsübermittlungen personenbezogener Daten vor. **Verschlüsselung allein ist nicht automatisch eine rechtliche Freigabe**, auf ausländische Clouds zu übertragen. Verantwortlicher, Dienstleister, Rechtsgrundlage, Zugriff und Standardvertragsverfahren müssen getrennt geprüft werden.

**Konsequenz:** vor langfristigem Offsite-Backup dokumentieren, wer Datenverantwortlicher ist, Standort/Empfänger/Vertrag des Speicherdienstes, Schlüsselkontrolle, rechtliche Grundlage und Schutzmaßnahmen. Diese Prüfung unterbricht nicht die bereits bestehende Sicherung; Ziel ist ein rechtlich und technisch belastbares Verfahren.

**Amtliche Quellen:** https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim und https://www.kvkk.gov.tr/Icerik/8143/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi

### 3.4 Beschlüsse, Versammlungen und Rechtswirkung – noch offen

Digitales Archiv für unterschriebene Entscheidungen ist nicht gleich rechtlich wirksamer Online-Beschluss. Aktuellen Yönetim Planı, Karar Defteri, KMK-Mehrheiten und Dokumentationsregeln **gesondert** prüfen; keine elektronischen Abstimmungen als rechtlich bindend behaupten, solange dies nicht feststeht.

## 4. Technische Tragfähigkeit und Anbieter-Unabhängigkeit – B/D

- Supabase Free bietet **keine von Supabase verwaltete tägliche DB-Sicherung**, sondern empfiehlt eigene Exporte; ein AyaPark-eigener aktiver DB-Workflow wurde inzwischen **laut Roadmap vom 29.10.** bereits in `main` nachgewiesen. **Nicht nochmals denselben Job installieren.**
- Supabase DB-Dumps enthalten nicht die eigentlichen Storage-Dateibytes. `auth.users` und RLS reichen nicht ohne Auth-Provider-/JWT-/SMTP-/Edge-/Storage-Konfiguration, um eine neue Instanz sofort lauffähig zu machen.
- Vollständige Portabilität: verschlüsselter Datenbankexport, Dateiobjekte, Git-Bundle mit HTML/CSS/JS/Assets/Git-Historie, Migrationsskripte, Edge Functions, **separat sicheres** Konfigurations-/Secrets-Inventar, echte isolierte Wiederherstellung.
- Migration von Supabase zu eigenem Server ist machbar, aber **nicht bloß Kopieren der Frontend-Dateien**. Ein anderer Datenbankanbieter als PostgreSQL erfordert ggf. eine Migration/Neuentwicklung des Berechtigungs-, Auth- und SQL-Verhaltens.
- Sichere Reihenfolge: eingehender Scope-/Versionsvergleich mit aktuellem `main`, eigene Backups prüfen, isolierter Restore, nur danach riskante DB-/Auth-Änderungen.

**Primärdokumentation:**
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/self-hosting/restore-from-platform

## 5. UX-Standards und echte Tests – C/D

Nielsen Norman Group: sichtbarer Status, Fehlerprävention, Wiedererkennen statt Erinnern, verständliche Fehler, einfache Kernabläufe, progressive Offenlegung. W3C WCAG 2.2 AA: Tastatur-/Fokus-/Kontrast-/Zoom-/Pointer-/Formulartests. **24×24 CSS-Pixel** bei Target Size (Minimum) AA mit Ausnahmen; AyaParks **44px-Komfortziel** ist eine zusätzliche Produktentscheidung, keine pauschale WCAG-AA-Pflicht. Automatische Tools ersetzen keine menschliche/technische Abnahme.

**Quellen:**
- https://www.nngroup.com/articles/ten-usability-heuristics/
- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/test-evaluate/

### Testaufgaben mit Akzeptanzkriterien (Plan/Hypothesen)
1. **Bewohner:** eigene offene Forderung, Fälligkeit und bereits verbuchte Zahlung ohne Fremddaten und ohne unberechtigte Aktion finden.
2. **Verwaltung:** aktuelle/frühere Eigentümer/Mieter, Mehrfachwohnung und den korrekten Schuldner nachvollziehen.
3. **Superadmin:** Bankdatei laden, Vorschau prüfen, Dublette erkennen, geteilte/unklare Zahlungen zurückstellen; keine fehlerhafte Auto-Finalisierung.
4. **Superadmin:** Aidat-Entwurf, Verteilungsbasis, Schuldart, gesetzlichen Beschlussbezug und endgültige Freigabe trennen.
5. **Bewohner mit großer Schrift / Screenreader:** Menü, Login/Erstaktivierung, Daire und Mitteilung ohne horizontales Abschneiden, Screenreaderverlust oder Fokusfalle bedienen.
6. **DE/TR:** Sprachwechsel erhält Formularzustand und vermittelt keine missverständlichen Rechts-/Finanzbegriffe.

**Noch zu erheben:** echte Bildschirm-/Klickpfade, Zeit bis zum korrekten Ergebnis, Fehlerraten, sieben Viewports, Android/iOS, Dark/Light/System, große Schrift, Tastatur/VoiceOver/TalkBack, neue und erfahrene Benutzer. Keine erfundenen Benchmarks.

## 6. Vorläufige neue Priorisierung – ausschließlich Forschungsvorschlag

| Rang | Teilbereich | Warum vorziehen | Freigabe-/Nachweisbedarf |
|---|---|---|---|
| P0 | Bestehende Backups tatsächlich wiederherstellen; öffentliche/leakende Altansichten und RLS/Exports prüfen | Datenverlust und unbefugter Zugriff | Restore-Test, Negativtests, externe Quelle |
| P0 | Rechtliche Schuldner-/Verteilungsmatrix, Informationsrechte/Datenschutz | Falschadressierung und Offenlegung haben unmittelbare Folgen | Gesetz, Yönetim Planı, Karar Defteri, fachliche Freigabe |
| P1 | Rollenspezifische Arbeitsabläufe samt Bankabstimmung, Entwürfen, transparenten Status | tägliche Fehlbedienung minimieren | Vorher/Nachher synthetische Nutzertests |
| P1 | Auth, Sprache, Mobilnavigation und WCAG 2.2 AA | Zugang für Bewohner, Nutzbarkeit | echte Geräte, Screenreader, Regression |
| P2 | Kosten/Forecast/Rücklagen und einfache Verwaltung | sinnvoll, nachdem der Datenkern zuverlässig ist | fachliches Modell, Testfälle |
| P2 | Rein visuelle Designverfeinerung und Animationen | nicht vor Sicherheit und Navigierbarkeit | Designsystem, Dark/Light, Performance |

**Entscheidungsregel:** Bestehende 30 Entscheidungen weder stillschweigend löschen noch ungeprüft umsetzen. Widersprüche/Verbesserungen als `Change Proposal` mit Begründung und Auswirkung an den Nutzer geben. Erst nach Zustimmung die verbindliche Roadmap-Version ändern.

## 7. Fehlende echte Tiefenrecherche – explizites Arbeitsprogramm

- [ ] Aktuelles produktives AyaPark-Frontend und `main` inventarisieren: Module/Seiten, Rolle, Datenzugriff, Ist-Flows; neuere Änderungen gegen historische Audits abgleichen.
- [ ] Pro Konkurrenzanbieter authentisch zugängliche Demo/Videos/Screens untersuchen; keine unzulässige Anmeldung; Vergleichsmatrix *gleicher sechs Aufgaben*.
- [ ] Recht: aktuelle amtliche KMK-Fassung, der Anlage zugrunde liegender Yönetim Planı und Karar Defteri, bindende Beschluss-/Kostenregeln; bei Abweichung Fachjuristencheck.
- [ ] Datenschutz/Datenflüsse: Empfängerkreise, Aufbewahrung, Veröffentlichung, CSV/PDF, Archiv-URLs, Google-Drive-Offsite/Datentransfer und Controller-Rolle.
- [ ] Finanzen: Bank-PDF/CSV, Forderungen, Umlagen, Altschulden, Gebühren, Quartals-/Jahresabschluss in synthetischen Fällen gegen echte Buchungsregeln abgleichen. Realdaten nur autorisiert und geschützt.
- [ ] 5–7 reale oder synthetisch angeleitete Nutzerabläufe über drei Rollen beobachten; nicht nur heuristisch beurteilen.
- [ ] Technologie: Free-Quoten, CI, Git-Backup/Restore, Supabase Auth, RLS, Storage, Hosting-Migrationspfad; kostenfrei vs. kostenpflichtig klar markieren.
- [ ] Gewichtete Entscheidungsmatrix: **Sicherheit/Rechtskonformität (30%)**, **Korrekte Finanzen (25%)**, **Nutzerfreundlichkeit/Barrierefreiheit (25%)**, **Wartbarkeit/Portabilität (15%)**, **Kosten (5%)** – Gewichtung ist Vorschlag zur Diskussion, kein validierter Fakt.
- [ ] Jede Roadmap-Aufgabe als **behalten / ändern / streichen / neu / aufschieben** klassifizieren.
- [ ] Roadmap V2 als Review-Diff mit Abhängigkeiten, Tests, nachprüfbaren Erfolgskriterien und klarer Freigabe vorlegen.

## 8. Gegenwärtiger Abschluss

**Erledigt:** Erste quellengebundene Desk-Research-Runde mit 4 Anbietern, offiziellen Datenschutz-/Transferquellen, KMK-Kostenregeln, Supabase-Betriebs-/Restore-Dokumentation und UX-Standards.

**Nicht erledigt:** Live-/Demo-Browserforschung, Nutzerbeobachtungen, vollständige juristische Prüfung, komplette Kosten-/Architekturentscheidung, endgültige Roadmap-V2 und produktive Implementierung. Diese Punkte offen lassen und zuerst abarbeiten.

**Nächster konkreter Research-Schritt:** Für AyaPark und jeden Vergleichsanbieter dieselben sechs Kernaufgaben nachvollziehbar dokumentieren (Screens, Eingaben, Rechte, Bestätigung, Fehlerbehandlung, mobile Bedienung); dann geltende Rechtsregeln auf die konkreten Umlage-/Datenschutzabläufe anwenden und Roadmap-Änderungsentwurf erstellen.
