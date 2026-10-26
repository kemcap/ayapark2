# AYAPARK 2 – WhatsApp onboarding ohne E-Mail

## Ist-Problem
Die veröffentlichte Einladungsfunktion verlangt eine hinterlegte E-Mail und einen E-Mail-Code. Das widerspricht dem vereinbarten WhatsApp-first-Einstieg.

## Ziel
- Superadmin wählt eine aktuell zugeordnete Person; eine E-Mail ist nicht erforderlich.
- Superadmin prüft Telefonnummer, bestätigt die Zuordnung und versendet WhatsApp manuell.
- Einladungslink ist einmalig nutzbar, 48 Stunden gültig und bei Neuausgabe widerrufbar.
- Bewohner aktiviert sein Konto mit dem Link und legt sein Passwort fest, ohne E-Mail oder E-Mail-OTP.
- Später erfolgt Login über Telefonnummer und Passwort. Bestehende E-Mail-Logins bleiben funktionsfähig.
- Kontoübernahmen bestehender Benutzer durch neu ausgestellte Links müssen ausgeschlossen sein.
- Passwortwiederherstellung muss ohne E-Mail durch einen kontrollierten Verwaltungsablauf möglich sein.

## Sicherheit und Abnahme
Ein WhatsApp-Link allein beweist nicht zweifelsfrei Identität, wenn er weitergeleitet wurde. Ein kurzer Link mit serverseitigem Hash, einmaliger atomarer Einlösung, Superadmin-Prüfung, aktiver Wohnungszuordnung, Ratenbegrenzung, Widerruf und eindeutiger Bestätigung des Empfängers ist notwendig. Es darf keine falsche Behauptung stattfinden, dass die Telefonnummer technisch per SMS verifiziert wurde.

Vor der Live-Freigabe nachweisen:
- Einladung und erste Aktivierung ohne E-Mail.
- Unberechtigter Ersteller, ehemalige Person, falsches Ziel, abgelaufener und mehrfach verwendeter Link werden abgewiesen.
- Bestehende Konten und Berechtigungen bleiben unverändert.
- Telefonnummer/Passwort-Login, Sitzungswiederaufnahme und admin-kontrollierte Wiederherstellung funktionieren.
- Vollständige Regression, Mobil/Desktop und reale End-to-End-Tests bestanden.

## Status
Dieser Branch bereitet die Korrektur vor. Die Live-App nutzt derzeit noch den alten E-Mail-Aktivierungsflow. SQL-Vorarbeit ist NICHT auf die produktive Datenbank angewendet. Keine Freigabe ohne vollständige Implementierung und Test.
