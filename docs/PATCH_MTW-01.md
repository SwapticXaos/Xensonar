# MTW-01: Messen und Liefern (Multitrack + Wave Editor, erste Stufe der Profi-Runde)

Basis: PSY-LANE-01 (`110fbbe`), `index.html` 8 082 843 B, SHA-256 `7c8d2dd6…59cfa`. Jetzt 8 098 586 B (**+15 743 B**: ca. 7,5 KB im Wave-Editor-Modul des Hauptbündels, ca. 8,2 KB im lazy geladenen Raum-IV-Chunk).
Zone: **KALT** (Analyse, Export, Übergabe; nichts läuft, solange niemand misst oder exportiert). Wiedergabe und Audio-Graph unverändert.
Daten-Owner: unverändert (Raum-IV-Projekt `xensonar-multitrack-v1`, Materialbibliothek, Wave-Editor-Dokument). Kein neuer Speicher, kein neues Projektfeld.

## Leitidee
Ein gemeinsamer Mess- und Lieferkern statt zweier halber: Der Wave-Editor-Kern (`__XenWaveCoreW01`), der schon den WAV-Encoder für beide Räume stellt, misst jetzt auch Lautheit und True Peak. Der Mixdown nutzt für das Begrenzen den vorhandenen Lookahead-Limiter des Wave Editors, und das Mastern geht über die vorhandene Übergabe „Send to Wave Editor“. Neu geschrieben wurde nur, was es nicht gab: die Messung, 24 Bit, der ZIP-Behälter für Stems.

## Neu
| Wo | Was |
|---|---|
| Kern `__XenWaveCoreW01.loudness(channels, sampleRate, range?)` | Programm-Lautheit nach **ITU-R BS.1770-4 / EBU R128** (K-Bewertung mit für die Abtastrate berechneten Koeffizienten, 400-ms-Blöcke, absolutes Tor −70 LUFS, relatives Tor −10 LU), **Loudness Range** nach EBU Tech 3342, **True Peak** (4-fach überabgetastet, 12 Taps je Phase), Stereo-Korrelation. Reine Funktion, 5 min Stereo in ca. 1,3 s (Node). |
| Kern `encodeWav` | Format **`pcm24`** (3 Byte, wortbündig aufgefüllt), TPDF-Dither wahlweise auch dort. 16 Bit und Float unverändert. |
| Wave Editor · Analyze | zusätzlich: LUFS integriert, Range, max. Short-Term, True Peak in dBTP, Peak-to-Loudness, L/R-Korrelation, Warnung bei True Peak über 0 dBTP. Ohne Auswahl wird die **ganze Datei** gemessen (bisher „0 Frames“). |
| Wave Editor · **Normalize Loudness** | Feld „Loudness target (LUFS)“ + Knopf: misst Auswahl oder ganze Datei und bringt sie mit **einem** Gain-Schritt aufs Ziel (die vorhandene Gain-Bearbeitung: Undo, Kanalwahl, Verlauf wie immer). Der True Peak bleibt bei höchstens −1 dBTP; reicht das nicht fürs Ziel, wird weniger angehoben und das Ergebnis genannt. |
| Wave Editor · Export | WAV Float32 / **PCM24** / PCM16 (jetzt **mit TPDF-Dither**, vorher ohne). |
| Raum IV · Format | WAV 16 Bit (Dither) / **24 Bit** / 32 Bit Float, gilt für Mixdown und Stems. |
| Raum IV · Statuszeile | nach jedem Mixdown: Länge, **LUFS, True Peak, Range**; Warnung bei Clipping im gewählten Format bzw. weniger als 1 dB Reserve. |
| Raum IV · **Lautheitsziel** | „As mixed“ (Vorgabe, Datei unverändert) / −14 LUFS / −16 LUFS / −23 LUFS. Ziel per Gain; nur wenn die Spitzen dabei über −1 dBTP kämen, greift der **Limiter des Wave Editors** (im Worker), ein letzter Trim hält den True Peak. Die Statuszeile nennt Ausgangswert, Weg (nur Gain oder Limiter) und Ergebnis. Die Wiedergabe ändert sich nicht. |
| Raum IV · **Stems** (`⋯` neben Mixdown, auch im Lineal-Menü) | jede hörbare Spur einzeln durch ihre eigene Lautstärke, Pan, EQ, Effekte und den Master-Regler, alle mit gleichem Start und gleicher Länge, in **einer ZIP** (unkomprimiert). Gefrorene Spuren sind durch ihre Bounce-Spur vertreten. |
| Raum IV · **Master in the Wave Editor** | Mixdown (32 Bit Float, wie gemischt) geht über `__XenSendToWaveEditor` in den Wave Editor: dort Effektkette (EQ, Kompressor, Limiter, Automation), Analyse, Export; „Send to Multitrack“ bringt einen Master als Spur zurück. |
| Fehler behoben | Der Master-Regler setzte die Raumlänge des Halls („Room s“) still auf den Standard zurück (`master:{volume}` ersetzte das ganze Objekt). |

## Prüfung
- **Unit** `tests/mtw_01_loudness_and_wav.test.cjs` (9 Tests, in `GREEN_NODE_TESTS.txt`, jetzt 122): Koeffizienten bei 48 kHz = Tabelle der BS.1770-4 (1e-8); EBU Tech 3341 Fall 1/2 (−23/−33 LUFS, 48 und 44,1 kHz, ±0,1), Fall 3 (Tor), Fall 5; Mono-Vollaussteuerung 997 Hz = −3,01 LUFS; Tech 3342 Fall 1 (LRA 10 LU ±1); True Peak eines fs/4-Sinus bei 45° (Samples −3,01 dB, True Peak 0 dB ±0,35; gemessen +0,11); Stille, kurze Stücke, Bereich, Korrelation ±1; 24-Bit-Bytes, Auffüllbyte, 16 Bit/Float unverändert.
- **Browser** `tests/e2e/mtw01_delivery.cjs` (echte App, Chromium): gemeldete LUFS/True-Peak-Werte = unabhängige Messung der Datei (±0,11); 24 Bit = Float auf einen 24-Bit-Schritt; −23 LUFS per reinem Gain (±0,1, Datei = Mix mal ein Faktor); −14 LUFS bei klickendem Material mit Limiter, True Peak ≤ −1 dBTP; **Stems-Nulltest** (zwei Spuren, eine mit Hall-Send): Summe der Stems = Mixdown, Rest 7·10⁻⁸; Raumlänge bleibt nach Master-Bewegung; Mixdown kommt im Wave Editor an; Analyse zeigt LUFS/dBTP/Korrelation; Normalize Loudness trifft −20 LUFS (±0,06), ein Undo-Schritt, Undo stellt den Pegel her.
- **Standard-Mixdown unverändert:** `tools/probes/multitrack_mixdown_probe.js` liefert weiter `833a9776cceb945d`.
- `build.py --check` grün, `run_tests.sh` 122 grün, `run_e2e.sh` grün (42 Skripte + 5 Standalone-Tests).

## Grenzen
- **Nicht gehört.** Gemessen sind Zahlen, nicht der Klang des Limiters (er regelt mit sofortigem Einsatz und 120 ms Rücklauf; bei stark klickendem Material ist Pumpen möglich). Für feines Mastern: „Master in the Wave Editor“.
- Der True Peak überspringt Stellen, deren Nachbar-Samples mehr als 6 dB unter dem Sample-Peak liegen (dort kann die Spitze praktisch nicht liegen); bei Rauschen bis zur Bandgrenze zeigt er mehrere dB über dem Sample-Peak, das ist korrekt.
- Lautheitsmessung läuft auf dem Hauptthread (5 min Stereo ca. 1–2 s Stillstand der Oberfläche beim Export bzw. bei Analyze).
- Stems: Die Summe gilt für „As mixed“. Das Lautheitsziel wirkt nur auf den Mixdown. Große Projekte liegen beim Zippen im Arbeitsspeicher (Grenze 4 GB mit klarer Meldung).
- **Der Wave Editor arbeitet mit 44,1 kHz** (Dekodierung der Forge): der 48-kHz-Mixdown wird bei der Übergabe vom Browser umgerechnet. Mixdown und Stems selbst bleiben 48 kHz; eine Wahl der Export-Abtastrate gibt es weiter nicht.
- Wave-Editor-Export PCM16 hat jetzt Dither (leises Rauschen bei −96 dBFS statt Quantisierungsverzerrung): bewusste Verhaltensänderung.
- Firefox/Safari, Gerät, lange reale Projekte: nicht geprüft.

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). Nicht: Abhören, USER_ACCEPTED, Netlify. Rollback: Commit `110fbbe`.
