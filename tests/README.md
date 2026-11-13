# Tests: was läuft wo

| Ort | Was | Wie gestartet | Läuft in der GitHub-Action |
|---|---|---|---|
| `tests/GREEN_NODE_TESTS.txt` (119 Einträge) | Regressionstests ohne Browser (nur Dateien direkt in `tests/`) | `./tools/run_tests.sh` (ca. 45 s) | ja, blockierend |
| `tests/e2e/*.cjs` | die echte App in Chromium, gegen den Prüf-Build `dist/XenSonar_PROBE.html` | `./tools/run_e2e.sh` (ca. 15 min) | ja, blockierend |
| fünf Standalone-Browsertests in `tests/` (`ui_side_arrows`, `mix_audio_browser`, `ui_visual_restore`, `power_browser_smoke`, `test_stamp_full_browser_p37`) | gegen die gebaute `index.html` | ebenfalls in `./tools/run_e2e.sh` | ja |
| `tests/browsers/engine_smoke.cjs` | Start, Power, alle Räume in Chromium/Firefox/WebKit (`XEN_BROWSER=…`) | von Hand oder Job `firefox-smoke` | Firefox-Job, nicht blockierend |
| `tests/fixtures/` | feste Vergleichsdaten; `fixtures/xenpack/` = eingefrorenes Paket (siehe `docs/PATCH_STORAGE-PERSIST-01.md`) | von den Tests gelesen | – |

## Alt-Bestand, der nirgends automatisch läuft
Alles andere unter `tests/` (auch der Unterordner `tests/regression/`) stammt aus dem Oktober-Quellbaum (28.10.) oder aus den GPT-Sitzungen: rund 100 Dateien, darunter die 44 Python-Skripte
(`*.py`, brauchen eigene Umgebung) und die Node-Tests, die seit Oktober/November rot sind, weil sich das Verhalten gewollt geändert hat,
Funktionen umbenannt wurden oder sie eine feste Dateiauswahl erwarten. Die Einordnung je Datei steht in `docs/TEST_STATUS_2026-11-09.md`.
Einige davon werden von aktiven Tests als Helfer geladen (z. B. `test_package_station_browser_p4.cjs`); **nicht verschieben oder löschen, ohne
vorher nach `require(` zu suchen.**

Welche Dateien nicht in der grünen Liste stehen:

    comm -23 <(ls tests/*.cjs tests/*.py | xargs -n1 basename | sort) <(sort tests/GREEN_NODE_TESTS.txt)

## Neuer Test
Ein neues Verhalten bekommt einen Test in `tests/e2e/` (echte App) oder, wenn der Kern isolierbar ist, einen Node-Test in `tests/` plus Eintrag in
`tests/GREEN_NODE_TESTS.txt`. Ein Test, der auf dem Vorgänger rot und mit dem Patch grün ist, belegt die Wirkung besser als einer, der nur grün ist.
