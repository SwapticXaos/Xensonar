# SNAP-ALL-01 · Snap der Loop-Maske gilt auch bei offenem Wave Editor

Parent: `e0740d3` (UNDO-MASK-03, Zweig `release/2026-11-23-nodal-arch`). Rollback: diesen Commit zurücknehmen.
Zone: Loop-Maske ziehen (Wave Editor / Import-Ansicht). Kein Audio-Graph, kein Scheduler, keine Persistenz geändert.

## Fehler
Snap (Bar / Beat / Segment) in der Teile-Leiste gesetzt, Wave Editor offen, Maske (z. B. nach dem Verschieben eines Abschnitts C2) am Rand gezogen: Die Maske glitt frei wie bei Off.

Ursache: Es gab zwei Zieh-Pfade für dieselbe lila Maske.
- Import-Ansicht, Editor zu: `RGe` in `src/rooms/lab.js` rastete (`__xenSnapMaskDrag` + `__xenMaskCount`).
- Wave Editor offen: `beginEditPointer` in `src/post-oct/015d-xen-wave-ui-w01.js` übernimmt die Geste (`stopImmediatePropagation`) und kannte keinen Snap. Neu ziehen, Rand ziehen und Verschieben waren dort immer frei.

## Änderung
- **Eine** Snap-Funktion `__xenSnapMaskGesture` (`lab.js`) für beide Pfade. Der Wave Editor ruft sie über die neue Option `snapMask` auf, die `RGe` bei `attach`/`update` mitgibt. Bar und Beat rasten auf das Analyse-Raster. Ohne Analyse, und bei Segment, zählen sie in Taktometer-Einheiten vom stehenden Rand aus.
- **Verschieben** rastet jetzt in allen Snap-Modi. Bisher war es ohne Analyse oder bei Segment frei. Mit Analyse (Bar/Beat) liegt der Start auf der Rasterlinie, sonst wird in ganzen Einheiten ab der Ausgangsposition verschoben.
- **Neue Maske aus einem Caret:** Bisher gab es ohne alte Maskenlänge keinen Snap. Jetzt kommt die Einheit aus dem Taktometer-Tempo.
- **Abbruch** der Geste (Esc, Fokusverlust, pointercancel) gibt dem Taktometer seine Zählung zurück, in beiden Pfaden.
- `exportMeta` reicht jetzt `beatsPerBar` durch. Vorher rechnete Beat ohne Analyse immer mit 4 Schlägen pro Takt.
- **Off** bleibt überall stufenlos.
- **Nicht gerastet**, mit Absicht: Golden Move (eine Audio-Bearbeitung, keine Maske) und die Scratchpad-Auswahl (eigene Zwischenablage ohne Songtakt).

## Prüfung
- `build.py --check` OK.
- Neu: `tests/e2e/snap_all_wave_editor.cjs` (Wave Editor offen; neu, rechter Rand, Verschieben, linker Rand × Bar/Beat/Segment/Off; `GRID=1` mit fertiger Song-Analyse). Grün. Gegenprobe ohne den Fix: Bar fällt in allen 4 Gesten durch (Maske frei), Off grün.
- Grün: `taktometer_snap_live` (bar, segment, off), `song_parts_edit`, `mask_undo`, `wave_golden_vertical_drag`.
- `tests/song_parts_edit.test.cjs` scheitert schon vor dieser Änderung (Test-Helfer findet das Ende von `__xenSongPartsEditFactory` nicht). Das ist nicht Teil dieses Patches.
- Nicht gehört. Nur am synthetischen 120-BPM-Takt geprüft.
