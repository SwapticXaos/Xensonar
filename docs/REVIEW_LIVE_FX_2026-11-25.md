# Review: die abgeschalteten Effektgeräte des Live Rooms — was taugt, wohin damit (25.11.2026)

Quelle: Klartext-Quellen im Nur-Lese-Zweig `reference/ts-400.2` (`src/features/resonance/*`), abgeglichen mit dem minifizierten Ist-Stand (`src/runtime/01_instrument_state.js`, `…/02_observation_and_sample_storage.js`, `src/app/forge/01_room_shell.js`).
**Nur Code gelesen, nichts gehört.** Klangurteile sind Erwartungen aus der Signalkette, keine Hörbefunde.

## Bestand

| Gerät (Code-Name) | Was es ist | Knoten je Instanz | Steuerung | Live-Kosten (Ursache der Knackser) |
|---|---|---|---|---|
| **Collective Memory** (`collectiveMemoryEffect.ts`, `VY`) | Je Quelle (Drone, Partikel, Wave Starter, Mycelium) eine Kette: HP → BP → Shelves → TP → Waveshaper (4× OS) → 2 harmonische Peaks → Dry + moduliertes Feedback-Delay + Kammfilter. ~25 Parameter folgen einem „Gedächtnis“ des Mixes (Helligkeit, Dichte, **Grundton, Intervallspannung**, Peaks auf 3/2, 5/4, 7/4, 11/8 …) | 27 (×4 = 108) | FFT-Analyse im Hauptthread + ~25 `setTargetAtTime` je Update und Instanz | hoch: Analyse im UI-Thread, 4 Oversampler, Delay-Zeit-Modulation per LFO (Tonhöhen-Wackeln, Zipper beim Springen der Delay-Zeit) |
| **Psychedelic Spiral** (`psychedelicSpiralDevice.ts`) | Wavefolder (4× OS) → 2× 4-stufiger Allpass-Phaser mit 3 LFOs → Stereo-Ping-Pong-Delay mit Filtern in der Schleife → Shimmer-Delay → Kompressor, Präsenz, Soft-Clip | 60 | feste Optionen (drive, color, motion, feedback, bloom, mix, width) | mittel-hoch: 60 Knoten und 3 Oszillatoren laufen auch bei Mix 0 |
| **Schwarmdeuter / Swarm Interpreter** (`schwarmdeuter/*`) | Liest **Partikelzustände** (Dichte, Kollisionen, Kohärenz, Schwerpunkt), nicht Audio; steuert eine Resonatorbank mit 6 **Materialprofilen** (glass, metal, resin, fungus, dust, plasma: Q, Spreizung, Shimmer, Rückkopplung) | 28 | Partikel-Analyse je Frame | mittel; **ohne Partikel hat er keine Eingabe** |
| **Enter-Hold Psy FX** (`enterHoldPsyFx.ts`) | Tempo-gekoppelter Phaser/Flicker für Wave- und Bass-Eingang, an die Enter-Hold-Geste gebunden | 26 | Geste, BPM | mittel |
| **Transient Drive** (`transientDriveDevice.ts`) | Asymmetrische Verzerrung mit straffem Hochpass, Ton, Präsenz; Parameter an Mycelium/„Body“ gekoppelt | 11 | Body-Werte | gering |
| **Live Mastering** (`liveMastering.ts`) | 4 Rollen-Busse (main, drone, rhythm, space) mit RMS-Analyse im Hauptthread, Auto-Trim, Low/Mid/High je Bus, Glue-Kompressor | 9 + 4 Analyser | RMS-Messung | gering-mittel; GF-05: 12 Biquads mit 0 dB auch im Aus-Zustand |
| Myzel Post-FX Router | Routing, kein eigener Effekt | 12 | – | – |

## Qualitätsbewertung

- **Collective Memory — Idee stark, Umsetzung Live-ungeeignet.** Der Kern (Resonanzen auf harmonischen Verhältnissen zum erkannten Grundton) ist eigenständig und passt genau zu XenSonar. Schwach: Analyse und Klangsteuerung sind verwoben, viele unbegründete Konstanten, nicht testbar, nicht deterministisch. **Offline wird die Idee besser als live:** Die „Erinnerung“ lässt sich vorab aus der ganzen Auswahl berechnen, statt Sekunde für Sekunde zu raten.
- **Psychedelic Spiral — solide, aber generisch.** Phaser, Delay und Verzerrung gibt es im Wave Editor schon einzeln. Neu wären nur der **Wavefolder** und die Kombination als Charakter-Kette. Die neuere „Spiral“ im Psy Lab (Frequenzschieber-Echo, Barber Pole) ist das eigenständigere Konzept.
- **Schwarmdeuter — die Materialprofile sind das Wertvolle, der Schwarm-Teil nicht übertragbar.** Ohne Partikel fehlt die Steuerung. Die 6 Materialresonatoren lassen sich aber aus Audiomerkmalen steuern (Anschlagdichte, Helligkeit) und werden so ein eigenständiger „Material-Resonator“.
- **Enter-Hold Psy FX — geringer Mehrwert** außerhalb der Live-Geste; Phaser + Tremolo mit Tempobezug decken es ab.
- **Transient Drive — geringer Mehrwert;** die asymmetrische Kennlinie wäre höchstens eine zusätzliche Kurvenform der vorhandenen Verzerrer.
- **Live Mastering — für Live gebaut.** Die Ideen „Glue“ und „Air“ gehören aber genau in einen **Master-Kanal des Multitracks**, den es noch nicht gibt (dort greift ein Limiter bisher nur beim Export mit Lautheitsziel).

## Wohin (Architektur)

- **Wave Editor:** rechnet offline im Worker, deterministisch, mit Automation und Undo (`015c-xen-wave-dsp-w01.js`, Register mit Parametern). Neue Effekte gehören dort als **reiner JS-DSP** hinein, nicht als Web-Audio-Knotengraph. Vorteil: exakt reproduzierbar, testbar (Null-Test, kein NaN, Pegel), keine Live-Kosten.
- **Multitrack:** spielt über Web Audio und exportiert über `OfflineAudioContext` mit **demselben** Graphen (`buildTrackFx`). Web-Audio-Geräte klingen dort beim Abhören und im Export gleich. Der Live Room schläft, solange der Multitrack offen ist; die Kosten, die im Live Room Knackser machten, sind hier kein Hotspot.
- **Kein doppelter Bau:** Clip-Effekte im Multitrack laufen schon heute über den Wave-Editor-Rundweg („Open in WAV Editor…“). Offline-Effekte im Wave Editor stehen damit automatisch auch für Multitrack-Clips bereit. Im Multitrack selbst braucht es nur, was über alle Spuren wirkt: **Master-Kanal** und **Send-Effekte**.

## Modernisierungsregeln (für alles, was übernommen wird)

1. Analyse von Klangverarbeitung trennen: erst Steuerkurven berechnen (offline, vorab), dann anwenden.
2. Oversampling nur an der nichtlinearen Stufe; Parameter geglättet; keine Delay-Zeit-Sprünge.
3. Aus = null Kosten (getrennt, nicht „Mix 0“).
4. Jede Stufe mit Test: Bypass bitgleich, keine NaN/Inf, Pegel und Länge erhalten, deterministisch.
5. XenSonar-Bezug ausspielen: Resonanzen auf das **aktive Stimmungsraster** (Tonlinien, JI-Verhältnisse) statt auf 12-EDO.

## Vorschlag in Schritten

| Schritt | Was | Woher | Wo | Aufwand |
|---|---|---|---|---|
| 1 | **Master-Kanal im Multitrack:** Glue-Kompressor, Air-Shelf, Sicherheits-Limiter, gilt für Abhören **und** Export | Idee aus Live Mastering, neu gebaut | Multitrack (Web Audio, `OfflineAudioContext`) | klein |
| 2 | **Harmonic Memory / Tuning Resonator:** Grundton und Spannung der Auswahl offline analysieren; Resonanzen auf JI-Verhältnisse **oder auf die Tonlinien des aktiven Rasters**; Stärke, Q, Ausklang | Collective Memory (Kern), Audio-Analyse des Wave Editors (015b) | Wave Editor (DSP-Register) → auch Multitrack-Clips | mittel |
| 3 | **Material-Resonator:** die 6 Materialprofile als Resonatorbank, gesteuert von Anschlagdichte und Helligkeit des Audios | Schwarmdeuter `materials.ts` | Wave Editor | mittel |
| 4 | **Wavefolder** als neue Verzerrerform; **Spiral** als dritter Send im Multitrack (neben Hall und Echo), ggf. auf Basis der Psy-Lab-Spiral | Psychedelic Spiral / Psy Lab | Wave Editor bzw. Multitrack-Send | klein-mittel |
| – | Enter-Hold Psy FX, Transient Drive, Live-Mastering-Analyse: nicht übernehmen; im Live Room wie bisher aus | – | – | – |

Vor Schritt 2–4 sinnvoll: kurze **Hörproben** (offline gerenderte A/B-WAVs je Gerät auf einem Beispiel-Loop), damit die Klangentscheidung auf Hören statt auf Code-Lesen beruht.

## Umsetzungsstand (selber Tag)
Leitlinie vom Nutzer: Es geht um eine **breite Palette** eigenständiger Klangwerkzeuge, die in Kombination Neues ergeben. Geschmackstests an einem Beispielloop entscheiden nichts; Kriterium ist eigener Charakter statt Gleichförmigkeit (kein Rauschen, kein Sinus). Daher weite Regelbereiche, frei kombinierbar in der Effektkette, automatisierbar.

| Schritt | Stand | Wo |
|---|---|---|
| 1 Master-Kanal Multitrack (Glue, Tape, Air, Limit) | **umgesetzt** (MT-MASTER-01) | `032`, Knopf „Master FX“ |
| 2 Tuning Resonator · Harmonic Memory | **umgesetzt** | Wave Editor, Kategorie „Resonance & Material“ |
| 3 Material Resonator · Swarm Materials | **umgesetzt** | Wave Editor, Kategorie „Resonance & Material“ |
| 4a Wavefolder · Spiral Fold | **umgesetzt** | Wave Editor, Kategorie „Distortion & Amp“ |
| 4b Spiral als dritter Send im Multitrack | **umgesetzt** (MT-SPIRAL-01) | `032`, Spur-Effektfeld: „Spiral“ + Fold/Color/Motion/Regen |

- **Tuning Resonator:** bis zu 96 Resonatoren (RBJ-Bandpass, Q aus der Nachklingzeit) auf einer Tonmenge: Obertöne, JI 5-limit, JI 7-limit, EDO (5–72 Stufen), Bohlen–Pierce (13 Stufen pro 3:1). Der Grundton wird aus dem Audio der Auswahl gefunden (gemitteltes Spektrum, harmonische Summe 40–500 Hz) oder eingetippt. Memory 0,05–12 s (automatisierbar), Stereo-Verstimmung, Excite (tanh). Die Resonanz wird auf den Pegel des Eingangs abgeglichen (≤ +30 dB).
- **Material Resonator:** die vier Pfade des Schwarmdeuters (Harz-Resonanz, Riss, Braid-Kreuzecho, Unterstrom) mit den 6 Originalprofilen. Statt Partikeln steuern Hüllkurve (Druck), Anstieg (Bruch) und Nulldurchgangshelligkeit des Audios; „Follow“ mischt zwischen fester und vom Audio gesteuerter Bewegung.
- **Wavefolder:** Sinus-↔-Dreiecks-Faltung, Symmetrie (gerade Obertöne), 4× Oversampling, DC-Filter.
- Alle drei: Wet 0 = bitgleich übersprungen; Ausklang über `tailFrames`; deterministisch; laufen auch in der seriellen Kette mit Ausklang-Spur; Multitrack-Clips erreichen sie über „Open in WAV Editor…“.
- Tests: `tests/wave_fx_palette.test.cjs` (7/7, in `GREEN_NODE_TESTS.txt`): Register, Neutralität, Grundtonerkennung ≈ 110 Hz, endliche Werte, Pegel, jede Tonmenge und jedes Material **klingt anders** (Palette), Determinismus, Wavefolder-Obertöne. `tests/e2e/wave_fx_palette.cjs`: alle drei unter „Add effect“, Apply / Bake ändert das Audio, Undo. Regression grün: `mtw03_wave_pitch_time`, `wave_golden_vertical`, `snap_all_wave_editor`.
- Nicht gehört.

## MT-SPIRAL-01 (26.11.)
- `buildSpiralBus` (`032`): gemeinsamer Send-Bus pro Projekt, 100 % nass. Wavefolder (4× OS, Einheitsverstärkung für kleine Signale) → je Kanal ein 4-stufiger Allpass-Phaser, gefegt von einem langsamen LFO → Stereo-Delays 0,23 / 0,31 s mit Kreuz-Rückkopplung (Hoch- und Tiefpass in der Schleife), deren Zeiten ein Drift-LFO atmen lässt → Kompressor → Tiefpass. Derselbe Aufbau beim Abhören und im Mixdown.
- Pro Spur: Send „Spiral“ (0 = kein Knoten, Kette unverändert). Pro Projekt (`master.spiral`): Fold, Color, Motion, Regen. „Regen“ statt „Feedback“, weil das Echo im selben Feld schon „Feedback“ heißt.
- Ausklang im Export: aus Regen und Delayzeit berechnet (`fxTailSec`).
- Beim Test gefunden und behoben: Der erste Entwurf war viel zu heiß (Spitze 0,25 → 1,195 bei Send 60 %), weil die Faltkennlinie leise Signale etwa 3,7-fach verstärkte und der Web-Audio-Kompressor zusätzlich aufholte. Jetzt 0,25 → 0,41.
- Test: `tests/e2e/mt_spiral_send.cjs`. Send ändert Klang und Ausklang (162 400 → 290 560 Frames); andere Einstellungen ergeben eine andere Farbe; kein Pegelausbruch; Send 0 = bitgleich; Effektfeld zeigt Spiral/Fold/Color/Motion/Regen; Abspielen ohne Fehler. Regression grün: `mt_master_strip`, `mtw01_delivery`, `mtw02_fades_meters`, `mt_end_and_navseek`, `room_seams_multitrack`.
