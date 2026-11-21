# ML-MARK-02 · Melodic Loop: Markiertes strecken und stauchen

- Vier neue Tasten (`↔+` `↔−` `↕+` `↕−`) stehen mit den zwei Spiegeltasten in einer zweiten Zeile, bündig unter Mark (gemessen), größer und höher als die erste Zeile; „+ Drums“ ist „+“ mit Trommelsymbol, Mark hat mehr Abstand zu Play/Drums. Ausgegraut ohne Markierung.
- Pfeiltasten: solange etwas markiert ist (oder eine Figur in Paste liegt), strecken/stauchen sie wie der Stempel der Spectral Forge: rechts/links = Zeit, hoch/runter = Tonhöhe. In Eingabefeldern und mit Strg/Alt/Umschalt greifen sie nicht.
- Zeit: Faktor 1,1 je Schritt um den Anfang der Markierung, Längen und Fades skalieren mit; verweigert, wenn die Noten aus dem Loop ragen würden oder die kürzeste Note unter die Mindestlänge fiele (Statuszeile sagt es).
- Tonhöhe: Tonlinien sind ganze Schritte, also je Druck etwa ein Zehntel mehr/weniger Abstand, mindestens eine Linie, um die tiefste markierte Linie; verweigert am Rand oder wenn alles auf einer Linie liegt.
- Ein Undo-Schritt je Druck; Materialimport-Körper bleibt unberührt (wie bei Spiegeln/Kopieren). Mit geladener Figur in Paste wirkt dasselbe auf die Figur.
- Zone: WARM (nur Oberfläche, eine `mutateLoopComposer`-Änderung je Druck).
- Test: `tests/e2e/melodic_mark_scale.cjs` (neu); `melodic_erase`, `melodic_noteclip` grün. Hilfsfunktion `inspectMarked` + `globalThis.__xenMlNoteClip` (nur lesen).
