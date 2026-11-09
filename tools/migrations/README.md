# Einmalige Migrationen (Historie, nicht erneut ausführen)

1. `01_split_blocks.py` – Stufe 1: `index.html` in 32 Skript- und 77 Stilblöcke zerlegt.
2. `02_plan_oct28.py` + `02_carve_oct28.py` – Stufe 2a: Blöcke entlang der Dateigrenzen des Oktober-Quellbaums (28.10.) neu geschnitten; Ergebnis `source-manifest.json`, `src/**`, `styles/**`. Benötigte den entpackten Oktober-Quellbaum (`XenSonar_Gesamtmerge_2026-10-28_Quellen.zip`).

Beide Schritte änderten keinen Byte von `index.html`.
