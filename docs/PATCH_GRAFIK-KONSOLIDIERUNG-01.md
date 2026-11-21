# GRAFIK-KONSOLIDIERUNG-01 (21.11.2026)

Prüfung aller Grafik-Patches der letzten Tage auf Überschreib-Schichten und Reste von Fehlversuchen. Maßstab: Bild vorher/nachher **pixelgleich** (Screenshots, `cmp`), Funktion unverändert.

- **Werkzeugleiste Melodic Loop (ML-MARK-02):** hatte sechs aufeinander gesetzte Korrekturschichten (3×2-Raster, dann 6 Spalten, Mindesthöhe 196 dann 154, Zeilenumbruch-Hilfselement, per JS gemessene Abstände `--ml-mark-x/--ml-tools-w`). Jetzt: eine Spalte `.ml-noteclip-tools` mit zwei Zeilen (Mark…Paste, darunter die sechs Tasten); die Breite ergibt sich aus der oberen Zeile, keine Messung, kein `!important`, kein Hilfselement. Die Grunddefinition (`.melodic-transport-dock`, `margin-top`) wurde an Ort und Stelle geändert statt überschrieben. Der Dock wird optisch ausgerichtet wie vorher (negativer unterer Rand der Spalte).
- **Kacheln (TILES-ART-01):** doppelte Beschreibungsregeln (`max-width`, Zeilenbegrenzung, Medienabfrage) zu je einer Regel; veraltetes `min-height:132px` entfernt (die feste Höhe gilt); „gewählte Kachel“ (Umrandung, Helligkeit, Kunst, Playhead, Abdunkeln der anderen) mit einem gemeinsamen Selektor `:is(...)` statt zehnmal wiederholt; Reste-Kommentar entfernt; die Auswahl-Regel stand im Save-Block, jetzt bei den Kacheln.
- **Melodic-Kachel-Hintergrund:** die grüne Fläche hing zufällig an der Verlaufs-ID der grünen Noten (`xta-mg`). Jetzt eigener Verlauf `xta-mbg` (gleiche Farben, bewusst).
- **Spectral-Forge-Symbol:** vier Kopien (Distribution, Figure Projects, Diskettenetikett; die Kachel-Variante bleibt als CSS-Datenbild) → eine Funktion `globalThis.__xenSymForgeLines` mit Varianten. **Multitrack-Symbol:** Kopie in der Distribution durch `__xenSymMultitrack` ersetzt. **Melodic-Symbol:** `__xenSymMelodic` (schon vorher eine Quelle).
- **Distribution-Tasten:** Größe des Wave-Symbols in die gemeinsame Positionsregel gelegt (statt zweier Regeln).
- **Ohne-Audio-Rack (NOAUDIO-NAV-01):** wirkungslose Angaben (`opacity:1; filter:none`) und überholte Kommentare („dimmed“) entfernt; zusammengehörige Regeln nebeneinander.
- **Nodal-Tor (026):** drei gleichlautende `transform:none`-Überschreibungen (closing, sealing, glitch) zu einer.

Belege: Screenshot-Vergleich (pixelgleich) für Kacheln (ohne/mit Auswahl), Figure Projects, Save, Spektrum-Schalter, Distribution Forge/Multitrack; Tests `tiles_more_button`, `forge_noaudio_nav`, `forge_multitrack_line`, `melodic_mark_scale`, `melodic_erase`, `nodal_gate`, `test_forge_cross_geometry_lock` grün; `build.py --check` OK.
Nicht angefasst (bewusst): pro Raum eigene, getrennte Style-Dateien; die vorhandenen `!important` der Distribution-Tasten und des Root-Follow-Symbols, weil die Bestandskomponente Inline-Größen setzt.
