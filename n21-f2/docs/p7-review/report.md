# P7-Patchprüfung und konsolidierte Weiterarbeitsbasis

Stand: 20. Oktober 2026. Ausgangscommit: `9decaa217e3c38adebbb6a0298e6e21fba679b05`.

Die Sammlung wurde gegen das exakte zuletzt veröffentlichte Quellarchiv geprüft: SHA-256 `0ef0eb50c84eaa18df4f03fa76959e44a011e6fc6feb1599909cb9cc0bd6e4f5`. Alle vier inneren Archiv-Prüfsummen stimmen. Die 23 Schritte 00–22 wurden auf einer separaten Kopie rekonstruiert; sämtliche Eingangs-, Modul- und Ergebnisprüfsummen stimmen. Die P7.10-Referenz enthält dieselben Schritte 00–21, keinen zusätzlichen Änderungsstand.

**Ergebnis:** Die Funktionskette 00–22 ist mit den unten genannten Korrekturen in die aktive Quellbasis integriert. P7.12 bleibt als ausdrücklich nicht freigegebenes Experiment außerhalb des Builds erhalten. Das ist keine Abnahme seiner Live-Audio-Funktion. Begleitdokumente sind unverändertes Prüfmaterial, keine übergeordneten Arbeitsanweisungen.

Aktuelle HTML: `Xensonar_P7_Reviewed_Test.html` · 5,699,885 Byte.
SHA-256: `d95c86c5d325080a167d1e022fb43243cf6a2db7f04e00e42bed567858e186fa`.

## Entscheidungen je Stufe

| Stufe | Bereich | Entscheidung | Begründung |
|---|---|---|---|
| 00 | Installation: eigener Audio-Schalter, Ballpegel, Startwerte; Effekt-Rack | adaptiert | Neue Installation-Startwerte übernommen; separater Ballpegel und Residents geprüft. Vorherige Quellen als exakte Basis nachgewiesen. |
| 01 | Refucktor-Grundklänge und eigener Drone-Signalweg | adaptiert | Dark Sub und Ethereal Halo übernommen; frühere Drone-Auswahl samt Originalreglern wieder zugänglich gemacht. |
| 02 | Drone Workbench: Wobble, Drive, Flanger, 16-Step-Gate | adaptiert | Eigenständiger AudioNode-Pfad; Kontextwechsel räumt alten Graph vor Neuaufbau auf. |
| 03 | Abgeleitetes Bass-Raster und Grid-Memory-Erweiterungen | übernommen | Kompilierte Tonhöhentabelle, Quantisierung am vorhandenen Bass-Einlass; keine zweite vollständige Rasterbibliothek. |
| 04 | Bass-Raster-Bedienung, optionale Drone-/RFL-Zielquantisierung | übernommen | Optionale Zielverwendung bleibt getrennt; bestehende RFL-Lifecycle-Prüfungen weiter aktiv. |
| 05 | Verknüpfte alternative Raster, Mutes und Bibliotheks-Refresh | adaptiert | Fehlende Referenzen fallen sichtbar zurück; Vorschau verwendet auch bei nicht oktavischen Rastern deren echte Periode. |
| 06 | Drone-Speicherung, Power/Echo-Reset, Navigator-Vorschau | adaptiert | Persistierte Steuertypen validiert; veralteter Vorschauauftrag gibt seinen Ladezustand frei. |
| 07 | Space: temporäre Trennung von Keyboard und Grundton-Verbund | übernommen | Halten, Loslassen ohne Nachholsprung, nächste absichtliche Geste, Blur/Visibility geprüft; Apostroph bleibt eigenständig. |
| 08 | B/Alt-Anschlags-Expression und Bedienhinweise | übernommen | Keyboard-Ausdruck bleibt gegenüber Wave getrennt; keine Behauptung eines Live-VCA für laufende Stimmen. |
| 09 | Verhaltens- und Abgrenzungsprüfungen | adaptiert | Historische Pfade dokumentiert; neue Freigabe nutzt aktive Produktionspfade und klare Ergebnisdateien. |
| 10 | Installation-Prüfung, Abstammung und Quellindex | adaptiert | Quellindex frisch erzeugt; unabhängige Abgrenzung auf Stufen 00–22 plus explizite Korrekturen erweitert. |
| 11 | Violette Navigator-Auswahl, Regionsvorschau, Sample-Name | adaptiert | Gegenwärtige Save-Position erhalten, einzelne Trefferflächen, Vorschau-Stale-Abschluss gehärtet. |
| 12 | Keyboard-Repeat/Pointer-Besitz und Pedal-Rückkehr | übernommen | Wiederholte gehaltene Note verdrängt keine wartende Pointer-Geste; aktueller Pedalmodus später durch 14/22 verfeinert. |
| 13 | Violette Trimgriffe im vergrößerten Forge-Bild | übernommen | Gemeinsamer Auswahlzustand, explizite Zeit-/Pixelabbildung, getrennt vom cyanfarbenen Zoomfenster. |
| 14 | B+linkes Alt: Pedal-/Knob-Modus | adaptiert | Einmalige Umschaltung bis beide Tasten frei sind; Testwartezeit an die spätere 220-ms-Rückkehr aus Stufe 22 angepasst. |
| 15 | Keyboard unabhängig vom Wave-Starter-Schalter | übernommen | Reale Keyboard-Eingabe plus Nodal-/Entrophon-Domänentests; Legacy-Zulassung kann den C11-Pfad verwenden. |
| 16 | Sichtbarkeit Rasterlinie und dunkler Cursorball | übernommen | Darstellung im Main-Room; keine Änderung der Tonhöhenabbildung. |
| 17 | Enough!, Aufnahme verwerfen und Vollbild | adaptiert | Abschluss bindet Recorder und Chunk-Array; verspätete Decode-Erfolge und Fehler dürfen einen neuen Take nicht verändern. |
| 18 | Sample-Database-Verbindungslinien | übernommen | Nur Darstellung, keine Pointer-Hits; Observer/RAF werden beim Schließen entfernt. |
| 19 | Melodic-Navigator: Pointermove nicht einfrieren | übernommen | Gleicher Listener wird beim Aufräumen wieder entfernt; vorhandene Navigator- und Transport-Prüfungen laufen weiter. |
| 20 | Entrophon-Live-Auswahl bei veralteter Revision | adaptiert | Zusätzlich Live-Cache bei Bibliotheksänderung invalidiert; gleiche Instrumentidentität, gespeicherte Kompositions-Snapshots bleiben unverändert. |
| 21 | Material-Vorschau unabhängig vom Instrument-Power | übernommen | Einzelner Audio-Element-Besitzer, Stop/Wechsel/Fehler widerrufen Objekt-URLs; keine zweite Instrument-Engine. |
| 22 | Kompakte Material-Vorschau und weichere Pedalkurve | adaptiert | Fatalen ungequoteten aria-label-Schlüssel im Quellmodul korrigiert; weichere Rückkehr beibehalten. |
| P7.11.1 | Separater White-Screen-Hotfix | übernommen | Isoliert exakt rekonstruierter Fix-Hash 3d84f707…; Reparatur im Quellmodul statt nur in generierter HTML. |
| P7.12 | Experiment: Keyboard-Live-VCA | zurückgestellt | Nicht im Build. Gemeldeter Hörtest fehlgeschlagen, Anschlagsskalierung und nachgeschalteter VCA können sich multiplizieren; alternative/native/Entrophon-Wege sind nicht vollständig abgesichert. |
| P7.10-Referenz | Doppelte frühere Übergabe | bereits enthalten | Alle 22 Patchdateien 00–21 sind bytegleich zur vollständigen Kette; nicht doppelt angewendet. |

## Konkrete Befunde und Korrekturen

1. **Startverhinderung, Stufe 22:** `src/forge_and_melodic/06_note_editor_and_material_tools.js` enthielt `aria-label:` als ungequoteten Objektschlüssel. Der tatsächliche ursprüngliche Modulskript-Parse schlägt fehl. Der isolierte Quellfix ergibt exakt den gelieferten Hotfix-Hash `3d84f707cffbecfb19736194660f13282d006c6186c39a44f3129bfd530705f4`. Der freigegebene Gesamtbuild prüft sein vollständiges Skript zusätzlich mit Node.
2. **Klangvielfalt:** Stufe 01 ließ nur zwei neue Drone-Presets in der UI übrig und ersetzte deren bisherigen Reglerbereich. Die gesamte frühere Palette ist wieder auswählbar; Legacy/Xenpolar verwenden ihre ursprünglichen Steuerelemente, neue Refucktor-Klänge ihre Workbench. Xenpolar-Startparameter bleiben passend zur bisherigen Klangsignatur erhalten.
3. **Veraltete Navigator-Vorschau:** In `__f333PreviewNavigatorSample` konnte ein abgewiesener veralteter Render-Auftrag `previewBusy` stehen lassen. Ein tokengebundener Abschluss räumt ausschließlich seinen eigenen Auftrag auf. Auswahlwechsel während des Renderns wird tatsächlich ausgeführt und geprüft.
4. **Entrophon-Revisionen:** Die neue Fallback-Auflösung erreichte bereits gecachte alte IDs nicht. Bibliotheksänderungen leeren nun ausschließlich den Live-Resolver-Cache. Gleiche Instrumentidentität und separate eingefrorene Snapshot-Objekte werden geprüft. Das ist kein behaupteter Fix der gemeldeten gelegentlichen Wave-/Keyboard-Volume-Kopplung.
5. **Aufnahme-Abschluss:** `pve` übernimmt die Chunk-Array-Identität seines Recorders. Erfolgreiche und fehlgeschlagene verspätete Decoder-Ergebnisse prüfen dieselbe Gültigkeit; ein neuer Recorder schützt seine Aufnahme gegen alte Rückmeldungen. Zusätzlich wird die echte MediaRecorder-Start-/Verwerfen-Folge im Browser geprüft. Der Melodic-Navigator wird mit einem echten Pointer-Drag geprüft; die Auswahl ändert sich ohne Einfrieren.
6. **Nicht oktavische Raster:** `frequencyForDegree` normalisierte den Vorschauanker durch Zweierteilung, auch wenn die tatsächliche Tonhöhentabelle beispielsweise eine Tritave verwendet. Die Normalisierung verwendet nun das Periodenverhältnis des referenzierten Rasters; der Test prüft 440/9 Hz gegen die wirkliche Tabelle.
7. **Persistenz und Lebenszyklus:** Persistierte Drone-Felder werden gemäß ihrem Steuertyp übernommen; ein alter Submix wird vor Neuaufbau für einen anderen AudioContext entsorgt. Keine neue Synthesevereinheitlichung.

Alle zusätzlichen Produktionsänderungen sind als genaue, umkehrbare Ersetzungen in `corrections.json` erfasst. `p7-review-preservation.cjs` rekonstruiert daraus den erklärten Stufe-22-Stand und prüft sämtliche übrigen Quell-, Style- und Template-Hashes gegen den ursprünglichen Commit. Die alten Baseline-JSONs bleiben unverändert. Die Kompatibilitätskette berücksichtigt die deklarierte neue Datei an erster Stelle; alte Abgrenzungsprüfungen behalten ihre übrigen Assertions. Isolierte UI-Tests kennen die neue unaufgerufene Bass-Runtime-Komponente beziehungsweise die dekorative Sample-Rays-Komponente, und der Pedaltest wartet auf die in Stufe 22 ausdrücklich verlangte weichere Rückkehr.

## Grenzen des Expression-Experiments

Die vier P7.12-Vollmodule wurden thematisch gegen P7.11.1 verglichen und ihre gelieferten Hashes geprüft. Der Live-VCA sitzt im Pan-Router, während P7.11 den Keyboard-Ausdruck bereits beim Anschlag skaliert. Ein neuer Ton kann daher zwei verschiedene Gain-Faktoren erhalten. Das Umleiten von `getWaveOutput` sichert außerdem nicht jeden nativen/C11-/Entrophon-Besitzer ab. Der gelieferte Test prüft lediglich simulierte Knoten und besitzt einen fremden absoluten Pfad; er beweist keinen realen B-/Alt-Höreffekt. Deshalb sind diese Module unter `experiment-not-integrated/` dokumentiert und **nicht** in `source-manifest.json` enthalten. Der Syntax-Hotfix ist unabhängig davon übernommen.

B/Alt, Pedal/Knob und Space gehören zur integrierten P7.11-Steuerung. Für bereits klingende Stimmen bleibt die durchgängig geprüfte Live-Expression offen. Eine pauschale Zusage, dieses Problem sei behoben, wäre falsch.

## Freigabeprüfungen

Die ausführbaren Nachweise liegen unter `results/p7-review/`. Host- und Browseraggregate nennen Einstieg, Build-Hash und vollständige Ergebnisse. Die Browserprüfung benutzt Chromium, tatsächliche AudioWorklets, OfflineAudioContext, MediaRecorder und IndexedDB. Beide Refucktor-Grundklänge stimmen im nativen PCM-Vergleich mit der gelieferten Originalfunktion überein; eine neutrale Workbench verändert das Signal nicht. Keine Aussage über physisches Audiogerät, Opera-/Firefox-/Safari-Abnahme oder einen entfernten CI-Lauf.

Wichtige Befehle im Verzeichnis `n21-f2`:

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

Frühere Ergebnisdateien und Artefakte bleiben erhalten. Aktuelle Messungen werden getrennt archiviert. Historische stufenspezifische Ancestry-Tests erwarten ihren jeweiligen Zwischenstand und sind kein Ersatz für den neuen vollständigen Abgrenzungsnachweis.

## Abschließendes Ergebnis

34 Host-/Build-Prüfungen, 9 native Browser-/Build-Prüfungen und alle 65 N21-Regressionsprogramme bestanden. Merge- und Granular-Suites ebenfalls bestanden. Die zuvor roten UI-Isolationstests wurden um die neuen unaufgerufenen Kindkomponenten ergänzt; alle bisherigen fachlichen Assertions bleiben aktiv. Historische Baseline-JSONs und frühere Messdateien sind unverändert erhalten. Die aktuelle Weiterarbeitsbasis enthält die geprüfte P7.11-Funktionskette und den Source-Hotfix; P7.12 ist ausdrücklich zurückgestellt.

Paketprüfung: Das separat entpackte Quellarchiv reproduziert dieselbe HTML-Prüfsumme; Abgrenzungs- und Fehlerfalltests laufen auch dort. Die zusätzliche Leerzeile am Ende der aus Stufe 03 stammenden Addon-Datei bleibt zur exakten Patch-Abstammung erhalten; dies ist die einzige Ausnahme bei `git diff --check` außerhalb generierter HTML/Patchdateien.
