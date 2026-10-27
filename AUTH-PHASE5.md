# Phase 5 – Zugangsanfragen und Bearbeitung

Entwicklungsstand auf ayapark-v2 / Draft-PR #37. Kein produktiver Deploy, keine neue Freischaltung, keine Nachrichten. `ENABLE_ACCESS_REQUESTS=false` im Client; serverseitig zusätzlich `ENABLE_ACCESS_REQUESTS=true` und freigegebene Staging-Konfiguration erforderlich.

## Implementiert

Öffentliches Formular: Vorname, Nachname, Auswahl Telefon/E-Mail und genau eine Kontaktangabe. A/B-Wohnung ist optional. Die neutrale Antwort enthält weder Kontoexistenz noch Anfrage-ID. Serverseitige Normalisierung, Feld-/Größenprüfung und HMAC-basierte Budgets: 100 global, fünf pro IP und zwei pro Kontakt je 15 Minuten. Ohne verifizierten Ingress-IP-Header bleibt die Übermittlung gesperrt. Ursprung und Site werden serverseitig konfiguriert, nicht aus Formulardaten übernommen. CORS ist keine Identitätsprüfung.

Eine Anfrage erzeugt nur einen geschützten Datenbankeintrag: keine Auth-ID, kein Konto, keine Rolle, keine Wohnungszuordnung. Eine partielle Unique-Constraint vermeidet doppelte laufende Anfragen für denselben normalisierten Kontakt. Abgeschlossene/abgelehnte Fälle bleiben getrennte Historie. Öffentliche und gewöhnliche angemeldete Benutzer haben keinerlei Tabellenrechte.

Superadmin-Dashboard: offene/ungelesene Anfragen, Name, Kontakt, Zeit (Europe/Istanbul), Wohnungsangabe und Status. Die Summen werden unabhängig vom begrenzten Listenfenster serverseitig berechnet. Die Liste ist mit 200 Anfragen pro Seite durchblätterbar; Summen beziehen sich auf den vollständigen Bestand.

Bearbeitung: gelesen markieren, in Prüfung nehmen, vorhandene Person suchen/auswählen, vorhandene Kontakt-/Wohnungsrollen prüfen, ausdrücklich freigeben oder ablehnen. Statuswechsel prüfen Manager-Rolle, Site und aktuelle Version erneut im Backend. Veraltete Dialoge überschreiben keine zwischenzeitlichen Änderungen. Freigabe ist nur für eine bisher nicht mit Auth verknüpfte Person mit aktueller Eigentümer-/Mieterrolle zulässig. Fehlende Personen und Rollen müssen über die bestehenden Verwaltungsfunktionen gepflegt werden; dieser Dialog erzeugt sie nicht automatisch.

Einladung öffnen verwendet den vorhandenen Einladungsdialog. „Versand bestätigen“ setzt den Status erst nach ausdrücklicher Bestätigung und nur bei vorhandener gültiger Einladung. Der WhatsApp-Klick allein behauptet keine Zustellung. Tatsächlicher Tokenverbrauch setzt „Aktiviert“ über einen internen Trigger; die Verwaltungs-API erlaubt diesen Status nicht frei. Ablehnung widerruft ausstehende Einladungen der zugeordneten Person. Freigabe, Ablehnung, Zuordnung und andere Statusänderungen werden im Audit ohne Passwort oder Token erfasst. Sperrreihenfolge ist Person vor Anfrage, passend zur Einlösung aus Phase 4.

Die Antragstellerangaben werden nicht still in bestehende Personenkontakte kopiert. Eine Kontaktdatenänderung erfolgt weiterhin über die vorhandene Personenbearbeitung nach Prüfung. E-Mail-Anfragen werden vollständig angenommen und geprüft. Der bisherige Einladungsdialog bleibt jedoch telefonbasiert: für Antragsteller ohne hinterlegte geprüfte Telefonnummer fehlt noch die reine E-Mail-Einladung. Es wird deshalb keine erfolgreiche Einladung für solche Fälle vorgetäuscht; dieser Integrationspunkt bleibt vor Gesamtfreigabe zu lösen.

## Datenbank und Konfiguration

`supabase/auth-phase5.sql` ist ein NICHT angewendeter Entwurf nach den Entwürfen aus Phase 3 und 4. Neue Tabelle ay_access_requests mit RLS und Service-only-Funktionen für Submit/List/Update. Keine produktive Migration. Die serverseitigen Adapter verwenden ausschließlich getUser-geprüfte Benutzeridentitäten; Site und Rollen werden nochmals in SQL geprüft.

Neue Edge Function ay3-access-requests. Erforderlich: ENABLE_ACCESS_REQUESTS, AY_ACCESS_SITE_ID, AY_AUTH_ALLOWED_ORIGINS, AY_AUTH_RATE_SECRET sowie überprüfte AY_AUTH_TRUST_INGRESS_IP-Konfiguration. Secrets bleiben serverseitig. Nicht gegen den produktiven Auth-/Datenbankbestand aktivieren.

Aufbewahrung: vor Livegang verbindliche Fristen und einen Service-only-Aufräumjob festlegen. Vorschlag: unbeantwortete Anfragen spätestens nach 90 Tagen erneut prüfen; erledigte personenbezogene Antragsinhalte nach 30 Tagen löschen/anonymisieren, soweit keine dokumentierte Notwendigkeit besteht. Minimales Aktionsaudit getrennt behandeln. Diese Fristen sind ein technischer Vorschlag, keine rechtliche Festlegung. Der Job ist nicht eingerichtet. Hash-basierte Rate-Einträge weiter nach der Phase-3-Frist bereinigen.

## Prüfungen und Grenzen

JavaScript-Tests decken Telefon/E-Mail mit nur einem Kontakt, optionale Wohnung, feste Server-Site, neutrale Bestätigung, fehlende Authentifizierung, unerlaubtes Setzen von Aktiviert, ausgeschaltete Funktion, Drosselung, Origin-/Größen-/Formatprüfung, sichere HTML-Ausgabe und deutsche/türkische Statusdarstellung ab.

19 zusätzliche isolierte PostgreSQL-Prüfungen: Dubletten, gesperrter Tabellenzugriff, Managerprüfung, fehlende Bestätigung, ungültiger Status, veraltete Version, fehlende Einladung, Ablehnung/Widerruf, keine Vorab-Konten-/Wohnungsrechte, tatsächliche Aktivierung und Audit. Synthetische Fixtures, keine echten Bewohner.

Offen: Browser-/Mobilabnahme mit aktiviertem Staging, parallele PostgREST-Transaktionen, reine E-Mail-Einladung und Aufbewahrungsjob. Die offenen Auth-Absturz-/Wiederanlauftests aus Phase 4 bestehen weiterhin. Keine vollständig abgeschlossene Produktionsabnahme behauptet.

## Rückweg

Neue Client-/Server-Schalter deaktivieren. Bestehende Anmeldung und Einladungsfunktion behalten; Anfragen und Audit nicht pauschal löschen. Kein SQL-Down-Script gegen produktive Daten ausführen. Vor produktiver Einführung vollständige Sicherung, isolierte Wiederherstellungsprobe, Tests und ausdrückliche Freigabe erforderlich.
