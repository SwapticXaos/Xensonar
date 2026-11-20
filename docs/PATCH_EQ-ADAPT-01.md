# EQ-ADAPT-01 · Adaptiver EQ folgt wirklich der gemalten Linie (Wave Editor, Live Room)

Parent: `75dd04e` (`index.html` 8 331 657 B). Jetzt 8 332 991 B (**+1 334 B**). Zone: WARM (Anzeige/Planer-Steuerung) und KALT (Fit läuft nie im Audio-Thread). Daten-Owner: unverändert `__XenEQ` (`src/quickrack/equalizer/eq-core.js`); keine Persistenzänderung.
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium, Messung am Plan). **Nicht gehört**, nicht von Hand im Wave Editor gemalt. Nicht USER_ACCEPTED.

## Befund
Der adaptive Modus passt Filter frei an die gemalte Kurve an (dünn besetzte Optimierung, `planSteps`). Davor gibt es einen **provisorischen Plan**: ein Filter je gleich breiter Scheibe (`20·ratio^((i+.5)/bands)`) = das starre, gleichmäßige Raster. Er ist als Übergang während einer Geste gedacht. Er blieb aber in drei Fällen stehen:
1. **Wave Editor (Offline-EQ) und jede Quelle ohne laufenden Audio-Besitzer:** die weiße Linie/Marker kamen über `peekPlan` → immer provisorisch, nie der genaue Fit (gemessen: `provisional:true`, der Bake nutzte dagegen den genauen Plan, Anzeige und Ergebnis passten nicht zusammen).
2. **Live-Raum ohne Fit-Worker** (Worker blockiert/fehlgeschlagen, `fitWorkerFailed`): es gab nie einen genauen Fit; der Live-EQ blieb dauerhaft auf dem Raster (gemessen: nach 1,2 s weiter `provisional:true`, 0 wirksame Bänder bei einer schmalen Kurve).
3. **Worker fällt mitten im Fit aus:** der laufende Job ging verloren, bis die Kurve erneut geändert wurde.
Zusatzbeobachtung: das Provisorium mittelt schmale/steile Merkmale weg (12 Scheiben); bis der Fit da ist, bewirkt eine steile Zeichnung fast nichts.

## Fix (`eq-core.js`)
- `peekAutoPlan`: ohne Besitzer und **in Ruhe** (keine Zeichengeste, Kurve nicht im Provisorium) wird der genaue Plan berechnet (einmal je Kurve gecacht, ca. 40 ms, gemessen 37–44 ms). Während einer Geste bleibt der billige Plan (kein Fit pro Zeigerbewegung).
- `localFitWorker`: dieselben `planSteps` in Scheiben (2 ms je 14 ms wie im Worker) auf dem Steuer-Thread, wenn kein Worker möglich ist oder er ausfällt. `startFitWorker` nimmt ihn automatisch.
- `retryOnControlThread`: der gerade laufende Fit wird nach Worker-Ausfall neu eingereiht statt verworfen.
- Der Guard `if(!fitWorkerFailed)` um die Fit-Planung entfällt.
Unverändert: Fit-Algorithmus, Worker-Code, Raster-Modus, Audiograph, gespeicherte EQs.

## Test
`tests/e2e/eq_adaptive_fit.cjs` (auf Parent rot: „offline EQ at rest shows the accurate fit“): Offline-Anzeige = Bake-Plan, mindestens 3 Filter abseits des Gleichrasters, Geste bleibt provisorisch; Live-Raum-Fit kommt mit blockiertem Worker und mit Worker. Grün außerdem: `keyboard_lane_eq`, `psylab_sustain_expression_eq`, `live_gf05_mix_bus_eq_park`. `run_tests.sh` 139/139, `build.py --check` OK. Für die Wave-Editor-Oberfläche des Offline-EQ gibt es keinen bestehenden Browser-Test; geprüft ist die Planerschicht, die er nutzt.

## Offen / Grenzen
- Kosten: bei einer Kurve in Ruhe ein einmaliger Fit von ca. 40 ms auf dem Hauptthread (Offline-Editor/nicht spielende Quelle). Mit dem Fallback ohne Worker laufen Fits im Live-Raum in 2-ms-Scheiben auf dem Hauptthread.
- Das Provisorium selbst (verschmiert schmale Spitzen) ist unverändert; sichtbar nur noch während des Zeichnens.
- Nicht untersucht: ob die Anzahl Bänder (4–24) für sehr steile Kurven genügt; der Fit wählt innerhalb dieser Grenze.

Rollback: `75dd04e`.
