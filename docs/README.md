# Wegweiser durch `docs/`

Zuerst lesen (in dieser Reihenfolge): `../CLAUDE.md` (Arbeitsregeln) → `PRODUCT_PHILOSOPHY.md` → `HOT_COLD_CONTRACT.md` → `ARCHITECTURE.md`.

| Frage | Dokument |
|---|---|
| Wie ist der aktuelle Stand, was wurde zuletzt geprüft? | `AUDIT_2026-11-13.md` (Gesamt-Audit), `STATUS_2026-11-11.md`, neueste `PATCH_*.md` |
| Was hat ein bestimmter Patch gemacht (Zone, Größe, Tests, Risiken, Rollback)? | `PATCH_<NAME>.md`, ein Dokument je Patch (ROOM4/ROOM5, STEMS, HPP, RFL-CLOCK, WORKLET-CLOCK, STORAGE-PERSIST …) |
| Wo kommt eine Quelldatei her? | `SOURCE_TREE_STATUS.json` (oct-identical / oct-evolved / post-oct), `TS_ORIGIN_MAP.json`, `provenance/` |
| Wo im Code ist eine Funktion? | `HOTSPOTS.json` (Suchbegriffe), `ARCHITECTURE.md` |
| Welche Tests gibt es, welche sind rot? | `../tests/README.md`, `TEST_STATUS_2026-11-09.md`, `QA_AND_TEST_MATRIX.md` |
| Wie sicher sind Nutzerdaten, Pakete, Sessions? | `PERSISTENCE_SAFETY.md`, `PATCH_STORAGE-PERSIST-01.md` |
| Messungen zum Live-Pfad und zu Raumwechseln | `LIVE_PATH_AUDIT_2026-11-09.md`, `RAUMWECHSEL_MESSUNG_2026-11-09.md`, `PROMPT_LIVE_AUDIO_PERF_2026-11-11.md` |
| Drum- und Bass-Stimmen ohne Graph-Änderungen (Ursache des Knisterns) | `PATCH_VOICE-HOST-01.md` |
| Knistern im Root-Follow-Loop (gelöst, Hörtest bestanden) | `RFL_CLICKS_ANALYSE_2026-11-13.md` → `RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md` → `PATCH_RFL-CLOCK-01.md`, `PATCH_WORKLET-CLOCK-02.md`; Rohmessungen `RFL_MESSUNG_*`, Aufgabenstellungen `HANDOFF_OPUS_RFL_*`, `PROMPT_OPUS_RFL_*` |
| Mehrspur-Raum (Planung und Bestand) | `MEHRSPURRAUM_BESTANDSAUFNAHME_2026-11-09.md`, `MEHRSPURRAUM_SPURKETTE_STUDIE_2026-11-09.md`, `PATCH_MT-01.md` |
| Multitrack und Wave Editor auf Profi-Niveau (Lautheit/True Peak, 24 Bit, Stems, Mastering-Weg, Fades/Crossfades, Sample-Raster, Pegelanzeigen, Pitch/Time im Wave Editor, Clip-Lautheit) | `PATCH_MTW-01.md` → `PATCH_MTW-02.md` → `PATCH_MTW-03.md` → `PATCH_MTW-04.md` |
| Loop-Rec-Takte sehen und Loop-Grenzen ziehen (Loop-Editor, Rechtsklick auf die Take-Kachel) | `PATCH_LOOPREC-BARS-01.md` |
| Loop-Rec: weiche Nähte (Fade) beim Zuschneiden eines Loops, keine Knackser an Start/Ende | `PATCH_LOOPREC-SEAM-01.md` |
| Adaptiver EQ folgt der gemalten Linie (Wave Editor, Live Room): kein starres Raster mehr, Fit-Fallback ohne Worker | `PATCH_EQ-ADAPT-01.md` |
| Nodal Center: Tor schließt mit eigener Choreografie (Mandala von innen, Hälften gleiten ein, Tiefpass abwärts) | `PATCH_NODAL-GATE-02.md` |
| Spectral Forge ohne Audio: UP/UPPER aktiv, keine Ausgrauung; Kachel-Auswahl milder | `PATCH_NOAUDIO-NAV-01.md` |
| Material-Forge-Kacheln Spectral Forge / Melodic Loop: Grafik, Tasten-Look, neue Texte | `PATCH_TILES-ART-01.md` |
| Spectral Forge: Donor nimmt, was in der lila Maske liegt (kein Refuse bei Maske ohne Länge) | `PATCH_DONOR-MASK-01.md` |
| Melodic Loop: Notenblöcke verschieben ohne Knistern; Instrumentenkästchen plastischer | `PATCH_ML-DRAG-CLICK-01.md` |
| Was nimmt Loop-Rec auf, und wie schließt man einen neuen Synth an (ein Spureingang für alles Live-Gespielte) | `PATCH_LIVE-LANE-01.md` |
| Thunder Mode: ein Hold-Mechanismus (Nodals Uhr) für alle Synths, Exact/Loose, wie ein neuer Synth die Uhr bekommt | `PATCH_THUNDER-ONE.md` |
| Xensonar Variante wieder eingebunden (Knopf in Art Installation → nativer Raum aus dem Full-Build; Port-Werkzeug, Rest des Full-Builds offen) | `PATCH_VARIANTE-ROOM-01.md`, `../tools/port_variante.cjs` |
| Particle Mode / Particle System in der Particles-Kopfzeile, „More choices here“ → Resident-Regler, Hum der Art Installation stummschalten | `PATCH_PARTICLE-HEAD-01.md` |
| Art Installation: jedes Rebuild Layout ein eigener Klangkosmos (Sternbild-Linien als Klangnetz, Regler „Constellation Web“, Kosmos-Anzeige; 0 % = bisheriger Klang) | `PATCH_MYZEL-COSMOS-01.md` |
| Analyse einer Audioaufnahme im Wave Editor (Tempo, Root in Hz, Stimmung 12/19/31-EDO · Just · Bohlen–Pierce, Skala, Tonart-Abschnitte; lila Auswahl oder ganze Datei, nur lesend) | `PATCH_AUDIO-ANALYSE-01.md` |
| Hardware-Keyboard (MIDI): Tasten = Rasterlinien, Anschlagsdynamik, Lumatone/MPE-Layouts, Pedal und Regler | `DESIGN_HARDWARE_KEYBOARD_ADAPTER.md`, `PATCH_HWKB-01.md` → `PATCH_HWKB-02.md` |
| Was wurde bewusst nicht übernommen? | `HISTORY_AND_EXCLUSIONS.md` |
| Wie ist das CSS geschichtet? | `CSS_LAYERS_2026-11-09.md` |
| Wie wird gebaut (verdichtet, mit/ohne Diagnose)? | `PATCH_MIN-01.md`, `PATCH_DIAG-01.md`, `../tools/build.py` |
| Wie viel Ballast steckt im Code, wo geht die Rechenzeit hin, was bringt Verschlanken? | `SLIM_BEFUND_2026-11-14.md`, Werkzeuge in `../tools/slim/` |
| Was ist als Nächstes denkbar? | `NEXT_STEPS.md`, `AUDIT_2026-11-13.md` (Abschnitt „Empfohlene Reihenfolge“) |

Datierte Dokumente sind Momentaufnahmen: Zahlen darin gelten für den genannten Tag (siehe die Nachträge in `ARCHITECTURE.md` und `HOT_COLD_CONTRACT.md`).
