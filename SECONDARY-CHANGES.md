# AYAPARK 2 – Sekundäre Änderungswünsche / offene Restarbeiten

**Stand:** 29.10.2026  
**Repository:** `kemcap/ayapark2` (`main`)  
**Status:** Aufgabenregister und Klärungsliste – **kein automatischer Umsetzungsauftrag**.

## Verbindliche Arbeitsregel für spätere Aufträge

Wenn der Nutzer künftig pauschal „alle To-dos aus GitHub / dem Projektordner abarbeiten“ oder Ähnliches verlangt, **vor jeder Implementierung** explizit nachfragen:

1. **Welches Projekt/Repository und welcher Branch bzw. welche Version** soll aktuell bearbeitet werden?
2. **Welche konkrete Aufgabenliste bzw. welche Änderungsgruppe** soll jetzt umgesetzt werden (Hauptaufträge, sekundäre Wünsche, einzelner PR, Betrieb/Release usw.)?

Erst danach den aktuellen Code- und Deploymentstand prüfen, bereits erledigte Arbeiten aussortieren und den Umfang festlegen. Keine anderen Projekte, alle Listen oder produktiven Migrationen stillschweigend mitbearbeiten. Keine automatische Produktivveröffentlichung ohne ausdrückliche Freigabe.

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
**Status: Produktivstand nicht durch GitHub-Merge allein nachgewiesen.**

- Tatsächlichen Stand von GitHub Pages, Supabase-Migrationen und den betroffenen Edge Functions lesen und mit PR #48 abgleichen.
- Nur fehlende Release-Schritte dokumentieren, nicht die bereits implementierten Features neu schreiben.
- Vor möglichen produktiven Datenbankänderungen Sicherung/Wiederherstellbarkeit und Sicherheit prüfen; Rollout erst nach Freigabe.
- Nach einem freigegebenen Rollout mit den realen Berechtigungen testen, ohne reale Forderungen oder Konten zu Testzwecken zu verändern.

### S-02 – „Zugang wiederherstellen“ in Personenkarten prüfen und funktional klären
**Status: Fehlverhalten vom Nutzer gemeldet, genaue Ursache und gewünschte Bedienlogik noch offen.**

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
**Status: Sicherheits- und Release-Prüfpunkt, nicht als reine kosmetische Nebenaufgabe behandeln.**

- PR #48 enthält bereits eine Weiterleitung für `/old/`; überprüfen, ob sie **live** tatsächlich aktiv ist und dort keine eingebetteten Finanzinformationen mehr ausgeliefert werden.
- Die Projektunterlagen weisen darauf hin, dass ältere öffentliche Git-Commits weiterhin frühere Inhalte enthalten können. Umfang und sichere Abhilfen gesondert dokumentieren.
- Keine Git-Historie ohne ausdrückliche Entscheidung umschreiben; bei offenem Datenrisiko vor einem nächsten Release eskalieren.

### S-05 – Wiederherstellbare Sicherung vor weiteren riskanten Produktivänderungen
**Status: Separater Entwurf bereits vorhanden, nicht erneut als neues Backup-Projekt anlegen.**

- Bereits vorhandenen [Draft PR #52](https://github.com/kemcap/ayapark2/pull/52) für verschlüsselte Backups berücksichtigen.
- Dort sind Live-Datenbank-/Storage-Export, End-to-End-Validierung, sichere Speicherung und vollständiger Restore-Test noch **nicht** abgeschlossen.
- Vor produktiven Berechtigungsmigrationen oder riskanten Bereinigungen dokumentierte Wiederherstellungsmöglichkeit verlangen.
- Keinen Backup-Automatismus und keine externen Übertragungen ohne ausdrückliche Freigabe einschalten.

## Bearbeitungsregeln für diese Liste

- **Priorität:** sekundäre Anforderungen nach den jeweils ausdrücklich ausgewählten Hauptaufträgen; **Sicherheitsrisiken und mögliche Datenexposition sofort gesondert kenntlich machen**.
- **Statusdisziplin:** `implementiert in GitHub` / `live verifiziert` / `noch offen` strikt unterscheiden. Dokumentationsstände können veraltet sein; vor jedem Eingriff erneut prüfen.
- **Keine Redundanz:** Bestehende PRs #48, #50 und #52 fortführen oder überprüfen, keine parallelen Neuentwicklungen derselben Funktion.
- **Kein verdeckter Arbeitsauftrag:** Diese Datei speichert Wünsche und Restprüfungen. Sie autorisiert weder Codeänderungen noch Datenbankänderungen oder Livegang.
- **Schrittfolge:** Nach einer ausgeführten Aufgabe immer Ergebnis, Erfolgskontrolle und die konkrete nächste Aufgabe erklären; falls Nutzerhandlungen erforderlich sind, präzise Menüpfade angeben.
