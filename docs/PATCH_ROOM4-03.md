# ROOM4-03: Raum IV · Send to Multitrack, Rohaudio-Import mit Tempoerkennung, Übersichtsleiste, Tooltips

Nutzerwunsch nach ROOM4-02:
- vertikale Zoomleiste ganz rechts nach dem Vorbild von Melodic Loop;
- Tooltips;
- Rohaudio-Import mit Tempoerkennung und Beatsnap;
- „Send to Multitrack“ aus Wave Editor, Spectral Forge und Melodic Loop. Jede Sendung legt eine neue Spur an, das Tempo wird an die Session angepasst, der Rückweg ist verlustfrei.

Vereinbarte Aufteilung:
- **ROOM4-03** (dieser Patch): alles oben Genannte.
- **ROOM4-04**: Bass- und Drum-Spuren als Quelle sowie der Rückweg Multitrack → Wave Editor.

| | |
|---|---|
| Basis | ROOM4-02, `index.html` 8 631 771 Bytes, SHA-256 `c93a1846f6dccdce53f861cdbf295f895071bab83671966434e3cc9ef6b3e11b` (Commit `47c22b9`) |
| Ergebnis | `index.html` 8 654 665 Bytes, SHA-256 `294a67526cbd0bd039aadb084291074cbb4403310aab7a3c09f646e4ce180b3c` |
| Größenzuwachs | **+22,9 KB**. Davon +10,1 KB im inerten Raum-Chunk (jetzt 64,1 KB, beim Start nicht ausgewertet). 7,7 KB sind ein neuer kalter Block im Hauptbundle (`033`, nur Funktionsdefinitionen, kein Speicherzugriff beim Start). Der Rest sind die drei Knöpfe und das CSS. |
| Blöcke | 34 Scripts / 77 Styles wie im Parent. |
| Zone | **KALT.** Senden, Dekodieren und Tempoerkennung laufen im Offline-Kontext und nur auf Knopfdruck. Die Leiste ist reine Oberfläche; der Scroll wird direkt gesetzt, React rendert nur bei Änderung der Spurhöhe. Die Wiedergabe ist unverändert (HEISS · Steuerung wie ROOM4-02). |
| Daten-Owner | **Material:** wie bisher `__registerDurableMaterial` (Materialbibliothek), es gibt keinen zweiten Speicher. **Eingang („Inbox“):** IndexedDB `xensonar-multitrack-v1` / Store `projects` / Schlüssel `inbox`, dieselbe Datenbank wie das Raum-IV-Projekt (`current`). Die Datenbank wird jetzt über einen gemeinsamen Zugang geöffnet (`__XenMultitrackInbox.db`), statt doppelt. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium, echtes Layout, siehe Prüfungen). **Nicht:** Abhören, Gerätetest, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Neu

### Ein gemeinsamer Weg „Send to Multitrack“ (`src/post-oct/033-xen-multitrack-shared.js`)

`__XenMultitrackInbox` bietet `send({channels,sampleRate,…})`, `sendBlob({blob,…})`, `add`, `take`, `count` und `detectTempo`. Alle drei Räume und der Import im Raum IV nutzen diesen einen Weg:

1. Das Audio wird **verlustfrei** als Material gespeichert:
   - Wave Editor und Forge: als Float32-WAV (`__xenRecorderFloatWav`, bitgenau);
   - Import: als Originaldatei, ohne Neukodierung.
2. Das Tempo wird ermittelt:
   - bekanntes Quelltempo (Forge-Tempo, Melodic-Loop-Rendertempo) hat Vorrang;
   - sonst Tempoerkennung (Onset-Hüllkurve, Autokorrelation 60–200 BPM, Beat-Phase). Sie wird nur übernommen, wenn die Konfidenz mindestens 0,2 beträgt.
3. Ein Eingangseintrag wird gesetzt. Raum IV legt ihn beim Öffnen auf eine **neue Spur unter den vorhandenen**; eine leere letzte Spur wird wiederverwendet. Ist der Raum offen, geschieht das sofort.

### Tempo-Anpassung ohne Granular, mit verlustfreiem Rückweg

- Neuer Clip-Modus **„Source tempo“** (`fit:'bpm'`): Rate = Session-Tempo / Quelltempo. Das ist reine Bandgeschwindigkeit (Tonhöhe folgt), kein Granularverfahren.
- Das gespeicherte Material bleibt unverändert. Zurück zu „Original speed“ ist jederzeit ohne Verlust möglich.
- Bei erkanntem Tempo startet der Clip **auf dem ersten erkannten Schlag** (Versatz ins Material) und ist damit am Raster ausgerichtet („Beatsnap“).
- Clip-Menü und Inspektor:
  - Original speed;
  - Bars × beats;
  - Source tempo;
  - Quelltempo ×2 / ÷2 (gegen Oktavfehler der Erkennung, z. B. 174 → 87);
  - Quelltempo von Hand.
- Eine tonhöhenerhaltende Dehnung wäre eine eigene, ausdrücklich zu wählende Option (nicht in diesem Patch).

### Knöpfe

- **Wave Editor (W01):** „➜ Send to Multitrack“ **unten rechts** im Editor. Gesendet wird das bearbeitete Projekt. Eine noch nicht angewendete FX-Kette wird gemeldet (wie beim WAV-Export).
- **Spectral Forge, Rack über dem WAV-Editor:** „🎚 Send to Multitrack“ ersetzt den alten Platz von Figure Projects in der Send-Reihe. **Figure Projects rückt eine Zeile nach oben** unter Project Name / Save.
  - Die Send-Reihe links verschiebt sich nicht. Bis 1600 px Fensterbreite ist das Rack pixelgleich zum Parent; geprüft bei 1000, 1280 und 1600 px.
  - Bei sehr breiten Fenstern (einzeilige Send-Reihe, geprüft bei 1920 und 2560 px) wird das Rack 19 px höher, damit Figure Projects nicht die Statuszeile von Save überdeckt.
  - Gerendert wird derselbe Hörmodus wie bei „Send to Editor“ (gleiche Funktion `__f333SendToEditor('multitrack')`, gleiche Prüfungen): die violette Navigator-Auswahl, sonst die ganze Figur. Beides geht als Float32-WAV (der Navigator-Renderer hat dafür die Option `float`; „Send to Editor“ und „Save as Sample“ bleiben unverändert). Das Forge-Tempo gilt als Quelltempo.
- **Melodic Loop, Block Distribution:** „🎚 Send to Multitrack“. Es nutzt denselben Export wie „Send to Material Track“ (ein dauerhaftes Material) und legt danach den Eingangseintrag mit dem Rendertempo an.
- **Raum IV:** „⤒ Import audio“ für mehrere Dateien. Jede Datei wird eine neue Spur mit Tempoerkennung.

### Übersichtsleiste rechts (vertikaler Zoom)

- Jede Spur erscheint als Minizeile; farbig, und heller, wenn sie Clips hat. Die Leiste wächst also mit der Spurzahl.
- Bedienung wie in Melodic Loop:
  - Fenster ziehen = scrollen;
  - obere oder untere Kante ziehen = Spurhöhe zoomen (36–220 px);
  - Klick = springen;
  - Doppelklick = möglichst alle Spuren zeigen.
- Unter 58 px Spurhöhe wird der Spurkopf kompakt: nur Name, M, S und ⋯. Lautstärke und Pan sind dann über ⋯ bzw. den Rechtsklick (Reset) erreichbar.
- Die Mathematik ist ein neutraler, gemeinsam nutzbarer Helfer, `__xenViewportRail` mit `begin`, `jump` und `move`.
  - **Warum nicht direkt die Melodic-Loop-Funktion:** Deren Leiste (`IUe`/`EUe`/`FUe`) ist fest mit dem Composer verdrahtet (umgekehrte Achse für Tonhöhen, Mindestens-8-Zeilen-Regel, Composer-Zustand). Die Funktion wurde deshalb nachgebaut statt herausgelöst, damit Melodic Loop unberührt bleibt. Melodic Loop kann später auf denselben Helfer umgestellt werden; das wäre ein eigener, geprüfter Schritt.
- Das Lineal bleibt beim vertikalen Scrollen oben stehen (sticky).

### Tooltips

Alle Bedienelemente im Raum IV haben einen Tooltip. Bei Zahlenfeldern und Clips ist er erklärend: Ziehen/Alt-Kopie/Kanten/Rechtsklick sowie die Wirkung von Tempo, Länge, Versatz und Fit. Die Probe zählt 187 Elemente, 0 ohne Tooltip.

## Quelländerungen

- **Neu:** `src/post-oct/033-xen-multitrack-shared.js` (Hauptbundle, nach `07_view_lifecycle.js`), Manifest-Eintrag.
- `src/post-oct/032-xen-room-multitrack.js` (Raum-Chunk):
  - Inbox-Übernahme, Import, Fit-Modus `bpm`;
  - Übersichtsleiste, Spurhöhe, kompakter Spurkopf;
  - Tooltips;
  - Datenbankzugang über den gemeinsamen Owner.
- `src/post-oct/015-xen-wave-editor-w01-modules.js`: Knopf und `sendToMultitrack()`.
- `src/forge_and_melodic/10_audition_and_persistence.js`: `__f333SendToEditor(target)` und `__ForgeSendToMultitrackButton`.
- `src/factories/ForgeTransportRack.js`: Knopf in der Projektecke.
- `styles/areas/028_inline-028.css`: Projektecke (Knopfmaß, nach oben wachsen).
- `src/rooms/canonical.js`: Knopf in der Distribution, `toMultitrack` bis in den Export (`B9e`).
- `docs/SOURCE_TREE_STATUS.json`: Bytes aktualisiert, `033` ergänzt.

## Prüfungen

### `node tools/probes/multitrack_send_probe.js` (neu)

| Schritt | Ergebnis |
|---|---|
| Start | Raum-Chunk nicht ausgewertet, Inbox-API vorhanden, keine Fehler |
| Wave Editor → Multitrack | Knopf 20 px vom rechten und 18 px vom unteren Rand, überdeckt nichts; Eintrag im Eingang |
| Forge → Multitrack (nach Zeichnen einer Figur) | Knopf in der Projektecke; „Sent to Multitrack · new track · 108 BPM · Whole figure“ |
| Melodic Loop → Multitrack | Knopf in Distribution; Eintrag im Eingang |
| Raum IV öffnen | Eingang geleert, 3 neue Spuren: `xen_mt_tone · original speed`, `xen_mt_tone · 108 BPM`, `SyntheticForge Loop · 108 BPM` |
| Import: 120-BPM-Klickloop, 0,37 s Vorlauf, Session 108 BPM | erkannt **120 BPM**, Versatz 0,74 Schläge (= 0,37 s), Clip 15,26 Schläge, Inspektor „Tempo 120 → 108 BPM · tape ×0.900 at playback (stored audio unchanged, lossless)“ |
| Leiste: 26 Spuren | Fenster ziehen: scrollTop 0 → 149; untere Kante ziehen: Spurhöhe 64 → 47; Doppelklick: 36 px, 26 kompakte Zeilen; Lineal bleibt oben |
| Tooltips | 187 Bedienelemente, 0 ohne Tooltip |
| Neuladen | 26 Spuren erhalten, Eingang leer |
| Seitenfehler | keine |

### Weitere Prüfungen

- **`multitrack_probe.js` (ROOM4-02):** alle Schritte unverändert (Ziehen über Spuren, Trimmen, Teilen, Kontextmenüs, Wiedergabe und Live-Mute 0,24 → 0 → 0,24, Loop, Originaltempo, Mixdown, Neuladen, Raum verlassen → 0).
- **`livezone_probe.js`:** 13 Schritte wie beim Parent: Live Room und Nodal hörbar; Forge kalt (Kontext angehalten, 0 Timer); Rückkehr; Aufnahme-Rückfrage. Schritt 7c (Bildvergleich Art Installation) ist beim Parent ebenfalls „ungleich“ (animiertes Bild), also keine Abweichung.
- **Unit (Node), Tempoerkennung:**
  - 120, 93 und 76 BPM exakt;
  - Vorlauf 0,37 s gefunden;
  - Rauschen: Konfidenz 0,09, also ignoriert;
  - 174 BPM wird als 87 erkannt (Oktave), dafür gibt es ×2 im Menü.
- **Forge-Rack-Geometrie** gegen den Parent bei 1000, 1280, 1600, 1920 und 2560 px: Send-Reihe unverändert; Projektecke wie oben beschrieben.
- **Eingang ohne Endlosschleife:** Fehlt das Material in der Bibliothek noch, wird der Eintrag still zurückgelegt und bei der nächsten Bibliotheksänderung erneut versucht (höchstens 40-mal).

## Offene Punkte / Risiken

- **Abhören:** die Bandgeschwindigkeit verschiebt die Tonhöhe mit, z. B. 120 → 108 BPM = −1,8 Halbtöne. Das ist gewollt verlustfrei; wer die Tonhöhe halten will, braucht eine tonhöhenerhaltende Dehnung als eigene Option.
- **Tempoerkennung:** zuverlässig bei perkussivem Material. Bei Flächen und Drones gibt es eher keine Erkennung; dann läuft der Clip in Originalgeschwindigkeit, was gewollt ist. Oktavfehler lassen sich per ×2/÷2 korrigieren.
- **Wave Editor:** gesendet wird der Projektstand; eine nicht angewendete FX-Kette ist nicht enthalten (Hinweis in der Statuszeile).
- **Doppelklick „alle zeigen“** ist durch die Mindesthöhe von 36 px begrenzt. Bei sehr vielen Spuren bleibt gescrollt.
- **Folgt (ROOM4-04):** Bass- und Drum-Spuren als Quelle; „Edit in Wave Editor“ als Rückweg mit Ergebnis als neues Material.

## Rückweg

ROOM4-02 (`c93a1846…e11b`). Im Quellbaum: diesen Commit zurücknehmen und `python3 tools/build.py` ausführen.

Daten:
- Projektformat v2 unverändert.
- Neues Clip-Feld `fit:'bpm'` mit `sourceBpm`. ROOM4-02 kennt `bpm` nicht und fällt auf Tempo-fit zurück; der Clip bleibt hörbar, nur die Länge wird anders gerechnet.
- Der Schlüssel `inbox` stört ältere Builds nicht.
- Gesendete Materialien bleiben normale Bibliothekseinträge.
