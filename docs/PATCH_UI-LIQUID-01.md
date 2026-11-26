# UI-LIQUID-01 — Spielfläche ↔ Mixing Desk frei aufteilen, Rasterhöhe, Raster-Verteilung

Basis: `claude/charming-franklin-wouegz` (MIX-DESK-01).

## Verhalten
- **Mixing Desk offen, Spielfläche oben:** rechts am Desk eine schmale, ausgegraute Raster-Miniatur. Klick → Spielfläche wandert neben das Desk.
- **Seitenmodus:** Desk links, Trenngriff, Spielfläche rechts – über die **volle Fensterbreite** (10 px Rand), unabhängig von der Spaltenbreite der Blöcke darunter (gemessen, kein horizontales Scrollen). Standardhöhe der Spielfläche = Höhe des Mixing Desks. Oben bleibt ein inaktiver Platzhalter zwischen den Seitenleisten; Klick darauf (oder `↑` am Griff) holt die Spielfläche zurück.
- **Grenze verschieben:** Griff ziehen (28–80 % Desk-Anteil), Pfeiltasten ←/→ (Shift = grob), Doppelklick = Standard 62 %.
- **Rasterhöhe:** Griff unter der Spielfläche ziehen (140–1600 px, je Modus getrennt gespeichert), Pfeiltasten ↑/↓, Doppelklick = Standard (Seitenmodus: Desk-Höhe, oben: Originalverhältnis 1100:580).
- **Controls & Settings → Pointer & Grid → Grid Spacing:** `Absolute` (wie bisher, gleiche Hz pro Pixel) oder `Logarithmic` (jede Oktave gleich hoch). Gilt für Bild **und** Tonhöhe (Qa/Zs) sowie das Installations-Ballraster.
- Desk geschlossen → immer klassisches Layout; die Wahl bleibt gespeichert (`xensonar.stageLayout.v1`).

## Technik
- `src/ui/08_stage_layout.js`: Store `__XenStageLayout`, `__XenStageSplit`, `__XenGridSpacingControl`, Probe `window.__XenGridMapProbe`.
- `styles/merge_meta_additions/049_xen-stage-split.css`: beide Docks; Seitenmodus per CSS-Grid mit `display: contents` auf Play-Wrapper und `.xen-h1-tonal-stage` → **gleicher DOM-Baum, kein Canvas-Remount**. Desk ist Container (`xen-desk`), die Viewport-Breakpoints des Desks gelten zusätzlich als Container-Queries.
- `src/rhythm/02_bass_and_rack.js`: `Oce` + Desk in `__XenStageSplit` gekapselt.
- `src/runtime/01_instrument_state.js`: `Qa`/`Zs` mit Log-Zweig.
- `src/rhythm/03_live_drum_bodies.js`: `__xenLiveCanvasFit` — bei gestreckter CSS-Höhe folgt der Backing Store auch in y (0,5–2× von 580); im Originalverhältnis unverändert.
- `src/nodal/13_installation_ball_grid.js`: Linien-y über `Zs`, Cache-Schlüssel inkl. Spacing.
- Logischer Raum bleibt 1100 × 580; Strecken ist eine nicht-uniforme Skalierung (Partikel werden bei starker Streckung oval). Zeiger-Mathe (`j4`) skaliert x/y getrennt.

## Tests
`tests/e2e/stage_split_liquid.cjs` (neu); geprüft außerdem `live_canvas_fit`, `ball_paint`, `grid_visible`, `grid_drag_selection`, `grid_shift_keyboard_window`, `tests/dj_mix_math.test.cjs`, `build.py --check`.

## Nächste mögliche Schritte
- Desk links/rechts tauschen; Rasterhöhe für den Top-Modus als Default an Viewporthöhe koppeln.
- Weitere Bereiche „liquid“ machen (Seitenleisten-Breite, Settings-Spalten, Effekt-Panels).
