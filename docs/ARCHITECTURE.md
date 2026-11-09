# Architektur- und Quelldurchgang

## Form der Anwendung

XenSonar wird als **eine vollständige, offline nutzbare `index.html`** ausgeliefert. Aktuell sind **32 `<script>`-Blöcke** und **77 `<style>`-Blöcke** enthalten; **keine externen `<script src>`**. Scriptblock `10` (0-basiert) ist ca. **6,08 MB** groß und beherbergt große Teile der Audio-, UI-, Timing- und Persistence-Logik. Es gibt eingebettete React-/JSX-Runtime-Konstrukte (`P.useState`, `u.jsx`), PCM-/Web-Audio-Subsysteme und für Teilräume eigens registrierte Code-Payloads (`application/x-xensonar-room` u. ä.).

**Warnung:** Die Browser-HTML ist das ausführbare Build-Artefakt. Der ursprüngliche vollautomatische, editierbare Source-Rebuild ist durch dieses Paket **nicht nachgewiesen**. Die nach Script-/Style-Blöcken extrahierten Dateien sind ausdrücklich eine **Lesekarte**, keine neue Runtime-Modulstruktur.

## Gedankliches Komponentenbild

- **Main Room / Play und Echtzeit:** Keyboard, Partikel, Wave/Audio-Player, Drums, Timing, Routing, Volume/Pan/EQ und Master-/Mix-Pfade.
- **Rhythmik:** Main-Room-Transport mit gemeinsamen Beat-/Bar-Referenzen; Drum Pattern Manager (aktueller Owner), daneben ältere/Legacy-Drum-Komponenten. Dub Echo baut auf dem **aktuellen** Drum Rack auf, nicht dem Legacy-Drum-System.
- **Klanggeneratoren / Tuning:** Nodal, Entrophon/Spectral Forge, Root Follow, harmonische und mikrotonale Bezugssysteme, Keyboard-/Instrument-Owner. Keine pauschale 12-EDO-Verallgemeinerung.
- **Wave Editor:** eigenständiger PCM-/Edit-Kernel (Script 15) plus UI/Operations im Hauptprogramm; Golden Move, Gain/Volume, Copy/Mixpaste, Undo/Redo mit Snapshots.
- **Recording / Export:** Long Master Recording mit chunkbasiertem temporärem Audiostore, Export WAV/FLAC und Sicherheits-Fallback. Nicht mit Paketstation-Backup verwechseln.
- **Persistenz:** Sessions, Drumbeats, Instrumente, EQs und Ressourcen haben unterschiedliche bestehende Besitzer; aktives Browserprofil/localStorage/IndexedDB/OPFS werden nicht durch HTML allein portabel.
- **Package Station / Eye:** Benutzerdateien als `.xenpack` exportieren/importieren bzw. vorhandene Inhalte inspizieren/gezielt löschen. Daten-Owner, referenzierte/mehrfach genutzte Assets und Export-vs-Löschen-Selektion schützen.
- **Visual-/Diagnoseadapters:** Start-Up-Diagnostik, Power Trace, Spectral Visuals, LCR Collector, Sound Path Inspector. Nicht in den Audio-Hot-Path überführen, wenn der Adapter nur lesend sein soll.

## Praktische Suche

`source_reference/READING_ORDER.md`, `source_reference/HOTSPOTS.json` und `source_reference/source_map.json` liefern Einstiegspunkte mit HTML-Zeilen. Verwende `rg -n` und zeilenbasierte Schnitte. Vor einer Änderung am großen Script 10 die Aufruf- und Consumer-Kette verfolgen; viele Parameter oder React-Hooks sind über die Datei verteilt.

## Audio-Lifecycle und Runtime

Zustände wie `AudioContext`, `OfflineAudioContext`, `DelayNode`, `GainNode`, `AudioParam`, Echtzeit-Clock, bereits laufende Scheduled Events und App-Mount/Unmount haben unterschiedliche Lebenszyklen. Vermeide neue Loop-Timer bei jedem Render, versehentlich doppelte Subscriber und dynamisch verlorene Transient-States. Bei Firefox existiert eine dokumentierte Kurven-/Ramp-Regression. Reine JS-Syntax sagt nichts über Artefakte, Klicks, Latenz oder Pegel.

## Vorsicht bei DUB03

Aktueller Code (`function __xenDrumEchoTimes`): Basistime in `bar*ratio` oder frei in ms, `feel=...*bar/32`, Links/Rechts-Rate, First-Tap-Offset, Clamp auf 3,9 s. Das Segmentraster wird live aus `__mlSharedDrumMachine` gelesen (fallback auf gleichmäßige 16). Die `bar=__xenDrumEchoStep()*16`-Konstruktion muss bei einem künftigen echten globalen Odd-Meter-Modell **funktional** überprüft werden. Unabhängig davon hat das bereits bestehende DUB02-Feature eigene Modi und einen eigenen Timingvertrag. Eine Metapher über universelle Musikzeit ersetzt hier keinen Test.

`__xenNParamsPublish` begrenzt die UI/Persistence-Arbeit auf ca. 80 ms, während Audio-Parameterwert-Schreibungen unmittelbar erfolgen sollen. Verifiziere die Stelle des tatsächlichen `updateNParams`-Aufrufs und den State-Owner, bevor ein Optimierungspatch daraus eine andere Semantik macht.
