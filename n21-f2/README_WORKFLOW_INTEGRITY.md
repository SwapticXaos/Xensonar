# XenSonar N21–F2 · Raster und Editor-Workflow

`Xensonar_N21_F2_Workflow_Integrity_Test.html` ist der aktuelle eigenständige Build.

- Raster-Mute umgeht auch Wave-Starter-Snap, Tastatur-Rasterbeschränkungen und Partikel-Quantisierung. Die verfassten Einstellungen bleiben erhalten.
- Material/RFL-Hotkeys stehen direkt hinter der Schnellmenü-Nummer: dunkelgrau in der anderen Bank, grün in der aktiven Bank. Die Taste links neben 1 schaltet die Bank um. Klick und tatsächlicher Hotkey lassen denselben Eintrag kurz grün aufleuchten.
- Melodic Volume/Pan: dünne Linien in Instrumentfarbe bei gleichen Reglermaßen.
- Play / +Drums / nächstes Pattern stehen zusätzlich im geöffneten Blockeditor. Beide Ansichten steuern denselben Transport.
- „Save as Custom Synth Instrument“ speichert den Originalklang mit seinen Kurven als wiederverwendbares Instrument. Auswahl im Instrumentmenü unter Custom Instruments. Das Projekt enthält seine benutzten Klangdefinitionen; Audio-Samples benötigen wie bisher ihre Sample-Dateien bzw. das Workspace-Archiv.
- Nodal: Namenseingabe unmittelbar bei Save Instrument; vorhandener Name zusätzlich oben.

```sh
npm ci
npm run build
npm run verify:build
npm run test:workflow-integrity
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:workflow-integrity:browser
npm run test:p4c2-n21
```

Weitere Details und Messgrenzen: `docs/workflow-integrity-report.md`.
