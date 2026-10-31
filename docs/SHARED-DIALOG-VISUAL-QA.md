# Gemeinsame Dialogdarstellung – 31.10.2026

Archiv, Aufgaben und Prüfpause teilen archive.css. Die erste Fassung nutzte fremde Variablennamen --surface/--text/--border; die Anwendung definiert --paper/--ink/--line. Auf echte Themevariablen umgestellt, damit dunkle/helle und Classic-/Modern-Ansicht konsistent bleiben. Labels/Hinweise respektieren vergrößerte Grundschrift, einspaltige Formulare haben explizite flexible Mindestbreite und lange Texte dürfen umbrechen. Cacheversion der CSS46; keine Daten-, Rechte-, Auth- oder Finanzänderung.

86 native Browserprüfungen mit sämtlichen realen App-Stylesheets: drei Dialoge, Classic/Modern, Hell/Dunkel,375px mit24px Grundschrift/1440px normal, Kontrast>=4,5, gleiche Themefarben, keine horizontalen Überläufe und skalierende mobile Formlabels. Dunkle mobile Ansicht visuell kontrolliert. Native Alt-/Datei-/Aufgaben-/Prüfpausenbedienung separat geprüft; tatsächliche Gerätegesamtabnahme bleibt offen. Allgemeine Suite337 ohne Fehler.

Nächster Schritt ist die echte Sitzung-/Storage-/Mail-/Geräteabnahme in FINAL-ACCEPTANCE-OPEN.md. Keine pauschale Gesamtfertigmeldung, kein Backup-Neustart.

Theme-/Schriftfix #84 veröffentlicht: main37d69403bb7fd33eb2bea6ef730547714c1c9101, CI41180568814 und Pages41180701638 erfolgreich; Index/CSS mit exakt gemergtem Stand bytegleich geprüft.

Zusätzliche semantische Abnahme: Archiv/Aufgaben/Prüfpause erhalten lokalisierte zugängliche Dialognamen über aria-labelledby. Unabhängiger axe-core-Scan aller24 real gestylten Dialog-/Theme-/Breitenkombinationen ohne gemeldete Verletzung; zusammen110 Browserprüfungen. Vor Messung Ende vorhandener Öffnungsanimation abwarten, damit Zwischenopazität nicht fälschlich als dauerhafter Kontrast gemessen wird. Kein Ausschalten der Animation oder Einschränken der axe-Regeln. Cacheversion47 für betroffene Controller/App. Dies ist eine gezielte Dialogprüfung, keine Behauptung vollständiger Barrierefreiheit der ganzen Anwendung auf realen Geräten.
