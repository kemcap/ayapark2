# Phase 6 – Privates Dokumenten- und Versammlungsarchiv

## Reale Storage-Abnahme bestanden – 31.10.2026

Der Nutzer hat die Testübernahme ausdrücklich beauftragt und eine vorhandene reguläre Sitzung bereitgestellt. In der tatsächlichen Superadmin-Ansicht der Live-Anwendung (Cloud Chrome, keine Rollen-Vorschau) wurde die unverfängliche TXT-Prüfdatei erfolgreich hochgeladen und anschließend über „Aslı kontrol et ve indir“ authentifiziert heruntergeladen. Zielgruppe blieb „Yalnız yönetim“ (Nur Verwaltung), Kategorie „Genel“. App bestätigt „Hazır“ und „Asıl kontrol edildi ve tarayıcı indirmesine verildi.“.

Original und tatsächlicher Browserdownload sind außerhalb der App bytegenau verglichen: **136 Bytes**, SHA-256 **bd51446a634bccb1461f94a6436467d19c6b58758ddf5a7030b50c4b10b3f22a**. Nachweise: [Prüfprotokoll](../qa/results/private-archive-live-20261031.json), [Dialogbild](../qa/results/private-archive-live-20261031.jpg). Genau ein unverfänglicher Testeintrag samt Original verbleibt privat als Nachweis; keine physische Löschung oder Freigabe an Bewohner. Keine Bewohner-, Finanz- oder Authstammdaten für den Test verändert und keine künstlichen Konten erzeugt.

**Nächster offener Abnahmeschritt:** echte getrennte Verwaltungs-/Bewohnersitzungen und ihre tatsächlichen Zugriffsgrenzen. Eine Superadmin-Sitzung oder Rollen-Vorschau ersetzt diese Nachweise nicht. Danach Mailzustellung, tatsächliche Geräte/PWA und fachliche Bank-/Zuordnungsabnahme gemäß FINAL-ACCEPTANCE-OPEN.md. Keine Passwörter/Tokens im Chat; keine automatischen Auth-/Finanzmutationen oder Nachrichten an Dritte. Backup bleibt auf Nutzerwunsch übersprungen.

Der zuvor dokumentierte Blocker „keine angemeldete Sitzung / noch nicht hochgeladen“ ist erledigt. Darunterliegende ältere Abschnitte sind historische Arbeitsstände. Zwischenzeitliche andere main-Änderungen bleiben erhalten; dieser Abschluss ändert nur Dokumentation und Testnachweise, keinen Laufzeitcode.


Stand 31.10.2026: implementiert, isoliert getestet; Backend-/Frontend-Veröffentlichung separat nachweisen. Keine produktiven Originaldateien, Bewohner, Konten oder Buchungen für Tests angelegt/verändert.

## Bestand und Umfang

Vor Umsetzung produktiv rein lesend geprüft: keine Storage-Buckets/Objektpolicies und keine Archivtabellen. Vorhandene Site-/Personen-/Eigentümerbeziehungen, fünf Aufgabenrechte, Superadmin, RLS, Audit und privater idempotenter Anfragenhelfer werden weiterverwendet. Keine zusätzliche delegierte Aufgabe und keine Änderung am Finanzkern.

Private Ablage `ayapark2-documents`, maximal 10 MiB je Original, PDF/JPEG/PNG/WEBP/TXT/DOCX/XLSX. Kein OCR, keine Virensuche, keine automatische Rechts-/Unterschriftsprüfung. DOCX/XLSX werden nur auf Dateityp/ZIP-Signatur geprüft, nicht vollständig als Office-Datei analysiert. Kategorien, wörtliche Namenssuche und letzte 100 zugängliche Einträge; Kategorien/Suche grenzen ein. Dateinamen bleiben unverändert, interne Pfade enthalten nur Site-/Dokument-UUID und feste Originalbezeichnung.

Bank-/Rechnungsbelege zwingend finanzberechtigt. Andere Originale standardmäßig Verwaltung; ausdrückliche vollständige Dateifreigabe an aktuelle Eigentümer oder aktuelle Eigentümer/Mieter möglich. Kein automatisches Freigeben wegen eines Versammlungslinks. Externe Beschlussreferenzen bleiben Superadmin-privat. Tatsächliche aktuelle Beziehungen werden bei jedem Lesezugriff geprüft; Rollen-Vorschau/Demo greifen nicht auf produktive Ablage zu.

## Originale und Zugriff

Metadaten vorbereiten → Originaldatei über authentifizierte Storage-API hochladen → private Rücklese der Bytes und SHA-256/Größen-/Typsignaturvergleich → Metadaten bestätigen. Keine Dateibytes in SQL, öffentlichen URLs, lokalen dauerhaften Browserspeichern oder Analyseprotokollen. MIME/Name/Größe zusätzlich serverseitig kontrolliert. Serverseitige Metadatenbestätigung ersetzt keine serverseitige kryptografische Byteanalyse; die tatsächliche Rücklese-/Hashprüfung erfolgt im Browser.

Authentifizierte Downloads prüfen Originalhash vor Übergabe an Browser. Keine öffentlichen/zeitlich signierten Datei-URLs, Inline-Vorschauen oder Überschreibungen. Storage-UPDATE/DELETE für Clients gesperrt; breite fremde Policies werden durch restriktive Archivgrenzen begrenzt. Wiederholungen verwenden unveränderte Request-IDs; vorhandene Objekte werden niemals ersetzt. Eigener unbestätigter Upload kann mit exakt derselben Datei fortgesetzt werden. Rücknahme begründet und nachvollziehbar, Original bleibt erhalten; Wiederfreigabe nur eines zuvor bestätigten, weiterhin passenden Originals. Bereits heruntergeladene Kopien können nicht widerrufen werden.

Kapazitätsbremse bei 600 MiB belegtem/reserviertem Storage und zwölf offenen Uploadvorbereitungen. Dies ist eine vorsichtige Anwendungsgrenze, keine vollständige Supabase-Kosten-/Egressgarantie. Keine automatische physische Löschung oder Retention. Unbestätigte falsche Datei begründet zurücknehmen; für richtige Datei eigenen neuen Datensatz erzeugen.

Audit unterscheidet angeforderten Download von erfolgreichem Dateitransfer: `document_download_requested` beweist nur die autorisierte Anforderung. Administrative Payloads einschließlich Dateinamen/privater Referenzen zusätzlich durch vorherige Migration `20261030223550` geschützt.

## Versammlungen

Titel/Datum/Ort/Tagesordnung, eigene Zielgruppe, manuell dokumentierter Stand, getrennt berechtigter Protokoll-/Beschlusslink und private externe Karar-Defteri-Referenz. Optimistische Revision und vollständiger privater Vorher-/Nachher-Audit. Stand „externer Nachweis geprüft“ benötigt vergangenes/heutiges Datum, bestätigtes Original und ausdrückliche manuelle Prüfung. Software prüft keine Beschlussfähigkeit, Stimmen, Vollmachten, Zustellung oder gesetzliche Fristen. Rechtsverbindlicher externer Beschluss/Karar Defteri bleibt erforderlich. Einladungstext DE/TR nur vorbereiten/kopieren, kein automatischer Versand.

## Nachweise

- 50 synthetische PGlite-Prüfungen: Rechte, breite fremde Storage-Policy, Pfad/Owner-Spoofing, Originalschutz, Dateigröße/Typ, Bestätigung, Rücknahme/Wiederfreigabe, getrennte Zielgruppen, private Referenzen, Meetings/Revision/Audit.
- 70 native Chromium-Prüfungen DE/TR bei 375/1440 px: ausdrückliche Freigabe, Upload-Rücklese, Wiederholungen nach unklarer Bestätigung, unveränderte Originalbytes/Türkischnamen, korrupte Datei gesperrt, Rollen, Tagesordnung, Einladung ohne Versand und Mobilbreite. Ausschließlich synthetischer lokaler RPC-/Storage-Transport.
- Sechs reine Binärdatei-/SHA-/Transporttests; allgemeine Testsuite 323 bestanden, einschließlich Modulidentitäten.
- Keine echte Supabase-Storage-Dateiübertragung und kein vollständiger realer Auth-/Gerätetest behauptet. Dafür ist eine tatsächliche autorisierte Sitzung erforderlich. Keine künstlichen produktiven Auth-Konten anlegen.

## Veröffentlichung und Rückfall

Separater Entwicklungsbranch `feature/private-documents-meetings-20261031`. SQL erst nach isolierter Prüfung als Migration installieren; tatsächliche Supabase-Versionsnummer übernehmen. CI und Pages sowie ausgelieferte Quelldateien separat bestätigen. RLS/Clientrechte/Leere der neuen Tabellen rein lesend prüfen. Bei Frontendfehler vorherigen GitHub-Stand ausliefern; neue Tabellen/Originale/Policies erhalten, keine destruktive Rückmigration und keinen Bucket löschen/öffentlich schalten. Neue Originale gehören in das vollständige Wiederherstellungsinventar einschließlich Binärdateien und Rechte/Hash-Metadaten. Backupautomatisierung gemäß Nutzerauftrag nicht erneut bearbeitet; keine Aussage über deren neuen Bucketumfang oder erfolgreichen Restore.

Nächster Schritt: Aufgabenliste mit Verantwortlichkeit, Termin und Status sowie interne Fälligkeitsanzeige; Wiederholungen ausschließlich bewusst manuell erzeugen. Bestehende Rechte/Personen/Dienstleister/Benachrichtigungslogik zuerst abgleichen.

Backend am 31.10.2026 installiert: `20261031064800_private_immutable_documents_and_meeting_records`. Produktiv rein lesend bestätigt: privater Bucket mit 10-MiB-Limit, 0 Dokumente/Versammlungen/Objekte, beide RLS aktiv, keine anonymen Workspace-Aufrufe/privaten Helferausführungen oder direkten Client-Inserts und sieben Archiv-Storagepolicies. Keine Testoriginale angelegt. Frontend-/CI-Veröffentlichung noch separat offen.

Security-Advisors vor/nach Migration geprüft: bestehende vier Hinweisgruppen unverändert; authentifiziert ausführbare SECURITY-DEFINER-RPCs wachsen erwartungsgemäß um die acht ausdrücklich rollenprüfenden Archiv-/Versammlungsendpunkte. Keine zusätzliche anonyme Archivfunktion. Bestehende Alt-/Auth-Hinweise werden nicht pauschal als behoben markiert.

Integrationskorrektur 31.10.2026: Beim tatsächlichen API-Client fehlten die freigegebenen RPC-Namen für Historienzuordnung, Abschlüsse/Summenfreigaben, Sonderumlagen und Budget. Die bisherigen synthetischen UI-Tests umgingen diese Aufrufliste. Explizite Liste ergänzt (keine Wildcard, keine serverseitige Rechteänderung); neue Regression führt die von den Controllern verwendeten Aufrufe durch den wirklichen authentifizierten Client und prüft unbekannte Endpunkte/Sitzungswechsel. Früherer technischer Release-Nachweis dieser Module war hinsichtlich dieses Clientwegs unvollständig; keine echten Backend-/Finanzdaten dadurch geändert.

Veröffentlicht #78: main 8fe18db9be53506b2215330abc9d9cf43d0d4ec5, CI 41178154418 und Pages 41178235871 erfolgreich; neun ausgelieferte Dateien bytegleich geprüft. Allgemeine Suite nach Clientkorrektur: 325 bestanden. Reale Storage-/Auth-Abnahme bleibt offen.
