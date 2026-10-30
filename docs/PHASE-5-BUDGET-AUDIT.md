# Budget, Rücklagen und Liquidität – Integration 31.10.2026

## Bestand erhalten

`ay5_budget`, der bestehende `budget`-Befehl und `availableBudget` bleiben die Grundlage. Zweckgebundene Rücklagen, alte Planpauschale, Begründungen und bisherige Audits werden nicht konvertiert oder gelöscht. Neue Planpositionen sind Budgetmetadaten, keine Bewohnerforderungen oder Bankbuchungen. Es gibt keine neue delegierte Berechtigung: tatsächliche Finanzleser lesen, nur Superadmin verändert Budgetdaten.

## Monats-/Jahresplanung und Szenarien

Monatspositionen für Ausgaben, Reparaturen und erwartete Einnahmen mit Entwurf/Planbestätigung/Stornierung. Versionsprüfung und idempotente Anfragen verhindern verlorene Änderungen und doppelte Wiederholungen; vorher/nachher, Akteur und Begründung sind auditiert. Bereits zugeordnete Bankbeträge schützen Betrag, Art und Stornierung gegen stillschweigende Änderungen. Für Korrekturen erst die Zuordnung nachvollziehbar zurücknehmen.

Serverseitiger Ist-Stichtag ist das aktuelle Datum Europe/Istanbul. Bankbestand = bestätigter Anfangsbestand plus echte gebuchte Bewegungen seit Anfangsdatum bis Stichtag. Bewegungen vor dem Anfangsbestand werden nicht doppelt gezählt; zukünftige Buchungen und offene Forderungen erhöhen den heutigen Bankbestand nicht. Gegenbuchungen wirken nur über tatsächliche Buchungen. Unbekannter Anfangsbestand bleibt unbekannt, kein erfundener Nullsaldo.

3-/6-Monats-Vorschau mit zwei getrennten Linien: ohne weitere Einnahmen, sowie mit ausdrücklich geplanten Einnahmen als Annahme. Offene Forderungen werden separat angezeigt und niemals automatisch als Cash behandelt. Alle nicht stornierten Restkosten, auch Entwürfe, belasten die vorsichtige Planung. Überfällige ungezahlte Kosten erscheinen im ersten Vorschaumonat. Negative Liquidität und freie Mittel bleiben negativ sichtbar. Jahresplan trennt Einnahmen, laufende Ausgaben und Reparaturen; keine Vermischung mit tatsächlichen Bankberichten.

## Bereits gebuchte Teilbeträge

Eine Zuordnung verweist auf eine echte passende Bankbewegung derselben Anlage. Keine künftige, stornierte, Transfer- oder falsche Vorzeichenbuchung. Summe aller aktiven Budgetzuordnungen je Bankbewegung überschreitet deren Betrag nicht; Summe je Plan überschreitet dessen Planbetrag nicht. Dies erzeugt weder eine zweite Bankbuchung noch eine Bewohnerzahlung/-forderung. Eine spätere Gegenbuchung entfernt den ursprünglichen Betrag aus der als bezahlt berücksichtigten Plansumme; Originale und Zuordnungsprotokoll bleiben erhalten. Zuordnungsrücknahme braucht Begründung.

## Alte Pauschale ausdrücklich abgleichen

Bei vorhandener alter Planpauschale wird die Detailprognose bis zum expliziten Abgleich gesperrt. Superadmin wählt entweder eine zusätzliche übernommene Kostenposition oder bestätigt, dass die alte Bruttosumme in vorhandenen Detailplänen abgebildet ist. Bereits echt bankgebuchte Teilbeträge solcher Detailpositionen werden anschließend nicht nochmals als künftiger Abfluss gezählt. Die Zuordnung der fachlich richtigen Kosten prüft der Administrator; Software beweist keine semantische Gleichheit unterschiedlicher Bezeichnungen.

Ursprüngliche Pauschale bleibt erhalten. Eine neue manuelle Gesamtbudgetversion – auch bei identischen Zahlen – bekommt eine neue Planungsrevision und benötigt neuen Abgleich; idempotente Wiederholung erzeugt keine neue Revision. Eine reine dokumentierte Rücklagenfreigabe ändert diese Planungsrevision nicht. Nach Übernahme sind weitere Änderungen/Stornierungen der Detailpläne bewusste, auditiert begründete Planentscheidungen.

## Rücklagenverwendung ohne Zahlung

Eigene Superadmin-Freigabe mit Betrag, externer Beschluss-/Nachweisreferenz, Begründung, optional dokumentiertem Notfall und standardmäßig leerer Pflichtbestätigung. Betrag darf tatsächlichen Bankbestand und bestehende Zweckbindung nicht überschreiten. Reduziert ausschließlich die aktuelle Zweckbindung; keine Überweisung, Bankbuchung oder Forderung. Keine automatische juristische Prüfung der Beschluss-/Notfallgrundlage. Diese ist tatsächlich extern zu prüfen. Unveränderliches Freigabeprotokoll bewahrt vorher/nachher und Referenz; erneute gleiche Anfrage gibt dieselbe Entscheidung zurück.

Auch der bisherige Budgetaufruf kann Zweckbindung nicht ohne diesen Ablauf reduzieren. Neue/erhöhte Zweckbindung bleibt über den bestehenden geprüften Befehl möglich. Die Prognose verwendet die bereits bestätigte aktuelle Zweckbindung und reduziert sie nicht ein zweites Mal. Private Nachweisreferenzen bleiben Superadmin vorbehalten; allgemeine Finanzleser sehen die Plansummen, nicht diese privaten Freigabequellen.

## Oberfläche und Datenerhalt

DE/TR, Monats-/Jahresauswahl, 3-/6-Monatskarten, klar getrennte erwartete Einnahmen, tatsächliche Bankteile, Rücklagenbindung und -freigabe. Alte pauschale Freisaldoanzeige führt im verbundenen Modus zur Detailplanung, damit alte und neue Kosten nicht als widersprüchliche Gesamtsumme dargestellt werden. Betragsverbergen wird über die vorhandene Maskierung auch auf die neuen Anzeigebeträge angewendet. Keine versteckten Beträge aus URL/Dauerspeicher. Dialogdaten beim Schließen entfernt, laufende Antwort bei Standort-/Sitzungswechsel verworfen.

Neue Tabellen haben RLS; Clients können nicht direkt schreiben. Interne Cash-/Request-Helfer ohne Client-EXECUTE, alle öffentlichen Zugriffe mit tatsächlicher Rolle. Exakte Ausgangshashprüfung des Finanz-Wrappers verhindert Installation auf abweichendem Backend. Rollback ohne Datenverlust: vorherige Oberfläche wiederherstellbar, neue Serverfreigabe und Budget-/Auditmetadaten behalten. Nicht automatisch Rücklagenwerte, Zuordnungen oder Planhistorie löschen oder den alten ungeschützten Reduktionsweg wieder öffnen.

## Nachweise und Veröffentlichung

Neun reine Rechenkernprüfungen, 53 isolierte Datenbankprüfungen und 66 native DE/TR-Browserprüfungen bei 375/1440 Pixeln erfolgreich. Abgedeckt: echte Cash-Abgrenzung inklusive Voröffnung/Future, alte Pauschale und Bruttoteilzahlung, Versions-/Wiederholungskonflikte, doppelte Bankzuordnung, Rücknahmen, Bankgegenbuchung, keine automatische Zahlung, fehlender Bankbestand, dokumentierte Rücklagenfreigabe, Umgehungsversuche, Rechte und Audit. Zusätzlich allgemeine Suite 317 sowie aktuelle Finanz-/Historien-/Import-/Sonderumlagen-/Abschlussregressionen erfolgreich. Ausschließlich künstliche Testdaten; keine pauschale reale Auth-/Mail-/Gerätegesamtabnahme.

Backendmigration 20261030221947_budget_plans_cash_forecast_and_reserve_approval erfolgreich installiert. Rein lesend bestätigt: 0 echte Planpositionen, 0 Budgetbankzuordnungen, 0 Rücklagenfreigaben; bisherige Budgetwerte per Hash unverändert. Keine anonymen Budgetaufrufe, kein direkter Clientzugriff auf private Cash-Funktion oder Tabellenänderungen. Frontend-CI/Live-Auslieferung separat zu bestätigen. Danach Phase 6: privates Datei-/Versammlungsarchiv und einfache Aufgaben/Erinnerungen, keine erneute Budget-/Bankbuchhaltung.


Frontend veröffentlicht: #74, CI 41137806656 erfolgreich, main 0c4476ecf4af87bfe6576ae9b4337008f32d6264, Pages 41138023176 erfolgreich. Fünf relevante Live-Dateien bytegleich bestätigt. Keine echten Pläne/Bankzuordnungen/Rücklagenfreigaben für die Abnahme erzeugt. Frühere Frontend-offen-Vermerke sind überholt. Phase 6 folgt.


Zusätzliche Härtung: Der generische Operationsverlauf ist für neue administrative Payloads ausschließlich Superadmin-lesbar, einschließlich älterer Budget-/Rücklagenpayloads ohne Kennzeichen. Damit bleiben private Referenzen nicht nur in der Arbeitsansicht, sondern auch im direkten Tabellenlesepfad verborgen. Bereits protokollierte Requests werden nicht umgeschrieben; Wiederholung bleibt kompatibel. 57 Budget-SQL-Prüfungen erfolgreich, Migration 20261030223550 aktiv. Finanzleser behalten normale Finanzoperationen und vorgesehene Planansichten. Keine echten Daten geändert.
