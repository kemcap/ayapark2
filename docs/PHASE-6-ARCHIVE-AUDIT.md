# Phase 6 – Privates Dokumenten- und Versammlungsarchiv

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
