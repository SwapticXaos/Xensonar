# Fester Frequenzraum und bewusstes Detune

Aktueller Build: `Xensonar_N21_F2_Pitch_Space_Test.html`.

Malen und Morph behalten jetzt die feste Hz-Zuordnung des Carriers bei. Eine lokale Bearbeitung soll weder den Rest der Melodie neu zentrieren noch dessen Intervalle zusammendrücken. Der Fehler betraf besonders Antonia, Bert und Cecilia nach dem Wechsel von exakten importierten Tonlinien auf die Rasterlesart.

Neben dem unteren **Play** im **Synth Lab** steht **Detune**. Standard: **aus**. Einschalten blendet einen Stärkeregler ein:

- Kleine Werte mischen die experimentelle Verformung dosiert hinzu.
- 100 % komprimiert und zentriert den Frequenzraum mit der bisherigen relativen Drei-Oktaven-Lesart.
- Ausschalten stellt die normale Hz-Zuordnung wieder her.

Detune verändert ausschließlich die zum Rendern vorbereitete Kopie. Das gezeichnete Bild bleibt erhalten. Der Zustand gehört zum Projekt, unterstützt Undo/Redo und ist bei älteren Projekten ohne dieses Feld ausgeschaltet. Der Effekt gilt für die Carrier-Klangmaschinen; bei Donor-/Originalaudio-Wiedergabe wird das Bedienelement ausgeblendet.

Die vorhandene Carrier-Tuning-Steuerung bleibt eine separate gleichmäßige Transposition. Detune ist absichtlich eine Verformung der Intervalle, kein gewöhnlicher Cent-Verstimmer.

```sh
npm ci
npm run build
npm run test:pitch-space
npm run test:pitch-space:browser
```

Details: `docs/pitch-space-report.md`; Messdaten: `results/pitch-space/`.
