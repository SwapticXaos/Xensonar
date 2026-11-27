# Branch-Abgleich 27.11.2026 — ist etwas auf der Strecke geblieben?

Stand `main` nach DJ-SEEK/CLOCK/PERSIST/CUE/BUS. GitHub zeigt viele Branches als „ahead“, weil die Arbeitslinie mehrfach
umgezogen und zusammengeführt wurde (W31 → stoic-knuth → charming-franklin → pensive-thompson → main): dieselben Änderungen
liegen in `main` unter anderen Commit-Hashes. `claude/pensive-thompson-tcurka`, `stoic-knuth`, `charming-franklin` sind 0 ahead.

## Verfahren
1. `git cherry` je Remote-Branch (gleicher Patch = übernommen) → 328 Commits übrig.
2. Davon Titel identisch in `main`-Log → übernommen.
3. Arbeits-Kürzel (z. B. `DEAD-MYZEL-01`, `TAKT-SEEK`) in `main` (Code, Tests, Docs) gesucht.
4. Für Code-Commits: Anteil der hinzugefügten Zeilen, die wörtlich in `main` stehen; alle < 50 % einzeln am Inhalt geprüft.

## Ergebnis: nichts verloren
| Kandidat | Befund |
|---|---|
| HWKB-01b/c/d (Web-MIDI-Fehlerhinweise) | Endfassung HWKB-01d („Typical causes“, nach Kategorie) ist in `main`; c/d-Zwischenstände bewusst ersetzt |
| ML-NOTECLIP-03/04 (Ablage leeren, Spiegeln) | in `main` weiterentwickelt (Markieren, Spiegeln h/v, Rechtsklick leert und beendet Paste) |
| LOOP-STEREO, ROOM-ORDER-01, SONG-Capture Nodal-Troodle | in `main` (Code + Test grün) |
| THUNDER-CLOCK-01/02 | 02 zurückgenommen; 01 durch THUNDER-ONE ersetzt („instead of a parallel one“), in `main` |
| RFL-GUARD (Zwischenstand) | durch RFL-SOFT/RFL-TAP ersetzt, in `main` |
| LIVE-SLIDER-SOFT, TEMPO-RAMP-01 | durch MIX-HOLD-01 ersetzt bzw. zurückgenommen (bewusst) |
| Header-Untertitel-Varianten | `main` hat die letzte Wahl „Xenharmonic Audio Thing“ |
| Oktober-/März-Commits (Codex/GPT-Artefakte, P7.x) | vor dem Quellbaum; in W31/„Quellbaum Stufe 2a“ in die Module übernommen (Mutes, Xenpolar-Drone, Mikrofon, Granular Hold, Recorder vorhanden) |

Übernommen wurde deshalb nichts; es gab keine eindeutig fehlende Verbesserung.

## Empfehlung
Die alten Branches sind nur noch Archiv. Wer GitHub aufräumen will: sie löschen oder als `archive/…`-Tags sichern
(nur auf ausdrücklichen Wunsch; `reference/ts-400.2` und `reference/waypoints` bleiben).

---

# CI-Zustand (27.11.) und Reparaturen

Pages: der „pages build and deployment“-Lauf baute bis 27.11. 00:17 von `claude/pensive-thompson-tcurka`, seitdem von
`claude/great-cori-sdjwjo` — **nie von `main`**. Für „Release = main“ in GitHub: Settings → Pages → Branch auf `main` stellen.

Unit-Suite (`tools/run_tests.sh`): vorher 6 rot → **160/160 grün** (React-Attrappe ohne `cloneElement`, deutsche Desk-Tooltips).

Browser-Suite: vor dieser Arbeit 9 rot (pensive-thompson, Lauf 45915830612). Repariert (veraltete Testannahmen nach gewollten Änderungen):
- `grid_cji`, `grid_ratio_add`, `scala_import_export`: Tooltip der Raster-Kachel beginnt seit STRIP-ACTIVE-01 mit „Fretboard on · …“ (`title^=` → `title*=`).
- `psylab_live_grid`: der Free-Schalter erklärt sich seit 15e509f im Tooltip.
- `dual_donor_aligned`: Knopf „🧬“ heißt jetzt „Extract Timbre (Donor Workshop)“.
- `song_parts_edit`: Teil-/Abschnittsnamen seit SONG-PART-TAGS-01 (A1/A2, A2a…, „Chorus 1“).

Offen (vorher schon rot, nicht angepasst):
- `rfl_resident_clock_live`, `live_tempo_rfl`: der Root Follow Loop spielt klickfrei (Bus/Pan/Pitch-Taps aktiv, 0 Klicks auf dem Bus),
  aber der „resident“-Worklet-Pfad wird im Testszenario nicht mehr gewählt; Testvoraussetzung oder Absicht klären.
- `wave_meter_live`: Taktometer folgt der Maske beim Ziehen nicht vollständig (599 < 696 < 696) — auch auf dem alten Stand.
- `live_tempo_hold`: Messtest an der Rauschgrenze (Median-Abstand 0,6–9,3 ms bei Kriterium < 6 ms, auf allen Ständen).
