# Mikrofon als Donor-Quelle

Aktueller Build: `Xensonar_N21_F2_Microphone_Test.html`.

1. **II. Material Forge → SpectralForge** öffnen.
2. Bei **Sound Material · Donor**, direkt neben **Import Audio**, auf **● Mikrofon** klicken und die Browser-Mikrofonberechtigung erlauben.
3. Sprechen oder ein Geräusch aufnehmen. **■ Stop** beendet die Aufnahme und lädt sie in denselben Importbereich wie eine Audiodatei.
4. Die Donor-Maske und die vorhandenen Anhör-/Donor-Aktionen wie beim Dateiimport verwenden.

**Verwerfen** behält die bisherige Quelle. Die Aufnahme endet spätestens nach 60 Sekunden. Beim Raumwechsel und beim Verlassen der Seite wird ein laufender Mitschnitt abgebrochen und das Mikrofon freigegeben. Es gibt kein Live-Monitoring. HTTPS oder localhost und Browser-Unterstützung für Mikrofon/MediaRecorder sind erforderlich; lokale HTML-Dateien hängen von den Browserberechtigungen ab.

```sh
npm ci
npm run build
npm run test:microphone
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:microphone:browser
```

Details: `docs/microphone-report.md`; Messdaten: `results/microphone/`.
