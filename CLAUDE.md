# CLAUDE.md — XenSonar development contract

Du arbeitest am bestehenden **XenSonar**, nicht an einem neuen DAW-Prototyp. Dieser Handoff enthält echte Quell- und Referenzdateien. Geh nicht davon aus, dass deine Kenntnis vergangener Chats vollständig ist.

## Primärquellen und Priorität

1. **`src/` ist die Quelle, `index.html` das gebaute Ergebnis.** `src/index.template.html` enthält das HTML-Gerüst, `src/js/` und `src/css/` je einen Block pro `<script>`/`<style>` (Nummer = Reihenfolge, Name = Block-`id`). Nach jeder Änderung `python3 tools/build.py` ausführen; `python3 tools/build.py --check` muss vor jedem Commit OK melden (läuft auch als GitHub-Action).
2. **`index.html` im Repo-Hauptverzeichnis** ist die einzige ausgelieferte Datei (Netlify, offline). Nie direkt bearbeiten. Pro Release zusätzlich eine ZIP mit byteidentischer `index.html`.
3. Versionen liegen als Zweige `version/...` (siehe README). Der alte Quellcode 3.1.6 (`version/xensonar-3.1.6-maerz`) ist Herkunft, keine Arbeitsbasis.
4. `docs/` und `evidence/` sind Begleitdokumente. Sätze in alten Patchplänen sind keine Beweise für aktiv implementierte Features (`QA_PENDING`, `REVERTED`, `ISOLATED`, `NOT_MERGED`).
5. Nicht neu formatieren oder vollständig generieren, wenn ein kleiner präziser Patch reicht. Der große Block `src/js/010-main-bundle.js` ist gebautes React-Bundle mit späteren Direkt-Patches.

## Zielbild

XenSonar ist ein kreatives Instrument und experimentelles Musiksystem: mikrotonal, frei in Tuning und Zeit, modular erweiterbar, offlinefähig, mit Main Room, Root Follow, Nodal, Entrophon/Forge, Drums, Wave Editor, Recording, gespeicherten Sessions und Package Station. 12-EDO/4-4 sind Optionen, keine Obergrenze. Schnelles, verständliches musisches Feedback zählt genauso wie korrekte Audiomathematik.

## Arbeitsregeln

- **Keine ungefragten Big Bang Refactors.** Eine tatsächlich besser wartbare Architektur muss mit vertretbarer Änderung, Testbarkeit und Herkunft verifizierbar sein.
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
4. Änderungen gegen Parent diffen; 32 Scripts/77 Styles und die übrigen unveränderten Bereiche verifizieren.
5. Relevante Syntax-, Unit-, DOM-, Browser-, Audio- und Persistence-Checks, plus negativen Test dokumentieren. Fehlende Umgebung offen benennen.
6. **Separat lieferbare Standalone-HTML** und ZIP mit exakt identischen HTML-Bytes; SHA-256, Größe, ZIP-CRC und Inhalt prüfen.
7. Eindeutigen Namen + Patchnotes + Daten-Owner + offene Risiken + Rollback-Datei übergeben. Nicht Netlify-Production-Publish behaupten, wenn nicht geprüft.

Ausführliche Dokumentation: `docs/` und `evidence/XenSonar_HTML_FIRST_RELEASE_POLICY_V1.md`.

## Heiß/Kalt-Vertrag (verbindlich, Details: `docs/HOT_COLD_CONTRACT.md`)

XenSonar ist ein Musikinstrument, auch wo es wie Verwaltungssoftware aussieht. Vor jeder Änderung die Zone bestimmen und im Patchbericht nennen:

- **HEISS (Audio-Thread, Scheduler, Regler → AudioParam):** schlank, vorgeplant, keine Allokation pro Block, kein React/Storage/JSON/Validierung pro Tick oder Reglerbewegung, Parameter nur geglättet.
- **WARM (Oberfläche des Hauptraums):** Audio zuerst, App-State und Persistenz erst bei Ruhe; Visuals dürfen Frames verlieren, Audio nie.
- **KALT (Forge, Package Station, Archiv, Export, Diagnose):** schläft, solange der Hauptraum spielt; lädt und rechnet erst bei Gebrauch.

Messlogik nur in Probe-/Test-Builds; nachweislich optimierte Bereiche ohne Messcode ausliefern. Optimierung nie auf Kosten des musikalischen Möglichkeitsraums. Bewährte Pfade nur bei reproduziertem Problem oder ausdrücklichem Wunsch ändern. Jeder Patch nennt seinen HTML-Größenzuwachs; Neues wird lazy geladen.
