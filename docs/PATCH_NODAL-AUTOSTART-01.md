# NODAL-AUTOSTART-01: Nodal Center startet beim Betreten, schläft beim Verlassen

Zone: WARM (Raumwechsel, Mycelium-Schalter). Datei: `src/app/forge/01_room_shell.js` (Effekt beim Raumwechsel).
- Betreten von Nodal Center schaltet Mycelium über dieselben Schalter wie der Knopf ein (kein „[ OFFLINE ]“, kein Extra-Klick). Der Knopf bleibt zum Stummschalten.
- Verlassen schaltet Mycelium aus (Live Room und alle anderen Räume bleiben davon sauber getrennt).
- Folge: Die Resident-Kreise im Live Room (waren nur sichtbar, solange Mycelium lief) erscheinen dort nicht mehr. `resident_hit_alignment` prüft jetzt genau das.
- Nebenbei behoben: `onCanvasMouseLeave is not a function` (Mausverlassen des Nodal-Canvas, `src/rhythm/02_bass_and_rack.js`).
- Tests angepasst: `myzel_cosmos`, `particle_head_hum` (prüft Auto-Start, Schlafen, Wiedererwachen), `resident_hit_alignment`, `grid_visible`, `ball_paint`.
- `index.html` 8 344 394 Bytes (sha256 `3bdb1b1d…`), +393 gegenüber `2607669`. `run_tests.sh` 136/136, `run_e2e.sh --fast` 76 grün, 0 rot. Rollback `2607669`. Nicht gehört.
