# AUDIO-ANALYSE-01 · Wave Editor: Analyse von Tempo, Root in Hz, Stimmung und Skala (nur lesend)

Parent: `LANE-FOLLOW-01` (Zweig `claude/gracious-cori-okf1pn`, neuester Stand; enthält THUNDER-ONE, HWKB-01/02, LIVE-LANE-01, LONG-BARS-01). Parent `src/rooms/lab.js` SHA-256 `3898cd02…c5d5`. Rollback: Commit `ac6dd38` (der Parent).
Zone: **KALT** (Wave Editor, nur auf Klick, eigener Worker; kein Audio-Graph, kein Scheduler, keine Persistenz, keine Daten-Owner-Änderung). Der Worker wird erst beim Klick gebaut; nichts läuft, solange der Hauptraum spielt.
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/audio_analysis.test.cjs`, synthetische Musik mit bekannter Lösung), BROWSER_CHECKED (`tests/e2e/audio_analysis.cjs`). **Nicht an echter Musik geprüft, nicht gehört** – alle Genauigkeitswerte sind Schätzungen des Algorithmus.
HTML-Größenzuwachs: +20 818 Bytes (`index.html` 8 162 821 → 8 183 639 Bytes; Analysekern, Worker-Glue, Editor-Knopf). Standalone-`index.html` ohne ZIP; ein Release-ZIP entsteht erst mit dem Release.

## Was der Nutzer sieht
**Wave Editor** (Panel „Edit Audio“, direkt unter „Analyze Selection“): Knopf **Analyse Tempo · Root · Scale**. Er analysiert die **lila Auswahl**; ohne Auswahl (nur Caret) die **ganze Datei**. Pro Analyse höchstens **die ersten 2:00** (ist die Auswahl länger, steht das im Ergebnis: „the first 2:00 of the 2:10 range“); mindestens 4 s. Der Kanal-Schalter L / R / L+R des Editors gilt. Ergebnis als Text im Panel (wie „Analyze Selection“):
- **Tempo** in BPM mit Accuracy in % und Halb-/Doppeltempo-Alternativen.
- **Root** zuerst als **Hz-Zahl**, dahinter „= A1“ (innerhalb 1,5 ct von 12-EDO/A440) oder „≈ G♯2 −12 ct“.
- **Tuning**: 12-EDO, 19-EDO, 31-EDO, 17/22/24/41/53/5/7/14-EDO, Just Intonation (5-/7-Limit), Bohlen–Pierce (13 Schritte pro 3:1) mit Accuracy; weitere Kandidaten mit Fit-Wert; bei 12-EDO das gefundene A4 („A4 = 432.5 Hz“).
- **Scale** (Phrygian, Harmonic minor, Dorian, Pentatonik, Blues, Doppel-Harmonisch …; für andere EDOs per Rundung der 12er-Skalen; Bohlen–Pierce Lambda) mit Accuracy, Alternativen („or Phrygian dominant on 41.20 Hz“) und den benutzten Stufen über dem Root.
- **Abschnitte** („Mehrfachnennung“): wechselt Tonart oder Stimmung im Audio, werden die Strecken getrennt ausgewiesen (Zeiten auf der Zeitachse der Datei). Wer die Wechselstelle mit der Auswahl markiert, bekommt für diese Strecke eine eigene Analyse.
Ein zweiter Klick während der Analyse bricht ab; wird das Audio währenddessen bearbeitet, erscheint kein Ergebnis zu falschem Material. **Nichts wird verändert**: kein Edit, kein Undo-Eintrag, kein Carrier, nichts im Spectral Forge. (Ein erster Entwurf hing den Knopf an die Forge-Maske; verworfen, weil der Forge-Raum mit Transform to Carrier die Brücke zur Spectral Forge ist und die Analyse zur Arbeit mit der Wave gehört.)

## Wo der Code liegt
`src/post-oct/015b-xen-wave-analysis.js` (im Skript des Wave Editors, kein neues `<script>`): Werkzeuge (FFT, Resampling), Analyse, Worker-Glue, Textformat. Die **Tonhöhenextraktion** (`__audioCarrierAnalysisFactory`, dieselbe wie bei Transform to Carrier) wurde **unverändert dorthin verschoben**: Besitzer ist jetzt diese Datei, `lab.js` ruft sie wie vorher per Namen auf (Test + Browser-Gegenprobe: Transform to Carrier liefert weiter „pitch lines imported“). Der Editor-Knopf/`analyseTonal()` steht in `015-xen-wave-editor-w01-modules.js`. Kein neues CSS, keine Persistenz, kein neuer Daten-Owner.

## Wie (schlank, auf Transform to Carrier aufgebaut)
- **Tonhöhenlinien** liefert die vorhandene Carrier-Extraktion (`__audioCarrierAnalysisFactory`, Harmonic-Pitch-Skeleton, bis 3 Stimmen, 45–1600 Hz), in Blöcken à 55 s; es ist dieselbe Funktion wie bei „Transform to Carrier“, keine zweite Tonhöhenerkennung – nur als Rechenkern, ohne Bezug zur Spectral Forge.
- **Pegel**: ein leises Material (Spitze < 0,3) wird für die Analyse auf 0,5 angehoben (das Rauschtor der Tonhöhenlinien ist absolut); ungültige Samples (NaN/∞) werden mit Meldung abgelehnt, die Eingabe wird nie verändert.
- **Tempo**: Onset-Hüllkurve (log-komprimierter Spektralfluss, 10-ms-Raster) → Autokorrelation → Tempo-Score über 4 Vielfache der Periode (45–230 BPM, 0,05-BPM-Verfeinerung) mit weichem Tempo-Prior um 110 BPM; Accuracy aus der Prominenz des Maximums.
- **Stimmung**: Tonhöhen (in Cent) in ein 1-Cent-Histogramm gefaltet (Periode 1200 ct, für Bohlen–Pierce 1901,955 ct); jedes Stimmungssystem als Raster, Treffer mit Dreieckskern (≤ 14 ct bzw. ¼ Schritt; Just 9 ct), **Zufallskorrektur** (ein feines Raster trifft schon durch Zufall), kleiner Einfachheits-Malus für große Raster; jede Note zählt mit √Länge, damit ein Bordun nicht alles entscheidet. Das Raster-Offset wird nachgefittet (daher das gefundene A4 und die Cent-Abweichung).
- **Skala/Root**: Stufenhistogramm (plus Basston-Histogramm als Grundtonhinweis); Score = Anteil der Töne in der Skala × Abdeckung der Skalenstufen + kleiner Grundton-/Quint-Bonus. Verwandte Modi mit gleichen Tönen (A-Aeolisch / C-Ionisch) trennt nur der Grundtonhinweis – deshalb stehen sie als „or …“ in der Alternativliste, die Accuracy sinkt.
- **Abschnitte**: Kosinus-Vergleich der gefalteten Histogramme 10 s vor/nach jeder 5-s-Kante, Schnitt bei klarer Trennung (≥ 15 s Abstand), jeder Abschnitt einzeln analysiert; nur ab 30 s Material.

## Grenzen (offen, ehrlich)
- Nur an **synthetischer** Musik geprüft (Schlagzeug + Bass + Melodie/Akkorde aus Obertonklängen, 20–120 s, 22/44/48 kHz). Echte Stücke mit dichter Harmonik, Hall, Gesang oder Verzerrung können Tonhöhen und Stimmung unscharf machen; dann sinken die Accuracy-Werte, und unklares Material wird als „not determined“ bzw. „no single scale“ gemeldet (Rauschen, reines Schlagzeug getestet).
- Verwandte Tonarten (C-Dur → G-Dur) werden als Abschnittswechsel nur erkannt, wenn sich die Tonhistogramme deutlich trennen; Stimmungswechsel und entfernte Tonarten sind sicher.
- Wo 19-EDO, 31-EDO und Just Intonation nahe beieinander liegen (19-EDO ≈ Meantone ≈ 5-Limit), nennt das Panel Kandidaten mit Fit-Werten statt einer falschen Sicherheit.
- Tempo: Halb-/Doppeltempo sind prinzipiell mehrdeutig (Alternativen im Panel). Taktart wird nicht bestimmt.
- Noch nicht gebaut: „Root übernehmen“ (Hz in Root Follow / Frequency Anchor schreiben). Der Editor zeigt die Zahlen als markierbaren Text; das Setzen wäre ein eigener Schritt mit Daten-Owner-Entscheidung.

## Tests
- `tests/audio_analysis.test.cjs` (in `GREEN_NODE_TESTS.txt`): 12-EDO A harmonisch Moll 120 BPM (Tempo, 55 Hz, Skala, A4), um −30 ct verstimmtes C-Dur (≈ C2 −30 ct, A4 432,5 Hz), 19-EDO, Bohlen–Pierce, 5-Limit-Just, Tonart-/Stimmungswechsel 12-EDO → 19-EDO (2 Abschnitte, Grenze bei 40 s ± 6 s; eine Tonart = 0 Abschnitte), Negativfälle (Rauschen, Schlagzeug, Stille, < 4 s).
- `tests/e2e/audio_analysis.cjs`: echter Upload (150 s) → Wave Editor: lila Auswahl, 2:00-Grenze, < 4 s, Abbruch, Edit während der Analyse, Rauschen = „not determined“, Revision bleibt gleich (nur lesend), nichts im Forge-Rack, Transform to Carrier arbeitet weiter.

## Testlauf
`build.py --check` grün, `run_tests.sh` 126/126 grün, Browser-Suite siehe Commit-Bericht. `tests/e2e/grid_drag_selection.cjs` (Live-Room-Raster, Hover-Timing) ist **auf dem Parent genauso flaky** (3 von 6 Läufen grün auf `ac6dd38`, 6 von 6 mit diesem Patch) und wurde von diesem Patch nicht berührt.
