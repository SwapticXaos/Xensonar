# ML-NOTECLIP-01 · Rechteck-Copy/Paste im Melodic Loop

Zone: WARM (nur Oberfläche, kein Audio-Pfad, kein Storage). Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, `tests/e2e/melodic_noteclip.cjs`). Nicht auf dem Gerät abgenommen.

- Zwei Knöpfe neben Play/+ Drums/›: **⧉ Copy** und **⎘ Paste · n** (`__MelodicNoteClipButtons` in `src/rooms/canonical.js`).
- Copy: Rechteck ziehen → Noten sind geladen und der Modus springt sofort auf Paste. Dann genügt ein Klick aufs Raster. Esc beendet, Rechtsklick auf Paste leert die Ablage, Klick auf Paste schaltet den Modus um. Die Ablage bleibt nach dem Einfügen (mehrfach stempeln).
- **Stand v2:** Nach dem Kopieren hängt die Figur unter dem Zeiger, springt dabei auf das Raster (Zeit-Snap wie beim Malen, Tonhöhenlinie ganzzahlig) und blinkt dort, wo sie landen würde. Ein Klick legt sie ab (kein Zwischenschritt, keine Kopie der Kopie). Die Vorschau ist nur ein Zeichen-Overlay, nichts wird dafür im Composer gespeichert.
- Reuse statt Neubau: Die Vorschau nutzt die vorhandene Darstellung für „pending“ Rasterprojektions-Noten (leuchtend, blinkend). Das Rechteck nutzt das vorhandene Box-Select (`T7`). Der Gruppenschlüssel `__mlGK` aus v1 bleibt als harmlose Verallgemeinerung des Scattered-Zugs stehen.
- Ein Undo-Schritt pro Einfügen. Import-/Material-Noten werden nicht kopiert (Statusmeldung). Alte Daten/Sessions unverändert (`pendingGroup` wird beim Loslassen entfernt).
- Rollback: `git revert`.
- **v3:** Rechtsklick aufs Raster (oder auf Paste) im Paste-Modus leert die Ablage und wechselt zurück zu Copy. Copy erneut klicken = Copy aus = normales Notensetzen.
- **v4:** Zwei Spiegel-Knöpfe neben Paste: ⇆ horizontal (zeitlich rückwärts, Fades getauscht) und ⇅ vertikal (Tonhöhenreihenfolge invertiert). Ausgegraut, solange nichts geladen ist. Wirken auf die geladene Figur und die Vorschau; zweimal klicken stellt sie wieder her.
