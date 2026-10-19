# XenSonar N21–F2 · begrenzter Wartbarkeits-Patch

Aktueller Stand: `Xensonar_N21_F2_Maintenance_Test.html`.

Dieser Patch verändert vier Verwaltungsfunktionen in drei bestehenden Modulen:

- Mono-/Stereo-Planung ordnet Noten einmal ihren Spuren zu, statt sie für jede Spur erneut zu durchsuchen.
- Teilrendern berechnet unveränderte Notengrenzen einmal vor der Überlappungssuche.
- Gemeinsame Hüllkurvenfelder werden einmal vorbereitet; Volume/Pitch behalten ihre unabhängigen Interpretationen.

Keine neuen Laufzeitmodule, keine UI-/Projektformatänderung. Sämtliche Klangerzeuger, Transportbesitzer und Cache-Schlüssel bleiben erhalten.

```sh
npm ci
npm run build
npm run test:maintenance
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:maintenance:browser
npm run test:p4c2-n21
```

Details: `docs/maintenance-report.md`; Messdaten: `results/maintenance/`.
