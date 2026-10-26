# Phase 7 – Passkey-Pilot (ausgeschaltet)

Stand 26.10.2026: Die aktuelle Supabase-Dokumentation kennzeichnet Passkeys als **experimentell**, verlangt `supabase-js >=2.105.0` und die ausdrückliche Client-Option `experimental.passkey=true`. Der Changelog nennt die Funktion Beta; für die Umsetzung gilt die strengere Dokumentationskennzeichnung.

## Implementierter Baustein

`passkey-pilot.mjs` ist ein isolierter, injizierbarer Adapter für die offiziellen Methoden `registerPasskey` und `signInWithPasskey`. `ENABLE_PASSKEY_LOGIN=false` ist der zentrale Standard. Zusätzlich verlangt er eine ausdrücklich isolierte Umgebung, HTTPS, eine Origin-Freigabeliste und WebAuthn-Unterstützung. Die produktive GitHub-Origin ist gesperrt. Registrierung verlangt ein bereits freigeschaltetes, angemeldetes Konto; der Testhost muss dessen Prüfung liefern. Passwortanmeldung wird nicht verändert.

Der SDK-Client persistiert keine Sitzung und erneuert sie nicht im Hintergrund. Er übergibt eventuelle rotierte Sitzungstokens zurück an den vorhandenen API-Client. Login verifiziert die erhaltene Identität beim Auth-Server, bevor die vorhandene Sitzung übernommen wird; verspätete Antworten nach Abmelden können sie nicht wiederherstellen. Abbrechen bleibt ein Fehler ohne automatische Passwortanmeldung.

## Bewusste Grenze

Kein Passkey-Button in der Anwendung, keine SDK-Abhängigkeit oder Auth-Konfiguration hinzugefügt. Für den echten isolierten Pilot muss der Testhost die offizielle SDK-Version **2.105.0** fest einbinden und `createClient`, Testprojekt-Konfiguration und serverseitig geprüfte Kontofreigabe injizieren. Der Adapter ist kein fertiger, auf Geräten validierter Login. Ein bloßes Einschalten des Flags macht ihn nicht produktionsbereit.

WebAuthn-RP-ID ist die Testdomain, kein URL-Pfad. Kein Experiment auf gemeinsam genutztem `kemcap.github.io` und keine produktive Aktivierung. Kein Zugriff auf biometrische Rohdaten durch die Anwendung.

## Prüfungen

Sechs automatisierte Adaptertests mit simuliertem SDK: deaktiviert/ungeeignet, Kontofreigabe, Sessionübergabe, Benutzerabbruch, verspätete Antwort und falsche Identität. **Nicht ausgeführt:** Android/Chrome, iPhone/Safari, Windows, macOS, PWA, echte Geräte-PIN, Gerätewechsel, authentikatorseitige Registrierung oder echter Supabase-Challenge-Replay. Diese Tests sind ausdrücklich offen.

Quellen: https://supabase.com/docs/guides/auth/passkeys und https://supabase.com/changelog.md (26.10.2026).
