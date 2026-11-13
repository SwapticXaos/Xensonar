# Root-Follow-Loop: Knacken / Knistern – Ursachenanalyse und Vorbereitung der Behebung

Stand: 2026-11-13. **Nur Analyse, kein Eingriff in den Audiopfad.** Status der Aussagen: CODE_READ (Quelltext gelesen) bzw. DIAGNOSTIC_READ (Nutzer-Diagnose gelesen). **Kein Befund ist gehört oder per PCM-Aufnahme des Knackens bewiesen.** Hot/Warm/Kalt: der Pfad ist HEISS (Audio-Lebenszyklus), Änderungen nur mit Vorher/Nachher-PCM- und Abhörtest (CLAUDE.md).

## 1 · Meldung
Knackt und knistert „immer noch“: vor allem **beim Verlassen des Spielfelds mit dem Cursor** (auch beim Wiedereintreten), außerdem **sporadisch zwischendurch**.

## 2 · Was die Nutzer-Diagnose (Opera, 2026-11-12) belegt – und was nicht
`rfl_pitch_reentry_d1.json` (351 Ereignisse, Sonde sitzt am Pitch-Knoten des RFL-Busses „nach Pan, vor EQ“, kein PCM, 250-ms-Berichte, Schwellwert 0,32):
- **Der Pitch-Knoten war inaktiv** (`cents = 0`, `wet = 0`: Durchreichen) und zeigt **keine Sprungkandidaten** (338 Berichte, größter Sample-Sprung 0,0036, 0 Kandidaten). **Der Pitch-Worklet ist in dieser Aufnahme nicht der Verursacher.**
- Beim Verlassen (Ereignis 67/68, `inside:false`) liegt der Pegel am Pitch-Knoten bei ≈ 0,004 (Ausklang); der Spitzenwert des Gate-Wechsels selbst ist hier unauffällig. **Das gehörte Knacken ist in dieser Aufnahme nicht abgebildet** (kein Marker gesetzt: `audible_dropout_markers.json` leer). Die Sonde sieht nur diesen einen Knoten; Knacken kann davor, daneben oder dahinter entstehen.
- **Auffällig:** Ein-/Austritte folgen sich **bis auf 150 ms** (Ereignis 350 → 351: `inside:true` bei 121 670 ms, `inside:false` bei 121 820 ms). Das Gate hat **keine Hysterese**.

## 3 · Mechanik des Verlassens (CODE_READ)
1. `onCanvasMouseLeave` → `setPlayfieldCursorInside(false)` (`src/rhythm/02_bass_and_rack.js`) → der Gate-Effekt des RFL-Transports (`src/audio/03_rfl_transport_legacy.js`, `useEffect` über `effectivePlaybackGate`) **schließt sofort**: `Sp(g)` = `__f49StopRFL`. **Keine Hysterese / Verzögerung**; jede Randbewegung öffnet und schließt vollständig (neues Token, neuer Bus, Neuaufbau, `gate-open` startet den Plan neu).
2. `__f49StopRFL` (`src/audio/01_voice_and_rfl_ownership.js`): invalidiert Token, stoppt den Takt, nimmt `gainRef` weg und **blendet nur den Haupt-Bus in 22 ms aus** (`__f49FadeAndRelease`), danach `retire()`: alle aktiven Knoten `stop()` + `disconnect()`, **Betten** (`beds`, Klasse `HV`) und **Sends** (`sends`: Forge-Send, `send.walze.dispose()`, `send.gain.disconnect()`) werden **entsorgt**.
3. `HV.dispose()` (Bett/Walze): `drosseln()` (Zeitkonstante 80 ms) – **dann sofort `source.disconnect()`**, `outputBus.disconnect()` usw. Die 80-ms-Abklingkurve wird nie hörbar; die Quelle wird **hart abgeklemmt**, sobald `retire()` läuft.
4. `__f49FadeAndRelease`: AudioParam-Rampe (`hold` + `linearRampToValueAtTime`, Firefox-sicher) und Fallback-Timer; `release()` läuft auch, wenn der Kontext nicht „running“ ist, oder nach 300 ms Wanddeadline – dann **ohne** abgeschlossene Rampe.
5. Das Verlassen löst gleichzeitig `pointer.flush()` (zuletzt zusammengefasste Zeigerbewegung) aus: ein letzter **Cursor-Sprung** kann das Root-Follow-Ziel (`rootFollowInputTargetHz`) noch einmal verschieben, unmittelbar vor dem Gate-Schluss.

## 4 · Hypothesen, nach Wahrscheinlichkeit und Prüfbarkeit
| # | Hypothese | Evidenz | Wie prüfen (billig zuerst) |
|---|---|---|---|
| H1 | **Parallele Pfade (Bett/Forge-Send/Walze) werden in `retire()` hart abgeklemmt**, während sie noch Pegel führen; die 22-ms-Blende betrifft nur den Haupt-Bus | CODE_READ (§3.2–3.3) | PCM-Tap *nach* dem RFL-Gesamtausgang (nicht nur Pitch-Knoten) beim Gate-Schluss; Sprung > Schwelle am Ende von `retire()`. Ablationsprobe: Sends/Betten ausschalten → Knacken weg? |
| H2 | **Gate ohne Hysterese**: schnelles Aus/Ein am Rand ⇒ Neuaufbau (Token, Bus, Plan, Loop-Phase) mit hartem Neustart statt Weiterlaufen | DIAGNOSTIC_READ (150 ms) + CODE_READ | Zähler Gate-Wechsel/s im Probe-Build; Test: Rand-Wackeln, Anzahl Neustarts und Pegelsprünge; Hysterese 80–150 ms als Hypothese-Test |
| H3 | **Letzter Cursor-Sprung beim Verlassen** (`pointer.flush`) verschiebt Pitch/Root kurz vor dem Fade | CODE_READ, plausibel | Protokoll `rootFollowInputTargetHz` ± 100 ms um das Gate; dieselbe Stelle zeigt, ob ein Hz-Sprung vorausgeht |
| H4 | **Sporadisch:** Körner `late-grain-dropped` bei Hauptthread-Verzögerung (Körner mit `when < currentTime` werden verworfen → Lücken im Überlapp → Amplitudenlöcher) | CODE_READ (`c6`), Telemetrie `late-grain-dropped` existiert | Zähler im Probe-Build (vorhanden), mit Hauptthread-Last (z. B. Zeichnen) korrelieren |
| H5 | **Sporadisch:** Korn wird an der Quellgrenze/Loop-Ende abgeschnitten oder an einer Stelle gestartet, die Nulldurchgang-Suche (`microCutSafety`) nicht findet | CODE_READ (`XP`) | Offline-Test: Plan gegen Puffer rechnen, Kornanfang/-ende gegen Null prüfen |
| H6 | Pitch-Worklet bei aktivem `cents ≠ 0` (Neueintritt) | **in der Diagnose nicht bestätigt** (cents = 0) | Dieselbe Sonde mit aktivem Pitch erneut; nur dann relevant |

Ohne Messung unterscheidet der Quelltext H1 und H2 nicht von H4/H5 – H1+H2 erklären aber genau das Muster „vor allem beim Rausgehen“.

## 5 · Messplan (vor jeder Änderung)
1. Probe-Build mit **PCM-Tap am RFL-Ausgang** (nach Bett/Send, vor Master) + Gate-/Token-Zähler + `late-grain-dropped`; Marker-Taste für „jetzt gehört“ (vorhanden: `audible_dropout_markers`).
2. Reproduktion im Headless-Chromium: Cursor wiederholt aus dem Feld (schnell/langsam, Randwackeln), Loop läuft; Sprünge im Tap detektieren (Schritt > 0,1 oder Spitzenfaktor), Zähler der Gate-Wechsel.
3. Ablation: (a) Sends/Betten aus, (b) Hysterese 120 ms, (c) Betten-Dispose mit Fade; je Variante Sprungzahl.
4. Erst dann Fix + PCM-Vorher/Nachher + Abhörtest durch den Nutzer; Firefox-AudioParam-Konflikte (`hold` vor Rampe) beachten.

## 6 · Fix-Richtung (Vorschlag, noch nicht gebaut)
- Entsorgung von Betten/Sends **mit Fade** vor `disconnect()` (Fortsetzung der Hold-Rampe), statt sofortigem Abklemmen.
- **Hysterese/Abklingzeit** am Gate (Verlassen erst nach ~100–150 ms außerhalb; Wiedereintritt innerhalb dieser Zeit = kein Neustart, Loop läuft weiter) – ändert Bedienverhalten, daher mit Nutzer abstimmen.
- Optional: Cursor-Sprung beim Verlassen nicht mehr ans Root-Follow-Ziel weiterreichen.
- Je Änderung: kleinster Patch, eigener Regressionstest mit PCM-Schwelle, HTML-Zuwachs nennen.

## 7 · Modellempfehlung für die Behebung
- **Messaufbau und Reproduktion (Probe-Tap, Zähler, Headless-Test): Sonnet reicht** – klar umrissene Instrumentierung, viel Routine, gut testbar.
- **Die eigentliche Lebenszyklus-Änderung (Fade-Entsorgung, Gate-Hysterese, Phasenkontinuität beim Wiedereintritt): Opus empfohlen.** Gründe: minifizierter React-Kern, mehrere miteinander verzahnte Besitzer (Token, Bus, Betten, Sends, native Hooks, Janitor), Firefox-AudioParam-Konflikte, hohe Regressionsgefahr im heißen Pfad; hier zahlen sich sorgfältiges Abwägen und Gegenprüfen aus.
- **Fable nur bei Eskalation:** wenn die Messung zeigt, dass die Sprünge **im nativen Kern / Worklet / WASM-Zeitmodell** entstehen (cross-thread, sample-genaue Zeitfragen), oder wenn H1–H3 behoben sind und das sporadische Knistern (H4/H5) bleibt und ein tieferes Umbauen des Körner-Schedulers nötig wird. Für die jetzt erkennbaren Ursachen (H1–H3) ist Fable nicht nötig.
**Empfohlene Reihenfolge:** (1) Sonnet: Messaufbau + Reproduktion + Ablation → harte Zahlen; (2) Opus: Fix nach den Zahlen; (3) Fable nur bei Befund aus (1) bzw. (2), der auf den Kern zeigt.
