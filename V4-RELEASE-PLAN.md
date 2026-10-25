# V4 – Freigabe- und Rollback-Plan

Produktionsbasis: deef766bbc22f2aa7b7bb4d6bf8b2ffc64e74c4c (V3.15).
Lokaler Tag v3.15-before-v4, zentrale Baseline-Branch baseline/v3.15-before-v4. Remote-Tag mangels passendem Schreibweg noch ausstehend.

1. ayapark-v4 und den zugehörigen Pull Request als Entwicklung/Draft belassen. Nicht nach main mergen und keine bestehende Pages- oder GPT-Site-Bindung umstellen.
2. Größere Entscheidungen D1–D3 aus UI-UX-AUDIT-V4.md durch Kemal freigeben lassen. Diese Freigabe ist noch keine Freigabe zur Produktivveröffentlichung.
3. Vor Backendänderungen vollständige Sicherung und isolierte Umgebung prüfen. Aktuelle Schemafixture ist ein Testmodell, keine vollständige Supabase-Instanz oder vollständige Wiederaufbau-Migrationshistorie.
4. Alle drei bekannten SQL-Befunde lösen und in der isolierten Umgebung grün nachweisen. Keine Tests abschwächen. Grants, RLS, Finanzverantwortung und historische Forderungen vergleichen.
5. Echten Auth-/Recovery-/SMTP-Integrationstest mit kontrolliertem Testkonto sowie native mobile Prüfung durchführen. Keine echten Bewohner anschreiben oder deren Daten als Test ändern.
6. Erst für eine ausdrücklich freigegebene Produktionsfassung den Preview-Marker, die Netzwerksperre und die erzwungene Beispieldaten-Nutzung bewusst in einem separaten, geprüften Release-Commit umstellen. Ein unverändertes Mergen dieser Preview-Branch wäre KEIN korrekter Livegang.
7. Vollständigen Produktions-Diff, Datenbank-Migrationsplan und getesteten Rückweg vorlegen; ausdrückliche Live-Freigabe von Kemal abwarten.
8. Danach GitHub Pages veröffentlichen, tatsächliche Artefakte und Zugänge prüfen und korrekten Git-Tag/Release erstellen. GPT-Vorschau gesondert behandeln; keine Versionsgleichheit annehmen.

Rückweg während dieser Entwicklung: Preview-Version zurücksetzen und Entwicklungsänderungen verwerfen/revertieren. main und Produktivdaten bleiben unangetastet; keine Datenrücksicherung nötig.

Rückweg nach einem künftigen freigegebenen Livegang: Release-Commit gezielt revertieren und V3.15-Artefakte erneut veröffentlichen. Nur zuvor isoliert geprüfte Schema-Rückmigrationen anwenden; keine alten Finanzdaten pauschal zurückspielen. Die frühere Einschränkung der Legacy-Lesefreigabe darf dabei nicht versehentlich aufgehoben werden.
