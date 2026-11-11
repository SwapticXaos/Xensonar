# ROOM4-07 (Warp: Stauchen/Zerren, granular, Pitch) und ROOM4-08 (Drums/Bass als direkte Quellen)

Basis: CLEAN02 (`index.html` 8 813 567 B), jetzt 8 831 155 B (+17 588 B, alles im lazy geladenen Raum-IV-Chunk bis auf rund 1,5 KB im Audition-Modul).
Zone: Raum IV ist KALT/WARM (schläft, solange der Hauptraum spielt). Rendern läuft im vorhandenen Offline-Worker. Der Live-Pfad des Hauptraums ist unberührt.

## ROOM4-07 · Warp
**Bedienung**
- **Untere Hälfte einer Clip-Kante ziehen = Stauchen/Zerren** (kleines Dreieck in der Ecke). Rastet auf das Raster ein, Taktlinien ziehen zusätzlich an (8 px). Die **obere Hälfte** trimmt/loopt wie bisher.
- Inspektor: `Stretch` (Faktor), `Warp` (Tape / Granular – Tonhöhe halten), `Pitch ct` (granularer Versatz in Cent, mikrotonal frei), `Reset warp`. Spurkopf: `Pitch` in Cent für alle Clips der Spur.
- Rechtsklick: Stretch ×2, Compress ×½, „Stretch to whole bars“, Warp umschalten, Reset.
- Clip-Name zeigt `⇔×1.49` (gestaucht/gezerrt), `≈` (granular), `♪` (Pitch).

**Datenmodell (additiv, Version bleibt 2):** Clip `stretch` (0,05–20), `warp:'grain'`, `pitch` (±2400 ct); Spur `pitch`. Fehlen die Felder, verhält sich alles wie vorher. Der Stauchfaktor multipliziert die Zykluslänge; Länge und Einstiegspunkt skalieren mit.

**Nicht destruktiv:** Es wird nichts gespeichert außer diesen Zahlen. Granulare Fassungen sind abgeleitetes PCM im RAM (höchstens 24, beim Verlassen des Raums verworfen). „Reset warp“ stellt das Original her.

**Technik:** R = Quellsekunden pro Ausgabesekunde. Tape: Wiedergaberate R. Granular nutzt den Schleifen-Renderer von PITCH-HQ-01 (`__xenSharedOfflinePCMWorker`, 60-ms-Körner, Sinc, Transientenschutz): bei Stauchen Verstimmung um Pitch/R bei gleicher Länge, Wiedergabe mit R; bei Zerren erst Verlängern um 1/R (Resampling), dann Verstimmung um Pitch/R, Wiedergabe mit 1 (volle Bandbreite). Gerendert wird 320 ms nach der letzten Änderung; bis dahin und bei Fehlern spielt der Clip im Tape-Modus, der Inspektor sagt es. Wiedergabe, Mixdown und die Übergabe an den WAV-Editor benutzen dieselbe Fassung (der Roundtrip backt den Clip-Warp ein und setzt ihn zurück).

**Grenzen:** granular nur für Verstimmung ¼× bis 4× und bis etwa 30 s Stereo (61 s Mono) nach dem Zerren (Budget des Workers); darüber Tape mit Hinweis. Der Renderer behandelt das Material als Schleife: Bei Einzelklängen können die letzten rund 60 ms leicht vom Anfang gefärbt sein. Tempoänderung rendert tempogebundene Granular-Clips neu.

**Prüfung** (`tools/probes/multitrack_warp_probe.js`, echte App, 220-Hz-Testton): Ziehen unten rechts ergibt ×1,493 und rastet ein; obere Hälfte trimmt weiter. Tape: 147 Hz, 5,97 s. Granular: 220 Hz, 5,97 s, RMS gleich. Pitch +1200 ct: 441 Hz. Live-Wiedergabe mit Fassung: Pegel vorhanden. **Reset: Export byte-identisch zum Original.** Unit-Test: Datenmodell alt/neu, Renderplan je Modus.

## ROOM4-08 · Drums und Bass als Quellen
- In der Werkzeugzeile von Raum IV: `+ Drums …` und `+ Bass …`. Die Listen kommen aus der Drum-Playlist bzw. den Bass-Clips und -Presets des Hauptraums.
- Auswahl rendert das Pattern über seinen **eigenen Owner** (dieselben Renderer wie das Vorhören in der Bibliothek: `z$` für Drums, `OPe` für Bass, mit dem aktuellen Bass-Sound), schneidet auf die exakte Schleifenlänge (3 ms Ausblende) und legt es als normales Material (Float-WAV, verlustfrei) auf eine neue Spur am Cursor. Taktzahl und Tempo sind exakt bekannt, der Clip sitzt taktgebunden auf dem Raster (8,0 bzw. 4,0 Beats) und folgt dem Projekttempo (Tape oder granular).
- Umsetzung: Die Render-Hälften der Auditions wurden herausgezogen (`renderDrum`, `renderBass`) und über `__XenRhythmSources` bereitgestellt; das Vorhören ruft dieselben Funktionen. Das Pattern selbst wird nicht verändert.
- **Prüfung** (`tools/probes/multitrack_rhythm_probe.js`, echte App): 10 Drum-Patterns, 12 Bass-Einträge gelistet; zwei Drum-Patterns und ein Bass-Pattern hinzugefügt (je eine neue Spur, 8/8/4 Beats), Mixdown mit Signal, keine Fehler.
- **Grenzen:** Der Drum-Effekt-Rack des Hauptraums ist nicht eingerechnet (trockenes Pattern). Ausklang über das Schleifenende hinaus wird abgeschnitten. Die Liste setzt voraus, dass der Hauptraum einmal offen war (beim normalen Start immer der Fall). Das Vorhören in der Sessions-Bibliothek nach dem Umbau ist nicht im Browser nachgeprüft (Code der Wiedergabe unverändert).

## Stand
99 Regressionstests grün; Raum-IV-Proben (Multitrack, Roundtrip, Tempo, Mixdown-Hash `833a9776cceb945d`) unverändert. Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Nicht: Abhören (Klang der granularen Fassung bei echtem Material, Übergang beim Fertigwerden), Gerät, Firefox/Safari, USER_ACCEPTED.
Rollback: Commit `d90ddbb` (CLEAN02).
