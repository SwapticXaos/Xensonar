# VOICE-HOST-01 · Schlagzeug und Bass ohne Graph-Änderungen: die Ursache des Knisterns behoben

Parent: `20aa597` (SLIM-01; `index.html` 9 110 046 Bytes, sha256 `c1d8376fcf9409a17baad3027a8d6c83bfcb98f49e84cae31688352250d5f701`). Rollback: `20aa597`.
Neu: `index.html` 9 134 671 Bytes (**+24 625 Bytes**), sha256 `3a4d47a5b92adfc0076ed8de5e99472b426346ea8ff8483c685f6a3d3895c0d1`.
Zone: **HEISS** (Audio-Thread und Drum-/Bass-Scheduler).
Status: CODE_PRESENT, BROWSER_CHECKED (headless Chromium 153: PCM-Vergleich alt/neu, Live-Messung), **nicht gehört**, Firefox nicht geprüft.

## Ursache, die jetzt wegfällt
Jeder Drum-Schlag erzeugte 3 Audioknoten (Abspielknoten, Pegel, Panner), jede Bass-Note bis zu 9 (Oszillatoren, Gewicht, Mix, Verzerrer, Tiefpass, Pegel); alle wurden verbunden und nach dem Klang wieder getrennt. Das sind in der Standard-Session ≈ 64 Graph-Änderungen pro Sekunde auf dem Hauptthread. Chromium ruft Worklets dann gelegentlich mit **veralteter `currentFrame`** auf (`docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md`): die Ursache des Knisterns im Root-Follow-Loop und der falschen Lücken in Aufnahmen. Bisher wurde die Folge in drei Worklets einzeln abgefangen (RFL-CLOCK-01, WORKLET-CLOCK-02). Nur null Graph-Änderungen pro Ereignis verhindern sie; Parameter-Automation und Worklet-Nachrichten lösen sie nicht aus.

## Was sich geändert hat
Neue Datei `src/post-oct/gaps/010-main-bundle__16_live_voice_host.js` mit zwei Worklet-Prozessoren, die so lange leben wie der Audiokontext:
- **`xen-drum-voices`**: spielt die vorbereiteten Drum-Körper (sie liegen ohnehin als fertig gerenderte Puffer vor) und die Sample-Lanes. Pro Stimme dieselbe Kette wie vorher: Pufferwiedergabe mit Chromiums Start zwischen zwei Samples und Interpolation, Pegel-Automation (Hi-Hat-Hüllkurve, Sample-Einblendung und Ausblend-Schnitt), Abwürgen der offenen Hi-Hat, Ton-Tiefpass, StereoPanner. Je Lane ein Ausgang, einmal fest mit dem Lane-EQ-Bus bzw. dem Drum-Bus verbunden.
- **`xen-bass-voices`**: der Bass-Synth. Pro Note dieselbe Kette wie vorher: Oszillatoren mit Chromiums bandbegrenzten Wellentabellen (36 Drittel-Oktav-Stufen, gleiche Interpolation), Sub-Oszillator, Mix, tanh-Verzerrer, Tiefpass mit Filterhüllkurve, Pegelhüllkurve, Stopp. Der **Bass-Pitch-Regler** steuert jetzt einen `detune`-Parameter des Knotens, genau wie vorher jeden einzelnen Oszillator, also auch bei klingenden Noten.
- Pro Schlag/Note schickt der Hauptthread **eine Nachricht**; kein Knoten wird erzeugt, verbunden oder getrennt. Die Worklets führen eine eigene fortlaufende Uhr.
- Eingebunden in `src/rhythm/03_live_drum_bodies.js` (`trigger`, `triggerSample`) und `src/rhythm/04_workspace_and_transport.js` (`playBassNote`). Der bisherige Code steht jeweils direkt dahinter und bleibt in Gebrauch, solange der Worklet lädt (erste Sekunde nach Power), für Offline-Renderings und für Drum-Klänge, die noch nicht vorberechnet sind (erster Schlag einer neuen Variante).
- **Vergleichsschalter zum Abhören:** `index.html?xenVoiceHost=0` erzwingt den alten Weg.

## Klanggleichheit (gemessen, nicht gehört)
`tests/e2e/voice_host_pcm.cjs` rendert dieselben Ereignisse offline über die alten Knoten und über die Worklets und vergleicht Sample für Sample:
| | Material | Übereinstimmung (Signal zu Rest) | größte Einzelabweichung |
|---|---|---|---|
| Bass | 36 Noten, alle 6 Stimmen, Grit 0/0,3/0,75, Glide, Ghost/Accent, Ton, Resonanz, Sub, Bass-Pitch +37 Cent | **101 dB** | −84 dB unter Spitze |
| Drums | 60 Schläge: Körper, Hi-Hat-Hüllkurve, Abwürgen, Stereo-Samples mit Ein-/Ausblendung und Ton-Tiefpass, Panning, Starts zwischen Samples | **134 dB** | −118 dBFS |

Das ist Float-Rundung. Dafür wurden drei Chromium-Eigenheiten nachgebildet, die Teil des heutigen Klangs sind: (1) im ersten Render-Block eines Oszillators werden die Frequenzwerte um den Startversatz verschoben gelesen (jede Bass-Note beginnt mit einem Splitter von bis zu 2,7 ms der Vorgabefrequenz 440 Hz); (2) liegt die Startzeit einen Hauch nach einer Sample-Grenze, beginnt der Oszillator ein Sample später; (3) nach dem Ende eines Stereo-Samples bricht der Filter-Nachklang an der nächsten Blockgrenze ab, bei Mono klingt er aus. In Firefox, das diese Eigenheiten nicht hat, klingt die neue Fassung deshalb wie Chromium.

Bewusste Abweichung vom alten **Live**-Verhalten: Der alte Code trennte die Knoten einer Sample-Stimme wenige Millisekunden nach ihrem Ende per Ereignis ab und schnitt damit einen Filter-Nachklang hart ab; jetzt klingt er wie im Offline-Rendering aus (Pegel um −60 dB, eher sauberer).

## Wirkung im Spiel (echte App, Schlagzeug + Bass, 20 s, `tests/e2e/voice_host_live.cjs`)
| | alter Weg | neu |
|---|---|---|
| Graph-Änderungen pro Sekunde | 63,6 | **0** |
| erzeugte Audioknoten pro Sekunde | 32 | **0** |
| veraltete Worklet-Uhr in 20 s | 2 bis 3 | **0** |
| Rechenzeit im Audio-Thread (8 s dichte Passage, `tools/slim/voice_cost.cjs`) | 793 ms | **554 ms (−30 %)** |

Die Absicherungen RFL-CLOCK-01 und WORKLET-CLOCK-02 bleiben (sie schützen auch gegen andere Graph-Änderungen); ihre Live-Tests laufen jetzt mit `?xenVoiceHost=0` als absichtlicher Lastquelle.

## Tests
`build.py --check` OK, `run_tests.sh` 119/119, `run_e2e.sh` alle 43 Läufe grün (neu: `voice_host_pcm.cjs`, `voice_host_live.cjs`).

## Offene Risiken
- **Nicht gehört.** Vor allem: Bass mit Glide, Bass-Pitch während gehaltener Noten, offene/geschlossene Hi-Hat, Sample-Lanes mit Ton-Regler, Lane-EQ an/aus während des Spielens.
- Firefox/Safari nicht geprüft (es werden nur Standard-AudioWorklet-Funktionen benutzt).
- Erster Schlag einer neuen Drum-Variante läuft weiter über die alten Knoten (wie bisher, bis der Klang vorberechnet ist).
