# KEY-PHANTOM-01 · Untersuchung Backspace-Ausfall: vom System eingerastete oder hängende Modifier-Taste sichtbar machen

**Zone:** WARM (pro echtem Tastendruck ein Abgleich von 4 Modifiern gegen eine Map, kein React, kein Storage). Kein Audio geändert.
**Datei / Owner:** `src/rhythm/04_workspace_and_transport.js`, `__xenKeyHeal` (gleicher Owner wie KEY-HEAL-01). Lesende Anzeige `__XenKeyCheck.diagnostics()` → `phantom` (letzte 20 Befunde), `candidates`, `down`, `healed`.
**Größe:** `index.html` +2 295 Bytes (8 294 256 → 8 296 551).
**Parent:** `b234f55`, `index.html` SHA-256 `8c7b9a15…7131e`. Rollback: `b234f55`.

## Meldung (19.11.)
Backspace löscht zeitweise keinen Text, auch außerhalb von XenSonar. Wechselt der Nutzer in den XenSonar-Tab, funktioniert dort die Oktavierung (Backspace). Danach funktioniert Backspace auch anderswo wieder.

## Befund im Code
- Der Oktav-Halt (`src/audio/05_live_voice_runtime.js`, `e.code==="Backspace"`) prüft **keine** Modifier. Er reagiert auch dann, wenn das System Alt (oder Strg/Super) für aktiv hält.
- Andere Programme sehen in diesem Zustand Alt+Backspace und löschen nichts.
- Damp liegt auf dem **linken Alt** und wird beim Spielen lange und oft gehalten. Wer in XenSonar Alt drückt (Damp), schaltet einen eingerasteten oder hängenden Alt-Zustand wieder aus. Danach geht Backspace überall wieder.
- Das erklärt alle drei Beobachtungen ohne XenSonar-Fehler. Es erklärt auch, warum es ohne geöffnetes XenSonar auftreten kann: Der Zustand liegt im System.
- Typische Auslöser unter Linux:
  - **Einrastende Tasten / Sticky Keys** (GNOME/KDE, XKB AccessX). Sie werden durch 5× Shift eingeschaltet. Danach rastet Alt durch zweimaliges Drücken ein.
  - Ein im Compositor hängender Modifier nach Fokuswechsel bei gehaltener Taste.
- Ausgeschlossen bleibt wie in KEY-HEAL-01: XenSonar sperrt keine Tasten (`keyboard.lock` fehlt), es gibt keinen Pointer-Lock, und eine Webseite erreicht keine anderen Programme.
- **Nicht bewiesen**, welcher Auslöser es beim Nutzer ist. Das kann nur der Zustand des Systems im Moment des Ausfalls zeigen.

## Änderung
XenSonar vergleicht bei jedem echten (`isTrusted`) Tastendruck, ob das System einen Modifier (Alt, Control, Meta, Shift) als aktiv meldet, der hier nie gedrückt wurde.
- **1. Treffer:** nur ein Eintrag im Protokoll `active, not pressed`.
- **2. Treffer in Folge:** kleiner Hinweis unten in der Mitte, z. B. *„the system reports Alt as held, but no Alt key is pressed … Press Alt once to release it“*. Ein Klick schließt ihn.
- **Frisches Drücken des Modifiers:** Eintrag `released by pressing it`, Hinweis *„… Your Alt press released it.“* Das ist der Beleg für einen Systemzustand.
- **Loslassen ohne vorheriges Drücken:** Die Taste war wirklich gehalten, schon vor dem Fokus. Eintrag `was really held`, der Hinweis nimmt sich zurück. So gibt es keinen Fehlalarm bei echtem Halten.
- Fokusverlust löscht die Kandidaten.

Nichts wird an das System gesendet, nichts gegriffen. Kein Halte-Zustand wird verändert.

## Tests
- Neu: `tests/e2e/key_phantom_modifier.cjs` (echte Ereignisse über die DevTools, Chromium).
  - Phantom-Alt ergibt nach 1 Taste einen Eintrag, nach 2 Tasten den Hinweis. Der Oktav-Halt bleibt dabei aktiv, so wie es der Nutzer erlebt.
  - Ein Alt-Druck löst den Zustand.
  - Negativ: echt gedrücktes Alt meldet nichts.
  - Negativ: vor dem Fokus gehaltenes Alt nimmt den Hinweis zurück.
  - Auf dem Parent schlägt der Test fehl, weil `__XenKeyCheck` fehlt.
- Grün: `build.py --check`, `run_tests.sh` (133/0), `key_heal_lost_keyup`, `key_owner_guard`, `key_owner_parked_rooms`, `hwkeyboard_live`, `live_keyboard_window_keys`, `psylab_expressive_release`, `wave_keys_launch_and_rooms`, `run_e2e.sh --fast` (Ergebnis siehe Status).

## Status
CODE_PRESENT, BROWSER_CHECKED (Chromium, simuliert). In Firefox nicht geprüft: Dort kommt der Modifier-Zustand von GDK und enthält eingerastete Modifier. Am echten Gerät nicht geprüft.

## Offene Risiken
- Slow Keys und Bounce Keys (Tasten erst nach Haltezeit, schnelle Wiederholung verworfen) sieht eine Webseite nicht. Sie würden genauso „Backspace geht anderswo nicht, hier gehalten schon“ erzeugen. Der Hinweis erscheint dann nicht. Bleibt der Hinweis beim nächsten Ausfall aus, ist das ein Indiz für diese Funktionen oder für die Tastatur selbst.
