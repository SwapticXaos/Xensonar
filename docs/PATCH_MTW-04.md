# MTW-04: Clips nach Lautheit angleichen, Eingangspegel bei der Aufnahme (Raum IV)

Basis: MTW-02 (`8a9a809`), `index.html` 8 108 009 B. Zusammen mit MTW-03 jetzt 8 118 564 B (**+10 555 B**: ca. 6,9 KB im Wave-Editor-Modul und 0,2 KB Brücke im Hauptbündel für MTW-03, ca. 3,4 KB im lazy geladenen Raum-IV-Chunk für MTW-04).
Zone: WARM (Menübefehl, Raum-IV-Oberfläche) bzw. nur während der Aufnahme ein Abgriff am Eingang (außerhalb des Signalwegs, gelesen in der vorhandenen rAF-Schleife).
Daten-Owner: Raum-IV-Projekt, nur das vorhandene Feld `clip.gain`. Kein neues Feld.

## Match loudness
- **Mehrere Clips wählen → „Match loudness“** (Gruppenleiste, auch im Rechtsklick-Menü) bzw. Rechtsklick auf einen Clip → „Match loudness (clip gain to −18 LUFS)“.
- Die Quelle jedes Clips (sein Material-Ausschnitt) wird mit dem gemeinsamen Messkern aus MTW-01 gemessen (ITU-R BS.1770, wie der Mixdown), und der **Clip-Gain** bringt sie auf **−18 LUFS** (Arbeitspegel mit Reserve). Es wird nichts gerendert und nichts überschrieben; ein Undo-Schritt für alle.
- Der Clip-Gain reicht bis 2,0 (+6 dB). Wo das nicht genügt, bleibt der Clip an der Grenze und die Statuszeile zählt diese Clips („raise the track fader for more“). Stille oder noch ladende Clips werden übersprungen und genannt.
- Unterschied zu „Normalize gain (peak to −1 dB)“ (bleibt): Peak-Normalisierung gleicht Spitzen an, nicht die empfundene Lautstärke.

## Eingangspegel während der Aufnahme
- Solange „● Rec“ läuft, steht neben dem Knopf eine **Pegelanzeige des Eingangs** (−60 bis +6 dBFS, 0-dB-Marke). Hat der Eingang einmal übersteuert, wird der Rahmen rot und bleibt es bis zum Ende der Aufnahme.
- Bisher erfuhr man erst nach dem Stopp, dass der Eingang still war oder übersteuerte.

## Prüfung (`tests/e2e/mtw04_level_and_input.cjs`, echte App, Chromium mit Test-Mikrofon)
- Drei Clips (1-kHz-Sinus bei −10 / −22 / −40 dBFS, das sind −10 / −22 / −40 LUFS): Gains 0,398 / 1,584 / 2,000 (erwartet 0,398 / 1,585 / Grenze); Statuszeile nennt „3 clips … · 1 at the +6 dB limit“; ein Undo setzt alle drei zurück; derselbe Befehl aus dem Clip-Menü.
- Ohne Aufnahme gibt es kein Eingangs-Element (kalt); mit Aufnahme bewegt sich die Anzeige (Spitze 91 %), nach dem Stopp ist sie weg und die Aufnahme liegt auf „Rec 1“.

## Grenzen
- Gemessen wird das Material in seiner gespeicherten Form, **vor** Warp, Pitch, Fades, Spur-EQ und Effekten. Stark bearbeitete Clips können danach leicht abweichen.
- −18 LUFS ist fest (kein Feld). Kurze Schläge (unter 0,4 s) werden ohne Tor gemessen.
- Die Eingangsanzeige gibt es nur während der Aufnahme; ein Scharfschalten mit Anzeige **vor** der Aufnahme, Mithören, Punch-in/out und Takes fehlen weiter (ROOM4-14).
- Nicht mit echtem Mikrofon/Interface geprüft, nicht gehört.

Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless, Test-Mikrofon). Nicht: Gerät, Abhören, USER_ACCEPTED. Rollback: Commit `8a9a809` (MTW-02).
