# NODAL-GATE-01: Tor vor der Kunstinstallation (ersetzt den Auto-Start von NODAL-AUTOSTART-01)

Zonen: WARM (Tor-UI, nur CSS-Transform/Opacity, ein Timer je Phase), HEISS minimal (ein Tiefpass in der Myzel-G-Kette, eine AudioParam-Rampe pro Öffnung).
- Nodal Center startet wieder mit Mycelium aus; Verlassen schläft weiter ein (`src/app/forge/01_room_shell.js`).
- Bühne der Kunstinstallation: geschlossenes Tor statt „[ OFFLINE ]“, XenSonar-Siegel mit Alien-Glyphen, kein Text auf dem Tor. Klick: Drehung, Aufklappen entlang der 8 Strahlen, Loch in der Mitte, Hälften gleiten auseinander (`src/rooms/nodal.js`, CSS in `styles/areas/026_nodal-sound-designer-style.css`).
- Schalter oben: „Gate Closed / Gate Open“ (statt Mycelium OFF/ON), öffnet/schließt dasselbe Tor.
- Klang: Tiefpass in `src/audio/08_myzel_g_live.js`, beim Öffnen 180 Hz → Nyquist in 3,6 s; bei Nyquist exakt H(z)=1. PCM-Vergleich (Chromium Offline, 44,1/48 kHz): Max-Differenz 0 offen und nach der Rampe.
- Tests: neu `tests/e2e/nodal_gate.cjs` (MEASURE); angepasst particle_head_hum, myzel_cosmos, ball_paint, grid_visible, resident_hit_alignment — alle grün. `run_tests.sh` 139/139. Voller run_e2e nicht gelaufen (Nutzerentscheidung).
- `index.html` 8 372 195 B (+12 150 gegenüber `f1a7e08`). Rollback `f1a7e08`. Nicht gehört.
