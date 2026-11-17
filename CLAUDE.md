# CLAUDE.md — XenSonar development contract

Du arbeitest am bestehenden **XenSonar**, nicht an einem neuen DAW-Prototyp. Dieser Handoff enthält echte Quell- und Referenzdateien. Geh nicht davon aus, dass deine Kenntnis vergangener Chats vollständig ist.

## Primärquellen und Priorität

1. **Quelle = `source-manifest.json` + `src/**` + `styles/**`, `index.html` ist das gebaute Ergebnis** (geordneter Concat-Build, kein Bundler; globaler Scope). Dateinamen und -grenzen folgen dem Oktober-Quellbaum (28.10.), wo sie noch passen; Inhalt ist immer der aktuelle Stand. `src/post-oct/` = seit Oktober neu hinzugekommene Blöcke, `src/post-oct/gaps/` bzw. `styles/post-oct/gaps/` = zwischen Oktober-Dateien eingefügter Code. Status je Datei: `docs/SOURCE_TREE_STATUS.json`. Einmalig `npm ci --prefix tools/slim` (esbuild für die Verdichtung, Analysewerkzeuge). Nach jeder Änderung `python3 tools/build.py` (Auslieferung: ohne Diagnoseschichten, verdichtet; `--diag` = mit Diagnose in `dist/`, `--plain` = unverdichtet); `python3 tools/build.py --check` und `./tools/run_tests.sh` (125 Regressionstests, ca. 55 s) müssen vor jedem Commit grün sein (GitHub-Action). Werkzeuge der Verschlankung: `tools/slim/README.md`. Browser-Tests: `./tools/run_e2e.sh` (Prüf-Build `tools/build.py --probe`, nie in `index.html`). Teststatus und rote Alt-Tests: `docs/TEST_STATUS_2026-11-09.md`.
2. **`index.html` im Repo-Hauptverzeichnis** ist die einzige ausgelieferte Datei (Netlify, offline). Nie direkt bearbeiten. Pro Release zusätzlich eine ZIP mit byteidentischer `index.html`.
3. Versionen liegen als Zweige `version/...` (siehe README). Der alte Quellcode 3.1.6 (`version/xensonar-3.1.6-maerz`) ist Herkunft, keine Arbeitsbasis.
4. `docs/` und `evidence/` sind Begleitdokumente. Sätze in alten Patchplänen sind keine Beweise für aktiv implementierte Features (`QA_PENDING`, `REVERTED`, `ISOLATED`, `NOT_MERGED`).
5. Bei Fehlerbehebungen und neuen Funktionen gilt weiter: kleiner präziser Patch statt Neuformatieren. Für die Verschlankung (siehe Arbeitsregeln) dürfen Dateien umgebaut, zusammengelegt oder entfernt werden. Ein Teil des Codes (v. a. 46 große Bereiche, z. B. `src/audio/…`, `src/rhythm/…`) ist minifizierter React-Kern aus dem September-TypeScript-Baum; lesbare Herkunft siehe Zweig `reference/ts-400.2` und `docs/TS_ORIGIN_MAP.json`.

## Zielbild

XenSonar ist ein kreatives Instrument und experimentelles Musiksystem: mikrotonal, frei in Tuning und Zeit, modular erweiterbar, offlinefähig, mit Main Room, Root Follow, Nodal, Entrophon/Forge, Drums, Wave Editor, Recording, gespeicherten Sessions und Package Station. 12-EDO/4-4 sind Optionen, keine Obergrenze. Schnelles, verständliches musisches Feedback zählt genauso wie korrekte Audiomathematik.

## Arbeitsregeln

- **Umbau ist erlaubt und erwünscht (Nutzerentscheidung 13.11.2026).** Die frühere Regel „keine Big Bang Refactors“ stammte aus einem GPT-Handoff für eine Ein-Wochen-Frist und gilt nicht mehr. Ziel: bei genau gleicher Funktion (alles, was im UI erreichbar ist) und gleicher oder besserer Live-Performance deutlich schlankerer, effizienterer Code. Bedingungen: in überprüfbaren Stufen arbeiten, jede Stufe mit `build.py --check`, `run_tests.sh` und `run_e2e.sh` grün, Größe und Messwerte vorher/nachher nennen, Rollback-Commit angeben. Was nur Ohren beurteilen können (Klang, Pegel, Timing), bleibt als „nicht gehört“ gekennzeichnet.
- **Feature-Ort und Daten-Owner bestimmen.** Nicht über parallele, heimliche Persistence-Adapter, Audiokontexte oder redundante UI-Steuerungen integrieren.
- **Retrokompatibilität:** vorhandene Songs, Presets, EQs, Session-Drafts, Drumbeats, Browserdaten und `.xenpack` schützen. Keine Migration, Löschung oder unverbindliche Überschreibung ohne spezifische Tests.
- **UI-Integrität:** Funktion muss *auffindbar → bedienbar → unmittelbar nachvollziehbar* sein. Benutzeraktion im echten Layout testbar machen, nicht nur seltene Grenzfälle prüfen. Eine UI-Funktion ohne erwarteten Effekt ist nicht fertig.
- **Audio:** harte Stop-/Start-/Retiming-Grenzen, Firefox-`AudioParam`-Automationskonflikte, Crossfades und Pegel nur evidenzbasiert ändern. Kein vermeintlich sicherer neuer Audio-Graph ohne vorher/nachher PCM- und Abhörtest.
- **Performance:** nicht jede Sliderbewegung die gesamte React-Hierarchie rendern lassen; gleichzeitig Live-Audioparameter nicht ungewollt drosseln. Veränderte Latenz messen.
- **Musikalische Offenheit:** frei wählbare Zahlenverhältnisse, Odd Meters, Triplets/Quintuplets/Septuplets, Polyrhythmen und flexible Temperierung berücksichtigen; nie 4/4 still voraussetzen.
- **Datensicherheit:** Paketstations-Auge ist Bestandsverwaltung; löschen nur über kanonische Owner und mit Referenz-/Shared-Asset-Schutz. Exportauswahl und Löschselektion strikt trennen.
- **Verworfene Arbeit:** Ein früher erwogener Bass-Workshop-Click-Delete/Undo-Patch wurde vom Nutzer verworfen, da Delete und Undo bereits existieren. NICHT rückmergen.
- **Statusdisziplin:** CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED, USER_ACCEPTED und RELEASED/PRODUCTION_VERIFIED ausdrücklich unterscheiden. Nie ein bestandenes Syntax-Gate zu einem Gerätetest aufwerten.

## Bevor du einen Patch lieferst

1. Exakte Parent-Datei + SHA-256 fixieren; aktuellen Problemablauf reproduzieren.
2. Existierende Funktion nach Namen und UI-Aktion auflösen; ggf. RED-Test auf Parent.
3. Kleinsten wirksamen Patch mit gezieltem Regressionstest umsetzen.
4. Änderungen gegen Parent diffen; Script-/Style-Blöcke (Stand 17.11.: `index.html` 29 Scripts/78 Styles, Diagnose-Fassung `--diag` 38/78; zählen mit `grep -o '<script[ >]' index.html | wc -l`) und die übrigen unveränderten Bereiche verifizieren.
5. Relevante Syntax-, Unit-, DOM-, Browser-, Audio- und Persistence-Checks, plus negativen Test dokumentieren. Fehlende Umgebung offen benennen.
6. **Separat lieferbare Standalone-HTML** und ZIP mit exakt identischen HTML-Bytes; SHA-256, Größe, ZIP-CRC und Inhalt prüfen.
7. Eindeutigen Namen + Patchnotes + Daten-Owner + offene Risiken + Rollback-Datei übergeben. Nicht Netlify-Production-Publish behaupten, wenn nicht geprüft.

Ausführliche Dokumentation: `docs/` und `evidence/XenSonar_HTML_FIRST_RELEASE_POLICY_V1.md`.

## Branch- und Arbeitsvertrag (Nutzerentscheidung 17.11.2026)

Standard ist **eine lineare Arbeitslinie**: Es arbeitet immer nur ein Chat, und jeder Chat baut auf dem neuesten Stand auf. Parallelarbeit ist die Ausnahme und wird vom Nutzer ausdrücklich angesagt („ich prompte jetzt 3 Chats parallel“ oder „probiere A und B aus“).

1. **Sitzungsstart:** `git fetch --all`, dann Zweige nach Commit-Datum sortieren (`git branch -a --sort=-committerdate`). Arbeitsbasis ist der **neueste Arbeitsstand**, nicht automatisch `main`. In einem Satz melden: welcher Zweig, welcher Commit, was zuletzt gemacht wurde (`docs/STATUS_…`). Weicht der neueste Stand von dem Zweig ab, auf dem die Sitzung startet, zuerst dessen Commits übernehmen (merge oder fast-forward), dann arbeiten.
2. **Kein neuer Zweig ohne Auftrag.** Schreibt die Umgebung einen Sitzungszweig vor, wird dieser Zweig vom neuesten Stand aus fortgeführt, nicht aus einem älteren `main`. Weitere Zweige nur auf ausdrücklichen Wunsch des Nutzers (Parallelbetrieb oder echter A/B-Versuch).
3. **Vor jeder Funktion prüfen, ob sie schon existiert:** `git log --all --grep`/`-S` und `docs/` durchsuchen. Gibt es eine Lösung in einem anderen Zweig, wird sie übernommen oder erweitert, nicht neu gebaut. Nie dieselbe Aufgabe zweimal verschieden lösen.
4. **Zusammenführen:** Nur bei echter Parallelarbeit. Ein Merge-Auftrag nennt vorher die betroffenen Zweige und Konfliktdateien; bei doppelten Lösungen kurzer Vergleich (Größe, Tests, Risiko) und eine Empfehlung, bevor etwas verworfen wird.
5. **Sitzungsende:** Stand committen, pushen, in `docs/STATUS_…` eintragen: Zweig, Commit, erledigt, offen, was der nächste Chat zuerst tun soll. So geht der Überblick nicht verloren.
6. **Kostenregel:** Zweigverwaltung, Doppelarbeit und Merge-Nachlauf sind Tokenverschwendung. Im Zweifel den Nutzer in einer Zeile fragen, statt einen neuen Zweig oder eine zweite Lösung anzulegen.

## Heiß/Kalt-Vertrag (verbindlich, Details: `docs/HOT_COLD_CONTRACT.md`)

XenSonar ist ein Musikinstrument, auch wo es wie Verwaltungssoftware aussieht. Vor jeder Änderung die Zone bestimmen und im Patchbericht nennen:

- **HEISS (Audio-Thread, Scheduler, Regler → AudioParam):** schlank, vorgeplant, keine Allokation pro Block, kein React/Storage/JSON/Validierung pro Tick oder Reglerbewegung, Parameter nur geglättet.
- **WARM (Oberfläche des Hauptraums):** Audio zuerst, App-State und Persistenz erst bei Ruhe; Visuals dürfen Frames verlieren, Audio nie.
- **KALT (Forge, Package Station, Archiv, Export, Diagnose):** schläft, solange der Hauptraum spielt; lädt und rechnet erst bei Gebrauch.

Messlogik nur in Probe-/Test-Builds; nachweislich optimierte Bereiche ohne Messcode ausliefern. Optimierung nie auf Kosten des musikalischen Möglichkeitsraums. Bewährte Pfade nur bei reproduziertem Problem oder ausdrücklichem Wunsch ändern (der Wunsch „schlanker und effizienter bei gleicher Funktion“ liegt seit 13.11.2026 vor; Audiopfade trotzdem nur mit PCM-Vergleich vorher/nachher). Jeder Patch nennt seinen HTML-Größenzuwachs; Neues wird lazy geladen.
