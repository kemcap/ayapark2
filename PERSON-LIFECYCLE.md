# Ayapark 2 — Personen: Löschen oder Archivieren

**Status (27.10.2026):** Implementierung auf `feature/person-archive-hard-delete-20261027`. **Nicht auf `main` veröffentlicht; Datenbankmigration in Produktion nicht angewandt.**

## Verhalten

- Im Bereich **Kişiler / Personen** bietet die Personendetailansicht für Superadmins **Löschen / Archivieren**.
- **Endgültig löschen** ist die Vorauswahl, aber erfordert zur Sicherheit die exakte Eingabe des Personennamens und eine Bestätigung. Der SQL-Befehl `DELETE` entfernt die Person tatsächlich aus `ay3_persons`, ihre nicht-finanziellen Wohnung-Verknüpfungen, Zuordnungsregeln, Einladungstokens, ungebundene Zugriffsanfragen und zugeordnete Telefonkontakte. Das ist kein `deleted_at`-Soft-Delete.
- **Archivieren** ist eine explizite Alternative. Es erfordert einen Hinweis (3–500 Zeichen), setzt `ay3_persons.archived_at`, archiviert alle aktuellen Wohnung-Verknüpfungen und zeigt die Person unter **Archiv / Arşiv**. Alte Schuldverhältnisse und Zahlungshistorie bleiben erhalten.
- **Wiederherstellen** macht die Person erneut sichtbar. Frühere Wohnungszuordnungen bleiben absichtlich archiviert.
- Die Aktionen sind serverseitig auf echte Site-Manager / Superadmins begrenzt, auch wenn ein Browser-Aufruf manipuliert wird.
- Beim Versuch, Personen mit `auth_user_id` zu archivieren oder endgültig zu löschen, wird die Aktion blockiert: Ein vorhandenes Supabase-Auth-Konto darf nicht stillschweigend weiter Zugriff behalten. Zugang zuerst separat entziehen/entkoppeln.
- Endgültige Löschung wird blockiert, wenn irgendeine verknüpfte Forderung, Gutschrift oder monatliche Finanz-Ausnahme existiert — auch stornierte Positionen bleiben beweispflichtig. In diesem Fall ist Archivierung die Alternative.
- Altdaten der Buchhaltung, Banktransaktionen und deren Belege werden **nicht** automatisch gelöscht. Backups, Infrastrukturprotokolle und gegebenenfalls externe Dokumente können Daten nach einer endgültigen Stammdatenlöschung weiterhin enthalten; diese Funktion ist **keine** Zusage einer vollständigen DSGVO-/KVKK-Löschung über alle Systeme.

## Dateien

- `supabase/migrations/20261027143000_person_archive_purge.sql`: Datenbankspalten, geschützte RPC, Sperre für Wiederaktivierung archivierter Personen.
- `people-ui.mjs`: Personenliste mit Archiv-Filter, Hinweis und Aktionen.
- `v3-forms.mjs`: Wahl der Aktion, Archivhinweis, Namensbestätigung und Wiederherstellung.
- `app.mjs` / `api.mjs`: Befehlsrouting mit Serverkontrolle und synthetischem Demo-Verhalten.
- `tests/person-lifecycle.test.mjs`: Regressionstests für Auswahl, Bestätigung und Archivfilter.

## Prüfstand

- JavaScript-Syntax aller vier bearbeiteten Module geprüft; fünf isolierte Formular-Smoke-Tests bestanden.
- Integration im separaten `ayapark-auth-staging` **nicht möglich**: dem Auth-Testprojekt fehlt das für diese Funktion notwendige Schema `ay2_private`. Der Migrationsversuch ist mit `schema ay2_private does not exist` fehlgeschlagen und hat keine Migration installiert.
- SQL **nicht** auf Produktion angewendet und keinerlei echte Personen gelöscht.
- Vor Livegang: auf einem vollständigen Schema-Klon mit synthetischen Testpersonen, Rolle, Debitor und Login testen; Backup und Wiederherstellung prüfen; anschließend Migration freigeben, GitHub-Branch mergen, Website-Cache aktualisieren und Testfälle erneut manuell ausführen.
- Andere Löschaktionen (z. B. Forderungsstorno oder Verwaltungsmitglied entfernen) bleiben unverändert und sind **nicht** Teil dieser Änderung. Insbesondere müssen Buchungen als revisionsrelevante Datensätze erhalten bleiben.
