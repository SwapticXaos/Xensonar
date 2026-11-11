# ML-NOTECLIP-01 · Rechteck-Copy/Paste im Melodic Loop

Zone: WARM (nur Oberfläche, kein Audio-Pfad, kein Storage). Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, `tests/e2e/melodic_noteclip.cjs`). Nicht auf dem Gerät abgenommen.

- Zwei Knöpfe neben Play/+ Drums/›: **⧉ Copy** und **⎘ Paste · n** (`__MelodicNoteClipButtons` in `src/rooms/canonical.js`).
- Copy: Rechteck ziehen → Noten sind geladen und der Modus springt sofort auf Paste. Dann genügt ein Klick aufs Raster. Esc beendet, Rechtsklick auf Paste leert die Ablage, Klick auf Paste schaltet den Modus um. Die Ablage bleibt nach dem Einfügen (mehrfach stempeln).
- Reuse statt Neubau: Einfügen erzeugt die Kopien als „pending“-Gruppe. Diese nutzt denselben Zieh- und Anker-Mechanismus wie die Scattered-Rasterprojektion (Zeit und Tonhöhe der ganzen Figur, Loslassen setzt). Gruppenschlüssel `__mlGK` = `pendingGroup || trackId`, damit auch mehrere Spuren zusammen wandern. Das Rechteck nutzt das vorhandene Box-Select (`T7`).
- Ein Undo-Schritt pro Einfügen. Import-/Material-Noten werden nicht kopiert (Statusmeldung). Alte Daten/Sessions unverändert (`pendingGroup` wird beim Loslassen entfernt).
- Rollback: `git revert`.
