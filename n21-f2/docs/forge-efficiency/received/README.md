# XenSonar P7 Reviewed – kompakte Material-Preview

Basis: exakt `XenSonar_P7_Reviewed_Quellen.zip` (Codex Reviewed), **nicht** N21-F2 Original.

Umfang: nur `src/forge_and_melodic/06_note_editor_and_material_tools.js`.

Änderungen:
- Play-Button rechts von 40 × 40 auf 28 × 28 px, damit die unveränderten zwei Textzeilen die Zeilenhöhe bestimmen.
- Metadatenzeile `truncate whitespace-nowrap`: lange Werte werden rechts abgeschnitten statt eine dritte Zeile zu erzwingen.
- Keine Änderung von Audio-, Preview- oder Auswahl-Handlern.

`layout_patch.json` ist ein exakt prüfsummengebundener Quelltext-Span-Patch. Für Codex: nur die zwei dokumentierten Ersetzungen durchführen und die Prüfsummen prüfen; keinen Komplett-Replace in einem anderen Quellzweig.

Prüfung: `node --check` für betroffenes Quellmodul und vollständiges Inline-JavaScript bestanden; `node build.cjs` und `node build.cjs --verify` bestanden. Automatischer Chromium-DOM-Test lieferte keine auswertbare Antwort, daher kein belegter echter UI-Start oder Pixelvergleich. **Visuelle Abnahme in Opera offen.**

Layout-Soll: exakt zweizeilige schlanke Einträge ohne eigene Preview-Zeile, rechts ein kleines quadratisches ▶, Titel und Metadaten jeweils maximal eine Zeile.
