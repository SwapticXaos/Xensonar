# FORGE-SLEEP-01 · Die geparkte Forge schläft (keine Tasten, kein Zeiger, kein Fokus); Rückkehr schneidet sofort

Parent: `d286556` (= WAVE-KEYS-03, übernommen aus `c57a28e`, Parent `4f92dd6`).
Rollback: `d286556` (nur WAVE-KEYS-03) bzw. `4f92dd6` (beides).
Zonen: KALT schläft (Forge, Wave Editor, Spectral Forge), WARM (Tastenzuordnung). Kein Audio-, Daten- oder Persistenzpfad geändert.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless, echte Maus und Tasten, synthetische Aufnahme). Nicht gehört, nicht auf dem Gerät des Nutzers geprüft.

## Nutzermeldung
- Im Live Room geht Backspace (Oktavierung) „nicht mehr“, im Textfeld schon; Verdacht Hardware.
- Schneiden im Wave Editor „mal so, mal so“, besonders nach einem Besuch im Live Room.
- Zielbild (Nutzer): Forge/Wave Editor ist wie eine eigene App mit eigenem Speicher. Sie schläft, solange ein anderer Raum gespielt wird. Verbindung nur über ausdrückliches Senden. Dass immer eine Datei im Editor liegt, darf kein Problem sein.

## Befunde (gemessen, Probe-Build Chromium)
1. **Nicht Hardware.** Seit WAVE-KEYS-02 (`4f92dd6`, 16.11.) nahm der Wave Editor Entf/Backspace/Strg+X/C/V/Z/Y auch bei Fokus „nirgends“. Sein Listener am `document` blieb aber aktiv, solange die Forge geparkt war (die Forge bleibt nach dem ersten Öffnen in einer `aria-hidden`-Box montiert). Im Live Room schluckte er Backspace (Oktav-Halten kam nie an) und schnitt unsichtbar die markierte Stelle aus der Forge-Datei (225 280 → 168 960 Frames). Bis 15.11. (`03ef59d~1`) war der Live Room nicht betroffen; dort nahm der Editor Tasten nur bei Fokus in ihm selbst.
2. **„Mal so, mal so“ beim Schneiden.** Wer per Kopfzeile in die Forge zurückkehrt, hat den Fokus auf dem Raum-Knopf „II MATERIAL FORGE“. Für diesen Fokus war niemand zuständig: Backspace, Entf und Strg+X taten nichts, bis man in die Wellenform klickte. Ebenso nach dem Knopf „Wave Editor“ (WAVE-KEYS-03). Ob es ging, hing also vom zuletzt geklickten Element ab, nicht von der Dateilänge oder vom Live Room.
3. **Geparkte Forge war nicht stumm.** Außer dem Editor-Listener hingen im Live Room weiter: Werkzeugmenü (`mousedown` → React-Update der Forge bei jedem Klick), Navigator- und Stempel-Ziehen (`mousemove`/`mouseup`), Eingangs-Ruhezähler (`pointerdown`/`up`/`cancel`/`wheel`), Spectral-Forge-Tasten (Buchstaben, Leertaste = Abspielen, Strg+Z/Y) sobald die Spectral Forge einmal offen war. Die Box war `sr-only`: per Tab erreichbar.
   Die Preview-Loop stoppte beim Parken bereits (vorhandener Owner `__deactivateForgeWorkspace`).

## Fix (ein Owner: `__setForgeWorkspaceVisible` in `src/forge/editor/07_view_lifecycle.js`)
- Owner: Der vorhandene Forge-Lebenszyklus (Raum = `L3LAB`) weckt bzw. legt jetzt auch den Wave Editor schlafen (`__XenWaveUIW01.setAwake`) und gibt beim Parken einen in der Box verbliebenen Fokus frei.
- Wave Editor (`src/post-oct/015-…`): `document`-Listener (`keydown`, `pointerdown`-Merker) existieren nur im Wachzustand (`listenKeys`). Beim Schlafen außerdem: Menü/Mix-Fenster zu, laufende Bearbeitungsgeste abbrechen, Blau-Pan und eigene Wiedergabe stoppen. Die Datei bleibt erhalten, die Prüfung der Raumtrennung per DOM aus WAVE-KEYS-03 entfällt (doppelter Owner).
- Zuständigkeit im Wachzustand: Die Raum-Navigation in der Kopfzeile besitzt keine Bearbeitungstaste; Fokus dort zählt wie „nirgends“. Eingabefelder, contenteditable, fremde Menüs/Dialoge bleiben ausgenommen; Escape/Leertaste/Pfeile unverändert.
- Park-Box (`src/rhythm/02_bass_and_rack.js`): zusätzlich `inert` (nicht fokussierbar, nicht klickbar) und `data-xen-forge-room`.
- Übrige Forge-Listener hängen am vorhandenen Kontext `__ForgeWorkspaceVisibility`: Spectral-Forge-Tasten (`FWe`), Navigator-Ziehen (`e4e`), Stempel-Ziehen (`r4e`), Ruhezähler (`s6e`). Das Werkzeugmenü (`b4e`) lauscht nur noch, solange es offen ist.

## Messung (Live Room, Power an, Forge mit Datei + offenem Editor geparkt)
| | vorher (`4f92dd6`) | nachher |
|---|---|---|
| Backspace im Live Room | erreicht den Live Room nicht | Oktav-Halten erhält die Taste |
| Forge-Datei bei Backspace im Live Room | markierte Stelle geschnitten | unverändert |
| Forge-eigene Listener an `window`/`document` (Taste/Zeiger/Maus) | 9 (Spectral-Forge-Tasten kämen nach deren Öffnen hinzu, laut KEY-OWNER-01; hier nicht gezählt) | 0 (Zählung gegen „Forge nie geöffnet“) |
| Tab im Live Room | kann in die versteckte Forge springen | nie |
| Rückkehr per Kopfzeile, sofort Backspace / Entf / Strg+X | nichts | schneidet (Strg+Z macht rückgängig) |

## Tests
- Neu: `tests/e2e/forge_sleep_parked.cjs` (Live Room: Backspace/Entf gehören dem Live Room, Datei unverändert; Listener-Zählung; `inert`; 60× Tab; Rückkehr per Kopfzeile: Backspace, Entf, Strg+X schneiden sofort, Strg+Z). Auf `4f92dd6` rot.
- Übernommen: `tests/e2e/wave_keys_launch_and_rooms.cjs` (WAVE-KEYS-03).
- `build.py --check` OK, `run_tests.sh` 128/128.
- Browser (`tests/e2e/*`, 68 Tests einzeln, Probe-Build): 58 grün, 10 rot. Davon 9 auf Parent `4f92dd6` identisch rot (Altlast, siehe KEY-OWNER-01: `grid_drag_selection`, `live_grid_handles`, `room5_live_psylab`, `room5_psylab`, `stems_instruments`, `stems_record`, `thunder_lane_split_ui`, `thunder_one_clock`, `variante_room`). `particle_head_hum` war im Gesamtlauf einmal rot (Pegelprüfung „hum is back“), danach auf diesem Stand 2/2 grün, auf Parent und Stufe 1 grün: Ausreißer, nicht durch diesen Patch.
- Grün u. a.: `forge_sleep_parked`, `wave_keys_after_click`, `wave_keys_launch_and_rooms`, `live_keyboard_window_keys`, `hwkeyboard_live`, `forge_loop_stereo`.
- Alt-Tests gegen `index.html`: `ui_side_arrows`, `ui_visual_restore`, `power_browser_smoke`, `test_stamp_full_browser_p37` grün; `mix_audio_browser` rot, auf Parent identisch rot (Befund und Fix: MIX-HOLD-01 auf `claude/zealous-bardeen-srtwvd`).

## Größe
index.html 8 266 617 B (`4f92dd6`) → 8 267 312 B (WAVE-KEYS-03, +695) → 8 268 292 B (FORGE-SLEEP-01, +980). Gesamt +1 675 B.

## Offen
- Synthetic Forge (canonical): Ihre Tasten sind über ein eigenes Fokus-/Zeiger-Flag abgegrenzt (Klick in die Kopfzeile setzt es zurück, geparkt ist sie durch `inert` nicht erreichbar). Ihre Zieh-Listener (`mousemove`/`mouseup`, ohne Wirkung) bleiben geparkt angemeldet; Umbau im minifizierten Kern nicht in diesem Patch.
- Lange Dateien: Nach Laden und nach jedem Schnitt friert die Oberfläche ~1–2 s ein (ganzes Asset wird im Hauptthread in IndexedDB geschrieben, Befund in WAVE-KEYS-03). Tasten in dieser Zeit wirken verspätet. Ein Fix existiert auf `claude/hopeful-hawking-jc2g2n` (PERSIST-OFFTHREAD-01, `86085d3`), nicht in diesem Patch.
- Firefox/Safari: `inert` und Fokusfreigabe nicht im echten Browser geprüft.
