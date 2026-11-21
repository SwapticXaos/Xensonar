# ML-MARK-02 · Melodic Loop: Markiertes strecken und stauchen

- Sechs Tasten in EINER Zeile unter Mark, zusammen genau so breit wie Mark..Paste (gemessen): die beiden Spiegel nebeneinander (⇆ ⇅), dann Strecken/Stauchen in der Zeit, dann in der Tonhöhe; Strecken/Stauchen als Pfeile nach außen/innen. Ausgegraut ohne Markierung; „+ Drums“ ist „+“ mit Trommelsymbol.
- Pfeiltasten: solange etwas markiert ist (oder eine Figur in Paste liegt), strecken/stauchen sie wie der Stempel der Spectral Forge: rechts/links = Zeit, hoch/runter = Tonhöhe. In Eingabefeldern und mit Strg/Alt/Umschalt greifen sie nicht.
- Zeit: Faktor 1,1 je Schritt um den Anfang der Markierung, Längen und Fades skalieren mit; verweigert, wenn die Noten aus dem Loop ragen würden oder die kürzeste Note unter die Mindestlänge fiele (Statuszeile sagt es).
- Tonhöhe: Tonlinien sind ganze Schritte; je Druck wird der Abstand um etwa ein Zehntel, mindestens eine Linie **je Seite**, größer/kleiner, gleichmäßig um die **Mitte** der Markierung (Fehler vorher: um die oberste Linie, dort bewegte sich nichts, nur der untere Teil; Test war rot auf dem alten Stand: 6–14 → 6–15). Verweigert am Rand oder wenn alles auf einer Linie liegt.
- Ein Undo-Schritt je Druck; Materialimport-Körper bleibt unberührt (wie bei Spiegeln/Kopieren). Mit geladener Figur in Paste wirkt dasselbe auf die Figur.
- Zone: WARM (nur Oberfläche, eine `mutateLoopComposer`-Änderung je Druck).
- Test: `tests/e2e/melodic_mark_scale.cjs` (neu); `melodic_erase`, `melodic_noteclip` grün. Hilfsfunktion `inspectMarked` + `globalThis.__xenMlNoteClip` (nur lesen).

## ML-MARK-03: Markiertes greifen und gemeinsam verschieben
- Drückt man (Mark-Modus oder aus) auf eine **markierte** Note, werden alle markierten Noten gemeinsam in Zeit und Tonhöhe verschoben (Raster-Einrasten der gegriffenen Note, Begrenzung am Loop-Anfang/-Ende und an den Tonlinien, Vorhören beim Linienwechsel). Ein Druck neben markierte Noten startet wie bisher ein neues Rechteck; Shift/Alt/Strg/Meta bleiben unbelegt.
- Ein Verschieben = ein Undo-Schritt (der erste Mauszug schreibt den Undo-Stand, die folgenden nicht). Die Markierung bleibt bestehen. Materialimport-Körper werden nicht bewegt.
- Zone: WARM (`__mlNoteClip.grab/dragMove`, Anbindung an die vorhandene Maus-Verteilung der Melodic-Loop-Fläche, kein neuer Speicher).
- Test: `tests/e2e/melodic_mark_move.cjs` (gleicher Zeitversatz, gleicher Linienversatz, Längen gleich, Markierung bleibt, zwei Züge = zwei Undo-Schritte).
