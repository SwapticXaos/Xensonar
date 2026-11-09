# XenSonar · Agent F · AF-LR01 / Native-Seam-Falsifikation

**Datum:** 2026-11-05 (Berlin)  
**Status:** `NATIVE_BROWSER_SEAM_TESTS_PASS / NATIVE_OFFLINE_PCM_PARITY_BOUNDED / FULL_APP_BLOCKED / ACTUAL_AUDIO_CAUSE_UNRESOLVED`  
**Geltungsbereich:** Isolierte Testkopien, keine Änderung am kanonischen Produkt, an musikalischen Timings, DSP, Storage, One-Shot-Fills oder Nodal-Release-Tails.

## 1. Herkunft und harte Grenzen

- Kanonischer Head: `XenSonar_Compute15_XMEM_MR03E_KEYBOARD_EQ_PERSIST01_MERGED_TEST.html` SHA-256 **`b66cd3784abe27f4263be35c552d4d629841cc28be3cdd953772a9a66f07d6eb`**. Lokal bytegeprüft.
- Bereits vorhandenes instrumentiertes AF-Test-HTML: `XenSonar_AF_PREP_MEASURE01_LR01_TRACE_TEST.html` SHA-256 **`c77682b46de82e7b4f6294e377cae6d27dc2934cfa493c76bf3662b6424355f6`**. Keine neuen Produkt-/HTML-Patches in dieser Runde.
- Browser: **Chromium 144.0.7559.96**, Headless, `about:blank`/disponibles Browserprofil. Die relevante Pump-, Scheduler- und Sample-Trigger-Funktion wird **aus der obigen unveränderten HTML als Originaltext extrahiert**, nicht nachgeschrieben.
- **Native Audiofunktion:** Der isolierte Sample- und PCM-Aufbau erfolgt mittels browsernativem `OfflineAudioContext` mit synthetischem Material. Diese Versuche laufen nicht im vollständigen XenSonar-Programm, nicht in Opera und nicht über einen PipeWire-Sink. Sie sind keine Messung hörbarer Aussetzer.
- Origin-/Browserblockade: `file:`, `data:`, lokale HTTP-Server und per Route abgefangene HTTP(S)-Seiten wurden mit `ERR_BLOCKED_BY_ADMINISTRATOR` zurückgewiesen; `about:blank` ist zugänglich, besitzt aber kein nutzbares `localStorage`. Ein vollständiger XenSonar-App-Test in diesem Browser ist damit nicht aussagekräftig durchführbar. Das verbundene Gerät `Styphon-PC` wurde geprüft und war offline; kein PipeWire-Monitor im Arbeitscontainer vorhanden. Keine vermeintliche native Ubuntu-/Opera-Messung wurde behauptet.

## 2. LR01-C1/C2: Preview-Hold und PCM-Queue

**Experiment:** Originale `__drumPumpBodies()`-Semantik mit der AF-Telemetrie; `requestIdleCallback`/`setTimeout` laufen im echten Browser-Ereignisloop. Ein Testjob rendert 120 ms 330-Hz-Sinus über einen echten OfflineAudioContext. Künstlicher Preview-Hold ist 0/200/800 ms. Die finale positive Cache-Ready-Lead-Markierung ist lediglich eine synthetische Telemetrieprobe, **kein realer `D9.trigger`**.

| Blockierzeit des Preview-Holds | Queue-Wartezeit, gemessen (zwei Runs) | PCM-RMS |
|---:|---:|---:|
| 0 ms | 1,8–8,9 ms | 0,10596147 |
| 200 ms | 213,1 ms | 0,10596147 |
| 800 ms | 826,6–827,1 ms | 0,10596147 |

**Nachweis:** Die originalen Hold-Checks halten PCM-Jobs zurück. Dies erzeugt mit dem vorhandenen 40-ms-Poll einen realen, temperatur-/timerabhängigen Vorbereitungsvorlauf. Nach Freigabe blieb das synthetische Audioergebnis identisch. Ein realer Cache-Miss wird zunächst durch XenSonars Legacy-Synthese wiedergegeben; Queue-Delay allein belegt keinen hörbaren Fehler. Ob die Legacy-Ausweichroute unter echter Live-Last selbst kostet, bleibt offen.

**Offene Gegenhypothesen:** Gleichzeitige Offline-Renderings könnten zusätzlich Audioprozess/CPU belasten; die bestehende Preview-Queue kann unabhängig vom Cache zu CPU-/GC-Spitzen führen; eine spätere Cache-Bereitstellung muss nicht den bereits stattfindenden Angriff beeinflussen. Zu prüfen mit echten `prep-start`, `drum-cache-hit`, `scheduler-action-dispatched` und Ausgabespuren unter unverändertem musikalischem Zustand.

## 3. LR01-C5: Browser-Mainthread-Wake-up und unverändertes `WPe()`

**Experiment:** Originale `WPe()`-Funktion, echte Chromium-`setTimeout`-Callbacks, 120 BPM, nominaler Vorplanungshorizont 720 ms, Step-Dauer 125 ms. Eine blockierende JS-Schleife erzeugt gezielt einen 0/100/300/700/1200-ms-Stall (nicht als Belastungsmethode für Nutzerprofile empfohlen). Das `audioNowSec`-Signal ist hierbei eine aus `performance.now()` erzeugte *synthetische* Audiozeit, kein wirklich mitlaufender AudioContext. Je 2 Runs für 0–700 ms; 3 gesonderte Runs für 1200 ms.

| Eingebrachter Stall | Beobachtete maximale Wake-Lücke | Fehlende Steps im simulierten musikalischen Ablauf |
|---:|---:|---:|
| 0 ms | 26,7–26,9 ms | 0 |
| 100 ms | 125,2–125,3 ms | 0 |
| 300 ms | 325,3 ms | 0 |
| 700 ms | 725,3–725,5 ms | 0 |
| 1200 ms | 1225,2–1225,5 ms | 4 (Steps 12–15, alle 3 Runs) |

**Korrekte Semantik der Stale-Zähler:** `staleSteps=5` im 1200-ms-Test, aber nur vier **innerhalb des bereits laufenden** Ablaufes fehlende Steps. Der fünfte ist die Initialsynchronisierung (Step 0 vor `minAheadSec`) und darf nicht unkritisch als fünf ausgefallene Musikattacken interpretiert werden. Keine doppelten Catch-up-Events.

**Nachweis:** Sehr langer Mainthread-Stall kann die Scheduling-Deadline überschreiten; die unveränderte Stale-Drop-Policy entfernt Steps, statt sie zu spät nachzuholen. **Kein Nachweis**, dass produktive XenSonar-Nutzung vergleichbare Stalls erzeugt. Ausbleibender Drop bei 700 ms im getesteten Phasenwinkel zeigt, dass allein die absolute Stalllänge kein universelles Fehlerschwellwert ist; der Beginn relativ zum bereits geplanten Horizon ist wesentlich.

## 4. LR01-C4: Native WebAudio-Sample-Stimmen und PCM-Parität

**Experiment:** Originale und AF-instrumentierte `triggerSample()`-Funktion (jeweils aus dem echten SHA-geprüften HTML extrahiert). Browsernatives `OfflineAudioContext` mit 48.000 Hz, 1 Sekunde, einer synthetischen 400-Hz-Quelle. Je 25 zukünftige Trigger; vier native Rendervarianten (`Original A`, `Original A/A`, `AF OFF`, `AF ON`), gleiche Testparameter, keine produktive Klangbibliothek. Der Source-Nachweis umfasst die Samplesumme aus gerendertem PCM, nicht eine kontrollierte Lautsprecherausgabe.

- **24 Trigger angenommen, der 25. verworfen**, bevor eine einzige Quelle zu spielen begonnen hat; nach Rendering werden die nativen `ended`-Callbacks verarbeitet.
- AF ON erfasst 24 `sample-admit`, einen `sample-reject-voice-budget` und 24 `sample-ended`.
- Alle vier Läufe haben dieselbe akzeptierte/rejektierte Eventfolge und eine RMS-Abweichung nur im Bereich minimaler Floating-Point-Variation.
- **Keine bitidentische PCM-Behauptung:** Bereits `Original A/A` unterscheidet sich in vielen Float32-LSBs (max. ca. `8,79e-9`); Original-gegen-AF weicht ebenfalls nur auf dieser Größenordnung ab (max. ca. `8,85e-9`). Deshalb wurde auf eine toleranzbasierte Äquivalenzprüfung mit A/A-Negativkontrolle umgestellt. Die Ausführung der Testinstrumentierung verursacht in diesen Bedingungen keine nachgewiesene klanglich relevante Abweichung.

**Nachweisgrenze:** Die 24er-Voice-Grenze umfasst zukunftsgeplante Quellen; das entspricht dem bekannten Sample-Admission-Befund. Keine Schlussfolgerung, dass sie im realen Mix die Ursache eines vom Nutzer gehörten Drum-Aussetzers ist.

## 5. Kausale Trennmatrix für die reale LR01-Aufnahme

| Evidenzkombination | Einordnung | Was NICHT folgt |
|---|---|---|
| Stale-Drop-IDs im relevanten Step + fehlende an Audio übergebene Action-ID + fehlender Attack im Sink | Mainthread-Scheduling **kann** die Attack-Lücke erklären | kein Grund, fehlende Action durch DSP zu kompensieren |
| Preview-Hold, Queue-Wartezeit, spätes PCM-Ready; Legacy-Fallback attackiert normal und Sink ist kontinuierlich | Preparation-Wartezeit ohne hörbaren Fehler | kein Beleg für eine neue Queue-Architektur |
| Action rechtzeitig, Pre-FX-Signal fehlt oder bricht ein | PCM-/Synthese-/Routingkandidat vor Pre-FX | 200-ms-RMS kann sehr kurze Lücke übersehen |
| Pre-FX-PCM vorhanden, Post-FX-PCM abrupt verändert | FX-/Mastering-/Gain-/Limiterkandidat | LCR-Browser-Meter allein nicht framegenau |
| Pre/Post Browser-Signale stabil, Sink-PCM hat Lücke | Browser-Ausgabe / OS-Pipeline / PipeWire-Kandidat | nicht automatisch reiner PipeWire-Bug, bevor Clock-/Resampling-Alignment geprüft |
| Sink-PCM stabil, Kopfhörer-Ausgabe oder Wahrnehmung fehlerhaft | Downstream-Gerät/Abhörweg als Hypothese | Loopback allein ist kein Lautsprecher-Messgerät |

Für reale Ursachenlokalisierung sind **dieselbe Session**, festgehaltene BPM/Polymetrik/Soundzustände und eine gemessene Zuordnung von AF-`performance.now()` zum PCM-Sampleindex notwendig. Die unveränderte Anwendung hat LCR-1A-Pre/Post/Master-Meter mit 200-ms-Abtastung. Diese sind hilfreich zur groben Lokalisierung, **nicht** zur framegenauen Click-Analyse. Eine ±250-ms-Koinzidenz allein ist kein Kausalbeweis.

## 6. Reproduktion / Artefakte

Dieses ZIP enthält unveränderte kanonische und instrumentierte HTML-Dateien, die Read-only-Extraktionsharnesses, native Chromium-Ergebnis-JSONs und einen erweiterten Offline-AF-Cohort-Comparator. Es gibt **keinen neuen instrumentierten HTML-Patch**; der vorherige AF-PREP-Stand wird wiederverwendet.

```bash
sha256sum XenSonar_Compute15_XMEM_MR03E_KEYBOARD_EQ_PERSIST01_MERGED_TEST.html
sha256sum XenSonar_AF_PREP_MEASURE01_LR01_TRACE_TEST.html
python3 af_lr01_native_seam.py
python3 af_lr01_native_sample_pcm.py
python3 compare_af_lr01_runs.py C0:run00.json C1:run01.json C2:run02.json --out LR01_comparison.json
```

Die beiden nativen Prüfskripte benötigen Playwright für Python und ein lokal vorhandenes Chromium; sie erstellen **nur** temporäre `about:blank`-Seiten, keine Projekt-, Storage- oder Output-Änderung. Der Cohort-Comparator behandelt AF-/LCR-Spuren als Browser-Evidenz und stoppt vor `AUDIO_APPROVED`. Ein Test mit einem tatsächlichen Ubuntu-/Opera-Profil verlangt separat die AF-/LCR-JSON-Traces und eine dokumentiert synchronisierte PipeWire-Loopback-WAV-Datei. Verwendete externe Geräte, Audio-Profile, Sink-Namen und Sample-Rates sind nicht geraten oder vorgegeben.

## 7. Patch-Entscheidung

**Kein Produktpatch freigeben.** Die aktuelle Evidenz unterstützt drei **technische Kausalkandidaten**; der tatsächlich hörbare Pfad ist unentschieden.

1. `P0`: LR01-C0/C1/C2 auf dem echten Ubuntu-Gerät mit identischer Session, jeweils mehrere Wiederholungen und AF+LCR-Export; zusätzlich externer Sink-PCM-Trace.
2. `P0`: Gezieltes Voice-Admission-Repro mit 23/24/25 echten Sample-Triggern, nur disponibler Testzustand. Sample-Limit-Reparatur erst, wenn echte Attacken betroffen sind; keine Tail-Wegnahme.
3. `P1`: Falls Scheduler-IDs fehlen und Sink-Lücke übereinstimmt, ein eng begrenztes Zulieferungs-/Abgabeverhalten prüfen. **Keine** neue Scheduler-Architektur ohne Gegenbeweis.
4. `P1`: Falls Preview-Hold unter Live-Last Prewarm in die musikalische Deadline drückt, gezielte Cancel-/Queue-Fairness prüfen. Kein unnötiger Audio-Hotpath oder EQ-Morph-/One-Shot-Änderung.

**Freigabe-Votum:** `INTERNAL_MECHANISMS_PROVEN / NO_USER-AUDIBLE_CAUSAL_CLEARANCE / NATIVE_OPERA_PIPEWIRE_REQUIRED`.
