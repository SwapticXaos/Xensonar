# KEY-ORPHAN-01 · Eine Taste, deren Loslassen verloren ging, lässt keine unstoppbare Note stehen (19.11.2026)

Zweig `claude/stoic-knuth-a6nx6f`. Zone: WARM (Eingabe), kein Audiopfad. Owner: Psy-Lab-Raum, `start`/`stop` in `src/post-oct/034-xen-room-psylab.js` (Tasten und Pad-Zeiger).

## Anlass
Nutzer: Der Ton der Taste L im Psy Lab klang durch, ließ sich nicht stoppen; erst ein Raumwechsel beendete ihn. Space (Hold) war nicht im Spiel, nur Maus und Tastatur-Hotkeys.

## Befund (reproduziert)
- Im Psy-Lab-Raum hält `held` je Quelle (`key:KeyL`, `pad:<id>`) die Stimme. `start` überschrieb den Eintrag, ohne die alte Stimme zu beenden. Ging ein Keyup verloren, startete der nächste Druck derselben Taste eine zweite Note, die erste klang weiter ohne jeden Griff darauf. Nur Escape (alles aus) oder das Verlassen des Raums (Engine wird freigegeben) beendete sie.
- Reproduktion: zweimal `keydown` (ohne Wiederholung) für `KeyL`, dann `keyup`: eine Stimme bleibt hängen (`hanging ["2:102"]`).
- Geprüft und in Ordnung: normales Drücken, Ctrl/Shift/Alt vor oder nach L, Fenster-Shift-Tasten, Escape, Raumwechsel, Hold (Space), Live Room mit Psy-Lab-Sound (dort beendet `LiveHost.start` die alte Stimme schon). Die Hardware-Tastatur (HWKB) hatte das Muster schon richtig (`if(held.has(code))release(code)`).
- Nicht gefunden: warum das erste Keyup verloren ging. Der Browser meldet keinen Tastenzustand für Buchstaben, deshalb gibt es dafür keinen Beweis, nur die Absicherung unten.

## Änderung
- `start`: Ist die Quelle noch gehalten, wird die alte Note beendet, bevor die neue beginnt. Dieselbe Taste noch einmal drücken und loslassen beendet damit immer alles.
- Zusätzlich lösen `visibilitychange` (Tab versteckt) und `pagehide` die gehaltenen Tasten (vorher nur `blur`).

## Test
`tests/e2e/psylab_key_orphan.cjs` (auf dem Parent rot, jetzt grün): normaler Druck, doppeltes Keydown, hängende Taste, versteckter Tab. Grün gelassen: `psylab_live_grid`, `room5_psylab`, `psylab_sustain_expression_eq`, `psylab_expressive_release`, `key_owner_guard`, `key_owner_parked_rooms`, `key_heal_lost_keyup`, `room5_live_psylab`, `run_tests.sh` 135/0.

## Offen
Ein verlorenes Keyup selbst bleibt unerkennbar, bis die Taste noch einmal gedrückt wird oder das Fenster den Fokus verliert. Tritt es wieder auf, hilft: dieselbe Taste noch einmal drücken, sonst Escape.
Nicht gehört, nicht in Firefox geprüft.
