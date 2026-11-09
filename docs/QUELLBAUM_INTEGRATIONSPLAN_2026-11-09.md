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

---

# Nachtrag: September-TypeScript-Quellbaum (400.2 / 399)

**Eingang:** `XenSonar_CLAUDE_HISTORISCHE_TS_ARCHITEKTUR_2026-11-09.zip` (Archiv-SHA-256 laut `EVIDENCE.json`). Analysiert wurde 400.2 (399 ist zu 99 % inhaltsgleich: 1 649 von 1 669 gemeinsamen Dateien identisch).

## Befund
- 400.2 ist ein echtes TypeScript/React/Vite-Projekt: **1 328 Produktdateien** (ohne Tests, `.d.ts`, `external/`), 8,7 MB Quelltext, explizite Imports/Exports, Typecheck-Matrix in Teilbereichen.
- **Abstammung belegt:** Von 14 686 markanten Zeichenketten aus dem TS-Code stehen 5 326 (36 %) unverändert im heutigen `index.html`. 211 TS-Dateien haben ≥ 3 eindeutige Anker im heutigen Hauptblock. Beispiel: `features/xensonar/rooms/useStableRhythmMetronomePulse.ts` ist Zeile für Zeile die minifizierte Funktion `tEe`, die in LIVEPATH-02 entschärft wurde.
- **Starke Weiterentwicklung seitdem:** 371 von 891 TS-Dateien mit ≥ 3 Zeichenketten sind zu < 10 % wiederzuerkennen, nur 85 zu ≥ 80 %. `App.tsx` nur 10 %.
- **Lage im heutigen Bundle:** Die TS-stämmigen Teile liegen in **46 der 230 Oktober-Bereiche**, die zusammen **3,46 MB (57 %)** des Hauptblocks ausmachen. Das ist der minifizierte React-Kern. Die übrigen ~184 Oktober-Bereiche sind später direkt als lesbares JavaScript hinzugekommen.

## Schichtenbild
1. **September:** modulares TypeScript → Vite-Build → minifiziertes Bundle.
2. **Oktober:** das gebaute Bundle wird Arbeitsbasis; Concat-Quellbaum mit 305 Bereichsdateien (minifizierter Kern + lesbare Ergänzungen), 205 Tests.
3. **November:** direkte Patches an der Einzel-HTML (W31, DUB, LIVEPATH).

Die TS-Pipeline kann **nicht** einfach reaktiviert werden: Zwei Monate Änderungen am minifizierten Kern müssten zurück in TypeScript portiert und als Ganzes auf Klang-, Persistenz- und UI-Parität geprüft werden. Das ist nicht in einem verifizierbaren Schritt machbar.

## Was der TS-Baum jetzt wert ist
1. **Lesbare Landkarte des minifizierten Kerns** (größter Sofortnutzen): Zuordnung minifizierte Funktion/Bereich → TS-Datei mit Namen, Typen, Kommentaren. Macht Patches am Kern sicherer und schneller.
2. **Daten- und Schnittstellenverträge:** TS-Typen dokumentieren Session-, Drum-, Material- und Paket-Schemata (wichtig für Retrokompatibilität).
3. **Weg zurück zu typisierten Modulen, bereichsweise:** Wird ein Bereich ohnehin bearbeitet oder herausgelöst, dient die TS-Datei als Ausgangspunkt; der aktuelle Code ist die Wahrheit, Abweichungen werden nachgezogen, das Modul wird einzeln kompiliert und per Parität-Tests gegen den alten Bereich geprüft.

## Ergänzter Plan
- **Stufe 2a** (unverändert): Oktober-Grenzen auf `main` legen, byte-identisch.
- **Stufe 2c (neu):** TS-Baum 400.2 als nur-lesbare Referenz in einen eigenen Zweig `reference/ts-400.2` (nicht in `main`, nicht gebaut). In `main` eine Zuordnungsdatei Oktober-Bereich ↔ TS-Dateien (aus Zeichenketten-Ankern), später verfeinert auf Funktionsebene.
- **Stufe 3:** bereichsweise Rückführung in typisierte Module nur dort, wo ohnehin gearbeitet wird; Reihenfolge nach Nutzen (Kaltbereiche zuerst), jeweils mit Paritätstests und Messung.
