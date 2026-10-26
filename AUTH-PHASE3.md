# Phase 3 – klassische Anmeldung, Passwortregeln und Sitzungen

Stand: 26.10.2026. Entwicklung auf `ayapark-v2`; keine Veröffentlichung und keine produktiven Auth-/Datenbankänderungen.

## Ausgangsstand und Branch

Produktionsbasis: `c52f5f57da1a4bde50901997a645296b81a6976a`.
Die gewünschte Branch `ayapark-v2` stand auf `869e0385639766ec90d218b4dfaf8da39717f475` und war kein Vorfahr von main. Ein dokumentierter Merge mit beiden Eltern erhält diese Geschichte und übernimmt exakt den aktuellen main-Dateibaum als Entwicklungsbasis. Kein Force-Push und keine Wiederherstellung der alten V2-Anwendung. Der neue Entwicklungsstand wird als Draft-PR gegen main bereitgestellt.

## Implementierter Umfang

- Gemeinsames Feld „Telefonnummer oder E-Mail-Adresse“ / „Telefon veya e-posta“, mit Benutzername-Autofill, ausgeschalteter Autokorrektur und bestehendem Passwortauge. E-Mail-Code verlangt weiterhin ausdrücklich eine E-Mail-Adresse.
- Gemeinsame neue Passwortvalidierung: mindestens sechs Unicode-Zeichen, höchstens 256; keine vorgeschriebenen Großbuchstaben, Zahlen oder Sonderzeichen, keine automatische Kürzung oder Änderung des Passworts. HTML-Maximallängen können bei mehrteiligen Unicode-Zeichen konservativer begrenzen. Vorhandene Passwortanmeldungen erhalten keine neue Mindestlängenprüfung.
- Erstmalige E-Mail-Passwortvergabe und Recovery verwenden die Sechs-Zeichen-Regel. Die Einladung bleibt für Phase 4 bei zehn Zeichen und 48 Stunden; ihre Oberfläche wird nicht vorab auf ein anderes Backendverhalten umgestellt.
- Bisherige Sessionverwaltung bleibt erhalten: gleiche Storage-Schlüssel, Refresh-Token-Rotation, Wiederaufnahme, Sperren gegen konkurrierende Tabs, keine Sessionlöschung bei vorübergehenden Netzwerkfehlern. Keine zweite Auth-Bibliothek oder parallele Sitzung eingeführt.
- Neuer separater, abschaltbarer Telefonlogin löst eine ausdrücklich geprüfte Telefonnummer serverseitig zum bereits vorhandenen Auth-Konto auf. Die echte E-Mail-Adresse wird nicht öffentlich aufgelöst. Das Passwort wird ausschließlich gegen Supabase Auth geprüft, niemals gegen eine eigene Passworttabelle. Es werden keine Accounts, Wohnungsrollen oder Bewohnerzugänge erzeugt.
- Kontakte werden nur nach expliziter Bestätigung mit Begründung und gültiger Manager-Identität gebunden. Der Zielperson muss bereits eine Auth-ID zugeordnet sein. Eine Nummer darf nicht auf einen anderen Benutzer umgebunden werden; Entzug und erneute Freigabe desselben Benutzers sind protokolliert. Diese Phase bietet dafür einen geprüften API-Endpunkt, noch keinen neuen Superadmin-Dialog (Phase 5).
- Private Kontakt- und Drosselungstabellen, RLS, keine Rechte für anon/authenticated; öffentliche Service-RPCs sind nur für service_role ausführbar. Benutzerprüfungen erfolgen zusätzlich in Edge/SQL. Keine produktiven Kontaktdaten automatisch übernommen.

## Aktivierungsschalter und unveränderte Produktion

`auth-features.mjs`: `ENABLE_VERIFIED_PHONE_LOGIN=false`.

Damit verwendet der Entwicklungsstand standardmäßig weiterhin die vorhandene Telefon-Alias-Kompatibilität und direkte E-Mail-Anmeldung. Erst nach isolierter Backend-Abnahme wird der neue Telefonpfad gezielt eingeschaltet. Nach einem fehlgeschlagenen neuen Telefonlogin erfolgt **kein** Fallback auf einen anderen Kontobezeichner. Bestehende Telefonkonten benötigen vor dieser Umstellung ebenfalls eine manuell geprüfte Kontaktzuordnung.

Die neue Edge Function ist zusätzlich serverseitig gesperrt, bis folgende Werte gesetzt und geprüft sind:

- `ENABLE_VERIFIED_PHONE_LOGIN=true`
- `AY_AUTH_PUBLISHABLE_KEY` (getrennt vom geheimen Administrationsschlüssel)
- `AY_AUTH_RATE_SECRET` (mindestens 32 Zeichen, nur serverseitig)
- `AY_AUTH_ALLOWED_ORIGINS` (exakte freigegebene Test-Origin)
- `AY_AUTH_TRUST_INGRESS_IP=true` erst, wenn die Hosting-Grenze den verwendeten IP-Header nachweislich selbst setzt und fremde Werte überschreibt.

Ein vom Client frei fälschbarer Forwarded-Header ist kein verlässlicher IP-Nachweis. Ohne geprüfte Ingress-Konfiguration schlägt dieser Login geschlossen fehl. CORS allein ist kein Missbrauchsschutz.

Der aktive Pfad prüft pro 15 Minuten ein HMAC-gehashtes Telefonnummernbudget (10), ein IP-Budget (30) und ein globales Budget (300). Globale Zählung erfolgt zuerst, damit beliebig viele erfundene Nummern die Tabelle nicht unbegrenzt füllen können. Die Werte sind initiale Testwerte, keine aus Lasttests abgeleiteten Produktionsquoten. Ein globales Budget kann bei Missbrauch die Telefonanmeldung vorübergehend sperren; E-Mail-Anmeldung bleibt separat. Es werden keine Passwörter oder vollständigen IP-Adressen gespeichert oder geloggt. Alte Drosselungseinträge sind durch einen vertrauenswürdigen geplanten Job nach 24 Stunden zu löschen; dieser Job wurde nicht produktiv eingerichtet.

Unbekannte Nummer und falsches Passwort liefern dieselbe Antwort; auch bei unbekanntem Kontakt erfolgt eine Auth-Anfrage gegen einen nicht zugeordneten Bezeichner. Dies vermeidet einen offensichtlichen Lookup-Schnellpfad, garantiert jedoch keine vollständig identischen Netzwerkzeiten. Infrastrukturfehler werden gesondert als nicht verfügbar gemeldet.

## Datenbank und Auth-Konfiguration

`supabase/auth-phase3.sql` ist ein isoliert geprüfter **SQL-Entwurf**, keine angewendete Produktionsmigration. Es ändert keine bestehenden Auth-Konten oder Wohnungszuordnungen. Vor Übernahme mit `supabase migration new` eine versionierte Migration erstellen; Supabase CLI war in dieser Umgebung nicht installiert. Der Entwurf wurde nicht gegen das produktive Projekt ausgeführt.

`supabase/test-auth/config.toml` ist ein Konfigurationsfragment für eine getrennte lokale/Staging-Instanz: Passwortminimum sechs, keine Zeichenklassenpflicht, öffentliche Registrierung aus, Refresh-Rotation an. **Kein Nachweis**, dass der produktive Auth-Dienst bereits sechs Zeichen akzeptiert. Keine produktive Auth-Einstellung wurde geändert.

Kompromittierte Passwörter werden in dieser Phase nicht durch einen selbst erfundenen clientseitigen Filter angeblich sicher abgefangen. Supabase Leaked Password Protection ist laut Dokumentation tarifabhängig und muss separat geprüft/freigegeben werden. Die neue Drosselung ersetzt diesen Schutz nicht. Strengere Superadmin-Regeln wurden nicht durch rein optische Prüfungen vorgetäuscht.

## Tests und Grenzen

- Vollständige JavaScript-Suite: 205/205 bestanden; neun zusätzliche Phase-3-Tests prüfen exakt sechs Zeichen, Normalisierung, bestehende Auth-ID, neutrale Fehler, Drosselung, ausgeschalteten Pfad, Größen-/Originprüfung, bestätigte Bindung, Infrastrukturfehler und fehlenden Konto-Fallback.
- `npm run test:auth:sql`: 18 Prüfungen in einer synthetischen PGlite-Instanz. Anonyme/gewöhnliche Benutzer gesperrt; fremder Manager/Benutzer abgewiesen; Nummernkonflikt erhält alte Zuordnung; Entzug/Reaktivierung, Audit, Drosselung und unveränderte Auth-/Wohnungszuordnungen geprüft.
- `npm run test:sql` und `npm run test:v5:sql`: vorhandene Finanz-/Rechteregressionen mit 120/120 und 50/50 bestanden.
- CI prüft auch die neue Edge Function mit Deno; kein Deno war lokal installiert. Syntaxprüfung mit Node ist kein Ersatz für diesen Typecheck.
- Kein echter Supabase-Auth-End-to-End-Test: es gibt hier keine getrennte verbundene Auth-Instanz. Sechs-Zeichen-Passwort gegen GoTrue, echte Passwort-/Refresh-Tokenrotation, parallele PostgREST-Transaktionen, bestätigter Ingress-IP-Header, native PWA/Android/iOS und mobile Bildschirmtastatur bleiben offen.
- PGlite-Tests sind keine vollständige Backup-/Wiederherstellungsprobe des Supabase-Projekts. Vor einer tatsächlichen Backend-Umstellung vollständige Sicherung, isolierte Wiederherstellung und Abgleich von Auth-IDs, RLS, Rollen und Kontakten erforderlich.
- Keine produktiven Anmeldeversuche, Passwortänderungen oder Nachrichten. Keine Änderungen an den angehängten Finanzdokumenten.

## Rückweg und nächster Schritt

Vor Veröffentlichung genügt das Zurücknehmen des Entwicklungs-PRs; Produktion bleibt unberührt. Bei einem späteren Staging-Rollout den Client- und Server-Schalter deaktivieren, bestehende E-Mail-Anmeldung erhalten und Kontakte/Audit nicht löschen. Vor einer späteren Produktionsfreigabe alle offenen Integrationsprüfungen abschließen; keine pauschale SQL-Rückmigration mit Datenlöschung.

Phase 4 ist separat: sieben Tage gültige Einladungen, atomare Ersetzung/Widerruf/Verbrauch und ein gemeinsamer Aktivierungsablauf. Zugangsanfragen, Admin-Bearbeitungsoberfläche und Passkeys sind noch nicht umgesetzt.

Quellen: https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/password-security ; https://supabase.com/docs/guides/auth/sessions ; https://supabase.com/docs/guides/auth/rate-limits .
