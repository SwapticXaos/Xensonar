# Carrier-Frequenzraum · lokale Bearbeitung und explizites Detune

Basis: `ff122aace46dac70ccb625bf1e2d3a1d70e66d33` (Forge Ready).

## Ursache und Korrektur

Exakte importierte Carrier-Tonlinien besitzen eine Raster-Signatur. Nach einem Pinsel-/Morph-Eingriff stimmt diese nicht mehr; der Rasterleser übernimmt. Bei Antonia, Bert und Cecilia benutzte dieser eine andere Frequenzgeometrie: drei Oktaven um einen neu geschätzten Grundton, statt der festen logarithmischen 20–20000-Hz-Achse des Bildes. Eine kleine lokale Änderung konnte deshalb Tonhöhe und Intervallabstände im gesamten Carrier verändern.

Der reproduzierende Test baut einen Akkord aus 220/330/440 Hz auf und verändert eine entfernte Rasterstelle. Vor der Korrektur ändern sich dessen unberührte Frequenzen stark. Der normale Leser verwendet jetzt dieselbe absolute Hz-Abbildung wie das Bild. Eine lokale logarithmische Peak-Interpolation reduziert zusätzlich die Rundung auf ganze Rasterzeilen. Die bisherigen Oszillatoren, Hüllkurven, Stimmverwaltung und Mischung bleiben unverändert; eine AST-Prüfung friert den gesamten Synthese-Modultext außerhalb der beiden Pitch-Leser ein.

Die übrigen Carrier-Leser wurden ebenfalls geprüft. HarmonicXplorE und Spektral-Synthese benutzen bereits die absolute Achse; Emilia/Fractalia verwenden absolute Tonlinien oder frequenzrichtige Support-Bänder. Ihre Klangalgorithmen wurden nicht vereinheitlicht oder ersetzt.

## Expliziter experimenteller Effekt

`Detune` befindet sich beim unteren Play im Synth Lab. Aus bedeutet feste Hz-Zuordnung. Ein aktiver Stärkeregler mischt im logarithmischen Frequenzraum zwischen absoluter Abbildung und der bisherigen Drei-Oktaven-Formel. Das Zentrum ergibt sich aus der vorhandenen energiegewichteten Root-Schätzung. Die neue Stufe verwendet die alte relative Formel weiter, jetzt ausdrücklich und dosierbar. Bei voller Stärke bleiben globales Zusammenziehen und Neuzentrieren absichtlich möglich.

Die Umformung liegt einmalig im Aufbau der privaten Renderkopie und wirkt damit auf alle acht Carrier-Maschinen. Exakte Carrier-Kurven werden als Kurven transformiert; bearbeitete/gewöhnliche Raster werden in die neue Frequenzlage projiziert. Das Autorenbild, Timing und Notendauern bleiben erhalten. Der Modus 0 gibt die Renderkopie unverändert zurück und benötigt keine zusätzliche Bildtransformation. Überlagerte Rasterwerte werden mit Maximum statt Summation zusammengeführt, damit die Kompression keine addierten Pegelspitzen erzeugt. Die Frequenzen bleiben innerhalb der Bildgrenzen.

`carrierDetune` gehört zu Projekt-Snapshot, Restore, Undo/Redo und zum Audio-Cache-Schlüssel. Alte Projekte ohne Feld verwenden 0. Die ursprüngliche Hz-Achse wird nicht verschoben; der Effekt ist hörbar und am Schalter erkennbar. Er wird nicht in das Autorenbild eingebrannt. Donor-/Referenz-Wiedergabe hat einen anderen Signalweg; dort wird dieser Carrier-Control ausgeblendet.

Der untere Play-Button übernimmt jetzt denselben Bereitschafts- und Fortschrittszustand wie der obere: beim Neuberechnen grau mit Füllstand unter 100 %, vollgrün erst beim passenden fertigen Puffer. Damit zeigt auch der Play-Button direkt neben Detune nach einer Effektänderung keine verfrühte Bereitschaft.

## Prüfung

Host-Verträge vergleichen unberührte Tonhöhen und Intervalle nach lokaler Änderung, Unabhängigkeit vom neu geschätzten Grundton, Ausschalten ohne Bildtransformation, kontrollierte Intervallkompression, unveränderte Autoren-Samples, Snapshot-Restore, portable Einstellungsmetadaten, ältere Projekte und Undo. Native Chromium-Tests bedienen Pinsel und Morph mit echten Mausereignissen und prüfen den unveränderten linken Bildbereich und dessen Akkordfrequenzen. Alle acht Maschinen müssen die bearbeitete Figur mit endlichem nichtstillem PCM abspielen. Zusätzlich werden Detune-Stärke, Ausschalten, Bildidentität, Undo/Redo, Bereitschaft und Erreichbarkeit bei 1490/720 px geprüft.

Die Messdaten unterscheiden den absichtlich fehlgeschlagenen Reproduktionstest vom korrigierten Lauf. Bestanden sind außerdem die bestehenden Job-/Fortschrittstests, die aktuelle Auswahl-/Cache-Bereitschaft, Audio-to-Carrier-Verträge, Merge, der native Fortschritts-/Cancel-/Fehler-Browsertest und alle 65 N21-Prüfungen einschließlich reproduzierbarem Build. Der Erhaltungsvertrag umfasst acht bestehende Integrationsdateien und ein neues Modul; die Synthese bleibt außerhalb der beiden Pitch-Leser bytegleich. Frühere Ergebnisdateien und Lieferartefakte bleiben erhalten; aktuelle historische Prüfausgaben liegen unter `results/pitch-space/regression-output/`.

Die feste Rasterhöhe begrenzt die Tonhöhenauflösung bearbeiteter Bilder. Exakte Carrier-Tonlinien behalten ihre höhere Präzision bis zur Rasterbearbeitung. Die Korrektur beseitigt die ungewollte globale Neuskalierung; sie macht ein endliches Raster nicht unendlich fein. Native Chromium-Prüfungen sind von Hörtests auf physischer Hardware und anderen Browsern zu unterscheiden.

Das schlanke Quellenpaket dupliziert vier ältere, von diesen Tests nicht benötigte HTML-Kopien (Granular Hold, Live Stability, Forge Progress, Microphone) nicht erneut. Diese bleiben im Repository und in bisherigen Lieferungen erhalten.
