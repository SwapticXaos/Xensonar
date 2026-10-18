# XenSonar N21–F2 · Forge Loading Progress

Die aktuelle, vom Nutzer gelieferte N21–F2-Quellbasis mit Granular-Hold, Live-Stabilitäts-Patch und korrigierter Forge-Fortschrittsanzeige
liegen in [`n21-f2/`](n21-f2/). Der ältere React-/Vite-Stand im Repository-Root
bleibt als historischer Stand erhalten und ist nicht die Basis dieses Patches.

```sh
cd n21-f2
npm ci
npm run build
npm run verify:build
npm run test:forge-progress
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:forge-progress:browser
npm run test:live-stability
npm run test:granular
npm run test:merge
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:granular:browser
```

Direkt testbare Datei: `Xensonar_direct_test_latest.html`.
Quellen, Patch und Prüfbericht: `artifacts/`.
Details: [`n21-f2/docs/forge-progress-report.md`](n21-f2/docs/forge-progress-report.md).

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

- `Xensonar_direct_test_latest.html` (Snapshot aus `dist/index.html`)

Damit kann der aktuelle Stand ohne Build-Schritt direkt gegengeprüft werden.

