# ROOM4-15: Synthetischer Plan für Drum- und Bass-Clips

Basis: ROOM4-14 (`index.html` 8 884 383 B), jetzt 8 888 945 B (+4 562 B, im lazy geladenen Raum-IV-Chunk, dazu wenige Zeilen im Audition-Modul). Zone: KALT (Rendern im Hintergrund, nur nach einer Änderung in Ruhe). Der Hauptraum bleibt unberührt.

## Idee
Ein Clip aus einem Drum- oder Bass-Pattern (`+ Drums …` / `+ Bass …`) merkt sich seine Quelle. Mit **Warp „Pattern (synthetic)“** wird beim Tempowechsel und beim Stauchen/Zerren **nicht das Audio gestreckt**, sondern das Pattern von **seiner eigenen Engine neu gespielt**, mit dem Tempo, das der Clip braucht (Projekttempo geteilt durch den Stauchfaktor). Eine Snare bleibt eine Snare, wie im Hauptraum.

## Bedienung
- Neue Pattern-Clips starten im Modus **Pattern** (Marke `♬` am Clip). Zerren an der unteren Hälfte der Clip-Kante oder Tempoänderung rendert das Pattern im Hintergrund neu; bis es fertig ist (oder wenn die Engine es nicht rendern kann), spielt die aufgenommene Audiodatei per Tape, der Inspektor sagt „rendering the pattern …“ bzw. nennt den Fehler.
- Im Inspektor `Warp`: **Tape**, **Granular (keep pitch)**, **Pattern (synthetic, drum/bass engine)**. Rechtsklick auf den Clip: „Warp: pattern (play it again at the new tempo)“ bzw. zurück zu Tape. „Reset warp“ stellt Stretch 1, Pitch 0 und Richtung wieder her und bleibt bei Pattern.
- Die obere Hälfte der Kante klont/loopt wie bisher (Ziellogik oben, Stauchen unten).
- Pitch (Cent, Clip oder Spur), Reverse, EQ, Effekte, Automation, Bounce und Export wirken auf dem Pattern wie auf jedem Clip.

## Technik
- Daten additiv: `clip.synth = {kind:'drum'|'bass', id, name}` und `warp:'synth'` (nur mit Quelle; alte Clips unverändert). Der Inbox-Weg trägt die Quelle mit; der WAV-Editor-Roundtrip backt aus und löscht sie.
- Die Render-Hälften der Auditions (ROOM4-08) nehmen jetzt einen Tempowert (`renderDrum/renderBass(id,{bpm})`); das Vorhören in der Bibliothek ruft sie unverändert ohne Wert.
- Pro Pattern und Tempo wird **ein Zyklus** gerendert, exakt auf Schleifenlänge geschnitten (3 ms Ausblende), als RAM-Variante (höchstens 16, beim Verlassen des Raums verworfen) und spielt danach wie ein normales Material mit Rate 1. Wiedergabe, Export, Freeze und Bounce nutzen dieselbe Variante. Tempo außerhalb 20 bis 400 BPM fällt mit Hinweis auf Tape zurück.

## Prüfung (`tools/probes/multitrack_pattern_warp_probe.js`, echte App, Schlagzeug „RhythmForge · Rooted“)
Helligkeit = lautstärkegewichtete Zero-Crossing-Rate nur in den lauten Abschnitten; „aktiv“ = Dauer der lauten Abschnitte.

| Fall | Dateilänge | Helligkeit gegenüber Original | aktive Dauer |
|---|---|---|---|
| Original (108 BPM) | 4,5 s | 1,00 | 0,68 s |
| **halbes Tempo, Pattern-Warp** | 8,9 s | **1,01** | **0,70 s** |
| halbes Tempo, Tape | 8,9 s | 0,58 | 1,25 s |
| unten ×1,5 gezerrt, Pattern-Warp | 6,7 s | 1,10 | 0,70 s |
Die Schläge klingen beim Pattern-Warp gleich hell und gleich kurz wie im Original, der Loop ist doppelt so lang; bei Tape werden sie dunkler und fast doppelt so lang (das „dumpfe Dröhnen“). Keine Fehler. Unit-Tests: Datenmodell, Plan (Tempo geteilt durch Stretch, Bereichsgrenze), Render-Aufruf mit dem richtigen Tempo, exakte Zykluslänge, Fehler und fehlender Live-Raum als lesbare Meldung. 100 Regressionstests grün; Standard-Export unverändert (`833a9776cceb945d`).

## Grenzen
- Nur im Browser mit Testbasis gemessen, **nicht abgehört**: Ob Übergangsmomente (Tape → Pattern, sobald die Variante fertig ist) hörbar sind und wie das Pattern bei extremen Tempi klingt, bleibt zu prüfen.
- Das Pattern kommt **aus der aktuellen Bibliothek und mit dem aktuellen Bass-Klang** des Hauptraums. Wurde das Pattern gelöscht oder der Klang später geändert, ändert sich der Neurender (oder fällt auf Audio zurück). Wer den Klang festhalten will: **Bounce/Freeze**.
- Drum-Effekt-Rack des Hauptraums ist nicht eingerechnet (trockenes Pattern, wie bei ROOM4-08). Voraussetzung: Der Hauptraum wurde seit dem Start einmal geöffnet (beim normalen Start immer der Fall).
- Pattern-Clips aus Aufnahmen oder früheren Ständen (ohne gemerkte Quelle) bleiben bei Tape/Granular.
- Das Neurendern läuft auf dem Hauptthread (Offline-Rendering der Engines); bei langen Mustern kurzes Ruckeln der Oberfläche möglich.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Nicht: Abhören, Gerät, Firefox/Safari, USER_ACCEPTED. Rollback: Commit `29510fd` (ROOM4-14).
