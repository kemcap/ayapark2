# Phase 6 – Einfache Aufgaben und interne Terminhinweise

31.10.2026: implementiert und isoliert geprüft, Rollout separat bestätigen.

Bestand abgeglichen: bisher nur aus vorhandenen Forderungen/Dienstleisterterminen abgeleiteter Bereich „Sırada ne var?“; keine persistente Aufgabenliste oder automatische Wiederholungsanlage. Bestehende Personen-/Verwaltungsmitgliedschaften, Dienstleister, privates Dokumentenarchiv, Audit und privater idempotenter Anfragenhelfer werden genutzt. Keine neue sechste delegierte Berechtigung.

## Verhalten

Aufgabe mit Beschreibung, aktuellem verantwortlichem Verwaltungsmitglied, Termin, Priorität, Status und optional vorhandenem Dienstleister/Originaldokument. Aufgaben enthalten Verwaltungsnotizen und bleiben tatsächlicher Verwaltung vorbehalten. Superadmin legt an/ändert; Verwaltung liest. Zugewiesene Verantwortung erteilt keine zusätzlichen Finanz-, Sicherheits- oder Dateibefugnisse. Bewohner/entfernte Mitglieder sehen weder Aufgaben noch Zuständigkeiten. Statusänderungen protokollieren unveränderten Vorherstand und Nachherstand mit Revision/Begründung. Kein physisches Löschen.

Interne automatische Datumsanzeige bei Laden/Öffnen/Aktualisieren: überfällig, heute, nächste sieben Tage. Stichtag serverseitig Europe/Istanbul. Keine E-Mail-, Push-, SMS-/WhatsApp-Nachricht und kein Hintergrund-Cron. Aufgabenübersicht direkt auf Startseite; Lesefehler wird als nicht verfügbar angezeigt, niemals fälschlich als null offene Aufgaben. Offene Aufgaben zuerst, Liste auf 300 begrenzt; Zähler zählen alle relevanten Aufgaben.

Erledigen erzeugt niemals automatisch eine neue Aufgabe. Separate manuelle Folgevorbereitung nur nach erledigter Quelle; eigener späterer Termin und ausdrückliche Bestätigung. Quellaufgabe bleibt erledigt, Verweis erhalten; doppelte Folgeanlage für dieselbe Quelle und dasselbe Datum serverseitig gesperrt. Gleiche unklare Anfrage darf idempotent wiederholt werden. Keine automatische Bestellung, Beauftragung, Zahlung oder Finanzfreigabe.

Dokumentverknüpfung prüft gleiche Anlage/bestätigten Stand. Bisherige Originalverweise bleiben bei Änderungen erhalten; eine spätere Rücknahme der Datei erweitert keine Leserechte. Dateilink/-ID nur bei aktueller Dateiberechtigung ausgegeben. Direkte Spaltenrechte verhindern ein Umgehen der Workspace-Projektion. Dokumentschaltfläche führt zum getrennt autorisierten privaten Originaldownload.

## Prüfungen und Grenzen

35 isolierte SQL-Prüfungen zu Rollen, fremden Zuständigkeiten/Dienstleistern/Dokumenten, Revision, Idempotenz, 7-Tage-/Heute-/Überfälligkeit, Status, manueller Wiederholung, doppelter Folgeanlage, Rechteentzug, privaten Links/Audit und fehlenden Finanzwirkungen.

52 native DE/TR-Browserprüfungen bei 375/1440 px: Bestätigungen, unveränderte Wiederholung nach unklarem Ergebnis, Erledigen ohne Folgeanlage, manuelle spätere Folgeaufgabe, escaped Beschreibung, geschützte Dokumentdelegation, Lesen/Schreiben, Dialogbreite und tatsächlicher kompletter Demo-App-Einstieg mit aktualisiertem Modulgraphen. Ausschließlich synthetische Identitäten und RPCs. Zusätzliche Prüfung des wirklichen API-Clients schließt neue Aufgabenendpunkte ein; Bewohner-Rollenvorschau entfernt Verwaltungsdaten.

Kein Testauftrag, kein produktives Konto oder Originaldokument angelegt, keine echte Bestellung/Nachricht/Zahlung. Reale Auth-/Geräteabnahme bleibt gesondert erforderlich. Backup explizit übersprungen; keine Aktivierung/Restorebehauptung.

## Rollout/Rückfall

Separater Branch feature/management-tasks-reminders-20261031. Migration erst nach lokalen Tests; tatsächliche Version übernehmen. CI/Pages und ausgelieferte Dateien bestätigen. Frontend-Rückfall auf vorherigen geprüften Stand, Tabellen/Originale/Audits erhalten; keine destruktive Rückmigration. Management-Workspace fällt beim allgemeinen Laden separat aus, ohne Finanz-/Anmeldedaten zu erfinden oder ansonsten lesbare Finanzansichten zu sperren.

Nächster Abgleich: verbleibende übergreifende Sicherheits-/Finanz-/Auth-/Mail-/Geräteabnahme und dokumentierte freundliche Forderungshinweise Tag 7/21/interne Prüfung35 gegen tatsächlichen Code prüfen; keine externen Nachrichten ohne ausdrücklichen Versandauftrag.
