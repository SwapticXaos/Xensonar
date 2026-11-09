# Astra 400.1 — kausaler Zwischenstand, physische Zuordnung offen

Parent: `Xensonar_400_A1_A2_HANDOFF.zip`, Source-Commit `5b6779d8437dde1b205ed305cd3ff859aaaa7638`.
Alle 2.924 Parent-Dateien wurden vor der Arbeit byteweise mit dem vorhandenen Workspace verglichen. Keine neue Entpackung und keine ältere Source verwendet.

## Status

Dies ist eine physisch testbare Diagnose-Fassung. **Die Responsiveness-Korrektur ist noch nicht abgeschlossen.** Der musikalische Zeitvertrag bleibt unverändert, bis die neue Messung den physischen Verlustgrund diskriminiert. A3 bleibt gesperrt.

Gelesen wurden die fünf Dateien unter `/Xensonar/Astra_400_1_PHYSICAL_2026-09-28/` in der vom Nutzer verlangten Reihenfolge 00, 01, 02, 04, 03 sowie der originale Runtime-Dump. Der Dump enthält keine PCM-Daten und keine Fence-/Reject-Gründe.

## Bestätigte Befunde und Grenzen

| Befund | Aussagekraft |
| --- | --- |
| Direct: 1.069 submitted, 168 admissionRejected, 440 accepted, 588 rejected, 439 started, 94 ended, Epoche 4.558 | Im originalen Dump bestätigt; nicht nach Ablehnungsursachen auflösbar |
| Direct-Alter 6/10/20 ms bei 48 kHz | Gegenprobe: vorgelagertes Gate lässt durch, Host verwirft `targetPast`; Epoche bleibt 1 |
| Transportzustellung 128 Frames nach Zielzeit | Gegenprobe: Consumer verwirft `stale`, ohne Kernel-Aufruf und ohne Epoch-Wechsel |
| Frame-Sprung +128 bei laufender Stimme | Gegenprobe: Context-Fence, Epoch-Wechsel und Abbruch einer gestarteten Reservation; wartender Record wird OLD_EPOCH |
| Je 20.000 zusammenhängende Callbacks, Direct und Entrophon | Epoche bleibt 1; kontinuierliches Rendern allein erklärt keine Epoch-Wechsel |
| Kernel-Argumentfehler | Gegenprobe unterscheidet echten C11-Fehler von Consumer-Stale |
| Alte Ergebnisnachricht nach Epoch-Wechsel | Wird nun separat gezählt; darf keine neuere Reservation gleichen Tokens freigeben |
| Parent gegenüber Diagnose-Fassung | Geprüfter Direct-PCM-Verlauf bitidentisch; WASM unverändert |

Diese Gegenproben gelten für beide Transportpfade, soweit im Test ausgewiesen. Die Transportverzögerung ist bewusst injiziert, keine Messung des realen Opera-MessagePorts.

Die Session-Fence-Hypothese wurde gegen andere Erklärungen geprüft: Rejects sind auch bei stabiler Epoche reproduzierbar; eine nicht abgeschlossene Stimme ist durch einen Gap-Fence reproduzierbar. Der Dump zeigt nur eine Direct-Initialisierung, eine Entrophon-Initialisierung und keinen protokollierten Direct-Panic-Aufruf. Das stützt automatische Gaps als Erklärung der Epoch-Zahl, liefert aber weiterhin keine reale Gap-Geometrie oder Reject-Verteilung. **Keines dieser Experimente ordnet die 588 historischen Rejects nachträglich einer Ursache zu.**

Der 20-ms-/256-Frame-Widerspruch ist bestätigt. Ob er im physischen Lauf häufig genug auftritt, um die schlechte Ansprache zu erklären, bleibt offen. Eine neue Grace-Grenze oder ein permissiverer Fence wäre ohne diese Zuordnung eine spekulative musikalische Änderung. Deshalb enthält diese Fassung keine solche Änderung.

## Was geändert wurde

Die heiße Strecke erhöht ausschließlich feste numerische Zähler und Histogramme. Keine neuen per-Attack-React-Updates, Eventlogs oder Diagnoseobjekte. Worklet-Snapshots werden erst beim ausdrücklichen Diagnose-Download angefordert; kein neuer periodischer Worklet-Nachrichtenstrom.

`admission_session_snapshots.json` enthält:

- `direct.host` und `entrophon.host`: Producer-Ablehnungen nach inaktivem Zustand, ungültigem/vergangenem Ziel, Transportplatz, Quantum-Limit, ungültigem Bedarf, Token, Renderunits, Stimmen und Reservationskapazität.
- Dieselben Hosts: getrennte Submit-Ablehnungen nach bereits erfolgreicher Reservation; Eingangs-/Zielzeit-Histogramme; Session-Nachrichten und tatsächliche Session-Wechsel; Freigabegründe normales Ende/Ablehnung/Fence/Producer-Abbruch.
- Alte Ergebnisnachrichten: `recordResultIgnoredEpochMismatch` und alle empfangenen Resultate über Epochen hinweg; auch ignorierte Start-/End-Nachrichten werden gezählt. Die bisherigen Zähler bleiben als Vergleich erhalten.
- `direct.consumer` und `entrophon.consumer`: Fence-Gründe Context/Mute/Panic/Stop, letzte/maximale und histogrammierte vorzeichenbehaftete Frame-Lücke, beobachtete Quantum-Längen, verworfene wartende Records, durch Fence freigegebene und davon bereits gestartete Reservationen.
- Beide Consumer: getrennte inaktive, stale, ungültige, Old-Epoch-, Reservations-, Port-Queue- und echte Kernel-Ablehnungen; echte Kernel-Aufrufe und Return-Codes; tatsächliche Start-/End-Zähler.
- `direct-input` und gegebenenfalls `special-input`: frühe Gate-Verluste und Input-Alter vor Eintritt in den Host.

Wichtige Leseregeln:

- `host.kernelRejected` ist ein historischer Sammelname und enthält weiterhin auch Consumer-Rejects. Erst `consumer.rejectReasons.kernelNonzero` zählt echte nicht-null Kernel-Returns.
- Direct-Input-Alter basiert auf `performance.now() - requestedAtMs`. Entrophon verwendet `context.currentTime - intendedStartTimeSec`; das ist ein Scheduled-Time-Offset und kein gleichartiger DOM-Input-Zeitstempel. `inputAgeBasis` benennt den Unterschied.
- Histogrammgrenzen sind inklusive Obergrenzen; die letzte Zelle liegt oberhalb der letzten Grenze. `contextGaps` zählt ausschließlich beobachtete Nichtnull-Lücken.
- Reject-Gründe benennen die zuerst verletzte Grenze, nicht sämtliche gleichzeitig verletzten Bedingungen.
- Die Snapshots beider Hosts sind nicht atomar. `consumerSnapshotStatus` markiert empfangene, fehlende oder innerhalb 750 ms nicht beantwortete Snapshots. Ein Timeout ist kein Beweis für eine bestimmte Audio-Ursache.
- Die neue Diagnose misst keine Lautsprecherlatenz und enthält weiterhin kein PCM.

## Verifikation

Alle 14 ausgeführten Testkommandos bestanden, darunter die A1/A2-Suite mit fünf Gegenproben, die neue 400.1-Diskriminierung, S1/S2, Encoder-Lifetime, OP3, Runtime-/Hold-Grenzen, beide WASM-Smokes, Cutover und das vollständige Post-Master-Skript mit nativen C-Tests.

Die neue Gegenprobe prüft außerdem den Export beider echter Host-/Worklet-Instanzen, ZIP-Erzeugung, fehlenden periodischen Diagnose-Nachrichtenverkehr und Parent-PCM-Parität. Fokussierte strikte Typprüfung und Core-Singlefile-Build bestanden.

Reproduktion im Source-Ordner mit der vorhandenen separaten Toolchain:

```sh
npm run test:live-instrument
node tools/audio/test-responsiveness-diagnostics-400-1.mjs
node node_modules/typescript/lib/tsc.js -p tools/audio/tsconfig.live-instrument.json --noEmit --pretty false
bash tools/audio/test-post-master.sh
npm run build:core-singlefile
```

Der unveränderte WASM-SHA-256 ist:
`72603702e6fdcf07b97ff57e76986d6df9d4f1ada97fb41e320186da578b6c82`.

## Ein nächster physischer Lauf entscheidet

`Xensonar_400.1_HAUPTRAUM_DIAGNOSTIC.html` wie gewohnt in Opera öffnen. Bei laufendem Beat/Material zunächst mit Entrophon AUS einige Einzeltöne, einen Akkord und ein Glissando spielen; danach dieselbe kurze Folge mit Entrophon AN. Anschließend kurz ausklingen lassen und den vorhandenen Button **Runtime-Diagnose ZIP** drücken. Keine Terminal-, Server- oder SAB-Einrichtung erforderlich.

Der Download heißt `Xensonar_400.1_BROWSER_IMPLANT_RUNTIME_<Zeitstempel>.zip` und enthält die zusätzlichen Snapshots beider Hosts. Er wird für die nächste kausale Entscheidung benötigt; eine Hörbestätigung allein kann die fehlenden Reasons nicht ersetzen.

Entscheidung danach:

1. Dominante Context-Fences mit vielen abgebrochenen gestarteten Reservationen: anhand realer Gap-Geometrie den Session-Vertrag eng korrigieren; keine Catch-up-Arbeit.
2. Stabile Session, dominante Producer-/Consumer-Stale-Verluste: Live-Input-/Transport-Zeitvertrag korrigieren; keine pauschale Lookahead-Erhöhung.
3. Dominante Unit-/Voice-Verluste: bisherigen Headroom-Schutz beibehalten und zunächst das tatsächliche Kosten-/Lebensdauermodell prüfen.
4. Wenn diese Muster den Hörbefund nicht erklären: keine Architekturhypothese als bestätigt ausgeben; die nächste gezielte Messung auswählen.

Der physische Responsiveness-Fix und die Zielgeräte-Abnahme bleiben ausdrücklich offen. Die Diagnose-Fassung hebt keine bestehenden Audio-Schutzgrenzen an und beginnt keine A3-Arbeit.
