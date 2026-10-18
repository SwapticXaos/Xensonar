# XenSonar N21–F2 · Live Audio Stability

Stand: 18.10.2026. Basis: der vom Nutzer bestätigte Granular-Hold-Stand
`cf25816353bf2359b4b1d18f7e712bcb2d7b3447` auf `codex/granular-sample-hold`.

## Ergebnis

Ein reproduzierbarer Fehler an ausgewählten RFL-Loop-Grenzen ist behoben.
Der residente RFL-Render ist im isolierten, wiederholten V8-Vergleich deutlich
schneller; seine übergreifende Struktur ist jetzt lesbar in zwei eigenen Modulen.
Der vorhandene Granular-Sample-Hold, die anderen Instrumente, Forge, Navigation
und Quick Access bestehen ihre Regressionen. 65/65 bestehende Host-/DSP-/Worker-
Prüfkommandos bestanden. Es gibt keine Abnahmegarantie für jedes physische
Audiogerät oder jeden Browser.

Neue Test-HTML: `Xensonar_N21_F2_Live_Stability_Test.html`.
SHA-256: `37332089f2aa114b0cc842a4aad6c472327aaebc30cce0b86d23894ad8bdb982`. Größe: 5506979 Byte.
193 produktive Quellmodule, 6.393 indizierte Deklarationen, 1.019 Abhängigkeitspaare.
`Xensonar_direct_test_latest.html` im Repository-Root ist derselbe Build.

## Befund zu den Knacksern bei Root-Wechseln

Der Nutzer grenzt die Knackser auf Tonhöhen-/Root-Wechsel ein. Die Prüfung
konzentrierte sich deshalb zunächst auf drei Hypothesen: fehlerhafte Quellgrenzen,
Sprünge bei der Tonhöhenübergabe und nachgeholte Arbeit unter Last.

Der erste Befund ist konkret reproduzierbar: Eine im gewählten Loop vollständig
stumme Klangregion, hinter der im selben Sample ein lauter Anschlag liegt,
erzeugte in Base und Fragment trotzdem Audio. Grains wurden nur gegen das Ende
der ganzen Datei begrenzt. Bei höherer Abspielrate nach einem Root-Wechsel lasen
sie über das ausgewählte Loop-Ende hinweg. Die eingefrorene Basis produziert im
Regressionstest Signalsprünge um 0,49 und Roh-DSP-Peaks über 3,8; diese Werte sind
vor den bestehenden Ausgangspegeln gemessen und keine Gerätepegel.

`node tests/live-rfl-boundaries.cjs` wurde vor dem Fix rot ausgeführt:
3.411 Überschreitungen der Grain-Grenze im ersten Base-/44,1-kHz-Szenario.
Nach dem Fix: **0 Überschreitungen und 0 unerwünschtes Audio**, Base und Fragment
bei 44,1/48/96 kHz. Die eingefrorene Basis im Test reproduziert den Fehler weiterhin;
damit ist der Test kein bloßer „läuft ohne Fehler“-Check.

Die native Ersatzroute hatte denselben Planungsfehler. Sie erhält jetzt ebenfalls
die ausgewählte Quellgrenze. Grain-Ausblendung und Quelllaufzeit werden gemeinsam
begrenzt, damit eine BufferSource nicht vor dem Ende ihres Hann-Fensters abreißt.
Ein Sample-Abstand am Ende verhindert außerdem, dass die native Interpolation
noch einen Wert hinter der Auswahl beimischt. Der echte Browser-Test wurde an
dieser Randstelle zunächst rot (Restpeak 0,00000612), danach grün mit exaktem
Restpeak 0 in allen sechs nativen Modus-/Sampleraten-Kombinationen.

Das ist ein belegter, zum berichteten Verhalten passender Fehler. Ob er alle
Knackser mit den konkreten musikalischen Samples des Nutzers erklärt, muss dort
noch gegengehört werden. Es wurde kein pauschaler zusätzlicher Limiter oder
Master-Eingriff zur Kaschierung eingebaut.

## Render-Optimierung

Bisher wurden Grenzen, Laufzeiten und Teile der Interpolation für jedes Sample
neu berechnet. Die neue Fassung bereitet Start-/Endframes, Quellschritt und
Fensterschritt einmal je Grain vor und legt sie im festen Grain-Pool ab.
Zukünftige oder bereits beendete Grains werden vor der weiteren Arbeit verworfen.
Mono-Quellen werden auch bei Stereoausgabe nur einmal interpoliert.

Im Render-Hotpath entstehen weiterhin keine neuen Arrays oder Objekte. Der Pool
bleibt auf 1.024 Grains begrenzt. Neue Tabellen belegen etwa 48 KiB zusätzlichen,
festen Speicher pro residentem RFL-Kern. Bei Wiederaufnahme werden verpasste
Fenster auf der Audiozeit-Lattice übersprungen. Es gibt keine Catch-up-Schleife,
die alle verpassten Fenster nachträglich abspielt.

Messung: jeweils sieben abwechselnde, aufgewärmte Läufe für denselben achtsekündigen
Render und dieselbe Folge von Root-Ereignissen. Mediane:

| Modus / Quelle | Basis | Neu | Faktor | maximale PCM-Differenz |
| --- | ---: | ---: | ---: | ---: |
| base / 1 Kanal | 168.96 ms | 49.95 ms | 3.38× | 0.0000000298 |
| base / 2 Kanal | 315.03 ms | 56.05 ms | 5.62× | 0.0000001341 |
| fragment / 1 Kanal | 403.54 ms | 64.21 ms | 6.28× | 0.0000000745 |
| fragment / 2 Kanal | 394.95 ms | 69.68 ms | 5.67× | 0.0000003725 |

Die PCM-Differenzen beziehen sich auf den normalen vollständigen Quellbereich;
die absichtlich korrigierte ausgeschnittene Region wird separat getestet.
Die Differenz bleibt unter 0,0000004. Referenz ist der tatsächliche alte Prozessor,
keine nachgebaute DSP-Formel. Das neue Benchmark-Kommando verlangt mindestens
1,5× Gewinn und eine PCM-Differenz unter 0,000002.

Diese Zahlen messen die Render-Schleife auf der Cloud-Maschine. Sie bedeuten
keine drei- bis sechsmal höhere Polyphonie und keine garantierte Verbesserung auf
jedem Zielgerät. Weitere teure Synthesen, UI, Betriebssystem und Audiotreiber
haben ihre eigenen Kosten.

## Wartbarkeit und erhaltene Grenzen

- `src/audio/rfl/01_resident_worklet.js`: lesbarer, eigenständiger Blob-Prozessor
  mit benannten Kern-/Pool-Klassen und dokumentierter Frame-Vorbereitung.
- `src/audio/rfl/02_fragment_preparation.js`: separat lesbarer Vorbereitungs-Worker.
  Seine sechs Cut-Map-Arrays sind gegen die eingefrorene Basis in Mono/Stereo bei
  drei Sampleraten bytegenau identisch.
- Das Sammelmodul `05_timing_and_admission.js` enthält diese beiden großen
  eingebetteten Minifikate nicht mehr. Die vorhandenen Host-Aliase `fne`/`dne`
  und die Nachrichtenverträge bleiben kompatibel; der Single-File-Build bleibt
  ohne weitere Netzwerkdateien nutzbar.
- Einstellungen, Klang- und Pitchmodelle, bestehende Limits und Beat-/Bass-/
  Material-Besitzer bleiben erhalten. Die Source-Ende-Erweiterung des generischen
  nativen Planers wird gezielt durch RFL gesetzt; andere Sample-Nutzer behalten
  ihren bisherigen Aufruf.
- Die alten Granular-Hold-Hashanker bleiben als historische Basis erhalten.
  Vier explizite produktive Dateien haben zusätzliche Anker in
  `docs/live-stability-source-anchors.json`. Die vorhandenen Preservation-Tests
  berücksichtigen genau diese Erweiterung und halten die übrigen Bereiche fest.
- Der Source-Index-Freshness-Test benutzt jetzt die lokal gepinnte TypeScript-
  Abhängigkeit im temporären Prüfverzeichnis; ein global installierter Compiler
  ist keine Voraussetzung mehr.

## Geprüfte Szenarien

| Kommando / Prüfung | Ergebnis |
| --- | --- |
| `npm run test:live-stability` | 6 Bereichs-, 6 Fallback-, 6 Lebenszyklus- und 6 Worker-Paritätskombinationen bestanden |
| `npm run test:live-stability:browser` | 12 echte Worker/Worklet-Fälle, 6 native WebAudio-Fälle und Echtzeit-Mischlast bestanden |
| `npm run bench:live-stability` | alle 4 relativen Render-Budgets und PCM-Grenzen bestanden |
| `npm run test:p4c2-n21` | 65/65 Host-/DSP-/Worker-Kommandos einschließlich Build bestanden |
| `npm run test:granular` | Sample-Hold, Stopp und selektive Freigabe bestanden |
| `npm run test:granular:browser` | 14 Audio-Szenarien plus beide echten Apostroph-/Akut-Hotkeys bestanden |
| `npm run test:merge` | Forge PlaySafe, Save/Play-Geometrie, Navigation, Längensteuerung, Quick Access und Build bestanden |
| `node tests/rw2-source-index.cjs` | frisch generierter Quellindex bestanden |
| N21-UI-Browserlauf | 7 Layout-/Interaktionsszenarien bestanden |
| Forge-Geometrie | 950/1150/1500 px und DPR 2/1,25/1 bestanden |

Die Lebenszyklusprüfung schickt je Fall 1.550 schnelle Root-Nachrichten, darunter
alte und ungültige Zustände, verwendet unterschiedliche Quell-/Ausgaberaten,
simuliert eine dreisekündige Uhrlücke, wechselt 128-/256-Frame-Quanten und prüft
das vollständige Auslaufen der Tails. Maximal ein Fenster wurde je geprüftem
Quantum nachgeplant; die feste Schranke bleibt acht. Es entstehen keine Faults.

Der echte Echtzeitlauf verwendet einen laufenden AudioContext und zwei
AudioWorklets. Bei 480 Root-Nachrichten und 4 absichtlichen
80-ms-Blockaden des Hauptthreads wurden gemessen:

- 66176 verarbeitete Frames bei 44100 Hz,
- **0 Aussetzer** der unabhängigen nativen Primärspur,
- **0 nicht endliche Werte**, keine Prozessor-Faults,
- maximaler Sample-Schritt der konstanten RFL-Testquelle: 0.00067535.

Im Offline-Browserlauf bleibt die parallel gemischte primäre PCM-Spur in allen
12 Fällen bytegenau erhalten. Die Echtzeitmessung prüft die Browsergraphen unter
künstlicher Last; sie ist keine Messung physischer Geräte-Xruns.
Die bisherigen Grain-Fenster und deren Pegelverlauf bleiben erhalten. Auch kurze
Pegeltäler am Zyklusende können weiterhin Teil dieses gefensterten Verlaufs sein;
es wird keine generell lückenlose oder artefaktfreie Zeitdehnung behauptet.

## Mess- und Entscheidungsliste

| Maßnahme | Entscheidung | Nachweis |
| --- | --- | --- |
| RFL-Quellgrenze resident/native korrigieren | übernommen | alter Stand reproduziert ausgeschlossenen Anschlag; neuer Stand exakt stumm |
| Prozessor/Worker lesbar trennen | übernommen | reine Trennung zunächst PCM-identisch; Cut-Map-Parität eingefroren |
| Frame-/Fensterdaten einmal je Grain vorbereiten | übernommen | wiederholter Gewinn klar über Streuung; PCM-Toleranz eingehalten |
| Mono-Interpolation doppelt berechnen | entfernt | Stereoausgabe aus einer Mono-Interpolation, gleiche PCM-Grenze |
| Globales Pitch-/Gain-Modell verändern, zusätzliche Gesamt-Limiter, pauschal größere Puffer | nicht umgesetzt | dafür ergab diese Prüfung keinen belegten Bedarf; Eingriff hätte andere Spielfunktionen betroffen |

## Reproduzieren und Gegenhören

```sh
cd n21-f2
npm ci
npm run build
npm run verify:build
npm run test:live-stability
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:live-stability:browser
npm run bench:live-stability
npm run test:granular
npm run test:merge
npm run test:p4c2-n21
```

Im entpackten Quell-ZIP entspricht dessen Hauptordner dem Verzeichnis `n21-f2`.
Der neue Patch bezieht sich auf das zuvor gelieferte Granular-Hold-Quell-ZIP, also
auf Commit `cf25816`, nicht erneut auf die ursprüngliche N21–F2-Upload-Basis.
Nach Anwenden des Patches `npm ci && npm run build` ausführen.
Messwerte und Logs liegen in `results/live-stability/`.

Für die Hörabnahme den neuen Stand mit denselben Samples und denselben Loop-
Markierungen wie zuvor vergleichen. Besonders schnelle Root-Sprünge, nahe dem
Loop-Ende liegende Anschläge, mehrfaches Start/Stop und paralleles Spiel mit
Beat/Bass/Materialspur prüfen. Der Apostroph-Sample-Hold gehört zur erhaltenen
Funktion und wurde separat regressionsgeprüft.

**Offen bleibt die physische Hör-/Opera-/Treiber- und Lastabnahme auf dem
Zielgerät.** Der bekannte Grenzfehler ist reproduzierbar behoben; unbekannte
Knackserursachen können mit anderen Materialien oder Gerätekonfigurationen
weiter bestehen. Es wurde kein neues Browser-/Geräteprofil als getestet ausgegeben.
