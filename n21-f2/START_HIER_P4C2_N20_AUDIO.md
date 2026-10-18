# XenSonar P4C2-N20 – gemeinsame Live-Audiokapazität

Stand: 18.10.2026. Direkter Ausbau der akzeptierten N19-Quellen. Ausführbare Datei: `XenSonar_F448_S1_P4C2_N20_Shared_Live_Audio_Test.html`.

## Was sich beim Spielen ändert

N7s schnellerer Vollklangkern wird erstmals in den Zulassungskosten berücksichtigt. Der neue Kostenvertrag unterscheidet volle Stimmen und natürliche Ausklänge. Nodal-Wellenstarter, Keyboard, Partikel, der Live-Spieler der Nodal-Installation und die Live-Nodal-Spuren der Melodic Loop teilen innerhalb desselben AudioContext ein DSP-Konto. Die vorhandene globale Stimmenverwaltung bleibt für physische Stimmen zuständig.

Die Melodic Loop bereitet ihre Nodal-Pools gestaffelt mit Worker-Paketen vor und installiert ihre benötigten exakten Tonhöhen vor dem Transportstart. Innerhalb der laufenden Wiedergabe bleibt Note-On synchron; kein Anschlag wartet auf eine Workerantwort. Die bereits vorhandene Startreserve von 120 ms bleibt bestehen. Die Vorbereitung nach Play kann bei umfangreichen Klangbanken länger dauern; sie findet vor diesem Transportstart statt.

Neue Diagnose-Snapshots unterscheiden Host-Submission, Worklet-Annahme, erstmaligen DSP-Aufruf, Ende und Budgetablehnung. Sie werden über die bestehende kalte Diagnoseverwaltung automatisch in den bisherigen Diagnoseexport aufgenommen (`admission_session_snapshots.json`, Einträge `nodal-N`). Es gibt keine periodische neue Abfrageschleife und keine neue Oberfläche.

## Belegte Durchlassänderung

Produktiver Host + produktiver Prozessor + unveränderter N7-DSP, simulierte WebAudio-Knoten/Ports. Alle angenommenen Stimmen wurden tatsächlich gerendert und mit unabhängigen Referenzstimmen samplegenau verglichen.

| Sample-Rate | Aktive Nodes | N19 volle Stimmen | N20 volle Stimmen |
|---|---:|---:|---:|
| 48 kHz | 3 | 8 | 9 |
| 48 kHz | 7 | 4 | 5 |
| 48 kHz | 12 | 2 | 3 |
| 96 kHz | 3 | 4 | 4 |
| 96 kHz | 7 | 2 | 2 |
| 96 kHz | 12 | 1 | 1 |

Das sind Kapazitätsfälle ohne zusätzlich belegte primäre Nodal-Spuren. Keine universellen Prozentwerte für die ganze Anwendung. Bei Mischlast gilt das gemeinsame Konto.

Der Tail-Test zeigt zudem bei 96 kHz: Nach Ende der trockenen Release-Phase können vier volle Drei-Node-Stimmen als vier natürliche Tails weiterklingen und eine neue volle Stimme hinzukommen. Keine abgeschnittenen Ausklänge, keine Veränderung laufender Klangkerne, kein Nachholen abgewiesener Noten.

## Kosten- und Prioritätsvertrag

- Gemeinsame Nodal-Grenze: 16 DSP-Einheiten und maximal 32 physische Nodal-Stimmen je AudioContext. Die einzelnen Worklets behalten ihre unabhängige letzte Kapazitätsprüfung.
- Nur die durch die ursprüngliche N7-Matrix und aktuelle Versuche abgedeckten V2-Klassen mit exakt 3, 7 und 12 aktiven Nodes werden günstiger bewertet: 85 %, 80 %, 80 % der früheren Vollstimmenkosten, jeweils mindestens die ursprünglichen Plan-Kosten einschließlich Sample-Rate-Skalierung.
- Andere Node-Anzahlen, V1 und andere Renderer behalten ihre bisherigen Vollstimmenkosten. Der explorative breitere Rabatt wurde verworfen.
- Natürliche V2-Tails kosten weiterhin 75 % des **ursprünglichen** Preises, höchstens den neuen Vollstimmenpreis. Kein zweiter Rabatt auf den bereits reduzierten Preis.
- Eine laufende primäre Melodic-Playerregistrierung hält für neue sekundäre Stimmen mindestens zwei Einheiten beziehungsweise den Preis einer ihrer vorbereiteten primären Stimmen frei. Mehrere Spuren teilen dieses Konto. Die Reserve ist kein garantierter Akkordvorrat.
- Bereits klingende sekundäre Stimmen werden bei nachträglichem Start der Melodic Loop nicht verdrängt. Neue primäre Noten können bis zur natürlichen Freigabe ebenfalls abgewiesen werden. Das ist eine bewusste Grenze des Vertrags, laufende Stimmen zu erhalten.
- Ein Nodal-Ton verbraucht ein globales physisches Ticket. DSP-Komplexität wird nicht nochmals als mehrere globale Stimmen abgerechnet. Das gilt nun auch für Melodic, den Installation-Livepfad und den bereits als PCM vorbereiteten manuellen Preview.
- Entrophon/C11 und RFL behalten ihre eigenen Kosteneinheiten und Klangkerne. Eine universelle CPU-Währung wird nicht vorgetäuscht.

Wichtig für umfangreiche Projekte: N19 konnte mehrere lokale Nodal-Budgets nebeneinander ausschöpfen. N20 verhindert diese Überbuchung. Daher können unter gleichzeitiger Last mehrerer Nodal-Spieler weniger Nebenstimmen zugelassen werden als zuvor, auch wenn ein einzelner Spieler mehr volle Stimmen schafft. Die strukturelle Änderung schützt gemeinsame Kapazität; ein höherer Gesamt-Durchlass auf Zielhardware ist noch separat nachzuweisen.

## Behobener Lebenszyklusfehler

Beim Stoppen eines geplanten, noch nie gerenderten V2-Tons konnte der bisherige Retire-Pfad 128 Frames berechnen und damit einen vorzeitigen Phantomanschlag erzeugen. N20 gibt solche Slots ohne Rendern und ohne Fade-Audio zurück. Bereits hörbare Stimmen behalten den bisherigen expliziten Stop-Fade. Getestet: Ausgabe bleibt beim Abbrechen einer zukünftigen Note exakt null; danach lässt sich eine neue echte Note starten.

## Prüfung und Grenzen

**61 Prüfpunkte bestanden.** Der aktuelle Ergebnisstand liegt unter `results/p4c2-n20-validation.json` und im vollständigen Testlog. Darunter:

- Mehrstimmen-PCM inklusive Gliss, natürlicher Release und vollständiger Freigabe bei 48/96 kHz; 1.199.616 exakt verglichene Kanalwerte in der neuen gemeinsamen Runtime-Matrix.
- Bestehender N7-Vergleich: 576.800 exakte Kanalwerte und 5.400 exakte Zustände bei fünf Sample-Raten, mehreren Instrumenten und unregelmäßigen Blockgrößen; zusätzlich bestehende N4-Paritätsmatrix und N7-Sessionvorbereitung.
- Echte Worker-Threads mit produktiv serialisiertem Vorbereitungscode: exakte Frequenzen, Vorbereitungsbarriere, keine Workerjobs bei Note-On, Abbruch und saubere Ressourcenfreigabe.
- Produktiver Melodic-Transport: vorbereitete Pools und Tonhöhen vor dem ersten Notenpaket, ein physisches Ticket je Ton, primäre Registrierung und Stop/Dispose.
- Bestehende Entrophon-WASM-/Bibliotheks-/Melodic-Prüfungen sowie RFL-Einstellungs- und residente Base-/Fragment-Prüfungen.
- Neue Host-Mischung: neun volle Nodal-Stimmen neben echtem C11-Direktkern, Entrophon-WASM und residentem RFL-Base-Renderer; die separat wiederholten primären PCM-Ausgaben bleiben exakt gleich. Keine gegenseitige Zustandsverunreinigung oder stillschweigende Ausblendung.
- Alle N19-UI- und Style-Quellen, N7-Klangkern, C11, RFL, Drum/Bass/Material-Routing sowie Physik sind über Quellhashes unverändert. Nur sechs produktive Backend-/Vorbereitungsadapter wurden geändert; der Browser-Tabtitel wurde auf N20 aktualisiert.
- Reproduzierbarer Standalone-Build und JavaScript-Syntaxprüfung.

Der CPU-Benchmark vergleicht historische N6-Last, N19-DSP bei alter Zulassung und N20-DSP bei neuer Zulassung. Höherer Durchlass bedeutet nicht weniger CPU als N19 bei weniger Stimmen. Die Ergebnisse enthalten deutliche Host-Zeitstreuung; einzelne p95-Werte liegen über einer Audioquantumdauer. Insbesondere der Mischtest benutzt auch VM-Renderer und misst deren erheblichen Harness-Overhead. Diese Werte sind **kein bestandener Audio-Deadline-Test**. Aus ihnen wird keine automatische Kapazitätserhöhung abgeleitet.

Chromium war in dieser Umgebung nicht installiert. Der Installationsversuch lieferte unbrauchbare Downloads; der Browser-Worklet-Test konnte deshalb nicht starten. Keine neue browserseitige AudioContext-/Gestenabnahme, kein Opera-Test und keine Hör-/XRUN-Abnahme auf dem Dell-Gerät. Die akzeptierte N19-Oberfläche bleibt quellenidentisch.

## Bewusst noch offene Ziele

1. Reale Mischlast auf dem Zielgerät mit Beat, Bass, Materialspur, RFL und Nodal/Entrophon gleichzeitig. Mehr hörbare Ereignisse und bestehende Groove-Stabilität gemeinsam beurteilen.
2. Hardwareadaptive Kapazität aus geeigneten realen Zeit-/Lastsignalen mit Hysterese. N20 aktiviert keinen CPU-Autopiloten; die Kostenklassen sind weiter statisch und konservativ begrenzt.
3. Optionaler vorbereiteter Qualitäts-Fallback nur für neue Stimmen: weiterhin aus. Bestehende volle Stimmen dürfen unverändert ausklingen.
4. Allgemeiner direkter synthetischer Nodal→RFL-Pfad: weiterhin offen. Die vorhandene Übergabe als Material bleibt erhalten.
5. Weitere Vereinheitlichung von Ressourcenidentität und Lebenszyklus zwischen C11 und Nodal, ohne verschiedene DSP-Kosten gleichzusetzen oder Shared-Bus-Pan zu verändern.

## Reproduktion und Fortsetzung

```sh
node build.cjs --verify
npm run test:p4c2-n20
npm run bench:p4c2-n20
npm run test:p4c2-n7:browser  # benötigt Playwright/Chromium
node tests/p4c2-n19-gestures.cjs
```

`tests/p4c2-n20-preservation.cjs` vergleicht gegen die akzeptierten N19-Hashes. Historische N6→N7-Dateilisten und N5-Grenzwerte sind keine aktuellen Abnahmekriterien. Der N20-Runner ersetzt diese beiden historischen Verträge durch die neue explizite Paritäts-/Kapazitätsprüfung. Mehrere ältere Testharnesses wurden um die inzwischen real benötigten Kosten-/Oktavenabhängigkeiten ergänzt; Audio-PCM-Gleichheit bleibt exakt, nur Bruchkosten werden mit 1e-9 Buchhaltungstoleranz verglichen.

Änderungsumfang: `src/nodal/04_audio_runtime.js`, `05_installation_bridge.js`, `08_melodic_live_transport.js`, `12_surface_runtime.js`, `src/instruments/06_source_preparation.js`, `07_pitch_preparation.js`. Die Produktivquellen-Änderungen sind in `N19_to_N20_Audio.patch` nachvollziehbar; vollständige Build-Metadaten, aktualisierte Tests und historische Belege liegen im ZIP.

Standalone-SHA-256: `c8b4f788e2776c9a81fd659f05c0bf553dfe7428660099c499c0e496fa2abbc6`.
