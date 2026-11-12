# ROOM5-10: Psy Lab als Klang im Live-Raum (Wave Starter: Enter / Linksklick, und Keyboard)

Status: CODE_PRESENT, UNIT_VERIFIED (`tests/room5_live_catalog.cjs`, `tests/room5_live_host.cjs`, `tests/thunder_lane_split.cjs`), BROWSER_CHECKED (`tests/e2e/room5_live_psylab.cjs`, Chromium headless).
**Nicht gehört, kein PCM-Vorher/Nachher, kein Firefox, keine Hardware-Latenz.** Nicht USER_ACCEPTED.
Parent: `39121b0` (HOLD-LIB), `index.html` 9 041 927 B. Rollback: dieser Commit.

## Zonen
- HEISS-Steuerung: ein Abzweig in `zo` (Einstieg von `playWaveStartSound`, `01_room_shell.js`): ist der Klang der Eingabe `psylab:…`, geht der Ton an `__xenPsyLabNote` statt in den Wave-Pfad. Pro Ton: ein Stringvergleich, eine Worklet-Nachricht; **kein** Storage-Zugriff (Test „no storage read per note“).
- WARM: Rubrik im Klangmenü, Hinweis am Hold-Schalter.
- KALT: Engine und Patchdaten bleiben im lazy Chunk `xen-room-psylab`. Der Chunk wird erst geladen, wenn ein Psy-Lab-Klang gewählt oder (nach Reload, sobald Audio läuft) wiederhergestellt ist; Menü öffnen lädt ihn nicht (Test).

## Verhalten
- **Rubrik „Psy Lab“** in den Klangmenüs von Wave Starter und Keyboard, unter Entrophon und über Samples (Partikel-Spur: keine). Enthält die 8 Werksklänge und alle in Raum V gespeicherten eigenen Klänge; über „Search presets…“ auffindbar.
- **Wave Starter (Enter und Linksklick):** ein Ton pro Auslösung mit kurzem Gate (600 ms), den Rest macht die Release-Zeit des Patches. Kein Enter-Hold.
- **Keyboard:** Ton klingt, solange die Taste gehalten wird; Loslassen beendet genau diese Taste. Sind alle Tasten oben (oder Fokusverlust / Raumwechsel), wird die Spur stumm geschaltet (keine hängenden Töne).
- Beide Eingaben haben je eine eigene Engine ohne Visualisierung (`LiveHost`, `PsyEngine({visual:false})`), können also gleichzeitig verschiedene Psy-Lab-Klänge spielen, oder eine Eingabe Psy Lab und die andere Hold/Thunder mit einem anderen Klang.
- **Hold aus:** Für eine Spur mit Psy-Lab-Klang gilt Thunder/Hold als aus (`__xenThunderLane`), unabhängig vom gespeicherten Schalterwert (der bleibt unverändert und gilt wieder, sobald ein anderer Klang gewählt wird). Der Schalter zeigt „OFF (E)“ / „OFF (K)“, ist abgeblendet; ein Klick zeigt 3 s lang „Psy Lab sounds: Hold not supported yet“.
- Wechsel weg von Psy Lab gibt die Engine der Spur frei.
- Lautstärke: Velocity aus dem Spur-Regler (Wave-Starter-Volume bzw. Keyboard-Volume); Pan ist für Psy Lab nicht verfügbar (eine Engine pro Spur).

## Daten-Owner
- Klangauswahl: wie bisher (`waveStarterHoldSoundPreset` / Wave-Starter-Preset, `keyboardHoldSoundPreset` in `nexusParams`), neuer ID-Raum `psylab:<patch-id>`. Keine Migration.
- Klangdaten: localStorage `xensonar.psylab.instruments.v1` (Raum V), nur gelesen.
- Die Liste der Werksnamen steht zusätzlich im eager Teil (`__XenPsyLab.FACTORY_NAMES`), damit das Menü ohne Chunk gebaut werden kann; `tests/room5_live_catalog.cjs` hält sie mit dem Chunk synchron.

## Nicht enthalten / offen
- Kein Hold-Mechanismus für Psy Lab (bewusst), kein Gleiten (Glissando) zwischen Tönen im Live-Raum: Linksklick/Enter löst einzelne Töne aus; das Gleiten des Balls wie in Raum V ist nicht verdrahtet.
- Keyboard-Glissando (gleitende Tastenwechsel) erzeugt eigene Töne ohne Tastenbindung; sie enden beim Loslassen der letzten Taste.
- Ein in Raum V **geänderter und unter gleichem Namen gespeicherter** Klang wird im Live-Raum erst nach erneuter Auswahl (oder Reload) übernommen.
- Bei ausgeschaltetem Power bleibt eine einmal angelegte Engine bestehen (stumm), bis die Spur den Klang wechselt.
- Pegel gegenüber Entrophon/Samples, Latenz des ersten Tons, Aufnahmepfad (PCM) und Sessions/Songs mit `psylab:`-Klang (Speichern/Laden über Meta-Menü, `.xenpack`) sind nicht einzeln geprüft; ein Paket-Export nimmt die Psy-Lab-Klangdaten nicht mit.
