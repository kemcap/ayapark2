# Phase 4 – siebentägige persönliche Einladungen

Entwicklungsstand auf ayapark-v2, aufbauend auf Phase 3. Kein produktiver Deploy, keine neue Auth-Konfiguration und keine Bewohnerkonten geändert.

## Änderungen

- Neue Links laufen serverseitig nach sieben Tagen ab. Vorhandene ausgegebene Links werden nicht still verlängert.
- Erstellung und Ersetzung erfolgen in einer Datenbanktransaktion. Fehlgeschlagene Neuerstellung erhält den bisherigen Link. Personen werden zuerst gesperrt; Einlösung und Widerruf benutzen dieselbe Sperrreihenfolge.
- Superadmin kann im vorhandenen Einladungsdialog alle ausstehenden Links einer Person widerrufen; Berechtigung und ausdrückliche Bestätigung werden serverseitig geprüft. Erstellung, Widerruf und Aktivierung sind protokolliert.
- Aktivierung und Oberfläche verlangen sechs Zeichen, ohne Zeichenklassenpflicht. Die produktive Auth-Mindestlänge bleibt unverändert; die getrennte Auth-Testkonfiguration aus Phase 3 ist Voraussetzung.
- Einmalverbrauch, Ablauf, aktuelle Wohnungsrolle und Berechtigung des Ausstellers werden bei Einlösung erneut geprüft. Die verifizierte Telefonnummer wird im selben SQL-Vorgang dem aktivierten Auth-Konto zugeordnet, ohne ein zweites Konto oder Verwaltungsrechte zu erzeugen.
- Vor Aktivierung gibt die Linkprüfung keine Wohnungsnummer mehr zurück. GET/Inspektion verbraucht keinen Token. Nach Aktivierung wird der bisherige automatische Passwortlogin verwendet; schlägt er fehl, bleibt der manuelle Login verfügbar.
- Manueller WhatsApp-Button bleibt erhalten. Kein Versanddienst, keine automatische Nachricht, kein SMS-/WhatsApp-Logincode. Versand wird nicht mit nachgewiesener Zustellung gleichgesetzt.
- Neuerstellung im selben Dialog erzeugt einen frischen Einladungstext, damit kein alter Token mitkopiert wird. Gleichzeitige Erstellen-/Widerrufen-Aktionen sind im Dialog gesperrt.
- Globales und tokenbezogenes Limit begrenzen öffentliche Inspektion/Aktivierung in 15-Minuten-Fenstern. Diese Limits ersetzen keinen vollständigen vorgelagerten DDoS-/IP-Schutz; globale Limits können bei Angriffen die Aktivierung zeitweilig blockieren.

## Abgeschaltet bis zur Staging-Abnahme

Die neue Edge-Version verlangt `ENABLE_INVITATIONS_V2=true`. Ohne Schalter wird sie geschlossen abgewiesen. `AY_INVITE_APP_URL` und `AY_INVITE_ALLOWED_ORIGINS` ermöglichen eine ausdrücklich konfigurierte getrennte HTTPS-Testumgebung; die App-URL muss zu einer erlaubten Origin gehören. Die produktive bestehende Edge-Version wurde nicht ersetzt.

Zuerst `auth-phase3.sql`, ursprüngliche Einladungstabelle und anschließend `auth-phase4.sql` ausschließlich in einer gesicherten Testumgebung prüfen. Die neuen SQL-Dateien sind Entwicklungsentwürfe, keine angewendeten produktiven Migrationen. Vor Einführung über Supabase CLI als versionierte Migrationen übernehmen. Keine automatische Ausführung gegen Produktion.

## Tests und offene Grenzen

Die JavaScript-Regressionssuite und die neue isolierte PostgreSQL-Suite sind im PR überprüfbar. SQL prüft sieben Tage, fehlende Vorab-Wohnungsrechte, fehlgeschlagene/erfolgreiche Ersetzung, fremden Aussteller, Widerruf, Ablauf, entfernte Managerberechtigung, gültige Aktivierung, zweite Verwendung, Zuordnung derselben Auth-ID, fehlende Adminrechte und Audit. Testdaten sind ausschließlich synthetisch.

Eine echte Auth-Kontoerstellung, automatische Anmeldung nach Aktivierung, WhatsApp-Übergabe auf einem Telefon, native Mobilgeräte und parallele Transaktionen über PostgREST sind weiterhin offen. Die bestehende Auth-Kontoerstellung und SQL-Einlösung sind zwei getrennte Systeme: bei fehlgeschlagener SQL-Zuordnung wird ausschließlich die in diesem Versuch neu angelegte Auth-ID bereinigt. Prozessabstürze oder Fehler dieser Bereinigung können ein unzugeordnetes Konto hinterlassen. Ein kontrollierter Wiederanlauf-/Abgleichprozess muss vor produktiver Freigabe dafür ergänzt und getestet werden. Deshalb ist dieser Stand keine Freigabe für produktive Erstaktivierung.

Vollständige Sicherung einschließlich Auth, isolierte Wiederherstellungsprobe und angepasste Passwortkonfiguration sind vor Backend-Einführung weiterhin erforderlich. Keine angehängten Finanzdokumente wurden bearbeitet.

## Rückweg

Vor Deploy bleibt Produktion unverändert. In Staging den neuen Schalter deaktivieren; ausgegebene Staging-Links bei Bedarf gezielt widerrufen. Keine Konten oder Auditdaten pauschal löschen und keine alten Datenbankstände über neue Buchungen zurückspielen. Alte Links bleiben während der Entwicklung ausschließlich im bisherigen Produktivsystem verwendbar.

Nächste fachliche Phase: öffentliche Zugangsanfragen und Superadmin-Bearbeitung. Die oben genannten Integrations-/Absturztests bleiben vor einem Livegang verpflichtend.
