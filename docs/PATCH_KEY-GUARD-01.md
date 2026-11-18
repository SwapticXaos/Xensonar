# KEY-GUARD-01 · Tasten-Zuständigkeit messen und bewachen (statt Router-Umbau)

Status: nur Test und Messwerkzeug, kein App-Code. `index.html` unverändert (8 277 542 B).

## Messung (KEY-ROUTER Stufe 1, `tools/probes/key_owner_map.cjs`, Ergebnis `docs/KEY_OWNERS_2026-11-18.md`)
- Statisch ~40 globale Tasten-Listener in 27 Dateien, im Betrieb aber nur **19** angemeldet (viele hängen an offenen Menüs, Räumen oder Zuständen).
- In allen fünf Räumen (Fokus Seite und Textfeld, 22 Tasten): **keine Taste mit zwei Besitzern, kein Eingriff in Textfelder**. Die Fixes vom 16./17.11. (KEY-OWNER-01, FORGE-SLEEP-01) haben die Zuständigkeit bereits geordnet.
- Folgerung: Der im Audit 17.11. geplante Tasten-Router (P1) ist derzeit nicht nötig. Er würde ein heute funktionierendes Instrument-Eingabesystem umbauen, ohne dass ein Fehler vorliegt.

## Wächter-Test `tests/e2e/key_owner_guard.cjs`
- 196 Tastendrücke in 7 Situationen (5 Räume, Forge mit Datei im Wave Editor, Live Room mit geparkter Forge), Fokus Seite und Textfeld.
- Regel 1: Jede Taste hat höchstens einen Besitzer. Regel 2: Textfelder gehören dem Tippenden (Escape ausgenommen).
- Gegenprobe: auf `4f92dd6` (vor FORGE-SLEEP-01) rot, meldet „Live Room, Forge parked · Backspace / Ctrl+X / Ctrl+V: 2 owners“; auf dem aktuellen Stand grün.
