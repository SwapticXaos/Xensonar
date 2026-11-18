# SCALA-01 · Scala-Dateien (.scl) importieren und exportieren

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, echter Datei-Dialog und Download). Zone: KALT. Kein Audio berührt.
Parent `fe2cc9e`, `index.html` 8 273 337 → 8 277 542 B (+4 205). Rollback: `fe2cc9e`.

## Wunsch (Nutzer, 18.11.)
Import/Export von Scala-Dateien als kleine Adapterschicht, kein Umbau.

## Umsetzung (Owner: vorhandene Grid-Bibliothek `LJ`/`hc`/`Kp`/`vF`, `src/myzel/01_effect_mapping.js`)
- Grid Workbench → Tuning Library: **Import .scl** und **Export .scl** (unter „Export Library Package / Load Working Copy“). Derselbe Datei-Dialog wie der Paket-Import (nimmt jetzt auch `.scl`).
- Import: Scala-Format (Kommentare `!`, Beschreibung, Anzahl, Tonhöhen als Cents mit Punkt oder Verhältnis a/b bzw. ganze Zahl, 1/1 implizit, letzter Wert = Periode). Ergebnis ist ein benutzerdefiniertes Raster wie aus der Period Workbench (Name = Dateiname, Oktave → `cdo`, Tritave → `cdt`, andere Perioden als Periode in Cents). Es landet in der Bibliothek und ist ausgewählt; ins aktive Rack wie jedes Raster per Ziehen. Kaputte Dateien: klare Meldung, nichts gespeichert.
- Export: das ausgewählte Raster (eingebaut oder eigen) als `.scl`; JI behält seine Verhältnisse (9/8, 5/4 …), Periode 2/1 bzw. 3/1.
- Genauigkeit: Der Bibliotheks-Owner speichert Stufen auf 0,1 Cent (unverändert).
- `.kbm` (Tastenbelegung) nicht umgesetzt: Grundton und Tastenfenster stellt XenSonar selbst ein.

## Tests
- `tests/scala_01.test.cjs`: Parser (Mitteltönigkeit aus dem Scala-Archiv, Tritave), Fehlermeldungen, ein Speichervorgang über den Owner, Rundreise Export→Import für 12/19 EDO und Bohlen-Pierce, JI-Verhältnisse.
- `tests/e2e/scala_import_export.cjs`: Import über den Knopf, 12 Stufen, 5/4 = 386,3 c, Statusmeldung, Export-Download, nach Neuladen erhalten, kaputte Datei abgelehnt.
- `run_tests.sh` 131/131; Browser-Teillauf Scala/Grid/Parts/Pakete 10/10.
