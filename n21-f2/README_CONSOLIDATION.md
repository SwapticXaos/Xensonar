# Projektintegrität und begrenzter Undo-Speicher

Aktueller Build: `Xensonar_N21_F2_Consolidation_Test.html`.

Dieser Schritt verändert die Datenverwaltung, nicht die Klangmaschinen:

- Gespeicherte Forge-Arbeitsstände im Workspace-Paket behalten ihre vollständigen Body-, Stempel- und sonstigen Array-Daten. Lange Kurven bleiben erhalten.
- Beschädigte Snapshots werden vor Änderungen an Raster, Instrumenten oder Transport abgewiesen.
- Undo und Redo teilen sich höchstens 30 Einträge und ein konservativ berechnetes Budget von 192 MiB. Alte Schritte werden zuerst entfernt. Besonders große einzelne Schritte können nicht im Verlauf bleiben.
- `pe.getState().getHistoryUsage()` ist die interne Diagnose für den Verlauf, kein Messwert für den gesamten Browser-Prozess.

Ältere Pakete, die bereits Audiodaten oder Body-Arrays weggelassen haben, können fehlende Werte nicht zurückgewinnen. Vollständige kurze Vorschauen werden übernommen; unvollständige Daten werden ausdrücklich abgewiesen. Originale Browser-Arbeitsstände und vollständige Backups bleiben die Wiederherstellungsquelle.

```sh
npm ci
npm run build
npm run verify:build
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
```

`npm run verify:release` führt beide Prüfgruppen aus. Für die Browsergruppe muss Chromium vorhanden sein; `XEN_CHROMIUM_PATH` wählt die ausführbare Datei. Ein lokaler Webserver ist nicht nötig. GitHub Actions installiert für seinen Browserjob eine passende Playwright-Chromium-Version.

Details, Testumfang und nächste Arbeitspakete: `docs/consolidation/report.md`.
