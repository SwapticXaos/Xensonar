# WORKLET-CLOCK-02 · Fortlaufende Worklet-Uhr für Loop-Rec/Take-Recorder und Nodal-Hold-Leser

Parent: `da04af3` (RFL-CLOCK-01; `index.html` sha256 `4fe50e6aa1959870c98ba2013757579fd3a8cbaeb4aacbf8b8f715728f975378`, 9 132 497 Bytes). Rollback: `da04af3`.
Neu: `index.html` sha256 `9057d665a4ea2dc27b3cc9c79e94122f28e8a3ad93546c20432472827ee9130b`, 9133617 Bytes (**+1 120 Bytes**).
Lieferung: `XenSonar_WORKLET-CLOCK-02.html` (= `index.html`) + `XenSonar_WORKLET-CLOCK-02.zip` (sha256 `1d3cecdd0dcbb8c020cae769ad135351e1876d7efef5f9acdb1f111858520b69`, 2680040 Bytes, ein Eintrag `index.html`, CRC32 `0x88da7d82` stimmt, byteidentisch). Netlify-Production nicht veröffentlicht/geprüft.
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/pcm_recorder_stale_clock.cjs`, `tests/nodal_hold_stale_clock.cjs`, beide auf dem Parent rot), BROWSER_CHECKED Recorder (`tests/e2e/pcm_take_stale_clock_live.cjs`, auf dem Parent rot; headless Chromium 153). Nodal-Hold-Leser: nur Unit-Test, nicht im Browser gemessen. **Nicht gehört, nicht USER_ACCEPTED.**
Zone: **HEISS** (je ein `process()`): eine Zuweisung und ein `Math.max` pro Quantum, keine Allokation.
Daten-Owner: Recorder = Live-Raum-Aufnahme (Take, Loop-Rec, Long Session); an Format, Persistenz und vorhandenen Aufnahmen ändert sich nichts.

## Hintergrund
Wie in `docs/PATCH_RFL-CLOCK-01.md` gemessen: Unter Graph-Änderungen des Hauptthreads ruft Chromium `process()` gelegentlich mit **veralteter `currentFrame`** auf (`F, F+128, F+128, F+384`), obwohl die Ein- und Ausgabe das nächste echte Quantum ist. Auf Wunsch des Nutzers (risikoarm, unabhängiger vom Browser) wurden alle Worklets mit `currentFrame` geprüft. Geändert wurde nur dort, wo Ton oder Aufnahme davon abhängen.

## 1 · Loop-Rec/Take-Recorder (`src/audio/03_pcm_master_recorder.js`, `xensonar-master-pcm-v2`)
**Fehler (belegt):** Der Recorder hängt die Samples korrekt fortlaufend an, las die veraltete Uhr aber als „Überlappung 128 / Lücke 128“ und legte zwei Zeitleisten-Ereignisse an. Die Loop-Rec-Projektion (`toTimelinePCM`, Pfad „reconstructed“) setzt die Samples nach diesen Ereignissen zusammen: Ein **echter** Block wurde als Doppel verworfen, an seiner Stelle blieben **128 Samples Stille**, also ein Klick im exportierten Loop.
- Unit (Harness des echten Recorders + Projektion): 4 veraltete Aufrufe → auf dem Parent **512 Samples verloren und 512 Samples Stille** im exportierten Intervall; mit Fix bitgleich zur sauberen Aufnahme, 0 rekonstruiert, 0 verworfen. Eine **echte** Lücke (Quantum fehlt) wird weiterhin gemeldet (`frameGaps 1`, 128 fehlend, im Export als fehlend markiert).
- Echte App (30-s-Take, Schlagzeug + Bass, ≈ 74 Graph-Änderungen/s): Parent **18 falsche Lücken, 1 152 „fehlend“, 1 152 „überlappend“** (12 veraltete Uhr-Aufrufe); Fix **0 / 0 / 0** (8 veraltete Uhr-Aufrufe im selben Lauf).
**Fix:** eigene Aufnahme-Uhr `max(currentFrame, letzter Frame + Quantum)`; Start-/Stopp-Grenzen und Zeitleiste rechnen damit.

## 2 · Nodal-Hold-Leser (`src/nodal/12_surface_runtime.js`, `xen-nodal-hold-pcm-nh01`)
Gate, Gate-Ausblendung, Release-Hüllkurve und Ereigniszeiten werden je Sample aus `currentFrame + i` berechnet, die Leseposition zählt fortlaufend. Bei veralteter Uhr springt die Hüllkurve um einen Block. Unit: auf dem Parent Abweichung 0,31 (in der Gate-Ausblendung), mit Fix bitgleich zur sauberen Uhr. **Fix:** gleiche fortlaufende Uhr pro `process()`. Nachrichten (`release-all`) nutzen weiter `currentFrame`.

## 3 · Geprüft und bewusst nicht geändert
| Worklet | Nutzung von `currentFrame` | Entscheidung |
|---|---|---|
| Entrophon (`entrophon/02_worklet_and_voice_backend.js`) | Zeitleiste, Hold-Leser | **Hat bereits eine eigene Behandlung genau dieses Falls** (`h === -quantum` → „exact quantum repeat“ wird erhalten bzw. umbasiert). Großer Worklet, hohes Risiko → unverändert. |
| Wave-Worklet (`04_wave_worklet.js`) | Bezugspunkt beim Anlegen neuer Stimmen / Hold-Segmente | Stimmen laufen mit eigener Phase; höchstens 2,9 ms Einsatz-Versatz einer gerade startenden Note, kein Doppelblock → unverändert. |
| Nodal-Instrument (`nodal/04_audio_runtime.js`) | über `frameNow` (eine Funktion für alle Instanzen) | Eine eigene Uhr bräuchte eine Prozess-Hülle je Instanz; kein Nutzer- oder Messbefund → unverändert, offen. |
| Stem-Recorder (`036-xen-stem-recorder.js`) | Start/Ende, Zähler `gaps/missing` | Samples fortlaufend, Zähler nur Diagnose, Export nutzt sie nicht → unverändert (Zähler können falsche Lücken melden). |
| Psy Lab, Multitrack, Protected Drums, Transport-Abgriff, Sample-Motion | Startzeitpunkt, Testskript, Zeitstempel | kein Einfluss auf den laufenden Ton → unverändert. |
| EQ-Worklet, Governor, RFL-Pitch | Diagnose-Zähler, Aufwärmphase | kein Einfluss → unverändert. |

## Tests
`./tools/run_tests.sh` 119/119 (neu: `pcm_recorder_stale_clock.cjs`, `nodal_hold_stale_clock.cjs`), `build.py --check` OK, bestehende `merge_pcm2_continuity.cjs` grün, `./tools/run_e2e.sh`: 38 von 39 grün (neu: `tests/e2e/pcm_take_stale_clock_live.cjs`). `grid_drag_selection.cjs` (Hover-Markierung, kein Audio) ist wackelig: im Vergleich je 3 Läufe nach dem Vorgängertest scheitert er auf dem neuen Stand und auf `7b52dba` (vor allen Uhr-Fixes) gleich oft (je 1 von 3); unabhängig von diesem Patch.

## Offene Risiken
- Nicht gehört; Firefox/Opera nicht geprüft.
- Bereits gespeicherte Aufnahmen werden nicht verändert; Takes, die vor dem Patch unter Last aufgenommen wurden, können die beschriebenen 2,9-ms-Lücken im Loop-Rec-Export enthalten (die Roh-PCM ist vollständig; ein erneuter Export aus der Roh-Aufnahme mit korrigierten Zeitleisten-Ereignissen wäre möglich, ist aber nicht gebaut).
- Nodal-Hold-Leser nur per Unit-Test belegt.
