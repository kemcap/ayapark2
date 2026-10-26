# AYAPARK 2 – WhatsApp-Einladungen ohne E-Mail

## Bedienung
1. Superadmin öffnet **Kişiler / Personen** und wählt einen aktuell zugeordneten Eigentümer oder Mieter ohne aktiven Zugang.
2. **Einladen / Davet et** öffnen. Eine E-Mail-Adresse ist **nicht notwendig**. Die richtige WhatsApp-Telefonnummer überprüfen (im Dialog änderbar).
3. Freischaltung für diese Person bestätigen, **Link erstellen** und über **WhatsApp** manuell verschicken. Keine automatische Nachricht, keine SMS und kein WhatsApp-API-Anbieter.
4. Der persönliche Link gilt **48 Stunden**, lässt sich **nur einmal einlösen** und wird bei Neuerstellung eines Links widerrufen.
5. Bewohner öffnet den Link, legt sein Passwort fest (mind. 10 Zeichen), aktiviert sein Konto und kann sich danach mit **Telefonnummer + Passwort** anmelden.
6. Bestehende Benutzer mit E-Mail-Konto können weiterhin E-Mail + Passwort beziehungsweise E-Mail-Code verwenden.

## Technische Umsetzung
- Der Einladungsserver prüft bei Erstellung Auth-Session, Manager-Rolle, Zielperson und aktive Wohnungseigentümer-/Mieter-Zuordnung.
- Ein Token ist zufällig (256 Bit). In der Datenbank wird ausschließlich dessen SHA-256-Hash in **ay3_invite_tokens** gespeichert, nicht der Klartext-Link.
- Die Tabelle hat RLS ohne Zugriffsrechte für normale Benutzer. Die Einlösung erfolgt über eine **service_role-only** PostgreSQL-RPC mit Row-Locks; nach erfolgreicher Einlösung wird der Token verbraucht und die Wohnung zugeordnet.
- Zur Kompatibilität mit Supabase Auth wird für Bewohner ohne E-Mail ein **nicht zustellbarer interner Identifikator** nach dem Schema `resident-<Telefonziffern>@ayapark2.invalid` angelegt. Das ist keine E-Mail des Bewohners und es wird dorthin keine Mail versendet. Das Nutzerformular verlangt keine E-Mail.
- Der Einladungslink, manuell vom Superadmin an die geprüfte Telefonnummer versandt, ist der Besitznachweis für die erste Aktivierung. **Er ist kein technischer SMS- oder WhatsApp-OTP-Nachweis.** Keine Links an unbekannte oder ungeprüfte Nummern senden.
- Eine aktivierte Person kann nicht über die Einladung erneut mit einem fremden Konto verknüpft oder umregistriert werden.
- Alte, bisherige HMAC-Einladungslinks aus der E-Mail-Version werden durch die Umstellung ungültig. Verwaltung kann neue Links ausstellen, sofern noch kein Konto aktiviert ist.

## Bekannte Einschränkung
Bei telefonbasierten Konten funktioniert der bisherige E-Mail-basierte Link **„Passwort vergessen“ nicht**. Ein eigener geprüfter, managerveranlasster Wiederherstellungsprozess per neuem Einmal-Link fehlt noch. Derzeit sollte die Verwaltung mit der Vergabe neuer Telefonnummern-Zugänge erst nach interner Vereinbarung über Kontowiederherstellung beginnen.

## Abnahme
- GitHub Actions: Node-Regressionssuite, Edge-Deno-Typecheck, sichere Live-Smokechecks (ungültiger Token und nicht angemeldete Erstellung).
- Offen ohne autorisierten Testbewohner: echte Kontoaktivierung, anschließender Passwortlogin und mobile Browser-E2E-Tests.
- Es werden während CI keine Bewohnerkonten erstellt, keine WhatsApp-Nachrichten versandt und keine echten Einladungstoken ausgegeben.
