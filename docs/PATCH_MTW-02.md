# MTW-02: Fades, Crossfades, Sample-Raster, Pegelanzeigen (Raum IV · Multitrack)

Basis: MTW-01 (`8960458`), `index.html` 8 098 586 B. Jetzt 8 108 009 B (**+9 423 B**, alles im lazy geladenen Raum-IV-Chunk bis auf 26 B im gemeinsamen Roundtrip-Vergleich).
Zone: Bearbeiten = WARM (Raum-IV-Oberfläche). Wiedergabe = HEISS · Steuerung wie bisher (200-ms-Planung, nur vorgeplante lineare Rampen). Pegelanzeigen: Abgriffe außerhalb des Signalwegs, gelesen in der einen vorhandenen rAF-Schleife, direkte DOM-Schreibvorgänge, kein React pro Frame.
Daten-Owner: Raum-IV-Projekt (`xensonar-multitrack-v1`). Additiv: `clip.fadeInShape`, `clip.fadeOutShape` (`'eq'` / `'s'`, fehlt = linear). Alte Projekte laden unverändert.

## Gefundener Klangfehler (bestand schon vorher, jetzt behoben)
Ein Clip in Originalgeschwindigkeit, dessen Start nicht genau auf ein Sample fällt, wurde vom Browser **über seine ganze Länge linear zwischen zwei Samples interpoliert**. Das ist ein Tiefpass: Höhen fehlen, weißes Rauschen war **2,6 dB leiser** (Faktor 0,744 bei einem Start auf Frame 138 666,67 = Beat 5,2 bei 108 BPM). Betroffen waren Wiedergabe und Mixdown, praktisch jeder Clip, der nicht bei 0 beginnt.
**Jetzt:** Ein Clip mit Rate 1 startet auf dem Sample-Raster des Ausgangs (Verschiebung höchstens ein halbes Sample, etwa 10 µs), Schleifenpunkte liegen auf Samples. Clips mit Bandgeschwindigkeit ≠ 1 werden ohnehin interpoliert und bleiben unverändert.
Beleg (`tests/e2e/mtw02_fades_meters.cjs`, vorher/nachher auf Basis `110fbbe` und neu gemessen): Rauschen bei Beat 5,2 vorher 0,093, jetzt 0,125 = wie bei Beat 0 (±1,5 %). Der Standard-Mixdown der Probe (Clip bei 0, Bandgeschwindigkeit) bleibt byte-identisch (`833a9776cceb945d`).

## Neu
| Was | Bedienung / Wirkung |
|---|---|
| **Fade-Formen** | Inspektor: neben „Fade in“ / „Fade out“ je eine Wahl **linear · equal power · S-curve**. Rechtsklick: „Fade shape: equal power / linear“. |
| **Fade-Anfasser** | Runde Punkte oben links/rechts am Clip (bei Hover oder Auswahl): seitlich ziehen = Fade-Länge, frei vom Raster, höchstens die halbe Cliplänge; ein Undo-Schritt. |
| **Fades sichtbar** | Die Wellenform folgt dem Fade, eine helle Linie zeichnet die Kurve. Überlappende Clips scheinen leicht durch; ein Clip unter dem Zeiger behält seine Farbe (wurde vorher grau). |
| **Crossfade** (Taste `X`, Rechtsklick) | Wo der Clip einen Nachbarn auf seiner Spur überlappt: der frühere blendet aus, der spätere ein, genau über die Überlappung, Form equal power. Ohne Überlappung sagt die Statuszeile, was zu tun ist. |
| **Positionsgenaue Fades** | Wer mitten in einem Fade startet (Play ab Cursor, Loop-Durchlauf, Export eines Bereichs), hört den Pegel dieser Stelle. Vorher spielte ein solcher Teil sofort mit vollem Pegel. |
| **Pegelanzeigen** | Jede Spur: schmaler Balken an der Oberkante des Spurkopfs (nach Fader, Pan, EQ; links und rechts getrennt gemessen, damit eine gepante Spur stimmt). Master: Skala −60 bis +6 dBFS mit 0-dB-Marke, rot über 0 dBFS, dazu **„peak −x dB“** (höchste Spitze seit Start, Klick setzt zurück). Schneller Anstieg, langsamer Rückfall. |
| **Fader in dB** | Tooltip und Screenreader-Wert von Vol / Master nennen dB; Doppelklick auf Vol bzw. Pan setzt zurück. |
| **Spurkopf** | Die Regler ragten 60–80 px über die Zeitleiste und verdeckten den Anfang der Clips. Jetzt bleiben sie im Spurkopf (Pitch-Feld mit ♪ beschriftet, Tooltip unverändert). |

## Technik
- `clipEnvelope`: Pegel eines Voice-Abschnitts aus `fadeLevel(x)`; Formen als 12 kurze lineare Rampen (dieselbe Automationsart wie bisher, **kein** `setValueCurveAtTime`, nichts gemischt), 4/6-ms-Schutz gegen Knackser nur dort, wo der Abschnitt nicht in einem Fade beginnt oder endet.
- **Wie bisher geplant** (exakt dieselben vier Aufrufe) werden Clips ohne Fades und ganze Clips mit linearen Fades. Nur Formen und Teilabschnitte von Clips mit Fades nehmen den neuen Weg.
- Formnamen kommen aus einer Tabelle ohne Prototyp (ein Name wie `constructor` wird verworfen: per Test gefunden).
- Pegelabgriff: `ChannelSplitter` + zwei `AnalyserNode` je Spur und am Master, nur während der Wiedergabe, nie im Export.

## Prüfung
- **Unit** `tests/mtw_02_fades.test.cjs` (9 Tests, jetzt 123 grün): Formwerte, equal power in² + out² = 1, Fade höchstens halbe Cliplänge, Rampen streng zeitlich steigend und endlich (auch bei 4-ms-Stimmen), Start mitten im Fade, Abschnitt fern jedes Fades, Datenprüfung, „wie bisher“-Planung Aufruf für Aufruf, Sample-Raster (Start auf Sample, höchstens halbes Sample verschoben, Band-Clips und fremde Abtastraten unberührt).
- **Browser** `tests/e2e/mtw02_fades_meters.cjs` (echte App, am exportierten Mixdown mit weißem Rauschen gemessen): Mitte des Fades linear 0,50 / equal power 0,707 / S 0,50, S bei einem Viertel 0,146; Export ab Fade-Mitte beginnt mit dem Pegel der Stelle; Überlappung ohne Fades +3 dB, **Crossfade equal power: Pegel eben (±0,07)**, linear −3 dB; Anfasser 56 px = 2 Beats, ein Undo; Spur- und Master-Anzeige bewegen sich, Spitze in dB, Ruhe nach Stop; nichts ragt aus dem Spurkopf.
- Vorhandene Proben (`multitrack_fx / freeze / select / automation / warp / roundtrip / eq / mixdown`) ohne Fehler, Exporte dort „identisch“ wie zuvor.

## Grenzen
- **Nicht gehört.** Formen und Pegel sind am Export gemessen; ob ein Crossfade musikalisch sitzt, entscheidet das Ohr.
- Ein Fade ist höchstens halb so lang wie sein Clip; ein Crossfade über mehr als die halbe Cliplänge wird gekappt und gemeldet.
- Sample-Raster hilft nur, wenn Audio und Ausgabe dieselbe Abtastrate haben (Mixdown: immer 48 kHz). **Wiedergabe auf einem Gerät mit 44,1 kHz** interpoliert weiter (dekodiert wird mit 48 kHz); der Mixdown ist davon nicht betroffen. Offen: Dekodierung in der Geräterate für die Wiedergabe.
- Die Spuranzeige misst vor den Spur-Effekten (Drive, Echo, Hall), der Master nach allem, aber vor dem Master des Live Room. Anzeige = Sample-Spitze; die genaue Lautheit und den True Peak nennt der Mixdown (MTW-01).
- Die Tempoerkennung des Imports hört in gleichförmigem Rauschen ein Tempo (im Test beobachtet: 69 BPM); unverändert, im Inspektor „Fit: Original speed“ wählbar.
- Firefox/Safari, Gerät: nicht geprüft.

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). Nicht: Abhören, USER_ACCEPTED. Rollback: Commit `8960458` (MTW-01).
