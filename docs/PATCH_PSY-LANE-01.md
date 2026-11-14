# PSY-LANE-01 · Psy Lab im Live-Raum: Instrument-EQ, Sustain-Taste (´), Ausdruck (B / Alt)

Parent: `2c463c4` (PSY-OCT-01, index.html 8 080 087 Bytes). Rollback: `2c463c4`.
Neu: index.html 8 082 481 Bytes (+2 394), sha256 `fd9e84b3de18ed694a36f31cd51cc83f4c2ca8340f6175c39d3bccfaa9321412`.
Zone: WARM (Hauptraum-Tasten, vorhandene Psy-Lab-Folgeschleife); eine kleine HEISS-Änderung im Worklet (Release-Konstante je Stimme, Zeile in `process()`).
Status: CODE_PRESENT, UNIT_VERIFIED (121/121), BROWSER_CHECKED (neuer Test + Psy-Lab- und Stem-Tests). **Nicht gehört.**

## 1. EQ (PSY-EQ-01)
Vorher: Lane-Engines (Wave Starter, Keyboard) hingen direkt am Master-Eingang, an keinem EQ.
Jetzt: `out → __XenEQ.route(ctx, 'keyboard'|'wave', tap, 'instrument') → tap → Master-Eingang`. Gleiche Einstellung wie der klassische Klang der Lane (`keyFor(kind,'instrument')`), eigenes Gerät je Engine. Raum V (ohne Lane) bleibt direkt. Der Stem-Recorder greift jetzt den EQ'ten `tap` ab (Nulltests Stems bleiben grün). Nicht angeschlossen bleiben Pan und Loop-Rec-Tap (wie vorher).

## 2. Sustain-Taste ´ / ` / ' / = (PSY-SUS-01)
Bei gehaltener Taste enden Taste-los / Maus-los / Enter-Gate nicht; die Töne klingen weiter (eigener Patch-Sustain). Beim Loslassen: schnelles Abdämpfen (~45 ms) aller zurückgehaltenen Töne. Worklet: `off` mit `fast`, pro Stimme `vFast`; ohne Flag identischer Pfad. Fensterverlust (blur) und Reset lösen die Taste.
Zustand lebt im vorhandenen Sustain-Owner (`setSustain` in `Zke`), kein zweiter Schalter.

## 3. Ausdruck B / Linke Alt, Pedal und Knob (PSY-EXPR-01)
Der Ausdruckswert der Hotkeys (−0,26 … 1, Pedal kehrt zurück, Knob rastet) wirkt wie beim klassischen Keyboard-Klang: Ausgangspegel der Keyboard-Lane = 1 + Wert × 2,35, begrenzt auf 0,12 … **2,0** (klassisch 3,35; Psy-Lab-Stimmen haben weniger Headroom, Velocity ist im Worklet bei 1 gedeckelt). Gilt für die Keyboard-Lane, nicht für den Wave Starter (wie klassisch: nur Keyboard). Pegel kontinuierlich auch bei gehaltenen Tönen.

## Tests
- Neu `tests/e2e/psylab_sustain_expression_eq.cjs`: EQ-Route vorhanden und ein harter EQ-Schnitt senkt den Pegel am Tap; Sustain hält Töne und dämpft schnell; ohne Sustain normales Release; B hebt (1,0 → 2,0), Pedal kehrt zurück, Alt senkt (0,39).
- `tests/room5_psylab_engine.cjs`: Allokationsmessung 30 000 → 300 000 Blöcke. Auf dem Parent wechselte die Messung zwischen +35,6 und −101,8 Byte/Block, mit diesem Patch zwischen +67,6 und −69,8 (Schwelle 64): Heap-Statistik in 32-Byte-Schritten. Mit 600 000 Blöcken +5,6 / −1,2 Byte/Block, also keine Allokation pro Block.

## Offene Risiken
- Nicht gehört. Insbesondere Pegel von B (×2) und das Abdämpfen (45 ms) bitte abhören.
- Der Worklet-Pfad ohne `fast` wurde nicht per PCM-Vergleich vor/nachher geprüft, nur per Konstruktion (identische Konstante) und Tests.
- Wave Starter hat keinen Ausdruck (wie klassisch). Pan und Loop-Rec für Psy Lab weiter nicht angeschlossen.

## Nachtrag: EQ-Prüfung für beide Lanes (Rückfrage: gilt der EQ auch für Keyboard-Psy-Lab?)
Der erste EQ-Test nutzte `__XenEQ.rasterStroke`, das im Standardmodus (`adaptive`) nichts tut, und maß nur den zuerst gelisteten Tap. Damit war „ein EQ-Schnitt senkt den Pegel" nicht belastbar (die Note klingt auch von selbst ab).
Neu gemessen (`tools/probes/psylab_lane_eq_probe.cjs`, EQ-Zustand wie ihn das Dock schreibt: `__XenEQ.set(key,{a:Array(360).fill(-1),enabled:true})`): Keyboard-Lane 0,078 → 0,0011, Wave-Starter-Lane 0,071 → 0,0012 (je Lane eigener Tap, nach dem EQ). Beide Lanes sind also im EQ.
`tests/e2e/psylab_sustain_expression_eq.cjs` prüft das jetzt je Lane mit dieser Kurve. Kein Quelltext geändert (index.html unverändert 8 082 843 Bytes).
