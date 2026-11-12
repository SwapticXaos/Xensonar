# ROOM5-05 · Pfeiltasten wie im Live-Raum, logarithmische Achse, aktive Töne sichtbar, Linien am Rand (12.11.2026)

Parent: ROOM5-04 (`32ecd68`), `index.html` 9 022 585 B, SHA-256 `08ab712d55f163b5ee10ab9fac52cb434767396e1a49856656d466502f231b17`.
Ergebnis: `index.html` 9029894 B, SHA-256 `5e6832054e2d7bb0645b91ee7822651116088104341894af2f23f76831852358` (+7309 B: Raum-Chunk plus 4 Gradientenzeilen im gemeinsamen Zeichencode). Rollback: `32ecd68`.
Status: CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). **Nicht:** abgehört, USER_ACCEPTED, Firefox/Safari, Netlify.
Vorgabe wie gewünscht: **alles wie im Hauptraum**; jede Abweichung ist ein Schalter (gespeichert), außer den Linien am Rand (siehe 5).

## 1. Pfeiltasten: Cursor statt Scrollen
Die Pfeiltasten scrollen die Seite nicht mehr. Sie folgen der Live-Raum-Logik (`yPe`, dieselbe Stufenfunktion `uZ`):
- **Mit „Snap ball to grid“:** ↑ / ↓ setzen den Cursor **eine Rasterstufe höher / tiefer** (gesperrte Stufen werden übersprungen, am Bereichsende bleibt er stehen, kein Wiederholen beim Halten). Dabei klingt der neue Ton, solange die Taste gehalten wird; hält man gerade eine Pad-Note, folgt diese.
- **Ohne Snap:** der Cursor gleitet, solange die Taste gehalten wird, und der Ton gleitet mit.
- **← / →** verschieben die Intensität (die freie Achse des Pads).
- „Rauf“ heißt immer höherer Ton, egal in welcher Ansicht/Richtung. Regler und Auswahlfelder, die gerade den Fokus haben, behalten ihre Pfeiltasten (Bedienbarkeit).
- Auch die Tasten bewegen den Cursor: die grüne Linie folgt der zuletzt gespielten Taste.

## 2. Logarithmisch oder linear
Schalter **Spacing: linear / logarithmic** (Vorgabe linear = Hauptraum: höhere Intervalle sind breiter). Logarithmisch: jede Oktave ist gleich breit. Wirkt auf Bild, Zeiger und Dreiecke; Tasten und Klang bleiben gleich. Getestet: linear gleiche Hz-Schritte, logarithmisch gleiche Verhältnisse. Der Name „Piano“ der waagerechten Ansicht ist damit ehrlicher: waagerecht + logarithmisch ≈ Klaviatur-Proportion (jede Oktave gleich breit); die Taste „View: piano“ lässt sich weiterhin von „Spacing“ trennen.

## 3. Alle aktiven Töne sichtbar (rosa/lila), Grün bleibt „zuletzt bewegt“
- **Grün** = die Linie, auf der Cursor/Ball liegt und die zuletzt per Zeiger **oder Taste** bewegt wurde (wie im Hauptraum).
- **Rosa/Lila** = jede weitere Note, die gerade klingt: Hold, Akkorde, mehrere Tasten, gleitende Töne. Linie über die volle Breite (also auch durch das Mandala) mit rosa Dreieck am linken Rand. Liegt die klingende Note auf der grünen Linie, bleibt es grün.
- **Tastenbuchstaben:** Am rechten Ende jeder Linie des Tastenfensters steht die Taste, die sie spielt (1–0, Q–P, dritte Reihe nach DE/EN-Wahl, folgt Tastenrichtung, Fenster, Spacing und Ansicht).

## 4. Linien nur am Rand, damit die Mandala atmet
Schalter **Grid lines: edges only / full**. „Edges only“ (Vorgabe in Raum V, auf deinen Vorschlag): Die Rasterlinien erscheinen nur an den äußeren Enden (links mit Dreiecken und Beschriftung, rechts mit Tastenbuchstaben), in der Mitte nicht. Sichtbar bleiben in der Mitte die Linie des Balls (grün) und alle klingenden Töne (rosa). „Full“ = wie im Hauptraum.
Technik: ein optionaler Parameter `edgeLines` im gemeinsamen Zeichencode; ohne ihn (Live-Raum) sind die Zeichenbefehle identisch zum Parent. **Test:** `room5_grid_layer_equivalence` prüft alle 6 Live-Fälle wie zuvor plus: `edgeLines` undefiniert = false, `edgeLines: true` ändert nur die Gradientenstopps der Linien.

## 5. Offene Abweichung von „alles wie im Hauptraum“
Nur diese eine ist in Raum V standardmäßig anders: **Grid lines: edges only** (dein Vorschlag). Umschalten auf „full“ gibt das Hauptraum-Bild.

## Notiz für die spätere Einbindung in den Hauptraum (nur festgehalten, nichts gebaut)
- Psy-Synth als **Instrument für Tastatur und Wave Starter**, also auf **Enter / linke Maustaste** und auf die **Tasten**; **kein Enter-Hold**; **keine Visualisierung im Hauptraum** (Live-Performance schonen). Basis dafür: `PsyEngine({visual:false})` (ROOM5-03).
- Eigene Rubrik **Psy Lab** im Hauptraum, **unter Entrophon, über Samples**; gespeicherte Sounds **suchbar unter „search presets“**.
- **Nicht für den Thunder Mode** (vorerst nicht vorgesehen).
- Die Abweichungsmöglichkeiten (Spacing, Richtungen, Linien) können später auch im Hauptraum angeboten werden und sich dort merken; erst hier begrenzt, damit man sieht, was sich bewährt.

## Prüfungen
`run_tests.sh` 110/110, `build.py --check` OK. Browser: `room5_psylab` erweitert (Pfeile ± Stufe über `uZ`, kein Scrollen; linear gegen logarithmisch; Tasten unabhängig vom Spacing; Linien nur am Rand: Mitte leer, Rand vorhanden; klingende Note = rosa Linie über die ganze Breite; „full“ bringt die Mittellinie zurück). Gesamtlauf `run_e2e.sh`: siehe Nachtrag.
Last Headless (Software-Raster) mit aktiven Noten und Beschriftung: Hauptthread 47 % (vorher 48 %), Stufenautomatik wie bisher.

## Offen
- Die Tastenbuchstaben können in dichten Bereichen (tiefe Töne, lineare Achse) Linien auslassen (Mindestabstand 9,5 px), dort hilft „Spacing: logarithmic“.
- Nicht geprüft: Firefox, Safari, Netlify; kein Abhörtest.

## Nachtrag Gesamtlauf
`run_e2e.sh` auf Stand `eb6885c`: 19 Läufe grün, kein Fehler, Exit 0 (u. a. `room5_psylab`, `room5_grid_layer_equivalence`, `room5_metronome_not_recorded`, `live_grid_handles`, Bass-, Session- und Package-Läufe, P37).
