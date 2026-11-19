# GRID-CJI-01 · JI-Raster mit komplexen Brüchen = CJI (Custom JI), Brüche statt Cent

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium). Zone: KALT (Grid Workbench, Bibliothek; kein Audio berührt, nicht gehört).
Parent `d95f569`, `index.html` 8 307 348 → 8 310 787 B (+3 439 B, inkl. Spielfeld-Nachtrag). Rollback: `d95f569`.
Baut auf GRID-RATIO-01 auf (`docs/PATCH_GRID-RATIO-01.md`).

## Wunsch (Nutzer, 19.11.)
Eine JI-Tonleiter plus weitere komplexe JI-Intervalle wurde als „Custom Division of the Octave“ (CDO) gewertet und nur mit Cent-Werten angezeigt. Besser: als CJI (Custom/Complex JI) speichern und zeigen, mit den Brüchen statt der Cent-Angaben.

## Umsetzung (Owner: Grid-Bibliothek `bF`/`LJ`, `src/runtime/01_instrument_state.js`; Editor `Woe`/`z6`, `src/myzel/01_effect_mapping.js`)
- **Klasse CJI:** Ein Raster, dessen Stufen (außer der Wurzel) alle einen exakten Bruch haben (±0,15 c), ist `family:"cji"`, `divisionKind:"ratio"`, Name „N CJI“ (Oktave und Tritave). Echte Gleichteilungen bleiben EDO/EDT; sobald eine Stufe kein Bruch ist, bleibt/wird es CDO/CDT („+N“ wie bisher). Das eingebaute „Just Intonation“ ist im Editor schon CJI (12 CJI), ändert sich aber nur beim Speichern.
- **Brüche gespeichert:** neues Feld `stepRatios` am Bibliothekseintrag, `{"407.8":"81/64"}` (Schlüssel = Stufe in Cent, 0,1 c). Der Bibliotheks-Owner behält nur Brüche, die noch zur Stufe passen (±0,15 c); Verschieben eines Markers verwirft den Bruch dieser Stufe. Alte Einträge ohne `stepRatios` bleiben bytegleich (auch Inhalts-Hash).
- **Anzeige:** Marker-Grafik zeigt „3 (81/64)“ statt „3 (407.8c)“ (0 = 1/1), Tooltip/Aria nennen beides; Bibliothek listet „CJI · Octave · N Schritte“; „Set Cents“ bleibt in Cent. Beim Wiederöffnen eines gespeicherten CJI kommen die Brüche zurück (`x2` stellt sie aus `stepRatios` her).
- **Eingabe-Faltung (präzisiert):** Bei Oktave/Tritave wird der Bruch selbst gefaltet (9/4 → 9/8, 2/3 → 4/3, bei Tritave 9/2 → 3/2), damit die Stufe einen exakten Bruch behält; Dezimalzahlen werden zu Brüchen (1,25 → 5/4). Bei einer freien Periode (weder 2/1 noch 3/1) gelten nur Brüche innerhalb der Periode.
- **Weitere Wege, dieselben Daten:** Gitterpaket-Export/Import (`H6`/`V6`/`Yoe`/`Qx`: Familie `cji`, Brüche, Hash nur mit `stepRatios`, wenn vorhanden → gleiches Raster wird erkannt, kein Duplikat), Session-Tuning-Variante (`createTuningVariation`), Quick-Menü-Kürzel „…cji“.
- **Scala:** Import: Dateien, deren Stufen alle Brüche sind, werden CJI (sonst CDO/CDT; Brüche einzelner Stufen bleiben erhalten); Export schreibt gespeicherte Brüche als Brüche (5/4 statt 386.30000).

## Nachtrag: Spielfeld (Live Room, Rasterlinien)
- Die Linienbeschriftung kommt aus `$Se` (`src/audio/03_rfl_transport_legacy.js`). Bisher: EDO/CDO/EDT/CDT/… „N (Hz)“, nur das eingebaute JI zeigte Brüche. Jetzt: hat das aktive Raster `stepRatios` (CJI, oder gemischt), steht an der Linie **„Bruch · Cent (Hz)“**, z. B. „81/64 · 407.8c (411.5Hz)“, der Grundton „Root (Hz)“; die Klasse steht oben im Kopf („FRETBOARD 14 CJI“). Stufen ohne Bruch in einem gemischten Raster behalten „CDO n (Hz)“; EDO/EDT/JI unverändert.
- Gefunden und behoben: Der Linien-Cache war nur nach Raster-ID geschlüsselt; wer ein gespeichertes eigenes Raster unter derselben ID neu speicherte, sah auf dem Spielfeld bis zum Neuladen die alten Linien/Beschriftungen. `pF` (einziger Schreiber der Bibliothek) leert jetzt den Cache (kalt, nur beim Speichern/Löschen).
- Hinweis zum Prüfen: Ein Klick in der Bibliothek lädt nur in den Editor; aktiv wird ein Raster erst im Rack (ziehen, dann anwählen).

## Grenzen / offen
- Marker-Beschriftungen werden wie bisher ausgedünnt, wenn Stufen enger als 15 px liegen; bei vielen eng liegenden Stufen sieht man nicht jeden Bruch (Tooltip hat ihn).
- Brüche werden im Grid Workbench/Package und auf den Rasterlinien des Live Room gezeigt; andere Hauptraum-Beschriftungen (z. B. Kürzel im Quick-Menü) nennen nur die Klasse.
- Rückwärts: Ältere XenSonar-Fassungen kennen `cji` nicht und ignorieren solche Einträge (Whitelist des Owners).
- Stufen bleiben auf 0,1 c gerundet (Owner), Brüche sind der exakte Wert dahinter.

## Tests
- `tests/grid_ratio_01.test.cjs` (Faltung inkl. Bruch, Tritave, freie Periode, `stepRatios` folgen den Stufen, Klassifikation CJI/CDO/EDO); `tests/scala_01.test.cjs` angepasst (reine Brüche → cji). `run_tests.sh` 133/133.
- `tests/e2e/grid_cji.cjs`: Just Intonation + 81/64 + 1001/1000 + 45/32 → „15 CJI“, Brüche in der Grafik, Save → family cji/ratio/14 Brüche, Bibliothek zeigt CJI, Neuladen, Archiv-Rundreise ohne Duplikat, Scala-Export mit 81/64 und 1001/1000, Cent-Stufe → nicht mehr CJI; Spielfeld-Linien (plain/gemischt/rein) und Cache-Erneuerung beim Neuspeichern. `grid_ratio_add`, Scala, Grid-Drag/-Shift/-Handles, Psy-Lab-Grid, Raster-Layer: grün. Voller `run_e2e.sh` nicht gelaufen.
