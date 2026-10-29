# AYAPARK 2 – Sekundäre Änderungswünsche / offene Restarbeiten

**Stand:** 29.10.2026  
**Repository:** `kemcap/ayapark2` (`main`)  
**Status:** Aufgabenregister und Klärungsliste – **kein automatischer Umsetzungsauftrag**.

## Verbindliche Arbeitsregel für spätere Aufträge

Wenn der Nutzer künftig pauschal „alle To-dos aus GitHub / dem Projektordner abarbeiten“ oder Ähnliches verlangt, **vor jeder Implementierung** explizit nachfragen:

1. **Welches Projekt/Repository und welcher Branch bzw. welche Version** soll aktuell bearbeitet werden?
2. **Welche konkrete Aufgabenliste bzw. welche Änderungsgruppe** soll jetzt umgesetzt werden (Hauptaufträge, sekundäre Wünsche, einzelner PR, Betrieb/Release usw.)?

Erst danach den aktuellen Code- und Deploymentstand prüfen, bereits erledigte Arbeiten aussortieren und den Umfang festlegen. Keine anderen Projekte, alle Listen oder produktiven Migrationen stillschweigend mitbearbeiten. Keine automatische Produktivveröffentlichung ohne ausdrückliche Freigabe.

## Statusabgleich Hauptaufträge und Entwürfe – 29.10.2026

Geprüfte Basis: `main` bei `ebb19543c3d0b695164fb94098fdb2c522b30200`, PR-Metadaten, Quelldateien und Actions-Jobstatus. Keine neue Anmeldung, kein Supabase-Liveaudit und kein Restore in dieser Dokumentationsprüfung.

**Korrektur zur bisherigen Übersicht:** Eine zentrale [Projekt-Roadmap](https://github.com/kemcap/ayapark2/blob/feature/free-backup-preparation-20261028/docs/PROJECT-ROADMAP.md) existiert bereits in der Branch von PR #52, bisher nicht in main. Historische Aussagen „Backup nicht aktiviert“ werden durch den neueren Hauptzweig überholt.

| Hauptauftrag / Teilaufgabe | Belegter Fortschritt | Restaufgabe |
|---|---|---|
| DE/TR-Anmeldung, Modulstände | PR #36 zusammengeführt | Aktuelle Browserabnahme getrennt prüfen |
| Siebentägige einmalige Telefon-/E-Mail-Einladung, Passwortvergabe, administrative Recovery | PR #37 zusammengeführt; AUTH-RELEASE.md dokumentiert Produktivmigration und Endpoint-Prüfungen | Physische Geräte, SMTP und vollständiger Nutzerablauf dort weiterhin offen |
| Verifizierte Telefonzuordnung, öffentliche Zugangsanfragen, Passkeys | auth-features.mjs: alle drei Schalter false, administrative Recovery true | Nicht als aktiviert abhaken |
| Personenverwaltung, Suche, Registrierungsstatus, historische Rechte, mobile Dashboard-Paare | PR #48 zusammengeführt; Staging-Nachweise vorhanden | Backend-/Nutzerabnahme S-01/S-03 |
| Personen archivieren/löschen, Zugang getrennt entziehen | PR #44 und Korrektur #45 zusammengeführt | Produktivmigration und Bedienung nicht allein aus Merge ableiten |
| Superadmin-Rollenvorschau, Rolle bei Personenerstellung, Bewohner-Vorschau für Verwaltung | PR #43/#51 zusammengeführt | Geräte-/Rollenabnahme; kein Backend-Impersonation-Verfahren |
| Große Bildschirme, zwei Wohnungskarten je Block, schmale Berichte | PR #47/#49/#53 zusammengeführt | #49 korrigiert die 3–4 Spalten aus #47; schmaler Fallback bleibt. 384 statische Layoutfälle aus #53 sind kein dynamischer Gerätetest |
| Pages-Veröffentlichung | [Lauf 40945090260](https://github.com/kemcap/ayapark2/actions/runs/40945090260) erfolgreich für obigen Commit | Kein Beleg für Supabase-Migrationen oder authentifizierte Abnahme |
| Tägliche verschlüsselte DB-Sicherung nach Drive | Workflow in main; [Lauf 40945224444](https://github.com/kemcap/ayapark2/actions/runs/40945224444) einschließlich Export-/Upload-Schritt erfolgreich | Echter Dump-Restore und vollständiges portables Backup offen; S-05 |
| Vollständiges Backup mit Git/Storage/Plattforminventar | PR #52 offener Entwurf; isolierter Git-Bundle-Restore dokumentiert | Mit aktivem DB-Workflow abstimmen; Gesamt-Restore offen |
| Größere Audit-Empfehlungen D1–D4 | AUDIT-20261026.md; D3 durch #37 teilweise vorangekommen | Navigation, Dashboard und Designsystem nicht insgesamt abgenommen |
| Roadmap-Phasen 2–6: Rollen, Finanzkern, Berichte, Budget, Verwaltungswerkzeuge | Bestehende Funktionen/Tests als Ausgangspunkt | Keine pauschale Vollabnahme; Ist/Soll-Abgleich vor Neuentwicklung |

### Offene PRs sind nicht automatisch offene Neuentwicklungen

Alle folgenden PRs sind aktuell offene Entwürfe. In dieser Prüfung werden keine PRs geschlossen oder gemergt.

| PR | Einordnung / verbleibende Arbeit |
|---|---|
| #27/#28 | Überlappende Einstiegsvarianten. #37 belegt nicht die Übernahme der zweigeteilten Oberfläche/OAuth-Vorbereitung. Varianten abgleichen, nicht beide übernehmen. |
| #29 | Alternative gerätegebundene Aktivierung ohne Passwort; anderer Ablauf als #37, Entscheidung offen. |
| #38 | Wohnungsspalten teilweise durch #49 abgedeckt. Unterschied: zwei Spalten auch sehr schmal gegenüber erhaltenem Fallback; Etagenzuordnung weiterhin unbelegt. |
| #39 | Rollenvorschau teilweise durch #43/#51 abgedeckt. Zusätzliche Menüschließlogik und Einstieg unter „Mehr“ separat abgleichen. |
| #40 | Historien-Tests und Demo-Payload-Idempotenz separat offen; #48 beweist deren Übernahme nicht. |
| #41 | Reine Linkeinladung ohne Kontakt mit Nutzercode: eigener Entwurf, nicht durch #37/#48 belegt. |
| #42 | Laut #44 durch dessen zusammengeführten Nachfolger ersetzt; #45 ergänzt Kontoverknüpfungen. Alten Entwurf nicht zusätzlich mergen. |
| #46 | Weitgehende Überschneidung mit #48; Restunterschiede vor möglicher Schließung prüfen. |
| #52 | Vollständige Portabilität bleibt offen; vorhandenen DB-Workflow berücksichtigen, keinen zweiten Zeitplan blind aktivieren. |

## Abgleich mit bereits erledigter Entwicklungsarbeit – keine Doppelaufgaben

Der zusammengeführte [PR #48](https://github.com/kemcap/ayapark2/pull/48) enthält laut Code- und PR-Nachweis bereits:

- Einladungsmechanismus für Eigentümer, Mieter, Vertreter und ehemalige Bewohner (sieben Tage, einmalig).
- Registrierungsstatus mit kleinem grünem/rotem Punkt an Personen- und Wohnungskarten.
- Gemeinsame durchsuchbare Personenauswahl/Autocomplete nach Name, Telefonnummer und E-Mail.
- Historische persönliche Datenzugriffe und eingeschränkte RLS-Berechtigungen für ehemalige Bewohner.
- Personenkarte als Bearbeitungsfläche; Einladungsaktion oben rechts, Bearbeiten unten rechts.
- Zusätzlichen Einladungsbutton bei noch nicht registrierten Personen in Wohnungskarten.
- Zwei mobile Dashboard-Kartenpaare nebeneinander: `Dairelerimin açık borçları` / `Sitenin toplam açık alacakları` und `Kayıtlı hesap bakiyesi` / `Duyurular`.

**Ein Merge ist keine Bestätigung des vollständigen Produktivrollouts.** Die Nachweise in [PEOPLE-MANAGEMENT-V59.md](PEOPLE-MANAGEMENT-V59.md) beschreiben Staging-Tests und einen noch gesondert zu bestätigenden Produktionsschritt. Vor erneuter Umsetzung zuerst prüfen, was inzwischen wirklich auf der Live-Site und im Produktivbackend aktiv ist.

Der zusammengeführte [PR #50](https://github.com/kemcap/ayapark2/pull/50) enthält bereits eine gezielte Korrektur des administrativen Wiederherstellungsablaufs für verifizierte stellvertretende Verwaltungsmitglieder. **Nicht dieselbe Korrektur erneut entwickeln**, bevor Live-Status und tatsächlicher Fehler geprüft wurden.

## Sekundärer Prüf- und Änderungsbedarf

### S-01 – Produktivstatus der bereits entwickelten Personenfunktionen klären
**Status: Frontend in main und erfolgreicher Pages-Deploymentlauf belegt; produktive Backend-Versionen und authentifizierte Abnahme noch zu bestätigen.**

- Tatsächlichen Stand von GitHub Pages, Supabase-Migrationen und den betroffenen Edge Functions lesen und mit PR #48 abgleichen.
- Nur fehlende Release-Schritte dokumentieren, nicht die bereits implementierten Features neu schreiben.
- Vor möglichen produktiven Datenbankänderungen Sicherung/Wiederherstellbarkeit und Sicherheit prüfen; Rollout erst nach Freigabe.
- Nach einem freigegebenen Rollout mit den realen Berechtigungen testen, ohne reale Forderungen oder Konten zu Testzwecken zu verändern.

### S-02 – „Zugang wiederherstellen“ in Personenkarten prüfen und funktional klären
**Status: Ursache für verifizierte Stellvertreter in PR #50 dokumentiert und Korrektur in main; produktiver Backend-Stand und Nutzerabnahme offen.**

- Es geht ausdrücklich um **die Aktion unter bzw. an der Personenkarte im Verwaltungsbereich `Kişiler`**, nicht um den Link auf der Login-Maske.
- Zunächst den Ist-Ablauf und die Sichtbarkeit für registrierte, unregistrierte und Verwaltungs-/Vertreterkonten nachvollziehen.
- Die bereits zusammengeführte Änderung aus PR #50 sowie deren produktiven Backend-Deploy-/Migrationsstatus berücksichtigen.
- Mit dem Nutzer klären, für welche Kontotypen die Aktion verfügbar sein und welches Wiederherstellungsergebnis sie liefern soll. **Keine neue Passwort-/Einladungsfunktion auf Verdacht bauen.**
- Bei bestätigtem Fehler nur den konkreten Defekt beheben; Konto-/Personenbeziehungen und Auditdaten erhalten. Keine automatische Zustellung oder Kontenübernahme ohne Identitätsprüfung.

### S-03 – Praxistests der neuen Personen- und Dashboard-Oberfläche nachholen
**Status: Umfangreich im Staging geprüft; reale Geräte/Produktivfluss nicht vollständig nachgewiesen.**

- Personeneinladungen und Registrierung inkl. Vertreter und ehemaliger Bewohner mit ausdrücklich autorisierten Testidentitäten.
- Statusanzeigen, Kartenklicks, getrennte Aktionsbuttons und Name/Telefon/E-Mail-Combobox auf echter Mobilansicht prüfen.
- Beide mobilen Dashboard-Kartenpaare und schmale/große Schriftgrößen gegen Überlauf kontrollieren.
- Deutsch/Türkisch und Backend-Datenbegrenzungen prüfen. Erfolgreiche vorhandene Tests nicht ohne Anlass neu implementieren.

### S-04 – Öffentliche Altseite und historische Finanzdaten sicherheitsbezogen prüfen
**Status: old/index.html enthält aktuell nur Weiterleitungseinstieg und keine eingebetteten Beträge; main erfolgreich per Pages deployt. Browserweiterleitung und öffentliche Git-Historie weiter prüfen.**

- PR #48 enthält bereits eine Weiterleitung für `/old/`; überprüfen, ob sie **live** tatsächlich aktiv ist und dort keine eingebetteten Finanzinformationen mehr ausgeliefert werden.
- Die Projektunterlagen weisen darauf hin, dass ältere öffentliche Git-Commits weiterhin frühere Inhalte enthalten können. Umfang und sichere Abhilfen gesondert dokumentieren.
- Keine Git-Historie ohne ausdrückliche Entscheidung umschreiben; bei offenem Datenrisiko vor einem nächsten Release eskalieren.

### S-05 – Wiederherstellbare Sicherung vor weiteren riskanten Produktivänderungen
**Status: DB-Sicherung bereits aktiv und erfolgreich gelaufen; vollständige Wiederherstellbarkeit noch nicht belegt.**

- [Workflow in main](.github/workflows/ayapark2-database-backup.yml): täglich 00:17 UTC / **03:17 Europe/Istanbul**, zusätzlich manuell startbar. Er besitzt **keine** AYAPARK_BACKUP_ENABLED-Sperre; diese gehört zum separaten Entwurf #52.
- [Lauf 40945224444](https://github.com/kemcap/ayapark2/actions/runs/40945224444): Job und Export-/Upload-Schritt erfolgreich. Der Schritt exportiert public, auth, ay2_private und ay_auth_private, prüft Archivverzeichniseinträge, verschlüsselt mit age, lädt nach drive:AyaPark2-Backups und vergleicht SHA-256 mit dem zurückgelesenen Ciphertext. **Realer DB-Export und verschlüsselter Upload sind damit belegt.**
- Nutzerbericht aus der Einrichtung: age-Schlüssel lokal erstellt, getrennte Kopie gesichert; Testdatei-Rundlauf Verschlüsseln → Drive → Download → Entschlüsseln erfolgreich. Dies ist kein Restore des produktiven Dumps. Keine Schlüssel oder Tokens in diese Liste aufnehmen.
- Google-OAuth-Produktionsstatus und langfristige Token-Nutzbarkeit sind durch einen erfolgreichen Einzelbackup-Lauf nicht bewiesen.
- Der aktive Workflow sichert **keine Storage-Dateien, kein Git-Bundle und keine vollständige Plattform-/SMTP-/OAuth-Konfiguration**. Export mit --no-owner --no-acl: Rollen/Grants und Zielplattform benötigen ein geprüftes Wiederherstellungsverfahren. pg_restore --list ersetzt keinen Restore.
- [Draft PR #52](https://github.com/kemcap/ayapark2/pull/52) enthält den weitergehenden portablen Entwurf und Git-Restore-Nachweise. Dessen alte Aussagen „keine Backups/Secrets/Uploads vorhanden“ beschreiben nicht mehr main.
- [ ] Echtes verschlüsseltes DB-Backup lokal herunterladen, entschlüsseln und isoliert wiederherstellen; Daten, Auth und Rechte kontrollieren.
- [ ] Storage-/Git-/Konfigurationsumfang vervollständigen und Gesamtwiederherstellung prüfen.
- [ ] Aufbewahrung, Speicherverbrauch und regelmäßige Restore-Prüfung festlegen.
- Vor riskanten Produktivänderungen weiterhin dokumentierte Wiederherstellbarkeit verlangen. Keine zweite Automatisierung ohne Abstimmung aktivieren.

## Bearbeitungsregeln für diese Liste

- **Priorität:** sekundäre Anforderungen nach den jeweils ausdrücklich ausgewählten Hauptaufträgen; **Sicherheitsrisiken und mögliche Datenexposition sofort gesondert kenntlich machen**.
- **Statusdisziplin:** `implementiert in GitHub` / `live verifiziert` / `noch offen` strikt unterscheiden. Dokumentationsstände können veraltet sein; vor jedem Eingriff erneut prüfen.
- **Keine Redundanz:** Bestehende PRs #48, #50 und #52 fortführen oder überprüfen, keine parallelen Neuentwicklungen derselben Funktion.
- **Kein verdeckter Arbeitsauftrag:** Diese Datei speichert Wünsche und Restprüfungen. Sie autorisiert weder Codeänderungen noch Datenbankänderungen oder Livegang.
- **Schrittfolge:** Nach einer ausgeführten Aufgabe immer Ergebnis, Erfolgskontrolle und die konkrete nächste Aufgabe erklären; falls Nutzerhandlungen erforderlich sind, präzise Menüpfade angeben.
