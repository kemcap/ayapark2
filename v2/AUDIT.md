# Ayapark 2 V2 – Code-, Design- und Datenbankprüfung

Stand: 20.10.2026. Geprüft: Quellstand des Branches `ayapark-v2`, bestehende Supabase-Tabellen, Policies, privilegierte Funktionen und Sicherheitsberater. Keine Schemaänderungen, Geschäftsdatenänderungen, Einladungen oder Veröffentlichung der Live-Anwendung.

## Befunde nach Priorität

| Priorität | Befund / Beleg | Auswirkung und nächster Schritt |
| --- | --- | --- |
| Hoch | `ayapark_claims`: SELECT-Policy `read_public_ayapark_claims` gilt für `anon, authenticated` mit `USING (true)`. Kontrollabfrage unter `SET LOCAL ROLE anon` ergab **14 sichtbare Datensätze**. `supabase/index.html` lädt Beträge, Personenart, Inkassostatus und Zahlungs-/Nachrichtenstatus ohne Anmeldung. | Namen liegen getrennt in `ayapark_private`, aber finanzielle Einzeldaten sind trotzdem öffentlich. Vor Produktivfreigabe von V2 auf berechtigte Zugriffe begrenzen. Nicht geändert, weil die bestehende Live-Anwendung diese Policy nutzt. |
| Hoch vor Freigabe | Neues Rollenmodell ist noch nicht in der Datenbank umgesetzt. `site_staff_memberships` erlaubt `manager`, `deputy`, `auditor`. `site_can_manage` erlaubt Manager und Stellvertreter gemeinsam. Individuelle Zusatzrechte fehlen. | V2 ordnet Manager der Super-Admin-Ansicht und Stellvertreter/Prüfer der Verwaltungsansicht zu. Das ist eine Anzeigezuordnung; bestehende Serverrechte bleiben maßgeblich. Keine Schreibfunktionen freigeben, bevor die gewünschten Zusatzrechte serverseitig umgesetzt und getestet sind. |
| Hoch für fachliche Korrektheit | Es gibt 12 öffentliche Tabellen, darunter Wohnungen, Personen, Rollen, Altforderungen und Auditdaten, aber keine eigenständigen Bank-, Sollstellungs- und Zahlungszuordnungstabellen. | Altforderungen ersetzen kein Bankbuch. V2 zeigt bei echter Verbindung keine erfundenen Geldbeträge an. Finanzmodell mit Zahlungen, Teilzahlungen, Zuordnungen, Stornos und Bankreferenzen entwickeln; kontrollierte Übernahme getrennt planen. |
| Mittel | Supabase-Berater meldet vier Triggerfunktionen als anonym ausführbare `SECURITY DEFINER`-Funktionen. 14 solche Funktionen sind für angemeldete Rollen ausführbar. | Triggerfunktionen können normalerweise nicht direkt als gewöhnliche SQL-Funktionen ausgeführt werden; die Meldung allein beweist keinen ausnutzbaren Zugriff. Die geprüften Verwaltungs-RPCs enthalten Rechteprüfungen und einen festgelegten `search_path`. Unnötige EXECUTE-Rechte dennoch gezielt entziehen; erforderliche RLS-Helfer nicht pauschal sperren. |
| Mittel | Supabase-Berater: Schutz gegen bekannte kompromittierte Passwörter deaktiviert. | Verfügbarkeit im aktuellen Tarif prüfen und den Schutz aktivieren. Keine Auth-Einstellungen geändert. |
| Mittel | `supabase/functions/site-invite-resident/index.ts` verwendet `npm:@supabase/supabase-js@2` ohne genaue Versionsbindung. Konto-Suche ist auf 1.000 Nutzer begrenzt. E-Mail-Versand und Zuweisung sind getrennte Schritte. | Version fixieren; vor breiterem Einsatz wiederholbare Einladungen, gleichzeitige Aufrufe und den Fehler nach bereits versandter Einladung testen. Kein nachgewiesener Rechte-Bypass: JWT und Manager-/Stellvertreter-Mitgliedschaft werden geprüft. |
| Mittel | Hauptverwaltung mischt Layout, Auth, Personenverwaltung und Auditlog in einer etwa 1.100-zeiligen HTML-Datei. Keine versionierten Schema-Migrationen oder vorhandene Tests im geprüften Repository. | Hoher Aufwand für Regressionen und Nachvollziehbarkeit. V2 trennt Darstellung, Domänenlogik und Datenzugriff; erste Tests ergänzt. Bestehenden Code und Funktionen unverändert gelassen. |
| Design / Korrektheit | Alter V2-Entwurf zeigte 72.000 TL Einnahmen und 23.500 TL Ausgaben, obwohl seine sichtbare Buchungsliste nur 10.800 TL Einnahmen und 5.500 TL Ausgaben enthielt. Prozent- und Kategorieanzeigen waren separat fest eingetragen. | In V2 werden alle Beispielberichte aus einem Datenbestand berechnet: 42.900 TL Anfang + 10.800 TL Einnahmen − 5.500 TL Ausgaben = 48.200 TL Ende. Offene Beispiel-Forderungen: 18.200 TL, sechs Wohnungen. |
| Design / Bedienung | Nicht klickbare Wohnungskacheln, kein durchgehender Detailablauf, wenig visuelle Gewichtung und ein selbst gebauter Importdialog ohne native Fokusbegrenzung. | Neue visuelle Hierarchie, klickbare Wohnungsdetails, klare Rollenansichten, mobile Navigation, Such-/Statusfilter, native Dialoge und sichtbare Fokusmarkierungen umgesetzt. |

## Bereits schützende Eigenschaften

- RLS ist bei allen zwölf geprüften öffentlichen Tabellen eingeschaltet.
- Anonymer SELECT auf `site_units` wurde mit fehlender Tabellenberechtigung abgewiesen.
- Test als `authenticated` ohne Nutzer-Claim: **0 sichtbare Wohnungen und 0 sichtbare Personen**.
- Personenname und Identitätsnotizen der Altlösung liegen in einer separat geschützten Tabelle. Das beseitigt den öffentlichen Zugriff auf einzelne Forderungsbeträge nicht.
- Fehlende Policies auf `ayapark_admins` sind hier kein bestätigter Fehler: Der Zugriff erfolgt über den gekapselten Admin-Prüfhelfer. Nicht mit einer offenen Policy „reparieren“.
- Der im Frontend vorhandene `sb_publishable_...`-Schlüssel ist ein öffentlicher Client-Schlüssel, kein Service-Role-Schlüssel. RLS und Datenbankrechte müssen trotzdem jeden Zugriff begrenzen.

## Änderungen in diesem Entwicklungsstand

- Vollständiger Neuaufbau von `v2/`: warmes Hellgrau, dunkles Grün, klare Überschriften und priorisierte Aufgaben.
- Übersicht, Wohnungen, Forderungsansicht, Bankübersicht, konsistente Beispielberichte und Rolleninformation.
- Beispielmodus mit drei Ansichten; echte Verbindung mit bestehendem Supabase-Login. Rollenwahl nur im Beispielmodus.
- Echte Geschäftsdaten ausschließlich lesbar. Datenadapter fragt nur fünf benötigte `site_*`-Tabellen und keine privaten Kontakt-/Identitätsdaten ab. Kein Zugriff auf öffentliche Altforderungen.
- Tokens ausschließlich im Speicher des aktuellen Tabs; keine geteilten Local-Storage-Schlüssel mit der alten Anwendung. Token-Erneuerung, Abbruchschutz und lokaler Server-Logout.
- Native Dialoge, zugängliche Bezeichnungen, Tastaturfokus, reduzierte Bewegung und responsive Layoutregeln.
- CSV ausschließlich lokale Vorschau mit Schema-, Datums-, Betrags- und Größenprüfung sowie Hinweisen auf Wiederholungen innerhalb der Datei. Noch kein Import, kein Abgleich gegen Bankreferenzen.
- Strenge Content Security Policy ohne externen Skriptanbieter oder Inline-Skripte.

## Validierung und Grenzen

- `node --test v2/tests/*.test.mjs`: **11 Tests bestanden**. Summen, Rollenauswahl, mehrere eigene Wohnungen, CSV-Sonderfälle, HTML-Escaping, API-Lesepfade, parallele Token-Erneuerung und Abbruch eines Logins.
- `node --check` für alle drei JavaScript-Module bestanden.
- HTML-Verweise und DOM-IDs statisch geprüft; `git diff --check` bestanden.
- Live-Datenbank ausschließlich mit lesenden Metadatenabfragen und kontrollierten Rollenabfragen geprüft. Keine personenbezogenen Datensätze in diesen Bericht oder den Quellcode übernommen.
- **Kein visueller Browsertest:** Die unterstützte Browser-QA ist in dieser Umgebung nicht verfügbar. Desktop-/Mobilansicht, Drucklayout und Screenreader-Verhalten müssen vor Freigabe im Browser geprüft werden.
- **Kein echter End-to-End-Login:** Keine Anmeldedaten oder Testkonten verwendet. Datenbankvertrag geprüft, Login-/Rollenabläufe mit simulierten API-Antworten getestet. Separate Manager-, Stellvertreter-, Prüfer- und Bewohnerkonten müssen gegenseitige Zugriffe vor Freigabe verifizieren.
- V2 ist ein Entwicklungsstand mit lesender Bestandsanbindung, keine fertig migrierte Finanzverwaltung. Personen bearbeiten, Einladungen, Zahlungsbuchungen und individuelle Zusatzrechte sind hier noch nicht implementiert.
- Die hochgeladenen Konto-/Verwaltungs-PDFs wurden nicht importiert. Finanzielle Datenübernahme ist ein eigener, prüfbarer Schritt nach Festlegung des Datenmodells.

## Empfohlene Reihenfolge

1. Neues Design im Desktop- und Mobilbrowser prüfen und die Bedienabläufe abstimmen.
2. Eigenständige Testumgebung und reproduzierbare Schema-Migrationen einrichten; Rollen und Zugriffe mit getrennten Testkonten prüfen.
3. Öffentliche Altforderungs-Policy in einer abgestimmten Umstellung schließen und Funktionsrechte gezielt härten.
4. Bankbuch, Sollstellungen, Zahlungszuordnung und Nachvollziehbarkeit entwickeln.
5. PDF-/Bankdaten mit Vorschau, Dublettenprüfung und Abgleich übernehmen. Erst nach Abnahme über eine Live-Umstellung entscheiden.

## Supabase-Hinweise

- [Öffentlich ausführbare Definer-Funktionen](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Für angemeldete Nutzer ausführbare Definer-Funktionen](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Passwortschutz](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Der aktuelle Changelog wurde konsultiert. Die angekündigte Abschaltung veralteter TLS-1.2-Cipher am 10.11.2026 verlangt für diesen normalen Browser-HTTPS-Client keine eigene Implementierung; Unterstützung alter Browser separat prüfen.
