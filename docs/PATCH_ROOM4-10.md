# ROOM4-10: Mehrfachauswahl, Marker, Metronom mit Vorzähler

Basis: ROOM4-09 (`index.html` 8 840 412 B), jetzt 8 854 283 B (+13 871 B, alles im lazy geladenen Raum-IV-Chunk). Zone: WARM (Oberfläche), Metronom HEISS nur während der Wiedergabe (ein Oszillator pro Klick, vorgeplant im bestehenden 200-ms-Takt).

## Mehrfachauswahl
- **Gummiband:** auf leere Spurfläche ziehen, alle berührten Clips (über mehrere Spuren) werden gewählt. Shift/Strg-Klick schaltet einzelne Clips um, `Strg+A` wählt alles, `Esc` hebt auf.
- **Gruppenleiste** („N clips selected“): Mute, Duplicate, Copy, **Loop it** (genau der gewählte Bereich), Remove, Select none.
- **Ziehen** eines gewählten Clips verschiebt die ganze Gruppe um denselben gerasterten Betrag auf der jeweiligen Spur; Alt+Ziehen kopiert die Gruppe. Pfeiltasten (Shift = ein Takt), `M`, `Entf`, `Strg+D` (Kopie direkt dahinter), `Strg+C/V` (Einfügen am Cursor, relative Abstände und Spuren bleiben) wirken auf die Gruppe. Rechtsklick: Stretch/Compress/Reset auf alle.
- Eine Aktion = ein Undo-Schritt.

## Marker
- Benannte Flaggen auf dem Lineal, Taste `B` oder Knopf `⚑ Marker` (am Cursor), Rechtsklick auf das Lineal. Klick springt, Doppelklick benennt um, Rechtsklick: Play from here, **Loop zum nächsten/vom vorherigen Marker**, Umbenennen, zum Cursor verschieben, Löschen. `[` und `]` springen zum vorigen/nächsten Marker.
- Daten additiv: `project.markers` (höchstens 256, in Beats, sortiert). Alte Projekte laden unverändert. Teil des Undo.

## Metronom
- `♩ Click`: Klick auf jedem Beat, höherer Klick auf der Taktlinie (auch bei ungeraden Taktlängen). `1-bar count-in`: ein Takt Klicks vor dem Start. Beide nur in der Oberfläche gemerkt (localStorage), nicht im Projekt.
- Eigener Gain direkt in den Live-Master-Eingang, **nicht im Arrangement-Master und nie im Mixdown**. Aus = kein einziger Knoten.

## Prüfung
- Unit-Test: Marker-Daten (sortiert, Müll verworfen, alte Projekte ohne Marker), Metronom plant jeden Beat genau einmal, Akzent auf Takt 1, keine Klicks bei „aus“.
- Echte App (`tools/probes/multitrack_select_probe.js`): Gummiband wählt 3 von 3 Clips; Gruppenziehen verschiebt alle um 0,4 Beats; M stummschaltet alle; Strg+D verdoppelt (3 → 6), Entf entfernt die Kopien; Strg+A, Esc; zwei Marker (B), Umbenennen, `]` springt, Löschen; Metronom aus: 0 Klicks, an: Klicks im Takt, Vorzähler: 4 Klicks sofort; keine Fehler. 99 Regressionstests grün.

## Grenzen
- Gruppenziehen ändert die Spur nicht (nur Beats). Trimmen und Warp-Kanten wirken weiter auf den einzelnen Clip.
- Das Gummiband startet nur auf leerer Spurfläche, nicht auf dem Lineal.
- Marker folgen dem Raster, nicht dem Tempo: Bei Tempowechsel bleiben sie bei derselben Beat-Position. Das Metronom folgt dem Projekttempo, nicht dem Live-Raum.
- Nicht abgehört: Klickklang (Sinus 1000/1600 Hz, 45 ms).
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Nicht: Abhören, Gerät, Firefox/Safari, USER_ACCEPTED. Rollback: Commit `1f3b20b` (ROOM4-09).
