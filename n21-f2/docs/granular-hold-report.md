# XenSonar N21–F2 · Granular Sample Hold – Prüfbericht

Stand: 18.10.2026. Implementierung und automatisierte Prüfung abgeschlossen;
physische Hör-/Opera-/Hardwareabnahme steht aus.

## Lieferstand und Basis

- Basis ist ausschließlich das vom Nutzer hochgeladene
  `XenSonar_N21_F2_Merge_Schlanke_Quellen_NEU.zip`.
- Der ursprüngliche Build wurde vor Änderungen bytegenau verifiziert:
  SHA-256 `83115d6e635efcb8f834a992d33b205b71e36859679ac24116d73fa51757b62a`,
  5.484.078 Byte. Der ältere Root-Stand 3.1.6 wurde nicht als Audio-Basis benutzt.
- Neuer Standalone-Build: `Xensonar_N21_F2_Granular_Sample_Hold_Test.html`,
  5,495,426 Byte, SHA-256 `2c53f8b3a68a3ba94a3a87c085942f393b77d7ab366f5f1d6155252ea81288e1`.
- `Xensonar_direct_test_latest.html` im Repository-Root ist eine identische Kopie.
- Die vollständige produktive Quelle liegt in `n21-f2/`. Das Quell-ZIP enthält
  Build, Manifest, Paket-Lockfile, Tests, Werkzeuge, Beispiele, Prüfresultate und HTML,
  ohne node_modules. Kein Commit/Push und keine Veröffentlichung wurden ausgeführt.

## Musikalisches Verhalten

Samples laufen zunächst auf dem bisherigen direkten Abspielpfad. Apostroph/Akut
überblendet die aktuell klingenden manuellen Sample-Stimmen in den vorhandenen
RFL-Grain-Renderer. Dabei wird ausschließlich die Quellzeit zunehmend langsamer.
Die vor dem Hold durch die Stimmung gewählte Grain-Abspielrate bleibt bestehen;
Pitch-/Formantbewegungen im aufgenommenen PCM werden zeitlich mit gedehnt.

Die Quellbewegung folgt einer stetigen exponentiellen Abbremsung mit maximal
1,25 Sekunden Zeitkonstante. Die Position läuft monoton gegen eine innerhalb
des Samples liegende Region. Am Sample-Ende wird höchstens um ein Grain-Fenster
zurückgegriffen und überblendet. Es wird kein harter Mikro-Loop eingeschaltet.
Die bestehende Fensterpolitik ergibt regulär etwa 128 ms Grain-Länge mit 50 %
Überlappung; kurze Samples begrenzen diese Länge auf den verfügbaren Bereich.
Eine begrenzte Wellenformkorrelation richtet Überlappungen phasenbezogen aus.

Loslassen schließt zuerst das Voice-Gate/Scheduling und blendet das Sample in
20 ms aus. Auch vorzeitiges Verkürzen bleibt möglich. Neue Samples während eines
bereits aktiven Holds werden einbezogen. Natürliche BufferSource-Enden räumen
gehaltene Stimmen nicht vorzeitig ab; Grain-Knoten und Admission-Leases werden
beim wirklichen Ende einmalig freigegeben. Nodal erhält in diesem Patch keine
neue Verlängerung; dessen bestehender selektiver Stopp bleibt erhalten.

## Architektur und Lastgrenzen

Die Inventarisierung vor dem Patch steht in `docs/granular-hold-architecture.md`.
`i6`/`_ne` besitzen nun eine optionale Quellpositionsfunktion; `c6` und dessen
Hann-Fenster rendern unverändert. `__xenAlignGrainSource` ist ein begrenzter
Vorbereitungsschritt auf dem Kontrollthread, keine zweite Granular-Engine.
Der Adapter liegt lesbar in `src/audio/05_sample_granular_hold.js`.

Es gibt einen 25-ms-Lookahead-Timer je aktivem Audiokontext, maximal vier neue
Grains je Stimme und 64 je Tick. Überfällige Grains werden übersprungen. Bei
geschlossenem Gate erfolgt keine weitere Planung. Der Patch ergänzt keine
Allokationen, Nachrichten oder Berechnungen in einem AudioWorklet-`process()`.
RFL-Uhr und globale Granular-Manager-Einstellungen werden nicht mit dem Hold
verbunden. Beat, Bass und Materialpfade behalten ihre Besitzer und Prioritäten.
Die zulässige Polyphonie hängt weiter von der bestehenden Admission ab; acht
zeitgleiche Sample-Stimmen wurden im echten WebAudio-Renderer geprüft.
Eine Deadline-Garantie bei beliebiger Browser-/Hardwarelast wird nicht behauptet.

## Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| Originale Quellen → ursprüngliche Übergabe-HTML | bytegenau bestanden |
| Neuer Build und `node build.cjs --verify` | bestanden, 191 JS-Quellmodule |
| `npm run test:granular` | bestanden: Kurve, fester Grain-Pitch, Polyphonie, EOF, keine Catch-up-Bursts, Gate, Cleanup sowie bisheriger Nodal-/Sample-Stopp |
| `npm run test:merge` | alle sieben Kommandos bestanden; Forge PlaySafe, 42×34 Save/Play, Navigation, Quick Access und explizite Quellanker |
| `npm run test:p4c2-n21` | **65/65 Prüfkommandos bestanden**, vollständiger Host-/DSP-/Worker-Lauf einschließlich Build; keine Übersetzung des früher unterbrochenen 57er-Laufs |
| `npm run test:granular:browser` | 14 Audio-Szenarien plus zwei echte Tastatur-Szenarien bestanden |
| `XEN_CHROMIUM_PATH=/usr/bin/chromium node tests/p4c2-n21-browser.cjs` | 7 Anwendungs-/Layout-/Interaktionsszenarien bestanden, keine Page-Fehler |
| `python3 tests/forge_save_play_visual.py` | 950/1150/1500 px, DPR 2/1,25/1: Save=Play exakt 42×34 und symmetrische Abstände |
| `npm run map:sources` | Quellindex regeneriert, 191 Quellmodule und 1.017 Abhängigkeitspaare |
| Statischer HTTP-Start und Abruf | HTTP 200, ausgelieferte HTML bytegleich zur Build-Datei |

Der N21-Gesamtlauf prüft produktiven DSP und echte Worker mit dokumentierten
Host-Brücken; er ist kein physischer Browser-Hörtest. Die WebAudio-Prüfungen
verwenden produktive Sample-Cache-, Voice-, Planner-, Renderer- und Releasepfade
in Chromium. Für deterministische Offline-Checkpoints wird nur der
`state`-Lesewert des OfflineAudioContext auf `running` abgebildet; Nodes,
Automationen und PCM-Render sind echte Browser-Implementierungen. Der zusätzliche
Echtzeitfall benutzt einen unveränderten AudioContext und den echten Wallclock-Timer.
Die Hotkey-Fälle senden Apostroph und deutsche Equal-/Akut-Zuordnung an den echten
App-Listener und prüfen den produktiven Hold-/Release-Callback.

Gemessene Details:

- Ohne Hold ist die Test-PCM bytegenau zum ursprünglichen `dAe` aus der ZIP-Basis.
- 220-Hz-Testton bleibt bei 220 Hz, auch bei 44,1/48/96 kHz Quell-/Ausgaberaten,
  rechtsseitigem Stereo-Signal und acht Stimmen.
- Transpositionen: Soll 55/440/880 Hz, gemessen 55/439,75/879,75 Hz.
- Eingebetteter Pitch-Sweep bleibt beweglich: etwa 252,75 → 352,5 → 364,75 Hz
  an den Messfenstern 0,5/3/5 Sekunden. Seine Entwicklung verlangsamt sich.
- Eine unabhängige primäre PCM-Spur bleibt in allen Offline-Szenarien bytegleich,
  einschließlich Hold und Release. Die bestehenden RFL-/Nodal-/C11-Tests bestehen.
- Der Echtzeittest klingt nach dem natürlichen 0,7-s-Ende weiter; nach Release
  ist die gemessene RMS exakt 0. Alle Voice-Leases sind zurückgegeben und der Timer
  ist gestoppt. Initialer Hold-Aufwand dieser Messung: 0.60 ms
  (ein einzelner Cloud-Messwert, kein Hardware-Benchmark).

Die alten Merge-Hashanker bleiben dokumentiert. Nur fünf ausdrücklich benannte
Produktionsdateien bzw. neue Adapter haben neue Anker in
`docs/granular-hold-source-anchors.json`. Die Preservation-Tests erlauben diese
konkrete Erweiterung und halten die übrigen Quellanker fest. Keine Assertions
wurden abgeschaltet. Die systemverwaltete Chromium-Konfiguration sperrt file://;
der Browser-Test stellt dieselbe HTML über eine abgefangene Test-Origin bereit.

## Reproduzieren

Im entpackten Quellverzeichnis (im Repository: `n21-f2/`):

```sh
npm ci
npm run build
npm run verify:build
npm run test:granular
npm run test:merge
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:granular:browser
XEN_CHROMIUM_PATH=/usr/bin/chromium node tests/p4c2-n21-browser.cjs
npm run test:p4c2-n21
```

Node 24.19.0 / npm 11.9.0 und System-Chromium wurden verwendet. Die Dev-Abhängigkeiten
sind durch das bestehende Lockfile festgelegt. Benötigt werden npm-Registry-Zugriff
für `npm ci`, keine neuen Secrets oder externen Audiodienste.

Der Patch bezieht sich auf den Inhalt des Originalordners `XenSonar_N21_F2_Merge/`:
`git apply <Pfad-zum-Patch>` dort ausführen, danach `npm ci && npm run build`.
Generierte HTML und Testresultate werden nicht als große Text-Diffs in den Patch
aufgenommen; die vollständige Lieferung enthält sie separat bzw. im Quell-ZIP.

## Hörabnahme

Die HTML herunterladen, lokal im eigenen Browser öffnen, Audio wie gewohnt
aktivieren und ein Sample als Keyboard- oder Wellenstarterquelle wählen. Während
es klingt Apostroph/Akut drücken und mehrere Sekunden halten; dann loslassen.
Danach kurz antippen und loslassen, um den vorzeitigen Cut zu prüfen. Auch nahe
am Sample-Ende und mit mehreren Stimmen sowie parallel laufendem RFL/Beat/Bass
gegenhören. Nodal-/Entrophon-/Legacy-Verhalten separat gegen den bisherigen Stand
vergleichen.

`results/granular-hold/normal.wav`, `held.wav`, `tail.wav` und `moving-pitch.wav`
sind aus dem produktiven Browserpfad gerenderte Hörbeispiele. Sie unterstützen
das Gegenhören, ersetzen aber keine Hörbewertung echter musikalischer Samples.
**Eine physische Hörabnahme, Opera-Abnahme und Lastabnahme auf dem Zielgerät wurden
nicht durchgeführt.** Die musikalische Qualität des Übergangs bleibt dort zu
beurteilen; es wird keine perfekte Transparenz für jedes Sample behauptet.

## Cloud-Umgebung

Die aktive N21–F2-Basis liegt unter `/workspace/Xensonar/n21-f2`.
Abhängigkeiten und Browserprüfungen sind in der aktuellen Maschine funktionsfähig.
`install_script` und `start_skill` wurden als Umgebungsentwurf gespeichert,
einschließlich Arbeitsverzeichnis, reproduzierbarer Installation, Build-/Audio-
Checks und optionalem statischen Serverstart. Der bestehende isolierte Checkout
wird benutzt; kein zusätzlicher Git-Worktree ist erforderlich.
Speichern des Entwurfs ist keine Veröffentlichung. Zum Aktivieren die Änderungen
in den Umgebungseinstellungen prüfen/speichern und anschließend veröffentlichen.
Eine Wiederherstellung in einem neuen Cloud-Task ist noch nicht separat geprüft.
