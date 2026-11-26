# GRID-MODES-01 · Modi in der Rasterwerkbank: Bibliothek, Durchschalt-Slots, eigene Modi, Projektionsansicht

## Wie Modi funktionieren (Bestand, unverändert)
- Ein eingebauter Modus ist eine Menge von **12-EDO-Tonklassen** (`yF` in `src/runtime/01_instrument_state.js`, z. B. Ionisch 0 2 4 5 7 9 11 = 0, 200, 400 … ct). Bohlen–Pierce-Modi sind Mengen in 13 Stufen pro Tritave.
- **Projektion** (`Au`): Jede Modusposition in Cent schaltet die **nächstgelegene Stufe** des aktiven Rasters frei, in die Periode gefaltet; alle anderen Stufen werden stumm. So passt ein Modus auf 12-EDO, 31-EDO, JI, Maqam usw.
- **„Chromatic“** ist die Ausnahme: alle Stufen des Rasters (31 auf 31-EDO).
- Durchschalten mit AltGr (vor) / Rechts-Strg (zurück) lief bisher über die feste Liste `Ka(tuning)`, Chromatic zuerst.

## Neu
- **„Chromatic 12 (projected)“**: die 12 Halbtöne, projiziert (12 von 31 Stufen auf 31-EDO).
- **Eigene Modi** (`src/post-oct/038-xen-grid-modes.js`, `__xenModeStore`): gespeichert als Cent-Positionen innerhalb der Periode (`localStorage` `xensonar.gridModes.user.v1`), damit rasterunabhängig; sie projizieren mit derselben Regel wie die eingebauten. Erzeugt mit „Save current pattern as mode“ aus dem aktuellen Raster (offene Stufen = Tuning + Modus + manuelle Mutes). `Ka` nimmt sie für alle Oktav-Tunings auf; damit gelten sie überall, wo Modi geprüft werden.
- **Durchschalt-Slots** (`xensonar.gridModeRack.v1`): geordnete Liste; leer = bisherige Reihenfolge. AltGr / Rechts-Strg laufen nur diese Liste (unpassende Modi werden übersprungen). Steht der aktuelle Modus nicht darin, geht es zum ersten / letzten Slot.
- **Rasterwerkbank**: Reiter „Tunings | Modes“. Modes: Durchschalt-Slots (Ziehen, ↑ ↓ −, Defaults), Bibliothek (Anzeigen, Use, +, Ziehen in die Slots, eigene umbenennen / löschen, aktuelles Muster speichern), Projektion (Modus-Cents über den Rasterstufen, Verbindungslinien, Abweichung je Position; gelb > 15 ct).

## Prüfung
- `tests/grid_modes.test.cjs` (3/3, in `GREEN_NODE_TESTS.txt`): Ionisch auf 31-EDO = Stufen 0 5 10 13 18 23 28, 12 Halbtöne = 12 von 31, 1100 ct → Stufe 28 (−16,1 ct), Faltung in die Periode; eigener Modus speichern / falten / auf 12-EDO = Ionisch / umbenennen; Durchschalt-Liste filtert, Löschen entfernt den Slot.
- `tests/e2e/grid_modes_workbench.cjs`: 31-EDO Chromatic 31 / Chromatic 12 12 / Ionisch 7; Reiter „Modes“, Bibliothek, Projektion; eigener Modus gespeichert und auf 12-EDO = Ionisch; ↑ sortiert die Slots; AltGr: Dorisch → Ionisch → Chromatic 12 → eigener → Ionisch, Rechts-Strg zurück; Chromatic kommt nicht vor.
- `run_tests.sh`: grün bis auf die bekannten 6 Altfehler. Zwei Multitrack-Tests (`room4_04_tempo_and_beat`, `mt_parts_01`) waren durch die Effekt-Arbeit gebrochen (Normalisierer außerhalb des Datenbereichs, neue Felder `spiral`/`psy`) und sind behoben. `psylab_live_grid` scheitert schon auf dem Ausgangsstand `e0740d3`.
- Browser: `grid_visible`, `key_owner_guard`, `room5_psylab` grün.
