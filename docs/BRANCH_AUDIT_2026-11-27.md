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
