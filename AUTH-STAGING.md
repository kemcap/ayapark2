# Isolierte Supabase-Prüfung – 27.10.2026

Separates Projekt `ayapark-auth-staging`, Ref `nphmuecdapvebcnpuqvp`, Region ap-southeast-1. Produktivprojekt `eisozwhhinqszfikemot` unverändert. Testbranch wurde wegen fehlendem Pro-Tarif abgelehnt; separates Projekt erfolgreich angelegt, kein Pro-Upgrade veranlasst.

33 leere öffentliche Tabellen aus dem synthetischen Schema-Fixture als Testbasis erstellt. Keine Bewohner-/Finanzdaten kopiert, keine Ersatzfunktionen für natives `auth` installiert. Alle Basistabellen RLS-geschützt, ohne Bewohner-Lesepolicies; keine vollständige Kopie der produktiven RLS-Konfiguration. Anschließend Einladungsschema und Entwürfe Phase 3/4/5/6/8 erfolgreich im echten PostgreSQL installiert. Diese DDL-Installation ist keine vollständige Produktionsmigration oder nachgewiesene Wiederherstellung.

## Tatsächlich ausgeführte native Auth-Prüfungen

Temporärer serverseitiger Prüfendpunkt nur im Testprojekt, mit zufälligem geheimem Bearer geschützt und zusätzlicher Prüfung der Projekt-URL. Offizielles Supabase SDK 2.57.4. Ein zufälliges, bestätigtes synthetisches Konto mit example.invalid-Adresse wurde über Auth Admin erzeugt.

Alle 12 Prüfungen bestanden:

1. Konto mit sechs einfachen Zeichen angelegt.
2. Tatsächliche E-Mail-/Passwortanmeldung erfolgreich.
3. Tatsächliche Sitzungserneuerung erfolgreich.
4. Falsches Passwort abgelehnt.
5. Bewohner konnte Zugangsanfragen nicht lesen (Testbasis ist restriktiv, nicht produktive RLS-Parität).
6. Bewohner konnte service-only Recovery-RPC nicht ausführen.
7. Nativer Recovery-Link für dieselbe bestehende Konto-ID erzeugt.
8. Recovery-Hash tatsächlich verifiziert.
9. Neues Passwort mit sechs einfachen Zeichen gespeichert.
10. Zweite Verwendung desselben Recovery-Hashes abgelehnt.
11. Neues Passwort meldet dieselbe Konto-ID an.
12. Temporäres Testkonto entfernt; separate SQL-Kontrolle: null verbleibende qa-*@example.invalid-Konten.

Danach Prüfendpunkt vollständig durch inaktiven 503-Handler ersetzt, JWT-Prüfung wieder eingeschaltet. Keine privilegierte Testlogik oder Zugangsdaten im Repository. Ergebnisse: `tests/evidence/auth-staging-native.json`.

## Weiter offen

Die Prüfung nutzt native Admin-/Auth-APIs, nicht die vollständigen neuen produktnahen Edge-Handler mit ihren Featureflags und Konfigurationswerten. Echte Einladungskette, Zugangsanfragen mit realen Rollen, administrativer Recovery-Handler, Smartphone/Browser/PWA, SMTP-Zustellung, vollständige produktive RLS-Parität, Wiederherstellung und Unterbrechungs-/Reconciliation-Fälle bleiben offen. Produktive Passwortregeln wurden nicht angepasst. Passkeys weiterhin ausgeschaltet. Keine Veröffentlichung oder Produktionsfreigabe aus dem Testergebnis ableiten.

Dies aktualisiert die Aussage in AUTH-ABSCHLUSS.md, dass noch keine isolierte Auth-Umgebung vorhanden war: Sie besteht nun, und die oben aufgelisteten nativen Prüfungen sind ausgeführt.

## Erweiterte Integration – 27.10.2026

Zusätzlich 19 Prüfungen mit realem GoTrue/PostgREST und den Anwendungs-Handlern bestanden (`tests/evidence/auth-staging-integration.json`): öffentliche E-Mail-Zugangsanfrage, neutrales Duplikat, Managerliste, Zuordnung/Freigabe, keine Wohnungsrechte vor Aktivierung, Erstellung/Prüfung/Aktivierung des E-Mail-Einladungslinks mit sechs Zeichen, Anmeldung, identische Person/Auth-Verknüpfung, Replay-Ablehnung, automatischer Aktivierungsstatus, Bewohner-Ausschluss und ausschließlich die vorgesehene Tenant-Wohnung. Auch der administrative Recovery-Handler erzeugte einen gültigen Link für dieselbe Konto-ID; Verifizierung, Passwortwechsel und erneute Anmeldung bestanden.

Testadapter: Einladungs-Handler mit ausschließlich auf die Test-Origin und Testprojekt gesetzter Konfiguration; unveränderte Anfrage-/Recovery-Handler mit tatsächlichen RPC-/Auth-Adaptern. Eine synthetische Ingress-Adresse wurde injiziert. Damit ist die produktive Ingress-Vertrauensgrenze ausdrücklich **nicht** nachgewiesen. Kein SMTP-Versand und kein Browserdurchlauf. Die früher aufgelisteten fehlenden Handler-Prüfungen für E-Mail sind damit teilweise erledigt; Telefon-/Abbruch-/Device-Fälle bleiben offen.

Der zweite privilegierte Prüfendpunkt wurde nach Abschluss durch einen 503-Handler mit JWT-Prüfung ersetzt. Separate SQL-Kontrolle: null verbliebene Integrationskonten und null Testanlagen. Produktivprojekt und Pages unverändert.

### Verbleibende technische Rollout-Grenze

Die vorhandene Supabase-Verbindung bietet SQL/Edge-Deployment, aber keine Operation zum Setzen von Edge-Secrets oder zum Lesen/Ändern der Auth-Konfiguration. Für eine produktive Aktivierung werden unter anderem das private Rate-Secret, die Feature-Schalter, erlaubte Origins/Reset-URL und der verifizierte Ingress benötigt. Die Handler verweigern ohne diese Konfiguration korrekt die Funktion. Daher wurde kein Frontend ausgerollt, das eine aktivierte Backend-Funktion vortäuschen würde. Browser/PWA, SMTP, vollständiger Restore und Reconciliation sind weiterhin nicht abgenommen.
