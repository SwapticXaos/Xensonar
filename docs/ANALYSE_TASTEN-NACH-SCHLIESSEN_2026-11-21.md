# Analyse: Tasten hängen auch nach dem Schließen der Seite (21.11.2026)

**Meldung:** Nach XenSonar funktioniert Backspace nicht mehr richtig, auch in anderen Programmen (Telegram, Texteingabe). Frühere Untersuchung desselben Musters: `PATCH_KEY-PHANTOM-01.md`, `ANALYSE_TASTEN-HAENGER_2026-11-19.md`.

## Befund
1. **Eine geschlossene Seite hält keine Tasten.** Gesucht und nicht vorhanden: `navigator.keyboard.lock`, Pointer-Lock, WebHID, Service-Worker mit Tastenlogik. Die Tasten-Listener hängen an `window`/`document` und verschwinden mit der Seite. Eine Webseite kann den Tastenzustand des Betriebssystems oder anderer Programme nicht setzen.
2. **Alle Halte-Zustände der App liegen im Seitenspeicher** (Live Room `__XenLiveHolds`/Besitzkarte, Psy Lab `held`, `__xenHeldKeys`, Modifier-Abgleich `__XenKeyCheck`) und räumen bei Keyup, `blur`, Tab-Verstecken, Escape und Raumwechsel auf. Belegt durch die Tests `key_hang_matrix` (Zufallsläufe), `key_heal_lost_keyup`, `key_phantom_modifier`, `key_owner_guard`, `key_owner_parked_rooms`, `psylab_key_orphan`, `hwkeyboard_live`: alle grün (21.11.).
3. **Backspace/Entfernen wird nur außerhalb von Textfeldern beansprucht** (Tasten-Besitzkarte: „text field · Backspace · –“). In Wave Editor und Multitrack nur mit Prüfung auf Eingabefelder und nur im sichtbaren Raum.
4. **Das Symptom passt zu einem Zustand im System, nicht in der Seite:** Backspace geht in Telegram nicht, solange das System einen Modifier (meist Alt) als aktiv meldet (Sticky Keys/einrastende Tasten, Slow/Bounce Keys, ein hängender Modifier im Compositor). Der Oktav-Halt in XenSonar prüft keine Modifier und funktioniert deshalb dort weiter. Der Zustand überlebt das Schließen der Seite, weil er im System liegt.
5. **Möglicher Auslöser aus der Nutzung:** Sticky Keys schalten sich durch 5× Shift hintereinander ein (GNOME/KDE/Windows); danach rastet Alt (Damp liegt auf dem linken Alt, wird oft gedrückt) durch zweimaliges Drücken ein. Slow Keys/Filter Keys durch 8 s gehaltenes Shift.

## Kleine Härtung (gefunden bei der Durchsicht)
XenPolar-Raum (`035-xen-room-xenpolar.js`) merkte sich gedrückte Tasten nur bis zum Keyup. Ging das Keyup verloren (Fokus weg), blieb die Taste in der Seite „gehalten“. Jetzt wird bei `blur`, versteckter Seite und beim Verlassen geleert. Nur Seitenzustand, kein Einfluss auf das System.

## Was beim nächsten Ausfall zu prüfen ist (ohne Neustart)
1. Alt, Shift, Strg und Super je **einmal** drücken und loslassen. Geht Backspace danach wieder: eingerasteter Modifier (Sticky Keys).
2. Barrierefreiheit prüfen: Sticky Keys, Slow Keys, Bounce Keys ausschalten (GNOME: Einstellungen → Barrierefreiheit → Tippen; Windows: `control access.cpl` / Tastaturhilfen).
3. In XenSonar vor dem Ausfall die Konsole öffnen und `__XenKeyCheck.diagnostics()` lesen (`phantom`, `candidates`, `healed`). Erscheint unten der Hinweis „the system reports Alt as held…“, ist es der Systemzustand.
4. Unter Linux/X11 `xinput test-xi2 --root` zeigt, welche Tastenereignisse wirklich ankommen; `xset q` und `setxkbmap -query` zeigen die Belegung. Unter Wayland `libinput debug-events --show-keycodes`.
5. Bleibt der Hinweis aus und hilft kein Modifier-Druck: Slow/Bounce Keys oder die Tastatur selbst (prellendes Backspace).

## Grenzen
Am echten Gerät nicht gemessen, Firefox nicht geprüft; die Aussage „die Seite kann es nicht“ beruht auf dem Code und auf der Plattform (Browser-Sandbox), nicht auf einer Messung am Nutzergerät.
