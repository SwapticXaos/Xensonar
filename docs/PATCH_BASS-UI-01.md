# BASS-UI-01 · Bass-Workshop: Raster-Editor (Stufe Bedienung)

**Zone:** WARM (Editoroberfläche des Bass-Workshops). Kein Audio, keine Daten geändert; Owner der Events bleibt der bisherige Arbeitsstand (`onPatchEvent`/`onBeginEventEdit`, Undo/Redo unverändert).
**Datei:** `src/runtime/instrument/12_rhythm_and_bass_editor.js` (Komponente `cce`, „Bass Body“).
**Größe:** `index.html` +4 279 Bytes (8 301 643 → 8 305 922, inklusive des eingemergten KEY-PHANTOM-01).

## Vorher
- Die Tonhöhenachse reichte immer von 1/4 bis 2, die untere Hälfte blieb meist leer.
- Die Beschriftungen (1.333, 1.250, 1.200, 1.125, 1.067, Root) lagen übereinander.
- Blöcke waren mindestens 3,8 % und höchstens 42 % breit, die Länge war also nicht ablesbar.
- Die Anschlagsstärke war nur als Zahl einstellbar.
- Dass ein Doppelklick eine Note setzt und der rechte Rand die Länge ändert, stand nirgends.

## Jetzt
- **Achse:** Sie beginnt bei 1/2 und wächst nur, wenn Noten darüber hinausgehen. Die Beschriftung zeigt Brüche (Root, 2/1, 7/4, 3/2, 4/3, 6/5 …), nach Wichtigkeit, mindestens 14 px auseinander, rechts. Die Root-Linie ist hervorgehoben, die Hilfslinien bleiben.
- **Länge:** Blöcke zeigen die echte Länge (zum Anfassen mindestens 1,2 %).
- **Velocity-Spur:** Unter dem Raster liegt eine Spur mit einem Balken je Note; Ziehen setzt die Velocity. Wie beim Ziehen der Blöcke ist es ein Undo-Schritt. Der ausgewählte Balken ist gelb. Ein Doppelklick in der Spur legt keine Note an.
- **Hinweiszeile:** „Double-click: new note · drag a block: time and pitch · its right edge: length · bars below: velocity“. Das Etikett „beweglich“ heißt jetzt „editable“ wie die übrige Oberfläche.
- **Nicht eingebaut:** Löschen per Klick ins Raster, vom Nutzer früher verworfen. Delete und Undo bleiben die Knöpfe.

## Tests
- Neu: `tests/e2e/bass_editor_ui.cjs`. Prüft Brüche ohne Überlappung, keine 1/4-Etikette ohne tiefe Note, Breite proportional zur Länge (nach „Longer“), Velocity-Ziehen 1 → 0,38 und Undo zurück, Doppelklick-Regeln. Rot auf dem Parent, grün danach.
- Grün: Build-Check, `run_tests.sh`, `run_e2e.sh` (siehe Status).

Rollback: `e51d1b4`.
