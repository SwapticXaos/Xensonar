# Gemeinsame Forge-Höranfrage und abgesicherte Renderaufträge

Aktive Einzeldatei: `Xensonar_P7_Forge_Request_Stability_Test.html`.

Diese Weiterarbeit setzt drei zusammenhängende Stabilisierungsschritte um:

1. Der bestehende Anfrage-Erzeuger setzt die Renderparameter für Carrier und Hörmaschinen an einer Stelle zusammen. Vorbereitung, Play, Export und die Cache-Bereitschaft greifen darauf zurück.
2. Ein Renderauftrag besitzt seine Abbruchgeneration bereits vor der Donor-Vorbereitung. Er verwendet denselben Rezeptstand und dieselbe vorbereitete Donor-Identität bis zur Cache-Übernahme. Überholte Aufträge werden verworfen; vor Beginn der Synthese fällt dafür auch keine Rasterrekonstruktion an.
3. Ein fehlerhafter Fortschrittsbeobachter wird abgemeldet und in der Konsole protokolliert. Andere Verbraucher rechnen und hören weiter mit demselben gemeinsam genutzten Audiopuffer. Fehler der Synthese selbst bleiben Fehler.

Klangmaschinen, Klangparameter, Live-DSP, Mastering, UI und Paketformate bleiben erhalten. Die bisherigen Optimierungen und die geprüfte Persistenz-Zuständigkeit sind enthalten. P7.12 bleibt archiviert und wird nicht mitgebaut.

[Prüfbericht](docs/forge-request-ownership/report.md) · Nachweise unter `results/forge-request-ownership/`.

```sh
npm ci
npm run build
npm run verify:build
node tests/forge-request-lifecycle.cjs
node tests/forge-request-contract.cjs
npm run test:consolidation
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
```

Die Paketstation benötigt nach einem Import weiterhin einmaliges Neuladen für globale Einstellungen.
