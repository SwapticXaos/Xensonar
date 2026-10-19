# XenSonar N21–F2 · Fester Hz-Raum und Detune

Die aktuelle, vom Nutzer gelieferte N21–F2-Quellbasis mit Granular-Hold, Live-Stabilitäts-Patch und korrigierter Forge-Fortschrittsanzeige sowie ausgerichteten Mix-Reglern, Raster-Mute, Melodic-Panning und Xenpolar Drone im Hauptinstrument
liegen in [`n21-f2/`](n21-f2/). Der ältere React-/Vite-Stand im Repository-Root
bleibt als historischer Stand erhalten und ist nicht die Basis dieses Patches.
Die Nodal-Volume-Hüllkurve erreicht am unteren Rand jetzt exakt Stille.
Die Aufnahme-Markerfläche bleibt auch bei langen Schnellmenüs erreichbar; ihre grüne Ringwelle breitet sich um das XenSonar-Logo aus.

Raster-Mute umfasst jetzt auch Wave Starter und Live-Quantisierung. Material-/RFL-Hotkeys sind im Schnellmenü sichtbar und geben beim Auslösen eine kurze grüne Rückmeldung. Der Melodic-Editor besitzt dieselbe Transportsteuerung wie der obere Bereich sowie wiederverwendbare Custom-Instrumente aus Originalklang und Kurven. Die Instrument-Regler verwenden dünne Linien in Instrumentfarbe; die Nodal-Namenseingabe steht beim Speichern.

Der aktuelle Wartbarkeits-Patch reduziert wiederholte Notensuchen, Zeitgrenzenberechnungen und gemeinsame Feldnormalisierung. Vier Verwaltungsfunktionen in drei Dateien ändern sich; Klangerzeuger, Bedienung und Projektformate bleiben erhalten. Messungen und Vergleich mit dem vorherigen Code: [`n21-f2/docs/maintenance-report.md`](n21-f2/docs/maintenance-report.md).

Neu: Im SpectralForge-Bereich **Sound Material · Donor** steht neben **Import Audio** die **Mikrofonaufnahme**. Stop übernimmt die eigene Stimme/Geräusche in den bisherigen Donor-Importweg; Verwerfen erhält die bisherige Quelle. Anleitung: [`n21-f2/README_MICROPHONE.md`](n21-f2/README_MICROPHONE.md).

Neu: **Transform to Carrier** beim Audio-/Mikrofonimport erzeugt editierbare Grundtonlinien, auch aus Akkorden. Filter, Abbrechen, Rohquellenerhalt und Undo sind integriert. Vier Carrier-Wege bleiben verfügbar: Malen, Import Image, Melodic Loop und Audio. Anleitung: [`n21-f2/README_AUDIO_CARRIER.md`](n21-f2/README_AUDIO_CARRIER.md).

Aktuell: Audio to Carrier behält die zuvor gewählte Klangmaschine bei. Vollgrün am Play-Button bedeutet einen passenden fertigen Audiopuffer; Vorbereitung und Play verwenden denselben Renderweg. Details: [`n21-f2/README_FORGE_READY.md`](n21-f2/README_FORGE_READY.md).

Aktuell: Lokale Pinsel-/Morph-Bearbeitung erhält die Hz-Zuordnung und Akkordintervalle. Der bisher ungewollte relative Frequenzraum ist als **Detune** neben dem unteren Synth-Lab-Play ausdrücklich dosierbar. Anleitung: [`n21-f2/README_PITCH_SPACE.md`](n21-f2/README_PITCH_SPACE.md).

```sh
cd n21-f2
npm ci
npm run build
npm run verify:build
npm run test:pitch-space
npm run test:pitch-space:browser
npm run test:forge-ready
npm run test:forge-ready:browser
npm run test:audio-carrier
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:audio-carrier:browser
npm run test:microphone
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:microphone:browser
npm run test:maintenance
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:maintenance:browser
npm run test:workflow-integrity
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:workflow-integrity:browser
npm run test:ui-refinement
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui-refinement:browser
npm run test:live-controls
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
npm run test:forge-progress
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:forge-progress:browser
npm run test:live-stability
npm run test:granular
npm run test:merge
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:granular:browser
```

Direkt testbare Datei: `Xensonar_direct_test_latest.html`.
Quellen, Patch und Prüfbericht: `artifacts/`.
Details: [`n21-f2/docs/microphone-report.md`](n21-f2/docs/microphone-report.md).

## Historischer Repository-Stand: Xensonar 3.1.6

This pack contains the files that Codex previously reported as missing or worth checking in a partial repository snapshot:

- Root build/setup files
- Main app entrypoints
- Xensonar app file
- Level3 lab room file
- Canonical forge room file

Generated helper files:
- README.md
- .gitignore

## Direct-Test Workflow

Für Frontend-Patches wird zusätzlich zur Codeänderung immer ein direkt testbares Single-File-HTML bereitgestellt:

- `Xensonar_direct_test_latest.html` (aktueller Single-File-Build aus `n21-f2/`)

Damit kann der aktuelle Stand ohne Build-Schritt direkt gegengeprüft werden.

