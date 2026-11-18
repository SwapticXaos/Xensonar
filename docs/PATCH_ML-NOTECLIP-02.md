# ML-NOTECLIP-02 · Copy/Paste im Melodic Loop auch während der Wiedergabe

**Zone:** WARM (Eingabe im Melodic-Loop-Raster), kein Audio-Pfad geändert.
**Datei / Owner:** `src/rooms/canonical.js`, Mousedown-Handler des Loop-Rasters; Daten-Owner der Zwischenablage bleibt `__mlNoteClip`.

## Ursache
Im Mousedown-Handler stand die Regel „Klick ins leere Raster während der Wiedergabe = Playhead setzen“ **vor** Copy/Paste und beendete den Klick.
Lief der Melodic Loop (■ im Transport-Dock), bekam der Copy-Modus das Rechteck nie: kein Laden, kein Umschalten auf Paste, keine Vorschau. Der Paste-Klick ins Raster wurde ebenso verschluckt.
Ist der Loop gestoppt, funktioniert alles, deshalb fiel es nur zeitweise auf.
Beide Regeln kamen in derselben Übernahme (`888d3f7`, 12.11.) in den Quellbaum; die Kollision bestand seither. Kein Commit vom 17./18.11. hat diesen Code berührt (`canonical.js` zuletzt am 16.11. geändert).
Gemessen mit demselben Ablauf: der Stand 5242ef9 (17.11.) und der Stand vor dem Patch verhalten sich gleich: gestoppt grün, laufend rot.

## Änderung
Die Playhead-Regel greift nur, wenn Copy und Paste aus sind (`__mlNoteClip.mode()==="off"`). Ist der Modus an, gehört der Klick ihm, unabhängig vom Wiedergabezustand. Sind beide aus, verhält sich der Klick während der Wiedergabe wie bisher.
Eine Zeile, +32 Bytes Quelle.

## Tests
- Neu: `tests/e2e/melodic_noteclip_playing.cjs`. Ablauf: Power, Forge, Melodic Loop, ▶. Dann Copy, Rechteck ziehen, Paste schaltet von selbst auf, Ablegen ist ein Undo-Schritt, die Wiedergabe läuft weiter. Paste lässt sich wieder an- und abschalten. Negativtest: mit Copy/Paste aus setzt ein Klick in das leere Raster während der Wiedergabe keine Note.
  Ergebnis: rot auf dem Stand vor dem Patch, grün danach.
- Bestehend: `tests/e2e/melodic_noteclip.cjs` grün (Probe-Build und `index.html`).

Rollback: den Commit vor diesem Patch nehmen (siehe `git log`).

## Nachtrag: Noten des Pink Track (Spectral Forge → Scattered/Fretless → Melodic Loop)
**Nutzerbefund 18.11.:** Eine in der Spectral Forge gemalte Melodie, per Scattered auf den Pink Track projiziert, ließ sich nicht kopieren: Rechteck → nichts geladen, Paste gesperrt.
**Ursache:** `__mlNoteClip.capture` übersprang alle Carrier- und Material-Noten (`ps`). Die Pink-Track-Noten fielen darunter, obwohl das Einzelkopieren per Klick sie schon erlaubt. Die Lücke bestand seit ML-NOTECLIP-01; bisher gab es keinen Test mit Pink-Track-Noten.
**Änderung:** Übersprungen wird nur noch der Material-Importkörper (`fs`: material-base/-fragment, Owner des Slicing). Pink-Track-Noten werden kopiert und als normal platzierte Noten eingefügt: neue ID, ohne `pendingPitchAnchor`/`pendingGroup`, Spur bleibt der Pink Track. Liegen nur Importnoten im Rechteck, nennt die Statuszeile den Grund.
**Test:** `tests/ml_noteclip_pink_02.test.cjs` läuft gegen die echte Zwischenablage aus dem Build: rot auf dem Parent, grün danach. Der Ablauf über das Malen in der Spectral Forge selbst ist nicht automatisiert (BROWSER_CHECKED nur für normale Noten).
