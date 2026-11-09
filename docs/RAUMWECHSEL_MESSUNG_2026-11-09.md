# Raumwechsel: Was läuft weiter, wenn man den Raum verlässt?

Stand 09.11.2026, `index.html` SHA-256 `aec64584…5961` (8 560 617 Bytes), keine Produktänderung.
Status: **BROWSER_CHECKED (Headless-Chromium, frisches Profil, ohne Audio-Hardware).** Kein Gerätetest, kein Abhören, keine Messung der Last im Audio-Thread.

Probe: `node tools/probes/room_activity_probe.js [out.json]` (nicht ausgeliefert). Die Probe hängt sich an `setTimeout`/`setInterval`/`requestAnimationFrame`, an `AudioScheduledSourceNode.start` und an jede Verbindung zum Ausgang (Analyser für den RMS-Pegel) und liest dazu die Chromium-Performance-Metriken. Zwei Läufe ergaben übereinstimmende Werte (±2 Prozentpunkte).

## Ergebnis

| Phase | Hauptthread belegt | Script | Timeouts/s | rAF/s (Schleifen) | Source-Starts/s | Ausgang RMS | AudioContext |
|---|---|---|---|---|---|---|---|
| A Start, Live Room, Power aus | 14 % | 0,7 % | 0 | 60 (1) | 0 | – | keiner |
| B Live Room, Power an | 25–28 % | 3,5–4,2 % | 41 | 361 (6) | 4 | 0,15–0,31 | running |
| **C Material Forge (Power war an)** | **2–3 %** | 1 % | **42** | **180 (3)** | **6** | **0,19 (hörbar)** | running |
| **D Nodal Center (Power an)** | **3 %** | 1 % | **42** | **181 (3)** | **7** | **0,20 (hörbar)** | running |
| E zurück im Live Room | 24–25 % | 3,3 % | 42 | 362 (6) | 6 | 0,15 | running |
| F Live Room, Power aus | 16 % | 0,9 % | 0 | 120 (2) | 0 | 0 | **running** |
| **G Forge, Power aus** | 2–4 % | 0,5 % | 0 | **60 (1)** | 0 | 0 | **running** |

## Was das heißt

1. **Die Visuals schlafen bereits.** Beim Verlassen des Live Room fällt der Hauptthread von ca. 25 % auf ca. 3 %. Partikel-Quantisierung (`src/rhythm/04_workspace_and_transport.js`, rAF) und Resonanz-Eingabe (rAF) enden. Forge und Nodal kosten im Leerlauf fast nichts. **Das funktioniert schon.**
2. **Das Audio des Live Room spielt in anderen Räumen weiter, solange Power an ist.** Scheduler-Ticks (~42/s, also das 25-ms-Raster), neue Klangquellen (6–7/s) und hörbarer Pegel bleiben in Forge und Nodal. Ob das gewollt ist (Groove läuft weiter, während man in der Forge Material formt) oder nicht, ist eine **Entscheidung des Nutzers**. Für Raum IV gilt laut Grundsatz: `mehrspur` ⇒ Live schläft.
3. **Drei rAF-Schleifen laufen in fremden Räumen weiter (Power an):**
   - Steuer-Uhr `EY` (`src/runtime/01_instrument_state.js`), Bedingung `shouldRun: ctx.state==="running"`: Live Mastering, Monitor, Audio-Abgriffe.
   - Zwei Drone-Schleifen (`src/audio/entrophon/02_worklet_and_voice_backend.js`). Auch bei einem Pilot-Preset ohne Drone-Arbeit fordern sie mit `requestAnimationFrame` den nächsten Frame an.
4. **Nach „Power aus“ läuft eine Schleife weiter, in jedem Raum, dauerhaft:** Die Steuer-Uhr `EY` hängt am Zustand des AudioContext, nicht an Power. **Der AudioContext bleibt nach Power aus `running`** (er wird nicht suspendiert). Folgen:
   - Hauptthread: 60 rAF/s, gemessen billig (Forge mit Power aus: 2–4 % gesamt).
   - **Audio-Thread: ungeprüft.** Ein laufender Kontext verarbeitet den Knotengraphen (inkl. Worklets) weiter, auch wenn nur Stille herauskommt. Das kostet auf schwachen Geräten Akku und CPU. Im Headless-Browser nicht messbar, muss auf einem Gerät geprüft werden.
5. Die Idle-Overlay-Schleife (`src/post-oct/029-xno-original-cycle-runtime.js`, `schedule()`) läuft nur bei Power aus, sichtbarem Overlay und sichtbarer Seite. Sie schläft korrekt in anderen Räumen.

## Folgerungen für den Modus-Owner (`live` / `mehrspur`)

- Visuals: kein Handlungsbedarf, sie schlafen schon.
- Beim Wechsel nach `mehrspur`: Live-Power aus (vorhandener Pfad) beendet Scheduler, Quellen und Pegel (Phase F). Die Steuer-Uhr `EY` muss in `mehrspur` ohnehin laufen (Master, Monitor), dort ist sie nicht sinnlos.
- Kleine, getrennte Kandidaten (nur auf Wunsch, je mit Vorher/Nachher-Messung durch diese Probe):
  - K1: Drone-rAF nur anfordern, wenn eine Drone tatsächlich aktiv ist (Zone HEISS/Steuerung, klein).
  - K2: AudioContext bei Power aus und ohne anderen Nutzer (Forge-Vorschau, Raum IV) `suspend()`en, bei Bedarf `resume()`. **Vorsicht:** Wiedereintritt, Latenz beim ersten Ton, Firefox-Verhalten und Aufnahme-Owner (`__XenLoopRec`, Long Master) müssen geprüft werden. Keine schnelle Änderung.
- Offene Nutzerfrage: Soll der Live-Groove weiterlaufen, wenn man in Forge oder Nodal wechselt (heutiges Verhalten), oder soll er dort pausieren?
