# Quellbaum-Integration: Diagnose und Plan (09.11.2026)

**Status:** reine Analyse, keine Produktänderung. **Funktionsbasis:** aktueller `main` (W31 + DUB-ECHO-04 + LIVEPATH-02), nicht nur W31 `e4fc…`, damit die Arbeiten seit dem Handoff erhalten bleiben.
**Eingänge:** Nachtrag `XenSonar_CLAUDE_QUELLBAUM_NACHTRAG_2026-11-09.zip` (Hashes laut `SHA256SUMS.txt` geprüft), darin Oktober-Quellbaum `XenSonar_Gesamtmerge_2026-10-28_Quellen.zip` und GPTs W31-Rekonstruktion `XenSonar_W31_Quellstand_Uebergabe_2026-11-09.zip`; Architekturaudit 26.10.

## 1. Was die drei vorhandenen Quellstrukturen sind

| Struktur | Prinzip | Granularität | Bezug |
|---|---|---|---|
| **Oktober-Quellbaum (28.10.)** | Concat-Build (`build.cjs` + `source-manifest.json`, Vorlage mit 67 Markern), kein Bundler | **305 Dateien**, fachlich benannt (`src/audio/…`, `src/rhythm/…`, `src/package_station/…`), dazu 205 Tests | baut eine ältere HTML (7,0 MB) |
| GPTs W31-Rekonstruktion (09.11.) | Concat-Build (`tools/build.py` + `manifest.json`) | 32 Blöcke, Hauptblock grob dreigeteilt um das Echo | baut W31 `e4fc…` byte-identisch |
| `main` Stufe 1 (dieses Repo) | Concat-Build (`tools/build.py`, Vorlage mit Tokens) | 32 Skript- + 77 Stilblöcke | baut aktuellen `main` byte-identisch |

Alle drei folgen demselben Prinzip (geordnete Textdateien → eine HTML, globaler Scope, keine Transpilierung). Stufe 1 ist **keine** Modularisierung und kollidiert mit nichts; GPTs Rekonstruktion ist inhaltlich durch Stufe 1 abgedeckt und braucht nicht übernommen zu werden.

## 2. Abgleich Oktober-Quellbaum ↔ aktueller `main`

### Hauptblock (`src/js/010-main-bundle.js`, 6,08 MB; im Oktober Sektion 005 aus 231 Dateien)

Methode: jede Oktober-Datei in Manifest-Reihenfolge im heutigen Block suchen; zuerst exakt, sonst über 8 eindeutige Anker (Anfang, Ende, 6 innere Ausschnitte).

| Ergebnis | Dateien | Oktober-Zeichen |
|---|---|---|
| exakt unverändert, an Ort und Stelle | 146 | 1,39 M |
| als zusammenhängender Bereich wiedergefunden, im Inneren weiterentwickelt (≥ 6 von 8 Ankern) | 84 | 3,73 M |
| nicht wiedergefunden | 1 (`src/rhythm/06_lane_pan.js`, 3 KB; Bezeichner fehlen ganz, vermutlich ersetzt durch `__XenPan`) | 0,003 M |

- Die 230 Bereiche liegen **in Oktober-Reihenfolge, ohne Überlappung** und decken **98,5 %** des heutigen Hauptblocks ab.
- Dazwischen **24 Lücken mit zusammen 93 KB** = nach Oktober eingefügter Code (u. a. Rekorder-Helfer, RFL-Transport, Echo/Live-Pfad).
- Stärkstes Wachstum: `nodal/04_audio_runtime.js` 44 → 126 KB, `sessions/v2-session-store.js` 78 → 159 KB, `mix/03_quick_menu__before_eq-core.js` 67 → 144 KB, `rhythm/02_bass_and_rack.js` 168 → 233 KB.

### Übrige Blöcke (Räume, Fabriken, Stile, Startskripte)
1:1-Zuordnung Block ↔ Oktober-Datei: **54 unverändert, 20 weiterentwickelt** (größte: `rooms/lab.js`, `rooms/canonical.js`, `rooms/nodal.js`, `factories/XenMetaEditor.js`, mehrere Stilbereiche).

### Tests aus dem Oktober
205 Testdateien (161 Node, 44 Python). ~123 lesen Quelldateien über ihre Pfade (`src/…`), ~70 prüfen eine gebaute HTML im Browser. **Übernimmt der neue Baum die Oktober-Pfade, sind viele Quelltests direkt wieder lauffähig**; Fehlschläge sind dann entweder echte Regressionen oder dokumentierte Weiterentwicklungen.

### Architekturaudit 26.10 (weiterhin gültig)
Gemeinsamer globaler Scope aller Dateien; Priorität haben Owner- und Lifecycle-Grenzen (`__F341Workbench`, `__F333`/Preview/Persistenz, `__XenQuick`, Rhythmus/Live-Audio-Routen), nicht kürzere Dateien. Kein pauschales Tree-Shaking (Code wird teils per `toString`/`eval` serialisiert). Das deckt sich mit den Funden des Live-Pfad-Audits (`__XenQuick` als Auslöser der Autosave-Kaskade).

## 3. Integrationsplan

### Stufe 2a: Oktober-Dateigrenzen auf den aktuellen Stand legen (keine Produktänderung)
1. Hauptblock entlang der Abgleichsgrenzen in `src/bundle/<Oktober-Pfad>` zerschneiden; Grenzen auf Zeilen-/Anweisungsgrenzen nachjustieren.
2. Die 24 Lücken als eigene Dateien `src/bundle/_post-oct/NN_<Vorgänger>.js` ablegen, nach Inhalt benennen (z. B. Echo, Rekorder), damit sichtbar bleibt, was neu ist.
3. 1:1-Blöcke (Räume, Fabriken, Stile) auf Oktober-Namen umbenennen.
4. Manifest = geordnete Dateiliste; `tools/build.py` liest es.
5. **Gate:** `build.py --check` byte-identisch zum aktuellen `main` (SHA-256). Da nur geschnitten und umbenannt wird, ist das konstruktiv gegeben und wird automatisch geprüft.

### Stufe 2b: Oktober-Tests wiederbeleben
1. Quelltests gegen den neuen Baum laufen lassen; Ergebnis je Test: grün / rot wegen Weiterentwicklung (Test anpassen oder ausmustern, begründet) / rot wegen echter Regression (melden, nicht stillschweigend ändern).
2. Browser-Tests gegen die aktuelle `index.html`.
3. Grüne Tests in die GitHub-Action aufnehmen.

### Stufe 3: semantische Schritte, jeweils einzeln mit Tests und Messung
- Sidecar (XNC, Native Audio, Owner-Auswahl) entfernen.
- Kaltbereiche (Package Station, Archiv) bei Bedarf laden.
- Owner-Karte für `__XenQuick`, Session-Store, Rhythmus-Routen (laut Audit 26.10).

## 4. Risiken und offene Punkte
- **Grenzgenauigkeit:** Bei weiterentwickelten Dateien kann eine Grenze einige Zeilen neben der „fachlich richtigen“ liegen. Funktional egal (Concat), nur Zuordnung; wird bei Bedarf korrigiert.
- **Divergierende Linien:** GPTs Rekonstruktion bezieht sich auf W31 `e4fc…`; `main` ist weiter (DUB-ECHO-04, LIVEPATH-01/02). Nicht mergen, nur als Referenz behalten.
- **Kein Rückholen alter Funktionen:** Oktober-Inhalte werden nur als **Grenzen und Namen** genutzt; der Inhalt jeder Datei kommt ausschließlich aus dem aktuellen `main`.
- `src/rhythm/06_lane_pan.js` gilt als ersetzt, nicht als verloren; vor Stufe 3 gegen `__XenPan` bestätigen.
- Testinfrastruktur (Playwright 1.62.1 im Oktober) gegen die hier vorhandene Version prüfen.
