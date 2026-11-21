# SAVE-UNIT-01 · Project Name, Save und Figure Projects als eine Einheit (Spectral Forge)

Parent: `1266f27` (`index.html` 8 361 523 B). Jetzt 8 363 ca. KB (siehe Build; + ca. 2 KB). Zone: WARM (Oberfläche). Status: CODE_PRESENT, BROWSER_CHECKED (Screenshot bei 1920 px, 3-fach). **Nicht gehört.**

- **Symbol:** Auf dem Figure-Projects-Button ersetzt das Spectral-Forge-Symbol (Trägerlinie rot/orange/gelb mit cyanfarbenen Obertönen, wie neben dem Undo-Button der Forge) das Regenbogen-Emoji (`src/forge/ui/02_donor_routing_and_hearing.js`). Klein gehalten (27×18 px), Text bleibt einzeilig.
- **Save hochkant:** Der Save-Button reicht jetzt über beide Zeilen (Project Name und Figure Projects): 42 × 64 px statt 42 × 34, plastisch in Cyan mit dem vorhandenen 💾 (wie bei „Canvas + JSON“) über dem Wort „Save“. Name-Feld und Figure-Projects-Button enden an seiner linken Kante; zusammen eine Einheit. Der bestehende Platz (Figure Projects ist 47 px kürzer als die Spalte) trägt das ohne Layout-Änderung: der Button ragt per Overflow nach unten (`28`/`035` CSS), die Zeilenhöhe bleibt.
- Nur im breiten Layout (ab 1001 px). Darunter fließt Figure Projects in eine eigene Zeile, dort bleibt Save wie vorher.
- Zugänglicher Name und Verhalten unverändert (`aria-label` „Save as New Project“). Kein Test hing an dieser Stelle.
- Geprüft: `build.py --check` OK, Screenshot bei 1920 px. Nicht geprüft: schmale Fenster (≤1000 px), 1440 px mit angezeigter rechter Nodal-Leiste (dort läuft das Rack horizontal über, auch vorher).

Rollback: `1266f27`.
