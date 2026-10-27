# Phase 6 – Passwortverwaltung (Entwicklung, 26.10.2026)

## Änderungen

- E-Mail-Wiederherstellung bleibt vom erstmaligen Einladen getrennt. Gültige Recovery-Sitzung bleibt bei einem vorübergehenden Speicherfehler nutzbar; eingegebene Passwörter bleiben bis Erfolg, Navigation oder Schließen erhalten. Die Meldung verlangt keine Sonderzeichen oder Zeichenklassen.
- Persönlicher Recovery-Hash kann im URL-Fragment übergeben werden und wird vor dem ersten Netzaufruf aus der Adresszeile entfernt. Kein Hash im Seitenabruf/Referrer; die Seite hat `no-referrer`.
- Neuer, standardmäßig ausgeschalteter Superadmin-Ablauf im Personenverzeichnis: „Zugang wiederherstellen“, Notiz zur tatsächlichen Identitätsprüfung, ausdrückliche Bestätigung, Link erstellen, manuell kopieren. Kein automatischer Versand.
- Serverseitige Autorisierung prüft den Manager der konkreten Anlage und die vorhandene Person/Auth-Zuordnung. Konten mit einer Verwaltungsrolle sind aus diesem Bewohnerverfahren ausgeschlossen. Autorisierung und erfolgreiche Linkausgabe werden ohne Token protokolliert.
- Der Server erzeugt ausschließlich einen nativen Supabase-Link vom Typ `recovery` zum bestehenden Konto (auch interne Telefon-Alias-Adresse). Er prüft die zurückgelieferte Auth-ID erneut. Er legt kein Konto an, setzt kein Passwort und verändert keine Rolle oder Wohnung.
- Bei geändertem Telefonnummernfeld wird ein zuvor erzeugter Einladungslink im Dialog verworfen, damit er nicht versehentlich an eine andere Nummer geteilt wird. Erst das Erzeugen eines neuen Links widerruft den bisherigen Link serverseitig.

## Konfiguration und Grenzen

`ENABLE_ADMIN_RECOVERY=false` im Frontend; Edge ebenfalls erst bei `ENABLE_ADMIN_RECOVERY=true`, Service-Schlüssel, Rate-Secret >=32 Zeichen, `AY_AUTH_ALLOWED_ORIGINS` und exakt gesetzter `AY_AUTH_RESET_URL` aktiv. Keine Konfiguration oder SQL auf Produktion angewendet. Entwurf `supabase/auth-phase6.sql` nach Phase 3 nur isoliert prüfen; vor einem Release mit der CLI als Migration erfassen.

Native Recovery-Gültigkeit wird von Supabase bestimmt; die sieben Tage gelten für die eigenen **Einladungen**, nicht für Recovery. Tatsächliche Auth-Einstellungen, SMTP, Linkersetzung, Replay-Schutz und Ende-zu-Ende-Sitzungswiderruf müssen in isoliertem Auth getestet werden. Ein ausgelieferter Recovery-Link ist ein Anmeldegeheimnis: ausschließlich nach Identitätsprüfung vertraulich zustellen. Admin kann das alte oder neue Passwort nicht lesen.

Dieses Verfahren bietet derzeit keinen eigenen Widerruf einzelner Recovery-Links; dafür muss vor Produktion das native Ablauf-/Ersetzungsverhalten verifiziert oder eine zusätzliche Tokenhülle gebaut werden. Ein noch gültiges Access-JWT kann nach Sitzungswiderruf bis zu seiner Ablaufzeit existieren. Kein behaupteter sofortiger globaler Widerruf.

## Nachweise

220 JavaScript-Tests bestanden, darunter sechs neue Edge-Handler-Tests und zwei zusätzliche Recovery-Tests. 14 synthetische SQL-Prüfungen bestanden: fehlende Rechte/Bestätigung, unverknüpfte Personen, Verwaltungskonten, falsche Ziel-ID, Audit und Erhalt der Zuordnungen. Kein echter E-Mail-Versand, kein produktiver Passwortwechsel, kein vollständiger Auth-/Browserdurchlauf.
