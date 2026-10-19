# XenSonar N21–F2 · Raster, Hotkeys und Editor-Workflow

Die aktuelle, vom Nutzer gelieferte N21–F2-Quellbasis mit Granular-Hold, Live-Stabilitäts-Patch und korrigierter Forge-Fortschrittsanzeige sowie ausgerichteten Mix-Reglern, Raster-Mute, Melodic-Panning und Xenpolar Drone im Hauptinstrument
liegen in [`n21-f2/`](n21-f2/). Der ältere React-/Vite-Stand im Repository-Root
bleibt als historischer Stand erhalten und ist nicht die Basis dieses Patches.
Die Nodal-Volume-Hüllkurve erreicht am unteren Rand jetzt exakt Stille.
Die Aufnahme-Markerfläche bleibt auch bei langen Schnellmenüs erreichbar; ihre grüne Ringwelle breitet sich um das XenSonar-Logo aus.

Raster-Mute umfasst jetzt auch Wave Starter und Live-Quantisierung. Material-/RFL-Hotkeys sind im Schnellmenü sichtbar und geben beim Auslösen eine kurze grüne Rückmeldung. Der Melodic-Editor besitzt dieselbe Transportsteuerung wie der obere Bereich sowie wiederverwendbare Custom-Instrumente aus Originalklang und Kurven. Die Instrument-Regler verwenden dünne Linien in Instrumentfarbe; die Nodal-Namenseingabe steht beim Speichern.

```sh
cd n21-f2
npm ci
npm run build
npm run verify:build
npm run test:workflow-integrity
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:workflow-integrity:browser
npm run test:ui-refinement
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui-refinement:browser
npm run test:live-controls
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
npm run test:forge-progress
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:forge-progress:browser
npm run test:live-stability
npm run test:granular
npm run test:merge
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:granular:browser
```

Direkt testbare Datei: `Xensonar_direct_test_latest.html`.
Quellen, Patch und Prüfbericht: `artifacts/`.
Details: [`n21-f2/docs/workflow-integrity-report.md`](n21-f2/docs/workflow-integrity-report.md).

## Historischer Repository-Stand: Xensonar 3.1.6

This pack contains the files that Codex previously reported as missing or worth checking in a partial repository snapshot:

- Root build/setup files
- Main app entrypoints
- Xensonar app file
- Level3 lab room file
- Canonical forge room file

Generated helper files:
- README.md
- .gitignore

## Direct-Test Workflow

Für Frontend-Patches wird zusätzlich zur Codeänderung immer ein direkt testbares Single-File-HTML bereitgestellt:

- `Xensonar_direct_test_latest.html` (aktueller Single-File-Build aus `n21-f2/`)

Damit kann der aktuelle Stand ohne Build-Schritt direkt gegengeprüft werden.

