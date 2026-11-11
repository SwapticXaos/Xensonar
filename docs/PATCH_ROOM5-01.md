# ROOM5-01 · Raum V · Psychedelic Lab (11.11.2026)

Parent: LIVE-GF-05 (`5d595f0`), `index.html` 8 946 161 B, SHA-256 `9fb03fa92fa21aceddaad310acf5454f3df859e1ffd83c25678a56c43f8ec86f`.
Ergebnis: `index.html` 9 000 295 B, SHA-256 `6d598ab8fd3ec720de20c10e627312b715fc82473c2b6f68ad668757823cd5e7`.
Größenzuwachs **+54 134 B**, davon 52 938 B im neuen **inerten** Raum-Chunk (`application/x-xensonar-room`, wird erst beim ersten Öffnen ausgewertet); der Rest ist Verdrahtung. Startpfad unverändert (Chunk beim Start nachweislich nicht ausgewertet).
Rollback: Parent-Commit `5d595f0`.

Status: CODE_PRESENT, UNIT_VERIFIED (Engine), BROWSER_CHECKED (Headless-Chromium, echtes Layout). **Nicht:** abgehört, USER_ACCEPTED, Firefox/Safari, Netlify. Klang wurde nur gemessen (Pegel, Spektrum, Stabilität), nicht gehört: ob die Presets musikalisch überzeugen, entscheidet das Ohr.

## Was der Raum ist
Ein eigenes Klanglabor mit einer neuen Synthese-Engine (ein AudioWorklet, `xen-psylab-v1`), sechs Stimmen, frei stimmbar.

| Baustein | Was er tut |
|---|---|
| **HYDRA** | Drei Operatoren im Rückkopplungsring: A klingt, B biegt A, C biegt B, A biegt C. Verhältnisse frei (0,125–16), dazu Eigen-Feedback und Stereo-Verstimmung. |
| **ESCHER** | Endlose Treppe (Shepard/Risset): ein Stapel von Teiltönen, der ewig steigt oder fällt. Das Stapelintervall ist frei (2 = Oktaven, 3 = Tritaven, 1,5 = Quinten …). |
| **SHAPE** | Wavefolder, morphender Filter (Tiefpass · Bandpass · Hochpass stufenlos), „Dust“ (Abtast-Staub). |
| **SPIRAL** | Frequenzschieber (Einseitenband) und ein Echo, dessen Wiederholungen bei jedem Durchlauf erneut verschoben werden, links und rechts gegenläufig: Barber-Pole-Spiralen. Echozeit gleitet bandartig. |
| **CRYSTAL** | Bis zu acht Resonatoren, gestimmt auf die aktuelle Skala, klingen mit. |
| **CHAOS** | Ein Lorenz-Attraktor bewegt Fold, FM, Shift, Echozeit, Pan und Cutoff. Er wiederholt sich nie. |

**Spielen:** Pad (X = Tonhöhe über drei Perioden, Y = Intensität; rastet wahlweise auf die Skala ein; mehrere Finger möglich), Tastatur (vier Reihen = 36 Skalenschritte in jeder Stimmung, Shift = lauter), Hold (Leertaste: Töne bleiben liegen, bis man sie erneut spielt), Esc = alle Töne aus.
**Stimmung:** Grundton in Hz, Skala als Text: `19edo`, `13ed3` (N gleiche Schritte einer beliebigen Periode), Verhältnisse `1/1 9/8 5/4 3/2`, Cent `386c`, eigene Periode mit `@3/1`. Kein 12-EDO vorausgesetzt.
**Patches:** 8 Werks-Patches, eigene speichern/löschen, **Mutate** (zufällige Hälfte der Regler um wählbaren Betrag), jeder Wert exakt eintippbar (Klick auf die Zahl), Doppelklick setzt zurück.
**Weiterverwenden:** „→ Multitrack“ rendert die gehaltenen Töne (oder den Grundton) offline mit derselben Engine und legt das Ergebnis als Material ab; es wartet in Raum IV. „⤓ WAV“ lädt es als 32-Bit-Float-WAV. Die Aufnahme in der Kopfzeile (Rec) nimmt den Raum mit auf.
**Bild:** Kaleidoskop-Scope aus linkem gegen rechten Kanal, dazu das Skalenraster; zeichnet nur, wenn etwas klingt.

## Zone
- **KALT**, solange der Raum zu ist: kein Timer, kein Listener, kein Audioknoten, kein CSS. Auch im offenen Raum entsteht der Audioknoten erst beim ersten Ton.
- **HEISS · Audio-Thread** beim Spielen: ein Worklet, keine Allokation pro Block, keine Nachrichten aus dem Worklet, Parameter geglättet (20 ms), schläft 1,5 s nach dem letzten Ausklang (Ausgabe exakt 0). Lehren aus LIVE-GF-01 direkt angewandt: Zustand in Typed Arrays, keine Funktionsaufrufe mit Zahlen pro Sample, `process()` in kleine Stufen zerlegt.
- **HEISS · Steuerung:** Reglerbewegungen gehen gebündelt höchstens 1× pro Bild ans Worklet; nur der bewegte Regler rendert neu, nie der Raum. Gespeichert wird 600 ms nach der letzten Änderung und beim Verlassen.
- Für den Live-Bereich gilt der Raum als kalt (LIVEZONE): Live Room und Myzel schlafen, die Rückfrage bei laufender Aufnahme greift. Er nutzt den Live-Kontext (kein zweiter AudioContext) und den Master-Eingang `main`.

## Daten-Owner
- **Neu:** `localStorage` `xensonar.psylab.instruments.v1` (Format `xensonar.psylab` v1): Arbeits-Patch, eigene Patches, Hold, Snap, Bounce-Länge. Der Schlüssel fällt in der Package Station unter die bestehende Rubrik „Nodal- & Entrophon-Instrumente“ (Zuordnung im Code gelesen, Export/Import-Rundlauf nicht eigens getestet).
- **Mitgenutzt:** `__xenMultitrackBridge` (`ensureAudioReady`, Master-Eingang), `__XenMultitrackInbox.send` (legt Material über den bestehenden Owner an), `__xenRecorderFloatWav`. Keine Migration, kein bestehender Schlüssel verändert.

## Quelländerungen
- **Neu:** `src/post-oct/034-xen-room-psylab.js` (Chunk), Manifest-Abschnitt `js-020c-xen-room-psylab`, Platzhalter im Template, Statuseintrag.
- `src/startup/00_room_and_function_dispatch.js`: Lader kennt `psylab`. `src/forge/editor/07_view_lifecycle.js`: `PSYLAB` ist kalt und nutzt den Live-Kontext.
- `src/runtime/instrument/05_timing_and_admission.js`: Knopf **V PSY LAB**. `src/rhythm/02_bass_and_rack.js`: `onOpenPsylab`. `src/myzel/01_effect_mapping.js`: Verteiler (`P.lazy`).
- Blöcke: 34 Scripts (+1 inerter Raum-Chunk), 77 Styles. Raumkennung `PSYLAB`; die Ziffer „V“ ist reine Anzeige (frühere Notiz „Spiele-Raum würde V“ ist damit überholt).

## Messwerte und Prüfungen
| Prüfung | Ergebnis |
|---|---|
| Start | Chunk nicht ausgewertet, kein Stil, kein Knoten |
| Raum offen, noch kein Ton | kein AudioContext-Knoten des Raums |
| 6 Stimmen, Chromium-Trace, Blockzeit gesamt | 300 µs (Liquid Bell), 350 µs (Escher), Budget 2 902 µs; **0 GCs auf dem Audio-Thread** |
| Engine allein (Node), 6 Stimmen | 85 µs je Block, mit Treppe 152 µs |
| 8 Werks-Patches | hörbar (−17,6 … −11,2 dB RMS), Spitze ≤ 0,65, kein Gleichanteil, kaum Energie über 12 kHz (max. 5 %) |
| 45 Zufallseinstellungen inkl. Extremwerte, 44,1/48/96 kHz, NaN-Eingaben | Ausgabe immer endlich und ≤ Pegelregler |
| Ohne Töne | exakt 0, Engine schläft; wacht beim nächsten Ton auf |
| Pad, Tastatur, Regler, Stimmungswechsel (7 Töne JI → 19-EDO: 275 → 236,65 Hz auf derselben Taste) | im echten Layout geprüft |
| Hold + Bounce 2 s → Multitrack | Material angelegt, Eintrag im Inbox |
| Neuladen | Arbeits-Patch, Grundton, Skala erhalten |
| Raum verlassen bei klingendem Ton | Pegel danach < 0,002 |

Tests: `run_tests.sh` 108/108 (neu `room5_psylab_engine.cjs`), `run_e2e.sh` 16 Läufe grün (neu `tests/e2e/room5_psylab.cjs`), `build.py --check` OK. Probe: `tools/probes/room5_load_probe.js`.

## Bekannte Grenzen und offene Punkte
- **Kopfzeile:** Mit fünf Raumknöpfen bricht die Kopfzeile zwischen etwa 1 367 und 1 535 px Fensterbreite in zwei Reihen um (wie bisher schon bis 1 366 px). Ab 1 536 px bleibt sie einzeilig.
- FM und Wavefolder laufen ohne Oversampling: bei extremen Einstellungen in hoher Lage entsteht Aliasing (gehört hier teils zum Charakter; Oversampling wäre ein eigener Schritt mit messbarer Mehrlast).
- Sechs Stimmen; die siebte übernimmt die älteste losgelassene (sichtbare Grenze, kein stilles Kappen von Tonhöhen oder Stimmung).
- Kein MIDI, keine Anbindung an Sessions/Quick-Rack, kein Tempobezug des Echos zum Live-Tempo.
- Bounce rendert gehaltene Töne als einen Klang; eine gespielte Phrase nimmt man über Rec auf.
- Package-Station-Rundlauf des neuen Schlüssels und das Verhalten unter `file://` in Firefox sind ungeprüft.
