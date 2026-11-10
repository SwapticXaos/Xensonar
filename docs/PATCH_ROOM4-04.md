# ROOM4-04: Stabilität (Tempowechsel, Beat-Phase, Ladegrenzen)

Basis: ROOM4-03d (`index.html` vorher 8 676 321 Byte), jetzt 8 677 090 Byte (+769 B). Zone: Tempo = WARM (Raum IV, nur beim Reglerwechsel), Beat-Erkennung = KALT (Import), Laden = KALT. Audio-Graph unverändert.

| Fehler (reproduziert, rot auf Vorgänger) | Korrektur |
|---|---|
| **Tempowechsel während der Wiedergabe:** Die Neustart-Position wurde mit dem *neuen* Tempo auf der *alten* Zeitachse gelesen, die Laufmarke sprang (Test: 16 Beats ergaben 8). | `Engine.update` liest die Beat-Position vor dem Tausch des Projekts und gibt sie als `restartBeat` weiter. |
| **Beat am Dateianfang:** Das Onset-Signal begann bei Frame 1; ein Schlag bei 0 s wurde nie gezählt, die Phase lag um einen Beat daneben (0,5 s statt 0 bei 120 BPM). | Frame 0 gilt als Einsatz (Stille davor), gedeckelt auf den stärksten echten Einsatz. Gemessen: Phase 0 bei 120/100/90 BPM. Die Konfidenz sinkt etwas (z. B. 0,70 → 0,53 bei 90 BPM), bleibt über der Schwelle 0,2. Nicht behoben: 128 BPM mit nicht ganzzahliger Lag-Länge bleibt um einen Beat versetzt. |
| **Stiller Datenverlust beim Laden:** `sanitize` kürzte auf 64 Spuren / 1024 Clips pro Spur und speicherte die gekürzte Fassung. | Grenzen nur noch als Beschädigungsschutz (512 Spuren / 20 000 Clips). Es gibt keine Erstellungsgrenze im UI, die alten Grenzen waren also nur ein Verlustrisiko. |

Test: `tests/room4_04_tempo_and_beat.test.cjs` (3 Tests, in `GREEN_NODE_TESTS.txt`, jetzt 98). Tempo- und Beat-Test sind rot auf dem Vorgänger, grün jetzt. Raum-IV-Proben ohne Fehler.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Proben, nicht der Tempowechsel hörend). Nicht: Abhören, Gerät, USER_ACCEPTED.
Offen: Start/Stop-Retiming beim Tempowechsel ist weiterhin ein Neustart der Stimmen (bewusst unverändert); „Original Speed" nach Tempoänderung (Plan 4) folgt separat.
Rollback: Commit des Vorgängers (ROOM4-03d).
