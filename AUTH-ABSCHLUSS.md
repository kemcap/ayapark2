# AYAPARK 2 – Abschlussstand der Auth-Entwicklung

26.10.2026 · Branch `ayapark-v2` · Entwurfs-PR #37

## Ergebnis und Abgrenzung

Die lokale Entwicklungsbearbeitung ist abgeschlossen und zum Review vorbereitet. **Keine produktive Veröffentlichung, keine produktive SQL-/Auth-Änderung, keine Änderung vorhandener Benutzerkonten.** Das Gesamtziel ist noch nicht als Ende-zu-Ende funktionsfähig abgenommen: Eine isolierte echte Supabase-Auth-Umgebung und Gerätetests standen nicht zur Verfügung. Es wäre falsch, diese Umsetzung bereits als produktionsfertig zu bezeichnen.

## Umgesetzt

- Gemeinsame Telefon-/E-Mail-Klassifizierung, bestehende E-Mail-Anmeldung erhalten. Verifizierte Telefonnummern können serverseitig auf dieselbe vorhandene Auth-ID abgebildet werden; keine automatische Zuordnung nur anhand eines Namens oder Kontakts.
- Gemeinsame neue Passwortregel: 6–256 Zeichen, keine Zeichenklassen, kein stilles Kürzen. Die produktive Backend-Konfiguration wurde nicht umgestellt und konnte nicht vollständig ausgelesen werden.
- Bestehende dauerhafte Sitzungsverwaltung beibehalten. Kein zweiter persistierender Auth-Client im normalen Login.
- Eigene 7-Tage-Einladungen: Hash statt Klartexttoken, einmaliges Einlösen, Widerruf/Neuausstellung, serverseitige Rechteprüfung. Telefon **oder** E-Mail für Erstaktivierung; manueller WhatsApp-Button bleibt erhalten, E-Mail-Einladungen können manuell kopiert werden. Keine automatische Zustellung.
- Zugangsanfragen mit genau einem Kontakt, optionaler Wohnung, Drosselung, neutraler Bestätigung, geschützter Superadmin-Liste, Zählern, Status, Pagination, Personenabgleich und Audit. Eine Anfrage erzeugt weder Konto noch Wohnungsrecht.
- Bestehende E-Mail-Recovery bleibt getrennt. Eingaben und verifizierte Recovery-Sitzung bleiben nach vorübergehendem Speicherfehler nutzbar. Persönlicher Hash im URL-Fragment wird sofort entfernt.
- Ausgeschaltete administrative Wiederherstellung für vorhandene Bewohnerkonten, auch Telefon-Alias-Konten ohne echte E-Mail: Identitätsprüfung dokumentieren, vorhandene Konto-ID prüfen, nativen Recovery-Link erzeugen und vertraulich manuell zustellen. Keine Einsicht in Passwörter und kein Rollenwechsel. Verwaltungskonten ausgeschlossen.
- Ausgeschalteter Passkey-Testadapter mit Origin-/Umgebungssperre, Nutzerabbruch und Schutz gegen verspätete Session-Antworten. Kein sichtbarer produktiver Passkey-Login.
- Deutsche/türkische Texte für die ergänzten Oberflächen. Bestehendes Design und Dialogmuster verwendet; keine grundlegende Navigation ersetzt.

## Integration in Phase 8

`supabase/auth-phase8.sql` erweitert die geschützte Einladungstabelle um eine alternative E-Mail und eine Genau-ein-Kontakt-Prüfung. Der bestehende Einlösevorgang bleibt auch für Telefon kompatibel; bei E-Mail wird kein Telefon erfunden oder verifiziert. Ein bereits existierendes Auth-Konto mit dieser E-Mail wird nicht ungeprüft übernommen: Der Auth-Dienst muss die Neuanlage ablehnen, anschließend ist ein gesonderter Kontenabgleich erforderlich.

Die Edge Function prüft die E-Mail des tatsächlich erstellten Kontos. Bei fehlgeschlagener Einlöseantwort prüft sie, ob dieselbe Konto-ID bereits verknüpft ist. Sie löscht **niemals blind** das Konto nach einem unklaren Transaktionsausgang. Ungeklärte Konten verbleiben für die gezielte Betreiberprüfung; es gibt noch keinen automatischen Reconciliation-Worker. Request-Bytes werden bereits während des Lesens begrenzt.

## Testnachweise

- **227 JavaScript-Tests bestanden** (Regressionen, Recovery, Anfrage- und Recovery-Handler mit simulierten Abhängigkeiten, Passkey-Adapter, Importidentitäten, Einladungsbeschriftungen).
- **86 isolierte SQL-Prüfungen bestanden**: Phase 3: 18; Phase 4: 20; Phase 5: 19; Phase 6: 14; integrierte Entwürfe Phase 8: 15. Synthetische PostgreSQL-Daten mit PGlite; keine realen Bewohner.
- SQL prüft Rechte/Ausschlüsse, Ablehnung unfreigegebener Aktionen, Einmaligkeit, Ablauf/Widerruf im Telefonablauf, alternative E-Mail ohne Telefon, Statuswechsel, Audit und Erhalt von Konto-/Wohnungszuordnungen.
- `git diff --check` und Browser-Modulgraph geprüft. Edge-Typechecks werden im PR durch Deno ausgeführt; Deno ist lokal nicht installiert.
- Frühere Finanzprüfungen bleiben im Audit dokumentiert; keine neue Behauptung eines produktiven Finanztests.

| Geforderter Ablauf | Tatsächlich geprüfter Stand |
|---|---|
| 1 E-Mail-Anmeldung | Automatisierte Client-Regression; echter Auth-Login offen |
| 2 Telefonanmeldung | Client/Handler und SQL geprüft; echte Verknüpfung/GoTrue offen |
| 3 Falsches Passwort | Simulierte Fehler geprüft; echte Schutzkonfiguration offen |
| 4 Genau 6 Zeichen | Gemeinsame Regel und Recovery-Request geprüft; echter Backend-Test offen |
| 5 Keine Sonderzeichen | Gemeinsame Regel geprüft; produktives Backend unverändert |
| 6 Einladung erstellen | SQL-Rechte, Laufzeit, Neuausstellung geprüft; echte Auth-Ausführung offen |
| 7 WhatsApp teilen | URL-/Texttests; kein tatsächlicher Versand |
| 8 Gültigen Link öffnen | Logik-/SQL-Nachweise; Browserdurchlauf offen |
| 9 Erstmals Passwort | Client-/SQL-Bausteine; echter Auth-Ende-zu-Ende-Test offen |
| 10 Zweite Linknutzung | Isolierter SQL-Test bestanden |
| 11 Ablauf | Isolierter Telefon-SQL-Test bestanden |
| 12 Widerruf | Isolierter Telefon-SQL-Test bestanden |
| 13 Zugang anfordern | Handler/Payload und SQL geprüft; Browser offen |
| 14 Dashboard-Anzeige | Escaping, Texte, Zähler und SQL geprüft; Browser offen |
| 15 Zuordnung/Freigabe | SQL geprüft; Person/aktive Wohnungsrolle Voraussetzung |
| 16 Ablehnen | SQL inkl. Widerruf bestehender Einladung geprüft |
| 17 Keine ungeprüften Wohnungsrechte | Isolierte SQL-Prüfungen bestanden; echte RLS/GoTrue-E2E offen |
| 18 Recovery | Client/Handler/SQL geprüft; SMTP, native Laufzeit, Replay und globale Session-Wirkung offen |
| 19 Sitzung nach Neuladen | Vorhandene automatisierte Sessiontests; echter Browser/PWA offen |
| 20 Passkey | Adapter mit simuliertem SDK geprüft; Flag aus; reale Integration/Geräte offen |

**Nicht durchgeführt:** tatsächliche neue Bildschirmprüfung bei 320/375/390/430/768/1024/1440 px, vollständiger WCAG-2.2-AA-Audit der Ergänzungen, Android/iPhone/Windows/macOS/PWA-Biometrie, SMTP-Ende-zu-Ende, Mehrprozess-Rennen zwischen GoTrue/PostgREST. Kein WCAG-Zertifikat, keine erfundenen Gerätetests.

## Verbleibende Freigabeblocker

1. Separates Supabase-Testprojekt oder lokales vollständiges Supabase mit echten Auth-/PostgREST-Diensten und überprüftem Restore bereitstellen. Der vorhandene Konfigurationsausschnitt ist keine laufende Testumgebung.
2. Entwurfs-SQL in Reihenfolge bestehende Einladungstabelle → Phase 3 → 4 → 5 → 6 → 8 testen und mit Supabase CLI in versionierte Migrationen überführen. Keine ausgedachten Migrationszeitstempel. Grants/RLS/Advisors gegen echtes PostgreSQL/Supabase prüfen.
3. Auth-Minimum 6, deaktivierte freie Registrierung, SMTP, Redirect-Allowlist, Session-Rotation und Rate-Limits überprüfen. Kompromittierte-Passwort-Prüfung ist nicht aktiviert; keine entsprechende Schutzwirkung behaupten. Für Verwaltungsrollen stärkeres Verfahren/MFA entscheiden.
4. Trusted-Ingress-IP für die Telefon-/Anfrage-Drosselung tatsächlich beweisen. Ohne den ausdrücklich gesetzten Vertrauensschalter verweigert der öffentliche Endpunkt die Funktion. Nicht einfach einen beliebigen Forwarded-Header als echt behandeln.
5. GoTrue-Kontoanlage und SQL-Einlösung sind keine gemeinsame Transaktion. Abbruch/Timeout kann ein unzugeordnetes Auth-Konto hinterlassen. Gezielten Betreiberabgleich und Wiederanlauf/Quarantäne unter realen Fehlerfällen testen; keine automatische Löschung oder Wiederverknüpfung.
6. Native Recovery-Gültigkeit, Ersatz/Widerruf, Mehrfachnutzung und Ablauf prüfen. Aktive JWTs können bis Ablauf weiter existieren; kein sofortiger globaler Widerruf versprochen.
7. Aufbewahrungs-/Bereinigungsjobs für Zugangsanforderungen, Audit und Rate-Limit-Daten festlegen und isoliert prüfen. Derzeit kein automatischer produktiver Löschjob.
8. Browser-, Mobil-, Accessibility- und tatsächliche Ende-zu-Ende-Tests aus der Matrix durchführen. Für Passkeys zusätzlich fest gepinnte offizielle SDK-Testhost-Integration und echte Geräte; bis dahin ausgeschaltet lassen.

## Bereitstellung und Rollback

Alle neuen Feature-Schalter sind aus. Kein Merge oder Pages-Deployment aus diesem Auftrag. Die bisherige produktive Version bleibt nutzbar. Kein neuer öffentlicher Auth-Preview-Host wurde veröffentlicht; alte Audit-Sites sind kein aktueller Auth-Nachweis.

Vor einem späteren Rollout: Stand sichern, Backup/Restore belegen, Migrationen nur additiv im Test prüfen, echte Testmatrix abnehmen, explizite Produktionsfreigabe einholen. Danach kontrolliert Backend und Frontend aktivieren und Pages prüfen. Bei Fehlern Frontend-/Server-Schalter deaktivieren und auf den vorherigen geprüften Frontend-Stand zurückstellen. Produktive Tabellen und Konten nicht als Rollback löschen. Neu verknüpfte reale Konten erfordern einen dokumentierten Datenabgleich statt pauschalem Down-SQL.

Referenzen: `AUTH-PHASE3.md` bis `AUTH-PHASE7.md`. Dieser Abschlussstand ergänzt und überholt deren damalige offene Punkte: reine E-Mail-Einladung ist jetzt im Entwicklungsentwurf ergänzt; die frühere automatische Löschkompensation wurde entfernt. Die genannten Freigabeblocker bleiben verbindlich.
