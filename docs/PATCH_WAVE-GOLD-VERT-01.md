# WAVE-GOLD-VERT-01 · Wave Editor: goldene Maske vertikal ziehen wählt die Zielspur

Parent: `META-COPY-RFL-01` (One-Shots-Nachtrag). Rollback: der Commit davor.
Zone: KALT/WARM (Wave Editor, Zeigergeste im geöffneten Editor). Kein Audio-Graph.
Status: CODE_PRESENT, BROWSER_CHECKED (2 neue Tests). Nicht gehört.

Vorher: Eine goldene Maske (Golden Move & Mix, Doppelklick auf den oberen Rand) auf nur L oder R ließ sich nur waagerecht ziehen; Quelle und Ziel blieben dieselbe Spur.
Jetzt: Beim Ziehen entscheidet die senkrechte Lage der Maske über die **Zielspur(en)**, nach derselben Logik wie beim Aufziehen einer Maske: Mitte der Maske oberhalb 3/8 der Höhe = L, zwischen 3/8 und 5/8 = L+R, darunter = R (von R aus entsprechend nach oben). Start auf L: ein Viertel der Höhe nach unten = beide Spuren, weiter nach unten = nur R. Die Maske wächst/wandert dabei sichtbar mit, der goldene Schatten zeigt das Quellmaterial in jeder Zielspur.
Beim Loslassen: Die Quellspur wird geleert (wie bisher), das Material in die Zielspur(en) gemischt. Eine Quelle auf beide Zielspuren heißt: das L-Material landet in L und R; R behält sein eigenes Material. Danach steht der Kanal auf dem Ziel. Auch Verschieben nur senkrecht (gleiche Zeit, andere Spur) ist gültig. Undo bleibt ein Schritt.
Eine Maske auf L+R verhält sich wie bisher (stereo zusammen, kein Umschalten).
Kern: `edit({type:'moveMix', channels, targetChannels})`; ohne `targetChannels` bit-identisch zum alten Verhalten (Test).
Tests: `tests/e2e/wave_golden_vertical.cjs` (Kern, Undo), `tests/e2e/wave_golden_vertical_drag.cjs` (echter Mausdrag).
