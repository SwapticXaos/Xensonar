# ROOM5-03 · Mandala wieder fein, Tastatur wie im Hauptraum, Hotkeys, Basis für den Live-Raum (12.11.2026)

Parent: ROOM5-02 (`d30092c`), `index.html` 9 013 788 B, SHA-256 `25d7a2d39b518da43dbdc0c4df3edcf71689abeb88c7dee4380d70b24a39435d`.
Ergebnis: `index.html` 9019102 B, SHA-256 `2e6c1d15322fd4fca4db88d3a1b7cfadf528ec61f8d73ce33677bfb940759491` (+5314 B, alles im Raum-Chunk).
Rollback: Parent-Commit `d30092c`.
Korrektur (ROOM5-04): Der Begriff „Home Row“ bzw. „Grundreihe“ war von mir erfunden. Im Programm heißt das **Keyboard Extension** („Three pitch rows: 1–0 · Q–P · A S D F … · 32 positions“). Siehe `docs/PATCH_ROOM5-04.md`.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Headless-Chromium). **Nicht:** abgehört, USER_ACCEPTED, Firefox/Safari, Netlify.

## 1. Mandala: Ursache und Neubau
**Ursache der Unschärfe:** In ROOM5-02 wurde die Figur zur Entlastung auf eine Fläche von 275 × 145 gezeichnet und auf das Pad hochgezogen (ein Viertel der Auflösung). Die Linien wurden dadurch weich.
**Jetzt:** eigene Zeichenfläche hinter dem Pad in **voller Pad-Auflösung** (1100 × 580), vom Test geprüft. Zwei Dinge in einem Bild:
- die Stereo-Figur (linker gegen rechten Kanal) als feine Linien, 12-fach gespiegelt/gedreht;
- ein Ring aus **Spektrum-Blättern** (logarithmisch verteilt, laute Teiltöne wachsen nach außen, über die Zeit geglättet).
Farbe folgt der Tonhöhe des Balls (eine Umdrehung je Oktave), Nachleuchten über langsames Ausblenden.

**Warum es trotzdem leicht bleibt (gemessen):** In software-gezeichneten Canvas kostet ein Strich mit Breite 1,1 px etwa das 25-fache eines Haarstrichs (Breite genau 1), und additive Überblendung etwa das 6-fache von normalem Zeichnen. Das Bild besteht deshalb aus **einem Haarlinien-Pfad je Farbband** (3 Pfade statt Dutzender Striche), ohne additive Überblendung. Messung Headless (Software-Raster, höchste Stufe: 12 Arme, 256 Punkte, 96 Blätter): Hauptthread 48 %, die erste Fassung mit dicken Strichen lag bei 94–99 %. Auf einer Grafikkarte liegt es deutlich darunter.
**Automatische Stufen:** Das Bild darf Bilder verlieren, der Ton nie. Der Zeichner beobachtet seine Bildrate (nur solange etwas klingt) und schaltet bei weniger als etwa 40 Bildern/s eine von 4 Stufen herunter (4 Arme, jedes zweite Bild), bei Luft wieder hinauf (frühestens nach 4 s, mit Sperre gegen Pendeln). Aktuelle Stufe: `data-quality` am Canvas.

## 2. Tastatur wie im Hauptraum, so viele Tasten wie nötig
- Reihen: **1–0, Q–P und die dritte Reihe (A … Ö Ä # bzw. A … ; ' /)**: 32 Tasten laufen nacheinander durch das Raster. Die dritte Reihe folgt der DE/EN-Tastaturwahl des Hauptraums (`__XenKeyboardLayout`, `__xenThirdKeyboardRowIndex`), also dieselbe Logik wie im „Keyboard Extension“-Modus des Live-Raums, hier immer an.
- Das hervorgehobene Tastenfenster im Pad (hellere Linien) umfasst entsprechend 32 Stufen (ansichtsweise Erweiterung der Parameter, nichts davon wird gespeichert).
- Wie im Live-Raum: gesperrte Stufen bleiben still, `[` / `-` verschiebt das Fenster, Shift = lauter; Piano-Ansicht spiegelt über alle 32 Tasten (links = tief).
- **Hotkey-Schutz wie im Live-Raum:** Textfelder behalten ihre Tasten (`Qp`, die Funktion des Live-Raums), Auswahlfelder und Knöpfe schlucken keine Töne mehr. Vorher blockierte ein fokussiertes Auswahlfeld (z. B. „Grid mode“) alle Tasten. Ein Klick aufs Pad nimmt den Fokus vom Steuerelement (wie im Live-Raum).

## 3. Umschalt-Logik (Hotkeys)
Unverändert dieselbe Funktion wie im Live-Raum (`pPe`): `, ;` / `. :` Rastersystem, AltGr oder rechte Strg Modus. Neu: Die Hotkeys greifen auch bei fokussiertem Auswahlfeld, die Third-Row-Priorität gilt wie dort (eine Taste der dritten Reihe ist zuerst eine Note), und eine Statuszeile meldet das neue Raster („Grid: 19 EDO · Dorian“). Getestet mit Fokus auf einem Auswahlfeld und nach einem Padklick.
Falls es dir bei den Hotkeys um etwas anderes ging (z. B. weitere Tasten aus dem Live-Raum wie M/N für Modi der Partikel oder Tab fürs Quantisieren), sag es: die gehören zu Partikeln/Quantisierung, die Raum V nicht hat.

## 4. Basis für die spätere Verschaltung mit dem Live-Raum (nur vorbereitet, nichts verschaltet)
Dein Plan: Synthesizer im Live-Raum auf **Enter bzw. linke Maustaste** und auf die **Tastatur** legbar, **kein Enter-Hold**, **keine Visualisierung im Live-Raum**.
Was dafür jetzt schon stimmt:
- Die Tonhöhenquelle ist das Raster des Hauptraums und die Tastenbelegung dessen Funktionen: im Live-Raum fällt kein zweites System an.
- `PsyEngine` wird vom Chunk **exportiert** und hat die Option `{visual:false}`: dann entstehen **keine Analyser**, keine Zeichenfläche, keine Raum-Oberfläche. Der Test `room5_engine_visual_flag` prüft das. Ein Live-Raum-Anschluss lädt den Chunk beim ersten Gebrauch (`__xenLoadDeferred("psylab")`) und erzeugt `new PsyEngine({visual:false})`; solange er nicht genutzt wird, kostet er nichts (Chunk bleibt inert).
- Die Mandala-Zeichnung lebt ausschließlich in der Raum-Komponente, nicht in der Engine.
Was noch fehlt (bewusst nicht ohne Rückfrage gebaut):
1. Zuordnung in den Live-Raum: Enter/linke Maustaste lösen die Note in der Cursor-Tonhöhe aus (Anschlag/Loslassen, ohne Hold); Tasten spielen wie die anderen Tastenklänge. Der Live-Raum hat dafür `waveStarterPreset`/Klangwahl; hier ist zu entscheiden, wo die Auswahl „Psy-Synth“ sitzt.
2. Patch-Wahl im Live-Raum (aktuell Raum-V-Arbeits-Patch) und Lautstärke im Live-Mixer.
3. Lebenszyklus: Engine nur bei Gebrauch, beim Verlassen/Power-Aus abräumen; dieselbe Wartung wie bei den anderen Live-Stimmen (`__xenSharedVoiceLease`).
4. Hörtest und Lastmessung im dichten Live-Spiel (Audio-Thread: 6 Stimmen ≈ 280–400 µs je Block bei Budget 2 900 µs).

## Quelländerungen und Tests
Quelle: `src/post-oct/034-xen-room-psylab.js` (Mandala-Zeichner, Qualitätsstufen, Tastenlogik, `PsyEngine` exportiert). Tests: `room5_psylab` (erweitert: dritte Reihe, Hotkeys bei Fokus auf Auswahlfeld, Padklick nimmt den Fokus, Mandala-Auflösung/Farbe/Ausblenden), neu `room5_engine_visual_flag`. `run_tests.sh` 110/110, `run_e2e.sh` alle Läufe grün, `build.py --check` OK.

## Offen
- Das Mandala hat keine eigene Speicherung/Optionen (Stufe automatisch); eine feste Wahl „Qualität: hoch/niedrig“ wäre schnell ergänzt.
- Keine Messung auf echter Grafikkarte möglich: die Stufenwahl ist deshalb adaptiv.
- Nicht geprüft: Firefox, Safari, Netlify; kein Abhörtest.
