# MT-ALIGN-01 · Send to Multitrack hängt am Import-Audio-Tab (Spectral Forge, breite Fenster)

Parent: `a34bbb4` (`index.html` 8 366 775 B). Jetzt 8 367 ca. KB (+ ca. 1 KB). Zone: WARM (Layout). Status: CODE_PRESENT, BROWSER_CHECKED (Messung bei 1920/1600/1440/1280 px, Screenshot bei 1920 px). **Nicht gehört.**

Befund (Nutzer, kleineres Fenster als meines): Send to Multitrack soll in einer Linie mit den anderen Send-to-Tasten bleiben (Editor, Material Track, Root Follow, Pink Track), wobei der Import-Audio-Tab dazwischen steht. Die Lücke darf bei breitem Fenster nur zwischen Project Name / Figure Projects und dem Import-Tab entstehen.
Ursache: Das Multitrack-Feld hängt in der rechten Spalte des unteren Rasters (246 px, rechtsbündig am Rack, ausgerichtet an Project Name). Bei 1920 px lag der Tab bei x 1040–1083, Multitrack aber erst bei x 1211: 128 px Lücke direkt vor Multitrack.
Änderung:
- `__ForgeRackVerticalAlign` (`src/forge/editor/09_workflow_controls.js`, misst das Rack ohnehin mit ResizeObserver) setzt `--xen-mt-shift` am Eckfeld: der Abstand vom rechten Rand des Import-Tabs (+5 px) bis zur Spalte. Nur wenn Tab und Multitrack in derselben Zeile liegen und der Tab links von der Spalte steht; sonst wird die Variable entfernt.
- CSS (`035`): `margin-left:var(--xen-mt-shift,0px)` und `width:calc(100% - var(--xen-mt-shift,0px))` am Multitrack-Feld. Ohne die Variable ändert sich nichts. Figure Projects (absolut im Eckfeld, linksbündig) und der Save-Block bleiben, wo sie waren.
- Gemessen: 1920 px: Multitrack x 1088, direkt hinter dem Tab (Abstand 5 px), reicht bis zum Rand (369 statt 246 px breit), gleiche Zeile wie Pink Track; 1280 px: ebenso (x 549 hinter dem Tab bei 501–544).
- Test `tests/e2e/forge_multitrack_line.cjs` (1920 und 1280 px): Abstand zum Tab ≤ 12 px, gleiche Linie, endet im Rack, Figure Projects bleibt unter Project Name.
- Nicht geändert: In Fenstern von etwa 1300 bis 1900 px läuft das Rack nach rechts über (Import-Tab liegt dort rechts neben dem Eckfeld); das war vorher schon so, es gibt dort nichts anzuhängen. Falls das auf deinem Fenster der Fall ist und es dort anders aussehen soll: bitte Breite nennen.

Rollback: `a34bbb4`.
