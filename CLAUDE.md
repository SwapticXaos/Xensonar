# XenSonar — Kurzsteckbrief

XenSonar ist ein offlinefähiges, mikrotonales und rhythmisch freies Musikinstrument im Browser (12-EDO und 4/4 sind Optionen, keine Grenze).

- **Aktiver Arbeits- und Deploy-Branch:** `claude/charming-franklin-wouegz` (Einzelarbeit, linear; ein Push geht direkt online).
- **Build:** einmalig `npm ci --prefix tools/slim`, danach `python3 tools/build.py` (Prüfung: `--check`, Probe-Build für Browser-Tests: `--probe`).
- **Generierte Dateien (nie von Hand editieren):**
  - `index.html` ← gebaut aus `source-manifest.json`, `src/**`, `styles/**` (`python3 tools/build.py`).
  - `src/post-oct/035-xen-room-xenpolar.js` ← generiert aus `tools/variante/` (`node tools/port_variante.cjs`).
- **Tests gezielt halten:** `python3 tools/build.py --check` plus die 1–3 zum geänderten Bereich passenden Tests (`tests/*.cjs`, `tests/e2e/*.cjs`). Volle Suiten (`./tools/run_tests.sh`, `./tools/run_e2e.sh`) nur bei breitem Umbau oder ausdrücklichem Wunsch.
- **Nachschlagewerk für den minifizierten Alt-Kern:** Read-only-Branch `reference/ts-400.2` + Zuordnung in `docs/TS_ORIGIN_MAP.json`.
- **Sprache:** Antworten auf Deutsch, knapp und sachlich.
