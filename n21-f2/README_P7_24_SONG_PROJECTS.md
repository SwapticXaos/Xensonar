# XenSonar P7.24 · Song Projects und Parts

Aktive Einzeldatei: `Xensonar_P7_24_Song_Projects_Test.html`.

Song Projects speichern Zusammenstellungen aus dem bisherigen Quick Access. Der Browser/Editor dient zum Anlegen, Benennen, Sortieren und Bearbeiten von Songs und Parts. Das Öffnen und Bearbeiten eines Songs verändert den laufenden Klang nicht. Erst die ausdrückliche Aktivierung ersetzt den Quick Access. Der Song-Manifest-Export enthält Referenzen; für die vollständigen Bibliotheken und Klangressourcen dient das bisherige Tüftel-Paket. Ein Import wird vor der Übernahme geprüft.

Die gelieferte P7.24-Oberfläche räumt Forge-Eingänge, Profile und Werkzeuge um. Keyboard- und Wave-Starter-Lautstärke bleiben unabhängig. Gespeicherte Entrophon-Instrumente verwenden ihre gespeicherte Definition beim Spielen. Die Änderung enthält keine neue Klangmaschine und reduziert keine Audioqualität.

[Prüfbericht und Grenzen](docs/p7-24-song-projects/report.md) · Neue Messdaten: `results/p7-24-song-projects/`. Historische HTML-Dateien, Messdaten und bisherige Artefakte bleiben erhalten; die neue Freigabe ergänzt eigene Dateien.

```sh
npm ci
npm run build
npm run verify:build
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
npm run test:merge
```

Nach einem vollständigen Workspace-Paketimport aktiviert weiterhin einmaliges Neuladen die globalen Einstellungen. Physische Audioausgabe und andere Browser sind durch den Chromium-Test nicht belegt.
