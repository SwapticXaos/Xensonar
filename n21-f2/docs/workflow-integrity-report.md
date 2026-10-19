# Raster, Instrumentverwaltung und Editor-Workflow

Basis: `26fd50ed8c739fe35bb8db2c29ab55c722cbfb69`.
Aktueller Build: `Xensonar_N21_F2_Workflow_Integrity_Test.html`, 5.543.157 Bytes.
SHA256: `af78fa12bbdeda6e9f79d4856d11929826a94d05c9c2ecbb21eb2bdaff72c24b`.

## Verhalten

Raster-Mute ist jetzt der gemeinsame Live-Bypass. Auch Wave Starter und Cursor-Bewegungen verlieren die Rasterbindung, die Tastatur ignoriert manuelle Raster-Mutes/Offsets und verwendet freie chromatische 12-EDO-Schritte, die Partikel-Quantisierung erzeugt keine Raster-Ereignisse. Der zuvor ergänzte kontinuierliche RFL-Durchlauf bleibt Bestandteil desselben Schalters. Die Tastatur behält die konfigurierte Grundfrequenz, der Pointer bleibt kontinuierlich. Ein gemutetes Raster zeichnet auch keine sichtbaren Rasterlinien/Markierungen. Eigenständige Drum-/Bass-Uhren und explizite Klangmodulationen bleiben eigenständige Instrumentfunktionen.

Der gespeicherte historische Parametername `rootFollowImpulsRasterMuted` bleibt kompatibel. Die verfassten Raster-, Snap-, Tuning- und Quantisierungseinstellungen werden nicht überschrieben. Eine gecachte, schreibgeschützte Live-Sicht schattet nur die Rastereigenschaften ab; dynamische Volume-/Root-Werte werden weiterhin aktuell gelesen. Diese Sicht wird weder gespeichert noch exportiert. Beim Ausschalten des Bypass stehen die verfassten Einstellungen wieder bereit. Bereits ausstehende quantisierte Ereignisse werden beim Bypass verworfen, damit sie nicht später als Audio-Burst nachlaufen. Die gemeinsame Clock wird dabei nicht umgeschrieben.

Material- und RFL-Einträge zeigen den tatsächlich zugewiesenen Bank-Hotkey unmittelbar nach ihrer Schnellmenü-Nummer, ohne Klammern und ohne die Icons zu verschieben. Die Zuweisung folgt der kanonischen Playlist-Reihenfolge; Einträge außerhalb der ersten neun Slots bekommen keinen erfundenen Hotkey. Der Buchstabe ist grün in der aktiven Bank, dunkelgrau in der anderen. Die physische Backquote-Taste links neben 1 schaltet um, einschließlich deutscher ^/°-Beschriftung. Eine Überlappung mit der Apostroph-Halteerkennung bei US-Layouts ist behoben. Die eigentliche Apostroph-/Akzent-Haltetaste bleibt erhalten. Tatsächlicher Hotkey und Klick verwenden dieselbe 220-ms-Rückmeldung auf dem Schnellmenü-Eintrag; schnelle weitere Eingaben ersetzen den einen Cleanup-Timer.

Die Volume-/Pan-Regler im Melodic-Instrumentenrack behalten ihre identischen Maße und Eingabeflächen. Gezeichnet werden dünne 2-px-Linien und kleine Anfasser in der jeweiligen Track-Farbe, ohne violetten Verlauf oder klobige Schattierung. Die übrigen Performance-/Partikel-Mix-Regler verwenden ebenfalls den dünnen Stil.

Die zusätzliche Play-/Drums-/Pattern-Zeile steht im geöffneten Blockeditor neben dessen Aktionen, sowohl für Synth- als auch Sample-Blöcke. Sie ist eine zweite Ansicht derselben bestehenden Transportsteuerung. Start, Vorbereitungsabbruch, Stop, Drum-Zuschaltung und Patternwechsel haben einen Besitzer und dieselben Callbacks. Die obere Anordnung im Number-of-Bars-Bereich bleibt erhalten. Die weiterhin benötigte Breitenmessung zur Ausrichtung der horizontalen Übersicht bleibt bestehen.

Die Nodal-Namenseingabe steht unmittelbar vor Save Instrument. Oben wird der bestehende Name nur angezeigt. Es gibt keine zweite editierbare Namensquelle.

## Custom-Instrumente und risikoarme Refactorings

Der bislang deaktivierte Custom-Synth-Button speichert nun den ursprünglichen Klangerzeuger mit den Block-Kurven und relevanten Quellparametern. Eine benannte Definition erscheint unter Custom Instruments und kann anderen Spuren zugewiesen werden. Legacy, Nodal V1/V2, Entrophon und Samples verwenden weiterhin ihre eigenen Backends. Es erfolgt keine Vereinheitlichung der Synthese und keine automatische Umwandlung in ein Sample.

Projekt-Snapshots enthalten die verwendeten Custom-Definitionen einschließlich aufgenommener Nodal-/Entrophon-Körper. Eine gelöschte globale Bibliothekskopie zerstört daher kein vorhandenes Projekt. Sample-Referenzen behalten den bestehenden Sample-/Workspace-Archiv-Vertrag. Neue Klangdefinitionen bekommen eine eigene Identität; zwei verschiedene Körper aus derselben ursprünglichen Preset-ID überschreiben sich zur Laufzeit nicht. Die unabhängigen Kurvenschichten des gespeicherten Instruments und des später bearbeiteten Blocks bleiben erhalten. Quota-Fehler melden den gescheiterten Speichervorgang, bevor ein Projekt als erfolgreich verändert gilt.

Die Verwaltungsgrenzen sind klein und ausdrücklich:

- Ein gemeinsamer Live-Rastervertrag ersetzt widersprüchliche Einzelprüfungen. Die WeakMap-Sicht vermeidet Parameterkopien pro Audio-/Animationsschritt und erhält unveränderte Eingaben per Identität.
- Eine zustandslose Transport-Komponente ersetzt duplizierte Button-/Callback-Strukturen. Es gibt weiterhin nur ein Phasenabonnement und einen Player.
- Die Legacy-/Sample-Notenplanung normalisiert die relevanten Notenfelder einmal und verwendet sie für Volume und Pitch erneut. Die zeitlichen, klanglichen und Mono-/Stereo-Verträge bleiben erhalten.
- Custom-Definitionen werden vor der Ausführung aufgelöst, ohne die verfassten Noten zu verändern. Bereits aufgelöste Requests bleiben unverändert; unabhängige Bibliothekseinträge invalidieren keine unbeteiligten Stems.
- Hotkey-Anzeige und kurze Rückmeldung hängen an den vorhandenen Adaptern bzw. am bestehenden Keyboard-Dispatcher. Es gibt keine zweite Tastatursteuerung.

Die Grenzen von 48 gespeicherten Instrumenten und acht unabhängigen Feldern pro Definition sind explizit; zu große/ungültige Definitionen werden mit einer Meldung abgewiesen. Bestehende Klangdefinitionen und Presets werden nicht ersetzt.

## Prüfung

Neue Host-Tests prüfen den echten Wave-Starter-Snap, Tastaturrestriktionen, gespeicherte Rasterwiederherstellung, 10.000 identische Live-Sicht-Zugriffe, aktuelle durchgereichte Volumes, eingefrorene Eingaben und das Verwerfen ausstehender Rasterereignisse. Custom-Tests prüfen unabhängige Kurven, JSON-Projekt-Roundtrip, Bibliothekslöschung, getrennte Körperidentitäten, Zyklusabwehr und Quota-Fehler. Hotkey-Tests prüfen physische Layout-Priorität, Sortierung, neun Slots, Adapter-Abmeldung und einen einzigen transienten Timer.

Der Chromium-Test bedient die echten Buttons und den tatsächlichen Keyboard-Dispatcher: Material-Hotkey, Backquote, RFL-Hotkey ergeben genau zwei kurze grüne Impulse; nach 300 ms ist keine Kachel mehr aufgehellt. Icon-Positionen bleiben identisch. Nodal wird tatsächlich gespeichert, in Melodic übertragen, als Custom-Instrument gespeichert und wieder ausgewählt. Die untere Steuerung startet den echten Transport, die obere stoppt denselben Besitzer. Regler sind bei 1740, 1100 und 760 px deckungsgleich, ohne horizontalen Überlauf, und verwenden die tatsächliche Track-Farbe.

Native Offline-WebAudio vergleicht den vorherigen HTML-Build mit dem neuen sowie gespeicherte/erneut geladene Custom-Definitionen nach Löschung der globalen Bibliothekskopie. Legacy, Nodal V1/V2 und der echte Entrophon-WASM-Pfad liefern dabei exakt identische PCM-Hashes. Beim nativen Sample-Pfad variieren bereits identische Wiederholungen des vorherigen Builds um einzelne Float32-Stellen. Deshalb erfasst der Test separate Alt-/Neu-Wiederholungskontrollen und eine strenge absolute PCM-Grenze von 0,0000001 (−140 dBFS), statt falsche Bitidentität zu behaupten. Im dokumentierten Lauf lagen sämtliche Sample-Abweichungen unter 0,000000005. Alle Ausgaben sind endlich und hörbar; Kanalzahl und Länge bleiben gleich.

Die vollständige bestehende Host-/DSP-/Worker-Prüfung besteht mit 65 von 65 Checks. Ergänzend bestanden Merge, Granular-Hold, Live-Stability, Forge-Fortschritt/PCM, Live Controls und UI-Refinement. Die bisherigen Browserprüfungen für Ausrichtung, Raster-PCM, Nodal-Nullhüllkurve, Marker/Logo-Welle und Mono-/Stereo-Transfers bestanden ebenfalls.

Die neuen Messdaten liegen in `results/workflow-integrity/`. Frische Ergebnisse historischer Prüfungen werden dort unter `regression-output/` gesammelt; zuvor ausgelieferte Berichte bleiben unverändert. Der Erhaltungsvertrag umfasst 225 bestehende Quell-/Stil-/Template-Dateien: 207 unverändert, 18 gezielte Änderungen, zwei neue Verwaltungsmodule. Nodal-Synthesekernel, granularer Hold, RFL-Worklet und Worker, Entrophon-WASM, Drone-Klangfarben und Forge-Polytrace bleiben exakt unverändert. Historische Erhaltungstests berücksichtigen ausschließlich die exakt dokumentierten neuen Datei-Hashes, ihre alten Baseline-Dateien bleiben eingefroren.

Opera/Firefox und ein physisches Audiogerät stehen in dieser Umgebung nicht zur Verfügung. Die Browsernachweise stammen aus Chromium mit tatsächlicher WebAudio-/Worker-Ausführung über abgefangenes HTTPS.

```sh
npm run build
npm run verify:build
npm run test:workflow-integrity
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:workflow-integrity:browser
npm run test:p4c2-n21
npm run test:merge
npm run test:granular
npm run test:live-stability
npm run test:forge-progress
npm run test:live-controls
npm run test:ui-refinement
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui-refinement:browser
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-controls:browser
node tests/rw2-source-index.cjs
```
