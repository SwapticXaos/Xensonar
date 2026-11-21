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

Rollback: `637df4b`.
