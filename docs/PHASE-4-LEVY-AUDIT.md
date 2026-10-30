# Sonderumlagen und Beschlussnachweise – Bestandsabgleich 30.10.2026

Keine echte Forderung angelegt oder verändert. Vor neuer Umsetzung wurden vorhandene Entwurfs-/Verteilungs-/Buchungswege geprüft.

## Bereits vorhanden und weiterzuverwenden

- `finance-forms.mjs`, `finance-v5.mjs`: Sammelforderungen für alle/Block/gewählte Wohnungen, gleiche Beträge, Gesamtsummen oder ganzzahlige Arsa-Payı-Gewichte. Exakte Verteilung mit Restcent-Behandlung und getrennte Schuldgruppen. Pflichtreferenz der Grundlage, Vorschau und ausgewählte Schuldner.
- `ay3_submit_charge_draft`, `ay3_decide_charge_draft`: delegierte Verwaltung reicht ohne Forderungsbuchung ein; nur Superadmin finalisiert. Sperre der alten direkten Verwaltungs-Finalisierungswege. Idempotente Entscheidung; abgelehnte Entwürfe erzeugen keine Forderung.
- `charge-drafts.mjs`: Verwaltungs-/Superadmin-Liste mit Fälligkeit, Basisreferenz, Gesamtbetrag, Wohnung und ausgewähltem Schuldner.
- Aktuelle 50 Finanz-, 84 Rechte- und 43 Historienprüfungen sichern bereits Verteilung, atomaren Rollback, Originalschuldner und Schutz vor automatischer Übertragung alter Schulden. Kein zweites Verteilungs- oder Buchungssystem aufbauen.

## Tatsächliche Lücken gegenüber Entscheidung 24

1. Eine mindestens drei Zeichen lange `basis_ref` ist noch kein separat geprüfter externer Beschlussnachweis. Die vorhandene Freigabe speichert keine eigenständige Erklärung zur Prüfung von unterschriebenem Beschluss/Karar-Defteri-Bezug, Beschlussdatum und Verantwortlichkeit. Nicht als automatisch rechtsgültige Beschlussfassung bezeichnen. Die rechtliche Mehrheits-/Vollmachtsprüfung bleibt ausdrücklich außerhalb der Software.
2. Eigentümer haben derzeit keine ausdrücklich freigegebene Einsicht in einen noch nicht gebuchten Umlagenentwurf. `ay3_charge_drafts` ist per RLS für Superadmin oder den dazu berechtigten Einreicher sichtbar. Eine spätere Eigentümerprojektion darf nur die eigene betroffene Wohnung/Teilbelastung und freigegebene Beschlussinformationen zeigen; keine fremden Schuldner oder vollständigen internen Entwurfsdaten.
3. Die Sammelprüfung wählt nur aktuell aktive, nicht archivierte Eigentümer-/Mieterbeziehungen, zusätzlich begrenzt auf die Fälligkeit. Das ist kein vollständiges Modell einer historischen, manuell bestätigten Verantwortlichkeit aufgrund eines früheren Beschluss-/Leistungszeitpunkts. Historische Originalforderungen sind geschützt; eine neue rückwirkende Umlage darf deshalb nicht automatisch dem heutigen Eigentümer zugewiesen werden. Keine pauschale Umstellung sämtlicher Aidat-/Umlagen-Schuldner auf historische Beziehungen.
4. Beschlussnachweise sind noch nicht mit dem später geplanten privaten Dokumentenarchiv verbunden. Ein öffentlicher Link auf unterschriebene Originaldokumente ist kein zulässiger Ersatz für private RLS-/Storage-Rechte.

## Nächster konkreter Umsetzungsschritt

Bestehenden Forderungsentwurf um eine getrennte Umlagenprüfung ergänzen: gezielt freigegebene Eigentümereinsicht, ausdrückliche Superadmin-Erklärung zum externen Beschlussnachweis, dokumentierter Verantwortlichkeitszeitpunkt und unveränderliche Bindung an genau den geprüften Entwurf/Verteilungsschlüssel. Freigabe muss bei geändertem Entwurf oder veralteter Vorschau erneut geprüft werden. Die eigentliche Forderungsbuchung weiterhin ausschließlich über den bestehenden geprüften atomaren Freigabeweg auslösen. Historische Schuldner nur nach expliziter, nachgewiesener Auswahl; keine automatische Übertragung von Altlasten.

Zunächst synthetische Prüfungen für betroffene/frühere/fremde Eigentümer, fehlenden Nachweis, geänderte Verteilung, archivierte Beziehungen, delegierte Rechte, Doppelentscheidung und abgeschlossene Zeiträume. Erst danach produktive Schema-/Oberflächenergänzung. Dieser Bericht dokumentiert eine offene Aufgabe, keinen fertigen Umlagenablauf und keine rechtliche Freigabe eines echten Beschlusses.


## Sichere Vorbereitung begonnen

Entwicklungskandidat `supabase/levy-review.sql` und 28 bestandene isolierte Prüfungen in `tests/sql/levy-review.mjs`. Getrennte explizite Freigabe einer eigentümerspezifischen Vorschau ohne Forderungsbuchung; private externe Nachweisreferenz, drei ausdrückliche Prüfbestätigungen (externer Beschluss, Verteilung, Verantwortlichkeit), dokumentierter historischer Verantwortlichkeitszeitpunkt. Aktuelle Eigentümer sehen nur die eigene betroffene Wohnung und vorgeschlagenen Teilbetrag, keine fremden Namen/internen Quellen/Belege. Mieter erhalten daraus keine Eigentümereinsicht. Änderung des zugrunde liegenden Entwurfs blendet die alte Vorschau aus; ursprünglicher Snapshot und Audit bleiben erhalten.

**Nicht produktiv installiert und noch keine vollständige Sonderumlagenfunktion.** Der Kandidat erzeugt keine Buchung und umgeht keine bestehenden Sperren. Noch notwendig: Bedienoberfläche, sichere Bindung der endgültigen bestehenden Buchungsfreigabe an genau diese Dokumentation, Prüfung historischer Verantwortlichkeit in diesem Freigabeweg, vollständige alte/neue Schreibwege, Dokumenten-Anbindung und native Browserprüfung. Erst nach dieser Integration veröffentlichen. Die dokumentierten Bestätigungen sind Erklärungen des Superadmins; keine automatische juristische Gültigkeitsprüfung.
