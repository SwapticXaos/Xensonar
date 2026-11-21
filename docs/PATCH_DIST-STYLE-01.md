# DIST-STYLE-01 · Distribution-Bereich im Melodic-Loop-Raum

Parent: `0852bd3` (`index.html` 8 356 417 B). Jetzt 8 364 ca. KB (siehe Build; **+ ca. 7,6 KB**, fast nur CSS mit Icon-Masken). Zone: WARM (Oberfläche, kein Audio, keine Daten). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshot gesehen). **Nicht gehört.**

Befund (Nutzer): im Bereich „Distribution · Melodic Loop“ hatten einige Buttons Symbole, andere nicht, und alle waren flach.
- Drei Buttons trugen Emoji (📀 🎼 🎚), fünf nichts (Undo, Redo, Send to Spectral Forge, Send Raw to Audio Import, Import Material Track).
- **Keine neu gezeichneten Symbole** (meine erste Fassung mit schwarz-weißen Masken wurde auf Wunsch verworfen). Jeder Button trägt ein schon vorhandenes Symbol: Material Track 📀 und Import Material Track 📀 (wie in der Forge), Root Follow Loop 🎼 **auf dem weißen Kreis wie im Live Room** (vorhandene Komponente `D6`, sonst ist der Notenschlüssel auf der farbigen Taste schlecht zu sehen), Multitrack: **eigenes farbiges Symbol** (drei Spuren mit Clips in Cyan, Violett, Bernstein, Grün, Rosa, Blau und einem Playhead; das Unicode-Regler-Symbol passte nicht), Undo/Redo ↶ ↷ (wie in der Forge), **Send to Spectral Forge** die Spektrum-Miniatur neben dem Undo-Button der Forge (rote Trägerlinie mit cyanfarbenen Obertönen, Zeichnung aus `__ForgeSpectrumToggle` übernommen) und **Send to Wave Editor** die **gemeinsame, farbige Schere des Wave Editors** (`styles/post-oct/072-xen-scissors-offline-ui.css`, ich habe meinen Button dort in die Selektorliste aufgenommen, nichts nachgezeichnet). Der Titel hat kein Symbol.
- **Umbenannt:** „Send Raw to Audio Import“ heißt jetzt „Send to Wave Editor“ (Funktion unverändert: sie rendert den Mix in den Audio-Import der Spectral Forge, wo der Wave Editor sitzt); Tooltip angepasst. Undo/Redo behalten ihren zugänglichen Namen (`aria-label`).
- Die Tasten sind **plastisch** wie die Instrumentenkästchen: Verlauf in einer eigenen Farbe je Funktion (Cyan, Violett, Bernstein, Himmelblau, Grün, Magenta), Lichtkante, Glanz, Schatten, Druck 1 px, Hover heller, ausgegraut gut lesbar; der Bereich selbst mit Verlauf und Lichtkante.
- JSX nur: `data-ml-dist`-Attribute an den acht Buttons, Emoji aus den Texten entfernt (Tooltips, Reihenfolge, Verhalten unverändert); Rest CSS (`styles/areas/035_xen-live-controls.css`).
- Gezielt geprüft: `build.py --check` OK, `melodic_erase` (nutzt Undo) grün. Keine Suite (Nutzerwunsch). Kein Test referenzierte die Emoji-Texte.

- **Bündig:** Bei allen Sende-/Import-Tasten sitzt das Symbol links am Rand (alle in einer Linie), der Text bleibt in der Mitte (Symbol absolut positioniert, Text mit 40 px Rand je Seite); Undo/Redo bleiben zentriert.

Rollback: `0852bd3`.
