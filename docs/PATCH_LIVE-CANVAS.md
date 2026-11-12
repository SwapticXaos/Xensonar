# LIVE-CANVAS: Leinwand-Auflösung des Live-Raums folgt der Anzeige (ohne musikalischen Trade-off)

Parent: `7e42fe2`. Zone: WARM (nur Zeichenfläche; Audio, Scheduler, Zeichenlogik und Koordinaten unberührt). Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless), **Messung nur mit Software-Rasterung**; auf Rechnern mit GPU-beschleunigtem Canvas ist der Gewinn kleiner, auf Rechnern ohne Beschleunigung größer.

## Umgesetzt (Vorschlag aus der Grafik-Analyse vom 09.11., Schritt 1)
Die Leinwand wird weiter in 1100 × 580 logischen Einheiten gezeichnet. Der **Bildspeicher** folgt jetzt dem, was angezeigt wird: CSS-Größe × Pixeldichte, **nie über 1100 × 580**.
- DPR 1, Leinwand 908 px breit: Bildspeicher 908 × 479 statt 1100 × 580 → **−32 % Pixel** zu füllen, zu strichen und zu komponieren; Linien werden in Anzeigegröße gezeichnet statt per CSS heruntergerechnet (etwas schärfer).
- DPR 2 (Retina): bleibt 1100 × 580, **Kosten und Schärfe wie bisher**, nie schlechter.
- Gezeichnet wird weiter in logischen Koordinaten (eine `setTransform` pro Bild); Zeiger-Umrechnung nutzt das Element-Rechteck, nichts anderes ändert sich. Größe wird nur bei Layout-/Zoom-/Pixeldichte-Änderung neu gesetzt (ResizeObserver + `resize`), nie pro Bild.
- Das Gleiche gilt für den Raum-V-Pad nicht (hat schon eigene Qualitätsstufen).

## Messung (`tools/probes/live_canvas_cost.js`, DevTools-Metriken, Live Room spielt idle, 6 s, je 3 Läufe, Headless/Software-Raster, Viewport 1440, DPR 1)
| Stand | Bildspeicher | Hauptthread (TaskDuration) | Skript |
|---|---|---|---|
| vorher (HOLD-CARDS-LIVE) | 1100 × 580 | 0,29–0,30 s/s | 0,04 s/s |
| nachher | 908 × 479 | 0,24–0,26 s/s (**ca. −13 %**) | 0,04 s/s |
| DPR 2 vorher / nachher | 1100 × 580 / 1100 × 580 | 0,31 / 0,30 | unverändert |
Skriptzeit ändert sich nicht (0,65 ms/Bild für alle Zeichenschritte); der Gewinn liegt in Raster und Komposition.

## Geprüft und bewusst nicht umgesetzt
- Zeichnen aussetzen, wenn die Leinwand nicht sichtbar ist: Die Bildschleife mischt Simulation (Teilchen, Treffer, Töne) und Zeichnen in einem Durchlauf; Aussetzen würde Klang verändern. Abgelehnt.
- `alpha:false` (opaker Canvas): Messung im Rauschen (−0,007 s/s), kein belegter Nutzen, zurückgenommen.
- Weitere `requestAnimationFrame`-Schleifen: zusammen < 0,1 s/s Skript; Zusammenlegen lohnt nicht.

## Tests
`tests/e2e/live_canvas_fit.cjs`: DPR 1 Bildspeicher = Anzeigegröße (kleiner als 1100), Seitenverhältnis erhalten, Hintergrund (1100 × 580 logisch) läuft durch die Fit-Transformation, Pixel werden gezeichnet, Fensterverkleinerung wird gefolgt, DPR 2 bleibt 1100 × 580. Bestehende Tests für Zeiger und Zeichen-Operationen (`live_grid_handles`, `room5_grid_layer_equivalence`) laufen unverändert.
Rollback: `7e42fe2`.
