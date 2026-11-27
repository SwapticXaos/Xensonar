# UI-Nachbesserungen 2026-11-27

## LIVE-HEAD-03 — Raster wieder am Loop-Rec-Dock
- Ursache (Vergleich der Builds `c1bfadf` → `15af606` → `cd4425c`): seit UI-TITLE-ART-01 war der Live-Room-Kopf 24 px höher (Eyebrow „ROOM I · LIVE PERFORMANCE“ 12 + 3 px, Vektortitel auf einer Textzeile 41 statt 33 px); der mittig sitzende Power/Loop-Rec-Dock rutschte mit, das Raster rückte von der Loop-Rec-Lasche ab.
- Fix: Titel als Block (eigene Höhe), der unsichtbare LIVE-HEAD-02-Platzhalter gibt 16 px zurück → Kopf, Dock und Raster bei 900 / 1440 / 1920 px wieder exakt wie vorher.
- Seitenmodus: Kopf mit Power/Loop-Rec wandert mit dem Raster in die rechte Spalte (gleiche Geometrie wie oben); Kopf + Raster standardmäßig so hoch wie das Mixing Desk.

## EQ-NODRAG-01 — EQ-Malen „griff die ganze Seite“
- Reproduziert: bei einer Textmarkierung auf der Seite startete Malen im EQ einen nativen Drag der Markierung (halbtransparentes Seitenbild).
- Fix: eine Markierung wird beim Malbeginn aufgehoben; `dragstart` aus Canvas / EQ-Panel wird abgebrochen (explizit ziehbare Elemente unberührt). Test `tests/e2e/eq_no_page_drag.cjs`.

## SONG-PART-TAGS-02 — Teilauswahl und Kartenfarben
- Zuordnung nach Enthaltensein: Maske in einem Abschnitt → Abschnitt (z. B. 4 von 8 Takten in A1b → A1b); in einem Teil über Abschnitte → Teil (A1); über Teile → kein Kennzeichen.
- Kartenfarben (Format der Session-Farben): Mitte = Hauptrubrik (Farbe der Art), Rand = Unterrubrik (Abschnitts-Farbton, sonst Wiederholungsfarbe, sonst nochmals die Hauptfarbe).
- Standard in Quick Rack, Meta-Menü (Kacheln + Farbregler) und Mixing-Desk-Crate/Decks; eine Session-Farbe überschreibt kanalweise. Die Farbzuordnung liegt nur in den Sessions, nicht im Bibliothekseintrag.

## COLOR-CODE-MENUS-01 — Farbcode in den Einzelmenüs
- Material Track, Root Follow Loop, Drums, Bass, Fretboard: Einträge mit Farbcode (Session- oder Teilfarbe) zeigen links ein Band in der Randfarbe und einen Hauch der Kartenfarbe; ohne Code unverändert (zentral über `__quickProps`).

## STRIP-ACTIVE-01 — Grün für Drums, Bass, Fretboard
- Wie Material Track / Root Follow: grün, solange „Drums Active“, „Bass Active“ bzw. „Show Tuning Grid“ an ist. Test `tests/e2e/strip_active_green.cjs`.

## Offen (Patchplan)
- Loop-Rec „failed“ → „Retry“ wirkt nie, nur Neuladen hilft: Ursache des Fehlschlags und des wirkungslosen Retry untersuchen.
