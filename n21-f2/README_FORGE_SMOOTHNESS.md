# Schnellere Live-Rastersuche, ruhiger Autosave und geprüfte Endstufe

Aktive Einzeldatei: `Xensonar_P7_Smoothness_Master_Test.html`.

Diese Weiterarbeit ergänzt keine neuen Instrumente oder Bedienfunktionen:

- Die Cursor-Rastersuche nutzt die bereits sortierten Frequenzen für eine binäre Suche. Tonhöhen, Hertz-Abstand, Gleichstände und Mutes verhalten sich wie zuvor.
- Die automatische Forge-Sicherung ignoriert reine Wiedergabe-, Positions- und Fortschrittsmeldungen. Echte Bearbeitungen, Einstellungen und neue Zustandsfelder lösen weiterhin eine Sicherung aus.
- Eine ausdrückliche Sicherung verbraucht einen noch wartenden Autosave. Dadurch entfällt die kurz darauf folgende doppelte Sicherung.
- Ein abgelöster Speicher-Controller darf keine verspäteten Workspace- oder Donor-Ergebnisse mehr anwenden.
- Live Mastering misst die bestehenden vier Submixe mit Float-Daten. Leise Quellen und hohe interne Pegel werden genauer erfasst; nicht endliche Messwerte können die Regler nicht mit NaN vergiften.

Die vorhandenen Submix-EQs, Pegelabstimmung, Glue-Kompression sowie die letzte Softclipper-/Limiter-Stufe bleiben erhalten. Es entstehen keine zusätzlichen Audioknoten und keine zusätzlichen Analysezyklen. Die Klangerzeuger, Instrumentpalette, bisherigen Regler und Paketformate bleiben erhalten.

Die bisherige Paketstation bleibt aktiv. Nach einem Paketimport einmal neu laden, damit globale Einstellungen aktiv werden.

## Prüfen

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

[Prüfbericht](docs/forge-smoothness/report.md) und Nachweise unter `results/forge-smoothness/`. Das archivierte P7.12-Live-VCA-Experiment wird weiterhin nicht mitgebaut.
