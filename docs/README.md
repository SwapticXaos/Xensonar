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
| Was wurde bewusst nicht übernommen? | `HISTORY_AND_EXCLUSIONS.md` |
| Wie ist das CSS geschichtet? | `CSS_LAYERS_2026-11-09.md` |
| Wie wird gebaut (verdichtet, mit/ohne Diagnose)? | `PATCH_MIN-01.md`, `PATCH_DIAG-01.md`, `../tools/build.py` |
| Wie viel Ballast steckt im Code, wo geht die Rechenzeit hin, was bringt Verschlanken? | `SLIM_BEFUND_2026-11-14.md`, Werkzeuge in `../tools/slim/` |
| Was ist als Nächstes denkbar? | `NEXT_STEPS.md`, `AUDIT_2026-11-13.md` (Abschnitt „Empfohlene Reihenfolge“) |

Datierte Dokumente sind Momentaufnahmen: Zahlen darin gelten für den genannten Tag (siehe die Nachträge in `ARCHITECTURE.md` und `HOT_COLD_CONTRACT.md`).
