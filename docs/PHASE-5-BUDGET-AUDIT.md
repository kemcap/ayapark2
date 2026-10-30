# Budget, Rücklagen und Liquidität – Vorbereitung 31.10.2026

## Bestand geprüft

`ay5_budget` und der vorhandene `budget`-Befehl enthalten zweckgebundene Rücklagen, geplante Ausgaben, Begründung, Akteur und Zeitpunkt. `availableBudget` berechnet bereits Bankbestand minus gebundene und geplante Mittel. Finanzleserechte schützen Details, Änderungen sind Superadmin vorbehalten; vorhandene Änderungsaudits werden weiterverwendet.

Noch keine eigenständigen Monats-/Jahresplanpositionen, Reparaturplanung, nachvollziehbare Teilverbuchungen gegen Planpositionen, serverseitig bestätigte Rücklagenentnahme oder 3–6-Monats-Szenarien. Keine doppelte Budget-/Bankbuchhaltung anlegen.

## Isoliert vorbereiteter Rechenkern

`budget-planning.mjs` und neun reine Prüfungen: tatsächlicher Bankbestand wird getrennt von offenen Forderungen behandelt. Konservative Linie enthält keine angenommenen Geldeingänge; eine getrennte Szenariolinie darf ausdrücklich geplante Einnahmen enthalten. Alle noch nicht stornierten Ausgaben/Reparaturen, auch noch nicht freigegebene Pläne, belasten die vorsichtige Planung. Überfällige ungezahlte Plankosten werden in den ersten Vorschaumonat übernommen und verschwinden nicht durch Wechsel des Kalendermonats.

Bereits tatsächlich bankgebuchte Teilbeträge werden nicht erneut abgezogen. Zweckbindung verändert sich in der Simulation ausschließlich bei ausdrücklich freigegebenem Rücklageneinsatz; eine unbestätigte Planposition löst keine Reservefreigabe aus. Negative Bank-/freie Mittel bleiben als Unterdeckung sichtbar. Unbekannter Bankbestand ergibt keine erfundene Null-Liquidität. Exakte Centwerte, Grenzen, 3/6 Monate über Jahresgrenzen, Kalenderjahresbudget mit getrennten Reparaturen/Ausgaben/Einnahmen geprüft.

Dies ist nur eine Prognoseberechnung, keine Zahlung, Finanzbuchung, Rücklagenentnahme oder rechtliche Beschlussprüfung. Nicht mit der produktiven Anwendung verbunden und noch nicht veröffentlicht.

## Nächste Integration

1. Vorhandene Budgetwerte erhalten. Alte summarische „geplante Ausgaben“ müssen ausdrücklich gegen neue Detailpositionen abgeglichen werden; nicht stillschweigend vergessen oder zusätzlich doppelt abziehen.
2. Echten Bankbestand mit klarem Ist-Stichtag und nur tatsächlich gebuchten Bewegungen serverseitig berechnen. Zukünftige Buchungsdaten/offene Forderungen dürfen den heutigen Bankbestand nicht erhöhen.
3. Planpositionen mit Monat, Kategorie, Reparaturstatus, Priorität und manueller Freigabe speichern; Originale/Audit bei Änderungen erhalten. Rollen-/RLS-Prüfung serverseitig, keine sechste delegierte Berechtigung erfinden.
4. Bereits gebuchte Teilbeträge ausschließlich durch überprüfte Verknüpfung auf echte Bankbewegungen erfassen. Kein frei im Browser behaupteter „bezahlt“-Status als Ist-Nachweis. Auch dieselbe Bankbewegung nicht mehrfach budgetwirksam zuordnen.
5. Separaten Superadmin-/Beschlussnachweis für Rücklagenverwendung vorsehen. Die reine Prognoseflagge ist noch keine sichere serverseitige Freigabe. Keine automatische Zahlung.
6. DE/TR-Oberfläche mit Jahres-/Monatsplanung und klar beschrifteten 3-/6-Monats-Szenarien; Rechte, Salden, Planänderungen und mobile Bedienung isoliert sowie im Browser abnehmen.

Kein Produktivschema und keine echten Plan-/Finanzdaten für diese Vorbereitung verändert. Die bestehende Gesamtbudgetfunktion bleibt unverändert.
