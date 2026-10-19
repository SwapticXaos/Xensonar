# Forge Navigator und Material-Metadaten

Aktueller Build: `Xensonar_N21_F2_Forge_Spatial_Test.html`.

- Navigator: an den Rändern Doppelpfeil/Zoom, in der Mitte Fadenkreuz/Sample-Auswahl, Alt+Ziehen verschiebt die Ansicht.
- **Save as Sample** steht mit Abstand oberhalb von **Use as Root Follow Loop**. Die Ziele behalten ihre eigenen Funktionen.
- Raw-Import: Bars und optionaler **Frequency Anchor (Hz)** ersetzen die irreführende Nutzungsrollen-Auswahl. Der bestehende Sample-/Loop-Titel bleibt zuständig; Bar Segments sind optionale visuelle Melodic-Editor-Hilfen.
- Alte Projekte behalten ihre Rollenwerte. Neue ausdrückliche Loop-Übergaben verwenden den Loop-Vertrag und übernehmen den optionalen Frequenzanker. Leeres Hz-Feld behält das bisherige Fallback-Verhalten.

```sh
npm ci
npm run build
npm run verify:build
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
npm run test:merge
npm run test:granular
npm run test:p4c2-n21
```

[Konzept, räumliche Prüfung, genaue Änderungen und Grenzen](docs/forge-spatial/report.md). Aktuelle Nachweise: `results/forge-spatial/`. Bisherige Ergebnisse und Artefakte bleiben unverändert.
