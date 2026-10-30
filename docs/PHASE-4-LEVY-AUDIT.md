# Sonderumlagen und Beschlussnachweise – Umsetzung 31.10.2026

Bestehende Verteilungs-, Entwurfs- und Buchungslogik wiederverwendet. Keine echte Forderung, Person, Beziehung oder Authentifizierung zu Testzwecken geändert.

## Vorhandene Grundlage

`finance-forms.mjs` / `finance-v5.mjs` bieten die Vorschau und exakte Restcent-Verteilung nach Gesamtsumme, gleichen Einzelbeträgen oder ganzzahligen Arsa-Payı-Gewichten. `ay3_submit_charge_draft` erstellt einen Entwurf ohne Forderungsbuchung. `ay3_decide_charge_draft` finalisiert ausschließlich als tatsächlicher Superadmin, idempotent und atomar. Bestehende Originalforderungen und Schuldner bleiben erhalten. Diese Teile wurden erweitert, nicht neu implementiert.

## Ergänzte Prüfung

Sammelforderungen mit Schuldgruppe `capital` durchlaufen jetzt die Sonderumlagenprüfung. Sie verlangen einen ausdrücklich gewählten Verantwortlichkeitszeitpunkt und einen manuell ausgewählten Eigentümer. Abgeschlossene frühere Eigentümerbeziehungen sind bei belegten Start-/Enddaten wählbar, ohne ihre Aktiv-/Archivkennzeichen oder bestehende Schulden zu verändern. Gewöhnliche Aidat-, Bewohner- und Benachrichtigungsregeln bleiben bei ihrer bisherigen aktuellen Beziehungsauswahl.

Superadmin gibt einen eigenen Titel und eine Beschreibung ausdrücklich für betroffene Eigentümer frei. Der interne Entwurfstext wird nicht automatisch als öffentliche Beschreibung übernommen. Eigentümer erhalten nur die eigene betroffene Wohnung, deren vorgeschlagenen Anteil und freigegebene Beschreibung; keine fremden Schuldnernamen, kompletten Rohentwürfe, privaten Nachweisreferenzen oder internen Bankdaten. Ein sichtbarer Wohnungsanteil ist ausdrücklich noch keine persönliche Forderung. Mieter bekommen aus diesem Ablauf keine Eigentümereinsicht. Keine anonyme Veröffentlichung.

Beschlussdatum, private Referenz zum externen unterschriebenen Beschluss/Karar Defteri und Verantwortlichkeitszeitpunkt werden separat dokumentiert. Drei standardmäßig leere Pflichtbestätigungen: externer Beschluss/Nachweis geprüft, Verteilung geprüft, Verantwortliche geprüft. Die Software entscheidet keine rechtlichen Mehrheiten/Vollmachten und beweist die Gültigkeit eines externen Beschlusses nicht. Die Originalquelle muss tatsächlich außerhalb der Software vorliegen und anhand der Referenz auffindbar bleiben. Ein privater Datei-Upload/Download gehört weiterhin zum noch offenen Dokumentenarchiv in Phase 6; keine öffentlichen Originalbeleglinks als Ersatz.

Die endgültige Buchung benötigt eine weitere ausdrückliche Bestätigung. Der Finanzkern akzeptiert neue Kapital-Sammelbuchungen ausschließlich über den bestehenden Entwurfsentscheidungsaufruf mit exakt dem dokumentierten unveränderten Entwurf. Direkter öffentlicher oder bisheriger privater V5-Aufruf kann diesen Ablauf nicht umgehen. Der bestehende Finanzkern bleibt einmal vorhanden: nur sein interner Name/ausdrückliche Zugriffsrechte und die gezielte historisch geprüfte Schuldnerwahl wurden erweitert. Die ursprüngliche gesamte Verteilung, Vorschauprüfung, Transaktion und Auditierung bleiben wirksam.

Ungeprüfte/geänderte Entwürfe, nicht passende Eigentümerzeiträume, veränderte Verteilung und abgeschlossene Forderungszeiträume werden vor erfolgreicher Buchung abgewiesen. Nachträglich geänderte Beziehungsdaten werden beim Buchen erneut geprüft. Die Forderung speichert Review-ID, ursprünglichen Schuldner, Verantwortlichkeits- und Beschlussdatum sowie den Entwurfsfingerprint. Der heutige Eigentümer übernimmt keine Altlast. Dies ist eine technische Bindung an die ausgewählte und vom Superadmin geprüfte Person, keine automatische juristische Bestimmung des richtigen Schuldners.

## Datenerhalt und Rechte

Neue Metadatentabelle mit RLS, ausschließlich SELECT für authentifizierte Clients und nur administrativer Lese-Policy. Änderungen über geprüfte RPCs; kein anonymes Lesen/Schreiben oder Ausführen. Private Finanzkernfunktion ohne Client-EXECUTE. Privilegierter Zugriff prüft tatsächliche bestehende Mitgliedschaften, keine benutzeränderbaren Metadaten.

Freigabe und Dokumentation sind idempotent; andere Wiederholungswerte werden abgewiesen. Die Bindung vergleicht das vollständige JSON zusätzlich zum MD5-Fingerabdruck. MD5 ist hier ein Änderungsmerkmal, kein kryptografischer Beweis. Zurücknahme verlangt eine Begründung und behält den ursprünglichen Snapshot und Audit. Gebuchte Nachweise sind nicht zurücknehmbar; nötige Finanzkorrekturen erfolgen über die vorhandenen protokollierten Korrekturfunktionen mit Erhalt der Originale. Eine Änderung oder Ablehnung des Entwurfs entfernt die vorläufige Eigentümeranzeige. Leere nicht ausgewählte Formularfelder beeinflussen die Prüfung ausgewählter Wohnungen nicht.

Die Migration prüft den Ausgangshash des relevanten Finanzkerns und die exakt erwarteten geänderten Stellen; bei Backendabweichung wird die gesamte Transaktion abgebrochen. Rückfall: Frontend kann auf den vorherigen Stand gesetzt werden, ohne Finanz-/Nachweisdaten zu löschen; der Server blockiert dann weiterhin direkte Kapital-Sammelbuchungen. Die geprüfte Finanzkern-Erweiterung und Nachweistabelle nicht automatisch zurückbauen oder löschen.

## Nachweise und Status

55 isolierte PGlite-Prüfungen mit künstlichen Identitäten: eigene Eigentümersicht, keine Mieter-/Fremd-/anonyme Einsicht, fehlende/geänderte Nachweise, historische Verantwortung, finale exakte Verteilung, Umgehungsversuche, Wiederholung, Sperrperioden, atomarer Rollback, nicht ausgewählte Felder, nachträglich veränderte Beziehungen, RLS und Audit.

74 native Chromium-Prüfungen in DE/TR bei 375 und 1440 Pixeln: tatsächlicher Reviewdialog mit Pflichtbestätigungen, idempotenter Wiederholung, sicherem Text-Rendering, getrennter eigener Vorschau, eigener Buchungsbestätigung, Datenlöschung beim Schließen, entzogenen Rechten und Überbreiteprüfung. Zusätzlich vorhandenes echtes Vorbereitungsformular mit historischem Eigentümer und geänderter Verantwortlichkeitsauswahl durchgespielt. Ausschließlich synthetische RPC-Antworten, kein produktives Konto; keine pauschale Auth-/Mail-/Geräte-E2E-Abnahme.

308 allgemeine Tests erfolgreich, zusätzlich aktuelle Finanzprüfungen 50, Finanzabnahme 31, Historie 43, Kontakte 23, Bankimport 16, Abschluss 46 und Summenfreigabe 29. Bestehende isolierte Rechteprüfungen 84 und Export-Browserregressionen 22 erfolgreich. Die frühere Finanztest-Fixture für Kapitalforderungen nutzt jetzt denselben zwingenden Nachweis-/Freigabeweg; ursprüngliche ältere Baseline bleibt erhalten.

Backend-Installation, GitHub-CI und tatsächliche Frontend-Auslieferung werden getrennt nachgewiesen. Bis dahin ist dies eine vollständig lokal geprüfte Erweiterung im Entwicklungsbranch, keine veröffentlichte Funktion. Nach dem Release folgt Phase 5: vorhandene Budgetbasis mit Monats-/Jahresplanung und vorsichtiger 3–6-Monats-Liquidität ergänzen, echte Bankmittel von offenen Forderungen trennen.


Backend veröffentlicht: Supabase-Migration 20261030214643_documented_capital_levy_approval erfolgreich installiert. Rein lesend bestätigt: 0 Reviewzeilen, 0 offene echte Kapitalentwürfe, RLS aktiv, kein Client-INSERT, kein Client-EXECUTE auf den internen Finanzkern, keine anonyme Review-Ausführung. Vorhandene Advisor-Sammelgruppen vor/nach Änderung gleich; bestehende Hinweise dadurch nicht pauschal erledigt. Keine realen Bewohner-/Auth-/Finanzzeilen zu Testzwecken verändert. Frontend-CI und Pages-Rollout noch separat zu bestätigen.


Frontend veröffentlicht: #72, CI 41133654321 erfolgreich, main d7277a32c851da81f79e00cf23de2b219b809187, Pages 41133899050 erfolgreich. Acht direkt ausgelieferte relevante Anwendungsdateien bytegleich verifiziert. Frühere lokale Vorbereitungs-/Frontend-offen-Vermerke sind überholt. Keine realen Reviews oder Forderungen zur Abnahme erzeugt. Phase 5 bereits isoliert vorbereitet; Backend-/Bedienintegration weiterhin offen.
