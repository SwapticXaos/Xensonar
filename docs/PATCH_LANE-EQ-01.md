# LANE-EQ-01 · Keyboard-Töne der klassischen/Entrophon-Engine laufen durch den Keyboard-EQ

Parent: Merge `bcc9ff2`. Rollback: `bcc9ff2`.
Zone: HEISS-Verdrahtung (Wahl des Lane-Eingangs beim Start des Hold-Hosts; pro Note nur ein vorhandener Parameter, `lane`). Kein neuer Graph, kein neuer Knoten pro Block.
Status: CODE_PRESENT, BROWSER_CHECKED (neuer Test, RED auf Parent). Pegel am Tap vorher/nachher gleich (≈0,27 bei flachem EQ). Nicht gehört.

## Befund (gemessen, nicht vermutet)
Der EQ hängt bereits an der Rolle: `__XenLoopRec.route(ctx, 'wave'|'keyboard'|'particle', …)` baut je Rolle einen Instrument-EQ (`keyFor(kind,'instrument')`) plus Loop-Rec-Tap. Das Problem war, dass **jeder Einstiegspunkt die Rolle selbst festlegt** und einer sie fest auf `wave` setzte:
- Der Entrophon-C11-Host (die Engine, auf der auch die klassischen Wave-Töne laufen, auch der Standardklang) hat je Hold-Lane einen Host (`klaviatur`, `wellenstart`, `src/audio/avalanche.js` `prepareHosts`). Beide wurden auf den Eingang der **Wave-Lane** gelegt.
- Folge mit Entrophon (und klassischem Klang) auf dem Keyboard: Keyboard-EQ wirkungslos (Tap Keyboard 0, Tap Wave 0,29; Keyboard-EQ-Schnitt: 0,33), der Wave-EQ färbte Keyboard-Töne (0,005 bei Wave-EQ-Schnitt). Nodal, Samples und Psy Lab nutzen die Lane korrekt und waren nie betroffen. Das erklärt „Entrophon auf Wave Starter geht, auf Keyboard nicht".

## Änderung
- `prepareHosts(…, rawBuses)`: der `klaviatur`-Host geht in `LoopRec.route(ctx,'keyboard', Bus)`, der `wellenstart`-Host bleibt Wave. Rohbusse kommen vom Aufrufer (`dw(...)`).
- Der nicht-Entrophon-Pfad (`VW` → `ewe` / `__wave39PlayTone`, der zuvor ebenfalls `'wave'` fest setzte) bekommt die Lane mit (`lane:keyboard?'keyboard':'wave'`, derselbe Klassifizierer wie Nodal und Samples).

## Stem-Recorder (Folge)
Der Recorder hatte die Lücke als Sonderfall dokumentiert („Wave Starter klassisch + Keyboard Entrophon: beide landen in einer Spur, gleicher Signalweg“). Das entfällt: `describe()` ohne diesen Satz; „gleicher Synth auf Wave Starter und Keyboard = eine Spur“ wird jetzt im Recorder verdrahtet (Entrophon+Entrophon wie schon Klassisch/Samples), nicht mehr durch den Signalweg. Neu: ist die gemeinsame Wave-Spur aus, landet eine Keyboard-Note in der Keyboard-Spur statt in „Other“. Nulltest (Summe = Pre-EQ-Summe) bleibt grün (max. Differenz 6e-8). `tests/e2e/stems_instruments.cjs` angepasst.

## Test
`tests/e2e/keyboard_lane_eq.cjs` (echte Tasten, Entrophon und Standardklang): Keyboard-Taste klingt am Keyboard-Tap, nicht am Wave-Tap; Keyboard-EQ-Schnitt senkt sie, Wave-EQ-Schnitt nicht; Enter (Wave Starter) umgekehrt. Auf dem Parent rot (`Keyboard … 0.000, … wave 0.290`).

## Offene Risiken
- Keyboard-Noten **ohne** Hold-Sitzung auf dem Entrophon-Hauptost (z. B. Glissando/direkte Wege, falls es sie gibt) laufen weiter über den Hauptost in die Wave-Lane; dafür bräuchte es einen eigenen Host je Lane oder Ausgangskanal. Nicht getestet, kein Fall gefunden.
- Stems/Loop-Rec ordnen Keyboard-Entrophon-Töne jetzt der Keyboard-Rolle zu (vorher Wave).
- Der Hauptost bleibt auf einem Ausgang fest; die frühere Umhängung pro Note (`waveMainDestination` in `__wave39PlayTone`) ist eine Sonderlogik, die erst mit einem Host je Lane verschwinden kann.
