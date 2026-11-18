# MT-PARTS-01 · Benannte, farbige Parts im Mehrspurraum

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, echte Maus). Zone: WARM (Darstellung) / KALT (Daten). Kein Audio berührt.
Parent `1798117`, `index.html` 8 271 298 → 8 273 337 B (+2 039). Rollback: `1798117`.

## Wunsch (Nutzer, 18.11.)
Wiederkehrende Parts frei benennen und grafisch hervorheben, wie die Farben der Quick-Rack-Karten und der Spuren. Keine Schablone: beliebig viele Parts, beliebige Länge.

## Umsetzung (Owner: Mehrspurprojekt, Feld `markers`, vorhandene ROOM4-10-Marker)
- Rechtsklick auf einen Marker: „Part colour: …“ (10 Farben) und „No part colour“.
- Die Farbe gehört zum Namen: Setzen färbt alle Marker gleichen Namens (Groß/Klein und Leerzeichen egal), ein späterer Marker mit diesem Namen übernimmt sie. Ein Undo-Schritt.
- Ein farbiger Marker färbt den Bereich bis zum nächsten Marker (Lineal kräftiger, alle Spuren leicht); Maus- und Doppelklick in den Spuren unverändert (`pointer-events:none`).
- Datenformat: optionales `color` (#rrggbb) am Marker; ungültige Werte werden verworfen; Marker ohne Farbe und alte Projekte unverändert.

## Tests
- `tests/mt_parts_01.test.cjs`: Farbe pro Name, Bereiche, Datenformat (alte Projekte, ungültige Werte).
- `tests/e2e/mt_parts_colour.cjs`: Verse/Chorus/Verse benennen, Rechtsklick → Rose, beide Verse im Lineal und in jeder Spur gefärbt, Chorus nicht, gespeichert, Undo/Redo, nach Neuladen erhalten.
- `run_tests.sh` 130/130, Browser-Teillauf Mehrspur/Paket/Persistenz 10/10.
