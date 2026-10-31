# Supabase-Advisor-Abgleich und Clientrechte – 31.10.2026

## Rein lesend bestätigter Bestand

Vier Advisor-Gruppen: RLS ohne Policies (fünf Tabellen), anonyme SECURITY-DEFINER-Funktionen, authentifizierte SECURITY-DEFINER-Funktionen, deaktivierter Leak-Passwortschutz. Kein pauschales „alles sicher/alle Hinweise behoben“.

Alle fünf policyfreien Tabellen (ay_auth_private.login_limits, ay_auth_private.phone_contacts, public.ay3_invite_tokens, public.ay_access_requests, public.ayapark_admins) haben RLS und keine SELECT-/INSERT-Privilegien für anon/authenticated. Das ist beabsichtigter geschlossener Zustand für interne geprüfte Helfer. Keine pauschalen offenen Policies hinzufügen.

Öffentliche Aggregat-RPC ay3_public_report_summaries ist eine ausdrückliche, bereits isoliert geprüfte feste Summenprojektion aus aktiven manuellen Veröffentlichungen. Kein Originalbeleg-/Personen-/Quellen-/Schuldnerzugriff; diese beabsichtigte anonyme Funktion nicht zur kosmetischen Advisor-Bereinigung abschalten. Authentifizierte SECURITY-DEFINER-RPCs benötigen jeweils interne Site-/Rollen-/Eigenidentitätsprüfung; neue Archiv-/Budget-/Aufgaben-/Prüfpausenendpunkte sind ausdrücklich isoliert geprüft. Der Sammelhinweis allein ist weder Freigabe noch Nachweis eines offenen Zugriffs.

Vier alte Audit-Triggerfunktionen hatten unnötiges öffentliches/authentifiziertes EXECUTE. Sie sind keine regulären Client-RPCs. Zusätzlich auf zehn Anwendungstabellen unnötige Clientprivilegien aus TRUNCATE/TRIGGER/REFERENCES festgestellt. SQL-Härtung nimmt ausschließlich diese DDL-Rechte (unter PostgreSQL17+ außerdem MAINTAIN) und die direkten vier Triggerfunktionsaufrufe zurück. SELECT/INSERT/UPDATE/DELETE, RLS, bestehende Trigger, Tabellenoriginale und Funktionsdefinitionen bleiben erhalten. Keine Datenlöschung oder tatsächlicher TRUNCATE-Versuch in Produktion.

## Isolierte Prüfung

17 PGlite-Prüfungen: vollständiger SELECT-/DML-/RLS-Vorher-/Nachhervergleich, verbotene Client-DDL, direkte Funktionsrechte und tatsächliche bestehende Personen-/Beziehungs-/Portal-Audittrigger nach Entzug. Auditereignisse werden weiterhin erzeugt. Ausschließlich künstliche Datensätze, kein Bank-/Forderungsdatensatz entsteht. Produktiv später nur Privileg-/Metadatenabgleich; keine Produktivmutation zum Testen.

## Kosten und Passwortentscheidung

Aktuelle offizielle Supabase-Dokumentation https://supabase.com/docs/guides/auth/password-security bestätigt: Leak-Passwortschutz erst Pro und höher. Supabase Free bleibt verbindlich; keine kostenpflichtige Aktivierung und keine Änderung an echten Passwörtern oder Authkonten. Die dokumentierte bewusst einfache Mindestlänge sechs bleibt Nutzerentscheidung; der verbleibende Advisor-Hinweis wird transparent dokumentiert, nicht als behoben markiert. Keine eigene externe Passwortübertragung/Leak-Prüfung nachbauen.

Technische Grundlagen zusätzlich geprüft: https://www.postgresql.org/docs/current/sql-createtrigger.html und https://www.postgresql.org/docs/16/ddl-priv.html. Bestehende Triggerfunktionalität nach Rechteentzug wird praktisch isoliert nachgewiesen.

## Rollout/Rückfall

Separater Branch fix/client-ddl-and-audit-trigger-privileges-20261031. Migration/CI separat bestätigen. Kein automatisches Wiedererteilen breiter DDL-Rechte bei Frontend-Rückfall; falls eine konkrete Funktion unerwartet benötigt wird, erst ihren isolierten Nachweis prüfen. Tabellen-/Funktionsbesitzer behalten für Migration/Servicebetrieb erforderliche Rechte. Keine Änderung allgemeiner Default-Privileges oder fremder Extensiontabellen. Neue Tabellen weiterhin mit expliziten minimalen Grants/RLS anlegen.

Reale Auth-/Mail-/Geräte-/Storageabnahme und tatsächliche finanzielle Originalquellenbestätigung bleiben getrennt offen. Backup auf Nutzerwunsch nicht erneut bearbeitet.

Direkter Katalogabgleich ergänzt den vierten internen Audittrigger (site_unit_status_audit_trigger), der im begrenzten Advisor-Auszug zunächst nicht aufgeführt war. Alle vier direkten Client-Ausführungen entzogen. Isolierter Nachweis erweitert auf17 Prüfungen einschließlich echter synthetischer Wohnungsstatusänderung mit weiter ausgelöstem Audit. Tatsächliche Migrationen20261031071623 und20261031071802 installiert. Lese-/DML-/RLS-Fingerprint sämtlicher Anwendungstabellen vor/nach erster Härtung identisch, keine Client-DDL-Rechte mehr, vier Audittrigger bleiben angebunden. Anonym ausführbar bleibt nur die absichtlich begrenzte öffentliche Summenprojektion; keine pauschale Null-Advisor-Behauptung. Frontend-Prüfpause #82 über Pages41179801684 erfolgreich ausgeliefert; sieben Live-Dateien bytegleich bestätigt.
