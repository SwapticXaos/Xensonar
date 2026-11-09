# Astra-Audit: Sol 325 P0-W und Korrektur audit1

Datum: 20.09.2026. Stand: `p0-w/325-audit1`. Scope: isoliertes Labor plus Dokumentation. **Ergebnis: Sols Richtung bleibt richtig; der eingegangene Patch war trotz grüner Modelltests noch nicht ausreichend abgesichert. Reproduzierte Fehler sind korrigiert. Die neue Source-/Modell-Suite besteht. Eine vollständige P0-W-, Browser-, Geräte- oder Produktfreigabe ist damit nicht erteilt.**

## 1. Was geprüft wurde

Die fünf jüngsten Sol-Dateien wurden vollständig materialisiert; beide ZIPs wurden auf Integrität geprüft und entpackt. Eingangsartefakte:

| Datei | SHA-256 des eingegangenen Sol-Stands |
|---|---|
| `Xensonar_325_P0W_candidate_source.zip` | `5b6c1bd5a1b4b25800430c031d1413b7c2a073c82e4e906934d1fb31054b4d5b` |
| `Xensonar_325_P0W_LAB.zip` | `671477287963c584ead9546fedd75e86d6ac75eb140d41862181e3a3ba615e05` |

`ASTRA_RETURN_AFTER_P0W_SOL.md`, `PATCH_325_VALIDATION_REPORT.md` und die SHA-Datei wurden als Anschlussauftrag und Evidenz gelesen. Die ursprünglichen Berichte und ausgewählte Testresultate bleiben unter `artifacts/original-sol/` erhalten. Die Original-Gegenproben stehen in `ORIGINAL_325_COUNTEREXAMPLES.json`; das beiliegende `tests/probe-original-325.mjs` arbeitet gegen einen separat entpackten **ursprünglichen** Sol-325.

Der eingegangene 325 enthält alle 3694 Dateien des geladenen 324-Quellpakets bytegleich. Gegen den eingefrorenen 323 ändern sich im Produkt-`src/` ausschließlich die zwei bereits vorhandenen P1-Dateien. Die Astra-Korrektur verändert keine Produktdatei. Unter den Dateien des 324-Bestands erhält nur `docs/PROVENANCE_LEDGER.md` einen vorgeschriebenen Provenienzeintrag. Die originalen 323-Quelldateien und ihre transpilierten Laborkopien bleiben ebenfalls bytegleich.

Falsifikationsfrage: **Kann ein vermeintlich grüner Pilot nach Überlast, Cancel oder Panic noch alte Anschläge auslösen, einen gehaltenen Ton verlängern, Akkordtöne unterschlagen oder einen falschen/stummen Audiopfad als bestanden melden?** Genau diese Gegenfälle wurden vor einer weiteren Architektur-Ausweitung untersucht.

## 2. Reproduzierte Fehler und Reparaturen

| Befund im ursprünglichen Sol-325 | Auswirkung | Korrektur und Nachweis |
|---|---|---|
| Panic schließt eine Epoch, dieselbe Epoch lässt sich sofort erneut armieren | Alte Autorität kann wieder hörbar werden | Terminaler Core-Owner, Scope-Fence im Adapter, neues Arm nur mit neuer Epoch; Labor startet neue Session. A01, T01, T03 |
| Derselbe Token wird zweimal angenommen | Doppelanschlag statt idempotenter Nachricht | Separater Seen- und Closed-High-Water-Mark; atomare Tokenprüfung vor Commit. A02 |
| 16 spätere Einträge verdecken einen danach eingereihten fälligen Anschlag | Eigentlich gültiger Anschlag verhungert bis nach seiner Frist | Begrenztes, chronologisch sortiertes Pending-Verzeichnis; kein neuer Scheduler/Timer. A03 |
| Wiederholtes Release beginnt den Fade erneut | Ein Ton kann durch Wiederholung dauerhaft überleben | Release ist idempotent; ein kürzerer terminaler Fade darf verkürzen, niemals verlängern. A04, A11 |
| Ein 88 ms verspäteter, noch gültiger Ton beginnt sofort | 323-Safe-Start und Catch-up-Artikulation gehen verloren | 5-ms-Vorlauf und 3.5-ms-Catch-up erhalten; die Frist entscheidet über Admission, nicht den späteren ersten Sample. A05 und frischer 323-Parametertrace |
| Nicht endlicher Root-State wird angenommen | Ungültiger DSP-Zustand | Finite-/Bereichsprüfung vor Mutation, stabile Filterkoeffizienten; ungültige Lease verändert State nicht. A06, T04 |
| Nach 17 unbestätigten Releases weist die Safety-Queue Panic ab | Sicherheitsaktion kann unter Last verloren gehen | Ein vollständiges, koalesziertes Safety-Bild mit eigenem physischen Kredit; terminale Informationen bleiben erhalten. A07, T01 |
| Receipts haben keine Paketidentität | Doppelte/alte Antworten geben zusätzliche Kredite frei | Session-/Engine-/Owner-/Kanal-/Sequenzabgleich; exakt einmalige Kreditfreigabe. A08 |
| Browser-Gesamturteil ignoriert berechneten Klangfehler und Reststimmen | Ein kaputter Audiopfad kann formal PASS melden | Audiofehler, gleiche Take-Länge, endliche/ausreichend laute Samples, Null-Peak sowie keine aktiven/pending Stimmen nach Panic sind verpflichtend. A09 |

Zusätzliche Vertragslücken wurden im selben isolierten Labor geschlossen: Gate-Reconciliation mit Input-Sequenz, Safety vor Arm, maximal **64 Noten** statt 64 Dreiklanggruppen, belegte und stumme Fade-Grenzen, tatsächliches Zero-Gain für Programmstimmen sowie atomare Programmakkorde auch bei Kapazitäts- oder Frequenzbereichsfehlern. A10–A15 und T02–T06 decken diese Ergänzungen ab.

Der Worklet kompiliert WASM nicht mehr in seinem Konstruktor. Er erhält ein zuvor kompiliertes Modul, wird stumm vorbereitet und hält eine feste Output-Ansicht. Vor dem ersten Arm darf die stumme Engine ihren ersten tatsächlichen Callbackframe übernehmen. Ein Frame-Sprung nach Arm ist ein sichtbarer terminaler Fehler. Pointer-Cancel/Blur, Owner-Zuordnung nach asynchronem Start, Processorfehler und begrenzte UI-Aufbewahrung sind berücksichtigt. Diese UI-Änderungen sind sourcegeprüft; ihre reale Browserbedienung ist noch offen.

## 3. Was jetzt tatsächlich belegt ist

Die aktuelle `tests/run-all.sh` beendet sich mit Exit 0. Sie führt den echten C/WASM-Kern, den echten Client und den echten Worklet-Adapter in ausdrücklich benannten Testumgebungen aus.

| Nachweis | Ergebnis | Grenze |
|---|---|---|
| Originaler 323-Parametertrace | Normal, heldLong und akzeptierter 88-ms-Late-Fall PASS | WebAudio-Testdoubles, kein gerenderter Browserklang |
| 15 neue benannte Regressionen | PASS | Core, Client, Urteil und native Offline-Samples |
| Sechs Transport-/Adapterfälle | PASS | Reale Implementierung, modellierter MessagePort und Renderclock |
| Panic unter Druck | 16 aktive Stimmen + 64 Pending-Noten + laufendes Programm + Steuerstau; nach 240 Frames bei 48 kHz keine aktive Stimme, danach Nullsamples | Digitale Engine, keine Messung des DAC-/Gerätepuffers |
| 100/250/500 ms Steuerpause | Je 60.000 Frames, 10 Programmstarts, maxAbs-Differenz 0 zum ungestörten Modell | Kein tatsächlich blockierter Browser-Main-Thread |
| 44.1/48/96 kHz × 64/128/256 Frames | On-time-Normalton blockunabhängig innerhalb 1e-6 | WASM-Profil, nicht alle nativen/Browserfälle |
| Native/WASM-Dreiklang | Je 72.000 Frames, drei tatsächlich synthetisierte Töne, finite Samples, maxAbs-Differenz 0 auf diesem Host | Native Offline-Funktion, kein Audiohost/Sidecar |
| Nativer Dreiklang-Pegel | Peak 0.111428604, RMS 0.0125215421 | Keine Normalisierung, kein Vergleich mit WebAudio-Rendering |

Sols früherer nativer Smoke renderte keinen musikalischen Eingangsfall. Er war ein Build-/Laufnachweis, kein ausreichender Signalnachweis. Der neue Test erzeugt tatsächlich den Dreiklang und vergleicht Samples. `P0W_CHORD3_OFFLINE.wav` macht diese Kandidatenfixture als Tonprobe zugänglich; sie ist **keine** nachträglich behauptete Browser- oder 323-Klangfreigabe.

Die Suite testet negative Gegenfälle: Ein absichtlich zu großer Klangfehler oder Reststimmen nach Panic muss das Browserurteil scheitern lassen. Ein PASS setzt außerdem voraus, dass Stale-/Cancel-Pfade anhand ihrer Zähler wirklich durchlaufen wurden; nicht zugestellte Testnachrichten dürfen nicht unbemerkt als erfolgreiche Stille gelten.

## 4. P1, Referenzen und Projekt-Gates

P1 ist im eingegangenen 324/325 mechanisch passend zum finalen Zweidateien-Vertrag vorhanden: `waveOvertoneArpRuntime.ts` setzt `options.intendedStartTimeSec` aus `item.dueTime`. `scheduledTonePlaybackBoundary.ts` liest es nur für `source: 'other'` im bestehenden `isAudioEventValid`-Guard; nicht endliche Werte werden vor Admission abgewehrt. Die Hüllkurve benutzt weiter den bisherigen `now`-Pfad, die Toleranzberechnung bleibt unverändert, und ohne das optionale Feld bleibt der alte Guard-Eingang erhalten. Audit1 ändert diese Dateien nicht. Das ist ein Diff-/Quellbefund, kein neuer P1-Chromium-/Audio-PASS.

Die lokalen Chromium-/Audio-Ergebnisse des Nutzers für den unveränderten 323 bleiben Referenzevidenz für 323. Sie decken diesen neuen 325-DSP nicht automatisch ab. 320 bleibt die eingefrorene Performance-Oracle; keine Host-Timing-Ratios wurden als neue Schwelle übernommen.

Auch die geerbten Projekt-Guards wurden ausgeführt:

- Harness-Contract und Provenance-Gate: PASS; drei bestehende Provenance-Warnungen bleiben sichtbar.
- Runtime-Touch-Guard gegen die alte 7.7.90-Baseline: FAIL, 133 geändert / 69 hinzugefügt / 20 entfernt. Diese Produktabweichungen sind bereits im geladenen Stand enthalten; audit1 hat null `src/`-Änderungen.
- Patch-Scope-Guard mit `tooling-only`: FAIL. Er enthält historischen Gesamtdrift und eine alte Allowlist, die verschachtelte Labordateien sowie mehrere Root-Berichte nicht kennt. Keine Allow-Flags, keine Änderung der Regeln oder Baselines zum Erzwingen eines PASS.
- Zusätzlich wird der gesamte audit1-Delta gegen den **eingegangenen 325** byteweise geprüft: nur Labor, P0-Berichte und Provenienzeintrag erlaubt, keine entfernte Datei, keine Produkt-/Oracle-/323-Referenzänderung. Ergebnis und vollständige Liste: `ASTRA_SCOPE_AND_INTEGRITY.json`.

Die alten Guard-FAILs sind offengelegt; sie werden weder als neue Audiofehler noch als bestandene Release-Gates umetikettiert. Ein neues Produkt-HTML, globale Produkt-Typechecks oder eine 320-Rebaseline wurden für diesen isolierten Laborpatch nicht durchgeführt.

## 5. Architekturentscheidung nach dem Audit

**H bleibt der Migrationsweg; W ist der nächste hörbare Prüfpunkt, N noch kein nächster Produktpatch.** Die Befunde bestätigen, warum bloße DSP-Auslagerung nicht ausreicht: alte Ereignisse, falsche Credits, verlorene Safety-Aktionen und unzuverlässige PASS-Kriterien überleben einen Wechsel des Ausführungsorts. Sie müssen am Protokoll und an der hörbaren Beweisführung gelöst werden.

Den vorhandenen C-Kern behalten wir für P0 zunächst bei. Er lässt sich aus derselben Quelle in WASM und nativ ausführen; der neue Samplevergleich belegt diese Eigenschaft für die deklarierte Fixture. Ein Rust-Neubau ausschließlich für einen Sprachwechsel würde die nächste akustische Gegenprobe verzögern. Die Entscheidung über den dauerhaften nativen Host, FFI- und Speichervertrag folgt mit N; C ist keine behauptete endgültige Produktionsfreigabe.

Die vier Tail-Slots bleiben reserviert und ungenutzt. Release läuft im vorhandenen Voice-Slot. Das entspricht der konservativen P0-Regel ohne Voice-Stealing und vermeidet eine neue ungemessene Klangpolicy. Daraus folgt kein Versprechen von 20 musikalisch verfügbaren Stimmen oder besserer Lastgrenze.

Das Drahtformat heißt ausdrücklich `p0-w/325-audit1`, nicht „vollständiges v0.2“. Safety ist nun für das einzelne P0-Programm und die festen Token-Slots implementiert. Allgemeines Clock Mapping, vorbereitete Program-Handles, generationsbezogenes Programm-Retire, durchgehende Lifecycle-ACKs und beliebige Backendwechsel sind noch nicht vollständig vorhanden. Die JSON-Größengrenzen gelten für die vom Labor erzeugten ASCII-Fixturepakete; dies ist kein allgemeiner untrusted-netzwerkfähiger Serializer.

## 6. Offene Annahmen und Abnahme-/Revert-Kriterien

| Bereich | Vor vollständiger P0-Abnahme erforderlich |
|---|---|
| Hörbare W-Engine | Tatsächlicher Browser-/Geräteausgang und OfflineAudioContext-A/W gegen 323; gleiche Länge, finite Samples, maxAbs und RMS jeweils <= 1e-3 |
| Reale Stalls | 100/250/500 ms echter Main-Thread-Stall, vorreservierte lückenlose PCM-Aufnahme, unveränderte Sampletimeline, Browsertrace; Zähler allein reichen nicht |
| Kontinuierlicher Root | Laufende Programmstimmen müssen die deklarierte 10-ms-Root-Rampe mit integrierter Phase lesen; bisher wird Root nur beim neuen Notenstart aufgelöst. Referenz-One-shots bleiben unangetastet |
| Patternwechsel | Vorbereiteter atomarer Wechsel am nächsten Takt, begrenzter Retire-Pfad und Generationsprüfung. Bisher wird laufende Konfiguration sicher abgelehnt |
| Langlauf und Ausfälle | 108 BPM / mindestens zehn Minuten, 60-Minuten-Soak, Suspend/Resume, Device-/Ratewechsel, Processorfehler, Restart und echte Ausgabe-/Aufnahmerouten |
| Last und N | Callbackbudget einschließlich Nachrichten/Safety, reale Underruns, gleicher musikalischer Umfang und vergleichbare effektive Latenz. Der native Smoke benutzt keinen Audiotreiber |

Stopp bei wiederbelebter Epoch, Start nach Cancel/Panic, hängendem Gate, nicht endlichem Signal, falschem Akkord, verlorenen Aufnahmeframes, unbegrenztem Wachstum oder unterschlagenem Klangfehler. Keine Nachbesserung durch zusätzliche Stale-Toleranz, größere versteckte Puffer, Gain-Kompensation, zusätzlichen Limiter oder periodische Reparaturtimer. Bei einem Fehler bleibt der Ausbau im isolierten Labor; 323 wird nicht angetastet. Den ursprünglichen Sol-325 nicht als sicheren hörbaren Fallback verwenden, da seine Fehler reproduziert sind.

Der konkrete nächste Anschlussauftrag steht in `NEXT_BROWSER_AUDIO_GATE.md`: zunächst dieses WASM im freigegebenen lokalen Browser signalprüfen, anschließend einen begrenzten PCM-Tap für echte Stall-Takes ergänzen. Erst danach und nach den verbleibenden W-Vertragsprüfungen den nativen Audiohost angehen. Ein hörbarer Produktpfad und messbar verringerte Produkt-Bursts werden für audit1 nicht behauptet.
