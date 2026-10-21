# Stabile Zuständigkeiten für die Weiterentwicklung

Aktive Einzeldatei: `Xensonar_P7_Architecture_Stability_Test.html`.

Der Forge-Speichercontroller besitzt nun genau eine Startphase und höchstens einen gleichzeitigen Wiederherstellungsvorgang. Wiederholte Aufrufe teilen dessen Ergebnis. Alle bereits eingeplanten Schreibvorgänge dürfen vor einer Wiederherstellung abschließen; währenddessen werden keine zusätzlichen Sicherungen begonnen. Neuere Interaktionen unterbrechen das Laden auch dann, wenn sie während dieses Wartens stattfinden. Nach dem Abmelden beginnt kein weiterer Datenbank-Lesevorgang.

Keine Änderungen an Klangmaschinen, DSP, Mastering, UI oder gespeicherten Formaten. Keine neue Abhängigkeit und kein zusätzlicher Audio- oder Analysezyklus.

[Architekturprüfung, Prioritäten und Prüfgrenzen](docs/architecture-stability/report.md). Nachweise: `results/architecture-stability/`.

```sh
npm ci
npm run build
npm run verify:build
node tests/forge-persistence-ownership.cjs
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
```

Die bisherige Paketstation bleibt aktiv. Nach einem Paketimport einmal neu laden, damit globale Einstellungen aktiv werden. P7.12 bleibt ein archiviertes, nicht mitgebautes Experiment.
