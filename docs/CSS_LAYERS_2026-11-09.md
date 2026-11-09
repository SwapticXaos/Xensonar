# CSS-Schichten: Befund und Vorgehen (09.11.2026)

**Zone:** WARM (nur Darstellung), kein Audio-/Scheduler-Bezug.

## Befund
- 77 Stilblöcke, 757 KB, 718 `!important`. In einem Rundgang durch Main Room, Drum Manager, Bass Workshop, Meta-Menü, Forge und Nodal werden rund 40 % der Regeln benutzt; 36 Blöcke (120 KB) bleiben dort ungenutzt. Das heißt nicht, dass sie tot sind: Viele gehören zu Dialogen und Räumen, die der Rundgang nicht öffnet.
- Automatisches Ausdünnen (Tailwind-Purge) lohnt sich nicht: Nur 22 Regeln (2 KB) sind nachweislich gefahrlos entfernbar, weil Klassennamen teils zur Laufzeit zusammengesetzt werden.
- Die Schichten sind historisch gewachsen: Jeder Patch hängte einen Block an und setzte sich mit Spezifität oder `!important` durch. Aufräumen geht deshalb nur bereichsweise und mit Nachweis.

## CSS-DEDUP-01
`styles/post-oct/074-xen-compose-tangerine-aurora-ta1.css` war byte-identisch mit `049-…` und trug dieselbe `<style id>` (doppelte ID, ungültiges HTML). Entfernt, HTML −3 654 Byte (inkl. Versionskennung).
Nachweis:
1. Keine Regel in den Blöcken 050–073 erreicht den Button „Compose From Scratch“ mit gleicher Spezifität. Die Reihenfolge war also wirkungslos.
2. `tools/style_snapshot.cjs --only` vorher/nachher: 18 Ansichten, 2 Elemente (der Button bei 1440 und 390 px), identisch.

## Werkzeug für weitere Bereiche
`tools/style_snapshot.cjs` hält pro Ansicht alle berechneten Stile und Boxen jedes sichtbaren Elements fest.
```
node tools/style_snapshot.cjs <html> <out.json> [--only <datei.css>]
node tools/style_snapshot.cjs --diff <vorher.json> <nachher.json> [<rauschen.json> ...]
```
Rauschen (Animationen, Blinken) wird durch zusätzliche Aufnahmen desselben Builds maskiert. Räume ohne sichtbaren Knopf lassen sich über `event:<name>` öffnen (z. B. Melodic Loop).
**Achtung:** Ein `IDENTICAL` mit 0 Elementen beweist nichts. Erst eine Ansicht hinzufügen, in der die Regeln greifen.

## Empfohlene Reihenfolge, wenn ohnehin an einem Bereich gearbeitet wird
Zuerst die Blöcke eines Bereichs zusammenführen und die `!important`-Ketten dort abbauen, mit Snapshot-Nachweis je Schritt. Kein globaler Umbau.
