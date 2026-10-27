# Ayapark 2 – Personenverwaltung und persönliche Zugriffsrechte

Stand: 27.10.2026. Implementiert und lokal sowie in `ayapark-auth-staging` geprüft. Produktivprojekt und Hauptzweig wurden durch diese Arbeit nicht verändert. Die Produktivveröffentlichung benötigt die im Auftrag verlangte Freigabe.

## Ergebnisse nach Arbeitspaket

1. **Einladungen:** Eigentümer, Mieter, Vertreter und ehemalige Bewohner nutzen denselben Einladungsdialog und denselben Dienst. Die bisherigen Ausschlüsse in Oberfläche, Edge Function und SQL wurden korrigiert. Irrtümlich erfasste sowie ausschließlich zukünftige Beziehungen berechtigen nicht zur Einladung. Vertreter werden als Vertreter gespeichert; es wird keine Eigentümerrolle erfunden. Links bleiben sieben Tage gültig und werden atomar einmalig verbraucht. Eine neue Einladung widerruft die bisherige. Der Dialog weist auf eine bestehende gültige Einladung hin; Versand bleibt manuell.
2. **Registrierungsstatus:** Kleine Punkte mit Text in Türkisch und Deutsch unter dem Personennamen sowie bei den Namen in den Wohnungsansichten. Eine serverseitige, auf Verwaltungsberechtigte begrenzte Projektion prüft das verknüpfte Auth-Konto, Bestätigung, Anmeldung/Passwort und Sperrzustand. Eine offene Einladung zählt nicht als Registrierung. Vorbereitete, noch unbestätigte Konten können mit unveränderter Konto-ID aktiviert werden. Bestehende aktive Konten erhalten keine Aktivierung zum Zurücksetzen ihres Passworts. Listen aktualisieren sich beim Zurückkehren zur App und auf den Personen-/Wohnungsseiten regelmäßig, solange kein Dialog geöffnet ist; zusätzlich gibt es die Aktualisierungsschaltfläche.
3. **Personenauswahl:** Gemeinsame Auswahlliste mit eingebauter Suche und sofortigen Vorschlägen. Suche nach Namen, Namensbestandteilen, E-Mail und normalisierten Telefonnummern; türkische Zeichen werden berücksichtigt. Pfeiltasten, Enter und Escape funktionieren. Neue Personen lassen sich aus der Liste anlegen. Die Filterung erfolgt lokal. Ein zusätzlicher Datenbank-Trigger verhindert neue offensichtliche Dubletten sowie die Verknüpfung eines bereits anderweitig zugeordneten Kontos. Bestehende Dubletten werden nicht automatisch zusammengeführt oder gelöscht.
4. **Ehemalige Bewohner:** Ein vergangenes Enddatum verhindert weder Einladung noch persönlichen Zugriff. Forderungen und Zahlungen werden anhand der verantwortlichen Person statt durch gemeinsame Wohnungszugehörigkeit freigegeben. Historische Beziehungen bleiben erhalten. Neue Bewohner übernehmen keine fremden Altverbindlichkeiten. Ehemalige Bewohner bekommen keine globalen Finanzübersichten, Bankbewegungen, internen Mitteilungen oder fremden Personeninformationen. Ein ausdrücklich entzogener Standortzugang bleibt entzogen. Vertreter erhalten ohne passende Vollmacht keine zusätzlichen Zielgruppen-Mitteilungen und keine Finanzrechte an anderen Personen.
5. **Personenkarten:** Einladung oben rechts, Bearbeiten unten rechts. Die Kartenfläche öffnet das Bearbeitungsformular über eine native Schaltfläche mit vergrößerter Klickfläche. Eigenständige Aktionen liegen darüber und lösen ausschließlich ihre eigene Aktion aus; keine verschachtelten Schaltflächen.
6. **Wohnungsansichten:** Der vorhandene Einladungsdialog ist direkt erreichbar. In den Zuordnungsaktionen steht die Einladung am Ende der Aktionszeile. Wohnungsübersichtskarten haben separate Einladungsaktionen außerhalb der Schaltfläche für die Wohnungsdetails. Beschriftungen und Aktionen dürfen mobil umbrechen.
7. **Mobiles Bewohnerdashboard:** Zwei Kartenpaare mit etwa 55/45 Prozent beziehungsweise gleichmäßiger Aufteilung. Änderung nur in der mobilen Bewohnerübersicht. Bei extrem schmaler Ansicht oder stark vergrößerter Schrift erfolgt ein einspaltiger Fallback. Desktop- und Verwaltungsübersicht behalten ihre bisherigen Raster. Für diese Layoutänderung wurden keine Finanzberechnungen verändert.
8. **Prüfung und Veröffentlichung:** Testpaket und Nachweise sind enthalten. Testkonten und Testanlage wurden vollständig entfernt, der temporäre privilegierte Prüfendpunkt deaktiviert. Kein Merge, keine Veröffentlichung und keine produktive Datenbankmigration.

## Datenbankänderungen

Vier neue Migrationen, ohne neue Tabellen und ohne Änderung bestehender Finanzzeilen:

- `20261027174427_people_invitation_eligibility.sql`: gemeinsame SQL-Berechtigungsprüfung für Einladungen; Vertreter als zulässige Portalrolle; sichere Wiederverwendung vorbereiteter Konten; Kontaktabgleich; kompatible Freigabe von Zugangsanfragen.
- `20261027174611_people_registration_status.sql`: eingeschränkte Auth-Statusprojektion und Einbindung in den vorhandenen Workspace.
- `20261027174807_personal_history_access.sql`: persönliche Finanzsicht, Trennung von Standortzugang und aktuellen Gemeinschaftsrechten, Schutz globaler Zusammenfassungen und Mitteilungen, eigene Namensprojektion ohne Verwaltungsnotizen.
- `20261027175638_person_identity_guard.sql`: Schutz neuer Personeneinträge und neuer Kontoverknüpfungen, ohne Bereinigung vorhandener Datensätze.

Geänderte RLS-Policies: `ay2_charges_read`, `ay3_credits_read`, `ay2_reports_read`, `occupancy_read`. Die bestehende Policy `ay2_allocations_read` verwendet weiterhin `view_charge`, dessen Prüfung jetzt ausschließlich Finanzberechtigung oder eigene Schuldneridentität berücksichtigt. `ay2_announcements_read` bleibt bestehen und verwendet die verschärfte Empfängerprüfung. Es werden keine pauschalen neuen Bewohnerrollen und keine neuen offenen Lesezugriffe eingeführt.

Der privilegierte Dienst für Standortforderungen prüft zusätzlich die aktuelle Berechtigung mit dem tatsächlichen Benutzer-JWT. Seine persönliche Teilübersicht enthält nur eigene Schuldnerdatensätze. Der Dienst für Einladungen behält serverseitige Identitätsprüfung, Hash-Speicherung, Fristen, Sperren und Einmalverwendung bei.

## Prüfungen

| Prüfgruppe | Ergebnis |
|---|---:|
| JavaScript-Regressionen einschließlich neuer Such-/Statusfälle | 247 bestanden |
| Bestehende SQL-Suiten für Finanzen, Rechte und Authentifizierung | 256 bestanden |
| Neue SQL-Prüfungen für Einladungen und persönliche Historie | 56 bestanden |
| Browserprüfungen einschließlich echter Formularaktionen und Touch-Eingabe | 37 bestanden |
| Native Supabase-Integration mit synthetischen Konten | 64 bestanden |
| Deno-Typprüfung der beiden geänderten Edge Functions | bestanden |

Die Browserprüfung deckt Deutsch/Türkisch, 320/375/430/768/1440 Pixel, größere Schrift, Tastaturauswahl, getrennte Kartenaktionen und Touch-Eingabe ab. Axe meldete in Personenkarten, Auswahlformular und Bewohnerdashboard keine Verstöße der geprüften WCAG-Regeln. Screenshots wurden visuell geprüft.

Die native Integration prüfte reale Erstellung, Inspektion und Aktivierung von Einladungen für Eigentümer, Mieter, Vertreter, ehemalige Bewohner, vorbereitete Konten und Telefonzugang. Hinzu kamen echte Passwortanmeldung, Wiederverwendung derselben Konto-ID, Replay-Abweisung, Statuswechsel, direkte PostgREST-Abfragen, persönliche Schuldnerisolierung und Sperre der globalen Finanzdienste. Alle sieben Konten und die synthetische Anlage des erfolgreichen Durchlaufs wurden entfernt; eine separate SQL-Kontrolle bestätigte null verbliebene Testkonten und keine Testanlage.

Die vorhandene Testumgebung enthält frühere Schemaergänzungen und ist keine vollständige Kopie der Produktivumgebung. Die isolierten SQL-Tests prüfen zusätzlich die Repository-Basis mit den neuen Migrationen. Eine Prüfung auf physischen iOS-/Android-Geräten, SMTP-Versand und ein vollständiger Wiederherstellungstest einer Produktivsicherung wurden nicht durchgeführt. Die Testanzahlen sind Prüfungen innerhalb überlappender Suiten, keine Anzahl voneinander unabhängiger Nutzungsszenarien.

Nachweise: `tests/evidence/people-management-staging.json`, `tests/evidence/people-management-browser.json`. Reproduzierbare Browserprüfung: `qa/people-management-browser.mjs`; sie nutzt eine vorhandene Playwright-Installation und synthetische Daten. Es wurden keine neuen Anwendungsbibliotheken hinzugefügt. `deno.lock` fixiert die bei der Typprüfung verwendeten Abhängigkeiten.

## Öffentliche Altseite und verbleibende Grenzen

Die Live-Prüfung bestätigte am 27.10.2026: `/old/` ist ohne Anmeldung mit HTTP 200 erreichbar und enthält eingebettete Finanzbeträge. Im Änderungspaket wird `old/index.html` durch eine Weiterleitung zur geschützten Anwendung ersetzt. **Bis zur Veröffentlichung bleibt die bisherige Live-Altseite erreichbar.** Alte Git-Commits werden durch diese Änderung nicht entfernt. Eine gesonderte Bereinigung der öffentlichen Versionshistorie wurde nicht vorgenommen.

Die produktive Supabase-Sicherheitsprüfung meldet außerdem bereits vorhandene Hinweise zu alten öffentlich ausführbaren Triggerfunktionen und deaktiviertem Schutz vor kompromittierten Passwörtern. Sie wurden nicht pauschal verändert. Die neuen sensiblen Helfer liegen im privaten Schema oder sind ausschließlich für den Dienst freigegeben; die Prüfung der Testumgebung zeigte keine neue anonym ausführbare privilegierte Funktion.

Wie im bestehenden Aktivierungsverfahren werden unklare Abbrüche zwischen Auth-Erstellung und SQL-Verknüpfung als Abstimmungsfall behandelt. Es werden keine möglicherweise bereits verknüpften Auth-Konten auf Verdacht gelöscht. Bei einem solchen Fehler muss die Verwaltung die Konto-/Personenverknüpfung prüfen, bevor sie erneut freischaltet. Parallelitätsfehler wurden durch Sperren und Einmalverbrauch abgesichert; ein zusätzlicher nativer Lasttest mit gleichzeitig konkurrierenden Aktivierungen ist nicht Bestandteil des Nachweises.

## Freigabe und kontrollierter Rollout

Aktuell muss der Nutzer keine Dateien oder SQL-Befehle manuell übertragen. Die Änderungen werden als Pull Request bereitgestellt. Die Produktivfreigabe ist der nächste erforderliche Nutzerschritt.

Nach Freigabe ist folgende Reihenfolge vorgesehen:

1. **Supabase → Projekt `ayapark2` → Database → Backups:** Wiederherstellbaren Sicherungsstand und Verfügbarkeit einer Daten-/Schemasicherung prüfen. Bei fehlender Backup-Funktion zuerst einen geeigneten Export herstellen. Die vorhandenen Schemafunktionen wurden vor der Entwicklung lesend erfasst; das ersetzt keine vollständige Produktivsicherung.
2. **Supabase → `ayapark2` → SQL Editor bzw. Migrationswerkzeug:** Die vier neuen Migrationen in ihrer Reihenfolge ausführen. Erfolgskriterium: Migrationen protokolliert, betroffene Tabellen weiterhin RLS-geschützt, keine Bewohner-/Forderungszeilen gelöscht oder umgeschrieben.
3. **Supabase → `ayapark2` → Edge Functions:** Nur `ay3-whatsapp-invite` und `ay3-site-open-claims` aus dem geprüften Stand veröffentlichen; vorhandene Konfiguration und Schlüssel beibehalten. Erfolgskriterium: kontrollierte Einladungs- und Berechtigungsprüfungen bestehen.
4. **GitHub → `kemcap/ayapark2` → Pull requests:** Nach grünen Prüfungen und Produktivfreigabe zusammenführen; vorhandene Pages-Veröffentlichung prüfen. Erfolgskriterium: neue Bedienelemente sichtbar, `/old/` leitet weiter und liefert keine eingebetteten Beträge mehr.
5. **Abnahme:** Bestehendes Verwaltungskonto, ein eigener Bewohnerzugang, ein historischer Zugang sowie ein Vertreterzugang kontrolliert prüfen. Dafür keine echten Konten oder Schulden zu Testzwecken löschen oder neu anlegen.

Ein Rücksetzen der Oberfläche darf die neuen restriktiven Datenbankrechte beibehalten. Frühere unsichere Finanz-Policies sollten nicht als pauschaler Notfall-Rollback wieder aktiviert werden. Historische Forderungen und neu aktivierte Vertreterkonten sind bei jedem Rücksetzplan zu erhalten.

## Geänderte Dateien

Die folgende Liste umfasst auch reine Aktualisierungen der Import-/Cacheversionen, damit Browser und Tests dieselben Modulstände laden.

- `.github/workflows/invitation-checks.yml`
- `access-preview.mjs`
- `access-request-ui.mjs`
- `apartment-info.mjs`
- `api.mjs`
- `app.mjs`
- `assignments.mjs`
- `finance-forms.mjs`
- `finance-v5.mjs`
- `forms.mjs`
- `index.html`
- `invite-ui.mjs`
- `ledger.mjs`
- `notifications.mjs`
- `old/index.html`
- `package.json`
- `people-ui.mjs`
- `qa/frame.mjs`
- `recovery-api.mjs`
- `relationships.mjs`
- `settings-ui.mjs`
- `seven-ux.mjs`
- `site-claims-ui.mjs`
- `styles.css`
- `supabase/functions/ay3-site-open-claims/index.ts`
- `supabase/functions/ay3-whatsapp-invite/index.ts`
- `tests/apartment-search.test.mjs`
- `tests/assignments.test.mjs`
- `tests/audit-regressions.test.mjs`
- `tests/auth-phase3.test.mjs`
- `tests/comfort.test.mjs`
- `tests/detail-help.test.mjs`
- `tests/invitations.test.mjs`
- `tests/load-performance.test.mjs`
- `tests/mobile-navigation.test.mjs`
- `tests/modern-design.test.mjs`
- `tests/occupancy.test.mjs`
- `tests/password-setup.test.mjs`
- `tests/person-lifecycle.test.mjs`
- `tests/quality-regressions.test.mjs`
- `tests/resident-open-claims.test.mjs`
- `tests/role-preview-header.test.mjs`
- `tests/session.test.mjs`
- `tests/seven-ux.test.mjs`
- `tests/ui-ux-v4.test.mjs`
- `tests/update35.test.mjs`
- `tests/v5.test.mjs`
- `ui-feedback.mjs`
- `ui.mjs`
- `v3-domain.mjs`
- `v3-forms.mjs`
- `v3-ledger.mjs`
- `v3-ui.mjs`
- `PEOPLE-MANAGEMENT-V59.md`
- `deno.lock`
- `people-management.css`
- `person-picker.mjs`
- `person-status.mjs`
- `qa/people-management-browser.mjs`
- `supabase/migrations/20261027174427_people_invitation_eligibility.sql`
- `supabase/migrations/20261027174611_people_registration_status.sql`
- `supabase/migrations/20261027174807_personal_history_access.sql`
- `supabase/migrations/20261027175638_person_identity_guard.sql`
- `tests/evidence/people-management-browser.json`
- `tests/evidence/people-management-staging.json`
- `tests/people-management.test.mjs`
- `tests/sql/people-access.mjs`
- `tests/sql/people-invitations.mjs`
