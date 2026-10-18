# Live Controls, Mono/Stereo und Xenpolar Drone

Basis: Commit `48fdc63932d5e3c68c7d753e39f03391e937a8ed` (Forge Loading Progress).
Testdatei: `Xensonar_N21_F2_Live_Controls_Test.html`; 5522665 Bytes.
SHA256: `cfff8263c2d39c083ba1b7ea5bf24eb7e4cc6208a25085385dd6b1ed64229d30`.

## Bedienung

- Im Schnellmenü steht über den fünf Kategorien eine kompakte Zeile. Material Track, Root Follow Loop, Drums und Bass haben je ein Mute-Feld; Raster hat keinen Schalter. Rot mit × bedeutet stumm. Die Felder betätigen die vorhandenen Active-Schalter, ohne Auswahl oder Playlist zu löschen. Ihre Transportsemantik bleibt erhalten; dies ist kein zusätzlicher, phasenerhaltender Gain-Mute.
- Jede Instrumentkarte im Melodic Loop hat neben Pattern A/B/C einen Pan-Regler. C bedeutet Mitte; L/R zeigen den Wert. Doppelklick setzt auf Mitte zurück. Native Tastaturbedienung funktioniert. Während des Loop-Spiels folgt das Audio geglättet in etwa 12 ms, ohne neue Stems, neuen Transport oder Versatz der gemeinsamen Uhr.
- Neue Instrumentspuren starten mittig. Vorhandene gespeicherte Pan-Werte bleiben erhalten und werden im Projekt mitgespeichert. Die visuell gekürzten Pattern-Tasten A/B/C behalten ihre vollständigen Titel und zugänglichen Namen.
- Die drei Klangquellen-Menüs Wave Starter, Particles und Keyboard stehen jeweils einmal oben links. Wave Enable sowie Particle Mute sind ebenfalls dort. Individuelle Particle-Einstellungen, Sample Particle Mode, Hüllkurven, Obertöne und Hold-Pattern bleiben verfügbar.
- Room III beginnt ohne die vorherige obere 24-px-Lücke. Die rechte Dokument-Scrollbar hat einen einzigen Scroll-Eigentümer. Interne Bibliothekslisten bleiben eigenständig scrollbar.
- Unter **Drone sound → Xenpolar Drone** liegt ein zusätzlicher ruhiger Dauerklang mit Dreieck-/Sinusgrundlage, Quinte, langsamer Bewegung und variabler Klangfarbe. Timbre verändert sowohl die Obertonmischung als auch den Filter. Die Auswahl setzt Rhythmus auf Off und moderate Bewegungswerte; diese Regler bleiben frei einstellbar. Vorhandene Presets und gespeicherte Einstellungen werden weiter verwendet.

Die Klangidee orientiert sich an der archivierten „Xensonar Variante“/Xenpolar. Der alte Core-Archivhinweis wird dabei nicht umgangen und Xenpolar wird nicht reaktiviert. Es ist eine neue Hauptprojekt-Interpretation, keine behauptete klangidentische Kopie des Full-Build-Instruments.

## Mono, Stereo und Rechenaufwand

Die Kanalzahl wird vor der Offline-Berechnung aus den tatsächlich verwendeten Quellen und Einstellungen gewählt. Rein mittige Mono-Instrumente ergeben einen Mono-Buffer und eine Mono-WAV. Sobald eine hörbare Spur gepannt wird, entsteht Stereo. Zurück auf Mitte ergibt wieder Mono, sofern keine andere Stereoquelle beteiligt ist.

Bewusst angelegte Räumlichkeit bleibt erhalten: Stereo-Samples, vorbereitete Stereo-Entrophon-Instrumente, Nodal Pickup width größer null sowie Drum-Panning verlangen weiterhin Stereo. Nodal Pickup width = 0 bleibt mono, auch wenn das nachfolgende Spurpanning Stereo erzeugt. Ausgeschaltete melodische Spuren erzwingen allein keinen Stereo-Export. Standard-Drum-Pan-Werte und Pan-Offsets einzelner Drum-Layer werden berücksichtigt.

Pan ist vom Melodic-Stem-Cache getrennt. Die Stems werden unverschoben vorbereitet; ein vorhandener nativer Panner pro melodischer Spur übernimmt die Live-Einstellung. Eine Pan-Bewegung löst daher keine neue Syntheseberechnung aus. Mono-Stems benötigen bei gleicher Länge halb so viel PCM-Speicher. Für den Test mit 24.480 Frames beträgt die WAV-Größe 49.004 Bytes mono gegenüber 97.964 Bytes stereo. Das ist eine Kanal-/Speicherersparnis, kein behaupteter pauschaler Faktor für die Gesamt-CPU-Last.

Die Übertragung an Material Track und Root Follow verwendet die gewählte Kanalzahl. Ein panned Melodic Loop wird in Root Follow als gerendertes Material geführt, damit die vorhandene Mono-Synth-Pattern-Route die Pan-Einstellung nicht ersetzt. Raw-Drums werden bei Mono genau einmal zusammengeführt. Bei Nodal-Instrumenten ohne innere Stereobreite verhindert eine gemeinsame Monoquelle für Preview und Export das doppelte Summieren von L/R bei hartem Panning.

Die neue Drone-Klangfarbenbank gehört dem jeweiligen AudioContext und enthält höchstens 33 PeriodicWaves. Unveränderte Klangfarben verwenden denselben Eintrag. Der laufende Oszillator wird weiterverwendet; es entstehen keine zusätzlichen Voices oder Audio-Timer.

## Nachweise

- Native Chromium/WebAudio-Tests: Mono → links/rechts Stereo → wieder Mono; WAV-Kanalzahl und Dateigröße; Nodal ohne/mit innerer Breite; gleiche Nodal-Quellenergie beim Pan-Wechsel; Pan-Speicherung; Stem-Schlüssel unabhängig vom Pan; Live-Pan ohne neue PCM oder Transportuhr.
- UI-Tests über echte Bedienelemente: vier Mutes, eindeutige Klangquellen-Menüs, neuer Drone auswählbar, Raum-III-Ausrichtung, Pan mit Tastatur und Doppelklick, gemeinsamer Composer aktualisiert. Pattern und Pan liegen bei 1600, 1100 und 760 px Fensterbreite in derselben Zeile; kein horizontaler Überlauf.
- Tatsächliche Material-Track-Transfers prüfen die dekodierten WAVs (mono/stereo/mono). Der Root-Follow-Transfer prüft Materialrouting und den Stereo-Buffer des gespeicherten Eintrags.
- Neuer Drone bei drei Timbre-Werten mit echten nativen Oszillatoren/Filter gerendert: endliche, hörbare PCM, gemessene Spitzen unter 0,062. Die relative spektrale Helligkeit steigt im Test von 0,00236 auf 0,00608. Dies ersetzt keine subjektive Hörabnahme.
- 96 Vergleiche der bisherigen 16 Drone-Presets bei drei Timbre- und zwei Pegelwerten behalten ihre ursprünglichen Automationsergebnisse exakt bei. Begrenzte Klangfarbenbank und ungültige numerische Eingaben geprüft.
- 65 bestehende Host-/DSP-/Worker-Prüfungen einschließlich Build-Verifikation. Ergänzend Granular-Hold, RFL-Live-Stability, Merge, Forge-Fortschritt/PCM und Quellindex.
- 209 bisherige Quell-, Stil- und Template-Dateien sind unverändert. Änderungen an 13 vorhandenen Dateien sowie zwei neue kleine Audio-/UI-Helfer und eine CSS-Datei sind durch einen eigenen Hash-Vertrag begrenzt. Nodal-DSP-Kernel, Granular-Hold und RFL-Prozessor/Worker bleiben unverändert. Zwei Keyboard-Tests folgen nach Entfernen der Duplikate den tatsächlichen oberen Menüs; die Audio-/Dispatch-Assertions bleiben erhalten.

Messdaten: `results/live-controls/`. Ausgangs- und Patch-Verträge: `docs/live-controls-baseline-hashes.json` und `docs/live-controls-source-anchors.json`.

```sh
npm ci
npm run build
npm run verify:build
npm run test:live-controls
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
npm run test:p4c2-n21
npm run test:merge
npm run test:granular
npm run test:live-stability
npm run test:forge-progress
node tests/rw2-source-index.cjs
```

Die Browserprüfungen verwenden das installierte Chromium und eine abgefangene HTTPS-Testadresse mit echter WebAudio-/Worker-Ausführung. Opera und Firefox sind hier nicht installiert. Der doppelte Scroll-Eigentümer wurde in Chromium nachgewiesen und korrigiert; ein eigener Opera-Hördurchgang ist nicht als durchgeführt ausgewiesen. Die gespeicherte Cloud-Startanleitung verweist auf die neue Testdatei und Prüfungen; Veröffentlichung des Umgebungsentwurfs erfolgt über die Umgebungseinstellungen.
