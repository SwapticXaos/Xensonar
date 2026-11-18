# P2 · Browser-Tests in zwei Klassen, Nahtstellen-Test (18.11.2026)

**Zone:** nur Testinfrastruktur, kein App-Code. `index.html` unverändert.

## Runner `tools/run_e2e.sh`
- **Funktions-Tests** (alle `tests/e2e/*.cjs`, die nicht in `tests/e2e/MEASURE_TESTS.txt` stehen): 3 parallel (`XEN_E2E_JOBS`). Ein Test, der unter Parallellast rot ist, bekommt danach eine ruhige Wiederholung; besteht er dort, wird er als „flaky“ genannt.
- **Mess-Tests** (29 Tests, die Audio-Abgriffe, Pegel, Timing oder Raten beurteilen): einzeln, eine Wiederholung bei Rot, „flaky“ wird genannt.
- **Alt-Tests** (Oktober): wie bisher; der Bericht `docs/UI_VISUAL_RESTORE.json`, den einer davon bei jedem Lauf neu schreibt, wird zurückgesetzt.
- Modi: ohne Argument alles (Gate vor jedem Commit), `--fast` (Funktions- und Alt-Tests), `--measure`; `XEN_E2E_ONLY=<regex>` weiter möglich. Logs je Test in `dist/e2e-logs/`.
- Erster Lauf: 91 grün, 0 rot, 2 flaky, 1575 s. Vorher liefen alle Tests nacheinander, etwa 35 bis 40 min. Die Funktionsphase allein dauert 532 s statt ca. 20 min.

## Zwei wackelige Mess-Tests korrigiert (Testkriterium, kein App-Fehler)
- `bass_drag_livepath`: Der Endwert eines Reglers kommt über die 150-ms-Bündelung an. Der Test verlangte eine Aktualisierung höchstens 20 ms vor dem Loslassen; ob die Bündelung kurz vor oder nach dem Loslassen feuert, hängt von der Last ab. Neues Kriterium: Die letzte Aktualisierung kommt nach der letzten Bewegung (trägt also den Endwert).
- `live_tempo_rfl`: Während des Übergangs ±0,15 statt ±0,12 Schlag. Die Körnung des Root Follow Loops streut einzelne Klicks schon bei ruhigem Tempo um 0,12 bis 0,14; ein Klick lag genau auf der alten Grenze. Tempo nach dem Übergang, Phase und Kein-Neustart bleiben unverändert streng.
- Beide danach je 3/3 grün.

## ROOM-SEAMS-01 (`tests/e2e/room_seams.cjs`, Funktions-Test)
60 Raumwechsel (alle 20 Richtungen, drei Runden) aus einem spielenden Live Room. Vor jedem Verlassen liegt der Fokus auf einem Bedienelement des Raums. Geprüft:
- keine Seitenfehler
- kein Fokus in einem geparkten Raum
- Live Room nach der Rückkehr mit Power und laufender Uhr
- Listener und DOM-Knoten nach erzwungener Garbage Collection über die Runden gleich
- eine Eingabe im Melodic Loop bleibt erhalten

Ergebnis heute: 1451 Listener / 8807 Knoten in allen drei Runden, sonst ohne Befund. Gegenprobe: Auf `5242ef9` (17.11.) findet der Test das damalige Listener-Leck (+8 je Runde).

Bekannt und unverändert: Das Verlassen des Live Rooms schaltet seine Engine aus, bei der Rückkehr wird Power neu gedrückt (so seit mindestens 11.11.).

## Nachtrag: aktive Nahtstellen (Mess-Tests)
- ROOM-SEAMS-02 (`room_seams_recording.cjs`): Eine Aufnahme läuft über einen Raumwechsel. Die Live-Engine bleibt an, solange aufgenommen wird; der Take hat keine Lücke (`frameGaps 0`, `missingFrames 0`) und umfasst auch die Zeit im anderen Raum (6,03 s). Nach „Enough!“ ist er fertig und angezeigt. Das Neuladen fragt danach weiter nach, zu Recht: Der Take liegt nur im Speicher, bis er gesendet oder gespeichert ist.
- ROOM-SEAMS-03 (`room_seams_multitrack.cjs`): Der Mehrspurraum spielt; beim Verlassen verstummt er; zurück steht der Transport auf „▶ Play“ (kein hängendes „Stop“); Play spielt wieder.
- Beide Abläufe waren schon in Ordnung. Die Tests halten sie fest, damit künftige Patches sie nicht unbemerkt brechen.
