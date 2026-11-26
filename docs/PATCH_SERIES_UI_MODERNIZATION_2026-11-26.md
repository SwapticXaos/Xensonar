# UI-Modernisierung (Gemini-Patchreihe) auf `claude/charming-franklin-wouegz` übernommen · 26.11.2026

Quelle: `xensonar-ui-patches-2026-11-26.md` (fünf isolierte Patches, Basis `claude/stoic-knuth-a6nx6f` 5ee1c4b + ARCH-WING-01 = 8364c22). Nicht übernommen: `server.js`, `package.json` (lokale Vorschau). Audio / DSP unberührt. Jeder Patch ein eigener Commit.

| Patch | Commit | Stand |
|---|---|---|
| UI-TITLE-ART-01 | 15af606 | übernommen wie beschrieben |
| UI-SOUND-DESIGN-HDR-01 | 146149f | übernommen wie beschrieben |
| UI-PSYLAB-MODAL-01 | 39c2b4d | übernommen, zwei Namen ergänzt (siehe unten) |
| UI-EMBLEM-STARS-01 | 7350a09 | sinngemäß übertragen (siehe unten) |
| UI-LIVE-CONSOLE-BURL-01 | 3d59860 | übernommen wie beschrieben |

## Abweichungen von der Vorlage (bewusst, mit Begründung)
1. **UI-EMBLEM-STARS-01 ersetzte Blöcke, die es auf der angegebenen Basis nicht gab.** Das Bündel spricht von `header.xpl-head` / `.xpl-brand` (Psy Lab) und `header.xmt-head` / `.xmt-brand` (Multitrack) „ersetzen“. Auf 8364c22 und bei uns besteht die Kopfzeile nur aus `h2` plus Untertitel. Übertragen wurde der Sinn: Eyebrow, Titelzeile mit Emblem (kreisförmiges Symbol + 8 XenSonar-Dreiecke, `viewBox 0 0 64 64`, Farben #f0abfc / #fde68a) auf Titelhöhe, Vektor-Titel, Untertitel, in einem `header` mit der Akzentlinie. SVG-Blöcke und CSS stammen wörtlich aus dem Bündel; weggelassen sind nur die Regeln für Elemente, die es nicht gibt (`.xpl-head-meta`, `.xmt-head-side`, `.xmt-head-meta`, `.xmt-head-controls`). Die Untertitel-Texte sind unsere (ausführlicher als Geminis gekürzte Fassung). Multitrack-Titel: „Multitrack“ als Vektor-Titel statt „V · MULTITRACK“, Eyebrow „Room V · Arrangement“.
2. **UI-PSYLAB-MODAL-01 nutzt `activeGridLabel` und `activeBaseHz`, die im Bündel nicht definiert sind** (auch nicht auf der Basis). Ergänzt aus den Raster-Parametern: Name des Tunings (`ti(j0, gridTuning)`) und Basis-Hz (auf zwei Stellen). Das Dialog-Feld „Link current grid tuning as suggestion“ zeigt z. B. „31 EDO · 440 Hz“. `openParamDialog` steht neben dem Dialog-Zustand (Hook-Reihenfolge), nicht bei den Handlern.
3. **Sound Design (Patch 2):** Die vier Regeln ersetzen die bisherigen vier (Grid mit Titel und Untertitel nebeneinander); Art Installation bleibt unberührt.
4. **Art Installation:** Dort gilt weiter unser Titel „Hologram Ignition“ (HOLO-TITLE-01). `nodal.js`: nur `sounddesign` bekommt den Vektor-Titel.
5. **Einbindung:** Eigene Abschnitte im Manifest (`js-013b-xen-room-title-art`, `css-042b-xen-live-console-wood`) mit Eintrag im Template an den beschriebenen Stellen.

## Prüfung
- Neu: `tests/e2e/psylab_modal.cjs` (kein natives Popup; exakter Wert inkl. Komma und Fehlermeldung; Speichern; Überschreiben-Hinweis; Hintergrund / Escape; Löschen).
- `build.py --check` OK, `run_tests.sh` 150 grün; rot bleiben die sechs Altfehler.
- Browser-Regression der berührten Räume siehe Commit-Nachricht des Abschlusses.
