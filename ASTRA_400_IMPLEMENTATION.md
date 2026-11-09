# Xensonar 400 — A1/A2 abgeschlossen, physische Abnahme offen

Stand: 28.09.2026 (Europe/Berlin). Ausgangspunkt: ASTRA_400_LEAN_SOURCE, Astra 399 + Sol S1/S2.
Die Implementierung wurde nach dem zunächst reinen Setup ausdrücklich beauftragt. Keine neue Architekturphase, kein Renderer-Rewrite.

## Ergebnis

A1 definiert den Zeitvertrag zwischen AudioContext und tatsächlich gerenderten Kernel-Frames. A2 reserviert Renderarbeit vor der teuren Klangkonstruktion. Überlast verwirft neue Anschläge, statt sie später nachzuspielen. Der zuletzt identifizierte Spezialpfad enthält keinen Deferred-Slot, keine musikalischen Retry-Timer und keine Wiederbelebung veralteter Fallback-Anschläge mehr.

Die automatisierten A1/A2-Gegenproben sind grün. Das ist noch keine physische Burstfreiheits-Abnahme des gesamten Hauptraums. Der vorherige negative Glissando-Hörbefund wird erst durch einen neuen realen Hörtest abgelöst.

## A1 — Session und Zeit

- Records tragen absolute AudioContext-Frames. Erst am Render-Eingang werden diese auf den tatsächlich fortgeschrittenen Kernel abgebildet.
- READY setzt keinen dauerhaften relativen Zeitursprung. MessagePort und SAB nutzen denselben Vertrag.
- Verspätete Records und alte Epochen werden explizit abgewiesen, ohne Umdatierung auf jetzt.
- Explizites Mute beendet die bisherige Render-Session einschließlich alter Anschläge/Tails. Unmute startet ohne die bisherige dauerhafte Zusatzlatenz.
- Ein regulär suspendierter, eingefrorener AudioContext erhält seine Session. Ein tatsächlicher Sprung der Renderuhr erzwingt eine neue Epoche; es erfolgt kein Catch-up-Rendering.
- Transportannahme/Buffer-Rückgabe, Kernel-Annahme, durchlaufener Renderbeginn und Ende haben getrennte Rückmeldungen. „Renderbeginn“ ist das Durchlaufen des zugesagten Renderfensters, kein zusätzlicher Kernel-Execution-Counter und kein Nachweis hörbarer Ausgabe.

## A2 — Zulassung und letzter Replay-/Fallback-Pfad

- Feste Reservationstabelle für Stimmen, geschätzte Operatorarbeit und zugesagte Lebensdauer. Direct: 128 Einheiten bei 48 kHz; Entrophon: 256. Die Limits skalieren mit der Samplerate. Maximal 16 Record-Vorbereitungen pro Quantum.
- Producer reserviert vor TonePlan/VoiceSpec-Konstruktion. Consumer prüft unabhängig erneut vor Kernel-Submission. Transportkapazität allein gilt nicht als Renderbudget.
- Freigabe erfolgt nach Renderende, Ablehnung oder Session-Fence, nicht nach einem Wallclock-Timer. Suspend gibt keine weiter aktiven Stimmen frei.
- Diskrete Eingänge haben keinen Latest-Value-Slot mehr. Ein ruhiger Dreiklang wird vollständig sofort weitergereicht. Die Kontrollseite begrenzt neue Konstruktionen auf acht Anschläge pro Audioquantum.
- Der Spezialpfad nutzt dieselbe unmittelbare Admission. `fromDeferredSlot` und veraltete Synth-/Sample-Fallback-Anschläge können keinen alten Anschlag neu auslösen. Frische Hold-Anschläge behalten ihre explizite Legacy-Fallback-/Worklet-only-Regel.
- Hold-Zustandsführung bleibt bei ihrem bestehenden Owner: Retargeting, Repeat-Coalescing, Sustain-Latch, Muster und Release wurden nicht in eine Attack-Warteschlange umgebaut. Ein ausgelassener Anschlag beendet keine gehaltene Geste.
- Zwischengespeicherte App-Lanes verwenden aktuelle Emitter- und Policy-Referenzen; React-Neurenderings hinterlassen dort keine alten Routing-Closures.
- C11-Entrophon-Zulassung verwendet keine zusätzliche druckabhängige Klang-/Gain-Ausdünnung. Bereits zugelassene Arbeit wird nicht für neue Anschläge gestohlen.

Die Arbeitseinheiten sind konservative statische Schätzungen, keine hardwareübergreifend gemessene Deadline-Garantie. Ein gemeinsames physisches Budget für den vollständigen Browsergraphen wurde in dieser Phase nicht eingeführt.

## Gegenproben am finalen Stand

| Prüfung | Ergebnis |
| --- | --- |
| A1: SAB/MessagePort, Context-Start 0/193280, Mute 0/20/200 Quanten | PASS: jeweils erster PCM-Onset bei 257 Frames, keine zusätzliche Mute-Latenz |
| A1: Panic, alte Epoche, Mute-Fence, Suspend, Uhrsprung; Entrophon | PASS |
| A2: ruhiger Dreiklang | 3 von 3 sofort; kein zusätzliches Chord-Wartefenster |
| A2: 10.003 Host-Anforderungen, lange zugesagte Stimmen | 8 teure Pläne im Testprofil; kein Timer-Replay; tatsächliches Ende gibt Budget frei |
| A2: tatsächliche Produkt-Submitter, je 10.003 Anfragen und Transport | PASS: Direct/Entrophon vor teurer Konstruktion begrenzt, echte WASM-PCM-Ausgabe, kein Legacy-Aufruf nach C11-Übernahme |
| A2: unabhängige Consumer-Grenze, doppelte Tokens, unterschätzte Reservation | PASS |
| A2: Hold nach Überlast, Tonhöhenupdate, Sustain-Latch, aktueller Puls, Release | PASS; frische Fallback-Regel erhalten, stale Fallback-Replay ausgeschlossen |
| A2: bestehender Entrophon-Tail gegen neue Überlast auf anderer Aux-Route | PASS: 46.000 nicht-null Samples bitidentisch; 3.928 neue Records verworfen |
| S1/S2, Encoder-Lifetime, Direct-/Entrophon-WASM-Smoke, Cutover, OP3, Runtime-Boundary | PASS |
| Hold-Bridge, normale Hold-Pulse, Hold-Segment-Clock | PASS |
| Vollständiges `test-post-master.sh` | PASS, einschließlich C-PCM, 300 Generationen mit echten Threads und localhost-WebSocket/Null-Callback |
| Fokussierte strikte TypeScript-Prüfung | PASS |
| Core-Singlefile-Build | PASS, 1.275 Module |

17 finale Testkommandos bestanden. Die fokussierte TypeScript-Prüfung umfasst die geänderten Audio-/Admission-Grenzen; sie ist keine vollständige Repository-Typprüfung. Testausgaben und Befehle stehen unter `evidence/`, insbesondere `verification-400.json`. Die Tests verwenden den tatsächlichen C11/WASM-Renderer mit modellierten Browseruhren; Produkt-Hooks verwenden eine simulierte React-Lebensdauer und Browsergraph-Hülle.

Ein zusätzlich geprüfter historischer statischer Test, `check-wave-starter-processor-owned-hold-segment-scheduler.mjs`, verlangt sechs bereits im unveränderten Baseline-Commit fehlende Textanker. Dieser Altbefund ist dokumentiert; er wurde nicht durch Abschwächen seiner Prüfungen grün gemacht. Die aktuellen Hold-Verhaltens- und Grenztests bestehen.

## Artefakt und Reproduktion

- `Xensonar_400_HAUPTRAUM_LIVE.html`: finaler Core-Singlefile-Build. C11 ist im Produktionsbuild standardmäßig aktiviert; bestehende explizite Benutzer-Overrides bleiben maßgeblich.
- `Xensonar_400_A1_A2_SOURCE.zip`: Source einschließlich Tests, generiertem Worklet und Produktionskonfiguration; ohne node_modules, Git-Metadaten oder Build-Temporärdateien.
- `A1.patch`, `A2.patch`: getrennte Änderungen relativ zur gelieferten Lean-Baseline bzw. zum A1-Commit.
- `SHA256SUMS.txt`: Prüfsummen der Übergabedateien.

Mit der separat vorhandenen kompatiblen Toolchain im Source-Verzeichnis:

```sh
npm run test:live-instrument
node node_modules/typescript/lib/tsc.js -p tools/audio/tsconfig.live-instrument.json --noEmit --pretty false
bash tools/audio/test-post-master.sh
npm run build:core-singlefile
```

Der Build erstellt das eingebettete Worklet vor dem Core-HTML neu. Die Toolbox bleibt separat. Der lokale Workspace nutzt einen Link auf deren Abhängigkeiten; dieser Link ist nicht Teil der Source-ZIP.

Der im Lean-Pruning fehlende `genesis-kernel/`-Quellordner wurde aus der aktuellen gelieferten 399-S1/S2-Vollsource wiederhergestellt und byteweise verglichen (43 Dateien). Der ausgelieferte WASM-Kernel ist unverändert, SHA-256:
`72603702e6fdcf07b97ff57e76986d6df9d4f1ada97fb41e320186da578b6c82`.
Context-, Lean- und Toolkit-ZIP bestehen die Integritätsprüfung. Die ursprünglichen Archive wurden nicht geändert. Die aktive Source ist durch den danach autorisierten A1/A2-Auftrag geändert.

## Noch offene physische Abnahme

Hier steht kein lauffähiger Chromium-Browser zur Verfügung; Browser-Bootstrap schlug fehl. Deshalb kein vollständiger UI-/Audio-Device-Test und keine neue Aussage „physisch burstfrei“. Container-Callbackzeiten sind kein Ersatz dafür.

Für die reale Abnahme: Beat, Materialspur und Root Follow laufen lassen, kräftige Keyboard-Glissandi sowie Enter-/Klaviatur-Hold mit Sustain und Release spielen, anschließend Mute/Unmute und Suspend/Resume prüfen. Neue Anschläge dürfen unter Last ausfallen; bestehende Musik, Bus/Master und Tails dürfen nicht reißen, und nach Lastende darf nichts nachfeuern. Der bitidentische Aux-Tail-Test beweist nur seinen tatsächlich geprüften PCM-Pfad, nicht bereits den gesamten Live-Mix.

Hier endet A1/A2. Keine A3- oder weitere Architekturphase begonnen.
