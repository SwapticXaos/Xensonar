# Astra-Audit: Sol 326 PCM-Tap, Korrektur audit1

Stand: 2026-09-21. Eingang: `Xensonar_326_P0W_PCM_TAP_LAB(1).zip`, SHA-256 `5e915647b335e4d24b5fd1702c26517eef63cc1f5b2715a7808aa5241bc780f3`, 464941 Bytes. Der korrigierte Messstand heißt **326-audit1**. Das Synthese-/Kontrollprotokoll bleibt **p0-w/325-audit1**, das korrigierte Aufnahmeprotokoll heißt **p0-pcm-tap/326-audit1**.

## Entscheidung

Sols Richtung ist sinnvoll: Ein begrenzter Recorder soll die tatsächlich gerenderten Samples während eines Main-Thread-Stalls erfassen. Die ursprüngliche Implementierung war jedoch noch keine zuverlässige Entscheidungsgrundlage. Sie konnte widersprüchliche Metadaten und sogar eine stumme Testsuite als PASS ausgeben. Außerdem überschritt der geplante 1800-ms-Stall die unveränderte 1500-ms-Owner-Lease. Damit wurden Recorderüberlauf und beabsichtigtes Schließen der Engine vermischt.

Diese Fehler sind im isolierten Labor korrigiert. **Die korrigierte Source-/Modellsuite besteht. Ein aktueller Browser-/Geräte-PASS liegt weiterhin nicht vor.** Der nächste produktive Schritt ist der externe W-G1/W-G2-Lauf dieses exakten Artefakts. Kontinuierlicher Root, Patternwechsel, P0-N und Produktintegration folgen erst nach Auswertung der betreffenden Signal- und Lifecycle-Gates.

Falsifikationsfrage: Kann die zusätzliche Messung einen Aussetzer verdecken, selbst den Audiopfad stummschalten, unbegrenzt Speicher/Port-Nachrichten aufbauen oder einen bereits abgeschlossenen Take nachträglich verändern? Die folgenden Gegenproben prüfen genau diese Risiken.

## Was tatsächlich geprüft wurde

Das gesamte Eingangs-ZIP wurde inventarisiert, seine Pfade, CRCs und sein mitgeliefertes SHA-Manifest geprüft; alle 85 Manifesteinträge stimmten. 114 ZIP-Einträge umfassen auch Verzeichnisse. Gegenüber dem vorhandenen Astra-325-Labor waren 71 gelieferte Dateien gleich, 5 geändert und 12 hinzugekommen. Die ursprüngliche Suite wurde erneut ausgeführt und bestand bereits vor unseren Korrekturen. Das zeigt die fehlende Abdeckung der ursprünglichen Tests.

Wichtig: Das ZIP enthält das **Labor**, Provenienz und Berichte, keinen vollständigen neuen Sol-Produktbaum. Sols eigene Behauptung über null Änderungen an seinem gesamten Produkt-`src/` ist dokumentiert, aber anhand dieses ZIP allein nicht unabhängig beweisbar. Unsere eigenen Änderungen liegen ausschließlich im Labor, seinen Übergaben und im Provenienz-Ledger. Ein vollständiger Produktbuild oder neuer Produkt-Typecheck wird nicht behauptet.

26 geschützte Kern-/Referenzdateien wurden gegen Sol 326 **und** Astra 325 byteweise verglichen. Dazu gehören C-Kern, WASM, Synthese-Worklet, bestehender Kontrollclient, Fixtures, W-G1-Verdict und die mitgelieferte 323-Referenz. Sie sind unverändert. WASM-SHA-256:

`8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0`

WASM und nativer Smoke wurden nicht neu kompiliert. Die eingefrorene 320-Oracle wird nicht verändert oder durch neue Host-Timing-Ratios ersetzt.

## Reproduzierte Gegenbeispiele am Original

| ID | Beobachtung | Bedeutung und Korrektur |
|---|---|---|
| F01 | Falsche Samplerate/Kanalzahl, Sequenz 70 und widersprüchliche Endzähler ergaben `frameExact: true`. | Vollständige Prüfung von Scope, Loan, Sequenz, Format, Zeitbereich und Endbilanz. |
| F02 | Ein verspäteter Chunk veränderte einen abgeschlossenen Take von Samplewert 0.25 auf 0.75. | Abschluss entfernt den aktiven Take, bevor das Promise aufgelöst wird. Späte Nachrichten können dessen Daten nicht mehr verändern. |
| F03 | 32 gleichzeitige Takes blieben im Client erhalten. | Genau ein aktiver Take, höchstens zehn Sekunden, begrenzte Chunkliste, Cancel-/Close-Abschluss. |
| F04 | Ein zu kurzer Buffer löste einen unbehandelten `RangeError` aus. | Größe und Generation werden vor Zugriff geprüft; ungültige Aufnahme statt ungefangener Ausnahme. |
| F05 | Stumme normale Takes und eine ungültige Baseline konnten den Gesamt-Verdict bestehen. | Nichtstumme, endliche Baseline; echter Start-Receipt; aktuelle offene Engine; vollständige PCM-Oracle; Fehler- und Provenienzprüfung. |
| F06 | 16 ausgeliehene plus 16 durch erneutes `pool-init` angenommene Puffer ergaben 32 statt maximal 16. | Einmalige Registrierung fester Slots mit Buffer-ID, Zustand und Generation. |
| F07 | Nach 1800 ms ohne Kontrollnachricht ist der Owner bei 1500-ms-Lease terminal geschlossen; Renderframes laufen trotzdem weiter. | Recorderüberlauf durch 1800 ms zurückgehaltene Buffer-Rückgaben bei weiterlaufenden Heartbeats; UI-Stalls separat auf 100/250/500 ms. |

Diese Fälle sind ausführbare Protokoll-/Modellgegenbeispiele. Sie beweisen nicht, dass jeder davon bereits beim menschlichen Spielen aufgetreten ist. Rohresultate: `artifacts/ORIGINAL_326_COUNTEREXAMPLES.json`. Reproduktion mit den archivierten Originalquellen:

```bash
node tools/realtime-p0/tests/probe-original-326.mjs
```

Zusätzlich aus dem Quelltext bestätigt und behoben: explizite PCM-View-Erzeugung innerhalb von `process()`, fehlender Ausschluss paralleler automatischer Proben, unzureichende Tap-Fehlerbehandlung und fehlender Roh-PCM-Export.

## Verbindlicher Messvertrag in 326-audit1

**Puffer und Ownership.** 16 Slots à 4096 Stereo-Float32-Frames, insgesamt 524288 PCM-Bytes. Rückgaben benötigen die passende Slot-ID und Ausleihgeneration. Eine erneute Initialisierung vergrößert den Pool nicht. Maximal ein aktiver Take; seine Hauptthread-Daten sind auf zehn Sekunden begrenzt. Bei 96 kHz sind das maximal 7680000 Bytes für das Take-Array. Fertige Suiten behalten nur ihre fünf definierten Takes.

**Zeit und Integrität.** Start und Chunks verwenden absolute Audio-Renderframes. Abweichende Reihenfolge, falsches Format, fremde Session/Engine/Owner, Überlappung, abgebrochene Aufnahme und widersprüchliche Endbilanz verhindern `frameExact`. Ein Render-Zeitsprung wird an seiner tatsächlichen Position sichtbar. Vollständigkeit und korrekt deklarierter Recorderverlust sind getrennte Eigenschaften: Der absichtliche Überlauf darf eine konsistente Verlustbilanz, aber niemals einen lückenlosen Take melden.

**Signalbeweis.** Die ungestörte Aufnahme sowie 100/250/500-ms-Aufnahmen müssen endliche, nichtstumme Samples enthalten. Jede wird ohne nachträgliche Verschiebung oder Gain-Korrektur gegen ein frisch erzeugtes Programm des unveränderten WASM-Kerns geprüft. Zusätzlich müssen die drei Stall-Takes exakt zur Baseline passen. Damit reicht weder „zweimal dieselbe Stille“ noch ein steigender Renderzähler. Dieser Same-Core-Vergleich prüft die Programmausführung; er ersetzt den separaten 323-A/W-Vergleich in W-G1 nicht.

**Getrennte Fehlereinspeisung.** Der Recorderüberlauf hält ausschließlich Buffer-Rückgaben zurück. Die Engine-Lease bleibt 1500 ms, Heartbeats laufen weiter. Der Take muss explizite Poolverluste, signalrichtige empfangene Abschnitte, eine offene weiterlaufende Engine und wieder nichtstumme Aufnahme nach Rückgabe zeigen. Ein echter Main-Thread-Ausfall über die Lease hinaus gehört zu einer separaten Terminal-Stop-Prüfung. Es wäre falsch, dessen vorgesehenes Verstummen als Recorder- oder Workletversagen zu behandeln.

**Messrouting.** Der Hauptpfad führt wieder direkt `Synth → neutraler Bus → Destination`. Ein paralleler Zweig führt vom Bus zum Tap und weiter über einen Gain-0-Sink zur Destination. Der Tap ist im Labor auf `monitorOnly` gestellt: Er erfasst seine Eingänge und gibt selbst Nullen aus. Ein Tap-`processorerror` invalidiert die Messung, ohne den Hauptpfad über einen ausgefallenen Tap zu führen. Diese Topologie ist implementiert und die Monitor-Ausgabe im Modell geprüft; die tatsächliche Browserroute bleibt Gegenstand von W-G1/W-G2.

**Bedienung und Rohdaten.** Automatische Proben sind gegenseitig ausgeschlossen. Panic bleibt bedienbar und verhindert anschließend einen PASS. `Download PCM evidence` exportiert alle fünf Stereo-Takes zusammen mit Metadaten und Einzel-SHA-256. `harness/unpack-pcm-evidence.mjs` prüft und berechnet die wesentlichen PCM-/Chunk-Prädikate neu und erzeugt Float32-WAVs. Datei-Prüfsummen sichern Konsistenz, nicht die Echtheit eines behaupteten Browserlaufs. Timing und Receipts bleiben angelieferte Ausführungsevidenz.

Lücken im Take-Array enthalten technisch Null-Platzhalter. Die Chunks und Verlustzähler kennzeichnen sie als **nicht aufgenommene Frames**, nicht als gemessene Stille. WAVs solcher Takes heißen ausdrücklich `*_RECORDING_GAPS_OR_INVALID.wav`; sie dürfen nicht als lückenlose Aufnahme angehört oder bewertet werden.

## Tatsächlich ausgeführte Ergebnisse

| Prüfklasse | Ergebnis | Aussagegrenze |
|---|---|---|
| Neue Recorder-/Auswertungstests | 21 benannte Fälle PASS: 7 Tap, 6 Client, 8 Oracle/Export | Node und modellierte Render-/Kontrollzeit |
| Transferbesitz | Echte `structuredClone(..., {transfer})`-Operationen mit abgetrennten Buffern PASS | Kein echter Browser-MessagePort-Deadlinebeweis |
| Synthese-Worklet + WASM + Tap + Client | 100/250/500 ms, je 60000 Frames bei 48 kHz, `maxAbs = 0` | Modellierte Stalls; Long-Task-/W-G1-Felder ausdrücklich Predicate-Fixtures |
| Modellierter Recorderüberlauf | 24000 verlorene Frames korrekt bilanziert; Owner offen; spätere Samples wieder vorhanden | Recorderverlust wird erwartet, nicht als Audio-Take-PASS gewertet |
| Weitere Profile | 44.1/96 kHz bei 500-ms-Modellstall ohne PCM-Abweichung; Tap-Blöcke 64/128/256 | Keine umfassende Geräte-/Browserprofilabnahme |
| Rohdaten-Rückweg | Roundtrip, WAV-Header/Länge, Gap-Dateinamen und manipulierte Daten geprüft | Keine Authentifizierung externer Messungen |
| Geerbte Core-/Safety-Suite | PASS, einschließlich 15 Astra-Regressionen und 6 Transportfällen | Node/WASM/native Offline; kein physischer Audiohost |
| Geschützte Artefakte | 26 Dateien bytegleich; eingefrorener WASM-Hash bestätigt | Gelieferter Laborumfang |
| Projekt-Provenienzprüfung | Exit 0, drei bestehende Warnungen | Statische Projektprüfung |
| Historischer Runtime-Touch-Guard | Exit 1; exakt derselbe Delta wie im vorigen Audit: 133 geändert, 69 hinzu, 20 entfernt | Vergleich gegen historische Projektbaseline, kein grünes Gesamtprojekt |
| Historischer Scope-Guard, `tooling-only` | Exit 1; 1440 geänderte Dateien, 1080 Verletzungen | Historischer Gesamtvergleich bleibt rot; keine Schwelle aufgeweicht |
| Aktueller Browser/Audioausgang | Offen | Kein neuer Browserlauf hier |

Projektprüfungen liefen auf einem rekonstruierten Overlay aus dem verfügbaren vollständigen Astra-325-Stand und diesem Laborpatch. Das ist kein Ersatz für einen nicht mitgelieferten vollständigen Sol-326-Produktbaum. Die genaue aktuelle Patch-Dateiliste und ihre Hashes werden separat mitgeliefert. Sols frische Browserblockade `ERR_BLOCKED_BY_ADMINISTRATOR` bleibt im Original erhalten; sie wurde hier nicht umgangen und ist kein Audiofehlerbefund.

## Was selbst ein erfolgreicher interner Take noch nicht beweist

Ein Tap prüft Samples innerhalb des digitalen Graphen. Eine Überlastung am Ausgabecallback, OS-Audioweg oder Gerät kann außerhalb dieses Messpunkts liegen. Die Web-Audio-Spezifikation trennt Renderquantum und Systemcallback und beschreibt Underruns bei überschrittenem Callbackbudget. `getOutputTimestamp()` beschreibt die Ausgabezeit; die bloße Differenz zu `currentTime` ist keine zuverlässige Output-Latenzmessung. Deshalb kombinieren wir PCM mit Ausgabetimestamps, Browser-/Audiotrace und einer klar lokalisierten Ausgangsaufnahme. [W3C Web Audio](https://www.w3.org/TR/webaudio/)

Ein unbehandelter Processorfehler lässt den betroffenen AudioWorkletNode dauerhaft Stille ausgeben. Das begründet den parallelen Messzweig. Dieser schafft **keine eigene CPU-Isolation**: Synthese, Tap und deren Port-Handler teilen weiterhin den Audiothread. [AudioWorkletNode processorerror](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/processorerror_event)

Der Patch entfernt explizite PCM-View-/Descriptor-Erzeugung aus `process()`. Neue Views bei Buffer-Rückkehr, Transfer-/Clone-Kosten und Laufzeit-GC sind damit nicht verschwunden. Insbesondere laufen Worklet-Message-Handler ebenfalls auf der Audioseite. „Keine Allocation in process“ ist folglich kein belegtes Realtime-Budget. Long Tasks zeigen Hauptthread-Blockaden ab 50 ms und liefern ebenfalls keinen Audio-Callbackbeweis. [W3C Long Tasks](https://www.w3.org/TR/longtasks-1/)

## Konsequenz für W/N/H

W bleibt der nächste prüfbare Kandidat. N löst die hier gefundenen Fehler einer Mess- und Kontrollgrenze nicht automatisch. H bleibt die übergeordnete Architekturhypothese: musikalische Kontrolle außerhalb des Renderkerns, persistente zeitautonome Engine, gleicher klar abgegrenzter Kern für möglichen Browser- oder nativen Host. Ein nativer Offline-Smoke ist kein bereits vorhandener nativer Realtime-Host.

Die verbindliche Arbeitsaufteilung, Akzeptanzkriterien und der kopierbare Sol-Auftrag stehen in `ASTRA_326_NEXT_STEPS_AND_SOL_HANDOFF.md`. Vor diesem externen Nachweis ist eine weitere große DSP-/Root-/Native-Erweiterung schlechter diagnostizierbar. Die direkt notwendige Chefsache war deshalb die Reparatur und Präzisierung der Messinstanz; sie ist umgesetzt.
