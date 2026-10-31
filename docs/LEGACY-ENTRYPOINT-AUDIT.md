# Stillgelegte Einstiegspfade – 31.10.2026

Bestand: `/old/` leitete bereits zur aktuellen Anwendung weiter. Die tieferen Pfade `/old/supabase/`, `/old/site-yonetim/` und `/old/site-yonetim/sakin/` enthielten noch vollständige alte Oberflächen samt eigenem Login-/API-Verhalten. Deren tatsächliche Zugriffsrechte werden nicht pauschal als offen behauptet; sie stellen aber ungewollt weiter bedienbare Alt-Einstiege dar.

Gezielte Änderung: dieselbe bestehende root-relative Weiterleitungslogik für alle vier Altpfade, statischer Fallbacklink zur aktuellen App. Keine alte Loginmaske, kein Start alter APIs oder Sessionbehandlung. Query und Fragment bleiben beim JS-Redirect erhalten, damit vorhandene Callbacklinks das aktuelle Auth-System erreichen. Keine Tokens/Querydaten protokollieren. Kein Löschen lokaler oder produktiver Sitzungen. Frühere Quellstände weiterhin in Git-Versionshistorie; keine History-Umschreibung oder Änderung an Backend-/Bewohner-/Finanzdaten.

18 native Browserprüfungen: vier Pfade, mit/ohne JavaScript, erhaltene synthetische Query/Fragmente, richtiger Fallback, keine alten Formulare, keine externen Anfragen oder Laufzeitfehler. Routenprüfung in lokal isoliertem Browser; Live-Inhalt nach Rollout separat prüfen. Bestehendes Skript `legacy-redirect.js` bleibt unverändert.

Rückfall wäre rein dateibasiert möglich; bestehende serverseitige Rollen-/Finanzschutzregeln bleiben unabhängig. CI-/Pages-/Live-Nachweis separat bestätigen. Nächster Abgleich: finanzielle Erinnerungsschritte7/21/interne Prüfung35 und verbleibende reale Auth-/Mail-/Geräte-/Storageabnahme. Backup bleibt ausdrücklich übersprungen.
