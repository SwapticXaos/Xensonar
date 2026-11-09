# Einmalige Migrationen (Historie, nicht erneut ausführen)

1. `01_split_blocks.py` – Stufe 1: `index.html` in 32 Skript- und 77 Stilblöcke zerlegt.
2. `02_plan_oct28.py` + `02_carve_oct28.py` – Stufe 2a: Blöcke entlang der Dateigrenzen des Oktober-Quellbaums (28.10.) neu geschnitten; Ergebnis `source-manifest.json`, `src/**`, `styles/**`. Benötigte den entpackten Oktober-Quellbaum (`XenSonar_Gesamtmerge_2026-10-28_Quellen.zip`).

Beide Schritte änderten keinen Byte von `index.html`.
3. `03_refine_boundaries.py`, `04_refine_boundaries_2.py` – Stufe 2b: Dateigrenzen nachgeschärft, sodass jede im Oktober allein kompilierende JS-Datei es wieder tut (Ende zu früh/zu spät, Anfang zu spät, Ende verändert). 12 vermeintliche Einschübe waren abgeschnittene Dateienden. Text wandert nur zwischen Nachbardateien.

Hinweis: 01/02 wurden nach dem Umzug in diesen Ordner auf `parents[2]` als Projektwurzel korrigiert. Dieselbe Kette (01 → 02 → 03 → 04) baut auch W31 (`e4fc…`) und Stage05 (`249f…`) byte-identisch nach; so entstand die Test-Zeitleiste.
