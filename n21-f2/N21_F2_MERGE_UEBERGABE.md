# XenSonar N21–F2: PlaySafe × Live Length × Quick Access

Stand: 18.10.2026. Quell-Merge aus zwei unabhängigen Zweigen über die gemeinsame N20-Audiobasis.

## Merge-Entscheidung

- Gemeinsamer Ahne: `XenSonar_F448_S1_P4C2_N20_Shared_Live_Audio_Full_Project.zip`.
- Runtime-/Audio-Grundlage: `XenSonar_F448_S1_P4C2_N21_Live_Length_Quick_Access_Full_Project.zip`.
- Forge-/Navigation-Geber: `XenSonar_N20_F2_Exakte_Play_Save_Symmetrie_Source.zip`.
- N20F2 wurde auf einem parallelen Forge-N20-Zweig entwickelt. Dieser enthält gegenüber N20 Shared Live Audio ältere Fassungen der Nodal-Audio- und Instrumentenvorbereitung. Diese regressiven Stellen wurden **nicht** übernommen.
- Portiert wurden die fünf Forge-/Navigation-Quellmodule, das Forge-Rack-CSS und die zusätzliche Navigations-CSS sowie vier Regressionstests. Die N21-Live-Längenfunktion, die fünf Quick-Access-Spalten und die N20-/N21-Audioengine bleiben erhalten.

## Funktionen

**N20F2:** Forge Play wird grün, sobald genau die PCM-Vorschau verfügbar ist (auch aus Cache); bei veraltetem Cache nicht vorzeitig grün. Save/Play haben 42 × 34 CSS-Pixel, symmetrische Rack-Außenabstände. Forge/Drum-/Melodic-Navigation erhalten.

**N21:** Apostroph-/Akut-Taste kürzt und verlängert manuelle Live-Noten, ohne Beat/Bass/Material/RFL gemeinsam abzubrechen. Nodal/C11 und Samples sind an die selektive Freigabe angebunden. Quick Access mit fünf vertikalen Spalten, linkem Drop-Ziel, ohne redundante rechte Pulssignale oder innere Scrollbar.

## Prüfstand

- **N20F2-Geometrie:** Chromium-Layout bei 950/1150/1500 px sowie DPR 2/1,25/1 erfolgreich; jeweils Play=Save 42×34 px, gleiche Höhe und Außenabstände.
- **N20F2-Cache-/PlayReady-Test, exakte Symmetrie, Navigation:** bestanden.
- **N21-Length-/Quickdock-Tests:** bestanden.
- **Quellvertrag:** 14 N21-Audio/Runtime- und 7 N20F2-Forge/Navigation-Dateien mit SHA-256-Ankern bytegenau geprüft; historische N20-Basis-Diff-Whitelist (10 N21 + 6 Forge) geprüft.
- **Build:** `node build.cjs --verify` bestanden; 190 JS-Module in richtiger Reihenfolge, 26 Style-Einträge, JavaScript-Syntaxprüfung der vollständigen HTML bestanden.
- **N21-Gesamtlauf:** 57 aufeinanderfolgende Teiltests bestanden (darunter N20 gemeinsame Nodal-Kapazität, N21 C11-Abbruch, Live-/Runtime-Freigabe und RFL-Runtime), danach durch Ausführungslimit unterbrochen. **Nicht als vollständige 65/65-Abnahme ausgeben.**
- **Browser:** Vollständiger Anwendungsstart hier nicht nachweisbar: Browser-Administration blockierte file:// und localhost beziehungsweise Test-Origin; `about:blank` erlaubt kein localStorage. Nur die isolierte echte Chromium-Geometrie wurde vollständig gemessen. Physisches Opera-/Hör-A/B bleibt offen.

## Reproduzieren

`node build.cjs --verify` – prüft die gelieferte ausführbare HTML aus den Quellen.

`npm run test:merge` – statische Merge-/Semantik-/Geometrievertrags-, Notenlängen- und Quickdock-Tests. Benötigt für diesen Teil keine externen Node-Pakete.

`python3 tests/forge_save_play_visual.py` – optional echter visueller Chromium-Geometrietest; benötigt Python-Playwright und `/usr/bin/chromium`.

`npm ci` und `npm run test:p4c2-n21` – breitere Regressionen. Für den vollen historischen Testumfang werden außerdem die ursprünglichen großen Beispiel-Dateien benötigt, die das **schlanke** Source-ZIP bewusst nicht enthält. Die hier geprüften Testfälle sind im Paket.

## Quellpaketumfang

Das Source-ZIP enthält vollständige produktive `src/`, `styles/` und `template/`, Build-Skripte, Manifest, Quellindex, Tests, Werkzeuge und die kleinen Beispiele. Es verzichtet auf die zahlreichen alten Standalone-HTML-Versionen, historische Resultate und sehr große F42/F43-Versuchsdaten. Damit bleibt das Instrument standalone nutzbar und die Quellarchitektur reproduzierbar, ohne eine 50-MB-Projektzeitkapsel zu verbreiten.

SHA-256 HTML: `83115d6e635efcb8f834a992d33b205b71e36859679ac24116d73fa51757b62a`.
