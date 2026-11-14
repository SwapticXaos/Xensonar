# Werkzeuge für die Verschlankung (nur Analyse, nie Teil von `index.html`)

Einmalig: `cd tools/slim && npm install` (acorn, acorn-walk, eslint-scope; `node_modules/` ist ignoriert).

| Werkzeug | Aufruf | Was es beantwortet |
|---|---|---|
| `dead_code.cjs` | `node tools/slim/dead_code.cjs` (Bericht), `--apply` (löschen) | Welche Funktionen/Konstanten sind **beweisbar** unerreichbar? Kennt die Eigenheiten dieses Codes: Raum- und Funktions-Nutzlasten werden per direktem `eval` im Hauptmodul ausgewertet; Namen, die in `tests/` oder `tools/` vorkommen, bleiben. |
| | `--who-uses a,b` | Wer benutzt diese Namen des Hauptmoduls? |
| | `--without a,b` | Was-wäre-wenn: Was hängt ausschließlich an diesen Namen? (nie mit `--apply`) |
| `duplicates.cjs` | `node tools/slim/duplicates.cjs [--min 300]` | Gleiche Funktionen an mehreren Stellen (wörtlich und nach Umbenennen lokaler Namen). |
| `composition.cjs` | `node tools/slim/composition.cjs` | Woraus bestehen die Bytes: Kommentare, Leerraum, eingebettete Daten, Code. |
| `css_unused.py` | `python3 tools/slim/css_unused.py` | CSS-Regeln, deren Klassen/IDs im JS nie entstehen können. |
| `cov_preload.cjs` + `cov_report.cjs` | `XEN_COV_DIR=$PWD/dist/coverage NODE_OPTIONS="--require $PWD/tools/slim/cov_preload.cjs" ./tools/run_e2e.sh`, dann `node tools/slim/cov_report.cjs dist/coverage` | Welcher Code lief in den Browser-Tests nie? **Nie gelaufen heißt nicht tot**, nur: kein Test kam dorthin. Code in Worklets/Workern wird nicht gesehen. |
| `tour.cjs` | wie oben, statt `run_e2e.sh`: `node tools/slim/tour.cjs` | Bedient in jedem Raum jeden Knopf, Regler und jede Auswahl einmal (frisches Profil), für die Abdeckung. |
| `profile.cjs` | `node tools/slim/profile.cjs index.html start` bzw. `play 25` | Wohin geht die Hauptthread-Zeit beim Start und im Spiel (Funktion und Quelldatei)? |
| `page.cjs` | (Bibliothek) | Baut die Seite wie `tools/build.py` im Speicher und weiß für jedes Zeichen die Quelldatei. |

Nach `--apply`: `python3 tools/build.py`, das Werkzeug erneut starten (muss 0 finden), dann `run_tests.sh` und `run_e2e.sh`.
