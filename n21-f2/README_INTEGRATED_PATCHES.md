# Integrierte Nutzer-Patches

Aktueller Single-File-Build: `Xensonar_N21_F2_Integrated_Patches_Test.html`.

Mute-Symbole, zuschaltbare Nodal-Auto-Vorschau, Navigator-Auswahl mit **Save as Sample**, abgesicherter Audio-/OGG-Import und zuverlässige Donor-/Play-Zuordnung sind integriert. Der Sitzungsverlauf teilt unveränderte Speicherblöcke ohne Änderung des Projektformats.

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

Im großen Forge-Navigator ziehen, dann **Save as Sample** verwenden. Alt+Ziehen bleibt Navigation; Auswahl löschen hebt die Markierung auf. Die gespeicherte WAV erscheint in der gemeinsamen Sample-Datenbank. **Auto preview** im Nodal Designer muss nach jedem Öffnen ausdrücklich eingeschaltet werden.

Messwerte, Quellgrenzen und offene Arbeiten: [Prüfbericht](docs/shared-history/report.md). Neue Nachweise liegen unter `results/shared-history/`; ältere Ergebnisse bleiben erhalten.
