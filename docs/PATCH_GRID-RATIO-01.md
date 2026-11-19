# GRID-RATIO-01 · Brüche in der Grid Workbench + abgeschnittener unterer Rand

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, 1600×760 und 1600×900, Screenshots vorher/nachher). Zone: KALT (Grid Workbench, kein Audio berührt).
Parent `3433523`, `index.html` 8 303 938 → 8 307 348 B (+3 410 B). Rollback: `3433523`.

## Wunsch (Nutzer, 19.11.)
1. In der Grid Workbench ist der untere Rand abgeschnitten (Grafik leicht fixen).
2. Beliebig komplexe JI-Intervalle als Bruch eintippen; sie werden in Cent zur Root umgerechnet und in das Raster eingefügt, das man gerade bearbeitet (rechte Seite).

## Umsetzung
- **Rand:** Der Dialog hatte drei Spalten in einem `overflow-hidden`-Raster. Rack (links, 11 Slots) und Period Workbench (rechts, bis zur Statuszeile) waren höher als das Fenster und unten abgeschnitten (bei 900 px Höhe fehlten Speichertitel/Save, Slot 11, Statusmeldung). Linke und rechte Spalte scrollen jetzt innerhalb des Fensters (`overflow-y-auto`), die Bibliothek wie bisher. Zusätzlich lagen in der Marker-Grafik die Beschriftungen „1200.0c“/„0.0c“ unter den Dreiecken von Marker 0/Periode; sie stehen jetzt links oben/unten mit Hintergrund (`__XenNativePeriodMarkerRack`; im Session-Dialog bleibt die Null-Beschriftung wie bisher per CSS ausgeblendet).
- **Bruch eintippen** (Period Workbench, unter „Set Cents for Marker“): Feld **Add JI Ratio** + **Add** (Enter geht; ein Formular, weil der Dialog Tastendrücke im Capture abfängt). Eingabe `a/b`, `a:b`, ganze Zahl oder Dezimalzahl (`1,25`). Live-Vorschau „81/64 = 407.8c above the root“.
  - Umrechnung: `1200·log2(a/b)`; liegt der Wert außerhalb einer Periode (z. B. 9/4, 2/3), wird in die Periode gefaltet (Oktave bzw. Tritave/gewählte Periode) und die Meldung nennt den Rohwert. Wurzel oder ganze Periode (1/1, 2/1, bei Tritave 3/1) werden mit Begründung abgelehnt (Periode stellt „Total Cents“).
  - Einfügen: sortiert in die Stufen des Rasters, das gerade bearbeitet wird; Marker wird ausgewählt; Duplikate (±0,15 c, wie der JI-Knopf) fügen nichts hinzu und sagen, welcher Marker es schon ist. Der Bruch wird wie ein JI-Knopf-Eintrag als „JI-getrackt“ geführt (Ziehen des Markers hält die Zuordnung, Name „… +N“).
  - Speichern wie gehabt über „Save“ in die Tuning Library. Nichts wird ohne Save in die Bibliothek geschrieben.
- Genauigkeit: Der Owner (Period Workbench/Bibliothek) speichert Stufen auf 0,1 Cent. Sehr feine Brüche (z. B. 4095/4096 = −0,4 c) sind damit abgebildet, aber auf 0,1 c gerundet; Brüche, die weniger als 0,15 c voneinander liegen, gelten als dieselbe Stufe.
- Grenzen: Stufenlimit 256 wie bisher; Bruch aus mehreren Faktoren (3/2·5/4) nicht, dafür das Produkt ausrechnen.

## Tests
- `tests/grid_ratio_01.test.cjs` (Umrechnung, Falten, Oktave/Tritave, Ablehnung); `run_tests.sh` 133/133.
- `tests/e2e/grid_ratio_add.cjs`: Eingabe per Enter und Add, 81/64 = 407.8 c, 1001/1000, Duplikat, Faltung, 2/1 / „abc“ / 3/0 abgelehnt, Save, danach in der Bibliothek; alle Spalten lassen sich bis zum Ende scrollen, Save und Slot 11 liegen im Fenster (1600×760).
- Nachbarn grün: Scala-Import/Export, Grid-Drag, Grid-Shift-Fenster, Live-Grid-Handles, Psy-Lab-Grid, Raster-Layer-Äquivalenz. Voller `run_e2e.sh` nicht gelaufen.
- Nicht gehört (kein Audio berührt).
