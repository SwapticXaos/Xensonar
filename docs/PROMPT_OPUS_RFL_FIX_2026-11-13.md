# Startprompt für Opus – Root-Follow-Loop: sporadisches Knacken beheben

Zum Einfügen in eine neue Sitzung (Arbeitszweig dort neu anlegen, Basis siehe unten).

---

Du arbeitest an XenSonar (CLAUDE.md lesen und befolgen: Heiß/Warm/Kalt, kleine Patches, Statusdisziplin, Lieferformat). Antworten auf Deutsch, UI-Texte Englisch.

**Basis:** Zweig `claude/relaxed-bardeen-1xxhhr` (enthält `claude/keen-goldberg-uzk32g` @ 6c84255 = `main` + RFL-SOFT-Fix + Messwerkzeuge). `index.html` sha256 `2562c44bbff993fab2c301bfca0f609b0cba4c1f52e15f095dffd79206ef2c82`. Vor jeder Änderung: `python3 tools/build.py --check` und `./tools/run_tests.sh` (116) grün bestätigen.

**Lies zuerst, in dieser Reihenfolge:**
1. `docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md` – Befund und Fix-Richtungen (§4). Kernaussage: Die sporadischen Klicks im Spielen sind **wiederholte Render-Quanten** (exakte Kopie der vorherigen 128 Frames) am Ausgang des RFL-Erzeugers; Auslöser sind **Knoten-Erzeugung/connect/disconnect auf dem Hauptthread**, im RFL-Spiel ausschließlich pro Drum-Schlag in `src/rhythm/03_live_drum_bodies.js` (`trigger` ≈ Z. 75–90, `retire` ≈ Z. 43–54). Minimal-Repro ohne XenSonar zeigt dasselbe (headless Chromium 153).
2. `docs/HANDOFF_OPUS_RFL_2026-11-13.md` – Gesamtstand, Nutzerziel, was schon behoben ist (Gate-Schluss-Klick via `__f49HoldParam`), was nicht angefasst werden darf (zwei Wiedereintritts-Logiken).
3. `docs/RFL_MESSUNG_2026-11-13.md` §6–7 – Vorgeschichte und Zahlen.

**Aufgabe:**
1. **Baseline** auf der Basis reproduzieren: `python3 tools/build.py --probe`, dann 2× `RFL_STILL=1 RFL_SEC=90 node tools/probes/live_glitch_probe.js dist/XenSonar_PROBE.html --scenarios-file tools/probes/rfl_click_scenarios.js --scenario rflTap --json out.json` (Klicks je Abgriff `resident`/`bus`, Graph-Ops/s). Zusätzlich `node tools/probes/rfl_stale_quantum_minimal.cjs --mode absonly --ops 12 --burst 3` und `--mode none` als Browser-Referenz.
2. **Entscheidung mit Begründung** zwischen §4.1 (Knoten-Churn je Drum-Schlag auf 1 connect reduzieren, dauerhafte Lane-Kette, kein disconnect im ended-Pfad) und §4.2 (gecachte Drum-Bodies in residentem Sampler-Worklet, 0 Graph-Ops). Kleinster wirksamer Schritt zuerst; Big Bang nur mit Zustimmung des Nutzers. Hat-Choke (`openHat.gain`), Pan je Stil, Drum-EQ (`__f52DrumEQBus`), Legacy-Synth-Fallback, Firefox-Pfad und Timing der Schläge müssen unverändert bleiben.
3. **Regressionstest** (auf Parent rot, nach Fix grün): z. B. Zähler der Graph-Ops je Drum-Schlag im Live-Raum und/oder `rflTap`-Klickzahl am `resident`-Abgriff unter Schwelle; PCM-Gleichheit der Drum-Schläge vorher/nachher (gleiches Material, gleiche Zeiten, Pegel ±0,1 dB).
4. **Vorher/nachher-Messung** (mehrere Läufe mitteln): `rflTap` (still + bewegt), `rfl_click_report.js --runs 3`, Graph-Ops/s. Zielwert: wiederholte Quanten/Klicks am RFL-Ausgang deutlich unter Baseline; Kontrolle (Loop aus) unverändert 0.
5. Prüfen, ob der Rest-Klick beim Gate-Schluss (2 in 16 Austritten, `rflAttrib`) dieselbe Ursache hat (beim Stopp entstehen viele Graph-Ops) – nur messen, nicht spekulativ ändern.
6. Lieferung nach CLAUDE.md: Standalone-HTML + ZIP mit byteidentischer `index.html` + SHA-256/Größe/CRC, Patchbericht `docs/PATCH_RFL-....md` mit Zone (HEISS), HTML-Größenzuwachs, Daten-Owner, offenen Risiken, Rollback (Parent-SHA oben). Status ehrlich: BROWSER_CHECKED headless ≠ gehört; Hörtest und Gerätetest (Opera 140 / Chromium 157 Linux, Firefox) offen benennen. Optional: `rfl_stale_quantum_minimal` als kleine Diagnoseseite für das Gerät des Nutzers.

**Nicht tun:** Resident-Kornmathematik (`src/audio/rfl/01_resident_worklet.js`) ändern – offline klickfrei, identisch zum Browser bis auf die wiederholten Quanten; Bus-Fades/Gate-Verzögerung umbauen; Pitch-/EQ-/Pan-Pfad anfassen; den verworfenen Bass-Workshop-Click-Delete/Undo-Patch zurückholen; nur einen E2E-/Probe-Lauf gleichzeitig.
