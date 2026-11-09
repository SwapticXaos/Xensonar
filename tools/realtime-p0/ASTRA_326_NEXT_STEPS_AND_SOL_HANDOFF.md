# Nächste Schritte und Arbeitsaufteilung nach dem 326-Audit

Stand: 2026-09-21. Verbindlicher Messstand: **326-audit1**. Produkt-Goldstand **323**, eingefrorene Performance-Referenz **320**. Dieses Paket ist ein isoliertes Labor, kein neuer Produktrelease.

## Priorisierung und Zuständigkeit

| Schritt | Zuständigkeit | Konkretes Ergebnis | Voraussetzung |
|---|---|---|---|
| Messvertrag, False-PASS-Abwehr, Ownership, Recorder-/Lease-Trennung | Astra; in diesem Audit umgesetzt | Korrigierter ausführbarer Messstand mit 21 gezielten Regressionen und Rohdaten-Rückprüfung | Erledigt auf Source-/Modellebene |
| W-G1 und W-G2 ausführen, Fehler und Rohdaten vollständig einsammeln | Sol auf freigegebenem lokalen Browser-/Audiohost | Browserbericht, fünf Roh-Takes, neu berechneter Bericht, WAVs, Trace und Hostdaten | Genau dieses Artefakt; erlaubter Browserzugang |
| Befund einordnen und verbleibende Audio-/Deadlinegrenze festlegen | Astra | Entscheidung: Messfehler, Synthese-/Lifecyclefehler, Browsercallback oder nachgelagerter Ausgang | Reale W-G1/W-G2-Evidenz; kein Zähler-PASS |
| Kontinuierlichen Root und atomaren Patternwechsel spezifizieren | Astra | Zwei getrennte, präzise Kernverträge mit Negativfällen | Tragfähiger W-Signal-/Lifecycle-Nachweis |
| Diese zwei Kernverträge mechanisch implementieren | Sol; je Vertrag eigener enger Diff, danach Astra-Audit | Source, native/WASM-Tests, reale PCM-/Hörbelege | Vorher spezifizierte Semantik; keine gemeinsame Großmigration |
| Nativen Sidecar als kontrolliertes Gegenexperiment planen | Astra; definierte Hostarbeiten anschließend Sol | Ein realer Audiohost des bestehenden Kerns mit Clock-/Ownership-/Ausgabenachweis | W-Signal-/Lifecycle-Basis; begründete Hostfrage |
| Produkt-Lane/H-Integration und Umschaltung | Astra entscheidet, Sol kann begrenzte Adapter umsetzen | Eindeutige Owner, messbarer Rollback, erhaltene Spielbarkeit | Belastbare Host- und musikalische Gates |

Die Arbeitsaufteilung folgt der Tragweite der Entscheidung. Eine Änderung an musikalischer Semantik, Zeitautorität oder Gate-Bedeutung bleibt Chefsache. Reproduzierbare Ausführung und Umsetzung eines abgeschlossenen Vertrags können an Sol gehen. Große Codebewegungen sind derzeit weniger wertvoll als ein einziger sauberer realer Stall-Take.

## Sofort ausführbarer Auftrag an Sol

> Arbeite mit dem korrigierten ZIP `Xensonar_326_P0W_PCM_TAP_LAB.zip`, Stand 326-audit1. Lies zuerst `tools/realtime-p0/ASTRA_326_PCM_TAP_AUDIT.md` und dieses Dokument. Keine Änderungen am DSP, Kontrollprotokoll, an Lease, Poolgröße, Toleranzen, Produktpfaden oder Referenzen. Kein Neubau des eingefrorenen WASM. Prüfe den Paket- und WASM-Hash. Nutze einen bereits freigegebenen lokalen Browser-/Audiohost. Die dokumentierte Administratorblockade dieses Work-Hosts ist nicht zu umgehen; ein weiterer gleichartiger Versuch dort ersetzt keinen Test.
>
> Führe W-G1 und anschließend die vorbereitete PCM-Suite aus. Liefere alle unten genannten Rohdateien und Hostangaben. Dokumentiere einen Fehler als Fehler. Keine automatische Ausrichtung, Normalisierung, neue Frist, versteckte Buffervergrößerung oder Voice-Reduktion, um ein Gate grün zu machen. Wenn ein reiner Harness-Defekt die Messung verhindert, reproduziere ihn separat; nur ein enger, begründeter Patch mit eigenem Diff und Regression ist zulässig. Änderungen an Gate-Semantik oder Audiokern zurück an Astra.

Start im entpackten Paket:

```bash
node tools/realtime-p0/harness/server.mjs
```

Auf dem freigegebenen Host `http://127.0.0.1:32191/web/index.html` öffnen, **Start P0-W** mit echter User-Geste anklicken und auf `live-ready` warten. Chord3, Hold/Release, Programm und Panic einschließlich frischem Start nach Panic prüfen. Danach **Run automated probes**, anschließend **Run PCM stall capture**. Während der Suite sind Spiel- und Startknöpfe gesperrt; Panic bleibt wirksam und macht den Lauf ungültig.

Die PCM-Suite verlangt einen gültigen W-G1-Bericht für den eingefrorenen WASM-Hash; fehlt dieser, führt sie W-G1 zuerst aus. Anschließend **Download probe report**, **Download stall report** und **Download PCM evidence** verwenden.

Unabhängige Rohdaten-Auswertung, Ausgabeordner muss neu sein:

```bash
node tools/realtime-p0/harness/unpack-pcm-evidence.mjs P0_STALL_CAPTURE_EVIDENCE.json decoded-capture
```

Unter Linux kann die vollständige eingefrorene Source-/Modellsuite mit `bash tools/realtime-p0/tests/run-326.sh` wiederholt werden. Der enthaltene native Smoke ist ein Linux-Binary. Für einen Browserlauf auf macOS/Windows ist dessen Ausführung nicht erforderlich; der Hostwechsel erlaubt keinen stillen Austausch des WASM. Die drei neuen Node-Tests lassen sich einzeln ausführen: `test-pcm-tap.mjs`, `test-pcm-tap-client.mjs`, `test-capture-oracle.mjs` unter `tools/realtime-p0/tests/`.

## Akzeptanz des unmittelbaren Messlaufs

| Probe | Muss gelten | Was nicht daraus folgt |
|---|---|---|
| W-G1 | Keine Page-/Console-/Processorfehler; richtiger Hash und Kontrollprotokoll; Normal, heldLong und Chord3 gegen 323 mit endlichen, nichtstummen Samples, identischer Länge, `maxAbs ≤ 0.001` und RMS-Fehler `≤ 0.001`; Release/Panic-Lifecycle besteht | Vollständige musikalische P0-Abnahme oder stabile Hardwareausgabe |
| Ungestörte Baseline | Genau 1.25 s Stereo; gültige Endbilanz; keine fehlenden Frames; nichtstumm; vollständige Same-Core-PCM-Oracle exakt | Vollständiger 16-Step-Zyklus: Die Kurzaufnahme prüft nur einen Programmausschnitt |
| 100/250/500-ms-UI-Stalls | Echte Blockade mit Zeitangaben; exakte Frameabdeckung; gleiche PCM wie Baseline und Oracle; `maxAbs = 0`, RMS-Fehler 0; unveränderte erklärte Startposition; offene Engine, keine Faults | Freier Audio-Callback oder glitchfreier DAC |
| Long-Task-Evidenz | Für jede echte Blockade ein zeitlich passender Long-Task-Eintrag; bei fehlender Unterstützung bleibt das integrierte Trace-Gate offen | Long Tasks messen kein Audio-Callbackbudget; ein externer Trace kann von Astra separat bewertet werden, ohne den JSON-Verdict umzuschreiben |
| Recorderüberlauf | 3-s-Take; nur Buffer-Rückgaben 1800 ms zurückhalten, Main Thread/Heartbeats weiterlaufen lassen; Poolverluste explizit, empfangene Abschnitte signalrichtig, danach wieder echte Samples, Owner offen | Die lückenhafte Aufnahme ist ausdrücklich kein vollständiger Audio-Take-PASS |
| Rohdaten | Fünf Takes, passende Hashes, Chunk-/Enddaten; unabhängige Neuprüfung besteht; WAVs mit Verlusten eindeutig benannt | Ein Hash authentifiziert keinen Browserlauf |

Die Recorder-Poolreichweite beträgt 65536 Frames, also rund 1.365 s bei 48 kHz und 0.683 s bei 96 kHz. Sie ist kein Scheduling-Lookahead und wird nicht in die hörbare Latenz eingebaut. Port-/Rückgabekosten bleiben Teil des zu messenden Audiothreadbudgets.

Zurück an Astra:

- `P0_BROWSER_RESULT.json`, `P0_STALL_CAPTURE_RESULT.json`, **vollständiges** `P0_STALL_CAPTURE_EVIDENCE.json`;
- `decoded-capture/RECOMPUTED_CAPTURE_REPORT.json` und alle fünf WAVs, inklusive eindeutig als Aufnahmeverlust markiertem Überlauf-Take;
- Console-/Page-/Processorfehler, bei Erfolg ebenfalls expliziter Leerbefund;
- Browsertrace bzw. Performance-Aufzeichnung mit nachvollziehbarem Zeitbezug zu den Stallfenstern; integrierte Long-Task-Einträge bleiben im JSON erhalten;
- OS, genaue Browserversion, CPU, Audiogerät/Verbindung, Audioserver/Treiber, gemeldete Samplerate sowie `baseLatency`/`outputLatency`, Vordergrund-/Energiesparzustand;
- kurze Hörnotiz zu Aussetzern und Spielreaktion; gegebenenfalls Ausgangsaufnahme mit **exaktem Messpunkt** und Synchronisationsangabe;
- tatsächlicher Diff, falls ein erlaubter enger Harness-Fix nötig war, sowie alle fehlgeschlagenen Läufe. Kein bloßer zusammenfassender PASS-Text.

## Wie Astra den realen Befund entscheidet

| Befund | Nächste Untersuchung |
|---|---|
| W-G1 scheitert bereits gegen 323 | Routing, Rate, Artikulation, Signalrechnung oder Lifecycle isolieren. Kein Root-/Native-Ausbau über den Fehler hinweg. |
| Interner Take zeigt unerklärte Lücken oder PCM-Fehler | Recordervertrag, Renderzeit, Programmstart und Synthese prüfen; anhand von Slot-/Chunk-/Proofdaten lokalisieren. |
| Interner Take ist korrekt, physischer Ausgang knackt | Audiocallback, OS-/Treiberpuffer und Messpunkt des bisherigen Recorders untersuchen. Ein interner PCM-PASS widerlegt den gehörten Aussetzer nicht. |
| Nur die absichtliche Rückgabesperre verliert Aufnahmeframes, Engine bleibt korrekt | Erwarteter Recorderüberlauf; kein Anlass, die Engine-Lease zu verlängern oder das Synthesedesign zu verwerfen. |
| Langer echter Main-Thread-Ausfall schließt den Owner | Erwartete Lease-Semantik. Terminales Fade und „kein Wiederauferstehen“ prüfen, nicht kontinuierliches Weiterspielen behaupten. |
| Mess- und Lifecycle-Basis trägt, Browsercallback bleibt nachweislich die Grenze | Astra kann den nativen Host als gezieltes Gegenexperiment vor dem größeren musikalischen Ausbau priorisieren. Kein Architekturwechsel allein wegen verrauschter Timing-Ratios. |

Eine System-Monitoraufnahme kann vor dem eigentlichen Gerät liegen und dadurch Geräte-Unterläufe verpassen. Falls das genau die offene Frage ist, braucht es eine passend lokalisierte Hardware-/Analog-Loopback-Aufnahme hinter dem Ausgang. Ein zweites Gerät hat eine eigene Clock; Zeitzuordnung und mögliche Drift müssen dokumentiert werden. Auch ein kurzer sauberer Loopback ist noch kein Langzeitnachweis. Die Bewertung leitet sich aus der Trennung von Renderzeit, Systemcallback und Ausgabezeit ab. [W3C Web Audio](https://www.w3.org/TR/webaudio/)

## Nach den Signal-Gates: nächste Chefsache

Die folgenden Punkte legen die Richtung fest; sie sind noch keine Aufforderung, jetzt beide Erweiterungen einzubauen.

**Kontinuierlicher Program-Root.** Vor der Umsetzung definiert Astra, welche Stimmen dem Root folgen. Program-Stimmen sollen ihr Verhältnis zum Root behalten und laufend geglättete Frequenz erhalten, mit integrierter Oszillatorphase statt Phasenreset. Direkte Referenz-One-shots und ihre heldLong-Artikulation bleiben in ihrer bisherigen Semantik. Die bestehende 10-ms-Glättung wird präzise an tatsächlicher Enginezeit definiert; verspätete State-Pakete werden nicht als Ereignisfolge nachgespielt. Negativfälle: alte Revision, Cancel/Panic während der Rampe, Ratewechselprofil, extrem schneller Root-Wechsel, null Gain, Scopewechsel und voller Stimmenbestand. Abnahme erfordert reale PCM-/Hörprüfung gegen die spezifizierte musikalische Absicht.

**Atomarer Wechsel am nächsten Takt.** Astra definiert vorbereiteten unveränderlichen Patternzustand, monotone Revision/Generation, eindeutigen Commit-Frame und eine feste Grenze für aktuelle/vorbereitete Zustände. Ein Receipt macht den tatsächlich akzeptierten Takt sichtbar. Keine teilweise Mischung zweier Patterns, keine nachgeholten Starts, keine stillschweigende Verschiebung eines überholten Commits. Alte Stimmen dürfen nur nach explizit festgelegter Release-/Retire-Regel ausklingen, innerhalb bestehender Kapazitäten. Tests decken doppelte/alte Commits, Panic/Stop vor der Grenze, Prepare-Druck und zehn Minuten bei 108 BPM ohne akkumulierte Schrittrundungsdrift ab. Sol setzt anschließend jeweils einen abgeschlossenen Vertrag um; Astra auditiert den realen Diff und die Messung.

**Nativer Host.** Der bestehende C-Kern bleibt die Vergleichsgrundlage. Ein neuer Rust-DSP ist keine Voraussetzung. Vor dem Hostpatch braucht es ein konkretes Gerät/Callbackmodell, feste Speicher-/Blockgrenzen, Clock-Mapping samt Alter/Unsicherheit, finite Transportslots, Owner-/Lease-/Restart-Regeln und einen ausdrücklich benannten Ausgabe- sowie Aufnahmeweg. Ohne tatsächlichen Audioendpoint wäre eine neue Bridge nur ein weiterer Kontrollpfad. Der Vergleich W gegen N muss dieselben musikalischen Fixtures und Lasten verwenden; N gewinnt nicht durch veränderte Fristen, weniger Stimmen oder ein anderes Signal.

## Stop-/Revert-Vertrag

Stop bei unerklärter Stille, nicht endlichen Samples, Start nach terminalem Cancel/Panic/Lease, falscher Session, beschädigter Akkordatomarität, unerwartetem Verlust im normalen Take, wachsendem Pool/Takebestand oder ungelöstem Klangunterschied. Hostblockade heißt „nicht ausgeführt“. Fehlende Trace-/Gerätenachweise heißen „offen“.

Ein fehlerhafter Messpatch wird im Labor isoliert; im Produkt bleibt 323 der Goldstand. Kein Rückfall auf die ursprünglichen unsicheren 325- oder irreführenden 326-Verdicts. Keine Oracle-Anpassung, keine verlängerte Stale-Toleranz/Lease, kein globaler Voice-Limiter oder stilles Voice-Stealing als Reparatur der Messung. Eine spätere Root-/Pattern-/Host-Erweiterung wird als eigener Diff reversibel gehalten. Sol darf die Ausführung verlässlich abarbeiten; die Umdeutung eines fehlgeschlagenen Gates geht zurück an Astra.
