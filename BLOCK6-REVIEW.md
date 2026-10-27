# AYAPARK 2 – Block 6: Mobile Navigation und Ansichtswechsel

Stand: 27.10.2026. Entwickelt ausschließlich auf `feature/block6-mobile-view-switch-20261027` ab `main` (Basiscommit `0488652ed9c1b2e73293ebdc233a6f7ec72ce6fe`). Pull Request #39 ist als **Draft** offen; keine Live-Veröffentlichung oder Datenbankänderung.

## Implementiert
- Unter der vierten mobilen Hauptkategorie `Mehr / Diğer bölümler` erscheint für den berechtigten Superadmin `Ansicht wechseln / Görünümü değiştir` mit der aktuellen Ansicht. Diese Aktion öffnet einen zugänglichen Dialog, der Superadmin-, Verwaltungs- und Bewohneransicht anbietet.
- Die Bewohner-Vorschau kann wie die bestehende Einstellungsansicht über eine konkrete Einheit/Person gewählt werden. Die vorhandenen `mayPreview`-, `previewProjection`- und `changePreviewRole`-Sicherungen werden wiederverwendet. Die simulierte Rolle ist **keine echte Datenbankrolle**, keine Rechtevergabe und keine Erweiterung der zugrunde liegenden Supabase-Authentifizierung.
- Aktive Auswahl im Dialog mit `aria-pressed`, aktuelle Ansicht im mobilen Menü und vorhandenes Vorschau-Banner bei simulierten Rollen.
- Menü schließen beim Tippen außerhalb, Escape oder Scrollen außerhalb; normaler Seitenwechsel schließt das Menü ebenfalls. Untermenüs verbleiben im Dokumentfluss und erscheinen nicht als dauerhaftes Overlay.
- Gewählte Rolle bleibt während der laufenden Sitzung und der internen Navigation erhalten. Nach Abmeldung wird die Vorschau auf Superadmin zurückgesetzt.
- Neue DE/TR-Übersetzungen und mobile Bedienelemente. Desktop-Ansicht/Einstellungen bleiben bestehen.

## Automatische Prüfung
- GitHub Actions `Ayapark Invitation Checks` nach Testkorrektur erfolgreich: **231 Tests bestanden, 0 fehlgeschlagen**, weitere Schritte des Workflows erfolgreich. Erfolgreicher Run: https://github.com/kemcap/ayapark2/actions/runs/40479760100
- Der vorangegangene fehlgeschlagene Run enthielt einen Syntaxfehler in einem neu angelegten Testausdruck; dieser Fehler wurde korrigiert und ist im erfolgreichen CI-Run nicht mehr vorhanden.

## Grenzen und weitere Freigabekriterien
- Ein manueller mobiler Browser-/Touch-/Screenreader-Test (320, 375, 390, 430, 768 und 1000 px, Hell/Dunkel, DE/TR, Rollenvorschau) ist nicht durchgeführt. Die UI-Interaktion wird derzeit durch gezielte Code-/Regressionstests und nicht durch eine vollständige Browserabnahme belegt.
- **Vor einem Produktionsmerge muss die Versionierung der Browsermodule abschließend harmonisiert werden.** Die neue CSS-Datei trägt bereits `?v=5.8.2`, bestehende JS-Importe verwenden weitgehend `?v=5.8.1`. Bei einem sofortigen Merge wären zwischengespeicherte alte Module möglich. Die Codebasis besitzt dafür einen Modulgraph-Regressionscheck. Nicht ohne diesen Abgleich veröffentlichen.
- Pull Request #38 (Block 5) ist separat und noch nicht Bestandteil dieses PRs. Block 6 ist unabhängig und benötigt den Block-5-Merge nicht.
- Produktive Datenbank, RLS, Konten, Benutzerrechte, Historie und Finanzbuchungen wurden nicht verändert.
