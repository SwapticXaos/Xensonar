# Installation: Ballton, gemeinsames Raster und korrigierte Forge-Position

Basis: `f5f01b0fa9b7cd7e3b1db5f167e4bdd6e55b0c30`. Stand: 19.10.2026.
Aktueller Build: `Xensonar_N21_F2_Nodal_Ball_Grid_Test.html`, 5,608,871 Byte.
SHA-256: `e8e63ffe8703fbe3ed683603e880c5e5b8a2970f04cf620e0ed291e98313884d`.

## Save as Sample: vorhandenen Platz verwenden

Der vorherige vertikale Aktionsblock hatte die Überdeckung beseitigt, aber den Root-Follow-Button nach unten gedrückt. Diese Korrektur erfüllte die räumliche Vorgabe nicht. Jetzt sitzt Save as Sample im **vorhandenen Feld unter Loop und links von Carrier Tuning/Volume**. Der Tempo-Bereich besitzt dafür einen eigenen Positionierungsplatz innerhalb seiner bestehenden Höhe; die Zielzeile enthält wieder ausschließlich ihre bisherigen Ziele.

Der Desktop-Test misst vor und nach der Auswahl: **gleiche Rack-Höhe und gleiche absolute Y-Position von Use as Root Follow Loop**, außerdem Save unter Loop, links vom Carrier-Kasten und mit Abstand oberhalb von Root Follow. Gegenprobe mit dem unveränderten f5f01b0-HTML scheitert ausdrücklich am alten Herunterdrücken. Die kompakte Buttonhöhe beträgt 25 px, die Breite 102 px. Bei schmalem Layout greift ein geprüfter Umbruch-Fallback mit eigenen Klickflächen. Rendering-/Speichermeldungen teilen sich die vorhandene Statuszeile und deren vollständigen Tooltip; sie belegen keine neue Zeile und verdecken keine Fehleranzeige.

Die verbesserten Navigator-Cursor und Material-Metadaten bleiben erhalten. Insbesondere gehören die Randgriffe zum Zeitzoom, die Mitte zur Markierung, Alt zur Verschiebung; Raw Audio hat keine exklusive Particle-/Wave-/Drone-Rolle. Frequenzanker und Bars erreichen die vorhandenen Loop-Ziele weiterhin.

## Ballton und Lautstärke

Im Raum **III. Nodal Installation → Installation** sitzt unmittelbar über der Spielfläche **Ball · Y-Ton**. Der Regler macht den bisher nicht sichtbaren `rootLevel`-Pegel der kontinuierlichen Grundton-Stimme zugänglich. Sein bisheriger Standard bleibt **62 %**. Null setzt das tatsächliche Pegelziel auf null; die vorhandene Glättung lässt den Ton kurz ausklingen. Es wird keine künstliche Mindestlautstärke eingesetzt.

Die bisherige Ball-Lautheit (`ballLevel`) betrifft die bewegungsabhängige Klangschicht. Residents und diese Reaktionsschicht bleiben separat regelbar. Der neue Regler ist kein globaler Mute des ganzen Instruments. Der bisherige kontinuierliche Modus bleibt Standard, einschließlich seiner bestehenden Tonhöhen-/Klangbeziehungen.

## Optional: Ton bei Rasterlinien-Kreuzung

„Auslösung → Rasterlinien überqueren“ aktiviert die horizontalen Linien in der Installation. Beim Überqueren erhält die vorhandene Grundton-Stimme einen kurzen Impuls auf der Frequenz der betreffenden Linie. Steht der Ball, entstehen keine weiteren Impulse. Der Klangweg bleibt derselbe bestehende G2-Prozessor; pro Kreuzung werden weder AudioNodes noch neue Stimmen angelegt.

Die Projektion verwendet die **bestehenden Hauptraum-Frequenzen und denselben Frequenzbereich**. Die Ball-Y-Position und die gezeichneten Linien benutzen dieselbe normierte Koordinate. Stumme Stufen werden nicht als aktive Auslöser verwendet. Der gemeinsame Raster-Mute wirkt ebenfalls hier.

Rasterwechsel, Verschiebungen und längere Pausen beginnen mit einer stillen Positionsreferenz. Die Erkennung erzeugt daraus keine künstliche Kreuzung. Eine Pause über 250 ms holt keine alten Noten nach. Kleine Umkehrbewegungen an derselben Linie besitzen eine schmale Hysterese. Bei sehr dichtem Raster/rascher Bewegung wird pro bestehendem Steuerungsintervall die frischeste Kreuzung übernommen; es entsteht keine wartende Notenkette. Der Rasterimpuls klingt über etwa 140 ms plus die bestehende Audioglättung ab. Bei Unterbrechung bleibt die letzte Tonhöhe während des Ausklingens erhalten. Mute verwirft einen laufenden Impuls, damit späteres Aufdrehen ihn nicht wieder startet.

## Ein gemeinsamer Raster-Vertrag

Es gibt keinen zweiten Raster- oder Preset-Speicher. Die kleine Installation-Brücke liest die originalen Nexus-Parameter und verwendet `pEe`/den vorhandenen Frequenzlinien-Cache. **Y6/U6** bleiben Bibliothek und Workbench für beide Räume. Auswahl, Modus, Basisfrequenz und Schritt-Offsets sind dieselben Daten; die Oberfläche weist darauf hin, dass Änderungen auch im Hauptraum gelten.

- **Hauptraum-Raster:** vorhandene Bibliothek einschließlich gespeicherter eigener Raster.
- **Modus:** alle Schritte oder die vorhandenen Modus-Projektionen.
- **Rasterbasis · Hz:** gemeinsamer Frequenzanker.
- **Raster verschieben · Cent:** verschiebt die vorhandenen Schritt-Offsets gemeinsam. Grenzen verschieben alle Schritte um denselben zulässigen Betrag; die Abstände werden nicht zusammengedrückt. Eine ungleichmäßig gestaltete Stimmung bleibt ungleichmäßig erhalten.
- **Raster bearbeiten / Schrittzahl:** öffnet dieselbe Workbench. Deren gemeinsamer Editor unterstützt nun freie gleichmäßige Schrittzahlen **2 bis 256** statt bisher 2 bis 64. Der praktische Grenzwert begrenzt Zeichen-/Verwaltungsarbeit; es ist keine unbeschränkt große Stimmenzahl.

Die vorhandenen Arrays `manualGridStepOffsets` und der gemeinsame Main-Controller besitzen auch die neue Sammelverschiebung. Ein normierter Offset-Helfer wird für Einzel- und Sammeländerungen verwendet. Pro Bearbeitung werden die Offsets einmal berechnet und als ein Update übernommen. Für die Installation werden lediglich abgeleitete Linien zwischengespeichert; die Darstellung bündelt Linien in einem Pfad und zeichnet keine mehrfach belegten Pixelzeilen. Die Bibliothek speichert Raster wie bisher. Tonmodus und Ballpegel folgen dem bestehenden Installation-Mix im laufenden Arbeitsstand; es wird dafür kein neues Projekt-/Instrumentformat eingeführt.

## Erhaltene Klangerzeugung und Prüfungen

Der eingefrorene G2-Kernel aus f5f01b0 liegt als unabhängige Referenz bei. Ohne Rastermodus stimmt das PCM des neuen Kernels **bitgenau** überein: Grundquelle sowie sämtliche elf Prozessorfamilien (Resonator, Formant, Spektralneigung, Wavefolder, Subharmonic, Shimmer, Comb, Grain Blur, Drive, Chorus und Bitcrusher). Die Syntheseverfahren anderer Instrumente, Resident-Bewegung und vorhandene Interaktionsphysik bleiben unverändert.

Aktuelle Programme:

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

Der Host-Gate enthält den aktuellen **G2-Konzepttest**, den tatsächlichen eingebetteten AudioWorklet-Test, Raster-/Pegel-Verträge, Intervall-Erhaltung und die bisherigen Forge-/Projekt-/Live-Checks. Die Quellenprüfung rekonstruiert den vorherigen Stand durch ausschließlich benannte Ersetzungen; alle anderen Quellen und Styles bleiben gegenüber f5f01b0 unverändert. Hinzu kommt genau ein kleines Installation-Modul.

Die Browserprüfung verwendet Chromium mit tatsächlichem Worklet, Decoder und IndexedDB. Sie belegt ein gespeichertes 128-Schritt-Raster, die Eingabe von 127 im gemeinsamen Schritt-Editor, 660 Hz Rasterbasis, eine echte Verschiebung um 120 Cent, identische Einstellungen nach Raumwechsel, null Ballpegel und gemeinsame Stummschaltung. Die Zahl der Audioknoten/Quellen bleibt bei den Kreuzungen gleich. Die Forge-Prüfung misst den freien Button-Platz bei 1490 px; bei 720 px werden Umbruch und Erreichbarkeit geprüft. Alle vier früher gelieferten Patch-Funktionen sowie die acht Carrier-Maschinen bleiben in der Browser-Freigabe enthalten.

Nachweise: `results/nodal-ball-grid/`, mit `host-validation.json`, `browser-validation.json`, `browser.json`, `forge-spatial/browser.json`, Bildern und archivierten Regressionsergebnissen. Die Aggregate nennen den konkreten Build-Hash und abgeschlossene Programme. Frühere Ergebnisdateien und alle bisherigen Artefakte werden unverändert erhalten.

Historische Prüfgrenzen: `myzel_g_dsp.cjs` beschreibt einen älteren G1-Prüfvertrag und scheitert am Spektraltilt-Kriterium auch mit dem unveränderten f5f01b0-Kernel. `myzel_g_seams.cjs` benötigt einen nicht mitgelieferten externen Fix13-Checkout; `myzel_g_gesture.cjs` enthält einen älteren isolierten Ladeaufbau. Diese Programme bleiben als historische Dateien erhalten. Für den aktuellen G2-Stand dienen der gepflegte G2-Konzepttest, der unabhängige PCM-Vergleich und die native Worklet-Prüfung als Nachweise.

Offen bleiben physische Hörproben auf dem eigenen Audiogerät und Dauer-/Opera-/Firefox-/Safari-Prüfungen. Die lokalen Tests belegen keinen entfernten Actions-Lauf. Es gibt keine pauschale Zusicherung vollständiger Fehlerfreiheit oder einer Beschleunigung der gesamten Engine.

## Abschließende Freigabeprüfung

22 Host-/Build-Prüfungen, 8 native Browser-/Build-Prüfungen und alle 65 N21-Regressionsprüfungen bestanden. Merge- und Granular-Suites ebenfalls bestanden. Alle aktuellen Release-Prüfungen beziehen sich auf den oben angegebenen SHA-256. Historische Messdateien wurden unverändert erhalten; die neuen Messergebnisse liegen unter `results/nodal-ball-grid`.
