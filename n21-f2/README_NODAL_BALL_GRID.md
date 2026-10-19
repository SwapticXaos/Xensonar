# Installation: Ballton und gemeinsame Raster

Aktueller Build: `Xensonar_N21_F2_Nodal_Ball_Grid_Test.html`.

1. **III. Nodal Installation → Installation** öffnen.
2. Über der Spielfläche **Ball · Y-Ton** einstellen; 0 setzt den Grundtonpegel auf null. Ball-Reaktion und Residents besitzen weiter ihre eigenen Regler.
3. Bei **Auslösung** zwischen bisherigem kontinuierlichem Ton und **Rasterlinien überqueren** wählen.
4. Vorhandenes Hauptraum-Raster und Modus wählen. **Rasterbasis · Hz** und **Raster verschieben · Cent** verändern die gemeinsamen Einstellungen.
5. **Raster bearbeiten / Schrittzahl** öffnet die bekannte Workbench mit freien Schrittzahlen von 2 bis 256. Eigene gespeicherte Raster stehen in beiden Räumen bereit.

Änderungen an Raster, Modus und Verschiebung gelten auch im Hauptraum. Ein gemeinsamer Raster-Mute unterdrückt hier ebenfalls Linien/Impulse. Sehr dichte Kreuzungen werden auf den frischesten Impuls pro Steuerungsintervall begrenzt.

Der Forge-Sample-Button sitzt jetzt in der freien Fläche **unter Loop und links von Carrier Tuning/Volume**, ohne die Desktop-Zielzeile herunterzudrücken.

[Änderungen, Verträge und Prüfgrenzen](docs/nodal-ball-grid/report.md). Nachweise: `results/nodal-ball-grid/`. Freigabe: `npm run verify:release`; weitere N21-Prüfungen: `npm run test:p4c2-n21`.
