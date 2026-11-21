# ML-MARK-02 · Melodic Loop: Markiertes strecken und stauchen

- Sechs Tasten in EINER Zeile unter Mark, zusammen genau so breit wie Mark..Paste (gemessen): die beiden Spiegel nebeneinander (⇆ ⇅), dann Strecken/Stauchen in der Zeit, dann in der Tonhöhe; Strecken/Stauchen als Pfeile nach außen/innen. Ausgegraut ohne Markierung; „+ Drums“ ist „+“ mit Trommelsymbol.
- Pfeiltasten: solange etwas markiert ist (oder eine Figur in Paste liegt), strecken/stauchen sie wie der Stempel der Spectral Forge: rechts/links = Zeit, hoch/runter = Tonhöhe. In Eingabefeldern und mit Strg/Alt/Umschalt greifen sie nicht.
- Zeit: Faktor 1,1 je Schritt um den Anfang der Markierung, Längen und Fades skalieren mit; verweigert, wenn die Noten aus dem Loop ragen würden oder die kürzeste Note unter die Mindestlänge fiele (Statuszeile sagt es).
- Tonhöhe: Tonlinien sind ganze Schritte; je Druck wird der Abstand um etwa ein Zehntel, mindestens eine Linie **je Seite**, größer/kleiner, gleichmäßig um die **Mitte** der Markierung (Fehler vorher: um die oberste Linie, dort bewegte sich nichts, nur der untere Teil; Test war rot auf dem alten Stand: 6–14 → 6–15). Verweigert am Rand oder wenn alles auf einer Linie liegt.
- Ein Undo-Schritt je Druck; Materialimport-Körper bleibt unberührt (wie bei Spiegeln/Kopieren). Mit geladener Figur in Paste wirkt dasselbe auf die Figur.
- Zone: WARM (nur Oberfläche, eine `mutateLoopComposer`-Änderung je Druck).
- Test: `tests/e2e/melodic_mark_scale.cjs` (neu); `melodic_erase`, `melodic_noteclip` grün. Hilfsfunktion `inspectMarked` + `globalThis.__xenMlNoteClip` (nur lesen).
