# Telefonnummer-Zugang · vorbereitet, noch nicht produktiv aktiviert

Prüfstand: 26.10.2026. Bestehende E-Mail-Anmeldung bleibt erhalten.

## Bedienung

Superadmin öffnet Einstellungen → WhatsApp-Einladung, wählt eine bereits mit einer aktuellen Wohnung verbundene Person und erstellt einen Link. „Über WhatsApp teilen“ öffnet WhatsApp; der Superadmin kontrolliert den Empfänger und sendet selbst. Es werden keine automatischen Einladungen verschickt.

Der Link enthält einen zufälligen 256-Bit-Schlüssel im URL-Fragment. Nach dem Öffnen wird er aus der Adressleiste entfernt. Der Server liefert zunächst ausschließlich die maskierte Telefonnummer. Der Bewohner fordert einen sechsstelligen Code über WhatsApp (Standard) oder SMS an. Erst nach OTP-Prüfung und erneuter Prüfung der Freigabe gibt der Server eine Supabase-Sitzung frei. Keine E-Mail und kein Passwort erforderlich. Nach erfolgreicher Aktivierung führt der Link zur eigenen Bewohnerübersicht. Spätere Anmeldungen ohne Einladung sind für bereits aktivierte Nummern vorgesehen.

Die Sitzung nutzt dieselbe persistente Speicherung und Refresh-Rotation wie die bestehende Anmeldung. Ein erneuter Code ist bei gültiger Sitzung nicht bei jedem Öffnen erforderlich. Gerätewechsel, Abmelden, gelöschter Browserspeicher oder serverseitig abgelaufene Sitzungen können eine neue Anmeldung erfordern.

## Sicherheitsgrenzen

- Die produktive Rollenprüfung bestätigte: `service_role` darf `auth.users` nicht direkt lesen. Deshalb liegen die drei privilegierten Kontoprüfungen als ausschließlich serverseitig aufrufbare Funktionen im privaten Schema; öffentliche RPC-Hüllen sind `SECURITY INVOKER`. Es werden keine pauschalen Auth-Tabellenrechte vergeben.
- Funktionen sind standardmäßig über `PHONE_ACCESS_ENABLED` gesperrt. Ohne explizites `true` findet kein Versand statt.
- Nur ein serverseitig nachgewiesener Superadmin (`manager` im vorhandenen Datenmodell) darf Einladungen erstellen/widerrufen.
- Die RPCs sind nur für `service_role` ausführbar; Einladungstabelle im privaten Schema, RLS aktiv, keine Client-Leserechte. Keine Service-Schlüssel im Frontend.
- Supabase OTP wird mit `shouldCreateUser:false` angefordert. Unbekannte Nummern werden vom Server vor jedem Versand abgewiesen.
- Bereits verknüpfte Benutzer-ID bzw. bestehendes passendes E-Mail-Konto wird wiederverwendet. Telefon-/Kontokonflikte brechen ab; keine Kontenzusammenführung durch Vermutung.
- Neue Telefonkonten werden nur nach Superadmin-Prüfung unbestätigt vorbereitet. Keine Wohnungsrechte vor erfolgreicher Prüfung. Bereits verknüpfte Konten mit abweichenden bestehenden Rechten werden abgewiesen, statt still neue Rechte zu erhalten.
- Freigegebene aktuelle Wohnungsrollen werden bei Einladung festgehalten. Ändern sie sich vor Abschluss, ist eine neue Einladung erforderlich. Bestehende inaktive Rechte werden nicht reaktiviert; keine Mitarbeiterrechte werden verändert.
- Einladung sieben Tage gültig, nach Aktivierung nicht erneut verwendbar. Nur Token-Hash gespeichert. Telefonnummer wird bei erfolgreicher Aktivierung in internationalem Format gespeichert; alte Personendaten werden nicht pauschal umgeschrieben.
- Höchstens sechs Versandversuche, mindestens 60 Sekunden Abstand und zehn Prüfversuche pro Einladungsfenster; für spätere Anmeldungen 24-Stunden-Fenster. Zusätzlich sind Supabase- und Anbieterlimits erforderlich, weil direkte öffentliche Auth-Endpunkte die Edge-Funktion umgehen können.
- Einladungswiderruf verhindert diesen Telefon-Anmeldeweg. Er entzieht keine bereits bestehenden Wohnungsrechte und beendet keine bestehenden Sitzungen. Vollständige Zugangssperre weiterhin über die vorhandene Zugangsverwaltung.

## Vor produktiver Aktivierung erforderlich

1. Twilio-Konto, Verify Service und eigener WhatsApp-Business-Absender einrichten; WhatsApp-Authentifizierungsvorlagen/Meta-Freigaben und Empfang in der Türkei prüfen. SMS-Zustellung nach +90 ebenfalls beim Anbieter bestätigen.
2. Supabase Phone Provider konfigurieren. Für Twilio Verify die aktuellen Supabase-Voraussetzungen für vorgegebene OTP-Codes am Verify Service prüfen. Projektweite automatische Registrierung schließen; bestehende E-Mail-Anmeldung und vorbereitete Konten müssen weiter funktionieren. `shouldCreateUser:false` allein ist kein globaler Registrierungsstopp.
3. Providerkosten für die tatsächlichen Zielländer bestätigen, Kostenwarnungen/Versandlimits setzen. Limits gelten auch an den öffentlichen Auth-Endpunkten. CAPTCHA ist im aktuellen Formular nicht integriert; wenn in Supabase aktiviert, muss vor Freigabe dessen Client-Token-Erfassung ergänzt werden.
4. Migration `supabase/migrations/20261026090314_phone_activation.sql` nach Schemaabgleich anwenden. Die Migration legt additive Objekte an und ändert keine bestehenden Buchungen oder Auth-Konten.
5. Edge Function `ay-phone-access` mit öffentlich erreichbaren Aktionen deployen (Gateway-JWT-Prüfung deaktivieren, z.B. CLI `--no-verify-jwt`). Admin-Aktionen prüfen das Benutzer-JWT selbst. Standard-Supabase-Secrets nur serverseitig verwenden. `PHONE_ACCESS_ENABLED` zunächst nicht setzen.
6. Frontend inklusive `phone.html`, `phone-page.mjs`, `phone-auth.mjs` veröffentlichen. Erst nach Anbieter-/Registrierungs-/Kostenprüfung den Schalter aktivieren.
7. Mit einem ausdrücklich freigegebenen echten Testkonto WhatsApp und SMS, bestehende E-Mail-ID, Zugriff auf ausschließlich eigene Wohnung sowie Sitzungswiederherstellung prüfen. Mocktests belegen keine reale Zustellung.

## Kosten und Wartung

Twilio Verify veröffentlicht 0,05 USD pro erfolgreicher Verifizierung plus länder- und kanalabhängige Versandgebühren. Supabase verwendet beim Verify-Anbieter gegebenenfalls vorgegebene Codes; Twilio weist für eigene Codes eine Berechnung pro erstelltem Verifizierungsversuch aus. Deshalb ist 0,05 USD pro Erfolg keine verlässliche Kostenobergrenze dieser Integration. Auch erfolglose Versandversuche können Versandkosten verursachen. Keine US-Beispielpreise als Türkei-Tarif verwenden.

Beispielbudget: 20 erfolgreiche Verifizierungen entsprechen 1 USD reiner Verify-Grundgebühr bei erfolgsbasierter Abrechnung, zusätzlich Nachrichten, Wiederholungen und gegebenenfalls Absender-/Nummernkosten. Persistente Sitzungen reduzieren den Bedarf; keine garantierte monatliche Pauschale. Konkreter +90-Gesamtpreis ist vor Freigabe im gewählten Twilio-Konto zu bestätigen.

Laufender Aufwand: Guthaben/Kostenwarnungen, Sender-/Vorlagenstatus, Zustellfehler und Missbrauchsrate überwachen; Telefonnummern bei Wechsel oder Auszug kontrollieren. Anbieterkosten und Supabase-Regeln regelmäßig prüfen. Es wurde kein Anbieter gebucht und keine kostenpflichtige Nachricht versandt.

Offizielle Quellen:
- https://supabase.com/docs/guides/auth/phone-login
- https://www.twilio.com/docs/verify/whatsapp
- https://www.twilio.com/en-us/verify/pricing

## Rückfall

`PHONE_ACCESS_ENABLED` deaktivieren und bei Bedarf die Telefon-Links aus der Oberfläche ausblenden. E-Mail-Anmeldung bleibt nutzbar. Keine bestätigten Auth-Konten oder Wohnungszuordnungen automatisch löschen. Neue private Einladungstabelle als Nachweis behalten; Schemaentfernung ist für ein Zurückschalten nicht erforderlich. Ein Widerruf einer Einladung ersetzt keine vollständige Zugangssperre.

## Teststatus

204 JavaScript-Tests, 120 bestehende SQL-Tests, 50 V5-SQL-Tests und 31 neue Telefon-SQL-Prüfungen bestanden. Tests verwenden künstliche Identitäten; keine echten OTP-Nachrichten, keine Browserprüfung. Reale Providerzustellung und produktive Aktivierung stehen aus.
