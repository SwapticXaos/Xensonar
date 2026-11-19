# BALL-PAINT-01: der Ball malt (Art Installation)

Zone: **WARM** (nur Canvas, kein Audio, kein State, kein Storage). Datei: `src/nodal/13_installation_ball_grid.js` (`__NodalBallPaint`), ein Aufruf in `RRe` (`src/audio/entrophon/02_worklet_and_voice_backend.js`).

- Der Ball zieht eine Farbspur hinter sich her (Farbton wandert mit der Strecke, schnelle Bewegung = dünner, kräftiger).
- Die Spur liegt auf einer Zusatzfläche (max. 960 px breit), additiv gemischt: Wo der Ball oft war, wird das Bild dichter.
- Verblassen sehr langsam: alle 400 ms Alpha −0,6 % (mindestens 1 Stufe), also Halbwertszeit rund eine Minute, ganz weg nach einigen Minuten. Das Bild wird tendenziell voller, weil der Ball schneller malt als es verblasst.
- Sprünge (Ball springt über > ½ Canvas) und Pausen > 1,5 s zeichnen keine Linie. Größenänderung leert die Fläche.
- `index.html` +1 518 Bytes (8 343 058, sha256 `5aefa352…`). `run_tests.sh` 136/136. Neuer Browsertest `tests/e2e/ball_paint.cjs` grün (Spur sichtbar, leert sich nicht in 8 s), Screenshot geprüft. Rollback `550d4d0`. Klang unberührt. **Nicht gehört** (rein visuell).
