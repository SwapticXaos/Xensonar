# LIVE-GF-01…04 · Live-Raum: Audio-Thread entlastet (11.11.2026)

Parent: `8750399` (THUNDER-HPP01e / NOTECLIP04), `index.html` 8 940 061 B, SHA-256 `099826950cfbb634340ab8f76212bb973dc7ef8e9d20e51be904c7200fc8b2ae`.
Ergebnis: `index.html` 8944894 B, SHA-256 `cc278f118014a60e698259003604ffce1833176c1061fc03751a96739d096e2b` (+4833 B, nichts davon lazy: alles Live-Pfad).
Rollback: Parent-Commit `8750399`; jeder Patch ist ein eigener Commit und einzeln rücknehmbar.

Status aller vier Patches: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Headless-Chromium 153). **Nicht** USER_ACCEPTED: Abhören auf echter Hardware steht aus. Nicht geprüft: Firefox, Safari, Netlify.

## Messmethode (neu, nur Test)
| Werkzeug | misst |
|---|---|
| `tools/probes/live_glitch_probe.js` | Renderzeit je Audioblock (Chromium-Trace `webaudio`), Knoten je Block, AudioParam-/Knoten-/Nachrichtenraten, Hauptthread, PCM-Abgriff am Master |
| `tools/probes/live_graph_census.js` | welche Erzeugungsstellen halten die gerade gerenderten Knoten |
| `tools/probes/live_worklet_heap_probe.js` / `live_worklet_cpu_probe.js` | Heap- und CPU-Profil **im** AudioWorklet-Thread |
| `tools/probes/live_ui_stall_probe.js` | Hauptthread-Blockaden typischer Live-Aktionen |
| `tools/probes/live_record_stall_probe.js` | Master-Aufnahme unter Hauptthread-Blockaden, WAV auf Lücken |

Aufruf mit `--http` (wie Netlify). Unter `file://` lädt Chromium keine Blob-Worklets; die App fällt dort auf `data:` zurück.

## Patches
| Patch | Zone | Ursache (belegt) | Änderung | Daten-Owner |
|---|---|---|---|---|
| **GF-01** | HEISS Audio-Thread | Garbage Collection auf dem Audio-Thread: `xensonar-particle-resident-v1` erzeugte pro Block Closures/Iteratoren (~2,3 KB), `xensonar-eq-live-v2` verpackte Doubles pro Sample-Aufruf, `xensonar-c11-host` schrieb pro Block Doubles in Objektfelder | indizierte Schleifen; aufruffreie Blockschleifen im EQ; `Float64Array` für letzte Samples | Worklet-Quelltexte, keine Persistenz |
| **GF-02** | HEISS Steuerung | klassische Drone-Presets: 4 626 `setTargetAtTime`/s, überwiegend mit unveränderten Zielen; zwei Schreiber je Param im selben Bild | `__xenParamTarget`: überspringt nur wirkungsgleiche Wiederholungen, Schreiberreihenfolge bleibt | Drone-Schleifen (`Kwe`, `$we`, `k2e`) |
| **GF-03** | HEISS Knotengraph | Refucktor-Presets (Standard): Legacy-Drone-Stimme (~23 Oszillatoren) rechnete hinter Gate mit Gain 0 | Gate nach Ausblenden vom Drone-Bus trennen, vor Einblenden verbinden | `__xenRefucktorSync` |
| **GF-04** | HEISS Knotengraph | Drone-Drive-Nasskette (WaveShaper 4x, 4 Filter) rechnete bei Drive aus | Kette geparkt erzeugen, nur bei Mix > 0 am Ausgang | `aJ`/`oJ` |

## Messwerte (Headless-Chromium, 4-Kern-VM, 44,1 kHz; Budget je Block 2,902 ms)
| Größe | Parent | jetzt |
|---|---|---|
| Minor-GCs auf dem Audio-Thread, Grundzustand | ~41 in 45 s | 1–2 in 45 s |
| Audio-Thread-Allokation, Grundzustand | 990 KB/s | nicht mehr messbar (< 1 GC in 12 s) |
| Blockzeit Mittel, Drone an, ohne Spiel | 0,448 ms (15,4 %) | 0,385 ms (13,3 %) |
| Blockzeit Mittel / p99, Drone an, Spiel | 0,656 / 1,416 ms | 0,543 / 1,040 ms |
| gerenderte Knoten im Grundzustand | 231 | 177 |
| laufende Oszillatoren im Grundzustand | 35 | 12 |
| AudioParam-Ereignisse/s, klassischer Drone | 4 668 | ~2 140 (Rest ist echtes Vibrato) |
| JS-Anteil Hauptthread, klassischer Drone | 9,6 % | 5,0 % |

Pegel (RMS/Peak am Master-Abgriff) vorher/nachher gleich. Absolutwerte nicht auf andere Rechner übertragen; die Verhältnisse sind die Aussage.

## Geprüft und unauffällig (keine Änderung)
- **Hauptthread-Blockaden** typischer Live-Aktionen (Slots, Tonleiter, Drone-Klang, Session-Wechsel, Regler): längste Blockade 52 ms; der Rhythmus-Scheduler hat ≥ 0,36 s Vorlauf.
- **Master-Aufnahme** (PCM Float32) unter 5 × 300 ms Hauptthread-Blockade: Take vollständig, keine Lücken im WAV; Null-Strecken sind Pausen mit weichem Ein-/Ausklang.
- Worklet-JS im dichten Spiel: 6,3 % der Zeit (WASM-Kernel 3,6 %, EQ 1 %). Der Rest der Last sind native Knoten.

## Tests
`run_tests.sh` 107/107 (neu: `live_gf01_eq_block_identity`, `live_gf01_particle_resident_identity`, `live_gf01_c11_block_fields`, `live_gf02_param_target`, `live_gf04_drive_wet_park`), `run_e2e.sh` alle Läufe grün (neu: `live_gf03_legacy_drone_park`, `live_gf04_drone_drive_park`), `build.py --check` OK.
GF-01 ist bitgleich belegt (PCM, Filterzustand, Zähler gegen Vor-Patch-Fixtures, mit Negativkontrolle).

## Bewusste Abweichungen vom Parent
- GF-02: Ein übersprungener Wiederholungsaufruf lässt den Wert nach 10 Zeitkonstanten exakt auf dem Ziel einrasten; vorher blieb er durch den Neustart pro Bild ~0,01 % davor stehen. Fällt ein Schreiber weg, übernimmt der andere ein Bild (16 ms) später.
- GF-03/04: Beim Wiederverbinden starten Filter der geparkten Kette aus dem Ruhezustand; das Gate bzw. der Nass-Gain steht dabei auf 0.

## Offen (nicht umgesetzt, Reihenfolge nach Nutzen)
1. **Puffergröße wählbar** (`latencyHint` ist fest `interactive`): wirksamstes Mittel gegen Aussetzer auf schwächeren Rechnern, kostet Latenz. Braucht eine Bedienstelle; Entscheidung beim Nutzer.
2. Die vier Mix-Busse rechnen je 3 Filter mit 0 dB, solange Live Mastering aus ist (~7 % der Grundlast).
3. Vier `c11-host`-Worklets rendern auch ohne Stimmen (~12 % der Grundlast); Abschalten im Leerlauf braucht einen Stille-Nachweis im Kernel.
4. Erste Töne nach dem Start laufen im Worklet noch uninterpretiert (JIT-Aufwärmen, einige MB Garbage in den ersten Sekunden).
5. Transient-Drive-Gerät bleibt nach dem Ausschalten verbunden.
6. Canvas-Zeichnen dominiert den Hauptthread (headless per Software gerastert, daher hier nicht bewertbar).
7. Befund ohne Änderung: Frequenz der Manual-JI-Oszillatoren hat zwei Schreiber (Cursor- und Drone-Tonhöhe); wer gewinnt, hängt von der Reihenfolge der Bildschleifen ab.

## Nachtrag: GF-05 und Entscheidung zu den C11-Hosts

| Patch | Zone | Ursache (belegt) | Änderung |
|---|---|---|---|
| **GF-05** | HEISS Knotengraph | Vier Mix-Busse (`$Y`) rechnen je Low-Shelf, Peak und High-Shelf mit 0 dB, solange Live Mastering aus ist: 12 Biquads ohne Wirkung | Kette geparkt erzeugt (Analyser speist den Rollen-Gain direkt, Kette an beiden Enden getrennt); `YY` (Mastering an) verbindet sie vor der ersten Gain-Änderung, `XY` (aus) trennt sie, sobald alle Gains < 0,02 dB sind |

Messung (Grundzustand, A/B im Wechsel, Blockzeit Mittel): 385/345 µs → 305/315 µs (etwa −16 %), Biquads im Render 18 → 6. Offline-Render der geparkten gegen die verbundene 0-dB-Kette: maximale Abweichung 0 (bitgleich). Browser-Test `tests/e2e/live_gf05_mix_bus_eq_park.cjs`: aus → 0 gerendert, an → alle 4 Busse verbunden und Gains bewegen sich, aus → nach Ausblenden wieder geparkt, erneut an → wieder verbunden.

**C11-Hosts (Punkt 3): bewusst nicht umgesetzt.** Messung im Worklet-Thread (Leerlauf): Hosts inkl. WASM-Kernel zusammen ≈ 1,1 % der Wandzeit (~30 µs je Block); der Rest der ~45 µs Ablationsdifferenz ist Chromes Overhead für die 9 Ausgänge je Knoten und ist ohne Änderung des Ausgangslayouts nicht zu holen. Die WASM-Kernel-Uhr (`renderedFrames`, Reservierungen, `rebasePendingEntrophon`) hängt am Rendern jedes Blocks: ein Überspringen im Leerlauf würde die Kernel-Zeit von der Kontext-Zeit trennen und bräuchte einen Rebase beim Aufwachen ohne Quelltext des Kernels und ohne Stille-Nachweis. Gewinn nur im Leerlauf (≈ 6 % der Grundlast), nicht in den Spitzen, in denen Aussetzer entstehen. Verhältnis Risiko zu Nutzen spricht dagegen.
