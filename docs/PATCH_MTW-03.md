# MTW-03: Wave Editor · Pitch / Time mit der gemeinsamen Pitch-Engine, Snap to Zero

Basis: MTW-02 (`8a9a809`), `index.html` 8 108 009 B. MTW-03 und MTW-04 zusammen: siehe Größenangabe in `PATCH_MTW-04.md`. Zone: **KALT** (Bearbeitung auf Knopfdruck; Rechnen im vorhandenen Offline-Worker, Umrechnen der Länge im Decoder des Browsers). Kein neuer Audio-Graph, keine Wiedergabe-Änderung.
Daten-Owner: Wave-Editor-Dokument (ein Undo-Schritt über `commitRender`, wie jede Bearbeitung). Kein neuer Speicher.

## Leitidee
Der Wave Editor konnte bisher weder umstimmen noch die Länge ändern (`capabilities.pitchShift/timeStretch: false`), obwohl XenSonar dafür längst eine eigene, gemessene Engine hat: den Offline-Schleifen-Renderer von PITCH-HQ-01 (60-ms-Körner, 80-Tap-Sinc, Transientenschutz), den die Materialspur und der Multitrack benutzen. MTW-03 schließt den Editor an **dieselbe Engine, dieselbe Warteschlange und dasselbe Speicherbudget** an (`globalThis.__XenOfflinePCM`, eine Zeile Brücke im Hauptbündel). Ein Material klingt umgestimmt überall gleich.

## Bedienung (Wave Editor → „Edit Audio“)
- **Pitch (ratio or cents)**: Frequenzverhältnis (`3/2`, `7:4`, `81/80`, `1.5x`) oder Cent (`50`, `-1200`, `386.3`). Mikrotonal frei, ¼ bis 4.
- **Length × (factor or ratio)**: `2` = doppelt so lang, `0.5` = halb, `3/2`; die Tonhöhe bleibt. ¼ bis 4.
- **Apply Pitch / Time**: wirkt auf die Auswahl, ohne Auswahl auf die ganze Datei. Beides zusammen geht in einem Schritt. Unter den Feldern steht, was geschah (Cent, Faktor, Länge vorher/nachher) oder warum nichts geschah.
- **Snap to Zero** (Werkzeugzeile, Taste `Z`): setzt Cursor bzw. beide Auswahlränder auf den nächsten Nulldurchgang (±5 ms), damit Schnitte, Stummschaltungen und Pastes nicht knacken.

## Technik
- Reihenfolge wie in Raum IV, damit kein Frequenzband verloren geht: **länger** = erst per Resampling verlängern (Spektrum rückt nach unten), dann um Tonhöhe × Faktor hochschieben; **kürzer** = erst herunterschieben, dann per Resampling kürzen.
- Resampling: das Stück wird als Float-WAV mit einer anderen Abtastrate deklariert und vom Decoder des Browsers in der Projektrate dekodiert (dessen hochwertiger Umrechner, schnell, kein eigener Code). Ganzzahlige Deklarationsrate: Längenfehler unter 0,01 %, die Länge wird danach exakt gesetzt.
- Die Engine rechnet zyklisch und schützt Transienten. Deshalb bekommt das Stück links und rechts 0,3 s Rand, der nach dem Rechnen wegfällt: den echten Nachbarklang, am Dateirand das gespiegelte Audio, nach außen über 0,12 s ausgeblendet. (Ein stiller Rand wirkte auf den Transientenschutz wie ein harter Einsatz und schaltete den Phasenabgleich ab: im Test 657 statt 660 Hz; mit gespiegeltem Rand 660 Hz.) Die Nähte zur unbearbeiteten Umgebung werden über 5 ms überblendet.
- Nur die gewählten Kanäle; eine neue Länge gilt immer für beide (sonst liefe Stereo auseinander, das wird gemeldet).
- `__XenWaveCoreW01.zeroCrossing(channels, frame, radius)` und `__XenWaveUIW01.parseInterval(text, kind)` sind reine Funktionen.

## Prüfung
- **Unit** (in `tests/mtw_01_loudness_and_wav.test.cjs`, jetzt 11 Tests): `zeroCrossing` (nächster Vorzeichenwechsel, Dateienden, leisester Punkt ohne Wechsel, Stereo-Summe), `parseInterval` (Verhältnisse, Cent, Komma, Unsinn → NaN).
- **Browser** `tests/e2e/mtw03_wave_pitch_time.cjs` (echte App, 44,1 kHz, am Dokument gemessen): `3/2` macht aus 440 Hz 660 Hz (±2 Hz) bei gleicher Länge und gleichem Pegel, der alte Ton ist weg, **Undo bit-genau**; +50 Cent = 452,9 Hz; Länge × 2 und × ½: Länge stimmt auf 2 Frames, 440 Hz bleibt, **9-kHz-Ton danach 0,146 bzw. 0,147 von 0,15** (kein Höhenverlust), ein Klick in der Mitte bleibt in der Mitte (±1 %); `1/2` und `3/2` zusammen = 220 Hz bei 1,5-facher Länge; nur Auswahl: außen **bit-identisch**, größter Sprung an den Nähten 0,050 (= die Steigung des Tons selbst); drei Oktaven, Unsinn und „nichts zu tun“ werden erklärt und ändern nichts; Snap to Zero setzt beide Ränder auf Vorzeichenwechsel.

## Grenzen
- **Nicht gehört.** Gemessen sind Frequenz, Pegel, Länge, Lage eines Klicks, Nähte. Granulares Umstimmen hat seinen Klang (bei großen Intervallen und dichtem Material hörbar); es ist derselbe wie auf der Materialspur. Hohe reine Töne sind zwischen den Körnern nicht phasenstarr (im Test: 9 kHz mit vollem Pegel in 20-ms-Fenstern, aber verbreiterter Linie).
- **Länge pro Durchgang:** etwa 30 s Stereo bzw. 60 s Mono (bei Faktor > 1 entsprechend weniger), das ist das Budget des gemeinsamen Workers (48 MB je Auftrag). Darüber kommt eine Meldung, nichts wird geändert. Längere Stücke: in Abschnitten.
- Tonhöhe × Länge muss zwischen ¼ und 4 liegen (zwei Oktaven granular).
- Das Resampling hängt am Decoder des Browsers (Chromium geprüft; Firefox/Safari nicht).
- Die Effekt**kette** des Editors hat weiterhin kein Pitch/Time (keine Vorschau, keine Automation); es ist eine Bearbeitung wie Normalize.

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). Nicht: Abhören, USER_ACCEPTED. Rollback: Commit `8a9a809` (MTW-02).
