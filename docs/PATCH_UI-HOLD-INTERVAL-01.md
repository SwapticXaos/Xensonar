# UI-HOLD-INTERVAL-01 — Rechtsklick-Funktion wählbar, Backspace-Intervall-Kärtchen, Grid Spacing „Guitar“

## Verhalten (Controls & Settings → Pointer & Grid)
- **Grid Spacing (vertical):** `Absolute` (wie bisher, gleiche Hz pro Pixel) · `Logarithmic` (jede Oktave gleich hoch) · `Guitar` (wie Bünde: je höher, desto enger – linear in der Periode, Spiegel von Absolute). Gilt für Bild und Tonhöhe (`Qa`/`Zs`).
- **Right-click in Playfield:**
  - `Grid Root` (Standard): Rechtsklick stimmt das Raster um; darunter wie bisher Active / All Steps / Free.
  - `Echo`: Rechtsklick schaltet das Partikel-Echo an/aus (die alte Funktion), Anzeige „Now: on/off“.
  - `Interval`: Rechtsklick **schaltet um**, welches von zwei Kärtchen Backspace benutzt (aktives Kärtchen golden umrandet, Markierung ▶).
- **Backspace-Kärtchen** (Thunder-Mode-Kärtchen, grünes Quadrat mit rotem Strich): Rechtsklick auf das Kärtchen öffnet das bundlose ±1-Oktav-Lineal mit JI-Marken, erneuter Rechtsklick = Einklang. Standard: Karte 1 = +1 Oktave (wie bisher), Karte 2 = −1 Oktave. Außerhalb von `Interval` gibt es nur Karte 1.
- Backspace gehalten = Glissando zum aktiven Intervall (Psy Lab: ~40 ms, jetzt im log2-Raum, d. h. auch das Umschalten bei gehaltenem Backspace gleitet). Live-Room-Stimmen bekommen das Intervall beim Anschlag (`zhe`).

## Technik
- `src/ui/09_hold_interval.js`: Store `__XenHoldInterval` (cents [2], aktives Kärtchen, Hold), `__xenRightClickAction`, `__XenRightClickActionControl`, `__XenHoldIntervalCards` (nutzt `iT`). Cents in `localStorage` `xensonar.holdInterval.v1`; `rightClickAction` in den nParams (wie `rightClickGridRootMode`).
- `src/ui/08_stage_layout.js`: Spacing `fret`, `__xenGridSpacingHz` / `__xenGridSpacingR`.
- `src/rhythm/04_workspace_and_transport.js`: Backspace-Hold läuft über `__XenHoldInterval.press`; `reset` leert ihn.
- `src/audio/01_voice_and_rfl_ownership.js` (`zhe`), `src/mix/02_performance_catalog.js` (Psy-Lab-Glide), `src/nodal/12_surface_runtime.js` (Vorbereitung aller Intervall-Varianten).
- `src/rhythm/02_bass_and_rack.js`: Kontextmenü der Spielfläche verzweigt nach `rightClickAction`.

## Tests
`tests/e2e/hold_interval_rclick.cjs` (neu), `stage_split_liquid`, `psylab_octave_sector`.
