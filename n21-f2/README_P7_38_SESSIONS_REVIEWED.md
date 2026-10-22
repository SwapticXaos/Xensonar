# XenSonar P7.38 · geprüfte Sessions

Direkt öffnen: `Xensonar_P7_38_Sessions_Reviewed_Test.html`. Im Repository zeigt `../Xensonar_direct_test_latest.html` auf dieselben Bytes.

Das Meta-Menu stellt Referenzen aus Threadboard, Material, Root Follow Loop, Drums und Bass zu Sessions zusammen. Bearbeiten, Laden und Speichern verändern die laufende Quick-Access-Sammlung erst mit **Engage!**. **Edit Current Live Session** übernimmt die aktuelle Sammlung zur Bearbeitung. Einstellungen des Hauptraums werden nur auf ausdrücklichen Wunsch mitgespeichert.

Grid-Kacheln besitzen eine eigene Identität neben der Tuning-ID. Modus, stumme Hauptstufen, Cent-Korrekturen und Bass-Grid-Konfiguration können deshalb pro Session-Kachel variieren. Eine Kopie verändert die Originalkachel und die globale Bass-Grid-Bibliothek unabhängig. Der Period Workbench verwendet die vorhandene native Markergrafik und speichert eine getrennte Custom-Tuning-Variation.

**P7.24 Songs** öffnet erhaltene gespeicherte Songs und Entwürfe mit ihren Parts. Ein ausdrücklich gewählter Part wird als Session kopiert; die ursprüngliche Hierarchie und Rohdaten bleiben erhalten. Bereits importierte Parts werden auch nach Neuladen erkannt. Ein Rohdatenexport bleibt verfügbar.

Die Play-Tasten verwenden die jeweiligen vorhandenen Klangbesitzer. Grid spielt den gesamten Stimmungszeitraum mit festem Bowed-Glass-Klang aus einem vorher vollständig gerenderten Audiopuffer, einschließlich des Periodenendpunkts. Material nutzt seinen bestehenden PCM-Player. RFL verwendet den vorhandenen nativen Preview-Weg bei ausgeschaltetem Haupt-Power, beginnt am vorhandenen nächsten Taktanker und kann dafür vorübergehend dessen RFL-Zustand übernehmen; Stop stellt den vorherigen Zustand wieder her, solange diese Vorschau ihn weiterhin besitzt. Drums und Bass verwenden ihre ursprünglichen Daten und Klangwege. Vorschau ist keine Session-Aktivierung. Stop und ein Wechsel der Vorschau verwerfen noch ausstehende Vorbereitung.

Hover-Texte zeigen verfügbare Taktangaben aus den jeweiligen Bibliotheksdaten. Beim Start bleibt der Quick-Dock verborgen, bis zwei aufeinanderfolgende RAF-Geometrien übereinstimmen. Die frühe Startdiagnose endet nach neun Sekunden und bewahrt höchstens 50 Long-Task-Einträge auf.

```sh
npm ci
npm run build
npm run verify:build
npm run test:consolidation
python3 -m pip install playwright==1.56.0
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:consolidation:browser
node tests/sessions-reviewed-preservation.cjs --historical
node tests/p7-24-preservation.cjs --historical
```

Die beiden `--historical`-Prüfungen benötigen das vollständige Repository mit allen archivierten HTMLs und Artefakten. Die normalen Build-/Host-/Chromium-Prüfungen sind im Quellen-ZIP ausführbar.

Historische Ergebnisdateien werden durch einige Vergleichstests neu geschrieben. Die Freigabemessung erfasst diese Ausgaben unter `results/sessions-reviewed/regression-output/` und stellt anschließend die historischen Bytes wieder her. Der Quellen-ZIP enthält benötigte Vergleichs-HTMLs und aktuelle Messungen; weitere historische HTMLs, alte Screenshots und die ursprüngliche Referenz-HTML stehen im Repository beziehungsweise in den bisherigen und neuen Messdatenarchiven.

[Prüfbericht](docs/sessions-reviewed/report.md) · [Stufenprüfung](docs/hover-review/source-ledger.md). Die Chromium-Prüfungen belegen native WebAudio-PCM und Browserbedienung. Physische Audiogeräte, Opera/PipeWire und langfristige Absturzfreiheit wurden damit nicht geprüft.

Schlussprüfung: 22/22 gezielte Prüfungen auf dem eingefrorenen HTML-Stand bestanden; Vorprüfungen und ihre tatsächlichen Fehlversuche bleiben getrennt nachvollziehbar. Engage nutzt für mehrere Stores eine kompensierende Wiederherstellung; bei anhaltendem Speicherfehler kann diese mit sichtbarem **Restore failed** scheitern. Prüfsummen und vollständige Einordnung stehen im Prüfbericht.
