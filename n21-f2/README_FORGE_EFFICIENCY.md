# Spectral Forge · Bereitschaft und portable Einstellungen

Aktive Einzeldatei: `Xensonar_P7_Forge_Efficiency_Test.html`.

- Der kompakte Material-Preview übernimmt den gelieferten Grafik-Patch: 28 × 28 px, Name und Metadaten bleiben jeweils einzeilig.
- Fractalia behält beim Vorbereiten eines Donors den ausgewählten Hörmodus. Erneutes Play verwendet den passenden fertigen Audiopuffer; eine lokale Pinseländerung bereitet den geänderten Carrier wieder automatisch vor.
- Unveränderte Bereitschaftsabfragen verwenden eine kleine Zwischenspeicherung statt immer wieder das gesamte Carrier-Raster zu kopieren. Änderungen an klangrelevanten Eingaben und die Cache-Freigabe entwerten diese zuverlässig.
- Die Paketstation sichert zusätzlich 13 bisher fehlende persistierte Einstellungs-/Bibliotheksbereiche. Forge-Arbeitsstände erhalten auch Hörmodus, Carrier Tuning und Carrier Volume.

Nach dem Paketimport einmal **neu laden**, damit alle globalen Mix-, Raster- und Instrumenteinstellungen aktiv werden. Der Import weist darauf hin. Die Paketdatei überträgt gespeicherte Arbeitsstände; sie ist kein laufender Audioprozess-Snapshot und enthält keine berechneten PCM-Caches. Ältere Pakete bleiben importierbar und löschen keine erst später unterstützten Bibliotheken.

Bereits berechnete unveränderte Klänge, Donor-Analysen und Fractalia-Instrumentdaten werden weiterhin wiederverwendet. Eine universelle stückweise PCM-Neuberechnung wurde bewusst nicht eingeführt: Fractalias Relationen, Ausklänge und globale Normalisierung können mehrere Zeitbereiche verbinden. Hier bleibt die vollständige Berechnung klanggetreu erhalten. Keine Absenkung von Auflösung, Stimmenzahl oder Klangdetail.

## Prüfen und weiterarbeiten

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

Befunde, Grenzen und Messungen: [Prüfbericht](docs/forge-efficiency/report.md). Ausführbare neue Prüfungen: `tests/forge-efficiency*.cjs`. Nachweise: `results/forge-efficiency/`.

Die vorangegangene geprüfte P7-Integration bleibt erhalten. Das separat archivierte P7.12-Live-VCA-Experiment ist weiterhin nicht im Build.
