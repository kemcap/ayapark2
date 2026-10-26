# V5.1 – Sieben UX-Anpassungen

Implementiert: Installationsbanner mit Android-/iOS-Anleitung; persönliche offene Beträge und Wohnungssumme; mobile Rollen-Vorschau mit schreibgeschützter Projektion; kompakter Link Zahlungen & Verlauf; gemeinsame Liste aktiver und abgelaufener Mitteilungen; sequenzielle Pop-ups mit Fortschritt; Schließen mobiler Untermenüs beim Seitenscrollen.

Nachweise: 178 Anwendungstests, 120 bestehende SQL-Tests und 50 V5-SQL-Tests bestanden. SQL-Tests ausschließlich mit synthetischen Daten in isoliertem PGlite. Keine produktiven Finanzdaten verändert. Abschließende Browserprüfung auf ausdrücklichen Benutzerwunsch ausgelassen; reale Android-/iOS-Installation nicht geprüft.

Die neue Migration ersetzt ausschließlich ay2_private.ay5_receives, um abgelaufene Mitteilungen für ihre bisherigen Zielgruppen lesbar zu halten. Zielgruppenprüfung bleibt erhalten, abgelaufene Mitteilungen zählen nicht als ungelesen und lösen keine Pop-ups aus. Migration ist im Entwicklungsbranch enthalten und mit diesem GitHub-Upload nicht produktiv ausgeführt. Rückfall: bisherige Funktionsdefinition aus der V5-Migration wiederherstellen (Ablaufdatumsfilter); Frontend auf vorherigen Main-Commit 50da6e98f971e98064c1448e14f00fa0dac4da1a zurücksetzen.

Teststeuerung ausschließlich für Superadmin, lokal ohne echte Empfänger oder produktive Lesebestätigungen. Drei Testmitteilungen können nacheinander angezeigt und deaktiviert werden. Die beispielhaften 7.500 ₺ für B6 wurden nicht gebucht.
