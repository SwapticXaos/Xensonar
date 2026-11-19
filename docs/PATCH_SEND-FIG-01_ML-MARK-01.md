# SEND-FIG-01 + ML-MARK-01 (19.11.2026)

Zweig `claude/stoic-knuth-a6nx6f`, Parent `f5b51b4`. Zone: WARM (Forge-Sendeweg, Melodic-Loop-Oberfläche), kein Audiopfad.
Daten-Owner: Sendeplan `__xenForgePinkPlan` (07_composition_and_preview_ui.js); Markieren/Clipboard `__mlNoteClip` (rooms/canonical.js).

## SEND-FIG-01: Rasterprojektion hängt nicht an der Hörweise
- Vorher: Fretless Field (und beim Senden auch Scattered/Monotone) war an die gewählte Hörweise gekoppelt. Fretless war nur wählbar, wenn die Maschine einen Fretless-Timbre lieferte (Bert, Antonia, Cecilia, nicht Gahjer, Pure Dieter, Emilia). Jeder Pink-Send renderte außerdem die aktuelle Hörweise als Raw Audio.
- Jetzt: Scattered, Fretless Field und Monotone brauchen nur die gemalte Carrier-Figur. `__xenSfmlDirectAvailability` fragt die Hörweise nicht mehr; `__xenSfmlFieldChoice` liefert den Timbre der aktuellen Maschine nur noch als optionale Beigabe (sonst `null`, das Instrument der Spur spielt, wie bei Scattered). Der Sendeweg (`figureOnly`) bereitet die Hörweise nicht vor, rendert sie nicht und prüft nicht „Listening mode changed“. Das Material trägt den stillen Platzhalter (`rawAudioUnavailable`, Hinweis „Carrier figure only“, bekannter Weg).
- Nur Raw Audio (`grained`) hängt weiter an der Hörweise, weil dort wirklich Audio gesendet wird.
- Test: `tests/e2e/send_figure_no_hearing.cjs` (auf dem Parent rot: Fretless Field mit Hörweise `null` nicht verfügbar; jetzt grün für alle 7 Hörweisen plus echter Send mit Gahjer).

## ML-MARK-01: Markieren als Überkategorie im Melodic Loop (+ ML-ERASE-01)
- Neue Leiste: `▭ Mark | ⧉ Copy | ⌫ Erase | ⎘ Paste | ⇆ | ⇅`.
- **Mark**: Rechteck ziehen, die Noten darin sind markiert (Zähler am Knopf, sichtbar über die vorhandene Auswahl). Danach wirken **Copy** (lädt ins Clipboard, wechselt zu Paste), **Erase** (löscht, ein Undo-Schritt) und **⇆ / ⇅** (spiegelt die markierten Noten direkt an Ort und Stelle: horizontal in der Zeit um die Mitte der Markierung, Fades getauscht; vertikal die Tonhöhenfolge innerhalb der Markierung, ein Undo-Schritt) auf das Markierte.
- Ohne Markierung bleiben Copy und Erase wie zuvor: Knopf drücken, Rechteck ziehen, beim Loslassen wirken sie sofort (gleiche Rechteck-Funktion, nicht doppelt gebaut).
- ⇆/⇅ spiegeln den Stempel, solange er in Paste geladen ist; sonst die Markierung.
- Abbrechen: **Rechtsklick** aufs Raster beendet Mark, Copy und Erase (Esc geht weiter, steht aber nicht mehr in den Hinweisen). In Paste leert der Rechtsklick wie bisher das Clipboard.
- Eine bewusste Markierung entsteht nur durch Mark. Ein einfach angeklickter Einzelton macht Copy/Erase nicht zum Aktionsknopf; ändert sich die Auswahl, verfällt die Markierung.
- Das Material-Importgerüst (Slicing-Owner) wird wie beim Copy nie kopiert, gelöscht oder gespiegelt.
- Grenze (wie beim Stempel-Spiegel): Beim horizontalen Spiegeln wird der Tonhöhenverlauf innerhalb eines Scattered-/Fretless-Blocks nicht mitgedreht, nur Lage und Fades der Blöcke.
- Tests: `tests/ml_erase_01.test.cjs` (9 Fälle), `tests/e2e/melodic_erase.cjs`; `melodic_noteclip` und `melodic_noteclip_playing` unverändert grün.

## Nachtrag: Wackeln beim Markieren (gleicher Tag)
- Ursache: Beim Ziehen des Rechtecks lief bei jeder Mausbewegung `refreshSelectionFromBox`, das auch den ausgewählten Ton und die Spur des Composers umschreibt. Panels und Spurkarten renderten ständig um, die Seitenhöhe wechselte (gemessen 2270 ↔ 2286 px) und die ganze Seite sprang auf und ab. Für Mark/Copy/Erase folgt beim Ziehen jetzt nur noch die Hervorhebung (`__mlNoteClip.liveMark`, setzt nur `selectedLoopNoteIds`, ohne Ton/Spur zu ändern); Seitenhöhe danach konstant.
- Zähler an Mark und Paste sind jetzt Abzeichen ohne Platzbedarf (vorher wuchs der Knopf von 54 auf 80 px und schob die Leiste).
- Test: `melodic_erase` prüft Knopfgeometrie und konstante Seitenhöhe beim Ziehen (Weg mit wechselnder erster Notentreffer). Nicht in Firefox gemessen.
- Bekannt: Das Rechteck selbst rendert weiterhin bei jeder Bewegung die Spurkarten neu (viele DOM-Änderungen, aber ohne Höhenänderung); das war schon beim Ctrl-Rechteck so.

## Größe
`index.html` 8 313 214 B → 8 319 014 B (+5 800 B). Rollback: `git revert` dieses Commits (Parent `f5b51b4`).
Nicht gehört (Klang, Fretless-Wiedergabe ohne Maschinen-Timbre).
