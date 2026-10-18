# XenSonar N21–F2 · Granular Sample Hold

Direkt öffnen: `Xensonar_N21_F2_Granular_Sample_Hold_Test.html`.
Samples klingen normal, bis Apostroph/Akut gehalten wird. Dann wird die
Quellzeit zunehmend langsamer, während die Grain-Tonhöhe erhalten bleibt.
Loslassen blendet in 20 ms aus. Kein zusätzlicher Regler.

Build: `npm ci && npm run build && npm run verify:build`.
Tests: `npm run test:granular && npm run test:merge`.
Browser: `XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:granular:browser`.
Voller Host-/DSP-/Worker-Lauf: `npm run test:p4c2-n21`.

Prüfbericht und Grenzen: [docs/granular-hold-report.md](docs/granular-hold-report.md).
Architektur: [docs/granular-hold-architecture.md](docs/granular-hold-architecture.md).
Physische Hör-/Opera-/Hardwareabnahme steht aus.
