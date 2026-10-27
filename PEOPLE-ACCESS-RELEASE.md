# Personenverwaltung und historische Zugänge – Prüfbericht

Stand: 27.10.2026. Basis: `main` / `0b2bdaa2f88cd98c7ab77002cde8e31a284a3628`.

**Implementiert und in isolierten Tests geprüft. Nicht produktiv veröffentlicht.** Das Produktivprojekt `eisozwhhinqszfikemot` und GitHub Pages wurden nicht verändert. Der Benutzer hat bestätigt, dass Backup und Wiederherstellungsweg noch nicht geprüft sind.

## Ergebnisse der vier Aufgaben

1. **Einladungen:** Frontend, Edge-Prüfung und bestehende SQL-Funktionen schlossen Vertreter und vergangene Wohnverhältnisse durch Owner/Tenant- und Aktivitätsfilter aus. Die bestehende Einladung akzeptiert jetzt gespeicherte Eigentümer-, Mieter- und Vertreterbeziehungen mit bereits begonnenem Zeitraum, einschließlich historischer und archivierter Personen. Als Irrtum entfernte sowie ausschließlich zukünftige Zuordnungen berechtigen nicht. Sieben Tage Gültigkeit, manuelles Kopieren, Widerruf, Ersatzlink, einmalige Einlösung, Kontoverknüpfung und service-only RPC bleiben erhalten. Keine automatischen Nachrichten.
2. **Registrierungsstatus:** Kleine grüne/rote Punkte mit Text auf Personenkarten, Detailansicht, Wohnungszuordnungen und Wohnungskarten. DE: Registriert/Unregistriert; TR: Kayıtlı/Kayıtlı değil. Grundlage ist `ay3_persons.auth_user_id` mit bestehendem Fremdschlüssel auf `auth.users`; Einladungstokens zählen nicht. Einlösung bindet das mit Passwort eingerichtete Konto an die vorhandene Person. Aktualisierung beim Datenladen und durch den bestehenden Hintergrund-Refresh.
3. **Personenauswahl:** Ein durchsuchbares Feld mit sofortiger Liste und integrierter Suche; türkische Zeichen, Groß-/Kleinschreibung, formatierte Telefonnummern und E-Mail-Adressen werden lokal gefiltert. Keine Anfrage pro Tastendruck. Maus, Touch, Pfeile, Enter, Escape und ARIA-Zuordnungen sind geprüft. Bei fehlendem Treffer wird die Neuanlage angeboten. Eine eindeutige vorhandene Identität wird wiederverwendet; ein Datenbanktrigger verhindert entsprechende Neuanlage-Dubletten auch bei veralteten Formulardaten. Gleichnamige Menschen mit unterschiedlichen Kontakten werden nicht automatisch zusammengeführt.
4. **Historische Rechte:** Standortzugang und aktuelle Rechte werden aus tatsächlichen, datierten Personenbeziehungen abgeleitet. Alte `site_resident_units`-Freigaben verleihen keine zusätzlichen Rechte. Historische Benutzer erhalten eigene Forderungen, Zahlungszuordnungen, Gutschriften und eine reduzierte Projektion eigener Wohnverhältnisse. Roh-Bankdaten, Gesamtberichte, interne Archivnotizen, Dienstleisterdaten und interne Mitteilungen bleiben gesperrt. `access_revoked_at` speichert den ausdrücklichen Zugangsentzug getrennt von einer Archivierung. Bei erneut aktiver Beziehung entsteht wieder regulärer Zugang; ausdrücklicher Entzug bleibt bestehen, bis die Verwaltung ihn gezielt aufhebt.

Auch aktive Bewohner sehen bei persönlichen Forderungen ausschließlich den gespeicherten Schuldnerbezug. Ein Vertreter erhält ohne gespeicherte Finanzvollmacht keine fremden persönlichen Forderungen. Die vorhandenen Vertreter-Mandate betreffen Mitteilungen; sie bleiben dafür wirksam. Für aktive berechtigte Personen bleiben die bisherigen zusammengefassten Anlageninformationen verfügbar. Verwaltungsrechte entstehen weiterhin ausschließlich durch ausdrücklich erteilte Rollen und Fähigkeiten.

## Datenbefund und Integrität

- Produktiv gelesen: 45 Personen, 51 Zuordnungen, 20 Wohnungen, vier verknüpfte Konten.
- Neun Forderungen ohne Person bleiben erhalten und für Bewohner verborgen.
- Sieben bereits personengebundene Forderungen besitzen keinen historischen `link_id`. Sie bleiben der gespeicherten Person zugeordnet; es wurde kein Wohnverhältnis geraten oder nachträglich erfunden. Eine fachliche Zuordnung durch die Verwaltung ist weiter sinnvoll.
- Keine widersprüchlichen vorhandenen Person-/Wohnungs-/Link-Kombinationen gefunden.
- Zusammengesetzter Fremdschlüssel verhindert künftig, eine referenzierte Zuordnung einer anderen Person oder Wohnung zuzuschreiben. Eine Forderung mit `link_id` muss auch eine Person besitzen.
- Keine Produktivperson, kein Konto und keine Forderung/Zahlung wurden geändert oder gelöscht.

## Datenbankänderungen

Diese drei neuen Dateien werden **nach dem aktuell bereits installierten Produktionsstand** angewandt:

1. `supabase/migrations/20261027143416_person_invitation_eligibility.sql`
2. `supabase/migrations/20261027143706_historical_person_access.sql`
3. `supabase/migrations/20261027151555_prevent_duplicate_people.sql`

Sie erstellen keine neue globale Rolle und keine neue Tabelle. Ergänzt werden eine Entzugsspalte, Integritätsconstraints, private Hilfsfunktionen und ein Dublettenschutz-Trigger. Bestehende Einladungs-, Workspace-, Zugangs- und Projektionsfunktionen werden ersetzt.

Angepasste RLS-Policies: `ay2_charges_read`, `ay3_credits_read`, `ay2_reports_read`, `occupancy_read`, `ay3_links_read`. Die bestehende Policy `ay2_allocations_read` verwendet weiter `view_charge`, dessen Prüfung enger gefasst ist. Ankündigungen verwenden weiter `ay5_receives`, das jetzt einen regulären Zugang verlangt. RLS wird nirgends deaktiviert.

Die bereits vorhandene Datei `20261027171500_person_account_lifecycle_v2.sql` enthält eine Kompatibilitätsergänzung für den ausdrücklichen Entzug, falls historische Dateien in anderer Reihenfolge nachgespielt werden. Bereits installierte historische Migrationen nicht erneut auf Produktion ausführen. Die Dateiversionen im Repository und die tatsächlichen älteren Installationsversionen stimmen nicht überall überein; deshalb **kein ungeprüftes pauschales `db push`**.

Die neue Migration bricht ab, wenn alte archivierte Konten ohne nachvollziehbare Portal- oder Verwaltungsfreigabe gefunden werden. Solche früheren Entzüge müssen zuerst geprüft werden. Beim gelesenen Produktionsstand existierten keine archivierten verknüpften Konten.

Definitionen vor der Änderung stehen in `supabase/rollback/people-access-definitions.sql`. Das ist ein Schema-Rückweg, kein Datenbackup und kein Nachweis einer kompletten Wiederherstellung. Vor Rückkehr zu alten Berechtigungsdefinitionen Benutzerzugriff sperren und inzwischen ausgesprochene Entzüge berücksichtigen.

## Tatsächlich ausgeführte Prüfungen

| Prüfung | Ergebnis und Grenze |
|---|---|
| Vollständige JavaScript-Suite | 245 erfolgreich |
| Bestehende isolierte SQL-Suite | 120 erfolgreich |
| Bestehende Finanz-Suite | 50 erfolgreich |
| Finanz-Suite zusätzlich mit neuen Migrationen | 50 erfolgreich; Sammelforderungen, monatliche Forderungen, Zahlungen, Korrekturen, Idempotenz und Verwaltungsrechte |
| Bestehende Auth-/Einladungs-/Anfrage-/Recovery-/Integration-SQL-Suiten | 86 erfolgreich |
| Neue Einladungs-SQL-Tests | 25 erfolgreich |
| Neue direkte RLS-/RPC-/Integritätstests | 40 erfolgreich |
| Native PostgreSQL-Prüfung in Supabase-Staging | 36 erfolgreich; synthetische Änderungen im Testblock zurückgerollt |
| Echte bereitgestellte Einladung + GoTrue-Anmeldung in Staging | 37 erfolgreich einschließlich Bereinigung; Eigentümer, Mieter, Vertreter, historischer Bewohner, abgelaufener Link, Replay und identische Personen-ID |
| Desktop und Mobil | 1440 und 390 Pixel, DE/TR; Maus, Tastatur, Neuanlage-Rückweg und kein horizontaler Überlauf |
| Axe/WCAG am geöffneten Auswahlformular | Keine Verstöße für WCAG 2 A/AA und 2.1 AA in den vier geprüften Kombinationen |

Belege stehen unter `tests/evidence/people-*`. Reproduzierbar lokal: `npm test`, `npm run test:sql`, `npm run test:v5:sql`, `npm run test:people:sql`. Die native SQL-Prüfung `tests/sql/people-staging-security.sql` ist ausschließlich für das Testprojekt vorgesehen. Sie verwendet synthetische Identitäten und rollt ihre Datensätze zurück.

Staging `nphmuecdapvebcnpuqvp`: fehlende V5-Bausteine sowie relevante produktive Lese-Funktionen und RLS-Regeln ergänzt; dafür nur erforderliche SELECT-Rechte übernommen. Ein zunächst breiter Abgleich wurde von der automatischen Freigabeprüfung abgelehnt und nicht installiert. Die reduzierte Variante wurde erfolgreich angewandt. Installationsnamen: `people_access_readonly_baseline_and_feature`, `prevent_duplicate_people`, `historical_relationship_projection`.

In Staging bereitgestellt: `ay3-whatsapp-invite` Version 4 und `ay3-site-open-claims` Version 1. Temporärer Prüf-Endpunkt `people-access-qa` danach durch einen JWT-geschützten 503-Handler ersetzt. Separate Kontrolle: null verbleibende Testkonten und Testanlagen. Kein SMTP-/WhatsApp-Versand und keine produktiven Testbuchungen.

Die Staging-Advisors zeigen keine anonym aufrufbare neue privilegierte Funktion. Hinweise zu absichtlich gesperrten Tabellen ohne Client-Policy und zu bestehenden, intern rollenprüfenden SECURITY-DEFINER-Einstiegspunkten bleiben dokumentierte Prüfpunkte. [Supabase-Funktionsprüfung](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Zusätzlicher öffentlicher Finanzzugriff

Die tatsächlich live erreichbare Seite `/old/` enthält einen eingebetteten historischen Forderungssnapshot. Der anonyme Abruf wurde bestätigt. RLS kann eine solche statische Datei nicht schützen. Der Änderungsstand ersetzt diese Seite durch eine Weiterleitung; das vollständige Original wurde lokal im Ausgabeverzeichnis erhalten.

**Die alte Datei bleibt in der öffentlichen Git-Historie und gegebenenfalls fremden Kopien abrufbar.** Die Codeänderung allein macht diese bereits veröffentlichte Historie nicht privat. Vor einer Zusage strikter Vertraulichkeit muss die Repository-Sichtbarkeit beziehungsweise eine abgestimmte Historienbereinigung samt Hosting geprüft werden. Eine Änderung der Sichtbarkeit oder Umschreibung der Historie wurde nicht ausgeführt. Ein privates Repository kann je nach GitHub-Tarif Auswirkungen auf Pages haben.

Produktive Advisors vor Änderung: vier ältere anonym ausführbare Trigger-Einstiegspunkte und ausgeschaltete Prüfung auf kompromittierte Passwörter wurden gemeldet. Diese vorhandenen Einstellungen wurden nicht verändert; der neue Test-Endpunkt ist deaktiviert. [Passwortschutz](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Noch offen

1. Aktuelles Produktivbackup samt erfolgreicher Wiederherstellungsprüfung; Benutzerantwort: **noch nicht geprüft**.
2. Entscheidung und Umsetzung zum öffentlichen historischen Finanzsnapshot; alte Veröffentlichungen können nicht durch RLS zurückgerufen werden.
3. Produktionsmigration, produktives Edge-Deployment und Frontend-Veröffentlichung.
4. Abnahme auf einem physischen Smartphone/PWA; geprüft wurden Browser-Ansichten in zwei Größen, kein echtes Mobilgerät.
5. Fachliche Ergänzung der sieben Personenforderungen ohne historischen Link, ohne automatische Zuordnungsannahmen.

## Veröffentlichung nach Erfüllung der Voraussetzungen

### 1. Sicherung und Wiederherstellung

1. [Supabase-Projekt öffnen](https://supabase.com/dashboard/project/eisozwhhinqszfikemot), Projektnamen **ayapark2** kontrollieren.
2. **Database → Backups** öffnen. Sicherungszeit und verfügbaren Wiederherstellungsweg dokumentieren. Eine angezeigte Sicherung allein gilt noch nicht als getesteter Rückweg.
3. In einem separaten, nicht produktiven Ziel wiederherstellen. Erfolgskontrolle: Personen-/Zuordnungs-/Finanz-Zeilenzahlen vergleichen und eine bestehende Admin-Anmeldung im wiederhergestellten System prüfen. Produktivprojekt nicht testweise zurücksetzen.
4. Falls im bestehenden Tarif kein Backup bereitsteht: den offiziellen [CLI-Backup-/Restore-Ablauf](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) verwenden. **Connect → Session pooler** liefert die Verbindungsadresse; Zugangsdaten lokal halten. Rollen, Schema und Daten getrennt sichern und auf das isolierte Ziel zurückspielen. Kostenpflichtige Wiederherstellungsangebote erst nach eigener Entscheidung aktivieren. Backupdateien außerhalb des öffentlichen Repositories aufbewahren.

Die Tarifabhängigkeit und der Menüpfad sind in der [Supabase-Backup-Dokumentation](https://supabase.com/docs/guides/platform/backups) beschrieben.

### 2. Öffentliche Historie klären

1. In GitHub **kemcap/ayapark2 → Settings → General** die aktuelle Sichtbarkeit prüfen.
2. Vor einer Änderung unter **Settings → Pages** klären, ob Hosting mit privatem Repository im vorhandenen Tarif weiter funktioniert; andernfalls geschütztes Hosting planen.
3. Sichtbarkeit beziehungsweise Historienbereinigung gezielt freigeben und separat durchführen lassen. Nicht nur die heutige Datei kontrollieren: alte Commit-URLs und öffentliche Kopien berücksichtigen.
4. Erfolgskontrolle aus einem abgemeldeten Browser: der historische Snapshot ist über die kontrollierten Veröffentlichungswege nicht mehr öffentlich erreichbar. Fremde bereits angefertigte Kopien können nicht garantiert entfernt werden.

### 3. Datenbank und Backend

1. Freigegebenen Änderungsstand verwenden; Anwendung während des zusammenhängenden Back-/Frontend-Rollouts kurz in Wartung halten.
2. Supabase **SQL Editor → New query**, Produktivprojekt kontrollieren. Die mitgelieferte zusammengefasste Produktivmigration erst nach Backup-Prüfung vollständig ausführen. Sie umschließt die drei neuen Migrationen mit `BEGIN`/`COMMIT` und enthält Erfolgskontrollen.
3. Erfolgskontrolle: `access_revoked_at`, beide neuen Zugangshelfer, validierte Personen-/Link-Constraints und der Dublettenschutz existieren. Personen-, Konto- und Finanz-Zeilenzahlen bleiben erhalten.
4. **Edge Functions → ay3-whatsapp-invite**: geprüften Quelltext aus dem PR deployen. Bestehende Authentifizierung im Handler und Tokenprüfung beibehalten; diese Funktion verwendet absichtlich keine pauschale Gateway-JWT-Pflicht für die öffentlichen Inspect-/Activate-Aktionen.
5. **Edge Functions → ay3-site-open-claims**: `index.ts` zusammen mit `math.mjs` deployen. Der Handler verlangt selbst ein gültiges Benutzer-Token und eine aktuelle gespeicherte Berechtigung.
6. Vorhandene Secrets unverändert prüfen: `ENABLE_INVITATIONS_V2=true`, `AY_INVITE_APP_URL=https://kemcap.github.io/ayapark2/`, `AY_INVITE_ALLOWED_ORIGINS` enthält `https://kemcap.github.io`. Bestehende zusätzliche Origins nur bei tatsächlicher Nutzung erhalten. Service-Schlüssel niemals im Frontend eintragen.

### 4. Frontend und Abnahme

1. In GitHub **Pull requests → zugehörigen PR öffnen**. Checks prüfen; erst nach obigen Voraussetzungen aus dem Entwurf freigeben und mergen.
2. Unter **Actions** den erfolgreichen Pages-Lauf prüfen; unter **Settings → Pages** die veröffentlichte Adresse kontrollieren.
3. Anwendung mit vollständigem Neuladen öffnen (**Cmd+Shift+R** am Mac). Prüfen: Statuspunkte, Suchfeld, Vertreter-Einladung, historischer persönlicher Zugriff und Weiterleitung von `/old/`.
4. Keine echten Einladungskonten oder Finanzbuchungen allein für Tests erzeugen. Synthetische vollständige Aktivierungen bleiben auf Staging beschränkt. Produktiv nur die bestehende Anmeldung und die unveränderten eigenen Verwaltungsdaten kontrollieren.

## Vollständige Dateiliste dieses Änderungsstands

- `.github/workflows/invitation-checks.yml`
- `PEOPLE-ACCESS-RELEASE.md`
- `README.md`
- `api.mjs`
- `app.mjs`
- `assignments.mjs`
- `i18n.mjs`
- `index.html`
- `invite-ui.mjs`
- `old/index.html`
- `package.json`
- `people-ui.mjs`
- `person-combobox.mjs`
- `registration-status.mjs`
- `site-claims-ui.mjs`
- `styles.css`
- `supabase/functions/ay3-site-open-claims/index.ts`
- `supabase/functions/ay3-whatsapp-invite/index.ts`
- `supabase/migrations/20261027143416_person_invitation_eligibility.sql`
- `supabase/migrations/20261027143706_historical_person_access.sql`
- `supabase/migrations/20261027151555_prevent_duplicate_people.sql`
- `supabase/migrations/20261027171500_person_account_lifecycle_v2.sql`
- `supabase/rollback/people-access-definitions.sql`
- `tests/apartment-search.test.mjs`
- `tests/evidence/people-browser.jsonl`
- `tests/evidence/people-finance-regression.json`
- `tests/evidence/people-staging-integration.json`
- `tests/evidence/people-staging-security.json`
- `tests/invitations.test.mjs`
- `tests/people-access.test.mjs`
- `tests/resident-open-claims.test.mjs`
- `tests/sql/people-invitations.mjs`
- `tests/sql/people-security.mjs`
- `tests/sql/people-staging-security.sql`
- `tests/sql/v5.mjs`
- `ui.mjs`
- `v3-ui.mjs`

## GitHub-Ablage

Der Benutzer hat die öffentliche Ablage von Code, SQL-Migrationen und Prüfbericht als PR-Entwurf ausdrücklich freigegeben. Die anfängliche Ablehnung durch die automatische Freigabeprüfung wurde damit geklärt. Diese Freigabe umfasst keine produktive Datenbankmigration und keinen Livegang; Backup und Wiederherstellung sind weiterhin ungeprüft.
