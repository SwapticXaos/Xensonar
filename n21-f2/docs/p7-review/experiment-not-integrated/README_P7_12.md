# P7.12 – keyboard-only live expression (experimental)

Basis: rekonstruierte P7.11-Quellen. Enthält zusätzlich den P7.11.1-Syntaxfix direkt in den Quellen. **Dateien nicht blind über einen abweichenden Codex-Zweig kopieren.** Diff/Cherry-pick thematisch prüfen.

- `src/mix/01_pan.js`: nichtpersistierter VCA ausschließlich in der Keyboard-Routing-Kette; `setTargetAtTime(..., .025)` für laufende Noten. Kein Master-/RFL-Gain.
- `src/app/forge/01_room_shell.js`: auch nicht-samplebasierte direkte Keyboard-Routen über Keyboard-Pan/VCA, andere Wave-Routen bleiben unverändert.
- `src/rhythm/04_workspace_and_transport.js`: B/Alt-Expression-Controller schreibt laufend auf Keyboard-VCA; Moduswechsel, Reset und Deaktivierung setzen neutral zurück. Pedal weich, Knob persistent. Das ursprüngliche Scale-at-Attack kann zusätzlich wirken: auf doppelte Verstärkung neu angeschlagener Stimmen achten.
- `src/forge_and_melodic/06_note_editor_and_material_tools.js`: `aria-label`-JSX-Schlüssel gequotet (White-Screen-Quellfix).

Prüfungen: 4 Modul-Syntaxchecks, vollständiger extrahierter HTML-Skript-Syntaxcheck, node build.cjs + --verify, Mock-AudioNode-Test (`tests/test_keyboard_expression_vca.cjs`) bestanden. Chromium-Headless lieferte keine verwertbare DOM-Antwort, Opera/Hörtest NICHT abgenommen.

**Risiken / offen:** Die Routing-Grenze bei Entrophon-Worklet-Stimmen kann von der vorhandenen `getWaveOutput`-Verdrahtung abweichen; physische Kontrolle erforderlich. Die separate gelegentliche Entrophon Volume-Kopplung bleibt offen. Native Opera/Ubuntu Alt-Menüs sind nicht garantiert unterdrückt. Teste B/Alt mit lange gehaltenen Tönen, kurzen Staccati, Knob/Pedal, Wechsel Keyboard versus Wave, und spiele dabei Bass/Beat/RFL. Das ist ein Testbuild, keine Freigabe als Audio-stabile Produktionsversion.
