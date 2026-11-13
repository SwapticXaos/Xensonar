# PSY-X · Psy Lab im Live-Raum folgt den X-Gradienten

Parent: STEMS-04-Stand. Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/room5_live_psylab_xgradient.cjs`, Chromium headless; `room5_live_psylab.cjs`, `room5_psylab.cjs` unverändert grün). **Nicht gehört, nicht USER_ACCEPTED.** Zone: WARM (Parameter werden pro Notenstart / pro Frame für gehaltene Noten gesetzt; nichts pro Audioblock). HTML-Zuwachs: ca. +2,2 KB.

**Befund (berechtigte Kritik):** Psy Lab war ROOM5-10 als „integriert“ gemeldet, ignorierte im Live-Raum aber die **X-Achse** der Spielfläche – die Dimension, für die der Live-Raum den Timbre-Gradienten (und den Lautstärke-Gradienten) überhaupt hat. In Raum V steuert X den Psy-Lab-Regler „Pad“ (Parameter 37, skaliert mit „Pad Y depth“, Parameter 38). Das hätte als **unvollständig übernommen** gekennzeichnet werden müssen.

## Was jetzt gilt
- **Timbre-Gradient → Pad-Regler:** Ist der Timbre-Gradient des Live-Raums an, schiebt die X-Position (beim Anschlag; Wave-Starter-Linksklick auch laufend mit der Maus, solange gehalten) den Psy-Lab-Regler (Param 37) von 0 bis 1 – **nach der eingestellten Gradienten-Form**: *sitar_rise / psy_rise / wire_to_psy* steigen nach rechts, *psy_to_wire* fällt nach rechts, *center_shine* ist in der Mitte am stärksten, *edge_tension* an den Rändern. Aus / „none“ = 0 (kein Schub, nichts bleibt hängen). Wie stark der Regler wirkt, bestimmt weiter die „Pad Y depth“ des Patches. Gleiche Quelle der X-Position wie der Gradient der anderen Stimmen (`waveLaunchX` bzw. Cursor-X); Tastatur-Noten nehmen den Cursor-X.
- **Lautstärke-Gradient:** wirkt auf die Anschlagstärke von Psy-Lab-Noten wie bei allen anderen Wave-Starter-/Keyboard-Stimmen (`iZ`, links leise/rechts laut usw.).
- **Gemessen (headless):** Brillanz-Schwerpunkt der Klangausgabe (Liquid Bell, psy_rise): links ca. 4,1–4,9 kHz, rechts ca. 9,3–9,5 kHz. Reglerwerte links 0,08 / rechts 0,92 / gehaltene Note beim Zug nach rechts 0,90; Anschlagstärke bei „links leise, rechts laut“ 0,33 → 0,79.
- **Kennzeichnung:** Im Sound-Menü steht bei jedem Psy-Lab-Eintrag „Live: no Hold, no effect sends yet“.

## Was Psy Lab im Live-Raum **noch nicht** kann (offen, ehrlich)
1. **Ein Regler pro Lane, nicht pro Stimme:** Wave-Starter-Lane und Keyboard-Lane haben je eine Psy-Lab-Engine; der Pad-Regler ist ein Wert pro Engine (wie das eine Pad in Raum V). Akkorde auf der Tastatur teilen den zuletzt gesetzten X-Wert, bereits klingende Noten ziehen mit. Echtes Pro-Stimme-Timbre bräuchte Änderungen im Psy-Lab-Prozessor.
2. **Kein Hold** (Thunder / Hold-Pläne) für Psy-Lab-Sounds (Hinweis steht in der Oberfläche).
3. **Keine Effekt-Sends / keine Instrumenten-EQ:** Der Psy-Lab-Ausgang geht direkt in den Hauptbus (`getMasterInput`), nicht durch die Parallel-Effekt-Sends (Drive, Spiral, Memory …) und die Instrumenten-EQ der Wave-/Keyboard-Stimmen (nach Code-Lesung, nicht eigens gemessen).
4. **Hold-Gradient-Morph** (Avalanche) betrifft nur Hold und damit nicht Psy Lab.
Rollback: der Commit davor (STEMS-04).
