# AYAPARK 2 – persönliche Einladungen per WhatsApp (Entwicklungsbranch)

## Status
Implementiert nur im separaten Branch feature/whatsapp-invites-20261026 auf Basis von main (V5.1).
Nicht veröffentlicht, keine Live-Migration, keine produktiven Konten angelegt, keine Nachrichten verschickt.

## Ablauf für die Verwaltung
1. Unter Kişiler / Personen erscheint bei einer Person mit aktueller Eigentümer-/Mieter-Beziehung für Superadmins die Schaltfläche Davet et / Einladen bzw. Davet linki / Link erneuern.
2. Hinterlegte E-Mail und Telefonnummer prüfen. Die WhatsApp-Zielnummer und der Einladungstext lassen sich vor dem Versenden bearbeiten. Die Dialognummer verändert die Stammdaten nicht.
3. Freischaltung explizit bestätigen. Link erstellen prüft zuerst den Einladungsserver und provisioniert, falls notwendig, das bereits bestehende serverseitig abgesicherte Bewohnerkonto (noch unbestätigt). Kein automatischer E-Mail- oder WhatsApp-Versand.
4. Der Server erzeugt einen HMAC-signierten, 48 Stunden gültigen personenbezogenen URL-Token. Der Token zeigt nur Einladungshinweise, Vornamen und Wohnungskennung. Er ist keine authentifizierte Session und gewährt allein keine Datenrechte.
5. Der Superadmin kopiert den Link oder den Text oder öffnet WhatsApp per wa.me mit vorausgefülltem Text. Nichts wird automatisch verschickt.
6. Empfänger öffnet den Link, tippt Hesabımı etkinleştir / Konto aktivieren, gibt seine hinterlegte E-Mail ein und bestätigt den E-Mail-Code. Erst danach kann er ein Passwort setzen und den freigegebenen Zugang benutzen.
7. Abgelaufene Links können neu erzeugt werden. Ein bestehender Zugang wird dadurch nicht automatisch gelöscht.

## Sicherheit
- Supabase Edge Function: create prüft gültige Auth-Session, Manager-Rolle, aktuelle Wohnungsbeziehung und bestehendes Auth-Konto; inspect prüft HMAC, Ablauf und aktive Beziehung.
- HMAC-Schlüssel ausschließlich als Edge Secret AY2_INVITE_SIGNING_KEY: mindestens 32 zufällige Zeichen, niemals in GitHub oder Browser-Code speichern.
- supabase/config.toml setzt nur für ay3-whatsapp-invite die Option verify_jwt = false, weil inspect ohne Session funktionieren muss. Für create validiert die Function den Bearer-Token explizit serverseitig. Andere Functions bleiben unberührt.
- Link ist manipulationsgeschützt und läuft nach 48 Stunden ab, aber ist nicht einmalig einlösbar. Vorname und Wohnungskennung sind für jeden Linkbesitzer sichtbar. Eine Daten-Sitzung erfordert weiterhin E-Mail-OTP.
- Keine browserseitigen Service-Role-Credentials. no-store und no-referrer schützen Einladungsdaten bei Übertragung.
- Entfernte Wohnungsbeziehung macht die Vorschau ungültig. Bereits existierende Kontoberechtigungen müssen getrennt durch den regulären Prozess entzogen werden.

## Vor Produktivfreigabe
1. Edge Function ay3-whatsapp-invite aus diesem Branch in Supabase deployen, verify_jwt=false nur für diese Function verifizieren und AY2_INVITE_SIGNING_KEY als Secret setzen.
2. Vorhandene Benutzerzuordnung ay3-user-access und zugehörige RPCs kontrollieren. Finanzdaten, RLS und das produktive Schema werden durch diese Branch nicht verändert.
3. Supabase Auth URL Configuration, Magic-Link-Template und SMTP-Zustellung anhand AUTH-SETUP.md überprüfen.
4. Mit autorisierten Testkonten folgende Fälle prüfen: Erstaktivierung, Link erneuern, fehlende E-Mail, ungültiger oder abgelaufener Token, beendete Beziehung, Staff-Rechte, falsches E-Mail-OTP, kein Datenzugriff nur durch Link.
5. npm test und manuelle Desktop-/Android-/iOS-Tests für modale Darstellung, Tastatur, Kopieren und WhatsApp durchführen. Nicht als bestanden markieren, bevor die Tests ausgeführt wurden.
6. Erst nach Review und ausdrücklicher Freigabe in main übernehmen. Vorher noch keine Links an reale Bewohner versenden: die Produktions-App enthält die Einladungsansicht noch nicht.

## Grenzen
Keine WhatsApp-Business-API, keine automatische Nachricht, kein SMS-Code, kein WhatsApp-Login, keine neuen Finanzdaten und keine automatische Konto-/Wohnungszuordnung über den Link.