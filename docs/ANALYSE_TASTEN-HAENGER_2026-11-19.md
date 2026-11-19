# Analyse: hängende Tasten und Halte-Zustände (19.11.2026, KEY-HANG-01 + KEY-PANIC-01)

Anlass: Im Psy Lab hing die Note der Taste L, nur ein Raumwechsel half (siehe `PATCH_KEY-ORPHAN-01.md`). Hier die Verallgemeinerung auf alle belegten Tasten im Live Room und im Psy Lab (PSY Lab bestätigt).

## Was es gibt (Halte-Zustände und ihr Eigentümer)
| Zustand | Auslöser | Owner / Aufräumpfade |
|---|---|---|
| Note einer Taste (Live Room) | Buchstaben-, Ziffern-, Satzzeichen-Reihen | Tasten-Besitzkarte `ownership.keys` (rhythm/04), `releaseOwned` bei Keyup; `releaseAll` bei Blur und Tab-Verstecken; `LiveHost.start` beendet eine alte Stimme derselben Taste |
| Oktav-Halt | Backspace | gleiche Karte (`entry.control`), Flags in `__XenLiveHolds` |
| Damp / Swell / Sustain | linkes Alt / B / Apostroph, ´, = | gleiche Karte; Sustain zusätzlich in `__XenPsyLab` (`deferred`) |
| Note einer Taste (Psy-Lab-Raum) | Tasten, Pfeile, Pad-Zeiger | `held` im Raum; Keyup, Blur, Tab-Verstecken, Seite schließen, Escape |
| Hardware-Tastatur (MIDI) | Noten | `held.has(code)` → vorher loslassen (schon richtig) |
Nicht gehalten, nur Umschalter: Space (Hold), Enter, Tab, Pfeile im Live Room (Cursor).

## Fehlerklassen
1. **Verlorenes Keyup** (Browser/Betriebssystem meldet es nie, z. B. Fokus in anderes Programm, Strg+L, System-Dialog). Für Buchstaben nicht erkennbar, bleibt unvermeidbar; deshalb muss jede Taste einen Ausweg haben.
2. **Eintrag überschreiben, ohne die alte Stimme zu beenden** (Psy-Lab-Raum): der nächste Druck derselben Taste ließ die erste Note ohne Griff zurück. Behoben (KEY-ORPHAN-01). Live Room und Hardware-Tastatur hatten es schon richtig.
3. **Fehlender Alles-aus im Live Room**: Escape löste dort nichts (im Psy Lab schon). Behoben (KEY-PANIC-01): Escape lässt alle gehaltenen Tasten los (Noten, Backspace, Alt, B, Apostroph), nur wenn welche gehalten werden, wird nie verbraucht (Menüs schließen weiter).
4. Nicht als Ursache gefunden: Space/Hold, Modifier-Reihenfolgen (Ctrl/Shift/Alt vor oder nach der Taste), Fenster-Shift-Tasten, Fokuswechsel in Textfelder und Pickern, Mausklick im Raster, Raumwechsel mit gehaltener Taste. Die Vorschau-Note der Fenster-Shift-Tasten (600 ms) und Wave-Starter-Gates verhalten sich wie vorgesehen.

## Messung (Chromium, echte Tastenfolgen, Psy-Lab-Notenledger + `__XenLiveHolds`)
Verlorenes Keyup, dann genau eine Wiederherstellung (vorher → nachher):
- **Live Room** (L, 1, ', =, Backspace, Alt, B): hängt; **danach frei** nach erneutem Drücken, Fokusverlust, versteckter Tab und (neu) Escape. Vor KEY-PANIC-01 beendete Escape nichts.
- **Psy-Lab-Raum** (L, A, 1, '): hängt; frei nach erneutem Drücken (vor KEY-ORPHAN-01 blieb die erste Note zurück), Fokusverlust, versteckter Tab, Seite schließen, Escape.
- Zufallsläufe mit echten Tasten (Shift, Alt, Strg, Backspace, Space, Enter, Pfeile, Klammern, Apostroph, B, Escape …), Fokuswechseln, Klicks, Blur und Raumwechseln: nach dem Loslassen aller Tasten hängt nichts und kein Flag ist gesetzt (Live Room und Psy Lab, mehrere Seeds, auch 3 × 220 Schritte außerhalb des Tests).

## Tests
`tests/e2e/key_hang_matrix.cjs` (Matrix + Zufallsläufe, auf dem Vorgänger rot: Live-Escape), `psylab_key_orphan.cjs`. Grün gelassen: `key_owner_guard`, `key_owner_parked_rooms`, `key_heal_lost_keyup`, `key_phantom_modifier`, `hwkeyboard_live`, `live_keyboard_window_keys`, `grid_shift_keyboard_window`, Psy-Lab-Tests, `run_tests.sh` 135/0.

## Grenzen (offen)
- Das verlorene Keyup selbst bleibt unerkennbar; Auswege sind: dieselbe Taste noch einmal drücken, Escape, Fenster verlassen.
- Nicht geprüft: Multitrack, Nodal, Wave Editor, Melodic Loop auf Haltezustände; klassische (nicht Psy-Lab) Live-Stimmen nur über die Flags, nicht über Stimmenzahlen; Firefox; echte Hardware. Nicht gehört.
- Eine Nebenwirkung von Escape im Live Room: Eine absichtlich gehaltene Taste wird beim Drücken von Escape (z. B. zum Schließen eines Menüs) mit losgelassen.
