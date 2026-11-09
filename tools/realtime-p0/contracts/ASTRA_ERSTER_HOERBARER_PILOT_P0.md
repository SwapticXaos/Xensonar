# Xensonar — erster hörbarer Realtime-Pilot P0

20.09.2026 · Umsetzungsspezifikation, noch nicht implementiert oder klanglich abgenommen.

## Auftrag und Falsifikationsfrage

**Baue zuerst P0-W: eine persistente kleine Poly-Synth-Engine im AudioWorklet, in einer separaten Testoberfläche mit einem exakt begrenzten 323-Referenzklang. Danach hoste denselben DSP-Kern als P0-N im nativen Sidecar.** Kein Patch im eingefrorenen 323, keine Reaktivierung der alten Force-/Speaker-/Fallback-Experimente.

Falsifikationsfrage: Kann ein bekannter Klangkörper mit Akkord, Ausklang, Hold und eigener Wiederholungsuhr einen 500-ms-Stall der Browsersteuerung überstehen, ohne historische Anschläge nachzuholen, Releases zu verlieren oder Klang/Latenz als versteckten Preis zu verändern? Erst danach wird geprüft, ob der native Host gegenüber W einen weiteren messbaren Nutzen bringt.

Der hörbare Umfang ist bewusst klein, aber musikalisch: drei gleichzeitige Sinustöne, Einzelanschläge, vorhandene `heldLong`-Artikulation, zusätzlich ein ausdrücklich neues Gated-Hold und ein enginegetaktetes 16-Step-Synthmuster. Ein Dauer-220-Hz-Ton ist nur der erste Routingtest, kein fertiger Pilot.

## Verbindlicher Schnitt

| Teil | P0-Ausführung |
|---|---|
| Referenz A | Unveränderte `playScheduledToneWithLifecycle` aus 323, Normalzweig `source: "other"`, Entrophon nicht aktiv, keine Aux-Ziele; echte WebAudio-Nodes |
| Kandidat W | Kleiner portabler Rust-DSP-Kern als vorab gebautes WASM in einem persistenten AudioWorklet; dünner JS-Adapter |
| Kandidat N | Derselbe Kern und dieselben Fixtures, nativ im Rust/CPAL-Host; Loopback-Control, tatsächlicher Gerätecallback |
| Aufnahme A/W | Getrennte Takes am selben neutralen Testbus desselben AudioContext; keine gleichzeitige Summe als A/B |
| Aufnahme N | Native framegestempelte WAV-Aufnahme außerhalb RT plus tatsächlicher Ausgangs-/Loopbacknachweis |
| Referenzumfang | Oszillator → Lowpass → Gain, vorhandene Normal-Hüllkurve und Stopzeit; keine Aussage über den gesamten Master-/Effektklang |
| Musik außerhalb P0 | Carrier, Entrophon, Wellenstarter-Gradient, volle Drums, Samples, Material/Granular und existierende Root-Follow-Uhr bleiben unverändert |

Die separate Referenzoberfläche darf minimale echte Abhängigkeiten injizieren (`getMainOutput`, leere Active-Tone-Liste, unverwendete Transient-Ticket-Funktionen bei diesem Fixture). Sie darf den Renderer nicht durch einen selbst geschriebenen ähnlichen Oszillator ersetzen. Derselbe Context besitzt Nodes, Referenzbus und W-Ausgang. Kein Node wird zwischen Contexts verbunden.

Keine WebAudio-Fassade im Kern. Die spätere Integration erhält musikalische Requests und Programme; AudioNode-/AudioContext-Typen bleiben im jeweiligen Adapter. Die beigelegte Datei `XENSONAR_REALTIME_BACKEND_CONTRACT_v0_2.ts` beschreibt diesen Schnitt, keine fertige Engine.

## Fester Klangfall aus 323

Basisfixture: `type="sine"`, `freq=220/330/440 Hz`, `dur=0.18 s`, `volume=0.04`, `cutoff=2400 Hz`, `q=1`, `source="other"`; `gainScale=overloadSoftening=1`, kein Aux, keine Lastdegradation. Der Intended-Start liegt im A/B-Klangtest ausreichend in der Zukunft, damit die unten genannte Startauffüllung nichts verkürzt.

Die 323-Semantik wird aus `scheduledTonePlaybackBoundary.ts` und `safeAudioScheduling.ts` übernommen:

| Größe | Normal | `heldLong=true` |
|---|---:|---:|
| Tatsächliche Dauer | 0.18 s | 1.08 s |
| Attackdauer | 0.032 s | 0.032 s |
| Releasedauer für die Berechnung | 0.0756 s | 0.14 s |
| Releasebeginn relativ zum sicheren On-time-Start | 0.1044 s | 0.94 s |
| Zeitkonstante von `setTargetAtTime` | 0.025704 s | 0.0476 s |
| Deklariertes Releaseende | 0.18 s | 1.08 s |
| Oszillatorstop einschließlich 0.08-s-Tail | 0.26 s | 1.16 s |

Der Gain beginnt bei 0.0001, steigt linear auf 0.04 und nähert sich ab Releasebeginn exponentiell 0.0001. Er wird nicht stillschweigend durch eine andere ADSR oder ein früheres Null-Fade ersetzt. Der sichere Start ist `max(intended, admissionNow+0.005)`. Der normale Peak bleibt `intended+attack`; erst wenn dieser schon erreicht wäre, folgt die vorhandene 0.0035-s-Catch-up-Rampe. Deshalb darf eine neue Stale-Frist nicht einfach den für diese Hüllkurve verwendeten `intended`-Wert ersetzen. Akzeptierte verspätete Fälle bekommen gesonderte Referenztraces.

`heldLong` ist hier die vorhandene verlängerte One-shot-Artikulation, **nicht** dasselbe wie eine beliebig lange Gated-Note oder ein wiederholendes Hold-Programm. Der Pilot besitzt zusätzlich den ausdrücklich neuen Gated-Fall: Attack 32 ms, Sustain bis Release, Release-Fade 30 ms. Panic benutzt einen separaten 5-ms-Fade. Diese neuen Fixturezeiten ersetzen keine Produktzeiten.

Der Lowpass muss WebAudio korrekt nachbilden: dessen Q-Angabe ist bei Lowpass in dB definiert. `q=1` darf nicht unbesehen als linearer Q-Faktor 1 in eine DSP-Bibliothek übernommen werden. Impuls- und Frequenzantwort sind eigene Vergleichsfixtures. Quelle: [W3C, BiquadFilterNode Q](https://www.w3.org/TR/webaudio/#dom-biquadfilternode-q).

Kein nachträgliches Loudness-Normalisieren, um einen abweichenden Gain oder Filter zu verstecken. Keine automatische zusätzliche Sättigung/Kompression. Die Fixturepegel sind für Summenreserve gewählt. Spätere komplexe Wellen benötigen einen eigenen Bandlimit-/Aliasingnachweis.

## Programme und kontinuierlicher Zustand

P0 hat genau ein optionales laufendes Synthprogramm. Es besteht aus 16 Steps mit maximal drei Noten je Step, vier Vierteln pro Takt, zunächst 120 BPM, danach 108 BPM als Test einer nicht ganzzahligen Stepdauer. Tonverhältnisse sind 1, 1.5 und 2 zum vollständigen aktuellen Root-State; einzelne Steps bleiben leer. Fixtures und Startframe werden vorab gespeichert. Der Kern besitzt Phase, Notenstarts und Ausklänge; nach Programmstart gibt es keine Browsernachricht pro Step.

Die Phase wird in ausreichend genauer/fester rationaler Darstellung akkumuliert und nur beim tatsächlichen Start auf ein Sample abgebildet. Nicht jeden Step separat auf eine ganze Frameanzahl abrunden. Ein fälliger Start erhält seinen Offset innerhalb des Blocks. Pro Block wird nur das jetzt fällige Intervall ausgewertet; ein nach Suspend verpasster Zeitraum wird nicht als Eventliste nachgeholt.

Patternwechsel gelten am nächsten Taktanfang; Root-/Gain-State gilt am nächsten verfügbaren Block mit einer dokumentierten 10-ms-Glättung für ausdrücklich kontinuierliche Parameter. Dies ist eine P0-Programmpolicy. Unveränderte, bereits gestartete Referenz-One-shots werden nicht nachträglich durch einen Rootwechsel umgestimmt. Phasen werden bei Frequenzänderungen integriert, nicht aus einem seit Start gemessenen Alter mit dem neuen Frequenzwert neu berechnet.

Der Producer führt Partial Updates zu einem vollständigen Lane-State zusammen. Jede Revision ist monoton; Empfänger behalten einen Applied-High-Water-Mark. Gate-Reconciliation benutzt separat Input-Sequenz und Notentoken. Sie beendet Gated-Noten, deren Token in einem ausreichend neuen vollständigen Held-State fehlt. Sie schneidet keine unbeteiligten One-shots ab.

## Harte Grenzen des Piloten

Die folgenden Zahlen sind **neue P0-Fixtures**, weder 320-Oracle noch neue Produkt-Voice-Limits. Sie werden vor der Umsetzung versioniert und bei einer Änderung als neues Pilotprofil behandelt.

| Ressource | P0-Profil |
|---|---|
| Audio | primär 48 kHz, Stereo; zusätzlicher DSP-Test mit 44.1/96 kHz und Blocklängen 64/128/256 |
| Normale Stimmen / Fade-Tails | 16 / 4 vorreservierte DSP-Slots |
| Externe logische Notentoken | 128 Slots mit Generation und terminalem High-Water-Mark; nicht identisch mit DSP-Slots |
| Attack-Outbox und RT-Pending | je höchstens 64 Noten, feste Byteobergrenze zusätzlich |
| Pro Callback | höchstens 16 normale Command-Einträge besichtigen, darin höchstens 8 externe Noten starten; höchstens 4 lokale Programmnoten starten |
| Kleine Akkordgruppe | bis 3 Noten atomar zulassen und am selben Frame starten; bei unzureichender Kapazität Gruppe explizit ablehnen |
| Safety-Arbeit | ein vollständiges begrenztes Safety-Bild plus Scan der 128 Tokens und 20 Voice-/Tail-Slots; zusätzlich zum genannten Normalbudget, vollständig in Callbackmessung enthalten |
| Programm | ein laufender Slot, ein vorbereiteter Slot, maximal 64 Steps, höchstens 3 Noten je Step; P0-Fixture nutzt 16 |
| Control-Paket | höchstens 8192 Bytes; höchstens 2 normale Pakete tatsächlich unterwegs, zusätzlich je ein State- und ein Safety-Paket |
| Vorbereitung | höchstens 64 KiB pro vorbereitetem Programmpaket, außerhalb RT; P0 ohne PCM-Assets |
| Beobachtung | höchstens 10 kleine Reports/s bei aktivem Test; aggregierte Zähler, keine Traceobjekte pro Voice/Block |
| Lease | gültige neue Steuerung erneuert höchstens bis zu ihrem qualifizierten Sendezeitpunkt +1500 ms; UI-Heartbeat alle 250 ms, nur bei aktiviertem Pilot |
| Safety-Fades | normales neues Gated-Release 30 ms, Panic/Lease-Abschluss 5 ms; bestehender Referenz-One-shot-Ausklang unverändert |

Die Größe jedes RT-Eintrags, die Gesamtbytes, die maximalen Scans und die Summe aller Worklet-Messagehandler sind im Implementierungsreview nachzutragen. JavaScript-Messagehandling im Worklet verbraucht ebenfalls Renderthreadzeit. Credits zählen wirklich ausstehende Pakete; ein ACK-Timeout erzeugt keine weiteren Postings. Der Sender hält nur neuestes State-/Safety-Bild und eine begrenzte Attack-Outbox. Safety kann Release-Abschlüsse je Token zusammenführen; Panic dominiert alte Attacks und Programme. Kein großer Assettransfer vor Safety auf derselben Leitung.

Wenn 16 Stimmen belegt sind, endet zuerst kein Release zugunsten historischer Dekoration. Für P0 ist die einfache überprüfbare Regel: neue externe Attackgruppe ablehnen, wenn keine freien Slots vorliegen; kein verborgenes Voice-Stealing. Die normale Musikfixture bleibt unterhalb dieser Grenze. Ein separater Überlasttest verifiziert diese deklarierte Ablehnung; er gilt nicht als Klangparität unter beliebiger Last.

## Start, Stop, Zeit und Ownership

1. User-Geste aktiviert den getrennten Testhost. Context/Device läuft, Modul/Kern ist geladen, feste Speicher sind reserviert.
2. Session-, Engine-, Clock- und Owner-Epoch werden erzeugt. Alte Nachrichten sind ungültig. Ausgabe bleibt stumm.
3. Mindestens 250 ms fortschreitende Frames der aktuellen Epoch und ein definierter Testsignal-Take weisen DSP und Signalroute nach. Proofsignal und eigentliche Musik werden getrennt gestartet. Stumme Musik ist nicht automatisch unhealthy.
4. Explizites Arm öffnet die gewählte Lane. A und W laufen für Vergleichstakes nacheinander. N erhält einen separaten Stop-and-Switch mit Berücksichtigung alter Ausgabepuffer.
5. Note-Off/Cancel schließt seinen Token auch vor dem geplanten Start. Ein Duplicate ist harmlos. Pending und aktiv teilen diesen Lebenszyklus.
6. Panic schließt die Owner-/Attack-Epoch, leert Pending, stoppt Programm und fadet aktive Stimmen. ACK `silent` kommt erst nach dem erreichten Renderframe; bereits gepufferte physische Ausgabe wird zusätzlich abgewartet.
7. Ein erneutes Arm benötigt eine neue Owner-Epoch und den bestätigten stillen Vorgänger. Ausbleibendes UI-ACK berechtigt nicht zum Start eines zweiten Besitzers.
8. Lease-Ablauf wird in der Engine kontrolliert. Nach spätestens 1500 ms seit der letzten qualifizierten Erneuerung plus Fade und bekannter Ausgabepufferung endet die Lane. Eine verspätet eintreffende alte Erneuerung verlängert sie nicht. Geplanter 500-ms-UI-Stall fällt innerhalb dieser Fixture-Lease.

Originale Ereigniszeit, beabsichtigter musikalischer Termin und Zulassungsfrist sind verschiedene Felder. Der 0.18-s-Referenzton hat aus seiner vorhandenen Formel 90 ms maximale Lateness; für andere Dauer-/Holdfälle wird die unveränderte Formel ausgewertet. Der Pilot führt keine universelle 80-/90-ms-Toleranz ein. Fristprüfung geschieht günstig am Ingress und erneut beim Verlassen einer Pending-Queue zur endgültigen Engine-Zulassung, jeweils vor Start-Clamp und Hüllkurvenplanung. Erst diese endgültige Zulassung reserviert eine Stimme. **Die Frist ist keine nachträglich verschärfte Grenze des hörbaren ersten Samples:** Der bereits vorhandene 5-ms-Startvorlauf darf einen rechtzeitig zugelassenen Ton nicht wieder stale machen. Beispiel: bei 88 ms Lateness und 90 ms Zulassungsgrenze bleibt der nach bestehender Regel bei 93 ms gestartete Ton zulässig. Nach Zulassung wirken weiterhin Cancel/Panic/Epoch-Fences; ein verpasster Renderabschnitt nach Suspend wird nicht nachgeholt. So bleibt Queuealter wirksam, ohne die vorhandene musikalische Toleranz durch den eigenen Vorlauf zu verkürzen.

Für N gilt das Vier-Zeitstempel-/Affine-Mapping aus dem Hauptbericht. P0-Ziel für neue zeitkritische externe Starts: kombinierte Fehlerhülle höchstens 2 ms im qualifizierten Messfenster. Unsichere Fristfälle werden abgelehnt, nicht durch zusätzliche Toleranz zugelassen. Größere Unsicherheit bedeutet kein Native-Attack-PASS; interne Programme können weiterhin separat geprüft werden. Ein Browser-Handler, der während des Stalls nicht lief, ist auch mit Sidecar keine sofortige Eingabequelle.

Native Stream- und DAC-Anker, effektive Pufferung und `getOutputTimestamp()` für W werden separat erfasst. Keine Gleichsetzung von `performance.now()`, AudioContext-Zeit und nativer Monotoniczeit. Kein Verschieben schon zugesagter Frames durch einen neuen Clock-Fit. Suspend/Resume und Devicewechsel erhalten neue Epochen und beginnen ohne historischen Replay.

## Ausführbare Abnahmefälle für die nächste Umsetzung

Alle folgenden Fälle sind spezifiziert, **noch nicht als P0 ausgeführt**. Bereits vorhandene M/D-Gegenproben im Handoff testen alte Implementierungen und Sols Modell, nicht diesen neuen Kern.

| ID | Versuch | Erforderlicher Nachweis |
|---|---|---|
| P0-01 | Exakte Referenz A, einzelner Normalton, Chord3, heldLong | Render-Takes, Referenz-Parametertrace, Hashes und eingeschränkter Klangvergleich |
| P0-02 | Gleicher Kern W/nativ offline, alle Block-/Samplerateprofile | Endliche Samples; blockunabhängige Zeitpunkte und definierte numerische Abweichungsgrenzen |
| P0-03 | Lowpassimpuls, Frequenzantwort, On-time-Envelope und akzeptierter Late-Fall | WebAudio-Q-/Gain-/Peak-/Stop-Semantik korrekt; alte Catch-up-Rampe nicht versehentlich ersetzt |
| P0-04 | 3 gleichzeitige Noten, danach 20 ausdrücklich klassifizierte Gliss-/State-Updates | Akkord nicht koalesziert; State wird neuester Zustand; keine Behauptung, die ganze 323-Inputklassifikation sei damit portiert |
| P0-05 | Autonomes 16-Step-Programm; Browser-Main-Thread 100/250/500 ms blockieren | Sampletimeline unverändert gegenüber ungestörtem Take; kein proportionaler Nachholburst; tatsächlich blockierter Thread in Trace dokumentiert |
| P0-06 | Externe Attacks vor dem Stall mit alter Frist warten lassen; nach Stall zustellen | Veraltete Attacks starten nie. Originalzeit bleibt sichtbar. Neu nach dem Stall erzeugte Testevents nicht fälschlich als alte Hardwareevents ausgeben |
| P0-07 | Release vor Pending-Start, doppelt, nach Slot-Recycling; Update alt nach Release | Kein später Start/Resurrection; neuer Token bleibt von altem Release unberührt |
| P0-08 | Panic bei 64 Pending, 16 Stimmen und laufendem Programm; alte Pakete danach | Keine neuen Starts aus alter Epoch; digitale Stille nach 5-ms-Fade, Ausgabe später gemäß gemessenem Puffer |
| P0-09 | State 21 dann 20; getrennte Root-/Gain-Patches; alte ACKs und simulierte Reorder | Applied-High-Water-Mark, Producer-Merge, Credits und Sessionfilter korrekt; kein `1,3,2`-Rückfall |
| P0-10 | Gesättigte Queues, falsche Pakete, Startlimits, Program-Wechsel bei vollem Retire-Kanal | Jede Queue/Map/Bytezahl begrenzt; Arbeit einschließlich Reject/Release/Retire bleibt begrenzt; kein RT-Warten |
| P0-11 | UI-Antworten 500 ms pausieren, dann Transport 2 s unterbrechen | Erstes: autonom weiter; zweites: Lease endet und neuer Besitzer bleibt bis Stummbeweis aus |
| P0-12 | Prozessorfehler/Sidecarabbruch, Restart, Suspend/Resume, Device-/Ratewechsel | Fehler sichtbar, neue Epoch stumm, kein alter Replay, kein Cross-Context-Graph, kein Dual-Owner |
| P0-13 | 108 BPM über mindestens 10 min; Patternwechsel am Takt, Root-Rampe | Kein kumulativer Step-Rundungsfehler, korrekte Intrablockstarts, definierte Phase und kontinuierlicher Reader/Oszillator |
| P0-14 | Gleiche musikalische Last A/W/N und effektive Latenz; separate Audioüberlast | Renderzeiten, Tailreserve, Main-Steuerarbeit, tatsächlicher Block und Unterläufe; CPU-Mittelwert allein genügt nicht |
| P0-15 | Mindestens 60 min wechselnde Tokens/Programme/Start-Stop, danach Idle | Kein linearer Speicher-/Pending-/Mapanstieg; alle Slots/Referenzen nach Drain frei; deaktivierter Pilot erzeugt keine Heartbeats/Reports |
| P0-16 | Ausgang und Takes; native Recorderqueue absichtlich überfüllen | Reale Ausgabe vorhanden; Aufnahmeverlust sichtbar mit Frame-Gap, RT spielt weiter; fehlerhafter Take ist kein Audio-PASS |
| P0-17 | Physische kurze Live-Session: Akkorde, Legato/Hold, Panic, UI-Stall | Spielbarkeit und Klang des deklarierten Umfangs bestätigt; OS, Gerät, Treiber und Latenz dokumentiert |

**Digitale vorgeschlagene P0-Grenzen:** geplante Starts maximal ein Sample vom berechneten Termin; Chord3 gleicher Startframe; bei gleichem Kern W/N unterschiedliche Blockzerlegung maximal `1e-6` absolute Sampleabweichung. Gegen echten WebAudio-Referenzton: nur bekannte Aufnahme-/Schedulingverschiebung korrigieren, keine automatische freie Phasen-/Gainoptimierung; maximale Sampleabweichung `1e-3` FS und RMS-Fehler höchstens `-60 dBFS`, dazu korrekte Envelopezeiten. Werden diese Kriterien wegen dokumentierter Browser-DSP-Unterschiede verfehlt, wird der Unterschied analysiert und gegebenenfalls ein neuer engerer Klangumfang beschlossen; kein nachträgliches PASS durch Schwellenlockerung im selben Ergebnislauf. Physische Aufnahmen bekommen eigene Geräusch-/Latencyprofile, keine unpassende digitale Nulltestschwelle.

**Zeitbudget:** für das kleine P0-Profil angestrebter Kernel-/Adapter-CPU-Aufwand `p99 < 0.30 * Q/Fs`, beobachtetes Maximum `< 0.50 * Q/Fs` nach Warm-up; keine vom Host gemeldeten Unterläufe und keine nachgewiesenen Outputlücken im 10-min-Stresslauf. Dies ist ein festzulegendes Pilotziel, kein harter Echtzeitbeweis aus endlicher Beobachtung. DSP-Rechenzeit und Callback-Schedulinglatenz werden getrennt gemessen. Falls Browserwerkzeuge das tatsächliche Callbackbudget nicht belastbar zeigen, lautet dieser Teil „nicht gemessen“; eine Node-Laufzeit ersetzt ihn nicht. Vergleich N/W zusätzlich auf effektiv gematchter Ausgabe-/Inputlatenz, nicht nur nomineller Bufferzahl.

## Umsetzung in kleinen überprüfbaren Schritten

1. **Referenz-Fixtures und Protokoll.** Sourcekopien hashen, normale/heldLong-Envelopes aufnehmen, konkrete TS-/Wirevalidatoren, Epochen/Token-/Panic-Modelle und Clocktest mit bekannten Offsets. Sols Simulator als Regressionsgegenbeispiel erhalten, nicht als fertige Engine übernehmen.
2. **Kern und W-Signal.** Vorreservierter DSP, richtiger Lowpass, Attack/Release; Testbus und einzelner hörbarer Ton. Routing/Contextfehler hier lösen, bevor Produkt-UI oder Legacy-Muting hinzukommen.
3. **Musikalischer P0-W.** Chord3, Gated-Hold, Engineprogramm, Intrablocktermine, Credits, Safety, Lease und Stallfälle. Erst nach grünen Signal-/Lifecycle-Gates weiter.
4. **Nativer Vergleich P0-N.** Gleicher Kern/Fixtures, CPAL-Deviceprofil, echte Clockanker, begrenzter Ingress/Recorder und Wiederanlauf. Keine zweite musikalische Implementierung.
5. **Entscheidungsdatensatz.** A/W/N-Takes und Parameter, Build-/HTML-/WASM-/Binaryhashes, Release-/Panic-/Stalltraces, Block-/Latenz-/CPU-/Speicherwerte, echte Ausgabe, offene Klangabweichungen.
6. **RT-L1 erst separat.** Eine konkret benannte bestehende Lane in einem eigenen Kandidaten integrieren, Feature-OFF-Kosten und bisherige 320-/Core-/Full-Gates prüfen. ARP-P1 bleibt eigener Scope. Master-/Recordingzuordnung wird vor hörbarer Übernahme festgelegt.

Das erste umsetzende Handoff soll Schritte 1–3 liefern und an diesem Punkt einen realen Diff plus Ergebnisse zurückgeben. Schritt 4 folgt mit unverändertem Kern als Vergleich. Ein Gerätetest, eine benötigte Browserberechtigung oder ein fehlender Messkanal wird konkret benannt; davon unabhängige Quell-/DSP-/Protokollarbeit kann vorher abgeschlossen werden.

## Sofortiger Stopp / Revert

P0 bleibt außerhalb des Produktpfads. Ein unaufgeklärter stummer Ausgang, Dual-Owner, hängender Hold, Start nach Panic/Cancel, wechselnde falsche Epoch, fehlende native Aufnahme, wachsende Map oder erleichterter Klang bei angeblichem Performancegewinn stoppt den Ausbau. Nicht mit zusätzlichem Gain, größerem Puffer, wiederbelebtem Legacy oder periodischem Reparaturtimer überdecken. Zuerst die konkrete fehlgeschlagene Stufe reparieren und ihre Gegenprobe bestehen.

Freigabe bedeutet zunächst nur: Der kleine deklarierte P0 erfüllt seinen Vertrag. Die Robustheit des vollständigen Live-Instruments und eine endgültige native Produktwahl sind spätere, explizite Nachweise.
