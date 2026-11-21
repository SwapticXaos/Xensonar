# DIST-STYLE-01 · Distribution-Bereich im Melodic-Loop-Raum

Parent: `0852bd3` (`index.html` 8 356 417 B). Jetzt 8 364 ca. KB (siehe Build; **+ ca. 7,6 KB**, fast nur CSS mit Icon-Masken). Zone: WARM (Oberfläche, kein Audio, keine Daten). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshot gesehen). **Nicht gehört.**

Befund (Nutzer): im Bereich „Distribution · Melodic Loop“ hatten einige Buttons Symbole, andere nicht, und alle waren flach.
- Drei Buttons trugen Emoji (📀 🎼 🎚), fünf nichts (Undo, Redo, Send to Spectral Forge, Send Raw to Audio Import, Import Material Track).
- Jetzt hat jeder Button ein **Icon im selben Zeichenstil** (als CSS-Maske in der Textfarbe), **angelehnt an die schon vorhandenen Symbole**: Material Track = Scheibe (📀 wie in der Forge), Root Follow Loop = Noten (🎼/🎵), Multitrack = Regler (🎚), Spectral Forge = gemalte Linie (wie auf der Kachel), **Send to Wave Editor = Schere (✂ wie im Wave Editor)**, Import Material Track = Pfeil in die Ablage (dafür gab es noch keins), Undo/Redo = Pfeile; Titel mit einem Verteil-Symbol.
- **Umbenannt:** „Send Raw to Audio Import“ heißt jetzt „Send to Wave Editor“ (Funktion unverändert: sie rendert den Mix in den Audio-Import der Spectral Forge, wo der Wave Editor sitzt); Tooltip angepasst.
- Die Tasten sind **plastisch** wie die Instrumentenkästchen: Verlauf in einer eigenen Farbe je Funktion (Cyan, Violett, Bernstein, Himmelblau, Grün, Magenta), Lichtkante, Glanz, Schatten, Druck 1 px, Hover heller, ausgegraut gut lesbar; der Bereich selbst mit Verlauf und Lichtkante.
- JSX nur: `data-ml-dist`-Attribute an den acht Buttons, Emoji aus den Texten entfernt (Titel, Tooltips, Reihenfolge, Verhalten unverändert); Rest CSS (`styles/areas/035_xen-live-controls.css`).
- Gezielt geprüft: `build.py --check` OK, `melodic_erase` (nutzt Undo) grün. Keine Suite (Nutzerwunsch). Kein Test referenzierte die Emoji-Texte.

Rollback: `0852bd3`.
