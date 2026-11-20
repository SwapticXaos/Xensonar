# GRID-VISIBLE-01: Häkchen „Grid Visible“ (Art Installation)

Zone: WARM (nur Canvas). Neben „Edit grid / step count“ steht das Häkchen **Grid Visible**, Standard **aus**: Die Rasterlinien samt Hz-Beschriftung werden dann nicht gezeichnet. Das Raster klingt unverändert (Ton-Logik `control` unberührt). Der Zustand gilt je Sitzung, wird nicht gespeichert. Room V (Psy Lab) ist unberührt.
Dateien: `src/nodal/13_installation_ball_grid.js`, `src/rooms/nodal.js`. `index.html` +628 Bytes (8 343 686, sha256 `3a43ae6c…`). `run_tests.sh` 136/136, neuer Test `tests/e2e/grid_visible.cjs` grün. Rollback `a5f8355`. Nicht gehört (visuell).
