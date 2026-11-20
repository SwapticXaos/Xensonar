# TILES-ART-01 · Kacheln Spectral Forge und Melodic Loop

Parent: `fe55f44` (`index.html` 8 345 318 B). Jetzt 8 356 229 B (**+10 911 B**: ca. 7 KB statisches SVG, ca. 4 KB CSS). Zone: WARM (Oberfläche, kein Audio, keine Daten). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshots von mir gesehen). **Nicht gehört.**

## Idee
Eine Melodielinie, zwei Schreibweisen: in **Spectral Forge** als fließende, gemalte Linie (Glissando, fretless, mehrstimmig, am Ende ein Vibrato für „expressiv“, Pinseltupfer am Strichanfang, Frequenzraster), in **Melodic Loop** als Treppe aus Notenblöcken auf Tonlinien mit Taktstrichen, in den Instrumentfarben (Blau, Violett, Grün, Orange) und mit Glanzkante. Der Playhead der Grafik wandert auf der gewählten Kachel langsam über das Bild. Gleiches Motiv, gleiche Kontur: Yin und Yang der Melodieführung (fließend / gestuft). Beide Felder haben einen farbigen Verlauf (Cyan-Blau; Grün-Violett, auf Wunsch nach dem ersten grünen Zufallsbild).
- Oberfläche wie die Instrumentenkästchen (Verlauf, Lichtkante, Glanz, Schatten, gewählte Kachel leuchtet); kleine Icons vor den Titeln (per CSS); Grafik ist `aria-hidden`, nimmt keinen Klick und läuft links unter dem Text aus (Maske). `prefers-reduced-motion` schaltet den Playhead-Lauf ab.
- Texte: Spectral Forge: „Paint melodies, glissandi and chords as free, fretless lines, then hear the same figure through different sound bodies: from pure tones to your own donor sounds.“ (statt „listen immediately …“: das Besondere ist das Hören durch verschiedene Klangkörper). Melodic Loop: „Write note blocks on freely tuned pitch lines, any scale, any meter, one sound per instrument.“ (statt „Compose Ideas, Tune Precisely“).
- Dateien: Grafik `src/rooms/00_forge_rack_presentation.js` (SVG-Strings), Kacheln `src/rooms/lab.js` (nur Attribut `data-xen-tile` und das Grafik-Element; Titel- und Untertitel-Elemente unverändert), `styles/areas/035_xen-live-controls.css`.
- `tests/ui_m1_p1.cjs` prüft die dritte Textzeile der Melodic-Kachel: an den neuen Text angepasst (Textvertrag, auf Wunsch geändert).

Gates: `build.py --check` OK, `run_tests.sh` 139/139 (nach Anpassung von `ui_m1_p1`); Browser: `send_figure_no_hearing`, `melodic_erase`, `melodic_factory_sounds`, `donor_mask_accept` grün (klicken die Kacheln über ihren Text).
Grenzen: Die Grafik ist ein fester Entwurf, gehört wurde/gemessen nichts; in sehr schmalen Fenstern (Einspaltenlayout) liegt sie hinter dem Text, die Maske blendet sie nach links aus.

**„More ↗“ auf der Spectral-Forge-Kachel** bleibt (Geschwister-Element der Kachel, unten rechts über der Grafik, öffnet seinen ausklappbaren Text). Test `tests/e2e/tiles_more_button.cjs` sichert Grafik, Sichtbarkeit, Nicht-Überdeckung und das Öffnen.

Rollback: `fe55f44`.
