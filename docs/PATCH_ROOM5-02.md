# ROOM5-02 · Raum V auf dem Main-Room-Raster, Metronom, Doppelstrukturen (12.11.2026)

Parent: ROOM5-01 (`8b38ef7`), `index.html` 9 000 295 B, SHA-256 `6d598ab8fd3ec720de20c10e627312b715fc82473c2b6f68ad668757823cd5e7`.
Ergebnis: `index.html` 9013788 B, SHA-256 `25d7a2d39b518da43dbdc0c4df3edcf71689abeb88c7dee4380d70b24a39435d` (**+13493 B**; Raum-Chunk 52,9 → 64,0 KB, Hauptbündel rund +4,5 KB, Nodal-Chunk −2,0 KB).
Rollback: Parent-Commit `8b38ef7`.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Headless-Chromium, echtes Layout). **Nicht:** abgehört, USER_ACCEPTED, Firefox/Safari, Netlify.

## Was der Nutzer wollte, was daraus wurde
| Wunsch | Umsetzung |
|---|---|
| Metronom mit BPM, **nicht** mit aufgenommen | Eigener Klick direkt auf `ctx.destination` (nicht auf den Live-Master-Eingang). BPM, Schläge pro Takt (frei, auch 3,5), Lautstärke, Tap, „= Live BPM“, Taktpunkt. **Gemessen:** Take mit laufendem Metronom → WAV exakt still (Spitze 0), Kontrolltake mit gespielter Note → Spitze 0,71; am Lautsprecher-Abgriff ist der Klick hörbar (> 0,05), nach dem Ausschalten still. |
| Blaue Dreiecke des Live-Raums übernehmen (links = Pitch hoch/tief wie dort) | Derselbe Zeichencode (siehe unten) und dieselbe Klicklogik: Klick = Stufe stumm/an, Ziehen = Feinstimmung (1 Einheit je 25 px, aufwärts erhöht), Rechtsklick = Linie wird Rasterbasis, Mauszeiger `ns-resize`. Alles schreibt ins **Raster des Hauptraums** (Mutes, Offsets, Basis). |
| Klavierlogik (tief links, hoch rechts) als Variation | Schalter „View: Main Room ↕ / piano ↔“. Die Ansicht dreht die Ebene um 90°, der Zeichencode ist derselbe; Dreiecke liegen dann oben. Die Tasten folgen der Ansicht (links = tief). |
| Durchschaltlogik des Live-Raums | `, ;` / `. :` = Rastersystem zurück/vor, AltGr / rechte Strg = Modus, `[` und `-` = Tastenfenster. Es ist **dieselbe Funktion** (`pPe`) mit denselben Bausteinen wie im Live-Raum, nicht nachgebaut. Tasten 1–0 und Q–P spielen das Raster wie im Live-Raum (`wF`, Fenster, gesperrte Stufen bleiben still). |
| Doppelstrukturen suchen, Raster-Werkbank ansehen | siehe Tabelle unten. Das Tipp-Skalenfeld (`19edo`, `1/1 9/8 …`) ist **entfallen**: Rastersystem, Modus, Basis, Verschiebung und die Raster-Werkbank (eigene Perioden, Stufenzahl, Cent) sind das schon, ohne Tippen. |
| Cursor und Wellenstarter-Ball | Zeiger = Cursor (Kreuz/Glow), der Ball folgt gedämpft und rastet bei „Snap“ auf die nächste Linie, gestrichelte Verbindung, pulsierender Ball, **die Rasterlinie wird grün** und leuchtet um den Ball (selber Code wie im Live-Raum). „Grid lines“ und „Snap ball to grid“ schalten dieselben Parameter (`gridOn`, `lockCursorToGrid`) wie dort. |

## Doppelstrukturen: neu, wiederverwendet, noch doppelt
| Bereich | Zustand |
|---|---|
| Raster (Tuning, Modus, Basis, Mutes, Offsets) | **Wiederverwendet.** Owner bleibt der Hauptraum (`nexusParams`). Raum V und Raum III lesen/schreiben über die vorhandene Brücke `__NodalBallGrid` (erweitert um `rows`, `toggleMute`, `setOffset`, `windowOffset`, `shiftWindow`, `resetWindow`). |
| Raster-Steuerelemente (System, Modus, Basis Hz, Shift, Werkbank) | **Zusammengezogen.** Neue Komponente `__XenGridControls` im Hauptbündel; Raum III (Nodal, Installation) benutzt sie jetzt auch. Vorher: 28 Zeilen Kopie im Nodal-Chunk. |
| Zeichnen von Linien, grüner Linie, Dreiecken, Cursor und Ball | **Zusammengezogen.** Aus der Live-Zeichenfunktion `V2e` unverändert herausgelöst nach `__xenDrawMainGridLayer`; Live-Raum und Raum V rufen sie auf. **Beweis:** Test `room5_grid_layer_equivalence` vergleicht in der echten App die Canvas-Befehle der alten `V2e` (Fixture aus dem Parent) mit der neuen in 6 Zuständen (Raster aus/an, Cursor frei, gerastet mit grüner Linie, gesperrte Stufen + Offsets, 19-EDO mit Fensterversatz, JI): 46 bis 1 950 Befehle je Fall, **identisch**. |
| Schwellen der Dreiecks-Klicks (30 px Zone, 12 px Reichweite, 25 px je Einheit) | **Zusammengezogen** in `__XenGridHandles`; die Live-Handler (Hover, Rechtsklick, Ziehen) benutzen sie jetzt auch. Die Struktur der Live-Handler ist unverändert; Test `live_grid_handles` prüft Klick, Ziehen, Rechtsklick und Cursor im Live-Raum. |
| Tastenbelegung und Rastertasten | **Wiederverwendet** (`AJ`, `HJ`, `VJ`, `wF`, `pPe`, `dJ`, `mJ`, `yJ`). |
| Ton-/Pitch-Quelle | Neu war ein zweites Skalensystem (`parseScale` …) in Raum V. **Entfernt** (−1,7 KB). Die Kristall-Resonatoren folgen dem Raster des Hauptraums. |
| Raum-Brücke zum Master, Float-WAV, Multitrack-Eingang | Wiederverwendet (`__xenMultitrackBridge`, `__xenRecorderFloatWav`, `__XenMultitrackInbox`). |
| Synthese-Engine, Treppe, Spiralecho, Chaos, Pad-Oberfläche, Scope | **Wirklich neu.** |
| Metronom-Klick | **Noch doppelt:** Raum IV hat seinen eigenen (an Takt-Position und Vorzähler gebunden), Raum V eine kleine Klasse (~25 Zeilen). Nicht zusammengezogen, weil Raum IV an Position/Vorzähler hängt. **Auffällig:** Raum IV führt den Klick über den Master-Eingang `main`; nach den Messungen hier ist das der Pfad, den Rec aufnimmt. Das Metronom von Raum IV wäre also vermutlich **in der Aufnahme**. Nicht geprüft, nicht geändert. |
| Worklet-Modul laden (blob/data-Fallback) | **Noch doppelt** an ~6 Stellen im Programm (Recorder, EQ, Raum V …). Ein gemeinsamer Lader wäre sinnvoll, ändert aber Audio-Startpfade: eigener Schritt mit Hörtest. |
| Patch-Bibliothek (Auswahl, Speichern, Löschen) | Ähnlich zu Entrophon „Save Sound“ und Hold-Pattern-Speicher, aber mit eigenem Parameterformat: bewusst eigener Speicher (`xensonar.psylab.instruments.v1`). |

## Zone und Daten-Owner
- **KALT**, solange der Raum zu ist (unverändert). Im offenen Raum: Zeichnen nur sichtbar (`document.hidden`), Scope-Figur auf kleiner Zusatzfläche hinter dem Pad (vom Browser skaliert), nur jedes zweite Bild. Gemessen (Headless, Software-Raster): Hauptthread 85 % → 20 % bei gehaltener Note, Live-Raum zum Vergleich 23 %.
- **HEISS** beim Spielen: Engine und Audio-Thread unverändert (0 GC im Trace, 6 Stimmen 220–295 µs je Block). Das Metronom plant 120 ms voraus auf der Audiouhr, Timer läuft nur, solange es klingt.
- **Daten-Owner:** Raster = Hauptraum. Raum V speichert (`localStorage` `xensonar.psylab.instruments.v1`) Arbeits-Patch, eigene Patches, Hold, Ansicht, Oktave, Metronom-Einstellungen (Ein/Aus wird nie gespeichert). Patches aus ROOM5-01 behalten ihre Felder `scale`/`root` unangetastet (nicht gelöscht, nicht mehr benutzt); Werks- und neue Patches tragen stattdessen einen Vorschlag `grid` (z. B. „Just Intonation“), der als Knopf „Grid → …“ erscheint und das Hauptraum-Raster nur auf Klick umstellt.

## Quelländerungen
`src/post-oct/034-xen-room-psylab.js` (Raum), `src/rhythm/03_live_drum_bodies.js` (`__xenDrawMainGridLayer`, `V2e` ruft sie), `src/rhythm/02_bass_and_rack.js` (`__XenGridHandles`), `src/nodal/13_installation_ball_grid.js` (Brücke, `__XenGridControls`), `src/rooms/nodal.js` (benutzt `__XenGridControls`), `src/app/forge/01_room_shell.js` (Brücke gebunden an Raster-Funktionen). Tests: `room5_psylab_engine`, `room5_metronome` (Node); `room5_psylab`, `room5_grid_layer_equivalence`, `room5_metronome_not_recorded`, `live_grid_handles` (Browser, Probe-Build).

## Prüfungen
`run_tests.sh` 109/109, `run_e2e.sh` alle Läufe grün, `build.py --check` OK. Raum III (Nodal, Installation, „Cross grid lines“) geprüft: Raster-Steuerung und Raster-Werkbank öffnen mit der gemeinsamen Komponente, Umschalten auf 19 EDO funktioniert (manuell per Skript, kein eigener Test).

## Offen / Grenzen
- Rechtes (Bass-)Raster mit den violetten Dreiecken ist in Raum V **nicht** übernommen (nur das linke Hauptraster); es hängt am Bass-Owner und hat dort eine andere Rolle.
- Im Live-Raum sind die Dreiecke nur bei laufendem Power bedienbar; in Raum V auch ohne Power (das Raster gehört dem Hauptraum und ist immer da).
- Piano-Ansicht: Linienbeschriftungen stehen gedreht (90°).
- Werks-Patches klangen mit ihrer früheren Skala besonders (JI usw.); jetzt gilt das Raster des Hauptraums (Vorgabe 12 EDO Aeolisch, viele Stufen stumm). „Grid → …“ schaltet bei Bedarf um; die Stufen-Stummschaltung des Modus bleibt Sache des Hauptraums.
- Tastenfenster: Wie im Live-Raum liegen 20 Tasten auf 20 Rasterstufen (unter 37 sichtbaren); `[` / `-` verschiebt das Fenster. Unter der Oktavtaste verschiebt sich alles um Oktaven.
