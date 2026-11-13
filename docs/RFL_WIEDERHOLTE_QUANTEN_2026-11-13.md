# Root-Follow-Loop: sporadische Klicks im Spielen = wiederholte Render-Quanten (RFL-TAP, Stand 2026-11-13)

> **Umgesetzt:** Option §6.3 (Verdecken) als Wiederholungswache direkt am RFL-Erzeuger, siehe `docs/PATCH_RFL-GUARD-01.md`: in der App 0 Klicks hinter der Wache, am Bus und am Master bei Schlagzeug + Bass + schneller Maus (headless, nicht gehört). Vorbeugung (§6.1) bleibt offen.

**Nur Messung, kein Eingriff in `src/` oder `index.html`.** Basis: `claude/keen-goldberg-uzk32g` @ 6c84255 (enthält `main` + RFL-SOFT-Fix), `index.html` sha256 `2562c44b…2c82`, 116/116 Tests grün.
Status aller Aussagen: **BROWSER_CHECKED (headless Chromium 153.0.8010.12, Playwright, synthetischer 1-Takt-Testloop)** – nicht gehört, nicht auf Opera 140 / Chromium 157 / Firefox geprüft.
Folgt auf `docs/RFL_MESSUNG_2026-11-13.md` §7 („weiterhin offen: sporadische Klicks im Spielen, ≈ 1 je 15 s“).

## 1 · Kurzfassung
1. Die sporadischen Klicks entstehen **nicht** im Pfad hinter dem Bus (DC-Guard, Pan, RFL-Pitch-Worklet, EQ) und **nicht** durch Bus-Automation: sie stehen sample-identisch schon am RFL-Bus.
2. Einziger Einspeiser des Busses ist `GainNode ← DynamicsCompressorNode ← GainNode ← GainNode ← AudioWorkletNode "xensonar-raw-resident-v1"` (residenter Korn-Prozessor, `src/audio/rfl/01_resident_worklet.js`). Die Klicks liegen bereits am Worklet-Ausgang (6 ms vor dem Bus = Kompressor-Lookahead).
3. Die Kornmathematik ist **nicht** schuld: Eine Offline-Neuberechnung des Worklet-Kerns mit exakt den aufgezeichneten `load`/`arm`/`state`-Nachrichten ist mit dem Browser-Mitschnitt **bis auf einzelne Quanten identisch** (Abweichung < 1e-3, Lag 0) und klickfrei.
4. **Jedes abweichende Quantum ist eine exakte Kopie des vorherigen Quantums** (128 Frames, Fehler 0). Danach läuft das Signal phasenrichtig weiter. Das ist der Klick: ein Sprung in einen 2,9-ms-Ausschnitt von vorher und wieder zurück.
5. Die Wiederholungen fallen zeitlich mit **Graph-Änderungen vom Hauptthread** zusammen (connect/disconnect/create). Im RFL-Spiel stammen diese **ausschließlich** aus `src/rhythm/03_live_drum_bodies.js` (pro Drum-Schlag 3× connect in `trigger`, 3× disconnect in `retire`).
6. **Ohne XenSonar reproduzierbar:** Minimalseite (Sinus-Worklet → Tap) zeigt 0 Wiederholungen, solange niemand den Graphen ändert, und 4–72 Wiederholungen in 30 s, sobald der Hauptthread *unbeteiligte* Knoten erzeugt/verbindet. Reine AudioParam-Automation: 0. → Browser-Verhalten (Chromium), das XenSonar durch Knoten-Churn je Drum-Schlag auslöst; am gehaltenen Loop-Material hörbar.
7. Auch der **alte BufferSource-Kornpfad** (Fallback, wenn der Resident-Worklet nicht startet) klickt im selben Muster am Kompressor – der Befund ist nicht Worklet-spezifisch.

## 2 · Messungen (alle: `python3 tools/build.py --probe`, Szenario `rflTap`, Cursor still `RFL_STILL=1`, Variante `both`)
### 2.1 Tap-Kette (Klicks je Abgriff, ein Lauf, 60 s, Cursor bewegt)
| Abgriff | Klickzeiten (s) |
|---|---|
| resident (Worklet-Ausgang) | 7.0647 7.1024 15.955 22.9036 26.7987 37.0823 40.5508 41.3925 43.3517 45.5459 46.942 65.1407 |
| comp (Kompressor-Ausgang) | 7.0707 7.1084 22.9096 26.8047 37.0883 40.5568 41.3985 43.3576 45.5519 46.948 65.1467 |
| bus = pan = pitch | 7.0707 7.1084 22.9096 41.3985 43.3576 65.1467 |
Alle Bus-Klicks sind am Worklet-Ausgang vorhanden (+6 ms Lookahead). Weniger Klicks am Bus = gleiche Ereignisse, nach Pegelstufen unter der Detektorschwelle. Sprung am Worklet-Ausgang bis 1,4 (vor Gain/Kompressor).
### 2.2 Cursor still vs. bewegt
Bewegt: 122 `state`-Nachrichten an den Worklet, Klicks ohne Bezug zu Nachrichten. Still: **1** `state`-Nachricht in 60 s, trotzdem 12 Klicks am Worklet-Ausgang. → kein Retargeting-/Nachrichtenproblem.
### 2.3 Offline-Vergleich (`tools/probes/rfl_resident_offline.cjs`, Capture 40 s)
Programm: `mode base`, Loop 2,222 s, `stepSec` 0,04, `windowSec` 0,07, 16 Körner max., `microCutSafety:false`, Quelle 44,1 kHz/88 199 Frames.
- Offline-Render: 5 649 Körner, **0 Klicks**.
- Browser-Mitschnitt gleicher Lauf: 8 Klicks; 13 760 Quanten verglichen, **8 Quanten weichen ab – exakt die 8 Klickstellen**, jeweils **= vorheriges Quantum (Shift −128, Fehler 0)**, danach Lag 0.
### 2.4 Korrelation mit Graph-Änderungen (Ruhe-Variante `RFL_QUIET=1`, 90 s)
38 Graph-Ops/s in Dreierpaketen. 25/25 Klicks haben ≥ 3 Ops innerhalb ±20 ms (bei Zufall ≈ 40 % zu erwarten); ohne Ruhe-Variante 18/19 (Zufall ≈ 57 %). Herkunft (`RFL_SITES=1`, 30 s): 190× je `disconnect` von AudioBufferSource/Gain/StereoPanner in `retire()` (`03_live_drum_bodies.js:47`, ausgelöst von `ended`) und 189× je `connect` Source→Gain→Panner→Bus in `trigger()` (`03_live_drum_bodies.js:82–84`), aufgerufen aus `schedulePattern` (`:153`). Keine anderen Graph-Ops während des RFL-Spiels.
### 2.5 Minimal-Repro ohne XenSonar (`tools/probes/rfl_stale_quantum_minimal.cjs`, 30 s je Lauf)
| Hauptthread-Aktivität | Ops/s | wiederholte Quanten |
|---|---|---|
| keine | – | 0 · 0 · 0 · 0 |
| nur AudioParam-Automation | 36 | 0 · 0 |
| BufferSource erzeugen + `start()`, **nie verbunden** | 36 | 0 · 5 · 4 |
| BufferSource `connect()` an dauerhaften Gain, kein disconnect | 36 | 8 · 9 |
| Gain erzeugen + connect + disconnect | 20 / 36 / 180 | 14 / 8 / 72 |
| Drum-ähnlich: Source→Gain→Sink, disconnect bei `ended` | 36 | 34 |
Hinweis: Im Minimal-Repro bleibt nach einer Wiederholung teils ein Versatz von 128 Frames bestehen; in XenSonar lief das Signal danach mit Lag 0 weiter. Mechanismus im Chromium-Kern **nicht** untersucht (kein Quelltext-Beleg), nur das Verhalten.

### 2.6 Gegenproben: Schlagzeug/Bass aus, schnelle Maus (90 s je Lauf, `RFL_NODRUMS`, `RFL_FAST`)
| Lauf | Graph-Ops/s | Nachrichten an Worklet | Klicks Worklet-Ausgang | Klicks Bus |
|---|---|---|---|---|
| Drums+Bass an, Cursor still | 63 | 1 | 19 | 13 |
| Drums+Bass **aus**, Cursor still (2 Läufe) | **0** | 1 | **0 · 0** | **0 · 0** |
| nur Drums aus, Bass an, still | 25,5 | 1 | 5 | 4 |
| Drums+Bass an, Cursor bewegt | 63 | 183 | 23 | 13 |
| Drums+Bass **aus**, Cursor bewegt | **0** | 183 | **0** | **0** |
| Drums+Bass an, **schnelle Maus** (6×) | 63 | 1158 | 9 (alle ≥3 Ops in ±20 ms) | 7 |
| Drums+Bass **aus**, **schnelle Maus** | **0** | 1158 | **0** | **0** |
→ Ohne Graph-Änderungen ist der Root-Follow-Loop in dieser Umgebung klickfrei, auch bei schneller Maus. Auch der Bass erzeugt Graph-Ops (≈ 25/s), nicht nur das Schlagzeug. **Nicht gemessen:** volle Last mit laufender Materialspur (Nutzerschilderung: Materialspur + Bass + Schlagzeug + schnelle Maus) – erster Messschritt für Opus. Nutzerbeobachtung (gehört, Gerät): Knistern wandert mit dem RFL-Pan auf die gepannte Seite → Quelle RFL-Pfad, deckt sich mit 2.1.

## 3 · Was das bedeutet – und was nicht
- **Belegt (headless Chromium 153):** Klick = wiederholtes Quantum am RFL-Erzeuger; Auslöser = Knoten-Erzeugung/-Verbindung auf dem Hauptthread, im RFL-Spiel nur die Drum-Bodies.
- **Nicht belegt:** dass Opera 140 / Chromium 157 / Firefox dasselbe zeigen; dass die vom Nutzer gehörten sporadischen Klicks dieselben sind (plausibel, Muster „≈ 1 je 10–15 s“ passt); ob dieselbe Ursache den Rest-Klick beim Gate-Schluss (2 in 16 Austritten nach dem RFL-SOFT-Fix) erklärt – beim Stopp passieren ebenfalls viele Graph-Ops (Hypothese).
- Der Effekt ist **global** (jeder Knoten kann betroffen sein), aber am gehaltenen, tonalen Loop-Material am hörbarsten; Drum-Transienten verdecken ihn.

## 4 · Fix-Richtungen für Opus (Vorschlag, nichts davon gebaut)
Zone: **HEISS** (Drum-Scheduler, Audio-Graph). Vorher/nachher PCM mit `rflTap` und Minimal-Repro; Abhörtest durch den Nutzer.
1. **Knoten-Churn je Drum-Schlag abbauen** (kleinster wirksamer Patch zuerst): dauerhafte Kette je Lane/Stil (Gain→Panner→EQ-Bus einmal verbunden), pro Schlag nur `createBufferSource` + `connect` an den dauerhaften Lane-Gain + `start`; kein `disconnect` im `ended`-Pfad (beendete Sources werden ohnehin freigegeben). Laut 2.5 senkt das die Ops von 6 auf 1 je Schlag; wiederholte Quanten sinken, verschwinden aber **nicht** vollständig (`connect`-only: 8–9 / 30 s). Pan/Hat-Choke-Semantik (`openHat.gain`) erhalten.
2. **Drum-One-Shots ohne Graph-Änderung**: gecachte Drum-Bodies (bereits als Puffer vorhanden, `cache`) in einem residenten Sampler-Worklet abspielen, analog zum RFL-Resident – null Graph-Ops pro Schlag. Größerer Eingriff, aber das einzige, was 2.5 zufolge auf 0 kommt. Abwägung: Lazy-Laden, Firefox-Pfad, Legacy-Synth-Fallback (`legacy.trigger`) erzeugt weiterhin Knoten.
3. **Prüfen, ob der Browser des Nutzers das Verhalten zeigt**, bevor groß umgebaut wird: `rfl_stale_quantum_minimal.cjs` als kleine HTML-Diagnoseseite auf dem Gerät (Opera/Chromium 157) laufen lassen.
4. Nicht tun: Resident-Worklet-Kornmathematik ändern (offline klickfrei), Bus-Fades verlängern, Pitch-/EQ-Pfad anfassen – die Messung entlastet diese Stellen.

## 5 · Werkzeuge (nur Test, nie in `index.html`)
- `tools/probes/rfl_click_scenarios.js` → neues Szenario **`rflTap`**: Taps `resident`, `comp`, `bus`, `pan`, `pitch` (sample-genau über `currentFrame`), Graph des Busses aufwärts (`upstream`), BufferSource-Starts, Bus-Automationsaufrufe, Nachrichten an den Resident-Port, Graph-Ops je Klick. Schalter: `RFL_SEC`, `RFL_STILL=1` (Cursor still), `RFL_FAST=1` (schnelle Maus), `RFL_NODRUMS=1|drums` (Drums+Bass bzw. nur Drums deaktivieren), `RFL_QUIET=1`, `RFL_SITES=1` (Aufrufstellen der Graph-Ops), `RFL_CAPTURE=datei.json` (load/arm/state + Resident-PCM für den Offline-Vergleich), `RFL_FRAMECHECK=1` (experimentell, greift derzeit nicht: Modul-Blob entsteht vor dem Hook).
  Aufruf: `RFL_STILL=1 RFL_SEC=60 node tools/probes/live_glitch_probe.js dist/XenSonar_PROBE.html --scenarios-file tools/probes/rfl_click_scenarios.js --scenario rflTap --json out.json` → Zeile `RFL-TAP {...}`.
- `tools/probes/rfl_resident_offline.cjs capture.json [--sec 40]`: rechnet den Resident-Kern aus `src/audio/rfl/01_resident_worklet.js` offline nach (Node, kein Browser), Klickliste + Kornkanten je Klick.
- `tools/probes/rfl_stale_quantum_minimal.cjs [--mode none|param|startonly|absonly|churn|bufsrc] [--ops N --burst K --sec S]`: Browser-Minimal-Repro ohne XenSonar.
- **Fallen:** `addModule`-Umschreiben verschiebt das Timing und lässt die App auf den alten BufferSource-Kornpfad zurückfallen (dann kein `resident`-Tap) – nicht verwenden. Detektor-Schwelle: am Bus erscheinen nur die größeren Ereignisse. Klickzahl schwankt je Lauf; mitteln.

## 6 · Umgang mit dem Abriss (Wunsch des Nutzers: nicht nur *wann* es knistert, sondern *wie* geglättet wird und *was im Moment des Abrisses* passiert)
**Wann kommt der Abriss (gemessen):** in genau dem Render-Quantum, in dem der Hauptthread den Audio-Graphen ändert (Knoten erzeugen/verbinden/trennen). Je mehr solche Änderungen pro Sekunde (Schlagzeug ≈ 38/s, Bass ≈ 25/s, vermutlich Materialspur und weitere Live-Stimmen), desto häufiger; daher „unter Volllast“. Mausbewegung, Tonhöhenwechsel und Nachrichten an den Worklet lösen es in der Messung **nicht** aus.
**Was heute im Moment des Abrisses passiert:** nichts. Die vorhandenen Glättungen sitzen alle *vor* der Stelle, an der der Fehler entsteht, und können ihn nicht sehen: Hann-Fenster je Korn, Root-Glättung (≈ 32 ms je Fenster), Lautstärke-Ziel (18 ms), Gate-Blenden. Der Worklet rechnet korrekt (Offline-Gleichheit); der Browser liefert für 128 Frames den alten Block erneut aus → zwei harte Sprünge (hinein und hinaus), 2,9 ms auseinander = das Knistern. Der alte BufferSource-Pfad verwirft zusätzlich verspätete Körner (`c6`, `late-grain-dropped`) ohne Ersatz; der Resident-Worklet setzt nach verpassten Fenstern auf dem Zeitraster fort, ohne nachzuspielen (`render`, Kommentar „Never replay missed windows“) – beide Fälle traten in den Läufen nicht als Klickursache auf, sind aber unter echter Last nicht gemessen.
**Was man tun kann (Optionen für Opus, Reihenfolge = Empfehlung):**
1. **Verhindern (Ursache):** keine Graph-Änderungen pro Ereignis im heißen Pfad – Schlagzeug *und* Bass (und ggf. Materialspur) auf dauerhafte Knoten bzw. residente Sampler-Worklets umstellen (§4.1/4.2). Laut 2.6 ist das der einzige Weg auf 0.
2. **Erkennen (Probe/Diagnose):** Ein wiederholter Block ist exakt erkennbar (128 Samples = vorheriger Block, bitgleich). Zähler „repeated quanta am RFL-Ausgang“ im Probe-Build bzw. in der Diagnose-ZIP des Nutzers → Gerätebeleg auf Opera/Chromium 157. Nicht in den ausgelieferten Live-Pfad (Heiß/Kalt-Vertrag), außer als nachweislich kostenfreie Zählung.
3. **Verdecken (nur falls 1 nicht reicht oder Fremdquellen bleiben):** kleiner Entknister-Worklet direkt hinter dem RFL-Erzeuger: erkennt den bitgleichen Block und ersetzt ihn durch eine Überblendung (z. B. Vorquantum ausblenden → Folgequantum einblenden). Kostet 1 Quantum Latenz (2,9 ms) für symmetrisches Glätten oder arbeitet ohne Latenz nur einseitig. **Ungeprüft:** ob dieser Knoten selbst von der Wiederholung betroffen ist (dann wirkungslos) – vor jedem Bau im Minimal-Repro prüfen. Kein „sicherer neuer Audio-Graph“ ohne PCM- und Abhörtest (CLAUDE.md).
4. **Nicht:** längere Korn-Fenster, mehr Root-Glättung, längere Blenden oder Drosselung der Maus – das ändert das Instrument und trifft die Ursache nicht.
