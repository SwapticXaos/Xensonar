# ROOM4-01: Raum IV · Multitrack, erste nutzbare Fassung

Grundlagen: `docs/MEHRSPURRAUM_BESTANDSAUFNAHME_2026-11-09.md`, `docs/MEHRSPURRAUM_SPURKETTE_STUDIE_2026-11-09.md`, MATERIAL-LANE-01 (R1–R3), LIVEZONE-01/02.

| | |
|---|---|
| Basis | PITCH-HQ-01 (USER_ACCEPTED), `index.html` 8 576 290 Bytes, SHA-256 `5285bcdeda8353f704a0bb2b6bbe1b16ac89d3fa16c8962f13d5003bf0d7fd65` |
| Ergebnis | `index.html` 8 606 167 Bytes, SHA-256 `30223a128553e594649945d4e217ca8d428ab16d68bdc641e04f9af597e371ea` |
| Größenzuwachs | **+29,9 KB**. Davon 28,4 KB im neuen **inerten** Raum-Chunk (`application/x-xensonar-room`, wird erst beim ersten Öffnen ausgewertet), der Rest ist Verdrahtung. Startpfad unverändert (Chunk beim Start nachweislich nicht ausgewertet). |
| Zone | **KALT**, solange der Raum zu ist (keine Timer, Listener oder Knoten). Beim Abspielen **HEISS · Steuerung**: Planungs-Tick alle 250 ms mit 2 s Vorlauf, eine `AudioBufferSource` pro Clip, Mixer-Bewegungen nur als geglättete AudioParam-Schreibvorgänge. Laufmarke per rAF nur während der Wiedergabe, ohne React-Rendern pro Frame. |
| Daten-Owner | **Neu:** IndexedDB `xensonar-multitrack-v1` / Store `projects` / Schlüssel `current` (Format `xensonar.multitrack` v1). Clips verweisen per ID auf Einträge der Materialbibliothek (`bs()`), es werden keine Audiodaten kopiert. **Gelesen:** Materialbibliothek, `__materialAudioBlob`. **Mitgenutzt:** `__xenMaterialLaneChain` (R1), `__XenEQ` (Schlüssel `arrangement:<trackId>`), Live-Master-Eingang `main`, `ensureAudioReady`. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium, echtes Layout). Nicht: Abhören, Gerätetest, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Raumkennung und Nummerierung

- Interne Kennung **`MULTITRACK`**, Chunk `multitrack`. Die Beschriftung „IV“ ist reine Anzeige.
- Kollisionsfrei mit vorhandenen Kennungen (`RESONANCE`, `L3LAB`, `TOPOLOGY`, `XENPOLAR`, `GAME`, `COMMONS`, `MAIN` …).
- **Full-Modus:** Der optionale Spiele-Raum (`GAME`/`XENPOLAR`) gehört nicht zu diesem Build. Wird er später wieder eingebunden, erscheint er als **V**. Da Kennung und Ziffer getrennt sind, gibt es keine doppelte „4“.

## Funktionsumfang

- Knopf **IV MULTITRACK** in der Kopfzeile. Der Raum gilt als kalt für den Live-Bereich: Live Room und Myzel schlafen über LIVEZONE, die Rückfrage bei laufender Aufnahme gilt auch hier. Er nutzt aber den Live-Kontext (R3: kein Anhalten).
- **Projekt:** Name, Tempo (20–400 BPM, Vorgabe aus dem Live Room), **Schläge pro Takt frei** (0,5–64, z. B. 5, 7, 3,5), **Raster 1/N Schlag mit freiem N** (1–64, also auch 3, 5, 7), Einrasten an/aus, Zoom.
- **Spuren:** hinzufügen/entfernen (Rückfrage, Material bleibt unberührt), Name, Mute, Solo, Lautstärke, Pan (wirken während der Wiedergabe sofort aufs Audio). Jede Spur hat einen eigenen EQ-Schlüssel.
- **Clips:** Material aus der Bibliothek an der Cursorposition auf die gewählte Spur legen. Verschieben per Maus (rastet ein) oder Tastatur (Pfeile: ein Rasterschritt, Shift: ein Takt). Wiederholungen (+/−), Gain, Entfernen (Entf). Länge = Takte × Schläge pro Takt des Materials. Weicht das Materialtempo ab, wird es per Bandgeschwindigkeit eingepasst (wie im Live Room) und im Clip-Inspektor angezeigt („Tape ×…“). Fehlt das Material, wird der Clip rot markiert und bleibt still.
- **Transport:** Play/Stop (Leertaste), Cursor per Klick ins Lineal, Start auch mitten in Clips (richtiger Versatz), 5/8 ms Ein-/Ausblendung gegen Klicks.
- **Undo/Redo** (Strg+Z / Strg+Umschalt+Z, 80 Schritte), automatisches Speichern 600 ms nach der letzten Änderung und beim Verlassen.
- **Ohne Maus bedienbar:** Listenansicht mit Zahlenfeldern, Zeitleiste als `listbox` mit beschreibenden Labels, Ansagen über `aria-live`, Tastenkürzel auch nachdem der Fokus beim Löschen verloren ging.

## Quelländerungen

- **Neu:** `src/post-oct/032-xen-room-multitrack.js` (Chunk), Manifest-Abschnitt `js-020b-xen-room-multitrack`, Platzhalter im Template, Statuseintrag.
- `src/startup/00_room_and_function_dispatch.js`: Lader kennt `multitrack`.
- `src/forge/editor/07_view_lifecycle.js`: `MULTITRACK` ist kalt und nutzt den Live-Kontext; Brücke `__xenMultitrackBridge`.
- `src/app/forge/01_room_shell.js`: Brücke setzen (`ensureAudioReady`, Master-Eingang `main`, Live-Tempo).
- `src/runtime/instrument/05_timing_and_admission.js`: Knopf IV. `src/rhythm/02_bass_and_rack.js`: `onOpenMultitrack`. `src/myzel/01_effect_mapping.js`: Verteiler (`P.lazy`).
- Blöcke: 33 Scripts (+1 inerter Raum-Chunk), 77 Styles. Das CSS des Raums wird erst beim Öffnen als `<style id="xen-multitrack-style">` eingesetzt.

## Prüfungen (`node tools/probes/multitrack_probe.js`)

| Schritt | Ergebnis |
|---|---|
| Start | Chunk **nicht** ausgewertet, keine Fehler |
| Raum öffnen | Chunk geladen, Material aus der Forge (Test-WAV) in der Auswahl |
| Clips auf zwei Spuren (Takt 1 und Takt 3) | korrekt platziert (Breite = Länge × Zoom) |
| Live-Kontext in Raum IV | `running` (nicht angehalten) |
| Abspielen | Pegel 0,27, Laufmarke läuft. **Stop:** 0 |
| Tastatur | → verschiebt um 1/4 Schlag (7 px bei Zoom 28). Entf löscht. Strg+Z stellt wieder her (Ansage „Undo“) |
| Neuladen | Projekt mit 2 Clips (inkl. Undo-Stand) erhalten |
| Raum verlassen während der Wiedergabe | Pegel 0,43 → 0 |
| Seitenfehler | keine |
| `livezone_probe.js` | alle 13 Schritte unverändert |

## Offene Punkte / nächste Schritte

- **Abhören** (Übergänge, Pegel, Mixer während der Wiedergabe).
- Während der Wiedergabe verschobene Clips oder neu angelegte Spuren wirken erst beim nächsten Start; Tempoänderungen ebenso.
- Kein eigener Master-Eingang „arrangement“: Raum IV läuft über den Eingang `main` des Live-Masters (Live Mastering, Rec und Loop-Rec greifen).
- Löschschutz: Der Referenzgraph der Package Station kennt Arrangements noch nicht (Adapter folgt). Wird Material gelöscht, bleibt der Clip als „missing“ sichtbar, es geht nichts kaputt.
- Folgt: Mixdown/WAV-Export (OfflineAudioContext), Wellenformen in Clips, Clip-Bearbeitung im Wave Editor, Freeze/Elastik, weitere Quellen (Loop-Rec-Takes, Long Master).

## Rückweg

PITCH-HQ-01 (`5285bcde…7fd65`). Im Quellbaum: den Commit dieses Patches zurücknehmen und `python3 tools/build.py` ausführen. Die IndexedDB `xensonar-multitrack-v1` stört ältere Builds nicht.
