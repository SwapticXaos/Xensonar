# PARTICLE-HEAD-01 + INSTALL-HUM-01 · Particles-Kopfzeile, „More choices here“, Hum stummschalten

Parent: `AUDIO-ANALYSE-01` (`436daa8`). Rollback: dieser Commit davor.
Zone: **WARM** (Oberfläche des Hauptraums und des Nodal Centers; Klicks, kein Audio-Pfad außer dem unten genannten Stummschalter). Keine Persistenz, keine Migration.
HTML-Größenzuwachs: +2 261 Bytes (`index.html` 8 183 639 → 8 185 900). `run_tests.sh` 126/126, Browser-Suite grün (`grid_drag_selection` ist bekannt flaky, mit diesem Stand 8 von 8).
Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/particle_head_hum.cjs`, Pegel mit dem Probe-Analysator gemessen). **Nicht gehört.**

## 1 · Particle Mode / Particle System in der Kopfzeile der Rubrik „Particles“
Vorher: beide Menüs standen im Kasten „Harmonic System“ (zwei Zeilen unter dem Referenzton).
Jetzt: in der Kopfzeile des Particles-Bandes, nebeneinander hinter dem Titel: `Particles   Particle Mode: [Menü]   Particle System: [Menü]   … [Current] [All on] [All off]`. Es entsteht keine zweite Zeile (Test: Kopfzeile < 70 px hoch, beide Menüs liegen in ihr, Reihenfolge Titel → Mode → System). Der Kasten „Harmonic System“ ist um die beiden Zeilen kürzer. Die Tasten (`-`/`_` für das System, `N`/`M` für den Modus) gelten unverändert, stehen jetzt im Tooltip. Die Modi folgen dem System wie vorher (Bohlen–Pierce hat eigene Modi).
Code: `fse` (`src/runtime/instrument/10_entrophon_and_voice_control.js`), die beiden Setter laufen über die vorhandene Prop-Kette (`soundPalette`/`Jce` in `02_bass_and_rack.js`), der Block in `nie` (`09_…`) entfällt, CSS in `styles/post-oct/gaps/024-inline__01_after_028_inline-028.css`. Der Menü „Current / Legacy 90-40“ (Sample Particle Mode) bleibt rechts, wie er war.

## 2 · „More choices here“
Der Link im Kasten „Harmonic System“ öffnete den Nodal Center in **Art Installation**, ließ aber oben stehen. Jetzt scrollt er nach dem Öffnen zu den **Resident-Reglern** (Volume, System, Mode, Residents on/off, Reaktionen, Resident-Klang). Marke: `data-installation-resident-controls`; Test prüft, dass der Block sichtbar im Fenster liegt.

## 3 · Hum (Summen) der Art Installation einzeln stummschalten
Neben „Mycelium · ON/OFF“ steht im Reiter Art Installation der Knopf **Hum · ON / muted**.
- **Was „Hum“ ist:** der durchgehende Klang des privaten Mycelium-Graphen (Root-, Ball- und Knotentöne, `myzelGUpdate`).
- **Muted:** dieser Graph blendet auf 0 aus (gemessen am Ausgang: an ≈ 0,05–0,08 RMS, stumm 0,0000, wieder an ≈ 0,085). Mycelium bleibt **an**: Visualisierung, Topologie und Spielfeld laufen weiter, man sieht die Installation ohne ihren Klang.
- **Residents bleiben:** die Residents im Hauptraum spielt die Live-Engine (`I2e`: Ringwellen/Sektorpulse treffen stehende Resident-Knoten), nicht der Hum-Graph. Sie klingen also weiter als feststehende Particles auf die Ringwellen. Wer auch sie nicht will: „Residents on / off“.
- Besitzer: `__XenInstallationHum` (kleiner Speicher im Hauptbündel, `01_room_shell.js`), gelesen vom Header und von der Raum-Hülle; `Tpe` (`02_bass_and_rack.js`) reicht dem Installationsgraphen `installationAudible && !installationHumMuted`, der Legacy-Pfad (Sound Design) bleibt unverändert.
- **Nicht gespeichert:** nach einem Neuladen ist der Hum wieder an (bewusst, kein neuer Persistenz-Adapter; auf Wunsch in die Session-Daten).

## Nicht getan / offen
- „Residents im Hauptraum **ohne** Mycelium“ (also ohne das Nodal-Center-Feld überhaupt einzuschalten) gibt es nicht: Residents im Hauptraum hängen weiter an „Mycelium · ON“. Der Weg dorthin ist jetzt „Mycelium ON + Hum muted“.
- Resident-Klang ist nicht gehört und nicht gegen den Pegel vorher/nachher verglichen; der Hum-Graph und die Resident-Pfade wurden nicht verändert, nur der Hum zusätzlich abschaltbar gemacht.

## Tests
`tests/e2e/particle_head_hum.cjs`: Kopfzeile (eine Zeile, Reihenfolge, Funktion, keine Kopie in Harmonic System), „More choices here“ (Art Installation, Resident-Regler im Fenster), Hum (frische Seite ohne Live-Power: vorher 0, Mycelium an hörbar, Hum stumm 0, Hum wieder an, Mycelium bleibt an, Knopf nur in Art Installation).
