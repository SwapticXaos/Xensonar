# Live-Performance: Diagnose vom Instrumentbesitzer entkoppeln

Basis: `6fdb86a6499897964c6e7c56436bb2d904309c5c`. Aktive Datei: `Xensonar_P7_Live_Control_Isolation_Test.html`.

## Gefundener Hebel

Die Untersuchung begann mit CPU-Profilen einer tatsächlich eingeschalteten Spielfläche in Chromium, einschließlich wiederholter Mausbewegungen bei laufendem Instrument. Danach wurden Konstruktoraufrufe und die tatsächlich veränderten React-Zustände getrennt beobachtet. Das zeigte zwei zusammenhängende Ursachen:

- Zahlreiche Initialisierungen werden bei jedem App-Render erneut ausgeführt, obwohl `useRef` nur das erste Ergebnis behält. Im beobachteten Gestenlauf wurde beispielsweise die Rhythmus-/Drone-Wiederherstellung 136-mal ausgeführt. Diese Instrumentierung diente der Suche; ihre Zeitwerte enthalten eigenen Messaufwand.
- Der wichtigere Auslöser ist die Kopplung reiner Diagnosezustände an die globale Instrumentoberfläche. Die beiden Felder für Audio-Event-Intake und Audio-Tap-Diagnose lebten als React-State im Hauptbesitzer. Jede neue Messung konnte dadurch den gesamten App-Baum erneut rendern und alle darin enthaltenen Initialisierungen erneut anstoßen.

Im aktuellen Core-Build sind die dazugehörigen Diagnosepaneele in der Hauptansicht nicht eingebunden (`eue`/`tue` sind Platzhalter). Die Diagnose bleibt dennoch wichtig für Analyse, Laufzeitbeobachtung und Export. Deshalb wird ihre Datenproduktion erhalten und ihre unnötige Verbindung zum globalen Rendering entfernt.

## Architekturänderung

Genau eine Produktionsdatei ändert sich: `src/rhythm/04_workspace_and_transport.js`.

Zwei vom jeweiligen Instrumentbesitzer gehaltene Snapshot-Kanäle ersetzen die zwei reinen Diagnose-States in `Cke`. Ihr kleiner Vertrag besteht aus `getSnapshot`, `publish` und `subscribe` mit Abmeldung. Sie gehören zum vorhandenen Besitzer; es gibt keinen zusätzlichen globalen Bus und keine neue Audio-Engine.

`publish` übernimmt den vollständigen Snapshot unmittelbar, unterstützt wie zuvor funktionale Aktualisierungen und vermeidet Meldungen bei identischer Objektidentität. Mehrere Beobachter können gezielt abonnieren. Ein Fehler eines Beobachters wird protokolliert und unterbricht andere Beobachter nicht. Ein später eingebundenes Diagnosefenster kann etwa über `useSyncExternalStore` direkt abonnieren, ohne die ganze App zu beobachten.

Die bisherigen `audioEventIntakeMonitor`- und `audioTapMonitor`-Zugriffe bleiben als aktuelle Getter erhalten. Der Aggregator `kke` übernimmt deshalb Eigenschaftsdeskriptoren: Eine gewöhnliche Objektkopie würde die Getter einmal auswerten und wieder veraltete Snapshots festhalten. Die native Prüfung liest nach 40 Veröffentlichungen die erwarteten letzten Werte über genau diese bestehenden Zugriffe.

Die Audio-Event-Intake-Referenz für Steuerung und Diagnose bleibt bestehen. Der Audio-Tap-Messtakt von 128 ms, die Master-Kontrolle von 84 ms, deren AudioParam-Steuerung und die übrigen Analysefunktionen werden nicht geändert. Es werden weder Messungen ausgelassen noch Daten verdichtet oder klangliche Berechnungen vereinfacht. Die tatsächlichen musikalischen Steuerwerte bleiben regulärer Zustand; die Änderung betrifft ausschließlich die beiden Diagnose-Snapshots.

## Nachgewiesener Unterschied

Der native Regressionstest arbeitet mit dem vollständigen produktiven HTML und echtem React. Als Vergleich rekonstruiert er die vorherige HTML-Version durch Rücknahme genau der erklärten Produktionsänderung; deren SHA-256 muss exakt zur vorherigen Veröffentlichung passen. Dadurch vergleichen die Versuche dieselbe sonstige Codebasis.

Eine kontrollierte Serie veröffentlicht 40 Paare vollständiger Diagnosewerte, mit je einer Browser-Frame-Grenze dazwischen. Das ist ein Belastungstest der Datenverbindung und kein behaupteter normaler Messtakt.

| Verhalten | Bisherige Basis | Neue Basis |
|---|---:|---:|
| Veröffentlichte Diagnose-Snapshots | 80 | 80 |
| Dadurch ausgelöste komplette App-Renderdurchläufe | 40 | 0 |
| Dadurch mitlaufende Rhythmus-/Drone-Wiederherstellungen | 40 | 0 |
| Letzter Intake-Wert | 39 | 39 |
| Letzter Tap-Wert | Diagnostic 39 | Diagnostic 39 |
| Vollständige Benachrichtigungen gezielter Abonnenten | kein Kanal | 80 |

Im Freigabelauf sank `ScriptDuration` für diese kontrollierte Serie von rund 262 ms auf rund 1,7 ms. Ein vorheriger isolierter Kandidatenlauf zeigte denselben grundlegenden Unterschied mit rund 215 ms gegenüber rund 12 ms. Diese Werte messen die JavaScript-Arbeit der konkreten Meldungsserie auf dem Hauptthread, keine Beschleunigung der DSP-Kerne oder des gesamten Instruments um einen solchen Faktor.

Zusätzlich führt der Test je drei abwechselnde Läufe mit eingeschaltetem Instrument und jeweils 100 echten Mausbewegungen auf der Spielfläche aus. Rohwerte stehen in `browser-performance.json`. Im Freigabelauf lagen die App-Renderzahlen der Basis bei 68/75/71 und die des Kandidaten bei 32/37/36. Auch ScriptDuration war dort geringer. Die Zeitmessungen schwanken zwischen Läufen und mit paralleler Cloud-Last; daraus wird keine allgemeine Prozentgarantie für Live-Latenz oder Gesamtgeschwindigkeit abgeleitet. Der belastbare Architekturgewinn ist die Entfernung der belegten Diagnose-zu-App-Render-Kopplung bei unveränderten Daten.

Die CI-Grenze prüft die konkrete Ursache: Die kontrollierten Diagnosemeldungen dürfen höchstens zwei App-Renderdurchläufe aus anderen Initialisierungsereignissen überlagern; alle 80 Kanalbenachrichtigungen und die letzten Nutzdaten müssen erhalten bleiben. Es gibt kein fragiles, hardwareabhängiges Millisekundenlimit.

## Separat verworfener Ansatz

Das verzögerte Erzeugen der Main-Room-Defaults und Browser-Wiederherstellung wurde zunächst unabhängig untersucht. Es verhinderte die verworfenen Wiederherstellungen, ließ aber weiterhin alle App-Renderdurchläufe zu. Die isolierte JavaScript-Zeit änderte sich lediglich von 214,876 auf 211,423 ms, also rund 1,6 Prozent. Dieser Unterschied ist innerhalb der beobachteten Schwankung.

Diese Änderung ist **nicht integriert**. Ihre genaue Versuchsfassung und das Urteil stehen in `rejected-initialization.json`; die getrennten Kandidatenmessungen stehen in `initial-variants-browser.json`. Die gespeicherte Initialisierung bleibt unverändert. Durch weniger unnötige App-Renderdurchläufe wird sie in der neuen Basis dennoch seltener ausgeführt. Das verhindert, dass ein kleiner, unbewiesener Ansatz zusammen mit dem größeren Architekturgewinn als Performanceverbesserung mitgeführt wird.

## Erhalt der Instrumentlogik

Alle Synthese-Kerne, Worklets, Stimmenlimits, musikalischen Tonhöhen-/Zeitregeln, Klangparameter, Panning-Pfade und die gesamte Endstufe bleiben bytegleich zur Basis. Es gibt keine neue Laufzeitabhängigkeit, Audioknoten, Intervalle, FFTs oder zusätzliche PCM-Kopien. UI-Quellen und gespeicherte Projekt-/Paketformate bleiben unverändert. Die 207 Quell- und 27 Stil-Einheiten sowie ihre Build-Reihenfolge bleiben bestehen.

Der Host-Test prüft unabhängige Kanalbesitzer, vollständige Objektidentität, funktionale Aktualisierungen, gleiche Werte, Abmeldung, Beobachterfehler und 200 aufeinanderfolgende vollständige Snapshots. Der native Test prüft die tatsächliche Einbindung im App-Besitzer einschließlich alter Getter. Ein umkehrbarer Änderungsnachweis rekonstruiert die vorherige Produktionsdatei und schützt sämtliche unveränderten Quellen.

Die vorhandene Forge-Anfrage- und Persistenz-Absicherung bleibt enthalten. P7.12 bleibt archiviertes, nicht integriertes Experiment. Globale Einstellungen erfordern nach Paketimport weiterhin einmaliges Neuladen.

## Prüfungen und Grenzen

Bestanden: 49 Host-/Build-Prüfungen, 13 Chromium-/Build-Prüfungen sowie die zusätzlichen Play-/Save-/Navigationsprüfungen. Ein ergänzender nativer Vertragstest erhält die Kanal- und Snapshot-Identität auch über eine normale Änderung des Master-Reglers und den dadurch gewollten App-Render hinweg.

Der native PCM-Vergleich zur unmittelbaren Basis liefert identische Ergebnisse für Legacy, Nodal V1/V2 und den tatsächlichen Entrophon-WASM-Pfad; beim nativen Sample-Pfad bleiben Differenzen unter 1e-7 einschließlich Wiederholungskontrollen. Der tatsächliche RFL-Worklet verarbeitet 480 Root-Wechsel und vier absichtliche Hauptthread-Stalls von jeweils 80 ms ohne Aussetzer der geschützten Hauptspur, nicht endliche Werte oder Worklet-Fehler. Das sind konkrete getestete Signale und keine pauschale Zusage für jede Gerätekonfiguration.

Build SHA-256: `8b82986d2ce0f6e5171bc37dd9a935f2da2d0bb35dcb3296ecff1952e539eb48`.

Die Ergebnisse der gemeinsamen Host-/Build- und Chromium-/Build-Prüfungen stehen unter `results/live-control-ownership/`. Aktuelle Ergebnisse älterer Regressionstests werden darin separat archiviert; historische Veröffentlichungsnachweise bleiben unverändert.

Die Messungen stammen aus Chromium in dieser Cloud-Umgebung. Sie sind kein physischer Audiogerätetest und kein Nachweis tatsächlicher Firefox-/Opera-Latenzen. Die Architekturänderung schafft Hauptthread-Spielraum; eine höhere zulässige Stimmenzahl oder geringere Audio-Puffergröße wird daraus nicht automatisch abgeleitet.
