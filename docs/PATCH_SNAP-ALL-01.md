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
- **Nicht gerastet**, mit Absicht: die Scratchpad-Auswahl (eigene Zwischenablage ohne Songtakt). Golden Move rastet seit dem Nachtrag unten.

## Prüfung
- `build.py --check` OK.
- Neu: `tests/e2e/snap_all_wave_editor.cjs` (Wave Editor offen; neu, rechter Rand, Verschieben, linker Rand × Bar/Beat/Segment/Off; `GRID=1` mit fertiger Song-Analyse). Grün. Gegenprobe ohne den Fix: Bar fällt in allen 4 Gesten durch (Maske frei), Off grün.
- Grün: `taktometer_snap_live` (bar, segment, off), `song_parts_edit`, `mask_undo`, `wave_golden_vertical_drag`.
- `tests/song_parts_edit.test.cjs` scheitert schon vor dieser Änderung (Test-Helfer findet das Ende von `__xenSongPartsEditFactory` nicht). Das ist nicht Teil dieses Patches.
- Nicht gehört. Nur am synthetischen 120-BPM-Takt geprüft.

## Nachtrag SAME-MASK-01 / GRAB-EDGE-01 (selber Tag)
Nutzer: Im Wave Editor wurde der Griff an den rechten Rand manchmal zur neuen Maske. Verschieben war fließend und hat das Taktometer gestaucht, obwohl Snap auf Bar stand. Die alte Ansicht war solider. Forderung: Beide Ansichten führen exakt dasselbe aus.

Ursachen:
- Die Trefferprüfung des Wave Editors (`selectionPointerRegion`) kannte einen Rand nur innerhalb des sichtbaren Ausschnitts. Bei einer Maske, die größer ist als der Ausschnitt, war jeder Griff eine neue Maske. Toleranz fest 9 px statt der Regel der alten Ansicht. Bei Stereo zählte ein Griff außerhalb der L- oder R-Spur als neu.
- Der Wave Editor rechnete die Maske selbst: Ein Rand konnte über den anderen klappen, es gab keine Mindestlänge.
- `snapRange` (Verschieben auf dem Analyse-Raster) schnitt die Länge am Dateiende ab. Die Takte blieben gleich, und das Taktometer wurde gestaucht.

Änderung:
- **Ein Code für beide Ansichten.** Der Wave Editor fragt die Import-Ansicht über `maskHit` (= `hA` auf der am Ausschnitt abgeschnittenen Maske) und `maskRange` (= `$_` + `__xenSnapMaskGesture`). Neue Maske meldet `onMaskGestureEnd` (Reparatur-Undo leeren, wie in der alten Ansicht). Nur das Verschieben am oberen Rand und Golden Move sind Wave-Editor-eigen. Sie nutzen dieselbe Bereichs- und Snap-Funktion.
- `hA`: Der nähere Rand gewinnt. Bisher gewann bei schmalen Masken immer der Anfang. Das gilt für beide Ansichten.
- `snapRange`: Verschieben behält die Länge exakt. Passt die nächste Rasterlinie nicht mehr bis zum Dateiende, nimmt es die nächste, die passt. Ein über den anderen gezogener Rand lässt einen Rasterschritt übrig statt eines 50-ms-Streifens. Das gilt für beide Ansichten.
- Golden Move landet bei Bar/Beat/Segment auf dem Snap. Er behält seine Länge, das Taktometer zählt nicht mit.

Prüfung:
- Neu: `tests/e2e/same_mask_views.cjs`. Dieselben Mausgesten in der Import-Ansicht und im offenen Wave Editor, je Snap-Modus 6 Fälle: neu, rechter Rand, linker Rand, Rand über den anderen, rechter Ausschnittrand einer Maske größer als der Ausschnitt, schmale Maske. Maske und Taktometer-Felder sind in allen 24 Fällen identisch.
- `snap_all_wave_editor.cjs` erweitert: Ausschnittränder, schmale Maske, Verschieben ans Dateiende behält Länge und Taktzahl. Gegenprobe auf dem Stand davor: Der rechte Ausschnittrand wurde zur neuen Maske (Bar und Off).
- Golden Move per Hand geprüft: Bar 2 → 6,001 s (ganze Takte), Off frei (5,37 s).
- Weiterhin nur mono getestet. Ein Stereo-Griff außerhalb der Spur ist im Code abgedeckt, aber nicht im Browser geprüft. Nicht gehört.

## Nachtrag COUNT-STEADY-01 / BEAT-01 (selber Tag)
Nutzer: Mit Segment-Snap (16 Segmente) springen beim Ziehen die Taktnummern hin und her, statt dass nur ± ein Segment dazukommt. Außerdem: den ganzen Bereich prüfen.

Messung (`tests/e2e/mask_count_steady.cjs`): Ein Spion zeichnet jede Taktometer-Zeichnung auf (Taktnummern und ihre x-Position). In der Import-Ansicht standen die Nummern still. Im Wave Editor zitterten sie beim Ziehen des rechten Rands um bis zu 10 px (Takt 3: x 518…526, Takt 4: 690…700). Die Daten pro Frame waren dabei konsistent.

Ursache: Der Wave Editor meldet die neue Taktzahl sofort (Snap, `onMetaPatch`), die neue Maskenlänge aber erst im nächsten Bildframe (`live()` per requestAnimationFrame). Dazwischen malt das Taktometer die neue Zahl über die alte Länge, und die Takte werden kurz gestaucht oder gedehnt. Die Import-Ansicht schickt beides im selben Schritt.

Änderung:
- `015d` (W01): Ändert der Snap die Zählung, geht die Maske im selben Schritt an die Ansicht. Ohne Zählwechsel (Off, Verschieben) bleibt es bei einmal pro Frame.
- `lab.js` `__xenBeatsPerBar` (BEAT-01): Beat ist ein echter Schlag. Bisher war Beat ohne Analyse gleich Segment, weil die Taktometer-Übernahme `beatsPerBar = guideSegments` schreibt (bei 16 Segmenten war ein „Beat“ 1/16 Takt). Jetzt: die Schläge der Song-Analyse dieses Audios, sonst `beatsPerBar`, wenn es die Segmentzahl glatt teilt, sonst abgeleitet (16, 12, 8 → 4; 9, 6 → 3; sonst = Segmente).
- `tests/helpers/extract_function.cjs`: Kommentare werden übersprungen. Ein Apostroph im Kommentar („the analysis' grid“) brach `song_parts_edit.test.cjs` (lief seit Längerem nicht). Dadurch laufen auch 2 bisher rote Fälle in `song_key.test.cjs` wieder.

Prüfung:
- Neu, ohne Browser: `tests/mask_snap.test.cjs` lädt Trefferprüfung, Bereich, Snap und Zählung direkt aus dem Quellcode. Geprüft werden: Beat = Schlag, Taktlänge und Tempo bleiben bei jedem Zwischenschritt gleich, Verschieben ohne und mit Analyse, Rand über Rand, Abbruch, Randgriff. 6/6 grün.
- Neu, im Browser: `tests/e2e/mask_count_steady.cjs` (Segment, Beat, Bar × Import-Ansicht / Wave Editor × rechter Rand, linker Rand, Verschieben). Taktabstand in jeder Zeichnung 171–172 px, keine Sprünge. Gegenprobe davor: Wave Editor rechter Rand gesprungen.
- Bekannt und unverändert: `tests/forge_interpretations.test.cjs` hat 2 Fehler (`__mlNormalizeSamplePlaybackSettings` fehlt im Test-Kontext, Melodic Loop). Nicht dieser Bereich.
- Bleibt so, mit Absicht: Zieht man den linken Rand, zählt das Taktometer weiter ab dem Maskenanfang („Start = 1“). Die Nummern rücken dann gemeinsam um ganze Schritte weiter, ihr Abstand bleibt gleich.
