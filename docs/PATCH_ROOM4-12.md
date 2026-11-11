# ROOM4-12: Bounce und Freeze

Basis: ROOM4-11 (`index.html` 8 858 295 B), jetzt 8 863 263 B (+4 968 B, im lazy geladenen Raum-IV-Chunk). Zone: KALT (Rendern offline, nur auf Knopfdruck). Frozen Tracks sparen im Live-Pfad Stimmen und DSP.

- **Bounce to a new track** (Rechtsklick auf den Spurkopf): rendert alle hörbaren Clips der Spur (mit Warp, Pitch, Spur-EQ und Effekten) zu einem neuen Material (verlustfreies Float-WAV, bekanntes Tempo) und legt es direkt unter der Spur als neue Spur ab. Das Original bleibt unverändert und aktiv.
- **Freeze track**: wie Bounce, danach schläft das Original (keine Stimmen, keine Kette, im Export übergangen, blass dargestellt, Clips nicht anfassbar, Kopf „❄ frozen“). Die neue Spur übernimmt Lautstärke, Pan, Mute und Solo.
- **Unfreeze**: entfernt die gefrorene Spur (nach Rückfrage) und weckt das Original; Lautstärke und Pan der gefrorenen Spur bleiben. Wird die gefrorene Spur gelöscht, ist das Original automatisch wieder wach.
- Gerendert wird bei **neutraler Lautstärke und Pan**, ohne Master. Die neue Spur bringt ihre eigenen Regler mit, der Klang bleibt also gleich. Der Ausklang von Echo und Hall wird mitgerendert (die neue Spur ist entsprechend länger). Der Clip folgt dem Projekttempo (Tape/granular wie jeder tempogebundene Clip); die Grundlage ist das Tempo beim Rendern.
- **Nichts wird überschrieben, das Rendern verändert das Arrangement erst am Ende als ein Undo-Schritt.** Schlägt es fehl, bleibt alles unverändert und die Meldung nennt den Grund. Das neue Material bleibt in der Bibliothek (auch nach Undo; die Package Station zeigt es).
- Daten additiv: `track.frozenBy`, `track.bounceOf` (alte Projekte unverändert; ein Freeze ohne seine Bounce-Spur wird beim Laden verworfen).
- Technik: `mixdown(...)` bekam die Optionen `only` (eine Spur), `unity` (neutral) und `raw` (PCM statt Datei). Der normale Export ist unverändert (Hash `833a9776cceb945d`).

## Prüfung (`tools/probes/multitrack_freeze_probe.js`, echte App, am Export gemessen)
| Schritt | Ergebnis |
|---|---|
| Spur +1200 ct (Oktave) | 440 Hz, RMS 0,1087 |
| Freeze | 2 Spuren, Original `frozenBy`, Bounce 5,49 Beats; Export 440 Hz, RMS 0,1087 (Differenz 0 dB) |
| Live-Wiedergabe mit gefrorener Spur | läuft, keine Fehler |
| Unfreeze | 1 Spur, Export wie vor dem Freeze |
| Bounce (Original bleibt) | beide Spuren klingen: +6,02 dB |
Unit-Test: Daten additiv, Freeze ohne Bounce-Spur verworfen, gefrorene Spuren zählen nicht beim Export-Check. 99 Regressionstests grün.

## Grenzen
- Gerendert wird der Bereich vom ersten bis zum letzten hörbaren Clip (stumme Clips zählen nicht); Lücken davor entstehen nicht neu, sie beginnen am ersten Clip.
- Ändert man ein gefrorenes Arrangement (Tempo), folgt die gefrorene Spur dem Tempo, ist aber nicht neu gerendert. Zum Neurendern: Unfreeze, ändern, Freeze.
- Gefrorene Clips können nicht bearbeitet werden (erst Unfreeze).
- Das Rendern läuft auf dem Hauptthread der Seite (Web Audio offline); sehr lange Spuren (bis 30 Minuten erlaubt) brauchen entsprechend Zeit.
- Nicht abgehört (technisch gleich gemessen). Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Rollback: Commit `abe3d37` (ROOM4-11).
