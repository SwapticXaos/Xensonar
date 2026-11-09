# Pitch-Wege in XenSonar: Befund und Messung

Stand 09.11.2026, Basis MATERIAL-LANE-01 (`351f46c0…2c8f`). Keine Produktänderung.
Anlass: Nutzer hört den Pitch der Materialspur „körnig“, schlechter als die Modulation im Root Follow Loop, und vermutet eine Doppelstruktur.

## Es gibt drei Pitch-Wege

| | Weg | Wo | Art | Genutzt von |
|---|---|---|---|---|
| **A** | `__XenTimeStablePitch`, Worklet `xen-lane-time-pitch-v1` (`src/mix/03_quick_menu__before_eq-core.js:253`) | Echtzeit | Zwei rotierende Leseköpfe in einem Verzögerungsring, Fenster 55 ms, Hann-Überblendung, **lineare** Interpolation | **Pitch-Regler der Materialspur** und **Pitch-Regler des Root Follow Loop** (Ausgangsbus, `__XenRootFollowPitch` → `__PanVolume` in `src/mix/01_pan.js`) |
| **B** | Root-Follow-Grain-Worklet (`src/audio/02_rfl_worklet.js`) mit **Granular Manager** („Audio/sample elasticity for Root Follow“: Klangcharakter, Dichteprofil, Loopprofil, Feinabstimmung = Fenster/Schritt/Dichte/Jitter) | Echtzeit | Transportgebundene Grains, lastabhängige Dichte, Strategien für späte Grains; Grain-Lesen mit linearer Interpolation | Root-Follow-Nachführung (Material folgt dem Grundton) |
| **C** | One-Shot-Offline-Renderer `__xenOSQRWorkerCode` (PCMR-04…06) | Offline im Worker | Granular mit **80-Tap-Blackman-Sinc** (polyphasig, bandbegrenzt), Transientenschutz | One-Shot-Fills (Varianten werden bei Bedarf vorgerendert) |

Bass: Synthesizer, verstimmt über AudioParam (nicht betroffen). Der Granular Manager (B) ist vorhanden und steuert weiter das Root-Follow-Grain-Worklet. **Die Pitch-Regler (Material und Root Follow) gehen aber nicht durch B, sondern durch A.**

## Messung A gegen C

Probe: `node tools/probes/pitch_engine_bench.js` (lädt beide Engines aus der gebauten `index.html`, gleiche Testsignale, 48 kHz).
- **Fremdanteil:** Energie außerhalb der erwarteten Teiltöne (±12 Hz) relativ zur Gesamtenergie.
- **Welligkeit:** Variationskoeffizient des RMS in 10-ms-Fenstern, nur am Sinus aussagekräftig. Beim obertonreichen Signal dominieren Schwebungen der Teiltöne.

| Signal | Cent | ideal | **A** Fremdanteil | **C** Fremdanteil | A / C Welligkeit (Sinus) |
|---|---|---|---|---|---|
| Sinus 440 Hz | +200 | −78 dB | −56,7 dB | −50,0 dB | 1,81 % / 0,44 % |
| Sinus | +700 | −87 dB | **−25,5 dB** | **−45,0 dB** | 1,75 % / 0,48 % |
| Sinus | −700 | −93 dB | −32,7 dB | −52,5 dB | 1,76 % / 0,74 % |
| Sinus | +1200 | −76 dB | **−25,5 dB** | **−48,3 dB** | 1,56 % / 0,61 % |
| obertonreich 220 Hz | +700 | −86 dB | −23,6 dB | −38,6 dB | – |
| obertonreich | −700 | −77 dB | −33,7 dB | −49,7 dB | – |
| obertonreich | +1200 | −79 dB | **−17,5 dB** | **−37,3 dB** | – |

**Ergebnis:** Ab mittleren Verschiebungen liegt A 15–20 dB schlechter als C, und die Amplitudenwelligkeit ist etwa dreimal so hoch. Bei +200 Cent ist A beim Fremdanteil etwas besser. Der Höreindruck „körnig“ ist damit messbar bestätigt. Er betrifft auch den Pitch-Regler des Root Follow Loop.

B ist noch nicht gemessen: Das Grain-Worklet braucht sein Plan-Protokoll (Lane-Puffer, Pilot-Pläne). Ein eigener Messplatz-Schritt ist nötig.

## Optionen

1. **B für die Pitch-Regler** (Material und Root Follow): ein Echtzeitweg mit Granular Manager, Körnung manuell einstellbar, konsistent mit Root Follow. Voraussetzung: B zuerst messen. Es liest Grains ebenfalls linear, und pro Materialspur liefe ein Grain-Worklet (CPU).
2. **C nach dem One-Shot-Muster** („kalte Quelle, vorgerenderte Variante“): Während der Regler bewegt wird, A als sofortige Vorschau; wenn die Hand ruht, rendert C die verstimmte Schleife im Worker, und sie wird phasengleich mit Überblendung eingesetzt. Beste gemessene Qualität, im Ruhezustand keine Echtzeit-DSP. Offen: Grenze 30 s im Worker, Zusammenspiel mit dem Phasen-Player (Nudge), Renderzeit langer Loops.
3. **A verbessern** (mehr Leseköpfe, bessere Interpolation): kleinster Eingriff, bleibt aber ein dritter Weg. Entspricht nicht dem Ziel „ein bester Weg“.
