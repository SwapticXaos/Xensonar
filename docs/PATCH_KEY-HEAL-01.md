# KEY-HEAL-01 · Verlorenes Tasten-Loslassen lässt keinen Halte-Zustand stehen

**Zone:** WARM (ein Set-Zugriff pro Eingabe-Ereignis, sonst nichts). Kein Audio geändert.
**Datei / Owner:** `src/rhythm/04_workspace_and_transport.js`, `__xenKeyHeal` (vor `Zke`). Die Halte-Zustände gehören weiter ihren bisherigen Ownern (Live-Tastenbesitz, `Zke`, Psy Lab); KEY-HEAL spielt nur ein verlorenes `keyup` nach. Lesende Anzeige `__XenLiveHolds.snapshot()` (Oktave, Sustain, Swell, Damp) für Tests und Diagnose.
**Größe:** `index.html` +1 249 Bytes (8 293 007 → 8 294 256).

## Anlass
Der Nutzer meldete zeitweise ausfallendes Backspace, auch außerhalb von XenSonar. Später ist es auch ohne geöffnetes XenSonar aufgetreten, XenSonar ist also nicht die Ursache.

Geprüft wurde:
- **Tastendrücke:** Eine Webseite bekommt sie nur im eigenen, fokussierten Tab.
- **Tasten-Sperre:** XenSonar benutzt keine Tasten-Sperre (`keyboard.lock`).
- **Geräte:** Kein HID/USB/Serial, Web MIDI nur lesend und nur auf Wunsch.
- **Fokusverlust:** Gedrückte Tasten werden bei `blur`/`visibilitychange` freigegeben.

Eine Lücke blieb: Ging das Loslassen einer Modifier-Taste verloren, ohne dass das Fenster den Fokus verlor, blieb der Damp-Halt (linkes Alt) in XenSonar an.

## Änderung
XenSonar merkt sich die Modifier-Tasten (Alt, Shift, Strg, Super), die laut echten (`isTrusted`) Ereignissen gedrückt sind. Jedes weitere echte Tasten- oder Zeigerereignis bringt den Zustand des Betriebssystems mit (`getModifierState`). Meldet es eine gemerkte Taste nicht mehr als gedrückt, wird ihr `keyup` auf `window` nachgespielt, und alle Owner geben auf ihrem normalen Weg frei. AltGr unter Linux (`AltGraph`) zählt als gedrückt. Künstliche Tasten (MIDI-Pedale der Hardware-Ebene) werden nicht gemerkt und nicht angefasst. Es wird nichts an das Betriebssystem gesendet und nichts gegriffen.

## Tests
- Neu: `tests/e2e/key_heal_lost_keyup.cjs` (echte Ereignisse über die DevTools):
  - Alt hält Damp.
  - Weitere Tasten und Bewegungen mit gedrücktem Alt halten Damp weiter.
  - Normales Loslassen beendet Damp.
  - Ein verlorenes Loslassen wird durch die nächste Mausbewegung oder die nächste Taste geheilt.
  - Backspace (Oktav-Halt) wird beim Fokusverlust freigegeben.
- Auf dem Parent fehlt die lesende Anzeige, dort schlägt der Test schon beim Lesen fehl.
- Grün: `key_owner_guard`, `key_owner_parked_rooms`, `hwkeyboard_live`, `hwkeyboard_touch`, `live_keyboard_window_keys`, `psylab_sustain_expression_eq`.

Rollback: `0b6c90f`.
