# XenSonar P7.39 · Combined Nodal / Starter Grid / Startup

**Zwischenstand – Gesamtregression noch offen.** Aktueller Quellenstand mit fokussierten nativen Nachweisen und Messungen; die vollständige native Browser-Gesamtmatrix steht noch aus. Nächste Schritte und Grenzen stehen im [Prüfbericht](docs/combined-startup/report.md).

Direkt öffnen: `Xensonar_P7_39_Combined_Startup_Test.html`. `../Xensonar_direct_test_latest.html` enthält dieselben Bytes. P7.38 und sämtliche älteren veröffentlichten HTML-/Artefaktdateien bleiben als Vergleich erhalten.

Die neue Fassung integriert die gemeinsame Nodal-/Starter-Grid-Übergabe auf Basis von `18fc0331a58fd7528d9f7c071418ebe590bd0b68`. Die beiden P7.38.12-Teilpatches stammen vom selben Vorfahren; sie werden nicht nacheinander angewendet. Die endgültigen Entscheidungen, tatsächlichen nativen Prüfungen und Grenzen stehen im [deutschen Prüfbericht](docs/combined-startup/report.md).

```sh
npm ci
npm run build
npm run verify:build
node tests/combined-startup-preservation.cjs
node tests/sessions-reviewed-preservation.cjs
node tests/p7-24-preservation.cjs
node tools/combined_startup_validate.cjs
XEN_CHROMIUM_PATH=/usr/bin/chromium node tools/combined_startup_validate.cjs --browser
```

Die Matrix enthält weiterhin die bisherigen Host-/Chromium-Verträge, einschließlich der unveränderten historischen P7.24-Song-Verträge. Neue Quellen werden zusätzlich durch ein SHA-gebundenes, exakt reversibles Stufenledger geprüft. Der historische Testpfad erhält die tatsächlich rekonstruierten P7.38-/P7.24-Bytes. Der normale Quellenbeweis benötigt keine Git-Datenbank. Die Varianten `--historical` benötigen das vollständige Repository mit allen alten Artefakten und prüfen zusätzlich die vollständigen historischen Pfade und den unveränderten Präfix von 121 Prüfsummen.

Die Matrix sammelt neu erzeugte Vergleichsergebnisse unter `results/combined-startup/` und stellt im vollständigen Git-Repository anschließend historische Ergebnisdateien bytegenau wieder her. Im entpackten Quellen-ZIP ohne `.git` meldet sie ausdrücklich, dass keine Repository-Historie wiederhergestellt oder vollständig geprüft wird. Der Paketbeweis vergleicht vor den Tests sämtliche entpackten Dateibytes und enthaltenen historischen Vergleichsdateien; die Quellenprüfung läuft vor und nach den Tests. Das Quellen-ZIP enthält alle Test-Fixtures sowie benötigte Vergleichs-HTMLs; historische Screenshots und redundante generierte Kandidaten-HTMLs bleiben im Repository beziehungsweise in den Messdatenarchiven. Das Messdaten-ZIP dokumentiert native IndexedDB-, Audio- und Startmessungen mit ihren jeweiligen Grenzen. Physische Audioausgabe, tatsächliche Opera-/Firefox-Hardware und universelle Absturzfreiheit sind daraus nicht ableitbar.
