# Persönliche Einladungen ohne WhatsApp-/SMS-Integration

Stand: 26.10.2026. Implementierung auf eigener Branch; noch nicht live aktiviert.

## Bedienung

Bei einer aktuell als Eigentümer oder Mieter zugeordneten Person erscheint für Superadmin „Einladen“ direkt beim Namen, auf der Personenkarte und im Personendialog. Ohne aktuelle Wohnungszuordnung erscheint zuerst der Hinweis zur Zuordnung. Bewohner und Verwaltung erhalten keine Einladungssteuerung. Vorschau- und Demomodus können keine echten Einladungen erzeugen.

„Einladen“ öffnet den Status und die Aktivierungsmethode. Standard ist **manuelle Freigabe ohne persönliche E-Mail und ohne Passwort**. Optional steht bei hinterlegter E-Mail eine Bestätigung per E-Mail-Code zur Verfügung. Link und vollständiger Einladungstext lassen sich kopieren; der Versand erfolgt selbst außerhalb der App. Es wird keine Nachricht automatisch über WhatsApp versandt und kein WhatsApp-Konto benötigt.

Status im Einladungsdialog: noch nicht eingeladen, eingeladen, Freigabe ausstehend, freigegeben, Zugang aktiv, abgelaufen oder widerrufen. „Status aktualisieren“ lädt den aktuellen Stand. „Neuen Link erstellen“ macht zuvor ausstehende Einladungen ungültig. Ein bereits aktiver Zugang kann auf demselben Konto erneut eingeladen werden, beispielsweise nach Geräteverlust; seine bestehenden Rechte werden nicht erweitert.

## Manuelle Freigabe

1. Superadmin erstellt und verschickt den persönlichen Link.
2. Bewohner öffnet ihn auf dem persönlichen Gerät und wählt „Aktivierung anfragen“.
3. Es erscheint ein achtstelliger Vergleichscode. Der Browser hält zusätzlich ein geheimes zufälliges Gerätekennwort nur im Arbeitsspeicher; es wird nicht angezeigt oder als Benutzerpasswort verwendet.
4. Superadmin prüft die Identität persönlich oder über einen Rückruf an die bereits gespeicherte Telefonnummer und gleicht den Bildschirmcode ab. Nur der Code allein ist kein Identitätsnachweis. Im Einladungsdialog bestätigt er die Prüfung ausdrücklich und gibt die Anfrage frei.
5. Bewohner wählt „Freigabe prüfen und anmelden“. Nur dieselbe freigegebene Anfrage kann den Zugang abschließen. Der Einladungslink allein genügt nicht.

Die Anfrage ist nach 30 Minuten nicht mehr abschließbar. Der Bildschirm muss auf demselben Gerät offen bleiben; Neuladen verliert das geheime Gerätekennwort. Dann erstellt der Superadmin einen neuen Link. Nach erfolgreicher Aktivierung bleibt die reguläre Sitzung gespeichert und wird wie die vorhandene Anmeldung erneuert. Nach Abmelden, gelöschtem Speicher oder Gerätewechsel benötigen Personen ohne E-Mail erneut eine geprüfte Einladung. Eine spätere Passkey-Anmeldung ist hier nicht implementiert.

## Optionaler E-Mail-Weg

Der Bewohner fordert einen Code ausschließlich an die bereits hinterlegte E-Mail an und gibt ihn auf der Einladungsseite ein. Die automatische Registrierung durch diesen Aufruf ist ausgeschaltet. Die erfolgreiche Supabase-Prüfung muss dieselbe vorbereitete Benutzer-ID liefern. Vorher entstehen keine neuen Wohnungsrechte.

Dafür wird die bestehende Supabase-E-Mail-Zustellung verwendet. Der Standard-Maildienst kann externe Empfänger beschränken; Zustellbarkeit und Kontingente sind separat zu prüfen. Dieser optionale Weg ist nicht pauschal als unbegrenzt kostenlos zugesichert. Die manuelle Freigabe benötigt keine versandte E-Mail, SMS oder WhatsApp-Nachricht.

## Konten und Rechte

Vorhandene Benutzer-IDs werden über die autoritative Personenverknüpfung bzw. exakt passende hinterlegte E-Mail wiederverwendet. Konflikte brechen ab, statt Konten automatisch zusammenzuführen. Mitarbeiterkonten werden nicht durch diesen Bewohnerweg angemeldet oder umgestuft.

Supabase Auth benötigt für diesen Sitzungsweg einen technischen Kontobezeichner. Bei einer neuen Person ohne E-Mail wird intern `resident-<Person-ID>@access.ayapark.invalid` verwendet. Das ist keine echte Mailbox, wird nicht in die persönliche E-Mail der Person eingetragen und erhält keine Nachrichten. Es ersetzt keine Identitätsprüfung. Ein bereits bestehendes Konto ohne E-Mail kann nicht still umgeschrieben werden; ein solcher Sonderfall wird zur manuellen Kontoprüfung abgewiesen.

Nur die aktuellen Eigentümer-/Mieterrollen werden bei der Erstellung festgehalten. Ändern sich diese vor Abschluss, muss neu eingeladen werden. Historische Zuordnungen, Vertreterrollen ohne Eigentümer-/Mieterrolle und fremde Wohnungen erhalten keine zusätzlichen Rechte. Vertreter können nicht heimlich als Eigentümer oder Mieter provisioniert werden. Bestehende inaktive Rechte werden nicht reaktiviert. Finanzdaten und bestehende Rollen bleiben durch die Einführung unverändert.

## Technische Sicherheit

- Zufälliger 256-Bit-Einladungsschlüssel im URL-Fragment, sieben Tage gültig, nach Aktivierung einmalig verbraucht; Datenbank speichert nur seinen Hash.
- Kein automatischer Verbrauch beim Öffnen: Linkvorschauen lösen keine Aktivierung aus.
- Kein Personenname, keine Wohnung und keine Finanzdaten werden an unbestätigte Besucher ausgegeben. Optional wird nur die E-Mail maskiert angezeigt.
- Private Einladungstabelle mit RLS, ohne Zugriff für anon/authenticated; öffentliche RPC-Hüllen sind SECURITY INVOKER und nur für service_role ausführbar. Privilegierte Auth-Abfragen liegen in zugriffsbeschränkten Funktionen im privaten Schema.
- Admin-Identität wird mit Auth.getUser geprüft, die Superadmin-Rolle zusätzlich in der Datenbank. Das Frontend allein erteilt keine Rechte.
- Freigabe und Abschluss prüfen die aktuelle Wohnungszuordnung erneut. Abschluss ist transaktional: Zuordnung, einmaliger Verbrauch und Audit entstehen gemeinsam.
- Das geheime Gerätekennwort wird vor der Speicherung gehasht. Eine zweite Anfrage kann eine ausstehende Anfrage nicht überschreiben. Nach Freigabe muss der Browser beides besitzen: Einladungsschlüssel und Geheimnis der geprüften Anfrage.
- Supabase generiert die Sitzung serverseitig erst nach Identitätsfreigabe; sie wird erst nach erfolgreichem Abschluss freigegeben. Interne Magic-Link-Token verlassen den Server nicht. Protokolle enthalten weder Einladungslinks noch Sitzungstoken.
- E-Mail: höchstens fünf Versandversuche pro Einladung, mindestens 60 Sekunden Abstand und zehn Codeprüfungen. Zusätzlich vorhandene Auth-Rate-Limits berücksichtigen. Es werden keine bezahlten Provider eingerichtet.
- Einladungswiderruf entzieht keinen bereits aktivierten Zugang und beendet keine bestehende Sitzung. Dafür die bestehende Zugangsverwaltung verwenden.

## Veröffentlichung

1. Bestehendes Schema mit dem getesteten Schema abgleichen und wiederherstellbare Sicherung prüfen.
2. Additiven SQL-Entwurf `supabase/resident-invitations.sql` auf der Zielumgebung prüfen und als saubere versionierte Migration übernehmen. Der aktuelle Schritt hat ihn ausschließlich lokal in isoliertem PGlite ausgeführt; keine neue produktive Migration wurde angewendet.
3. Edge Function `ay-resident-invites` veröffentlichen. Die Gateway-JWT-Prüfung muss für die öffentlichen Einladungsaktionen deaktiviert sein; Admin-Aktionen prüfen ihre JWTs selbst. Standard-Supabase-Secrets bleiben ausschließlich serverseitig.
4. `RESIDENT_INVITES_ENABLED=true` erst setzen, wenn SQL und Frontend bereitstehen. Ohne diesen Schalter bleibt der Endpunkt gesperrt.
5. Neue Frontenddateien zusammen mit `app.mjs`, `people-ui.mjs` und Übersetzungen veröffentlichen. Bestehende E-Mail-Anmeldung bleibt erhalten.
6. Mit einer ausdrücklich gewählten echten Testperson manuelle Freigabe und Sitzungswiederherstellung prüfen. Optional E-Mail-Zustellung separat testen. Es wurden keine echten Konten erstellt oder Einladungen versandt.

Es sind keine Änderungen an globalen Supabase-Auth-Providern und kein zusätzliches Supabase-Projekt erforderlich. Nutzung bleibt den vorhandenen Hosting-/Supabase-Kontingenten unterworfen; kein neuer kostenpflichtiger Versanddienst.

Rückfall: Schalter deaktivieren und Einladungsbuttons ausblenden. Bereits aktivierte Konten und ihre bestehenden Rechte nicht automatisch löschen. Private Einladungs-/Auditnachweise behalten; keine Finanzdaten zurücksetzen.

## Prüfung

Automatische JavaScript- und PostgreSQL-Tests decken Rollen, Zustandsübergänge, fehlende Zuordnung, Identitätskonflikte, falsche Codes/Identitäten, Zustimmung, Widerruf, Ablauf, Wiederholung und verweigerte Sitzungsausgabe ab. Keine Browserprüfung und keine echten E-Mail-/Gerätetests. Teststand: 200 JavaScript-Tests, 120 bestehende SQL-Tests, 50 V5-SQL-Tests und 43 neue Einladungs-SQL-Prüfungen bestanden (413 insgesamt).
