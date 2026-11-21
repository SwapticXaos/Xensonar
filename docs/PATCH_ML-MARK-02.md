# ML-MARK-02 · Melodic Loop: Markiertes strecken und stauchen

- Sechs Tasten als Block 3 × 2, genau so breit wie Mark..Paste und bündig unter Mark (gemessen): oben alles Horizontale (Spiegeln, Strecken ⟷, Stauchen ⟶⟵ in der Zeit), unten alles Vertikale (Spiegeln, Strecken, Stauchen in der Tonhöhe). Strecken/Stauchen als Pfeile nach außen/innen statt Plus/Minus. Der Rahmen wächst um die zweite Zeile mit (min-height). „+ Drums“ ist „+“ mit Trommelsymbol. Ausgegraut ohne Markierung.
- Pfeiltasten: solange etwas markiert ist (oder eine Figur in Paste liegt), strecken/stauchen sie wie der Stempel der Spectral Forge: rechts/links = Zeit, hoch/runter = Tonhöhe. In Eingabefeldern und mit Strg/Alt/Umschalt greifen sie nicht.
- Zeit: Faktor 1,1 je Schritt um den Anfang der Markierung, Längen und Fades skalieren mit; verweigert, wenn die Noten aus dem Loop ragen würden oder die kürzeste Note unter die Mindestlänge fiele (Statuszeile sagt es).
- Tonhöhe: Tonlinien sind ganze Schritte, also je Druck etwa ein Zehntel mehr/weniger Abstand, mindestens eine Linie, um die tiefste markierte Linie; verweigert am Rand oder wenn alles auf einer Linie liegt.
- Ein Undo-Schritt je Druck; Materialimport-Körper bleibt unberührt (wie bei Spiegeln/Kopieren). Mit geladener Figur in Paste wirkt dasselbe auf die Figur.
- Zone: WARM (nur Oberfläche, eine `mutateLoopComposer`-Änderung je Druck).
- Test: `tests/e2e/melodic_mark_scale.cjs` (neu); `melodic_erase`, `melodic_noteclip` grün. Hilfsfunktion `inspectMarked` + `globalThis.__xenMlNoteClip` (nur lesen).
