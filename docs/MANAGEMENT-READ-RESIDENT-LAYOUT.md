# Verwaltungs-Leseeinsicht und Bewohnerlayout

## Veröffentlicht und live geprüft – 31.10.2026

Verwaltungs-Leseeinsicht und Bewohnerlayout aus PR #94 sind veröffentlicht: main `1b656615798e1fda0903aa9b2ce3986da85ce230`. Vollständige GitHub-CI `41210069004` erfolgreich, einschließlich der 27 neuen SQL-Leserechteprüfungen. Pages `41210205720` erfolgreich. Elf ausgelieferte Dateien (Index, API, App, Formulare, Einstellungen, V3-UI, Forderungsübersicht/-CSS, Kategorien-CSS, UI, V3-Formulare) mit dem geprüften Stand bytegleich bestätigt. Cachegraph einheitlich aktualisiert; die parallel ergänzten Dienstleister-Kategorien/Notizfunktionen erhalten.

364 allgemeine Tests, 27 neue SQL-, 84 bestehende Aufgabenrechte- und 279 native synthetische Layoutprüfungen bestanden. Backend `20261031141453` aktiv; vorhandene Verwaltungs-Leseoption standardmäßig aktiv, RLS unverändert eingeschaltet. Personen-/Finanzoriginale vor/nach Migration identisch. Frühere Vorbereitungs-/Frontend-offen-Hinweise dieses Pakets sind überholt. Kein realer Schreibtest an Bewohnern/Buchungen/Accounts.

Nächster realer Abnahmepunkt: die neue Verwaltungs-Leseansicht und Bewohnerkarten nach Neuladen im vorhandenen Zugang ansehen; anschließend Smartphone-/PWA-/dauerhafte Sitzung und sichere eigene Mailzustellung sowie fachlicher Originalbankabgleich. Technische Paketfertigstellung ist keine pauschale reale Gesamtfertigmeldung. Backup bleibt übersprungen. Nachweis: `qa/results/management-read-resident-release-20261031.json`.


## Verwaltungs-Leseeinsicht und Bewohneransicht – 31.10.2026

Auf Nutzerauftrag: unabhängige, standardmäßig aktive und vom Superadmin abwählbare Verwaltungs-Leseeinsicht für alle Wohnungen, zugeordnete Namen, Forderungen und zugehörige Zahlungszuordnungen. Fünf Bearbeitungsaufgaben bleiben getrennt; kein neuer Schreibzugriff. Keine zusätzliche Freigabe privater Kontakte, Notizen oder Bank-Verwendungszwecke. Neue/alte Verwaltungsmitgliedschaften standardmäßig aktiv; ausdrückliche Abwahl bleibt auch bei alten Aufgabenrechte-Aufrufen erhalten. Abwahl hebt separat vergebene Bearbeitungs-/Finanzrechte nicht auf. Bestehende personenbezogene RLS-/Mutationsregeln bleiben erhalten; schmale, serverseitig rollen- und standortgeprüfte Projektion.

Bewohner: bestehende anklickbare Wohnungskarte unter „Wohnungen“ ganz oben und auf der Übersicht direkt nach den offenen Forderungen; keine Personen-/Kontaktsuche oder Block-/Statusfilter dort. Keine doppelte einfache Wohnungsliste und kein redundanter Link „Forderungen und zugeordnete Personen ansehen“. Mobile Forderungsübersicht einspaltig in voller Inhaltsbreite. Bestehende autorisierte Personen-/Zahlungsdetails wiederverwendet; keine Erweiterung des Bewohner-Datenumfangs.

Nachweise: 364 allgemeine Tests, 27 neue isolierte Datenbankprüfungen, 84 bestehende Aufgabenrechteprüfungen, 279 native synthetische Browserprüfungen (DE/TR, Classic/Modern, 320/375 mit großer Schrift/430/768/1440). Browser ohne externe Requests/JS-Fehler; reale CSS-Kaskade und bestehender Karten-Detaildialog. Backendmigration 20261031141453 aktiv. Vor-/Nachher-Fingerprints sämtlicher vorhandenen Personen, Forderungen, Bankbewegungen und Zuordnungen identisch. Keine produktiven Testbuchungen, Konten oder Sessions erzeugt. Frontend-Auslieferung wird separat bestätigt. Details: MANAGEMENT-READ-RESIDENT-LAYOUT.md.

Zusätzliche reale Rückmeldung des Nutzers vor dieser Änderung: separater Bewohnerzugang mit korrekt begrenzten Wohnungen/Zahlungen, ohne Verwaltungstestdatei oder Bearbeitungsaktionen; Abmelden, Neuladen und Wiederanmelden unauffällig. Hochgeladener Bewohner-XLSX-Export geprüft: ausschließlich allgemeine Summen, keine persönlichen Schuldnerdetails. Separater Verwaltungszugang ohne Aufgabenrechte: Verwaltungstestdatei erfolgreich heruntergeladen, keine Verwaltungs-Bearbeitungsaktionen. Dies sind Nutzerbeobachtungen; kein Ersatz für technische Negativtests und noch keine Abnahme der jetzt erweiterten Leseoption. Mail-/physische Geräte-/PWA-/fachliche Finanzabnahme bleiben offen. Backup unverändert übersprungen.

## Bedienung

Superadmin → Einstellungen → Verwaltungsrechte → beim Mitglied Bearbeiten: „Alle Wohnungen, zugeordnete Namen und Forderungen einsehen“. Standardmäßig angehakt. Ausschließlich diese Option steuert die zusätzliche Leseprojektion; alle fünf bisherigen Aufgaben bleiben unabhängig. Speichern erfolgt atomar mit Aufgabenrechten und Audit. Andere Finanz-/Personenrechte können weiterhin eigene erforderliche Einsichten gewähren. Keine falsche Zusage, dass Abwahl bestehende Finanz-/Bearbeitungsrechte entzieht. Für vollständig lesenden Zugriff keine Bearbeitungsaufgaben wählen.

## Sicherheitsgrenzen

Nur aktive site_staff_memberships der vorhandenen Rollen manager/deputy/auditor; keine JWT-user_metadata-Auswertung oder Browser-Rollenbehauptung. Kein Konto anlegen/umstufen für technische Tests. Standard-On gilt auch ohne konvertierte Aufgabenrechtezeile. Verwaltungs-Schreib-API nur Superadmin, Ziel muss bestehendes Verwaltungsmitglied sein. Kein anonymer EXECUTE auf den neuen Funktionen. Direkte Tabellen-RLS-/DML-Rechte unverändert; kein Zugriff auf auth.users oder neue Storagefreigabe. Die private, bewachte Projektion enthält nur Namen und Zuordnungen, Forderungsfelder sowie zugeordnete Beträge und Bankdatum. Keine Telefonnummern/E-Mails/Personennotizen/Bank-IBAN/Original-Verwendungszwecke oder Auditakteure. Bestehende weitergehende Aufgabenrechte bleiben wie bisher.

Die Berechtigung wird bei jedem Workspace-Aufruf neu geprüft. Bereits angezeigte/heruntergeladene Informationen können durch Abwahl nicht aus fremden Kopien entfernt werden. Bei Reload wird der Serverumfang übernommen; kein langlebiger Clientcache für diese Daten.

## Nachweise und Betrieb

SQL: supabase/management-read-access.sql, identisch mit tatsächlicher Migration 20261031141453. Test: npm run test:management-read:sql. Browser: qa/resident-management-layout-browser.mjs mit PLAYWRIGHT_MODULE, BROWSER_HELPER_MODULE und CHROME_PATH; Protokoll qa/results/resident-management-layout-browser.json. Mobiles Bild enthält ausschließlich synthetische Daten.

Advisor-Abgleich: bestehende Sammelgruppen bleiben; neue drei authentifiziert ausführbare SECURITY-DEFINER-Funktionen haben ausdrückliche Rollen-/Site-/Adminprüfungen. Keine zusätzliche anonym ausführbare Funktion. Kein Tarifwechsel; keine pauschale Aussage, alle bisherigen Advisor-Hinweise seien behoben.

Rückfall: vorherigen Frontendstand ausliefern; neue Spalte und bewachte Funktionen erhalten. Keine destruktive Rückmigration/Originaldatenlöschung. Abwahl durch Superadmin jederzeit möglich.
