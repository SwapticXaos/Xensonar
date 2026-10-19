# Audio to Carrier

Aktueller Build: `Xensonar_N21_F2_Audio_Carrier_Test.html`.

Vier Wege zur Carrier-Figur bleiben verfügbar: **Malen**, **Import Image**, **Melodic Loop → Send to Spectral Forge** und neu **Audio to Carrier**.

1. **II. Material Forge → SpectralForge → Sound Material · Donor** öffnen.
2. **Import Audio** verwenden oder mit **Mikrofon** aufnehmen und stoppen.
3. In der unteren **Fine Selection** den gewünschten Ausschnitt wählen (0,12–60 Sekunden).
4. Neben der Mikrofonaufnahme **Transform to Carrier** anklicken. Der echte Analysefortschritt erscheint im Button; ein erneuter Klick bricht ab.
5. Die erzeugten dünnen Grundtonlinien lassen sich im Carrier weiterbearbeiten und anhören. Die vorherige Figur kann mit **Undo** wiederhergestellt werden. Die Raw-Audio-Quelle bleibt im Importbereich erhalten.

Unter **Audio to Carrier · Filter**: maximal gleichzeitige Töne (Standard 4, bis 6), Rauschschwelle, Erkennungsstrenge, Mindest-Tonlänge und Tonbereich. Bei leiser Stimme die Rauschschwelle absenken; bei Störlinien Strenge oder Mindestlänge erhöhen. Für Einzelmelodien kann die Tonanzahl auf 1 gesetzt werden.

Auch Akkorde werden analysiert. Die Erkennung ist eine harmonische Schätzung: dichte Mischungen, stark verrauschte Aufnahmen und gleichzeitig gespielte Oktaven können mehrdeutig sein. Das Ergebnis enthält Tonhöhenverläufe mit neutralem Pegel, keine kopierte Klangfarbe und kein Obertonspektrum der Aufnahme. Die Analyserasterung beträgt 20 ms; kurze Anschläge können gegenüber der Aufnahme verbreitert oder ausgelassen werden.

Die vorhandenen Klangerzeuger bleiben verfügbar. Audio to Carrier wählt zunächst die neutrale Carrier-Wiedergabe; anschließend kann die Figur wie gewohnt mit einer anderen Klangmaschine gestaltet werden.

```sh
npm ci
npm run build
npm run test:audio-carrier
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:audio-carrier:browser
```

Prüfbericht: `docs/audio-carrier-report.md`; Nachweise: `results/audio-carrier/`.
