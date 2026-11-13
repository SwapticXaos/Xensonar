# GRID-DRAG-SEL · Auswahldreieck bleibt beim gezogenen Dreieck

Parent: `STEMS-03`-Stand (Commit nach `487a314`). Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/grid_drag_selection.cjs`, Chromium headless; auf dem Parent rot, mit dem Patch grün). **Nicht gehört/bedient am Gerät, nicht USER_ACCEPTED.** Zone: WARM (nur Zeichnen der Markierung). HTML-Zuwachs: ca. +0,5 KB.

**Gemeldet:** Zieht man im Live-Raum ein blaues Stimm-Dreieck (links) zum Stimmen, wandert das *Auswahldreieck* (die Markierung) tief weiter nach unten, während das tatsächlich verschobene Dreieck unmarkiert erscheint.

**Ursache:** Die Markierung gehörte immer dem Dreieck, das dem Zeiger am nächsten ist (`__XenGridHandles.hit(rows, …, focus.x, focus.y)` im Zeichnen). Beim Ziehen folgt das Dreieck dem Zeiger aber nur langsam (1 Einheit je 25 px), der Zeiger läuft voraus – die Markierung sprang auf ein anderes Dreieck (oder verschwand, sobald der Zeiger die 30-px-Randzone verließ).
**Fix:** `__XenGridHandles.drag.step` hält das gerade gezogene Step (gesetzt beim Greifen, gelöscht bei Loslassen / Verlassen). Solange es gesetzt ist, gehört die Markierung diesem Dreieck – dort, wo es jetzt ist. Danach gilt wieder die Regel „nächstes Dreieck am Zeiger“ (Klick/Hover/Rechtsklick unverändert). Gleicher Besitzer für **Live-Raum und Raum V** (beide zeichnen über `__xenDrawMainGridLayer`; Raum V setzt/löscht den Wert in seinem Pointer-Handler).
**Test:** Dreieck greifen, 192 px nach unten ziehen (Zeiger deutlich vom Dreieck entfernt): die Markierungslinie liegt in jedem Frame auf der aktuellen Höhe des gezogenen Dreiecks; nach dem Loslassen ohne Zeiger in der Nähe keine Markierung. Parent: Markierung bei y = 485, Dreieck bei y = 574 (rot).
Rollback: der Commit davor.
