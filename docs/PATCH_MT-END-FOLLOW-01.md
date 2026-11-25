# MT-END-01 · MT-NAV-SEEK-02 · MT-FOLLOW-01 · MT-END-02 — Multitrack-Transport

Parent: `e316d29` (Zweig `claude/charming-franklin-wouegz`, Basis `release/2026-11-23-nodal-arch`). Rollback: diesen Commit zurücknehmen.
Datei: `src/post-oct/032-xen-room-multitrack.js` (Raum V · Multitrack). Kein Eingriff in Audio-Planung, Export oder Projektformat.

## Fehler
- **Play läuft bis zum Ende, der Knopf bleibt auf Stopp.** Ursache: Ohne Loop plant die Engine ein Segment bis unendlich (`segs=[{…, b: Infinity}]`). Nach dem letzten Clip lief sie still weiter, Playhead und Stopp-Knopf blieben.
- **Navigator-Klick spult nur außerhalb des Ansichtsfensters.** MT-NAV-SEEK reagierte nur auf den Klick neben das Fenster (`jump`). Ein Klick ins Fenster (der Normalfall, wenn der Song ganz sichtbar ist) verschob nur die Ansicht.

## Änderung
- **MT-END-01:** Ohne Loop stoppt die Wiedergabe von selbst, sobald Song-Ende (Ende des letzten Clips) plus 1,5 s Hall-/Echo-Nachklang durch ist. Der Knopf zeigt wieder Play, der Cursor bleibt am Startpunkt, Status: „End of the song“. Nicht während einer Aufnahme und nicht, wenn hinter dem Song-Ende gestartet wurde (z. B. Metronom-Üben).
- **MT-NAV-SEEK-02:** Während der Wiedergabe spult ein Klick ohne Ziehen überall im Navigator (auch im Ansichtsfenster und auf seinen Rändern). Ziehen verschiebt bzw. zoomt weiter nur die Ansicht.
- **MT-FOLLOW-01 (neu):** Die Ansicht läuft beim Abspielen seitenweise mit. Verlässt der Playhead den sichtbaren Bereich, springt die Ansicht so, dass er links im Bild steht. Knopf „Follow“ neben „Snap“, Standard an, im Browser gemerkt. Nicht, während der Navigator gezogen wird.
- **MT-END-02 (neu):** Taste Ende setzt den Cursor auf das Song-Ende (Pos1 = Anfang gab es schon).

## Prüfung
- Neu: `tests/e2e/mt_end_and_navseek.cjs`. 3-s-Clip: stoppt selbst, Play-Knopf zurück, Cursor bleibt. Klick ins Ansichtsfenster spult, Ziehen spult nicht. Gezoomt: Ansicht blättert um, Playhead im Bild; Follow aus: Ansicht bleibt. Ende-Taste. Grün. Gegenprobe davor: „Wiedergabe stoppt am Song-Ende nicht“.
- Weiter grün: `multitrack_playhead_navseek`, `mtw01_delivery`, `mtw02_fades_meters`, `mtw04_level_and_input`, `multitrack_projects_tempo` (+ siehe Commit).
- Nicht gehört.

## MT-MASTER-01: Master-Kanal (Glue · Tape · Air · Limit)
Aus dem Review `docs/REVIEW_LIVE_FX_2026-11-25.md`, Schritt 1 (Idee aus Live Mastering, neu gebaut).
- `buildMasterStrip` (`032`): **eine** Kette für Abhören (Web Audio) **und** Mixdown (`OfflineAudioContext`), damit beides gleich klingt.
  - Glue: Bus-Kompressor, Schwelle −4 … −26 dB, Ratio 1 … 4, ohne eigene Aufholverstärkung, weil der Web-Audio-Kompressor selbst aufholt.
  - Tape: tanh-Sättigung, 4× Oversampling; 0 = linear.
  - Air: High-Shelf 9 kHz, −6 … +9 dB.
  - Limit: weicher Begrenzer `lim·tanh(x/lim)`, 4× Oversampling, Decke −12 … −0,1 dB. Er überschreitet die Decke nie. Ein Kompressor wurde bewusst **nicht** als Limiter genommen, weil seine automatische Aufholverstärkung den Pegel anhob statt ihn zu sichern.
- Aus (Standard) = nicht im Signalweg: Der Mixdown ist bitgleich zu vorher. Stems, Lautheitsangleich und „unity“-Renders bleiben roh.
- Projektformat: `master.strip {on, glue, tape, air, ceil}`, fehlt = aus (keine Migration). Undo-fähig. Ein-/Ausschalten während des Abspielens startet an der aktuellen Stelle neu; Reglerwerte gleiten live.
- Oberfläche: Knopf „Master FX“ neben dem Master-Regler; an = vier Regler mit Wertanzeige. Die Regler gehen vom aktuellen Projektstand aus, damit zwei schnelle Änderungen sich nicht überschreiben.
- Test: `tests/e2e/mt_master_strip.cjs`. Roh −6,31 dBFS → Limit −12 / Tape 60 % → −11,96 dBFS; wieder aus = bitgleich; Pegelanzeige beim Abspielen. Grün. Regression grün: `mtw01_delivery`, `mtw02_fades_meters`, `mt_end_and_navseek`, `multitrack_projects_tempo`.
