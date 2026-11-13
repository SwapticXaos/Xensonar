# RFL-GUARD-01 · Root-Follow-Loop: kein Knistern mehr beim Spielen unter Last

Parent: `7b52dba` (`index.html` sha256 `2562c44bbff993fab2c301bfca0f609b0cba4c1f52e15f095dffd79206ef2c82`). Rollback: `7b52dba` bzw. dessen `index.html`.
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/rfl_repeat_guard.cjs`), BROWSER_CHECKED (`tests/e2e/rfl_repeat_guard_live.cjs` und Probe-Messreihen, headless Chromium 153). **Nicht gehört, nicht auf Opera 140 / Chromium 157 / Firefox geprüft, nicht USER_ACCEPTED.**
Zone: **HEISS** (Audio-Thread). HTML-Zuwachs: **+7 617 Bytes** (9 131 746 → 9 139 363). Kein Lazy-Laden: das Modul wird zusammen mit dem residenten RFL-Worklet geladen, also nur, wenn der Root-Follow-Loop spielt.
Daten-Owner: keine Daten, keine Persistenz, keine Migration. Owner des Audiopfads bleibt der residente RFL-Job (`a6` in `src/runtime/instrument/05_timing_and_admission.js`).

## Problem
Während des Spielens knistert der Root-Follow-Loop, vor allem unter Last (Schlagzeug, Bass, Materialspur, schnelle Maus); gepannt sitzt das Knistern auf der Seite des Loops. Ursache (Messung `docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md`): Ändert der Hauptthread den Audio-Graphen (pro Drum-Schlag/Bass-Note werden Knoten erzeugt, verbunden, getrennt), liefert Chromium gelegentlich am Ausgang des RFL-Worklets den **vorherigen 128-Frame-Block ein zweites Mal**. Das ergibt zwei harte Sprünge im Abstand von 2,9 ms. Die Kornmathematik ist korrekt (Offline-Nachrechnung identisch). Bisher fing nichts diesen Abriss ab: alle Glättungen (Korn-Fenster, Root-Glättung, Lautstärke-Rampen) sitzen vor der Stelle, an der er entsteht.

## Fix: Wiederholungswache direkt am RFL-Erzeuger
- Neuer kleiner Worklet `xensonar-rfl-repeat-guard-v1` (`src/audio/rfl/03_repeat_guard_worklet.js`) zwischen dem residenten RFL-Worklet und seinem bisherigen Ziel: `resident → guard → (Gain → Kompressor → RFL-Bus → DC → Pan → Pitch → EQ → Rhythm-Bus)`. Er sitzt dort, weil der doppelte Block nur dort noch **bitgleich** ist: hinter Kompressor/Hochpass (mit innerem Zustand) wäre er nicht mehr erkennbar.
- **Erkennung:** Der Eingangsblock ist in allen Kanälen bitgleich zum vorigen **und** nicht konstant. Echtes Material wiederholt sich nie bitgenau über 128 Samples; Stille und Gleichspannung lösen nichts aus.
- **Überbrückung (was im Moment des Abrisses passiert):** Statt der Kopie spielt die Wache das zuletzt Gehörte weiter: Aus den letzten 512 Samples wählt sie die am besten passende Periode und setzt das Signal periodisch fort. Wert- und Steigungsfehler an der Naht werden über 64 Samples weich ausgeglichen, spätere Perioden wiederholen das bereits korrigierte Signal. Dann blendet sie über 64 Samples (Hann) zurück ins Live-Signal. Hängt die Quelle länger, hält sie die Fortsetzung 4 Blöcke (11,6 ms) und blendet sie über 4 weitere aus (nie erfundener Klang über 23 ms).
- **Ohne Abriss:** bitgleiches Durchreichen, **keine Zusatzlatenz** (Unit-Test), keine Allokation pro Block, keine Nachrichten (nur auf Anfrage ein Zählerbericht).
- **Lebenszyklus:** Das Modul wird in `prepare()` mit dem Resident-Modul geladen (gleiches data:/blob:-Ladeverfahren wie der RFL-Pitch-Worklet), die Wache wird mit dem Resident-Knoten erzeugt und verbunden, `arm()` verbindet die Wache statt des Resident-Knotens mit dem Ziel, `dispose()` trennt beide. Die Wache beendet sich selbst (`process` → false), sobald ihr Eingang weg ist; kein Knoten bleibt zurück. Lädt das Modul nicht, läuft alles wie vorher (Resident direkt ans Ziel).
- Kein Eingriff in Schlagzeug, Bass, Kornplanung, Gate/Wiedereintritt, Pitch/EQ/Pan oder Pegel.

## Belege (Chromium 153 headless, synthetischer 1-Takt-Testloop, Schlagzeug + Bass an, ≈ 63 Graph-Änderungen/s)
| Lauf (je ≈ 96 s) | Aussetzer am Resident-Ausgang | Klicks hinter der Wache | Klicks RFL-Bus | Klicks Master |
|---|---|---|---|---|
| vorher, Cursor still | 19 | – | 13 | 14 |
| vorher, Cursor bewegt | 23 | – | 13 | 10 |
| vorher, schnelle Maus | 9 | – | 7 | 10 |
| **nachher**, still | 10 (alle von der Wache erkannt) | **0** | **0** | **0** |
| **nachher**, bewegt | 12 (alle erkannt) | **0** | **0** | **0** |
| **nachher**, schnelle Maus | 10 (alle erkannt) | **0** | **0** | **0** |
Szenario-Suite `rfl_click_report.js --runs 2` (Kontrolle, Spielen, langsam/sprunghaft raus-rein, Randzittern): **0 Klick-Ereignisse in allen Szenarien** (Stand vor dem Patch, `docs/RFL_MESSUNG_2026-11-13.md` §7: je 1 Ereignis in Spielen/langsam/sprunghaft/Randzittern).
Minimal-Repro ohne XenSonar (`tools/probes/rfl_guard_minimal.cjs`, 30 s, 72 Graph-Ops/s): vorher 20/34/23 Klicks, hinter der Wache 2/0/0. Die 2 Restereignisse waren schon vorher keine exakten Wiederholungen (andere Aussetzerform, im App-Lauf nicht beobachtet).
Tests: `tests/rfl_repeat_guard.cjs` (Node, echter Worklet-Code): bitgleiches Durchreichen; verlorener und verspäteter Block, einfach/doppelt/dreifach, zwei Ereignisse, kurze Perioden (523/1000/2750 Hz), Stereo: keine Wiederholung passiert, kein Klick laut Probe-Detektor; Stille/DC kein Fehlalarm; eingefrorene Quelle blendet auf 0 aus; Prozessor endet ohne Eingang; Verdrahtung und Manifest. `tests/e2e/rfl_repeat_guard_live.cjs` (echte App): Wache im Pfad zwischen Resident und Bus, Graph-Last vorhanden, 0 Klicks hinter der Wache und am Bus; **auf dem Parent rot** (keine Wache). `./tools/run_tests.sh` 117/117, `build.py --check` OK, `./tools/run_e2e.sh` siehe unten.

## Offene Risiken / nicht geprüft
- **Hörtest durch den Nutzer** (Volllast: Materialspur + Bass + Schlagzeug + schnelle Maus, RFL seitlich gepannt) und echtes Gerät (Opera 140 / Chromium 157 Linux, Firefox). Zeigt der Gerätebrowser eine andere Aussetzerform als den bitgleichen Block, greift die Wache dort nicht; dann bitte Diagnose (Probe `rflTap`).
- **Nur der residente Pfad** (Wiedergabe `base`/`fragment`, Standard) ist geschützt. Der alte BufferSource-Kornpfad (Fallback ohne AudioWorklet), Synth-Einträge, Betten und Forge-Send laufen ohne Wache; dort entstehende Wiederholungen sind nicht bitgleich erkennbar.
- Die Ursache selbst (Knoten-Churn je Drum-Schlag/Bass-Note) bleibt; andere Instrumente können denselben Browser-Effekt zeigen (am gehaltenen Loop am hörbarsten). Vorbeugung (dauerhafte Drum-/Bass-Knoten oder residente Sampler) ist ein eigener, größerer Schritt.
- Die Überbrückung erfindet 2,9 ms Klang aus dem Vorherigen. Bei harten Transienten genau im Aussetzer kann ein Anschlag leicht verwischt klingen; das ist viel leiser als der bisherige Doppelsprung, aber nicht gehört.
- Firefox: dieselbe API, nicht getestet.

## Lieferung
`XenSonar_RFL-GUARD-01.html` (= `index.html`) + `XenSonar_RFL-GUARD-01.zip` (enthält nur `index.html`, byteidentisch); SHA-256/Größe/CRC im Commit-Bericht. Netlify-Production nicht veröffentlicht/geprüft.
