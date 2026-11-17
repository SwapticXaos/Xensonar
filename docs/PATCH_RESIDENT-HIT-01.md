# RESIDENT-HIT-01: Drag-Kreise der Residents liegen exakt auf den Resident-Punkten (Live Room)

Parent: `4f92dd6`. Zone: WARM (nur Oberfläche des Hauptraums; Audio, Scheduler, Wellen-/Anklinglogik, Koordinaten der Knoten unberührt). Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless). Nicht auf Gerät/Maus-Gefühl geprüft.

## Befund
Die Resident-Punkte (orange, mit Label) werden in den Canvas der Overlay-Schicht gezeichnet (logisch 1100 × 580, per CSS auf Anzeigegröße skaliert). Die Greif-Kreise darüber sind DOM-Buttons mit `left/top` in **logischen Pixeln** und wurden nicht mitskaliert. Ab einer Anzeigebreite ≠ 1100 px (z. B. 908 px bei 1440er Fenster) lagen Kreis und Punkt auseinander, je weiter vom Ursprung, desto mehr. Die Wellenstart-Treffer (Ringwellen → Resident) rechnen in den logischen Koordinaten und waren korrekt, nur die Greif-Kreise nicht.

## Änderung (`src/rhythm/02_bass_and_rack.js`, Komponente `Nce`)
- Position der Kreise in **Prozent** der Overlay-Fläche (`x/Breite`, `y/Höhe`) statt in logischen Pixeln → folgen jeder Anzeigegröße.
- Kreise unsichtbar: kein Rahmen, kein Hintergrund, kein Outline (vorher schwacher Amber-Rand).
- Test-Marke `data-xen-resident-hit`.
Drag-Rechnung (`ode`/`hH`) war schon rect-basiert und bleibt unverändert.

## Test
`tests/e2e/resident_hit_alignment.cjs`: 12 Kreise vorhanden, ohne Rahmen/Hintergrund; normierte Mitte jedes Kreises bleibt bei Fensterbreite 1440 → 900 gleich (Canvas 908 → 792 px). Hinweis: gegen den Parent wäre er nur wegen der fehlenden Marke rot (kein echter RED der Verschiebung).
`run_tests.sh` 128/128, `build.py --check` OK. HTML-Größenzuwachs: ca. +0,1 KB.
Rollback: `4f92dd6`.
