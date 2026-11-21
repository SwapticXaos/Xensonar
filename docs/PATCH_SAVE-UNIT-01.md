# SAVE-UNIT-01 · Project Name, Save und Figure Projects als eine Einheit (Spectral Forge)

Parent: `1266f27` (`index.html` 8 361 523 B). Jetzt 8 363 ca. KB (siehe Build; + ca. 2 KB). Zone: WARM (Oberfläche). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshot bei 1920 px, 3-fach). **Nicht gehört.**

- **Symbol:** Auf dem Figure-Projects-Button ersetzt das Spectral-Forge-Symbol (Trägerlinie rot/orange/gelb mit cyanfarbenen Obertönen, wie neben dem Undo-Button der Forge) das Regenbogen-Emoji (`src/forge/ui/02_donor_routing_and_hearing.js`). Klein gehalten (27×18 px), Text bleibt einzeilig.
- **Save hochkant:** Der Save-Button reicht jetzt über beide Zeilen (Project Name und Figure Projects): 42 × 64 px statt 42 × 34, plastisch in Cyan mit einer **Diskette, deren Etikett das Spectral-Forge-Symbol trägt** (dieselbe Trägerlinie mit den türkisfarbenen Obertönen wie auf dem Figure-Projects-Button, damit klar ist, dass Save die Figur speichert), über dem Wort „Save“. Name-Feld und Figure-Projects-Button enden an seiner linken Kante; zusammen eine Einheit. Der bestehende Platz (Figure Projects ist 47 px kürzer als die Spalte) trägt das ohne Layout-Änderung: der Button ragt per Overflow nach unten (`28`/`035` CSS), die Zeilenhöhe bleibt.
- Nur im breiten Layout (ab 1001 px). Darunter fließt Figure Projects in eine eigene Zeile, dort bleibt Save wie vorher.
- **Tooltip:** „Save as New Project · Saves carrier drawing without specific timbre“ (sagt, dass die Figur ohne bestimmte Klangfarbe gespeichert wird).
- Zugänglicher Name und Verhalten unverändert (`aria-label` „Save as New Project“). Kein Test hing an dieser Stelle.
- Geprüft: `build.py --check` OK, Screenshot bei 1920 px. Nicht geprüft: schmale Fenster (≤1000 px), 1440 px mit angezeigter rechter Nodal-Leiste (dort läuft das Rack horizontal über, auch vorher).

Rollback: `1266f27`.

## Nachtrag: Tooltips der Spectral-Forge-Rack-Tasten nach dem, was der Code sendet (21.11.)
Im Code nachvollzogen (`x6e` in `src/forge/editor/07_composition_and_preview_ui.js`, `__f333SendToEditor`): Die Sende-Tasten rendern die **aktuell gewählte Hörweise** (`__f333ExportCurrent`, Klangfarbe/Donor eingeschlossen). Nur die Pink-Track-Modi Scattered, Fretless Field und Monotone senden die **reine Trägerzeichnung** (`figureOnly`, ohne gerendertes Hören); Raw Audio rendert den Klang.
- **Send to Material Track / Use as Root Follow Loop:** „… · including the currently chosen timbre (listening mode)“.
- **Send to Pink Track (Melodic Loop):** „… Scattered, Fretless Field and Monotone send the carrier drawing without specific timbre; Raw Audio sends the sound including the currently chosen timbre“.
- **Send to Editor / Send to Multitrack:** „… including the currently chosen timbre …“.
- **⬇ WAV / ⬇ FLAC:** „Download the current listening mode … including the currently chosen timbre“ (hatten nur einen `aria-label`).
- **💾 Canvas + JSON:** „Exports the current listening mode (including the currently chosen timbre) as WAV plus JSON metadata and saves the loop in the material database“. **Auffällig:** der Button exportiert laut Code WAV + JSON und schreibt in die Material-Datenbank, nicht die Zeichenfläche; sein Name „Canvas + JSON“ trifft das nicht. Name nicht geändert, nur der Tooltip beschreibt es wahrheitsgemäß.
- **Figure Projects:** „… saved carrier drawings without specific timbre (Lab Library)“; **Save:** wie zuvor.
Nur Tooltip-Texte (`title`), Namen für Screenreader und Verhalten unverändert. Geprüft: Build-Check und Auslesen aller Titel im Browser (1920 px). Keine Suite.
