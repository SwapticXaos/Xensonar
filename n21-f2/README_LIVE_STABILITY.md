# XenSonar N21–F2 · Live Audio Stability

Aktuelle Testdatei: `Xensonar_N21_F2_Live_Stability_Test.html`.
RFL-Loop-Grenzen korrigiert, residenten Render entlastet und Worker/Prozessor
lesbar getrennt. Granular Sample Hold und bestehende Instrumente bleiben erhalten.

Build: `npm ci && npm run build && npm run verify:build`.
Fokustests: `npm run test:live-stability`.
Browser: `XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-stability:browser`.
Benchmark: `npm run bench:live-stability`.
Regression: `npm run test:granular && npm run test:merge && npm run test:p4c2-n21`.

Details, Messungen und physisch noch offene Hörabnahme:
[docs/live-stability-report.md](docs/live-stability-report.md).
