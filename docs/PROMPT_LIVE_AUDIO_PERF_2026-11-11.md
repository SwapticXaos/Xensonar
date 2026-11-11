# Startprompt: Live-Raum-Audio ohne Aussetzer (LIVE-GLITCH-FREE-01)

Ausgangsstand (Basis, nicht verändern ohne Patch): Zweig `claude/keen-goldberg-uzk32g` @ `8750399` (THUNDER-HPP01e / NOTECLIP04), `index.html` 8 940 061 B, SHA-256 `099826950cfbb634340ab8f76212bb973dc7ef8e9d20e51be904c7200fc8b2ae`. `build.py --check` OK, `run_tests.sh` 102/102 (Stand 11.11.). Rollback: dieser Commit.

---

## Prompt (zum Einfügen)

Lies zuerst `CLAUDE.md`, `docs/HOT_COLD_CONTRACT.md`, `docs/LIVE_PATH_AUDIT_2026-11-09.md`, `docs/STATUS_2026-11-11.md`, `docs/ARCHITECTURE.md`, `docs/HOTSPOTS.json` und `docs/MIX_AUDIO_BROWSER.json`. Arbeite am bestehenden XenSonar (Quelle = `source-manifest.json` + `src/**` + `styles/**`, `index.html` nur über `python3 tools/build.py`).

### Ziel
Der **Live-Raum** (Main Room, Root Follow, Nodal, Keyboard, Drums, Bass, Myzel, Dub-Echo, Entrophon-Stimmen) muss im Browser **hörbar und aufnehmbar frei von Aussetzern, Knacksern, Klicks, Dropouts und Zeitversatz** laufen. Das gilt für **beides**: das, was aus den Lautsprechern kommt, **und** das, was Recording/Loop-Rec/PCM-Master-Recorder aufzeichnen. Die vorhandenen AudioWorklets sollen konsequent als Rechenort genutzt werden, damit Audioqualität nicht vom Hauptthread (React, Canvas, GC, Storage) abhängt. Das ist ein Qualitätsziel am Instrument, kein Mess-Selbstzweck.

### Vorgehen (Reihenfolge verbindlich)
1. **Zustand fixieren.** Parent-SHA festhalten, `build.py --check` und `run_tests.sh` laufen lassen, Ausgangsmesswerte erfassen.
2. **Glitch-Ursachen reproduzieren und belegen, bevor etwas geändert wird.** Eigene Probe-Skripte (nur in `tools/probes`/Probe-Build, nie in `index.html`), die im Live-Raum unter Last echte Aktionen ausführen (Tasten spielen, Hold-Pattern, Regler ziehen, Raumwechsel, Preset-/Session-Wechsel, Tempo-/Tuning-Änderung, Aufnahme Start/Stop) und dabei **PCM des Master-Ausgangs und der Aufnahme** auf Diskontinuitäten prüfen (Sprünge zwischen Samples, Nullblöcke, Pegel-Dellen, Doppel-/Fehltrigger, Drift Aufnahme vs. Live). Ohne reproduzierten Befund keine Änderung am bewährten Pfad.
3. **Kandidatenliste nach Hot/Cold-Zone** erstellen (HEISS Audio-Thread / HEISS Steuerung / WARM / KALT). Pro Kandidat: Beleg, erwarteter Effekt, Risiko, Test. Dann einzeln und klein patchen (ein Patch = eine Ursache), jeweils Vorher/Nachher-Messung mit demselben Skript.
4. **Standalone-HTML + ZIP** nach Release-Policy (`evidence/XenSonar_HTML_FIRST_RELEASE_POLICY_V1.md`), byteidentisch, SHA-256/Größe/CRC prüfen.

### Zu untersuchende Bereiche (Hypothesen, keine Beweise)
**Audio-Thread / Worklets** (`src/audio/02_rfl_worklet.js`, `src/audio/rfl/01_resident_worklet.js`, `src/audio/04_wave_worklet.js`, `src/audio/entrophon/02_worklet_and_voice_backend.js`, `src/audio/07_governor_and_drums.js`, `src/runtime/instrument/05_timing_and_admission.js`, `src/mix/*`):
- Allokationen/GC in `process()` (bekannt: Spread in `xen-material-phase-v1`), Nachrichten pro Block, `postMessage`-Last, Denormals, Rechenzeit pro 128-Frame-Block gegen Budget (Worst-Case, nicht Mittel), Verhalten bei Polyphonie-Spitzen.
- Stimmenvergabe/Voice-Stealing, Start/Stop-Hüllkurven (harte Kanten = Knackser), Retiming-Grenzen, Crossfades bei Parameter-/Tuning-Sprüngen.
- Wo Audio heute noch als viele einzelne `OscillatorNode`/`GainNode`/Buffer-Source-Knoten pro Anschlag entsteht (gemessen ca. 30 Knoten/s): prüfen, ob eine residente Worklet-Stimme (Pool, vorab angelegt) Knotenaufbau und GC-Druck im Spiel beseitigt. Nur nach PCM-Vergleich vorher/nachher **und** Abhörtest-Protokoll für den Nutzer.
- Last bei Stille und bei Mehrfach-Kontexten (genau ein laufender Live-AudioContext bleibt Vertrag; Offline-Kontexte nur für Rendering).

**Steuerung / Scheduler (HEISS):**
- Drum-/Bass-/Myzel-Scheduler: Lookahead (≥ 0,32 s) und Tickjitter unter Hauptthread-Last (Canvas, React-Render, Storage) messen; Ereignisse sample-genau über `AudioContext.currentTime` planen, nie über `setTimeout`-Zeit.
- `AudioParam`-Automation: Firefox-Konflikte (`setTargetAtTime`/`cancelScheduledValues`/Rampen-Überlappung), identische Wiederholungsautomation vermeiden (Muster H4 aus dem Audit), Ereignisanzahl auf der Zeitleiste im Spielbetrieb zählen.
- Regler → Audio: ≤ 1× pro Frame direkt in den AudioParam, State/Persistenz erst bei ruhiger Hand.

**Hauptthread (WARM), soweit er Audio stört:**
- Canvas-Visuals (Hauptthread ~35 % im Headless-Audit): Gradienten/Text cachen, Sichtbarkeit/`document.hidden`, Auflösung an Anzeigegröße/DPR anpassen, rAF-Schleifen bündeln bzw. nur bei Bedarf laufen lassen. Visuals dürfen Frames verlieren, Audio nie.
- React-Renders im Spiel (Zielwert aus LIVEPATH-02: 0 Commits ohne Eingabe halten), Storage/JSON/IndexedDB im Spiel, Timer-/Observer-Lifecycle (9 MutationObserver, ~330 `setTimeout`, 31 `setInterval`): was läuft, während der Hauptraum spielt?
- Lange Aufgaben (Long Tasks > 50 ms) im Spiel finden und in Idle/Worker verlagern; `PerformanceObserver` nur im Probe-Build.

**Aufnahme (Recording / Loop-Rec / PCM-Master-Recorder, `src/post-oct/gaps/010-main-bundle__15_after_03_pcm_master_recorder.js`):**
- Aufnahmepfad ebenfalls auf Worklet/`SharedArrayBuffer`-Ring statt Hauptthread-Sammeln prüfen; Ring-Überläufe, Chunk-Übergaben, Encode/Zusammenbau erst nach Stopp bzw. im Worker; keine Lücken an Chunk-Grenzen; Sample-Zahl gegen Laufzeit prüfen (Drift).
- Start/Stop während des Spielens darf den Live-Ton nicht verändern.

**Latenz & Kontext:**
- `latencyHint`, Sample-Rate-Wechsel, `AudioContext`-Suspend/Resume (siehe LIVEZONE-02), `outputLatency`/`baseLatency` erfassen und Veränderungen **messen** (CLAUDE.md: veränderte Latenz messen).

### Nicht verhandelbar
- **Kein Big-Bang-Refactor**, kein neuer Audio-Graph ohne PCM-Vorher/Nachher und Abhörtest. Kleinste wirksame Patches, je mit Regressionstest.
- **Kein stilles Kappen** von Polyphonie, Länge, Auflösung, Stimmung, Odd Meters, Polyrhythmen oder Mikrotonalität (Hot/Cold Regel 4). Technische Grenzen sichtbar machen.
- **Retrokompatibilität:** Songs, Presets, EQs, Session-Drafts, Drumbeats, `.xenpack` unverändert; keine Migration ohne spezifische Tests.
- **Messlogik nur in Probe-/Test-Builds**; ausgelieferter Code ohne Messcode (Ausnahme: abschaltbare, standardmäßig inaktive Diagnose). Jeder Patch nennt Zone, Daten-Owner, HTML-Größenzuwachs; Neues lazy.
- **Heiß/Kalt:** Kaltbereiche (Forge, Package Station, Archiv, Export, Diagnose) schlafen, solange der Hauptraum spielt.
- **Verworfen:** der Bass-Workshop-Click-Delete/Undo-Patch bleibt draußen.

### Ehrlichkeit über Messbarkeit
Headless-Chromium hat kein echtes Audiogerät und rendert per Software: Rechenzeit im Audio-Thread, echte Unterläufe (`underrun`), Hardware-/Treiberlatenz und Klang sind dort **nicht abschließend beurteilbar**. Das ausdrücklich so berichten. Wo möglich Ersatz-Evidenz erzeugen: Offline-Rendering desselben Ereignisplans mit Diskontinuitätsanalyse, Block-Zeit-Budget im `OfflineAudioContext`, Worklet-Zähler (Blockzeit max/Überschreitungen) nur im Probe-Build, Hauptthread-Störlast (künstliche Long Tasks) während der Wiedergabe als Stresstest. Danach einen **konkreten Abhörtest-Plan** für den Nutzer (Gerät, Browser Chrome/Firefox, Szenarien, worauf achten) liefern.

### Statusdisziplin
Jeder Befund und jede Änderung wird mit CODE_PRESENT / UNIT_VERIFIED / BROWSER_CHECKED / USER_ACCEPTED / RELEASED unterschieden. Nichts auf „behoben“ stellen, bevor es gehört und bestätigt wurde.

### Abschlussbericht pro Patch
Parent-SHA → Ergebnis-SHA, Größe und Zuwachs, Zone, Daten-Owner, Ursache (mit Beleg), Vorher/Nachher-Messung, Tests (Syntax, Unit, DOM, Browser, PCM, Persistence, negativer Test), offene Risiken, Rollback-Datei/-Commit, Standalone-HTML + ZIP mit identischen Bytes. Kein Netlify-Production-Publish behaupten.

### Erster Arbeitsauftrag
Phase 1 nur **Befund, keine Codeänderung**: Probe-Harness für Live-Raum-PCM (Master + Aufnahme) aufbauen, Ausgangsmessung erfassen, priorisierte Ursachenliste mit Zonen und Patchvorschlägen vorlegen. Dann auf meine Freigabe hin Patch für Patch umsetzen.
