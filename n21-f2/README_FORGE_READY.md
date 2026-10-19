# Spectral Forge · gewählte Maschine und verlässliche Bereitschaft

Aktueller Build: `Xensonar_N21_F2_Forge_Ready_Test.html`.

**Transform to Carrier** erzeugt weiterhin Grundtonlinien aus Datei oder Mikrofonaufnahme. Die zuletzt gewählte Klangmaschine und ihre Einstellungen bleiben jetzt erhalten; die Umwandlung setzt nicht mehr auf Antonia zurück. Die bisherige Donor-Klangfarbe wird von der extrahierten Figur getrennt. Die aktive Carrier-Maschine gestaltet das Ergebnis.

Für den Play-Button gilt:

- Grau: noch kein fertiges Ergebnis für die aktuelle Auswahl.
- Grün füllend: Vorbereitung; der Balken bleibt unter 100 %, solange Arbeit läuft. Klick während des Rechnens bricht ab.
- Vollgrün: der aktuelle Audiopuffer liegt bereit; Play nutzt ihn direkt.
- Rot/Pause: Wiedergabe läuft.

Maschinenwahl, Tonhöhen-/Tempo-/Figuränderungen verwerfen die alte Bereitschaft. Automatische Vorbereitung und Play verwenden im aktuellen Forge denselben Renderweg. Ein Cache-Treffer zeigt sofort Bereitschaft; es gibt keine künstliche Wartekurve. Pure Dieter wird ebenfalls automatisch vorbereitet. Nach Laden/Ändern kann zunächst die bestehende kurze Ruhephase für Zeichenwerkzeuge abgewartet werden; der Button bleibt dabei grau.

Vier Carrier-Wege bleiben erhalten: Malen, Import Image, Melodic Loop und Audio to Carrier. Raw Audio, Filter und Undo funktionieren wie zuvor.

```sh
npm ci
npm run build
npm run test:forge-ready
npm run test:forge-ready:browser
npm run test:audio-carrier
```
