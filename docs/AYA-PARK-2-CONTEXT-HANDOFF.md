# AyaPark 2 – Projektübergabe / Fortsetzungskontext

## Englisch als dritte Sprache – geprüft, Veröffentlichung läuft – 31.10.2026

Englisch ergänzt Deutsch/Türkisch, ohne bestehende Spracheinstellungen oder private Inhalte umzustellen. 1.279 zentrale Quelltexte vollständig abgedeckt, insgesamt 1.873 englische Texte/Fragmente. Anmeldung, Wiederherstellung, Dialoge, Berichte, PDF/Excel und Konto-Sprache berücksichtigt. Begriffe auf einfache, eindeutige Formulierungen geprüft; türkisches „Guthaben“ verständlich als „Alacak bakiyesi“ dargestellt. Daten und Finanzregeln unverändert.

399 JavaScript-, zehn isolierte SQL- und 100 synthetische Browserprüfungen erfolgreich. Backend-Migration `20261031170253` erweitert nur die erlaubte Einstellung um Englisch; vorhandene Einstellungen vor/nach Änderung identisch. Frontend noch nicht als live bestätigt. Details: [Sprachprüfung](ENGLISH-LANGUAGE-AUDIT.md).

Nächster Schritt: CI, autorisierte Veröffentlichung und bytegleiche Pages-Prüfung; anschließend reale Geräte-/PWA-/Sitzungs-/Mailabnahme fortführen, ohne produktive Testdaten zu verändern. Backup weiterhin übersprungen.


## Freigegebene Ausgabenkategorien korrigiert – 31.10.2026

Nach ausdrücklicher konkreter Nutzerfreigabe wurden die 49 zuvor einzeln mit dem Originalkontoauszug abgeglichenen Vidanjör-Ausgaben aus „Diğer“ nach „Vidanjör“ umkategorisiert. Ausschließlich diese festgelegten Datensätze und ausschließlich die Kategorie wurden geändert. Ausführung in einer atomaren Transaktion mit Mengen-/Summen-/Originalfeldprüfung und bestehendem Abschluss-Sperrtrigger; keine gesperrten Zeiträume betroffen.

Der vorherige Kategoriezuordnungstand und die Freigabe sind je Buchung im geschützten Anwendungs-Audit dokumentiert. Ausführungskontext ausdrücklich Management-Connector, Genehmiger bestehender Superadmin; keine simulierte Benutzersitzung oder Authänderung. Gesamtfingerprints bestätigen unveränderte Beträge, Daten, Originalbeschreibungen, sämtliche sonstigen Buchungsfelder, Forderungen, Zahlungszuordnungen und Kategorien aller unbeteiligten Buchungen. Nach Commit Jahres-Kategoriensummen erneut lesend geprüft.

Keine privaten Bankbeschreibungen, Kontaktdaten, Einzelbuchungskennungen oder Finanzexporte ins Repository übernehmen. Keine Code-/Schemaänderung oder neue App-Veröffentlichung für diese Datenkorrektur erforderlich. Weitere auffällige Wasser-/Verwaltungs-/Bankkostenposten bleiben unverändert und benötigen getrennte Prüfung sowie gegebenenfalls konkrete Freigabe. Keine pauschale Umkategorisierung aller „Sonstiges“-Buchungen. Backup weiterhin übersprungen.


## Veröffentlicht und live geprüft – 31.10.2026

Verwaltungs-Leseeinsicht und Bewohnerlayout aus PR #94 sind veröffentlicht: main `1b656615798e1fda0903aa9b2ce3986da85ce230`. Vollständige GitHub-CI `41210069004` erfolgreich, einschließlich der 27 neuen SQL-Leserechteprüfungen. Pages `41210205720` erfolgreich. Elf ausgelieferte Dateien (Index, API, App, Formulare, Einstellungen, V3-UI, Forderungsübersicht/-CSS, Kategorien-CSS, UI, V3-Formulare) mit dem geprüften Stand bytegleich bestätigt. Cachegraph einheitlich aktualisiert; die parallel ergänzten Dienstleister-Kategorien/Notizfunktionen erhalten.

364 allgemeine Tests, 27 neue SQL-, 84 bestehende Aufgabenrechte- und 279 native synthetische Layoutprüfungen bestanden. Backend `20261031141453` aktiv; vorhandene Verwaltungs-Leseoption standardmäßig aktiv, RLS unverändert eingeschaltet. Personen-/Finanzoriginale vor/nach Migration identisch. Frühere Vorbereitungs-/Frontend-offen-Hinweise dieses Pakets sind überholt. Kein realer Schreibtest an Bewohnern/Buchungen/Accounts.

Nächster realer Abnahmepunkt: die neue Verwaltungs-Leseansicht und Bewohnerkarten nach Neuladen im vorhandenen Zugang ansehen; anschließend Smartphone-/PWA-/dauerhafte Sitzung und sichere eigene Mailzustellung sowie fachlicher Originalbankabgleich. Technische Paketfertigstellung ist keine pauschale reale Gesamtfertigmeldung. Backup bleibt übersprungen. Nachweis: `qa/results/management-read-resident-release-20261031.json`.


## Verwaltungs-Leseeinsicht und Bewohneransicht – 31.10.2026

Auf Nutzerauftrag: unabhängige, standardmäßig aktive und vom Superadmin abwählbare Verwaltungs-Leseeinsicht für alle Wohnungen, zugeordnete Namen, Forderungen und zugehörige Zahlungszuordnungen. Fünf Bearbeitungsaufgaben bleiben getrennt; kein neuer Schreibzugriff. Keine zusätzliche Freigabe privater Kontakte, Notizen oder Bank-Verwendungszwecke. Neue/alte Verwaltungsmitgliedschaften standardmäßig aktiv; ausdrückliche Abwahl bleibt auch bei alten Aufgabenrechte-Aufrufen erhalten. Abwahl hebt separat vergebene Bearbeitungs-/Finanzrechte nicht auf. Bestehende personenbezogene RLS-/Mutationsregeln bleiben erhalten; schmale, serverseitig rollen- und standortgeprüfte Projektion.

Bewohner: bestehende anklickbare Wohnungskarte unter „Wohnungen“ ganz oben und auf der Übersicht direkt nach den offenen Forderungen; keine Personen-/Kontaktsuche oder Block-/Statusfilter dort. Keine doppelte einfache Wohnungsliste und kein redundanter Link „Forderungen und zugeordnete Personen ansehen“. Mobile Forderungsübersicht einspaltig in voller Inhaltsbreite. Bestehende autorisierte Personen-/Zahlungsdetails wiederverwendet; keine Erweiterung des Bewohner-Datenumfangs.

Nachweise: 364 allgemeine Tests, 27 neue isolierte Datenbankprüfungen, 84 bestehende Aufgabenrechteprüfungen, 279 native synthetische Browserprüfungen (DE/TR, Classic/Modern, 320/375 mit großer Schrift/430/768/1440). Browser ohne externe Requests/JS-Fehler; reale CSS-Kaskade und bestehender Karten-Detaildialog. Backendmigration 20261031141453 aktiv. Vor-/Nachher-Fingerprints sämtlicher vorhandenen Personen, Forderungen, Bankbewegungen und Zuordnungen identisch. Keine produktiven Testbuchungen, Konten oder Sessions erzeugt. Frontend-Auslieferung wird separat bestätigt. Details: MANAGEMENT-READ-RESIDENT-LAYOUT.md.

Zusätzliche reale Rückmeldung des Nutzers vor dieser Änderung: separater Bewohnerzugang mit korrekt begrenzten Wohnungen/Zahlungen, ohne Verwaltungstestdatei oder Bearbeitungsaktionen; Abmelden, Neuladen und Wiederanmelden unauffällig. Hochgeladener Bewohner-XLSX-Export geprüft: ausschließlich allgemeine Summen, keine persönlichen Schuldnerdetails. Separater Verwaltungszugang ohne Aufgabenrechte: Verwaltungstestdatei erfolgreich heruntergeladen, keine Verwaltungs-Bearbeitungsaktionen. Dies sind Nutzerbeobachtungen; kein Ersatz für technische Negativtests und noch keine Abnahme der jetzt erweiterten Leseoption. Mail-/physische Geräte-/PWA-/fachliche Finanzabnahme bleiben offen. Backup unverändert übersprungen.


## Reale Storage-Abnahme bestanden – 31.10.2026

Der Nutzer hat die Testübernahme ausdrücklich beauftragt und eine vorhandene reguläre Sitzung bereitgestellt. In der tatsächlichen Superadmin-Ansicht der Live-Anwendung (Cloud Chrome, keine Rollen-Vorschau) wurde die unverfängliche TXT-Prüfdatei erfolgreich hochgeladen und anschließend über „Aslı kontrol et ve indir“ authentifiziert heruntergeladen. Zielgruppe blieb „Yalnız yönetim“ (Nur Verwaltung), Kategorie „Genel“. App bestätigt „Hazır“ und „Asıl kontrol edildi ve tarayıcı indirmesine verildi.“.

Original und tatsächlicher Browserdownload sind außerhalb der App bytegenau verglichen: **136 Bytes**, SHA-256 **bd51446a634bccb1461f94a6436467d19c6b58758ddf5a7030b50c4b10b3f22a**. Nachweise: [Prüfprotokoll](../qa/results/private-archive-live-20261031.json), [Dialogbild](../qa/results/private-archive-live-20261031.jpg). Genau ein unverfänglicher Testeintrag samt Original verbleibt privat als Nachweis; keine physische Löschung oder Freigabe an Bewohner. Keine Bewohner-, Finanz- oder Authstammdaten für den Test verändert und keine künstlichen Konten erzeugt.

**Nächster offener Abnahmeschritt:** echte getrennte Verwaltungs-/Bewohnersitzungen und ihre tatsächlichen Zugriffsgrenzen. Eine Superadmin-Sitzung oder Rollen-Vorschau ersetzt diese Nachweise nicht. Danach Mailzustellung, tatsächliche Geräte/PWA und fachliche Bank-/Zuordnungsabnahme gemäß FINAL-ACCEPTANCE-OPEN.md. Keine Passwörter/Tokens im Chat; keine automatischen Auth-/Finanzmutationen oder Nachrichten an Dritte. Backup bleibt auf Nutzerwunsch übersprungen.

Der zuvor dokumentierte Blocker „keine angemeldete Sitzung / noch nicht hochgeladen“ ist erledigt. Darunterliegende ältere Abschnitte sind historische Arbeitsstände. Zwischenzeitliche andere main-Änderungen bleiben erhalten; dieser Abschluss ändert nur Dokumentation und Testnachweise, keinen Laufzeitcode.

## Verifizierter Live-Abschluss dieser technischen Fortsetzung – 31.10.2026

Auch #85 veröffentlicht: mainb638239a7146f7128982137d0946f1ad43ff8f66, CI41181057628/Pages41181382787 erfolgreich. App/Index/Archiv-/Aufgaben-/Prüfpausencontroller/CSS live in sechs Dateien bytegleich bestätigt.337 allgemeine Tests und110 neue Stil-/Layout-/axe-Prüfungen erfolgreich. Alle technischen Pakete #78–#85 dieser Fortsetzung sind veröffentlicht; keine pauschale reale Gesamtfertigmeldung.

Roadmap-Nächster-Schritt aktualisiert: realer authentifizierter Dateitransfer, danach echte Auth-/Mail-/Geräte- und fachliche Bankabnahme gemäß FINAL-ACCEPTANCE-OPEN.md. Live-Anwendung im verfügbaren Browser geöffnet und tatsächliche fehlende Benutzersitzung beobachtet; reguläre Anmeldeform mit Passwort oder E-Mail-Code vorhanden. Kein Passwort/Token ausgelesen, keine Zugangsdaten erfunden und kein produktives Testkonto erzeugt. Nächste Aktion benötigt eine sichere Benutzeranmeldung; Metadaten-/Mocktests sind kein Ersatz.

Unverfängliche optionale Storage-Prüfdatei konkret vorbereitet unter qa/fixtures/ayapark2-storage-funktionstest-20261031.txt (136 Bytes, SHA-256bd51446a634bccb1461f94a6436467d19c6b58758ddf5a7030b50c4b10b3f22a). Noch nicht hochgeladen. Ein echter Upload erzeugt einen auch nach Zugriffs-Rücknahme aufbewahrten Archiveintrag; keine automatische physische Löschung. Keine Bewohner-/Finanz-/Authinhalte. Für tatsächlichen Testupload konkrete Freigabe/Sitzung erforderlich. Backup unverändert übersprungen.

## Aktueller Übergabestand – 31.10.2026

Fortlaufende Nutzerfreigabe für geprüfte Code-Releases gilt. Alle technischen Schritte dieser Fortsetzung #78–#84 veröffentlicht: privates Archiv/Versammlungen und echte API-Anbindung, Aufgaben/Termine/manuelle Wiederholung, alte Einstiegspfade, Forderungshinweise7/21/interne Prüfung35, private Prüfpause, gezielte Clientprivileg-Härtung und Theme-/Großschriftfix. #84 main37d69403bb7fd33eb2bea6ef730547714c1c9101, CI41180568814/Pages41180701638 erfolgreich; ausgelieferte CSS/Indexdatei bytegleich.337 allgemeine Tests ohne Fehler; produktive Finanzoriginale nicht zu Testzwecken verändert. #83-Backendrechte aktiv, keine Client-DDL-Rechte; vier Audittrigger erhalten und RLS/DML-Rechte unverändert.

Letzter semantischer Dialogfix separat geprüft: eindeutige lokalisierte Bildschirmlesernamen,110 native Stil-/Layout-/axe-Prüfungen in24 Dialog-/Theme-/Breitenkombinationen; keine gemeldete Verletzung im untersuchten Dialogbereich. Keine Behauptung vollständiger realer Geräte-/Barrierefreiheitsabnahme. Dieser kleine Controller-Rollout wird separat bestätigt.

**Nächster echter Schritt benötigt eine reguläre vorhandene Benutzersitzung:** privater Storage-Upload und authentifizierter Originaldownload; danach reale Konten-/Mail-/Geräte- und fachliche Bank-/Zuordnungsabnahme. Vollständige genaue Anleitung: FINAL-ACCEPTANCE-OPEN.md. Keine Passwörter/Tokens teilen, keine künstlichen produktiven Authkonten/Buchungen und keine tatsächlichen Finanz-/Authänderungen ohne konkreten Fachauftrag. Backup auf Nutzerwunsch ausdrücklich nicht erneut bearbeiten. Darunterliegende alte „Nächster Schritt“-Abschnitte sind historische Nachweise und setzen diesen aktuellen Stand nicht außer Kraft.

## Technische Pakete veröffentlicht; echte Abnahme präzisiert – 31.10.2026

Archiv #78, Aufgaben #79, Alt-Einstiege #80, Forderungshinweise #81 und private Prüfpause #82 sind veröffentlicht und anhand ausgelieferter Quellen bestätigt. Prüfpause-Pages41179801684 erfolgreich; sieben Dateien bytegleich. Privileghärtung #83 nach CI41180113451 gemergt: maine87fc07bb6cdb2f63bbb185bf19495d6233b6143. Tatsächliche Migrationen20261031071623/20261031071802 aktiv: keine unnötigen Client-DDL-Rechte, vier Audittrigger erhalten; Lese-/DML-/RLS-Fingerprint unverändert.17 isolierte Prüfungen. Anonym ausführbar bleibt nur die beabsichtigte begrenzte Summen-RPC. Free-Vorgabe/Passwörter unverändert; verbleibende Advisor-Hinweise fachlich dokumentiert.

Abschließender Darstellungsfix separat vorbereitet: gemeinsame Archiv-/Aufgaben-/Prüfpausendialoge verwenden echte Themevariablen und skalierende Formlabels;86 native Stil-/Kontrast-/Geometrieprüfungen für Classic/Modern, Hell/Dunkel,375px große Schrift/1440px bestanden.337 allgemeine Tests ohne Fehler. Details SHARED-DIALOG-VISUAL-QA.md. Dieser CSS-Rollout noch separat bestätigen.

Konkrete verbleibende reale Nachweise und verständliche Anleitung: FINAL-ACCEPTANCE-OPEN.md. Erster echter Blocker ist authentifizierter Storage-Dateitransfer mit vorhandener Benutzersitzung; SQL-/Mocktests ersetzen ihn nicht. Danach reale getrennte Konten-/Mail-/Geräteabnahme und fachliche Bestätigung der drei Bank-/Zuordnungsebenen. Keine Testkonten/-buchungen produktiv erzeugen. Backup auf Nutzerwunsch nicht erneut bearbeitet; kein neuer Restore-/Bucket-Backupnachweis behauptet.

## Prüfpause übernommen; Advisor-Abgleich konkretisiert – 31.10.2026

PR #82 nach CI41179670915 gemergt: mainf993c20a2f94ca26c3c3d9f7e2327c33c91d15f1. Backend20261031071132 aktiv,0 echte Prüfpausen, RLS/geschützte Gründe/Clientgrenzen bestätigt. Vor-/Nachher-Fingerprints aller vorhandenen Forderungen/Bankzeilen/Zuordnungen identisch. 27 SQL-/38 native Dialog-/34 Startseiten- und337 allgemeine Tests bestanden. Pages/Live dieses Schritts separat bestätigen. #81-Auslieferung anhand fünf Dateien mit exakt gemergtem Stand bytegleich geprüft.

Nächster P0-Abgleich: fünf policyfreie Tabellen sind bewusst vollständig clientgesperrt. Leak-Passwortschutz laut aktueller offizieller Dokumentation nur Pro+, daher wegen Free-Vorgabe unverändert. Beabsichtigte öffentliche Summenprojektion nicht abschalten. Unnötiges Client-EXECUTE auf drei Audittriggern und DDL-Rechte auf zehn Anwendungstabellen gezielt zur Entfernung vorbereitet;14 isolierte Prüfungen erhalten Lese-/DML-/RLS-Matrix und tatsächliche Triggerfunktion. Keine produktive Testmutation. Details SECURITY-ADVISORS-20261031.md. Migration/CI noch offen. Reale Auth-/Mail-/Geräte-/Storageabnahme bleibt offen, Backup übersprungen.

## Hinweise veröffentlicht; private Prüfpause lokal abgenommen – 31.10.2026

Forderungshinweise #81 nach CI41179128934 gemergt: main86d95d9549b1ba19ec10115c56c94e322824a41e; Pages41179300237 erfolgreich. Acht Regel-/26 native Renderer-/334 allgemeine Tests. Read-time-Stufen7/21 für eigene Schuldner und35 ausschließlich intern, keine Nachrichten/Rechtsverfolgung. Alt-Einstiege #80 über Pages41179037572 veröffentlicht; vier Live-Dateien bytegleich geprüft. Keine alte Loginoberfläche mehr über diese vier aktuellen Adressen; historische Git-Versionen bleiben erhalten.

Weiterer beschlossener Funktionsrest jetzt im separaten Branch feature/private-claim-review-holds-20261031 vorbereitet: Superadmin-Prüfpause mit privater Begründung, Revision/Audit; keine Änderung an Forderungs-/Bankoriginalen. Aktive/unklare Prüfpause unterdrückt automatische Hinweise. 27 SQL-/38 native Dialog-/34 Startseitenprüfungen DE/TR375/1440px,337 allgemeine Tests bestanden. Details CLAIM-HOLD-AUDIT.md. Backend-/Frontendrollout noch separat offen; keine echte Prüfung angelegt. Reale Auth-/Mail-/Geräte-/Storageabnahme bleibt offen. Backup weiterhin übersprungen.

## Forderungshinweise ergänzt; Altpfade übernommen – 31.10.2026

PR #80 nach CI 41178847767 gemergt: main5996c4dd5d5def610ce1364d72d07a68841b7882. Alle vier alten Einstiege leiten jetzt zur aktuellen Anwendung; 18 native JS-/Fallback-Prüfungen bestanden. Tatsächliche Pages-Auslieferung noch separat bestätigen. Aufgaben #79 live anhand sechs Dateien bytegleich verifiziert; deren frühere Hinweise „Rollout offen“ sind überholt.

Nächster dokumentierter Funktionsrest im separaten Branch feature/friendly-claim-reminders-20261031 lokal geprüft: freundliche eigene Forderungshinweise ab7/21 Tagen und finanzberechtigte interne Prüfung ab35 Tagen. Bestehenden Startseitenbereich wiederverwendet, keine externen Nachrichten/automatische Rechtsverfolgung. Acht reine Regeln- und26 native DE/TR-Browserprüfungen, allgemeine Suite334 bestanden. Fremd-/Altschulden derselben Wohnung werden nicht als persönliche Erinnerung ausgegeben. Details CLAIM-REMINDER-AUDIT.md. Noch nicht veröffentlicht. Prüfpause-Oberfläche und verbleibende reale Gesamtabnahme separat abgleichen; Backup bleibt übersprungen.

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


**Aktuelle Arbeitsfreigabe:** Roadmap fortlaufend abarbeiten und erfolgreich geprüfte Änderungen direkt veröffentlichen; nicht nach jedem Teilschritt neue Zustimmung verlangen. Keine echten Bewohner-, Finanz- oder Auth-Datensätze zu Testzwecken ändern. Backup ausdrücklich übersprungen. Ältere Aufforderungen weiter unten zu Backup/erneuter Releasefreigabe dokumentieren frühere Zwischenstände und sind durch diesen Nutzerauftrag ersetzt.

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

## Maßgeblicher Abgleich 30.10.2026 – älteren Angaben vorziehen

GitHub am 30.10.2026 geprüft: main `2c55873506c1e132067876efae12cdc6e42fa358`, erfolgreiches Pages-Deployment 40955767893. Im Hauptzweig existiert bereits ein separater aktiver DB-Backup-Workflow (`ayapark2-database-backup.yml`, 03:17 Istanbul). Der Export-/Prüf-/Verschlüsselungs-/Upload-Schritt im Lauf 40945224444 ist erfolgreich. Sein Ergebnis ist **.dump.age**, kein Gesamtarchiv. Keine vollständige Laufhistorie oder erfolgreiche Wiederherstellung daraus ableiten.

PR #52 bleibt offen/Draft; Head vor diesem Dokumentationsabgleich `c1c08843169a225ee562b45c5cc92f34972a048b`, 10 Commits voraus / 51 hinter main. Sein **Gesamtbackup-Entwurf bleibt gesperrt**. Keine Aktivierungsvariable ausgelesen oder geändert. Eine neue Aktivierung ist nicht erfolgt.

Schlüsselanlage, getrennte Schlüsselkopie und rclone-Test sind laut neuerer Roadmap bereits nutzerbestätigt. Aussagen weiter unten zu „noch keine Secrets / kein Upload / keine Automation“ sind **historische Aussagen zum Entwurf**, keine Beschreibung des neueren Hauptzweigs.

**Nächste Aufgabe:** echten Dump lokal entschlüsseln und anschließend isolierten DB-/Auth-/RLS-/Storage-Restore durchführen. Sichere Vorbereitung und konkrete lokale Anleitung: [BACKUP-RESTORE-PREPARATION.md](BACKUP-RESTORE-PREPARATION.md). Weder Entschlüsselung noch vollständiger Restore sind bisher nachgewiesen. Aktiven DB-Workflow nicht doppelt einrichten.


Stand: **29.10.2026** · Status: **Phase 1 – Backupvorbereitung, NICHT produktiv aktiviert**.

> Diese Datei ist der dauerhafte Übergabepunkt für neue ChatGPT-Chats und Entwickler. Sie beschreibt **vereinbarte Anforderungen und nachgewiesene Stände**, nicht den Beweis, dass jede Funktion implementiert ist. Vor Änderungen den aktuellen GitHub-Stand und Supabase-Zustand erneut überprüfen. Keine persönlichen Kontodaten, Bankdetails, Passwörter, API-Keys oder Verschlüsselungsschlüssel in dieser Datei ergänzen.

## 1. Projekt und verbindliche Regeln

- Produkt: AyaPark 2, Site-Verwaltungsanwendung für zwei Blöcke A/B und insgesamt 20 Wohnungen in der Türkei.
- Live-Frontend: https://kemcap.github.io/ayapark2/
- GitHub: `kemcap/ayapark2`; Produktivbranch `main`.
- Supabase Free: Produktivprojektname `ayapark2`; Datenbank PostgreSQL. **Kein kostenpflichtiger Supabase-Plan gewünscht.**
- Login, Personenverwaltung, Finanzen, Dokumente, Datenschutz und mehrsprachige Oberfläche DE/TR.
- Rollen: Superadmin, eingeschränkt berechtigte Verwaltung, Bewohner. Eigentümer-/Mieter-/Vertreter-Zuordnungen sind **fachliche Beziehungen**, nicht automatisch erhöhte Systemrechte.
- Strikte Backend-Rechte/RLS und persönliche Schuldnerdaten-Isolierung, nicht nur Ausblenden im Frontend.
- **Vor kritischen Änderungen**: funktionsfähiges Backup + getestete Wiederherstellung, separater Entwicklungsbranch, reproduzierbare Tests, ausdrücklich genehmigter Livegang. Kein eigenmächtiges Verändern produktiver Finanz-/Bewohner-/Auth-Daten.
- Benutzerpräferenz: Jeden abgeschlossenen Schritt mit dem folgenden konkreten Schritt und ggf. detaillierter Benutzeranleitung verbinden. Kleine, fachlich saubere Schritte statt alles gleichzeitig. In deutscher Sprache kommunizieren.
- Backup-Mindestziel: Datenbank + Auth-/RLS-/Schema-Inhalte + Storage-Dateien + vollständiger App-Quellcode und Design + Git-Versionshistorie + Edge-Function-Quellcode + dokumentierte Plattformkonfiguration. Sichere unabhängige Wiederherstellung und Anbieterwechsel müssen möglich sein.

## 2. AyaPark-Akademie: 30 Entscheidungen (verbindliche Ziel-Spezifikation)

1. **Teilzahlungen:** älteste offene Forderung zuerst, falls kein zulässiger eindeutiger Zahlungszweck angegeben.
2. **Personen-/Bewohnerwechsel:** historische, zeitlich abgegrenzte Zuordnung und Erhalt alter Forderungen; keine neue Fremdschuld für Nachfolger.
3. **Eigentümer-/Mieterbelastung:** rechtlich sachgerechte Verantwortung je Kostenart, keine blinde Kategorieautomatik.
4. **Kostenverteilung:** rechtlich zutreffender Verteilungsschlüssel, ggf. Arsa Payı, mit nachvollziehbarer Beschlussgrundlage.
5. **Aidat:** monatliche Forderungsentwürfe, nur Superadmin finalisiert.
6. **Mahnung:** freundliche Hinweise an Tag 7 und 21; interne Prüfung ab Tag 35, keine automatische Rechtsverfolgung.
7. **Nachrichten:** App und ggf. E-Mail; WhatsApp manuell teilbar, keine kostenpflichtige SMS-/WhatsApp-API.
8. **Benachrichtigungen:** zentrale Regeln und zuständige Verwaltungsbefugnisse.
9. **Bewohnereinstellungen:** Sprache DE/TR selbst ändern; Änderungen an Identitäts-/Kontaktdaten werden geprüft.
10. **Kontaktdaten:** Anträge und Prüfung in zentraler Freigabeliste mit Audit-Trail.
11. **Kontozugang:** sichere Wiederherstellung nach Identitätsprüfung; bestehende Konto-ID möglichst behalten.
12. **Systemrollen:** Superadmin, Verwaltung, Bewohner; serverseitiges RLS und Rechteprüfung.
13. **Exakt fünf einzeln vergebbare Verwaltungsrechte:** (a) Wohnungen/Personen bearbeiten, (b) Bewohnerwechsel/Einladungen, (c) Aidat/Umlagen vorbereiten, (d) unklare Bankzuordnungen klären, (e) Ankündigungen veröffentlichen. Kritische Finanzen und Sicherheitsverwaltung bleiben beim Superadmin.
14. **Finanzkorrekturen:** Buchungsoriginal erhalten, nachvollziehbare Gegenbuchung, Freigabe durch Superadmin. Markierung/Prüfpause bei strittigen Fällen möglich.
15. **Bankimporte:** klare Treffer vorschlagen, unklare Fälle manuell zuordnen, keine Dubletten, Vorschau und Bestätigung.
16. **Importformate:** PDF/CSV/XLSX; historische Quellen abgleichen; Bankgebühren, Saldozeilen getrennt handhaben.
17. **Abstimmung:** Vollständigkeit der Bankbewegungen, Bank-/Buchsaldo, Forderungszuordnung als getrennte Kontrollstufen.
18. **Transparenz:** öffentliche aggregierte Finanzübersichten ohne persönliche Schuldnerdetails; persönliche Daten nur Berechtigten.
19. **Ausgaben/Exporte:** PDF und Excel nach Rolle; private persönliche Belege, administrative Berichte.
20. **Abschlüsse:** Monatsabschluss möglich bei abgestimmter Bank mit dokumentierten ungeklärten Zuordnungen; keine ungeklärte Bankdifferenz; Jahresabschluss strenger.
21. **Budget:** Monatsplan, Reparaturplanung, vorsichtige 3–6-Monats-Liquidität, nur echtes Geld als Bankbestand behandeln.
22. **Rücklagenziel:** nachvollziehbare Empfehlung/Planung, gesetzlich erforderliche Beschlüsse beachten.
23. **Rücklagenentnahme:** Superadmin-Freigabe, dokumentierte Notfälle, keine unbeaufsichtigte Zahlung.
24. **Sonderumlage B:** digital vorbereiten und Eigentümern zur Einsicht zeigen, erforderlicher rechtlicher Beschluss extern mit Nachweis, Superadmin schaltet endgültig frei; historische Eigentümer und Verteilung beachten.
25. **Versammlungen A:** einfach – Tagesordnung, Einladungsvorlagen, unterschriebene Beschlüsse und Protokolle archivieren; Anwesenheit, Vollmachten, Mehrheiten überwiegend manuell unter türkischem Recht/Karar Defteri.
26. **Aufträge A:** einfache Aufgabenliste mit Beschreibung, Verantwortlichem, Priorität, Datum, Status, optional Dienstleister und Dokumente. Keine komplexe Angebotsabwicklung. Finanzfreigaben bleiben unabhängig.
27. **Wartung A:** Aufgaben und Wiederholungen manuell anlegen; automatische Fälligkeitshinweise und Überfälligkeitsanzeige; keine automatische nächste Wartungsaufgabe.
28. **Dokumente A:** einfaches privates Dateiarchiv mit Kategorien, Namenssuche, Download; RLS und Audit; keine OCR/Volltextsuche/komplexe Verknüpfungen. Originalbelege/Karar Defteri rechtlich beachten.
29. **Backup B:** täglich Datenbank und Dateien separat automatisch, verschlüsselt außerhalb der Produktivsysteme, Zusatzauszug vor kritischen Updates, Monitoring, regelmäßiger Restore-Test; produktive Wiederherstellung ausschließlich nach Superadmin-Freigabe. **Supabase Free bleibt.**
30. **Umsetzungsreihenfolge:** P0 Sicherheit/Bestandsaufnahme, P0 Backups, P1 Rollen/Personen, P1 Finanzkern/Bankabstimmung, P1 Berichte/Abschlüsse/Umlagen, P2 Budget/Rücklagen, P2 einfache Verwaltung, wiederholte Test-/Release-Gates.

Das sind Anforderungen. Vor der Implementierung immer prüfen, welche Module bereits im aktuellen Code verfügbar sind, statt Funktionen doppelt zu bauen.

## 3. Technischer Ist-Stand (zuletzt schreibgeschützt am 28.10.2026 geprüft)

- `main` GitHub-Commit `a4a9d8c44b56d32c0aa0ac73aa6eb613ae19b89e` („Publish compact Palmiye original balance reference within category list v5.9.16“).
- Supabase Produktivprojekt `eisozwhhinqszfikemot`, Status ACTIVE_HEALTHY, PostgreSQL 17.11; weiteres aktives Projekt `ayapark-auth-staging` vorhanden.
- 2 Blöcke, 20 Wohnungen; 39 Tabellen in `public`, alle mit RLS aktiviert. 41 DB-Migrationen erfasst.
- Zum Prüfzeitpunkt: 1.734 Bankeinträge, 48 Forderungen, 12 Zahlungszuordnungen. Bloße Bestandszahlen, keine buchhalterische Validierung.
- **Supabase Storage: 0 Buckets / 0 Storage-Dateien.** Künftiges privates Dokumentenarchiv noch einzurichten.
- Bestehende UI-/Fachmodule u. a. `finance-forms.mjs`, `finance-v5.mjs`, `reconcile.mjs`, `v3-import.mjs`, `notifications.mjs`; CSV vorhanden, PDF/XLSX-Import nicht abschließend nachgewiesen.
- Aktuell `.github/workflows/invitation-checks.yml` für Tests, zuvor **kein täglicher Backup-Workflow** auf `main` gefunden.
- Supabase Advisors: auffällige `SECURITY DEFINER`-Execute-Rechte, deaktivierter Schutz vor geleakten Passwörtern, fehlende Policy für drei RLS-Tabellen (`ay3_invite_tokens`, `ay_access_requests`, `ayapark_admins`). Kein Beweis einer tatsächlichen Schwachstelle allein durch Advisor; bestehende Trigger-SIGNATURES und beabsichtigte Sperren berücksichtigen.
- Alte `/old/`-Seite wurde in älterem Audit als öffentlich mit Finanzbeträgen beschrieben; im aktuellen `main` ist `old/index.html` eine Redirect-Seite über `legacy-redirect.js`. LIVE-Deployment und historische öffentlich zugängliche Commit-Dateien gesondert prüfen.
- Keine laufende Backup-Automation oder vollständige getestete Produktivwiederherstellung nachgewiesen.

## 4. Aktueller aktiver Arbeitsschritt: KOSTENLOSE Backups vorbereiten

**Entwicklungsbranch:** `feature/free-backup-preparation-20261028`
**Draft-Pull-Request:** https://github.com/kemcap/ayapark2/pull/52
**Einrichtungsanleitung:** `docs/FREE-BACKUP-SETUP.md`

In diesem Branch vorbereitet (nicht ausgeführt):
- `.github/workflows/free-daily-backup.yml`: geplant 01:41 UTC = 04:41 Istanbul; Ausführung durch `vars.AYAPARK_BACKUP_ENABLED == 'true'` gesperrt (Variable bewusst nicht gesetzt). Zeitplanung erfolgt in GitHub nur aus `main`.
- `scripts/backup/backup.sh`: `pg_dump` im PostgreSQL-17-Container für `public`, `ay2_private`, `ay_auth_private`; zusätzlich `auth`-Daten und Storage-Metadaten. Mit age encrypt und rclone zum externen Speicher.
- `scripts/backup/export_storage.py`: getrennte Übertragung echter Storage-Dateien lesend.
- `scripts/backup/verify_snapshot.py`: Offline-Manifest-/Hashprüfung – **kein vollständiger Restore**.
- `docs/FREE-BACKUP-SETUP.md`: Ablauf, Geheimnisnamen, Risiken, Tests.

### Vom Benutzer bereits erledigt
- Privater Google-Drive-Ordner **AyaPark2-Backups** manuell angelegt.

### Noch NICHT erledigt
- age-Schlüsselpaar lokal erzeugen: Der **private** Schlüssel darf niemals in Chats/GitHub/Drive-Backups landen, nur öffentliche `age1...`-Empfänger-ID als GitHub-Variable.
- rclone Google-Drive-Zugang konfigurieren und testen; passende OAuth-App-Einstellung für unbeaufsichtigte Nutzung prüfen.
- GitHub Actions Secrets, rclone-Konfiguration und Variablen noch **nicht gesetzt**.
- Kein produktiver Dump, kein Backup, kein Joblauf, keine Änderung an Live-Daten, `main`, Supabase-Settings.
- Kompletter Export/Restore einschließlich verwalteter Auth-Objekte und Storage in isolierter Umgebung **noch ungetestet**.
- Prüfen, ob die derzeit vorbereiteten SQL-Dumps als vollständige Supabase-Recovery ausreichen; fehlende Konfigurationen, Edge-Function-Secrets und OAuth/SMTP gesondert absichern.

### NEUE USER-ANFORDERUNG: VOLLSTÄNDIGE PORTABILITÄT / GITHUB-UNABHÄNGIGKEIT
Der Benutzer hat ausdrücklich verlangt, dass das Backup nicht nur DB + Dateien, sondern **das ganze Projekt inklusive Design und GitHub-Code** enthält, um bei GitHub-Ausfall oder Umzug zu eigenem Hosting bzw. anderem DB-Anbieter unabhängig zu sein.
- **29.10. implementiert und isoliert geprüft:** `scripts/backup/export_source.py` sichert alle im vollständigen Checkout verfügbaren Referenzen und ihre erreichbare Historie als eigenständiges Git-Bundle, inklusive versioniertem Quellcode, Design, Assets und Edge Functions. 6 Offline-Tests bestanden; tatsächlicher Repo-Spiegel mit 62 Referenzen erfolgreich unabhängig wiederhergestellt. Keine lokalen unversionierten Dateien/Secrets werden kopiert. LFS/Submodule und flache Historien führen zum Abbruch statt unvollständiger Sicherung.
- Ergänzen: Dokumentiertes Infrastruktur-/Konfigurationsinventar (ohne Klartextsecrets), versionsgebundene DB-/Auth-/Edge-/Storage-Restore-Checkliste und echte isolierte Wiederherstellungsprobe.
- Beachten: Git-Bundle kann für sich keine GitHub-Account-/Actions-Secrets, Branch-Protection-Regeln oder externe Plattformkonfiguration sichern. Dafür gesonderte sichere Dokumentation und bei Bedarf Neuanlage.
- Für Anbieterwechsel: Self-hosted Supabase + PostgreSQL leichter als vollständiger Datenbank-/Auth-Wechsel. Shared Hosting kann ungeeignet sein. Anbieterwechsel und Wiederherstellung sind NICHT vollständig automatisch.
- **Nächste Teilaufgabe:** `age`, `age-keygen` und `rclone` auf dem Computer des Benutzers prüfen/einrichten; privaten age-Schlüssel ausschließlich dort erzeugen. `docs/BACKUP-RECOVERY-INVENTORY.md` enthält eine neue Checkliste; tatsächliche Auth-/SMTP-/OAuth-/Plattformwerte fehlen weiterhin. Verschlüsselter Gesamtlauf, Offsite-Übertragung und Datenbank-/Auth-/Storage-Restore bleiben ungeprüft. Workflow weiter gesperrt.

## 5. Sicherheit und Kommunikation

- Durchgängig deutsch und mit konkreten Schritten arbeiten; nachdem ein Schritt erledigt ist, sofort nächsten Schritt erklären, sofern Benutzer etwas tun muss.
- Keine behaupteten Erfolge ohne reale Tests.
- Nachvollziehbare Tests und Code-Review, PR als Entwurf behalten; keine Änderung produktiver Daten oder Live-App ohne ausdrückliche Freigabe.
- Keine Cloud-Secrets, Datenbankpasswörter, private age-Schlüssel oder vollständige OAuth-Tokens im Chat erfragen.
- Dauerhaftes Dokument nach jeder großen Entscheidung/Phase aktualisieren und Datum/Commit ergänzen, damit ein neuer Chat fortsetzen kann.
- In neuem Chat als Start: „Setze das AyaPark-2-Projekt anhand von `docs/AYA-PARK-2-CONTEXT-HANDOFF.md` auf Branch `feature/free-backup-preparation-20261028` fort. Lies die Datei sowie PR #52 und überprüfe den aktuellen Ist-Stand. Fahre mit der Ergänzung der vollständigen portablen Projektbackups fort; keine Liveänderungen ohne Freigabe.“

## 6. Relevante Links

- GitHub-Projekt: https://github.com/kemcap/ayapark2
- Live-App: https://kemcap.github.io/ayapark2/
- Backup-Entwurf PR: https://github.com/kemcap/ayapark2/pull/52
- Backup-Anleitung im Entwurfsbranch: https://github.com/kemcap/ayapark2/blob/feature/free-backup-preparation-20261028/docs/FREE-BACKUP-SETUP.md
- Supabase offizielle Migration zu Self-Hosting: https://supabase.com/docs/guides/self-hosting/restore-from-platform


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

Direkter Katalogabgleich ergänzt den vierten internen Audittrigger (site_unit_status_audit_trigger), der im begrenzten Advisor-Auszug zunächst nicht aufgeführt war. Alle vier direkten Client-Ausführungen entzogen. Isolierter Nachweis erweitert auf17 Prüfungen einschließlich echter synthetischer Wohnungsstatusänderung mit weiter ausgelöstem Audit. Tatsächliche Migrationen20261031071623 und20261031071802 installiert. Lese-/DML-/RLS-Fingerprint sämtlicher Anwendungstabellen vor/nach erster Härtung identisch, keine Client-DDL-Rechte mehr, vier Audittrigger bleiben angebunden. Anonym ausführbar bleibt nur die absichtlich begrenzte öffentliche Summenprojektion; keine pauschale Null-Advisor-Behauptung. Frontend-Prüfpause #82 über Pages41179801684 erfolgreich ausgeliefert; sieben Live-Dateien bytegleich bestätigt.
