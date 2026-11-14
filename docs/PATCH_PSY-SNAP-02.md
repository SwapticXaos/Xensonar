# PSY-SNAP-02 · drei Snap-Stufen für die Lead-Stimme, rosa Tastenlinien im Live-Raum

Parent: `bf4aedc` (index.html 8 077 494 Bytes). Rollback: `bf4aedc`.
Neu: index.html 8 079 732 Bytes (+2 238), sha256 `91047519d9da8dca3d415f22207032b3ffce931e559d1ccb2344aeb0ddc7196d`.
Zone: WARM (Hauptraum-Zeiger, Zeichenschleife). Kein neuer Audioknoten. Status: CODE_PRESENT, UNIT_VERIFIED (121/121), BROWSER_CHECKED (psylab_live_grid, room5_psylab; volle Browser-Suite beim Commit noch nicht abgeschlossen). Nicht gehört.

## Änderung
- Stufen: Scale (Snap an, offene Töne), Grid (`cursorSnapAll`: Snap an, alle Rasterlinien inkl. gemuteter), Free (Snap aus). Gilt für Maus/Wave Starter/Psy-Lab-Ton/Pfeiltasten; die Tastatur bleibt auf offenen Tönen.
- Daten-Owner: `lockCursorToGrid` (unverändert) + optionales Boolean `cursorSnapAll` (fehlt = Scale, keine Migration). Gemeinsame Helfer `__xenSnapMutedSteps`, `__xenCursorSnapMode` (`src/mix/05_grid_runtime.js`).
- UI: drei Knöpfe in „Controls & Space" (Live-Raum) und an „Snap ball to grid" (Raum V).
- Grüne Linie wählt dieselbe Zeile wie der Snap (gemutete werden nur im Grid-Level berücksichtigt); vorher verschwand sie.
- Rosa Linien im Live-Raum für gehaltene Tasten: die Raum-V-Routine liegt jetzt als `__xenPaintActiveNotes` bei der Gitterschicht und wird von beiden Räumen genutzt; Ablage `__xenHeldKeys` (`src/handoff/00_chat_feature_addons.js`).
- Tests: `psylab_live_grid` (Grid-Level, rosa Linie, Buttons), `room5_psylab` auf die Knöpfe umgestellt.

## Offen
- Nicht gehört. Gehaltene (Hold-)Töne sind keine rosa Linien, nur physisch gedrückte Tasten.
