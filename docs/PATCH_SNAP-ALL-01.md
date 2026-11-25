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

## PINK-STACK-01 / PINK-REVEAL-01 (selber Tag, Melodic Loop)
Anlass: Nach Import Audio → „Send as Pink Track to Melodic Loop“ war die Pink-Spur im Raster nicht zu sehen, aber hörbar und im Navigator sichtbar. Ursache war ein senkrecht nicht ganz nach unten gescrolltes Raster, keine Regression. Der Raw-Weg sendet seit Oktober fest 55 Hz; gegen W31 verglichen, gleiches Verhalten. Damit landete die Spur immer auf der tiefsten Tonlinie, bei gezoomtem Raster außerhalb des Ausschnitts.

Änderung (`src/rooms/canonical.js`):
- `__mlDefaultPinkAnchorHz`: Ein Raw-Pink-Import (Quelle `spectral-forge-raw-audio`) landet auf der **mittleren** Tonlinie. Jede weitere Pink-Spur liegt eine Rasterstufe tiefer; am unteren Ende geht es oberhalb der Mitte weiter. Der Weg aus „Paint Figures“ (`spectral-forge-direct`) bringt einen echten Grundton mit und bleibt unverändert.
- `__mlRevealTrack`: Liegt nach einem Import keine Note der neuen Spur im senkrechten Ausschnitt, scrollt das Raster, bis sie mittig liegt. Der Zoom bleibt, und es entsteht kein Undo-Schritt.

Prüfung:
- Neu: `tests/e2e/pink_raw_send.cjs`. Erstes Senden: mittlere Linie (17 von 35) und sichtbar. Zweites Senden: Farbwahl, eigene Spur, Linie 18, eigene Farbe. Drittes Senden bei gezoomtem, nach oben gescrolltem Raster: Linie 19, der Ausschnitt scrollt mit (0–8 → 15–23). Grün.
- Bekannt: Der Unit-Test `tests/forge_pink_transfer.test.cjs` (Pink-Senden einer gemalten Figur) ist veraltet. Seine Attrappe kennt `P.useEffect` nicht, und er steht nicht in `tests/GREEN_NODE_TESTS.txt`. Nicht angefasst.

## ROOM-BUDGET-01 (selber Tag): „Room error isolated · snapshot exceeds the 256 MiB data budget“
Nutzer: Nach Hin- und Herwechseln der Räume blieb die Material Forge isoliert, Meldung „Forge project: snapshot exceeds the 256 MiB data budget“.

Ursache (gemessen): Nach **Extract Timbre** hält die Donor-Werkbank das komplette Quell-Audio fünffach (mono, L, R, mid, side; etwa 50 MiB pro Minute). Bei einem 4-Minuten-Song wiegt der Forge-Schnappschuss 242 MiB, bei 5,5 Minuten 318 MiB. Jeder Wiederherstellungsweg der Forge (Aufwachen, gespeicherter Arbeitsstand, Rücksprung aus einer Unteransicht) spielt den Schnappschuss über `__ForgeProjectSnapshot.prepare` → `codec(decode)` ein. Der Codec rechnete dabei auch Arrays aufs Budget, die schon im Speicher liegen und nicht neu angelegt werden. Ab etwa 4½ Minuten Donor-Song war das zwangsläufig ein Fehlalarm. Mit dem Wechseltempo hatte das nichts zu tun.

Änderung (`src/storage/05_project_snapshots.js`): Beim Einspielen zählen nur noch Daten, die der Codec wirklich anlegt (Base64 aus Dateien, Listen). Arrays im Speicher werden unverändert zurückgegeben und nicht gezählt. Beim Export (`encode`) zählt die Grenze weiter. Zu große kodierte Dateien werden weiter vor dem Anlegen abgewiesen.

Prüfung:
- Neu: `tests/forge_snapshot_budget.test.cjs`. Speicher-Arrays mit 5 × 64 MiB (zählten vorher 320 MiB) laden; kodierte 300 MiB werden abgewiesen; Export und Rückweg funktionieren. Auf dem alten Stand: Fall 1 rot.
- Neu: `tests/e2e/forge_room_switch_budget.cjs` (5,5-Minuten-Song, Extract Timbre, Projekt neu einspielen, 8 Raumwechsel, Neuladen). Alt: „snapshot exceeds … (318 MiB)“. Neu: grün.
- Nicht festgenagelt: welcher Wiederherstellungsweg bei dir gegriffen hat. Alle laufen durch dieselbe, jetzt korrigierte Prüfung.
- Offen, als Idee: mid/side ließen sich aus L/R berechnen statt mitzuspeichern (spart 40 % des Donor-Speichers). Nicht umgesetzt, weil es das Speicherformat betrifft.

## Test-Liste
- `tests/GREEN_NODE_TESTS.txt` (läuft mit `tools/run_tests.sh`): neu `mask_snap.test.cjs` und `forge_snapshot_budget.test.cjs`. `song_parts_edit.test.cjs` und `song_key.test.cjs` standen schon darauf und laufen jetzt wieder; `song_key` lädt dazu `__xenBeatsPerBar` mit.
- `run_tests.sh`: 148 grün, 6 rot. Alle 6 sind schon auf dem Ausgangsstand `e0740d3` rot und kamen mit dem Release-Zweig: `render_empty_audio_p32`, `test_forge_empty_audio_connector_p32`, `test_forge_rack_single_presentation_rc3`, `test_forge_slot_layout_rc4`, `test_ui_patch_debris_cleanup`, `tooltips_english`.

## FILE-EDGE-01 (selber Tag): Mit Snap ließ sich die Maske nicht bis zum Dateiende ziehen
Nutzer: Die blaue Maske zeigt alles, aber die lila Maske kommt nur bis kurz vor das Ende; das letzte Stück lässt sich nicht bearbeiten. Das ist keine Lösung, die Maske muss alles auswählen oder kürzer gemacht werden können.

Ursache: Nicht der Randgriff-Fix (GRAB-EDGE-01), sondern der Snap. Mit Bar/Beat/Segment rastete die bewegte Kante auf die letzte ganze Einheit innerhalb der Datei (ohne Analyse vom stehenden Rand aus gezählt, mit Analyse auf die nächste Rasterlinie). Endet ein Song nicht genau auf einer Taktlinie, war der Rest dahinter unerreichbar, am Anfang ebenso. Seit SNAP-ALL-01 rastet auch der Wave Editor; vorher war er dort frei.

Änderung (`lab.js` `__xenSnapMaskGesture`, eine Stelle für beide Ansichten): Dateianfang und -ende sind immer Rastpunkte. Kommt der Zeiger näher an den Dateirand als an den gerasteten Punkt (oder darüber hinaus), gilt der Dateirand. Beim Verschieben legt sich die Maske mit gleicher Länge an den Rand. Das Taktometer behält sein Tempo und zählt den angebrochenen Takt mit (z. B. 61/4 statt gestaucht). `__xenMaskSegSec` liefert die Segmentlänge wie `__xenMaskCount`.

Prüfung:
- `tests/mask_snap.test.cjs` neuer Fall: 30,7-s-Datei, Bar/Beat/Segment: übers Ende gezogen ergibt 30,7 s, Tempo und Taktlänge bleiben; bei 29,9 s gewinnt die Taktlinie 30; mit Analyse-Raster (erster Schlag bei 0,3 s) erreicht der linke Rand 0; Off bleibt frei. 7/7 grün.
- `tests/e2e/snap_all_wave_editor.cjs` jetzt mit 30,7-s-Song: rechter Rand zum Dateiende, linker zum Dateianfang, je Bar/Beat/Segment/Off. Grün. Gegenprobe davor: Bar endete bei 29,997, Beat bei 30,505, Segment begann bei 0,025 s.
- Weiter grün: `same_mask_views` (beide Ansichten identisch), `mask_count_steady`, `taktometer_snap_live`, `mask_undo`, `song_key.test.cjs`.
