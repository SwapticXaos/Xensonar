# ROOM5-06: Stimmdreiecke reagieren auf den Cursor (Live-Raum + Raum V)

Status: CODE_PRESENT, BROWSER_CHECKED (Playwright, headless). Nicht USER_ACCEPTED.
Zone: WARM (Canvas-Zeichnung). Daten-Owner: keiner neu; Mute/Offset bleiben in `nexusParams` (`__NodalBallGrid`).

## Problem
Gemutete Dreiecke am linken Rand sind fast unsichtbar; man sah nicht, welches man gleich ein- oder ausschaltet.

## Änderung
- `__xenDrawMainGridLayer` (`src/rhythm/03_live_drum_bodies.js`, gemeinsam für Live-Raum und Raum V): das Dreieck unter dem Cursor
  (`__XenGridHandles.hit` auf die Fokus-Cursor-Position) wird immer sichtbar gezeichnet: kurze Führungslinie bis x=64, größeres Dreieck mit hellem Rand.
  Gefüllt = klingt (Klick mutet), hohl/rötlich = gemutet (Klick schaltet ein). Ohne Cursor am Rand bleiben die Zeichen-Ops unverändert (Äquivalenztest grün).
- `__XenGridHandles.hit` (`src/rhythm/02_bass_and_rack.js`) wählt jetzt die **nächstliegende** Linie innerhalb 12 px statt der ersten; Hervorhebung und Klick treffen damit dasselbe Dreieck.
- Tests: `tests/e2e/live_grid_handles.cjs`, `tests/e2e/room5_psylab.cjs` (Hervorhebung bei gemutetem Dreieck, nichts bei entferntem Cursor).

## Offen
- Verlässt die Maus die Fläche, bleibt die letzte Cursorposition stehen; liegt sie am Rand, bleibt das Dreieck hervorgehoben bis zur nächsten Bewegung.
- Gemutete Dreiecke ohne Cursor sind unverändert dunkel (bewusst, Live-Optik).
