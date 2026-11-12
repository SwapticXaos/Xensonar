# HOLD-SLOTS und ROOM5-12 (Psy-Lab-Glissando im Live-Raum)

Parent: `0016b46`. Rollback: dieser Commit davor. Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). **Nicht gehört.** Nicht USER_ACCEPTED.

## HOLD-SLOTS: eine Logik für Slots / Takt (Korrektur von THUNDER-SPEED)
Fehler in ROOM5-11: Die Factory-Arpeggios hatten *4–8 Slots mit Bars 0,125–0,25* (Geschwindigkeit nur über Bruchteile eines Takts) und der Plan-Ansicht-Zusatz blendete „Slots“ aus. Das war eine zweite Logik neben dem vorhandenen Modell, in dem **Slots = Noten des Takts** (24 / 32 / …, Bars = 1) gilt und jede Karte ihre eigene Tonhöhe trägt.
- Alle Factory-Arpeggios nutzen jetzt dieses Modell: **32 Slots (32tel) oder 24 Slots (Sextolen), Bars = 1**, die Figur wird über die ganze Kartenreihe wiederholt (jede Karte mit rotem Tonhöhenstrich, Rechtsklick wie gewohnt). Nach dem Laden lassen sich Slots, Bars und jede Karte ändern.
- Factory-**Pläne** bestehen aus diesen Patterns, also ebenfalls 32/24 Slots pro Takt.
- Plan-Stufen-Ansicht: Slots / Other / Bars werden **nicht mehr abgeblendet**; sie zeigen die Werte der gezeigten Stufe (gesperrt, solange eine Plan-Stufe gezeigt wird; Tooltip erklärt: im Hold Pattern Studio ändern oder „Lane“ drücken).
- Tests: `tests/hold_factory_patterns.cjs` (alle 24/32 Slots, Bars 1, Tempo-Untergrenze), `tests/e2e/hold_library_shared.cjs` (Laden → 32 Slots, Bars 1, Figur wiederholt sich über die Reihe), `tests/e2e/hold_plan_factory.cjs` (Slots-Anzeige der Stufe).

## ROOM5-12: Glissando für Psy Lab im Live-Raum
Wie in Raum V (Ball folgt dem Zeiger, gehaltene Töne werden per `bend` nachgeführt), über die vorhandenen Live-Eingaben, ohne neue Bedienlogik:
- **Wave Starter, linke Maustaste:** Der Ton wird **gehalten, solange die Taste gedrückt ist**; seine Tonhöhe folgt dem Zeiger (Ziehen = Glissando, hoch/runter). Mit Snap auf der nächsten Rasterlinie, ohne Snap stufenlos; geglättet wie der Ball in Raum V. Loslassen (oder Fenster verliert den Fokus) beendet den Ton. Enter bleibt ein einzelner Ton mit kurzem Gate (kein Hold für Psy Lab).
- **Keyboard:** gehaltene Töne gleiten mit **Pfeil hoch / runter** (Pitch-Wheel: Snap = eine Rasterstufe je Druck, ohne Snap stufenlos). Das Rad gilt für alle gehaltenen Keyboard-Töne und springt auf 0 zurück, sobald keine Taste mehr gehalten wird.
- Läuft nur, solange ein Psy-Lab-Ton gleitet: eine `requestAnimationFrame`-Schleife (WARM), nichts pro Audio-Block. Zeigerposition kommt aus dem vorhandenen Fokus-Cursor (`focusCursorRef`).
- Tests (`tests/e2e/room5_live_psylab.cjs`, echte Maus/Tasten, Bend-Nachrichten an die Engine): Taste halten > 600 ms → kein Gate; Ziehen hoch hebt, runter senkt die Tonhöhe, monoton; Loslassen beendet; danach folgt nichts mehr dem Zeiger; Keyboard + Pfeil hoch hebt die Tonhöhe, hält sie ohne Drift, neue Taste nach Loslassen aller Tasten startet wieder auf Tastenhöhe.

## Offen
- Pfeil-Glissando des Wave-Starter-Tons (Maus gehalten) gibt es nicht; dort glitten Pfeile den Fokus-Cursor nicht (Snap: Pfeil setzt eine Rasterstufe, die Maus bleibt bestimmend). Ziehen ist die Geste.
- Hörtest: Glättung (Gleitgefühl), Pegel, Mehrstimmigkeit bei vielen gehaltenen Tasten.
