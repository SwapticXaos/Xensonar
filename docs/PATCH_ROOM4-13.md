# ROOM4-13: Automation pro Spur

Basis: ROOM4-12 (`index.html` 8 863 263 B), jetzt 8 874 569 B (+11 306 B, im lazy geladenen Raum-IV-Chunk). Zone: WARM (Bearbeiten der Kurven), HEISS nur beim Abspielen: geplante lineare Rampen im bestehenden 200-ms-Takt, kein React und kein Speichern pro Takt.

## Bedienung
Spur wählen → Leiste „FX“ → `Automate` → Parameter: **Volume ×** (Multiplikator auf den Fader, 1 = unverändert), **Pan**, **Reverb send**, **Echo mix**, **Low cut Hz**, **High cut Hz**. Unter der Spur erscheint eine Kurvenspur: auf leere Fläche klicken setzt einen Punkt (rastet aufs Raster), Ziehen verschiebt, **Doppelklick oder Rechtsklick auf einen Punkt löscht ihn**, `Clear` entfernt die Kurve (der Regler regiert wieder), `Hide` blendet die Spur aus (die Kurve bleibt). Die Kopfzeile zeigt den Wert am Cursor. Im Parameter-Menü markiert ● vorhandene Kurven.
Vor dem ersten und nach dem letzten Punkt gilt der jeweilige Punktwert. Mit Kurve übernimmt sie den Regler (Volume: Fader mal Kurve, Mute/Solo wirken weiter).

## Technik
- Daten additiv: `track.auto = {param:[{b,v}]}` (Beats, höchstens 512 Punkte je Kurve, sortiert, Werte begrenzt); ohne Kurve kein Feld, kein zusätzlicher Knoten. Alte Projekte unverändert; Teil von Undo und Package-Station-Rubrik „Multitrack-Arrangement“.
- Eine Kurve erzwingt ihre Stufe (z. B. Low cut: der Filter existiert, der Reglerwert ist nur der Startwert); Echo-Mix wirkt nur bei Echo-Zeit größer 0.
- **Wiedergabe:** pro Planfenster exakte `linearRampToValueAtTime` (Filterfrequenzen in kurzen geometrischen Schritten, damit der Sweep logarithmisch klingt), Schleifendurchläufe beginnen wieder beim Kurvenwert, Änderungen beim Spielen planen ab der aktuellen Stelle neu. **Auf automatisierten Parametern wird nie `setTargetAtTime` verwendet** (Firefox-AudioParam-Regel: Automationsarten werden nicht gemischt); ein Neuaufbau der Spurkette passiert nur bei neuer Volumen-Kurve.
- **Export und Bounce** nutzen dieselben Kurven offline (`autoEvents`); ein Bounce backt Volumen- und Pan-Kurven ein.
- Gefrorene Spuren schlafen samt Kurven.

## Prüfung (`tools/probes/multitrack_automation_probe.js`, echte App, am Export gemessen)
| Schritt | Ergebnis |
|---|---|
| Volume-Kurve 1 → 0 über 5 Beats | Pegelfall −15,2 dB zwischen 0,5 s und 2,4 s (erwartet etwa −15,6) |
| Punkt hochziehen / Doppelklick löscht | Kurve ändert sich / Punktzahl sinkt |
| Live-Wiedergabe mit Kurve | läuft, keine Fehler |
| Clear | Export identisch zum Stand ohne Automation |
| Pan −1 → +1 | Start links 3,4× lauter als rechts, Ende rechts 4,5× lauter als links |
| Nach Neuladen der App | Export identisch |
Unit-Test: Datenbereinigung, Kurvenwerte (linear, geometrisch), Rampen, Live-Planer (kein Doppelplanen, kein Cancel im Fortlauf, Neustart pro Schleifendurchlauf). Neu: `tests/room_chunks_syntax.cjs` prüft die lazy geladenen Raum-Chunks auf Syntaxfehler (die bisherige Prüfung übersprang sie; dabei fiel eine Klammer auf). 100 Regressionstests grün; Standard-Export unverändert (`833a9776cceb945d`).

## Grenzen
- Nur Spurparameter, keine Clip-Automation und keine Automation von Drive, Echo-Zeit, Pitch, EQ oder Master.
- Pitch-Warp wird nicht automatisiert (granulares Vorrendern).
- Kein Aufzeichnen von Reglerbewegungen (Touch/Latch), nur Zeichnen. Kein Kurvenzoom; die Spur nutzt die Zeitachse und eine feste Höhe.
- Nicht abgehört: Weichheit der Rampen bei schnellen Kurven, Filter-Sweeps. Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Rollback: Commit `98ab844` (ROOM4-12).
