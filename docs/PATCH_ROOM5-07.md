# ROOM5-07: Thunder Mode getrennt für Enter/Wave Starter und Keyboard

Status: CODE_PRESENT, UNIT_VERIFIED (`tests/thunder_lane_split.cjs`), BROWSER_CHECKED nur für die Schalter (`tests/e2e/thunder_lane_split_ui.cjs`).
Das hörbare Verhalten (Keyboard-Hold aus, Enter-Hold an und umgekehrt) ist **nicht** per Gerät/Gehör geprüft. Nicht USER_ACCEPTED.
Zone: HEISS-Steuerung (Hold-Planer), aber nur Gating-Bedingung; keine Änderung der Planer-Mathematik. Daten-Owner: `nexusParams` (Shell, `Tt`).

## Änderung
- Neuer optionaler Parameter `thunderKeyboardEnabled`. Fehlt er (alle bisherigen Sessions/Presets), folgt Keyboard `thunderModeEnabled`: identisches Altverhalten.
  `thunderModeEnabled` bedeutet weiter Enter / Wave Starter.
- `__xenThunderLane(params, lane)` (`src/audio/05_live_voice_runtime.js`): ein Ort für die Entscheidung.
  Enter-Handler `L`, Keyboard-Handler `B`, `resolveNodalInitialHoldIdentity(lane)` und der Keyboard-Tastenpfad (`src/rhythm/04_workspace_and_transport.js`) fragen ihre eigene Spur.
  Der Planer-Effekt (`Jxe`) läuft, solange mindestens eine Spur an ist (Flag in `01_room_shell.js`).
- UI (`10_entrophon_and_voice_control.js`): statt „ON/OFF“ jetzt zwei Schalter „Enter ON/OFF“ und „Key ON/OFF“ in der Hold-Zone. Beim Klick werden beide Werte explizit geschrieben, damit sie sich danach nicht mehr koppeln.

## Offen
- Eine Spur, die mitten im Halten ausgeschaltet wird, beendet laufende Gesten nicht sofort (wie bisher beim gemeinsamen Schalter für die Spur-Handler); neue Anschläge sind betroffen.
- Rollback: Commit davor (352c310).

## Nachtrag (ROOM5-09)
Die UI mit zwei Schaltern „Enter“ / „Key“ war zu breit und verschob Nachbarn. Sie wurde durch **einen** Schalter ersetzt, der sich auf den offenen Tab bezieht („ON (E)“ / „OFF (K)“, feste Breite). Parameter und Logik (`thunderModeEnabled`, `thunderKeyboardEnabled`) sind unverändert; siehe `docs/PATCH_ROOM5-09.md`.
