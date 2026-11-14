# MIN-01 · Verdichtete Auslieferung

Parent: `9940bda` (DIAG-01; `index.html` 8 926 315 Bytes). Rollback: `9940bda`.
Neu: `index.html` 8 076 990 Bytes (**−849 325 Bytes, −9,5 %**), sha256 `e5233509163ebad136d116ed9aea76b847b094a86bcf5c692d0c50c96961fc5a`.
Zone: Build (kein Laufzeitcode geändert). Status: CODE_PRESENT, BROWSER_CHECKED (ganze Browser-Suite auf der verdichteten Datei). Nicht am Gerät gesehen.

## Was
`tools/build.py` verdichtet die Auslieferung mit `tools/minify.cjs` (esbuild, Version fest in `tools/slim/package.json`, damit der Build überall byte-gleich ist):
- Scripts und Hauptmodul: Leerraum, Kommentare und Syntax. **Namen bleiben erhalten**, weil die Räume per `eval` im Hauptmodul ausgewertet werden und Namen von dort benutzen; auch Test- und Prüf-Build sprechen Funktionen beim Namen an.
- Raum- und Funktions-Nutzlasten: nur Leerraum und Kommentare (ihr letzter Ausdruck ist das Ergebnis von `eval`, Syntax-Umbau wäre dort unsicher).
- CSS: verdichtet.
Der Quelltext in `src/` bleibt unverändert lesbar.

| Fassung | Befehl | Größe |
|---|---|---|
| Auslieferung (verdichtet, ohne Diagnose) | `python3 tools/build.py` | 8 076 990 B |
| unverdichtet (Quelltext-Tests, Lesen) | `--plain` → `dist/XenSonar_PLAIN.html` | 8 926 315 B |
| mit Diagnose | `--diag` → `dist/XenSonar_DIAG.html` | verdichtet |

Übers Netz (gzip) sind es etwa 2,13 statt 2,40 MB.

Start (headless Chromium, Median aus 5 Läufen): erstes Bild 396 → 356 ms, Power-Knopf bereit 1066 → 1006 ms, lange Tasks beim Start 769 → 728 ms (Vergleich mit dem Stand vor der Verschlankung, `416977b`).

## Bewusst nicht gemacht
Namenskürzung (weitere −0,5 MB): An mehreren Stellen werden Worker- und Worklet-Quelltexte aus Funktionstexten zusammengesetzt; dort könnten gekürzte Namen auseinanderlaufen. Der Gewinn rechtfertigt das Risiko nicht ohne eigene Prüfung jeder dieser Stellen.

## Tests
`build.py --check` vergleicht jetzt die verdichtete Datei. Regressionstests, die Quelltext lesen, nutzen die unverdichtete Fassung (`tools/run_tests.sh`); Browser-Tests laufen auf der verdichteten Prüf- und Auslieferungsfassung. `run_tests.sh` 121/121, Browser-Suite grün (`grid_drag_selection` wackelt wie vorher, 4/5 sowohl auf dem Stand vor der Verschlankung als auch jetzt).

## Für den Nutzer
Einmalig `npm ci --prefix tools/slim`, danach wie gewohnt `python3 tools/build.py`. Die GitHub-Action installiert das selbst.
