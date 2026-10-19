# Ausgerichtete Live Controls, Raster-Mute und Nodal-Volume-Envelope

Basis: Commit `a5ef47e2c0fdbffe480149fe3559731c9bf61553` (Live Controls).
Testdatei: `Xensonar_N21_F2_UI_Refinement_Test.html`; 5.526.684 Bytes.
SHA256: `378e0211db8d4bf9b7a65a883798cc7c408c7f74e43476b9c8f8238dc67b8002`.

## Bedienung und Anordnung

- **Melodic Loop / Instruments:** Volume und Pan verwenden dieselben Grid-Spalten, Beschriftungsbreiten und nativen Reglermaße. Ihre Eingabeflächen liegen exakt untereinander. Das gilt auch bei „Only You“ und nach dem Zurückschalten auf alle Instrumente. Volume und Pan behalten ihre eigenen Audio-Parameter und Live-Glättung.
- **Play, +Drums, nächstes Drum-Pattern:** Die vorhandenen Bedienelemente stehen jetzt direkt unter Undo/Redo in Number of Bars. Der Play-Button bleibt 44 × 44 px groß. Im Desktop-Layout ändern sich die Maße und Spalten des Number-of-Bars-/Bar-Segments-Racks nicht. Die horizontale Zoom-Leiste bleibt an ihrer bisherigen Zeitachse ausgerichtet.
- **Schnellmenü:** Alle fünf Kategorien haben ein vollständig grünes bzw. rotes Mute-Feld. Die Felder sind 17 px hoch, die darunterliegenden Kategorie-Buttons 34 px. Die zugänglichen Namen und Hinweise benennen die Funktion auch ohne Farberkennung. Linkes und rechtes Schnellmenü verwenden dieselbe Breite wie das Instruments-Rack; ein doppelt berücksichtigter Scrollbar-Abstand auf der rechten Seite ist entfernt.
- **Partikel:** Die individuellen Volume- und Pan-Regler haben gleiche Maße und Beschriftungsbreiten.
- **Drone:** Die Auswahl steht jetzt im eigentlichen Hauptinstrument unter „Drone · Accompaniment · Drive“, bei den bestehenden Zugängen zu Drone Workbench und Mycelium. Neue Starts verwenden „Xenpolar Drone“. „Legacy Drone · Fjord Tape“ steht an zweiter Stelle. Alle 17 Klangoptionen bleiben verfügbar, die Klangfarbe ist weiterhin veränderbar. Die Auswahl verwendet den bisherigen Preset-Handler einschließlich seiner Oberton-Einstellungen. Gespeicherte konkrete Preset-Auswahlen werden nicht umbenannt oder gelöscht.

Bei 1740 und 1600 px Fensterbreite bleibt die Rack-Höhe vor und nach dem Umbau exakt 172,9375 px; bei 1100 px exakt 506,3125 px. Im vorhandenen zweispaltigen Layout (768–1279 px) zieht die dritte, weiterhin 160 px breite Slice-Import-Body-Karte in die bislang freie zweite Spalte, damit sie die Transporttasten nicht überdeckt. Bei schmaler einspaltiger Darstellung (Test: 760 px) fließt die Transportzeile regulär mit und vergrößert das Rack um 52 px. Diese schmale Ausweichdarstellung verhindert überlagerte Bedienelemente; die Desktop-Aufteilung bleibt erhalten.

## Raster-Mute und Verwaltung

Das rote Feld über „Raster“ schaltet das Impulsraster des Root Follow Loop auf einen kontinuierlichen Durchlauf. Es schaltet nicht den RFL selbst stumm. Pattern, Divisionen und Granulationsmodus bleiben im Parameterzustand erhalten; erneutes Einschalten stellt das verfasste Raster wieder her. Ein vollständig stumm geschaltetes Pattern bleibt ohne Bypass stumm und wird mit Bypass ebenfalls durchgängig abgespielt.

Der Bypass ist ein globaler Schalter und wird nicht durch die Auswahl einer anderen Raster-Bank ersetzt. Die vorhandene Transport-Lebensdauer mit Cleanup, Generationenprüfung und Fades übernimmt den Wechsel. Ein phasenerhaltender Hot-Switch wird damit nicht zugesichert. Material-, RFL-, Drum- und Bass-Mute behalten ihre bestehenden Active-/Transport-Verträge.

Die Raster-Policy wird jetzt einmal je Scheduler-Generation vorbereitet statt im Warm-up und bei jedem Tick erneut. Der Test zählt bei 21 Ticks genau eine Kompilierung. Die kontinuierliche Policy wird wiederverwendet. Volume/Pan teilen eine UI- und Mutationsstruktur, Drone-Starts eine Preset-Konfiguration und die Seitenleisten eine gemeinsame CSS-Breitenregel. Die Klanggeneratoren werden dadurch nicht vereinheitlicht. Die bestehenden Mono-/Stereo-Entscheidungen und Melodic-Transferwege bleiben erhalten.

## Nodal: unten bedeutet tatsächliche Null

Der untere Dreieck-Anfasser der **Volume**-Hüllkurve entspricht jetzt Gain 0. Die neutrale Linie bleibt Gain 1, der obere Rand Gain 1,95. Bisher ergab der untere Rand Gain 0,05: Ein ausklingender Sound blieb deshalb hörbar. Die Anzeige benennt nun ausdrücklich „0“, „1×“ und „1.95×“.

Die Korrektur folgt dem tatsächlichen Weg vom gezeichneten Feld über die Instrument-Artikulation bis zur Nodal-Voice. Nodal V1 und V2 geben bei einem verfassten Hüllkurvenwert von exakt null auch nach DC- und Tiefpassfilterung exakt null aus. Der interne Filterzustand läuft weiter. Ohne Volume-Kurve und bei strikt positiven Kurven bleiben die Samples gegenüber dem eingefrorenen vorherigen Kernel exakt identisch. Pitch-Hüllkurven und die bisherige Volume-Skalierung anderer Backends bleiben erhalten; Entrophon wählt diese Skalierung ausdrücklich über den gemeinsamen Resolver.

Die Dateien `envelope-before.log` und `envelope-filter-before.log` dokumentieren die erwarteten fehlgeschlagenen Reproduktionen vor der Korrektur: zuerst den 5-%-Restpegel, dann einen kleinen Filter-Nachlauf nach alleiniger Skalierungskorrektur. `envelope-zero.log` dokumentiert den bestandenen vollständigen Fix.

## Aufnahme-Marker und Ringwelle

Die Randfläche „Click the area to place a marker in the recording“ setzt während einer Aufnahme pro Klick genau einen Marker und löst jetzt dieselbe grüne Ringwelle am Logo aus wie der Logo-Klick. Bisher erzeugte ein Randklick nur eine kleine Welle oben rechts in der Randfläche. Diese separate Welle ist entfernt. Die Logo-Welle wird ausdrücklich bei 50 % / 50 % ihres Logo-Buttons verankert, unabhängig von den Utility-Klassen; ihr Mittelpunkt bleibt beim Vergrößern auf dem tatsächlichen SVG-Logo.

Ein zweiter Fehler ließ den Inhalt der festen Markerfläche bei bestimmten Schnellmenü-Längen auf Höhe null schrumpfen. Übrig blieb nur die 24 px hohe Polsterung des Buttons, bei 20 gespeicherten Einträgen und 1740 × 1000 px erst ab y = 979, also fast außerhalb des Fensters (`marker-area-before.json`). Die Entscheidung zum bereits vorhandenen Dokumentfluss reserviert jetzt mindestens 120 px für den Marker. Lange Listen und die darunterliegende Markerfläche bleiben über den einen Dokument-Scroll erreichbar. Kleine Listen behalten die bisherige feste Randfläche. Nach dem Stoppen der Aufnahme bleibt die Fläche deaktiviert und erzeugt keine Marker.

`marker-before.log` dokumentiert den fehlgeschlagenen Test der fehlenden Logo-Rückmeldung vor dem Fix. Der abschließende Browsertest startet und stoppt die echte Aufnahme, klickt die echten Buttons in sechs Schnellmenü-/Fenster-Konstellationen und prüft Marker-IDs, Zeiten, Trefferfläche und Ringmittelpunkt bei 0, 300 und 900 ms der tatsächlichen CSS-Animation.

## Nachweise und Grenzen

- 65 vorhandene Host-/DSP-/Worker-Prüfungen bestanden, keine fehlgeschlagen. Ergänzend Merge, Granular-Hold, RFL-Live-Stability, Forge-Fortschritt/PCM und Live-Controls-Prüfungen bestanden.
- Echte Chromium-Bedienung: Reglergeometrie in Normal-/Solo-/Wiederherstellungsansicht bei 1740, 1600, 1100 und 760 px; Transportposition und unveränderte Desktop-Rackmaße gegenüber dem vorherigen HTML; fünf Mute-Felder; gleiche Seitenleistenbreiten ohne Überlappung; eindeutiger Drone-Selektor und echte Preset-Callbacks. Keine Browserfehler oder horizontalen Überläufe im geprüften Ablauf.
- Native WebAudio-Prüfung des tatsächlichen RFL: verfasstes Raster → kontinuierlicher Bypass → wiederhergestelltes Raster, jeweils in Flowing und Fragment. Endliche PCM, Testspitzen höchstens 0,17; die wiederhergestellte Energie entspricht dem Ausgangszustand innerhalb 0,00001.
- Nodal V1 und V2 bei 44,1/48/96 kHz: komplett untere Hüllkurve liefert ausschließlich Null-Samples; fallende Hüllkurve ist anfangs hörbar und am Null-Ende exakt still. Ohne bzw. mit strikt positiver Volume-Kurve beträgt die Abweichung zum eingefrorenen vorherigen Kernel exakt null. Zusätzlich serialisierter Produktions-Worklet geprüft: 32.000 Frames, früher Peak 0,03231, Endpeak 0.
- Browser-Test mit echten Dreieck-Ziehbewegungen: unterer Rand wird als −1 gespeichert, Volume-Kurve endet bei Gain 0; Nodal-zu-Melodic-Snapshot und native OfflineAudioContext-Ausgabe geprüft. Beide Anfasser unten ergeben in beiden PCM-Kanälen ausschließlich Null. Pitch-Snapshot unverändert.
- Echte Aufnahme-Marker bei 1740 × 1000 und 1600 × 900 px mit 0, 7, 17, 20 bzw. 30 gespeicherten Einträgen: nichtleere Trefferfläche, genau ein Marker pro Klick, Logo-Rückmeldung auch vom Rand und weniger als 0,1 px Abweichung des Wellenmittelpunkts während der Animation. Nach Aufnahme-Stopp keine neuen Marker.
- Bisherige Audio-/Transfer-Browsertests für Mono/Stereo, Live-Pan und gemeinsame Uhr sowie sieben historische Quickdock-Szenarien bestanden. 96 Vergleiche der 16 bisherigen Drone-Presets behalten ihre bisherigen Automationsergebnisse bei.
- Hash-Vertrag über 225 bestehende Quell-, Stil- und Template-Dateien: 200 unverändert, 25 gezielte Änderungen. Der kleine Nodal-Nullausgang-Fix ist ausdrücklich Teil der geprüften Änderungen. Granular-Hold, RFL-Worklet/Worker, andere Synthesekerne, Drone-Klangfarbenbank und Forge-Polytrace bleiben unverändert. Alte Erhaltungstests akzeptieren nur die exakt hinterlegten neuen Datei-Hashes. Quellindex: 196 Module, 6414 Deklarationen, 1034 Abhängigkeitspaare.

Messdaten und Screenshots: `results/ui-refinement/`. Frische Ausgaben historischer Tests liegen dort in `regression-output/`; die früher ausgelieferten Berichte und Artefakte bleiben erhalten. Verträge: `docs/ui-refinement-baseline-hashes.json` und `docs/ui-refinement-source-anchors.json`.

```sh
npm ci
npm run build
npm run verify:build
npm run test:ui-refinement
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui-refinement:browser
npm run test:p4c2-n21
npm run test:merge
npm run test:granular
npm run test:live-stability
npm run test:forge-progress
npm run test:live-controls
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
node tests/rw2-source-index.cjs
```

Die Browserprüfungen verwenden das installierte Chromium über eine abgefangene HTTPS-Testadresse mit echter WebAudio-/Worker-Ausführung. Opera und Firefox sind nicht installiert; ein eigener Test dort oder eine subjektive Hörabnahme an einem physischen Audiogerät ist nicht erfolgt. Der gespeicherte Cloud-Startentwurf verweist auf den neuen Build und die Prüfungen. Seine Veröffentlichung erfolgt über die Umgebungseinstellungen.
