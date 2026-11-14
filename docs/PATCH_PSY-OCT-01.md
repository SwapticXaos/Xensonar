# PSY-OCT-01 · Sektor-Quinte und Backspace-Oktave für Psy-Lab-Klänge

Parent: PSY-SNAP-02 (index.html 8 079 732 Bytes). Rollback: der Commit davor.
Neu: index.html 8 080 087 Bytes (+355), sha256 `01032e5fbf69705c0dcf2cdadc1392a82143e82d976a8da1e3ea3c28f70542a8`.
Zone: WARM (vorhandene Psy-Lab-Folgeschleife im Bildtakt, nur solange ein Ton gehalten wird; kein neuer Audioknoten). Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (psylab_octave_sector). Nicht gehört.

## Ursache
Normale Klänge laufen über `zhe` (Sektor ×1,5, Oktave ×2). Psy-Lab-Klänge bekamen in `zo` den rohen Ton und umgingen das.

## Änderung
- Sektorwelle (untere Buchstabenreihe) mit Psy-Lab-Klang: Start mit ×1,5 (`src/app/forge/01_room_shell.js`).
- Backspace (Oktav-Halten): ein gemeinsamer, geglätteter Faktor (~40 ms Zeitkonstante) in `__XenPsyLab` wirkt auf alle gehaltenen Psy-Lab-Töne (Maus und Tasten): halten = schnelles Glissando eine Oktave hoch, loslassen = zurück. Wer Backspace schon hält, startet direkt eine Oktave höher. Zustand kommt über `cursor.octave()` aus dem vorhandenen Oktav-Halteref.
- Test: `tests/e2e/psylab_octave_sector.cjs` (Glissando hoch/runter, Start oktaviert, Sektor = Quinte). Rot auf dem Parent nicht gesondert nachgewiesen.

## Offen
- Nicht gehört. Die Oktave gilt auch für den Maus-Lead im Snap-Modus (Faktor auf dem Zielton). Kurze Enter-Noten ohne Glide starten oktaviert, gleiten aber nicht.
