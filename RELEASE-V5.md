# V5 – Produktive Veröffentlichung

Freigabe durch ausdrückliche Anweisung im Gespräch: direkt auf der bestehenden Anwendung veröffentlichen, keine zusätzliche Supabase-Testumgebung.

- PR #23 zusammengeführt, Release-Commit `bf22be3165552be85d97a183a28114be54b7a3ed`.
- Supabase-Migration `v5_notifications_finance` erfolgreich angewandt, Serverversionseintrag `20261025210343`; identischer SQL-Quelltext wie `supabase/migrations/20261025194333_v5_notifications_finance.sql`.
- GitHub Pages im Browser geprüft: V5.0, Produktionsmodus und Modern als Standard. Anmeldeansicht erreichbar; integrierter Beispielbereich geladen.
- Vorher-/Nachher-Fingerprints aller 33 bisherigen öffentlichen Geschäftstabellen identisch. Keine historischen Daten geändert und keine Testmitteilung an Bewohner versendet.
- Neue öffentliche V5-RPCs für `anon` gesperrt, für `authenticated` erreichbar. Workspace im reinen Lesezugriff unter vorhandenen Superadmin-/Verwaltungskontexten erfolgreich.

## Sicherung

Vor der Migration wurde eine konsistente Kopie der betroffenen Geschäftsdaten und der Schema-/Funktionsdefinitionen erstellt und privat dauerhaft gesichert. Rückleseprüfung: 33 Tabellen, 3737 Datensätze identisch; Anwendung der Migration auf die lokale Kopie erhält alle ursprünglichen Felder. Die Kopie enthält personenbezogene Daten und liegt ausdrücklich nicht im Repository.

Die Sicherung umfasst öffentliche Geschäftstabellen und zugehörige Definitionen; Auth-Passwörter, Tokens, Sitzungen und Storage-Dateien sind nicht enthalten. Die Migration verändert Auth und Storage nicht. Es ist kein vollständiges Supabase-Projektbackup. Ein zusätzlicher Supabase-Branch oder kostenpflichtiges Upgrade wurde nicht angelegt.

## Prüfstand und Grenzen

168 JavaScript-, 120 bestehende und 46 neue SQL-Prüfungen bestanden. Vor Veröffentlichung zusätzlich 924 Hauptansichten, 392 Formular-/Pop-up-Ansichten und 144 klassische Varianten ohne horizontalen Überlauf; 112 ausgewählte Axe-Prüfungen ohne gemeldeten Verstoß.

Es wurde keine produktive Finanzbuchung als Test ausgelöst. Ein vollständiger erneuter Login mit echten Bewohnerkonten und physische Android-/iOS-Geräte wurden bei der Veröffentlichung nicht getestet. Die SQL-Berechtigungsregressionen nutzten isolierte synthetische Konten. Die vorhandenen Supabase-Sicherheitshinweise zu alten Triggerfunktionen, einer gesperrten Legacy-Tabelle und Passwortschutz bleiben dokumentierte Altbefunde; die neuen V5-RPCs sind nicht anonym zugänglich.

## Rückfall

Neue Buchungen/Bestätigungen erhalten; kein Zurücksetzen von Tabellen. Bei Problemen die neue Oberfläche und die V5-Schreibfunktionen kontrolliert sperren und eine gezielte Vorwärtskorrektur vorbereiten. Eine Wiederherstellung darf seit der Sicherung neu entstandene Daten nicht überschreiben. Zielgruppen- und Bankdatenschutz müssen auch beim Frontend-Rückfall erhalten bleiben. Weitere Einzelheiten im historischen Entwicklungsbericht V5-REVIEW.md.
