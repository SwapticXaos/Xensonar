# ROOM4-09: Spur-Effekte, Clip rückwärts, Normalisieren

Basis: ROOM4-08 (`index.html` 8 831 155 B), jetzt 8 840 412 B (+9 257 B, alles im lazy geladenen Raum-IV-Chunk).
Zone: WARM (Raum-IV-Oberfläche, Regler → geglättete AudioParams) und KALT (Export). Der Hauptraum ist unberührt.

## Effekte pro Spur
Gewählte Spur → Leiste „FX · Spurname“: **Low cut**, **High cut** (logarithmisch, am Anschlag aus), **Drive** (weiche Sättigung mit Pegelausgleich), **Echo** (Zeit in Beats, frei eingebbar: 0,5 Achtel, 0,75 punktierte Achtel, 0,333 Triole; folgt dem Projekttempo; Feedback, Mix), **Reverb** (Send in einen gemeinsamen Raum, Raumlänge `Room s` fürs ganze Projekt), **FX off**.

- Kette nach Lautstärke, Pan und Spur-EQ: Low cut → High cut → Drive → Master; Echo und Hall-Send zweigen danach ab. Nur native Web-Audio-Knoten.
- **Ein Builder für Wiedergabe und Export** (`buildTrackFx`): Was man hört, wird exportiert. Der Hall-Impuls ist deterministisch (fester Zufallskeim), also in jedem Export gleich.
- **Spur ohne Effekte bekommt keinen einzigen Zusatzknoten.** Der Signalweg und das exportierte PCM sind dann exakt wie vorher (Probe: Export byte-identisch, Standard-Hash `833a9776cceb945d` unverändert).
- Reglerbewegungen laufen geglättet auf die AudioParams. Kommt ein Effekt neu dazu oder fällt weg, wird nur die Kette dieser Spur neu gebaut (kurze Überblendung).
- Export hängt bei Echo/Hall einen Ausklang an (höchstens 12 s); ohne Effekte bleibt die Länge wie bisher.
- Daten additiv: `track.fx` nur, wenn etwas aktiv ist; `master.reverbSize`. Alte Projekte laden unverändert.

## Clip
- **Reverse** (Rechtsklick): nicht destruktiv über dieselbe Fassungs-Verwaltung wie der Warp; Wellenform wird gespiegelt, Marke `◀`. „Reset“ und „Play forwards again“ stellen das Original her.
- **Normalize gain (peak to −1 dB)**: setzt nur den Clip-Gain (Grenze 2,0, wird gemeldet).

## Prüfung (`tools/probes/multitrack_fx_probe.js`, echte App, am exportierten Mixdown gemessen)
| Schritt | Ergebnis |
|---|---|
| Low cut 2 kHz auf 220-Hz-Ton | −38,4 dB |
| FX off | Export byte-identisch zum Stand ohne Effekte |
| Echo 1 Beat, Feedback 50 % | Signal nach Clip-Ende, Datei 9,6 s statt 4,05 s |
| Reverb 60 % | Ausklang nach Clip-Ende, Datei 6,25 s |
| Live mit Hall, Drive während der Wiedergabe zugeschaltet | Pegel vorhanden, keine Fehler |
| Reverse (ausklingender Ton) | blendet jetzt ein; „forwards“ wieder byte-identisch |
| Normalize | Gain 2 (Grenze erreicht, Quelle war leise) |
Unit-Test: Effektdaten additiv, Ausklang begrenzt, Hall-Impuls deterministisch, Drive-Kurve. 99 Regressionstests grün.

## Grenzen
- Nicht abgehört: Klang von Drive, Echo-Färbung (Rückweg mit 140 Hz / 4,8 kHz begrenzt) und Hall. Die Werte sind erste, vorsichtige Voreinstellungen.
- Tempowechsel und Wechsel der Effektauswahl schneiden laufende Echo-/Hallfahnen ab (Neuaufbau).
- Jede Reglerbewegung ist ein Undo-Schritt (wie schon bei Lautstärke und Pan).
- Effekte gelten pro Spur, nicht pro Clip; keine Automation. Der WAV-Editor-Roundtrip backt Spur-Effekte bewusst nicht ein.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Nicht: Abhören, Gerät, Firefox/Safari, USER_ACCEPTED.
Rollback: Commit `aecf472` (ROOM4-08).
