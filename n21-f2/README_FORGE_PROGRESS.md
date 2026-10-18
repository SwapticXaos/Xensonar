# XenSonar N21–F2 · Forge Loading Progress

Aktuelle Testdatei: `Xensonar_N21_F2_Forge_Progress_Test.html`.
Der Play-Button übernimmt den echten Fortschritt laufender Vorbereitungen.
Antonia, Bert und Cecilia rechnen kooperativ mit identischen Audiodaten.
Cache-Treffer starten sofort; doppelte Raster-/Figurenanalysen entfallen.
Die früheren Granular-Hold- und Live-Stabilitäts-Korrekturen bleiben enthalten.

```sh
npm ci
npm run build
npm run verify:build
npm run test:forge-progress
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:forge-progress:browser
npm run bench:forge-progress
npm run test:merge
npm run test:p4c2-n21
```

Details und Grenzen: [docs/forge-progress-report.md](docs/forge-progress-report.md).
Die alte Live-Stability-HTML bleibt als historische Testdatei erhalten.
