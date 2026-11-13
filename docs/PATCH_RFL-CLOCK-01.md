# RFL-CLOCK-01 · Root-Follow-Loop: kein Knistern mehr beim Spielen unter Last

Parent: `7b52dba` (`index.html` sha256 `2562c44bbff993fab2c301bfca0f609b0cba4c1f52e15f095dffd79206ef2c82`, 9 131 746 Bytes). Rollback: `7b52dba` bzw. dessen `index.html`.
Neu: `index.html` sha256 `4fe50e6aa1959870c98ba2013757579fd3a8cbaeb4aacbf8b8f715728f975378`, 9 132 497 Bytes, **HTML-Zuwachs +751 Bytes**.
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/rfl_resident_clock.cjs`, auf dem Parent rot), BROWSER_CHECKED (`tests/e2e/rfl_resident_clock_live.cjs`, auf dem Parent rot; Messreihen unten; headless Chromium 153). **Nicht gehört, nicht auf Opera 140 / Chromium 157 / Firefox geprüft, nicht USER_ACCEPTED.**
Zone: **HEISS** (Audio-Thread, `process()` des residenten RFL-Worklets). Eine Zuweisung und ein `Math.max` pro Render-Quantum, keine Allokation, keine Nachricht.
Daten-Owner: keine Daten, keine Persistenz. Geänderte Quelle: nur `src/audio/rfl/01_resident_worklet.js` (+10 Zeilen).

## Problem
Der Root-Follow-Loop knistert beim Spielen, vor allem unter Last (Schlagzeug, Bass, Materialspur, schnelle Maus); gepannt sitzt das Knistern auf der Seite des Loops.

## Ursache (gemessen, frame-genau)
Ändert der Hauptthread den Audio-Graphen (pro Drum-Schlag bzw. Bass-Note werden Knoten erzeugt, verbunden und getrennt), ruft Chromium `process()` der AudioWorklets gelegentlich mit **veralteter Uhr** auf: `currentFrame` läuft `F, F+128, F+128, F+384`. Ein Aufruf bekommt also die Zeit des vorigen Quantums, der nächste holt um 256 auf. Der residente RFL-Worklet berechnete seinen Block aus `currentFrame`. Dadurch lieferte er einmal **denselben Block doppelt** und übersprang danach einen. Das ergibt zwei harte Sprünge im Abstand von 2,9 ms, also das Knistern.
Belege: alle Worklet-Abgriffe zeigen die Uhrfolge zur selben Zeit; die doppelten Blöcke am Erzeuger fallen genau auf diese Aufrufe; ohne Schlagzeug und Bass tritt keine veraltete Uhr auf (0 in 60 s) und kein Klick. Die Kornmathematik selbst war korrekt (Offline-Nachrechnung identisch). Herleitung: `docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md`.

## Fix
`RawResidentProcessor.renderFrame(n)`: Die Render-Uhr des Worklets läuft nie rückwärts und steht nie still: `frame = max(currentFrame, voriger Frame + vorige Quantum-Länge)`. Bei veralteter Browser-Uhr wird also der **richtige nächste Block** berechnet; holt der Browser auf, stimmen beide Uhren wieder überein. Springt `currentFrame` echt nach vorn, folgt der Worklet wie bisher. Es geht kein Klang verloren und es wird keiner erfunden; die Ausgabe ist bitgleich zur Ausgabe mit sauberer Uhr (Unit-Test).
Nicht geändert: Kornplanung, Programm/Gate/Wiedereintritt, Nachrichtenprotokoll (die `arm`-Prüfung nutzt weiter `currentFrame`), Schlagzeug, Bass, Pitch/EQ/Pan, Pegel.

**Verworfener Zwischenschritt (Commit `f9d4e2a`, nicht ausgeliefert):** eine Wiederholungswache hinter dem Worklet, die doppelte Blöcke erkennt und überbrückt. Sie beseitigte die Klicks ebenfalls (0 am Bus/Master), erfand aber 2,9 ms Klang je Ereignis und brauchte einen zusätzlichen Worklet-Knoten. Mit dem Ursachen-Fix hatte sie nichts mehr zu tun (0 Fälle) und wurde wieder entfernt.

## Belege (Chromium 153 headless, synthetischer 1-Takt-Testloop, Schlagzeug + Bass an, ≈ 63 Graph-Änderungen/s, je ≈ 96 s)
| Lauf | veraltete `currentFrame`-Aufrufe | doppelte Blöcke am Erzeuger | Klicks Erzeuger/Kompressor/Bus/Pan/Pitch | Klicks Master |
|---|---|---|---|---|
| **vorher**, Maus still / bewegt / schnell | (nicht gezählt) | 19 / 23 / 9 | Bus 13 / 13 / 7 | 14 / 10 / 10 |
| **nachher**, Maus still | 10 | **0** | **0** | **0** |
| **nachher**, Maus bewegt | 15 | **0** | **0** | **0** |
| **nachher**, schnelle Maus | 15 | **0** | **0** | **0** |
| nachher, Drums+Bass aus (60 s) | 0 | 0 | 0 | 0 |
Szenario-Suite `rfl_click_report.js --runs 2` (Kontrolle, Spielen, langsam/sprunghaft raus-rein, Randzittern): **0 Klick-Ereignisse in allen Szenarien** (Stand vor dem Patch, `docs/RFL_MESSUNG_2026-11-13.md` §7: je 1 Ereignis in Spielen/langsam/sprunghaft/Randzittern).
Tests:
- `tests/rfl_resident_clock.cjs` (Node, echter Worklet-Prozessor): saubere Uhr gegen Uhr mit veralteten Aufrufen, auch zweimal in Folge → **bitgleiche Ausgabe**, kein doppelter Block; echte Vorwärtssprünge werden befolgt. Auf dem Parent rot (Abweichung 1,18).
- `tests/e2e/rfl_resident_clock_live.cjs` (echte App, 60 s, Drums + Bass): Graph-Last vorhanden, veraltete Uhr beobachtet, 0 doppelte Blöcke, 0 Klicks am Erzeuger und am Bus. Auf dem Parent rot (6 doppelte Blöcke, 4 Bus-Klicks).
- `./tools/run_tests.sh` 117/117, `build.py --check` OK. `./tools/run_e2e.sh`: alle 33 E2E- und 5 Standalone-Browsertests grün. Einmaliger Ausreißer `grid_drag_selection.cjs` (UI-Markierung, kein Audio) im ersten Gesamtlauf, danach 3× einzeln grün und im Lauf davor grün; als wackelnd notiert.
Messwerkzeug: Die Probe-Abgriffe (`rflTap`) führen jetzt ebenfalls eine eigene fortlaufende Uhr und zählen veraltete Aufrufe (`staleFrameCalls`). Vorher stempelten sie mit `currentFrame` und erzeugten bzw. verdeckten dadurch selbst scheinbare Klicks.

## Offene Risiken / nicht geprüft
- **Hörtest durch den Nutzer** (Volllast: Materialspur + Bass + Schlagzeug + schnelle Maus, RFL seitlich gepannt) und echtes Gerät (Opera 140 / Chromium 157 Linux, Firefox). Zeigt der Gerätebrowser eine andere Form (z. B. echte ausgelassene Aufrufe statt veralteter Uhr), wirkt dieser Fix dort nicht vollständig.
- **Andere Worklets rechnen ebenfalls nach `currentFrame`** und können unter Last dasselbe Knistern zeigen: Entrophon (`src/audio/entrophon/02_worklet_and_voice_backend.js`), Wave-Worklet (`src/audio/04_wave_worklet.js`), EQ-Worklet, Psy Lab, Multitrack, Nodal u. a. Dieser Patch ändert nur den Root-Follow-Loop. Am gehaltenen Loop-Material war es am deutlichsten hörbar; für die anderen Instrumente ist derselbe Fix je Worklet möglich, aber nicht gemessen.
- Vorbeugung an der Quelle (keine Knoten-Erzeugung pro Drum-Schlag/Bass-Note) bleibt offen; mit dem Fix ist sie für den RFL nicht mehr nötig.
- Firefox: dieselbe API, nicht getestet.

## Lieferung
`XenSonar_RFL-CLOCK-01.html` (= `index.html`) + `XenSonar_RFL-CLOCK-01.zip` (enthält nur `index.html`, byteidentisch). HTML sha256 `4fe50e6a…5378`, 9 132 497 Bytes; ZIP sha256 `df9770dead39a249dec2496459182ec75f9086ad25fe5a665ac5d34f98a9864a`, 2 679 564 Bytes, ein Eintrag `index.html`, CRC32 `0x2d34aa21` (stimmt), Inhalt byteidentisch. Netlify-Production nicht veröffentlicht/geprüft.
