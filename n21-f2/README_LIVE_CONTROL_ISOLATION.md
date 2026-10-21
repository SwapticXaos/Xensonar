# Live-Steuerung und Diagnose entkoppelt

Aktive Einzeldatei: `Xensonar_P7_Live_Control_Isolation_Test.html`.

Fortlaufende Diagnosewerte lösen keinen vollständigen Neuaufbau der Instrumentoberfläche mehr aus. Zwei vom Instrumentbesitzer gehaltene Messwertkanäle speichern weiterhin jeden vollständigen aktuellen Snapshot. Gezielte Abonnements können diese Daten beobachten, ohne die globale UI neu zu rendern. Die bisherigen Zugriffe auf den letzten Messwert bleiben über Getter aktuell.

Messtakt, Audioanalyse, Aufnahme-/Exportlogik, Live-Master, Klangmaschinen und musikalische Regeln bleiben erhalten. Es werden keine Stimmen, Obertöne, Samples oder Qualitätsstufen reduziert. Die bloße Optimierung verworfener Initialisierungen wurde separat untersucht und wegen eines nicht belastbaren Zeitgewinns nicht integriert.

[Prüfbericht und Messgrenzen](docs/live-control-ownership/report.md) · Nachweise: `results/live-control-ownership/`.

```sh
npm ci
npm run build
npm run verify:build
node tests/live-control-ownership.cjs
XEN_CHROMIUM_PATH=/usr/bin/chromium node tests/live-control-ownership-browser.cjs
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
```

Die Paketstation benötigt nach einem Import weiterhin einmaliges Neuladen für globale Einstellungen. P7.12 bleibt ein archiviertes, nicht integriertes Experiment.
