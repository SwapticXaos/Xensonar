# XenSonar N21–F2 · aktueller Teststand

Direkt im Browser öffnen: `Xensonar_N21_F2_UI_Refinement_Test.html`.

Dieser Stand enthält ausgerichtete Volume-/Pan-Regler, Play/+Drums unter Undo/Redo, kompakte grüne/rote Mutes einschließlich RFL-Raster-Bypass und den Xenpolar Drone als erste Auswahl im Hauptinstrument. Bei der Nodal-Volume-Hüllkurve bedeutet der untere Rand jetzt exakt Stille.
Die Aufnahme-Markerfläche bleibt auch bei langen Schnellmenüs erreichbar und löst ihre grüne Ringwelle mittig am XenSonar-Logo aus.

```sh
npm ci
npm run build
npm run verify:build
npm run test:ui-refinement
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui-refinement:browser
```

Vollständiger Umfang, weitere Prüfungen und Grenzen: [Prüfbericht](docs/ui-refinement-report.md).
Messdaten und Screenshots: `results/ui-refinement/`.
Die früheren HTML-Teststände bleiben als Referenzen erhalten; das Build-Ziel steht in `source-manifest.json`.
