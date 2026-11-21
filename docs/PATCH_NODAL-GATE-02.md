# NODAL-GATE-02 · Nodal Center: das Tor schließt sich mit eigener Choreografie (Mandala von innen nach außen, Tiefpass abwärts)

Parent: `637df4b` (`index.html` 8 367 387 B). Jetzt 8 3xx KB (siehe Build; + ca. 3 KB). Zone: WARM (Tor-UI, nur CSS-Animation, ein Timer) und HEISS minimal (eine AudioParam-Rampe beim Schließen). Status: CODE_PRESENT, BROWSER_CHECKED (Bildfolge, Filterfrequenz gemessen). **Nicht gehört.**

Wunsch (Nutzer): Das Schließen soll nicht der rückwärts laufende Öffnungsablauf sein. Das Mandala entsteht aus einem Punkt in der Mitte von innen nach außen (erst der Kreis), dann schieben sich die beiden Hälften von links und rechts auf den Kreis zu (mit ihren Halbkreis-Öffnungen noch offen), dann schließt sich das Tor. Dazu der Tiefpass umgekehrt: erst dumpfer, dann verschwindet der Klang.

Vorher: Der Schalter schaltete Mycelium sofort ab (Bühne und Audio weg), danach lief eine 1-Sekunden-Animation der Türen rückwärts, ohne Klang-Übergang.

Jetzt (Zustand `data-nodal-gate=sealing`, 3,8 s, ein Timer, CSS-Animationen):
- 0 bis 1,7 s: Mittelpunkt, daraus der Kreis (Ring mit Runen wächst von einem Punkt auf volle Größe), dann blüht das Zeichen darin von der Mitte nach außen auf.
- 1,45 bis 2,95 s: die beiden Hälften gleiten von den Seiten herein, ihre Halbkreis-Öffnungen (Loch 96 px) bleiben offen, der Kreis bleibt sichtbar; die Installation ist dahinter noch zu sehen.
- 2,95 bis 3,75 s: das Loch in der Mitte schließt sich, das Siegel liegt auf den geschlossenen Türen (Endbild = geschlossenes Tor).
- Klang: `myzelGGateClose` (`src/audio/08_myzel_g_live.js`): Tiefpass gleitet in 3,4 s exponentiell vom jetzigen Wert (offen = Nyquist) auf 180 Hz, Start leicht voraus (nicht auf `currentTime`). Erst am Ende wird Mycelium wirklich abgeschaltet (Klang freigegeben). Gemessen: 22 050 → 14 001 → 5 986 → 2 570 → 964 → 381 → 180 Hz nach 0,3/0,9/1,5/2,2/2,85/3,4 s, dann Phase `closed`, Mycelium aus.
- Verdrahtung (`src/rooms/nodal.js`): `NodalGate` meldet eine Schließfunktion an; `koe` umhüllt beide Schalter (Kopfzeile „Gate Open“ und die Schaltfläche im Werkzeugstreifen): Ist das Tor offen, spielt die Schließung zuerst, danach läuft das echte Abschalten (`finish`). Ein Klick während des Schließens wird verschluckt; mitten im Öffnen oder bei geschlossenem Tor gilt der einfache Schalter wie bisher. Verlassen des Raums, Session-Wechsel usw. schalten weiter sofort ab (unveränderter Pfad mit der kurzen alten Schließanimation).
- `prefers-reduced-motion`: Animation sofort, Klang in 0,4 s.
Der Öffnungsablauf ist unverändert.

Test: `tests/e2e/nodal_gate.cjs` (MEASURE) angepasst: Phase `sealing`, Mycelium bleibt an, Installation sichtbar, Tiefpass gleitet nach unten (unter die Hälfte und unter 5 kHz nach 1,5 s), Hälften auf dem Weg, Klick währenddessen ignoriert, am Ende `closed`, Mycelium aus, Hälften zu, still. Grün. Die anderen Nodal-Tests nutzen das Tor nur zum Öffnen.
Nicht geprüft: PCM-Vergleich des Abwärts-Sweeps (nur die Frequenz-Rampe gemessen), Hören des Übergangs.

## Nacharbeit (Nutzerrückmeldung: Mandala muss aus der Mitte wachsen, Klang muss mit dem Schließen zusammenlaufen)
- **Mandala:** Statt das ganze Zeichen als Gruppe zu skalieren, wächst jetzt **jedes Teil einzeln aus der Mitte an seinen Platz** (`--bx/--by`: Startpunkt = Mitte, `--bd`: Verzögerung nach Abstand): zuerst die Blütenblätter (ab 0,6 s), dann die inneren Kreise, zuletzt Dreiecke und Punkte am Rand (bis etwa 2,2 s). Der Kreis (Ring) entsteht wie vorher aus einem Punkt. Bildfolge bei 0,35 / 0,7 / 1,05 / 1,4 / 1,9 s gesehen.
- **Klang:** Die Filterkurve liegt jetzt auf der Tür-Bewegung: 0 bis 0,5 s fast nichts, bis 1,5 s von 9 kHz auf 2,6 kHz, bis 2,5 s (die Hälften gleiten ein) auf 650 Hz, bis 3,2 s auf 230 Hz, dazu **fadet der Pegel ab 2,7 s auf 0 und ist exakt weg, wenn sich die Mitte schließt (3,7 s)**; die Abschaltung von Mycelium folgt bei 3,8 s, es gibt keinen abrupten Schnitt mehr. Dafür ein zusätzlicher Verstärkungsknoten (`gateGain`, Faktor 1) hinter dem Tiefpass. **PCM-Vergleich Offline (Chromium, 2 s Rauschen+Sinus, 48 kHz): Maximalabweichung mit und ohne den Knoten = 0.** Gemessen (1 s = Zeit nach Klick): Tiefpass 11,6 kHz / 6,9 kHz / 4,5 kHz / 2,9 kHz / 1,5 kHz / 561 Hz / 211 Hz bei 0,35 / 0,7 / 1,05 / 1,4 / 1,9 / 2,6 / 3,3 s; Pegel 1,0 bis 2,6 s, 0,40 bei 3,3 s, 0,00 bei 3,65 s.
- Test `tests/e2e/nodal_gate.cjs` ergänzt um die Prüfung „nahe am Ende dumpf (unter 500 Hz) und im Ausblenden“, grün.

Rollback: `637df4b`.

## NODAL-GATE-03: Glitch beim Zumachen während des Öffnens

- Auslöser: "Gate Open" wird gedrückt, solange das Tor noch aufgeht (Phase `turning` nach dem Start des Klangs oder `opening`). Neue Phase `glitch`, 2,4 s (`NODAL_GATE_GLITCH_MS`), danach `closed` und Mycelium aus.
- Bild (nur CSS, harte `steps(1)`-Sprünge): Mittelöffnung und beide Türhälften springen unabhängig voneinander, Siegel flackert mit Farbversatz/Schräglage/Blitz, Licht blitzt; ab ca. 2,0 s ist alles zu. Zeiten stehen am Ende von `styles/areas/026_nodal-sound-designer-style.css`.
- Klang: `myzelGGateGlitch` (src/audio/08_myzel_g_live.js), feste Tabellen `__myzelGlitchLp` (Tiefpass springt zwischen 180 Hz und 9 kHz) und `__myzelGlitchGaps` (Pegel-Aussetzer mit 5-ms-Kanten), am Ende dumpf und Pegel auf 0. Kein Zufall, also abstimm- und testbar.
- Zone: WARM (CSS + eine Handvoll AudioParam-Ereignisse, keine Per-Frame-Arbeit). Reduced-Motion: 0,4 s.
- Test: `tests/e2e/nodal_gate.cjs` Abschnitt 4 (Phase, Tiefpass springt ≥ 6 Stufen, Pegel stottert, am Ende zu, still). Gehört: nicht.
