# TILES-ART-01 · Kacheln Spectral Forge und Melodic Loop

Parent: `fe55f44` (`index.html` 8 345 318 B). Jetzt 8 356 229 B (**+10 911 B**: ca. 7 KB statisches SVG, ca. 4 KB CSS). Zone: WARM (Oberfläche, kein Audio, keine Daten). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshots von mir gesehen). **Nicht gehört.**

## Idee
Eine Melodielinie, zwei Schreibweisen: in **Spectral Forge** als fließende, gemalte Linie (Glissando, fretless, mehrstimmig, am Ende ein Vibrato für „expressiv“, Pinseltupfer am Strichanfang, Frequenzraster), in **Melodic Loop** als Treppe aus Notenblöcken auf Tonlinien mit Taktstrichen, in den Instrumentfarben (Blau, Violett, Grün, Orange) und mit Glanzkante. Der Playhead der Grafik läuft beim Auswählen der Kachel genau einmal über das Bild und blendet aus (keine Dauerbewegung). Gleiches Motiv, gleiche Kontur: Yin und Yang der Melodieführung (fließend / gestuft). Beide Felder haben einen farbigen Verlauf (Cyan-Blau; Grün-Violett, auf Wunsch nach dem ersten grünen Zufallsbild).
- Oberfläche wie die Instrumentenkästchen (Verlauf, Lichtkante, Glanz, Schatten, gewählte Kachel leuchtet); kleine Icons vor den Titeln (per CSS); Grafik ist `aria-hidden`, nimmt keinen Klick und läuft links unter dem Text aus (Maske). `prefers-reduced-motion` schaltet den Playhead-Lauf ab.
- Texte: Spectral Forge: „Paint melodies, glissandi and chords as free, fretless lines, then hear the same figure through different sound bodies: from pure tones to your own donor sounds.“ (statt „listen immediately …“: das Besondere ist das Hören durch verschiedene Klangkörper). Melodic Loop: „Write note blocks on freely tuned pitch lines, any scale, any meter, with up to 8 instrument lanes, each a synth sound or a sample.“ (statt „Compose Ideas, Tune Precisely“).
- Dateien: Grafik `src/rooms/00_forge_rack_presentation.js` (SVG-Strings), Kacheln `src/rooms/lab.js` (nur Attribut `data-xen-tile` und das Grafik-Element; Titel- und Untertitel-Elemente unverändert), `styles/areas/035_xen-live-controls.css`.
- `tests/ui_m1_p1.cjs` prüft die dritte Textzeile der Melodic-Kachel: an den neuen Text angepasst (Textvertrag, auf Wunsch geändert).

Gates: `build.py --check` OK, `run_tests.sh` 139/139 (nach Anpassung von `ui_m1_p1`); Browser: `send_figure_no_hearing`, `melodic_erase`, `melodic_factory_sounds`, `donor_mask_accept` grün (klicken die Kacheln über ihren Text).
Grenzen: Die Grafik ist ein fester Entwurf, gehört wurde/gemessen nichts; in sehr schmalen Fenstern (Einspaltenlayout) liegt sie hinter dem Text, die Maske blendet sie nach links aus.

## Nachträge (Nutzerwünsche)
- Playhead der Grafik läuft **einmal** beim Auswählen (3,4 s) und blendet aus; danach keine Dauerbewegung (gemessen: nach 4,8 s `finished`, Deckkraft 0).
- Melodic-Text: „… with up to 8 instrument lanes, each a synth sound or a sample.“ (statt „one sound per instrument“).
- **Gleiche Höhe**: beide Kacheln fest 152 px (die schmalere), egal welche gewählt ist und wie der Text umbricht; Beschreibung auf 3 Zeilen begrenzt (bei schmalen Fenstern kleinere Schrift). Gemessen bei 1500, 1100 und 820 px Breite: in allen drei Zuständen 152 px (vorher bei 820 px 170 px mit Spectral Forge gewählt).
- Da der Playhead die Wahl nicht mehr dauerhaft anzeigt, ist die **nicht gewählte Kachel abgedunkelt** (Helligkeit 0,58, Sättigung 0,65; Hover hellt auf 0,85). `:has()`-Regel, nur wenn eine der beiden gewählt ist.

**„More ↗“ auf der Spectral-Forge-Kachel** bleibt (Geschwister-Element der Kachel, unten rechts über der Grafik, öffnet seinen ausklappbaren Text). Test `tests/e2e/tiles_more_button.cjs` sichert Grafik, Sichtbarkeit, Nicht-Überdeckung und das Öffnen.

Rollback: `fe55f44`.

## Nachtrag: Spectral-Forge-Kachel gewählt/nicht gewählt gleich formatiert
Befund: Eine bestehende Regel (`054-xen-spectral-workflow-style.css`: Platz für den More-Button, `padding-right:74px` auf dem letzten Textblock, nur solange More angezeigt wird = nur im gewählten Zustand) machte die Beschreibung schmaler; sie brach in eine 4. Zeile und wurde von der 3-Zeilen-Grenze bei „to your …“ abgeschnitten. Dazu hatte die Kachel andere Innenabstände (12/2,125 px) als Melodic (16 px).
Änderung (nur CSS): gleiche Innenabstände, der Zusatzrand entfällt, bei schmalen Fenstern (≤ 1180 px) halten beide Beschreibungen 70 px Abstand zum More-Bereich. Gemessen: Textblock gewählt und nicht gewählt je 3 Zeilen (54 px, kein Abschnitt). Auf Wunsch keine Test-Suite gefahren; nur `build.py --check` (OK) und Screenshot.
