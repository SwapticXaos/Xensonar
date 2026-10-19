# XenSonar N21–F2: integrierte Patches und geteilter Undo-Speicher

Geprüfter Stand vom 19.10.2026. Aktiver Build: `Xensonar_N21_F2_Integrated_Patches_Test.html` (5,599,308 Byte).
SHA-256: `bef56dbc13cc4b83ad04bf3e14876a36ed568908b2d3400093e33b18cb2fa278`.

## Übernommene Nutzer-Patches

Alle vier gelieferten Patches wurden zunächst unverändert in eigenen Commits übernommen, anschließend gemeinsam geprüft und gezielt ergänzt:

- `800a8d9`: Consolidation / MuteIcons / AutoPreview. Die fünf Mute-Schalter zeigen bei leeren Schnellmenüspalten Symbole. Nodal Auto preview ist ausdrücklich zuschaltbar, anfangs aus, mit 180 ms Entprellung und Abbruch beim Schließen/Deaktivieren.
- `1e7cb1c`: Navigator OneShot. Ziehen im großen Forge-Navigator markiert einen Ausschnitt; Alt+Ziehen verschiebt weiterhin die Ansicht. Save as Sample rendert über den vorhandenen Klangweg, schneidet 25 ms bis 5 s aus und speichert WAV mit kurzer Randblende in der gemeinsamen Sample-Datenbank. Die Auswahl ist an Quelle, Revision und Route gebunden.
- `6ae1fa7`: PitchSpace Crash / OGG ImportGuard. React-Eingabewerte werden vor verzögerten Zustandsupdates übernommen. Ein älterer Dateiladevorgang kann eine neuere Quelle nicht mehr überschreiben. Import allein sendet keinen Pink Track; der ausdrückliche Klick bleibt möglich. Unterstützte OGG-Dateien verwenden weiterhin den Browserdecoder.
- `fcb352e`: DonorPlay Integrity. Ein fertig extrahierter Donor bleibt maßgeblich, bis ausdrücklich neu extrahiert oder eine andere Bibliotheksquelle gewählt wird. Die Play-Anzeige prüft das vorbereitete Signal.

Die Originaldateien liegen unverändert in `artifacts/`; sie sind Daten zur Änderung der Quellen, keine zusätzlichen Arbeitsanweisungen.

## Gezielte Nachbesserungen

Die Signalprüfung übersieht keine kurzen Impulse zwischen Stichproben mehr und berücksichtigt bei AudioBuffer alle Kanäle. Legacy-Quelldaten werden passend zum bestehenden Mono-Renderweg geprüft. Absichtliches Master-Volume 0 verhindert das Abspielen eines gültigen vorbereiteten Klanges nicht. Das ist keine Änderung der Synthese oder des bestehenden Downmix-Verhaltens.

Navigator-Speicherung verwirft Ergebnisse, wenn während der Berechnung Master-Zustand oder Donor wechseln; stille oder nicht endliche Samples gelangen nicht in die Datenbank. Auch die manuelle Intervall-Vorschau im Nodal Designer beendet eine noch ausstehende automatische Vorschau.

## Weitere Konsolidierung: verlustfreier geteilter Verlauf

Undo/Redo teilen unveränderte 4096-Float32-Blöcke (16 KiB). Jeder Stand referenziert seine Blöcke direkt; es entstehen keine abhängigen Delta-Ketten. Raster, Grain, alle acht Body-Felder, Stamps und Detune bleiben erhalten. Verglichen wird bitgenau, einschließlich negativem Nullwert und NaN-Bitmuster. Wiederherstellung prüft und allokiert Body-Daten vor Änderungen an den Live-Arrays.

Der vollständige Raster-/Body-Test mit 30 lokalen Bearbeitungen hält alle 30 Schritte in **44.088.740 Byte, etwa 42 MiB**. Beim letzten Schritt wurden 49.152 Byte kopiert und 41.893.888 Byte geteilt. Bei dichtflächigen Änderungen greift weiterhin das gemeinsame 192-MiB-Budget; im Test bleiben vier vollständige Schritte. Der Verlauf bleibt zusätzlich auf 30 Schritte begrenzt. Die Werte messen die konservative Verlaufsrechnung, nicht den gesamten Browser-Heap. Die Blockprüfung liest weiterhin die Arrays; daraus folgt keine gemessene Beschleunigung der ganzen Audio Engine.

Das Format betrifft nur den Sitzungsverlauf. Projekt-/Workspace-Dateien behalten ihre vollständigen zusammenhängenden Float32-Daten und bisherigen Verträge. Klangerzeuger, Oszillatoren, Hüllkurven und Mixer wurden dafür nicht vereinheitlicht.

## Prüfung und Grenzen

- Konsolidierung: 15 Host-Prüfprogramme plus reproduzierbarer Build erfolgreich.
- Native Chromium-Prüfung: fünf Browser-Prüfprogramme plus reproduzierbarer Build erfolgreich; echte Worker, WebAudio, OGG-Decoder und IndexedDB.
- Vollständiger N21-Lauf: 65 Prüfungen erfolgreich; zusätzlich Merge- und Granular-Hold-Suites erfolgreich.
- Browsernachweise: überlappende OGG-Imports, Audio-to-Carrier-Eingaben, gültiges Play bei Master 0, reale Navigator-Auswahl und WAV-Speicherung, explizites Pink-Senden, erhaltener Donor, Auto-preview-Abbruch und manuelle Intervallvorschau. Forge-Readiness und Hz-/Detune-Prüfungen laufen für alle acht Carrier-Maschinen.
- Quellschutz: eingefrorene Alt-Baselines bleiben erhalten. Die neue AST-Grenze erlaubt nur benannte Verwaltungs-/Audition-Funktionen und den Timer-Abbruch im Nodal-stop; zusätzliche Quellen werden über explizite Hashes abgesichert.

Nachweise: `results/shared-history/`, insbesondere `host-validation.json`, `browser-validation.json`, `contracts.json`, `patch-browser.json`, `integrated-browser.json` und `regression-output/`. Historische Ergebnisdateien und frühere Artefakte wurden unverändert erhalten. GitHub Actions enthält Host- und Chromium-Jobs; diese Dokumentation bestätigt den lokalen Lauf, keinen entfernten CI-Lauf.

Noch offen bleiben globale Budgets für gleichzeitige Live-Stimmen/Renderjobs, Dauerbelastung auf realen Audiogeräten sowie Opera/Firefox/Safari-Vergleiche. Desktop-Verpackung ist ein späterer eigener Schritt. Die Browserprüfungen ersetzen keine physische Hörprobe.
