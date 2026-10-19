# Wartbarkeit und vorbereitende Audioverwaltung

Basis: Commit `8b3ceb278c54350d8f5df868f5bf3c6a27654dfb`.
Build: `Xensonar_N21_F2_Maintenance_Test.html`, 5.544.465 Bytes.
SHA256: `e1db09b24d076ae8aeb07568cc986bb2c2da80f009d3782889aaea089440a6ed`.

## Konkreter Nutzen und gewählte Grenze

Die Analyse fand wiederholte Vorbereitungsarbeit, für die keine neue Engine-Architektur erforderlich ist. Der Patch verändert genau vier Verwaltungsfunktionen in drei bestehenden Modulen. Er ergänzt keine Laufzeitmodule, erzeugt keine neue Clock und verändert weder Bedienung noch Projektformat. Die getrennten Klanggeneratoren und ihre Klangvielfalt bleiben erhalten.

1. **Spuren-/Kanalplanung:** `__mlAudibleTracks` besucht die Notenliste einmal und erhält die ursprüngliche Reihenfolge der Tracks im Ergebnis. `__mlOutputChannels` gruppiert die relevanten Noten einmal nach Track-ID, bevor es die unveränderten Stereo-Kriterien in derselben Track-/Notenreihenfolge prüft. Bisher wurde die gesamte Notenliste wiederholt je Track durchsucht. Die bisherige konservative Regel bleibt ausdrücklich erhalten: Auch eine gemutete Stereo-Note kann die Stereobreite ihrer ansonsten hörbaren Spur bewahren. Solo-/Mute-Auswahl, gezielte Einzelnoten, Nodal-Breite, vorbereitete Entrophon-Puffer, intrinsische Sample-Stereokanäle und die Drum-Regeln behalten ihr Verhalten.
2. **Teilrender-Grenzen:** `__mlPartialSpan` berechnet Zeitgrenzen der Kandidaten einmal pro Request. Die anschließende Überlappungssuche benutzt diese vorbereiteten Grenzen, statt dieselben Zeitkoordinaten in jeder Suchrunde erneut auszurechnen und die alte/neue Notenliste wieder zusammenzusetzen. Reihenfolge, Release-Sicherheitsabstände, 256-Runden-Grenze, Konvergenztoleranz und Rückfall auf vollständiges Rendern bleiben identisch. Die Vorbereitung bleibt lokal für den Aufruf: kein zusätzlicher Cache mit Invalidierungsrisiko.
3. **Artikulationsfelder:** `resolveNodalArticulationFields` erstellt einen gemeinsamen normalisierten Snapshot der Block-/Instrument-Felder. Volume und Pitch führen danach weiterhin ihre eigenen Interpreter und Bypass-Prüfungen aus. Instrumenteigene Volume-/Pitch-Envelopes bleiben getrennt. Die Nodal-Nullskalierung und die andere bestehende Entrophon-Skalierung bleiben ausdrücklich verschiedene Verträge. Verfasste Felder werden nicht verändert.

Es wurde bewusst kein generisches Synthese-Backend, keine zusätzliche Klassenhierarchie und kein globaler Notenindex eingeführt. Die Verbesserung besteht darin, unveränderte Daten innerhalb eines Requests weniger oft zu durchsuchen bzw. aufzubereiten.

## Vergleich mit dem eingefrorenen vorherigen Code

Das Vorgehen folgt Fable Simplify: Verhalten einfrieren, je einen begrenzten Schritt ändern, gegen unabhängigen vorherigen Code vergleichen und den finalen Diff auf unbeabsichtigte Änderungen prüfen.

Die drei ursprünglichen Quelldateien liegen unverändert unter `tests/fixtures/maintenance-before/`. Ihre Hashes stimmen mit dem vorherigen Commit überein. Die Charakterisierung ruft alte und neue Produktionsfunktionen mit denselben Eingaben auf, statt das erwartete Verhalten aus dem neuen Code nachzubauen.

- 480 Kanalwahl-Vergleiche mit wechselnder Spur-/Notenauswahl, gemuteten Tonstufen, Nodal-/Sample-/Entrophon-Stereoinformationen und Einzelnoten-Auswahl.
- 200 exakte Kurvenvergleiche mit beiden Gain-Verträgen, mehreren unabhängigen Feldern, Volume-/Pitch-Zielfeldern, Array-Eingaben, Bypass-/Disabled-Feldern und enger Range. Zusätzlich Prüfung auf unveränderte verfasste Eingaben.
- 100 exakte Teilrender-Grenzenvergleiche einschließlich Notenlöschung und Rückfallbedingungen.

Im größeren Arbeitsbeispiel werden tatsächliche Operationen gezählt:

| Vorbereitungsarbeit | Vorher | Nachher |
| --- | ---: | ---: |
| Lesen der Noten-Track-Zuordnung, 96 Tracks / 4096 Noten | 397.872 | 4.192 |
| Berechnung von Zeitgrenzen in einer Überlappungskette | 2.402 | 98 |
| Explizite gemeinsame Feldnormalisierung, vier gemeinsame Felder plus zwei eigene Envelopes | 10 | 6 |

Das sind gezählte Arbeitsschritte in den beschriebenen Fällen, keine Behauptung einer pauschal entsprechend höheren Audioleistung. Bei kleinen Projekten fällt der Gewinn geringer aus. Die Synthese selbst wird nicht verändert. Die Kurveninterpreter und ihre interne Validierung laufen weiterhin getrennt.

## Audio und Bedienung

Der native Chromium-/WebAudio-Vergleich verwendet den unmittelbar vorherigen eigenständigen HTML-Build als Referenz. Legacy, Nodal V1/V2 sowie der reale Entrophon-WASM-Pfad liefern exakt identische PCM-Hashes. Gespeicherte/erneut geladene Custom-Instrumente behalten ihre Original-Engines und Kurven. Für Samples erfasst der Test zusätzlich Wiederholungen des alten und neuen Builds, da bereits der alte native Renderpfad minimale Float32-Abweichungen zwischen identischen Wiederholungen zeigt. Die harte Obergrenze beträgt 0,0000001; konkrete Werte stehen in `native-audio.json`. Kanalzahl und Länge stimmen überein, sämtliche PCM-Werte sind endlich.

Der echte Bedienablauf prüft weiterhin Raster-Bypass, tatsächliche Material-/RFL-Hotkeys mit grüner Rückmeldung und Bankwechsel, Nodal-Namen, Custom-Speicherung/-Auswahl und einen gemeinsamen Transport in beiden Ansichten. Bestehende Mono-/Stereo-/Pan-Browserprüfungen sichern auch live verändertes Panning ohne erneutes Rendern ab. Die Nodal-Volume-Hüllkurve erreicht weiterhin exakte Stille.

## Erhaltungsgrenze und Nachvollziehbarkeit

Der Hash-Vertrag umfasst 227 bestehende Quell-/Stil-/Template-Dateien. 224 bleiben unverändert, drei sind explizit freigegebene Verwaltungsdateien. Zusätzlich vergleicht ein AST-gestützter Test innerhalb dieser drei Dateien sämtliche Inhalte außerhalb der vier bearbeiteten Funktionen exakt mit den eingefrorenen Referenzen. Damit bleiben auch die Synthese-, Transport- und Cache-Funktionen in denselben Dateien geschützt. Die Drum-Regeln innerhalb der Kanalwahl wurden beim Diff-Review unverändert belassen.

Historische Baseline-/Ankerdateien bleiben unverändert. Ihre Tests berücksichtigen einen separaten, exakten Maintenance-Hash-Overlay. Der bestehende native Audiovergleich hat lediglich optionale Parameter für Referenz-HTML und Ergebnisverzeichnis erhalten, damit derselbe Test für den alten und neuen Stand wiederverwendet wird.

Die bestehenden 65 Host-/DSP-/Worker-Prüfungen sind vollständig bestanden. Zusätzlich bestanden Workflow-Integrity, Live Controls, UI-Refinement, Merge, Forge-Fortschritt/PCM, Granular-Hold und Live-Stability sowie die genannten Browserprüfungen.

Neue Ergebnisse: `results/maintenance/`. Frische historische Testergebnisse werden dort unter `regression-output/` gesammelt; bereits ausgelieferte Berichte bleiben erhalten. System-Chromium mit echten WebAudio-/Worker-Pfaden ist geprüft; Opera/Firefox und eine subjektive Hardware-Hörabnahme sind hier nicht verfügbar.

```sh
npm run build
npm run test:maintenance
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:maintenance:browser
npm run test:p4c2-n21
npm run test:workflow-integrity
npm run test:live-controls
npm run test:ui-refinement
npm run test:merge
npm run test:forge-progress
npm run test:granular
npm run test:live-stability
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
XEN_CHROMIUM_PATH=/usr/bin/chromium node tests/nodal-envelope-zero-browser.cjs
```
