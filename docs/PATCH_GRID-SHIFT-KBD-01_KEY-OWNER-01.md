# GRID-SHIFT-KBD-01 · KEY-OWNER-01 · Tastenfenster bei „Shift grid“, geparkte Räume besitzen keine Tasten

Parent: `4f92dd6` (index.html 8 266 617 Bytes). Rollback: `4f92dd6`.
Neu: index.html siehe Commit (Zuwachs ca. +1,2 KB, nur Prüfungen/Kommentare; Werte im Commitbericht).
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless, echte Maus/Tasten). Nicht gehört, nicht auf dem Gerät des Nutzers geprüft.

## 1. GRID-SHIFT-KBD-01 (Zone HEISS-nah: Tastenfrequenzen, gecacht; WARM: Psy-Lab-Pad)
Fehler: Nach Bewegen von „Shift grid · cents“ (Psy Lab / Nodal / Live-Raum, gemeinsame Rastersteuerung) war das Tastenfenster weg
(Psy-Lab-Pad ohne Tastenbeschriftung, Tastatur spielte nur noch einen tiefen Ton) bis zum nächsten Rasterwechsel.
Ursache (`uw` in `src/runtime/instrument/01_voice_gradients_and_effects.js`): Der Anker (Grundton) wurde als Index in der
**ungeschobenen** Liste bestimmt, die **geschobene** Liste damit zugeschnitten. Shift schiebt eine Linie über den Bereichsrand
(Grundton 440 Hz = oberer Rand) → geschobene Liste eine Linie kürzer → Index −1 → `slice(-1)` → eine einzige Taste.
Der Rasterwechsel „heilte“ es nur, weil er die Offsets zurücksetzt (frühere Fixes setzten nicht an dieser Wurzel an).
Fix: Tasten gehören zu Skalenstufen. Bereich und Anker über die ungeschobene Linie (`__xenKeyPairs`), Offsets stimmen nur um.
Ohne Offsets bytegleiches Ergebnis wie vorher. Wirkt für alle Nutzer von `uw`/`wF`/`cZ` (Live-Tastatur, Psy Lab, Bass, Drum-Bodies).
Test: `tests/e2e/grid_shift_keyboard_window.cjs` (31-EDO, 12-EDO, JI; Regler mit der Maus; Einzelstufe +400 ct; Pad-Beschriftung). Auf Parent rot.

## 2. KEY-OWNER-01 (Zone KALT schläft)
Forge/Spectral Forge bleiben nach dem ersten Öffnen in einer `aria-hidden`-Keepalive-Box (`data-package-station-keepalive`) montiert.
- Wave Editor (`src/post-oct/015-…`, `handleKey`): seit WAVE-KEYS-02 nahm er Backspace/Delete/Strg+X/C/V/Z/Y auch bei Fokus „nirgends“ –
  auch während er geparkt war. Folge im Live-Raum: Backspace (Oktav-Halten) kam nie an **und** schnitt unbemerkt Audio aus der Forge-Datei
  (Test: 180 736 → 144 589 Samples). Fix: ein geparkter/unsichtbarer Editor besitzt keine Taste.
- Spectral Forge (`src/rooms/lab.js`, `FWe`): Werkzeugbuchstaben, `g`, `x`, Strg+Z/Y, Leertaste wirkten in allen anderen Räumen, wenn der
  Fokus beim Raumwechsel in der Forge blieb (Raumwechsel ohne Fokuswechsel). Fix: geparkte Forge ignoriert Tasten.
- Raumwechsel (`src/app/forge/01_room_shell.js`): liegt der Fokus in einem gerade geparkten Raum, wird er freigegeben (Tasten gehen an den sichtbaren Raum).
Package Station zeigt die Forge sichtbar: dort bleiben Forge-Tasten aktiv (gewollt).
Test: `tests/e2e/key_owner_parked_rooms.cjs` (Live, Nodal, Psy Lab, Multitrack; danach Backspace in der Forge schneidet weiter). Auf Parent rot.
Messung Live-Raum mit geparkter Forge (8 s, Chromium headless): keine zusätzliche Hauptthread-Last gegenüber „Forge nie geöffnet“.

## Offen
- Backspace-Probleme **außerhalb** von XenSonar (andere Tabs/Browser/Programme) kann eine Webseite technisch nicht verursachen; dafür Tastatur/OS prüfen.
- Bei der CPU-Messung hatte der Live-Raum mit geparkter Forge weniger Timer/Frames als ohne – Ursache nicht untersucht.
- Weitere globale Tasten-Listener (u. a. `src/rooms/canonical.js`) nicht einzeln auf Parken geprüft; im Test kein Leck gefunden.

## Prüfstand beim Commit
- `build.py --check` OK, `run_tests.sh` 128/128.
- Browser (`tests/e2e/*`, einzeln ohne Abbruch): 61 grün, 7 rot – alle 7 auf Parent `4f92dd6` identisch rot (Altlast seit den Startdefaults 31 EDO / Psy-Lab-Wave-Starter):
  `room5_live_psylab`, `room5_psylab` („chunk … at boot“), `stems_instruments`, `stems_record`, `thunder_lane_split_ui`, `thunder_one_clock`, `variante_room`;
  Alt-Test `mix_audio_browser` ebenfalls auf Parent rot. `run_e2e.sh` bricht daher (set -e) vor dem Ende ab.
- Testkorrektur (nur Tests): `grid_drag_selection`, `live_grid_handles` setzen 12 EDO (waren auf Parent aus demselben Grund rot), jetzt grün.
