# VARIANTE-ROOM-01 · „Xensonar Variante“ aus dem Full-Build wieder eingebunden

Parent: `PARTICLE-HEAD-01` (`0d67aae`). Rollback: dieser Commit davor.
Zone: **KALT** (eigener lazy Raum-Chunk, bei Start nicht ausgewertet; Test). Audio nur, solange der Raum offen und gezündet ist.
HTML-Größenzuwachs: **+74 776 Bytes** (`index.html` 8 185 900 → 8 260 676; der Chunk ist ~100 KB unverdichtet, verdichtet ~75 KB).
Status: CODE_PRESENT, UNIT_VERIFIED (`tests/variante_port.test.cjs`), BROWSER_CHECKED (`tests/e2e/variante_room.cjs`, Pegel gemessen). **Nicht gehört, nicht im Zusammenspiel mit laufender Art-Installation (Mycelium an) geprüft.**

## Problem
In Art Installation · Field Access führte **Xensonar Variante** auf den Platzhalter „Xenpolar is archived in the Core build“ (Übergangslösung). Entscheidung des Nutzers: entweder Knopf weg oder Verbindung wie im Full-Build wiederherstellen.

## Fund (Wiederherstellung war möglich)
- `reference/ts-400.2` hat die TypeScript-Quelle der Variante, wie sie zur jetzigen Verdrahtung passt: `src/features/xensonar/family/refactor/` (15 Dateien, ~105 KB; Raum `XensonarRefactorRoom`, Audio-/Frame-/Tastatur-Hooks, Rendering, Voice-Runtime).
- Die vom Nutzer gelieferte ZIP `Xensonar_3.2.91.5.45_full_browser_test_source.zip` bestätigt den Aufbau (dort älterer, monolithischer `XensonarRefactorRoom.tsx`, 76 KB; Familie als `MainRoom`) und enthält **auch die vier eingebetteten Standalone-Apps** (`public/xensonar-family-standalone/*.html.gz.b64`: Resonanzwerk, Zone, Archiv-Seitenzweig, Melodie Quest/Resonanzwanderer). Diese Nutzlasten fehlten bisher im Repo (daher die erste, falsche Annahme „nicht auffindbar“ in einem verworfenen Entwurf).
- Die Variante selbst ist **kein** Standalone-HTML, sondern ein natives React-Modul ohne Fremdabhängigkeit (nur Typen aus Microto, zur Laufzeit gelöscht). Der Platzhalter-Raum in diesem Build bekam die Props schon durchgereicht (`requestedFamilyActive`, `sharedFieldController`, `onEnterResonance`), `Poe` ignorierte sie.

## Was gebaut wurde
- `tools/variante/` : unveränderte Kopie von `family/refactor` + `entry.tsx` (kleiner Host: Starter-Karte, Zurück-Knöpfe) + zwei Shims (React → `P` des Bündels; gemeinsamer Audio-Ausgang → `__xenMultitrackBridge`, derselbe Live-Master-Eingang wie Psy Lab).
- `tools/port_variante.cjs` (esbuild aus `tools/slim`) erzeugt `src/post-oct/035-xen-room-xenpolar.js` (**generiert, nicht von Hand ändern**; `--check` vergleicht, Test hängt daran).
- Verdrahtung wie bei Multitrack/Psy Lab: Manifest-Abschnitt `js-020d-xen-room-xenpolar`, `<script type="application/x-xensonar-room" id="xen-room-xenpolar">` im Template (jetzt 37 statt 36 Skripte), Loader-Art `xenpolar` (+ Status), `Poe` rendert für `XENPOLAR` den lazy Raum statt `S2`.
- Ablauf: Knopf → Raum **Xensonar Variante · Interaktives Resonanzfeld** (Zündung starten, Ripples, Pulswellen, Drone, Rec). „← Xensonar Familie“ → Starterkarte, „← Live Room“ → Live Room.

## Audio / Daten
- **Kein zweiter AudioContext:** läuft auf dem Live-Kontext, in den Live-Master (`getMasterInput`); fällt nur ohne Brücke auf einen eigenen Kontext zurück (wie im Full-Build). Test: Kontextzahl unverändert, RMS ≈ 0,23 beim Spielen, ≈ 0,0002 nach Verlassen.
- Keine Persistenz, kein Daten-Owner, keine Migration.

## Offen (bewusst nicht in diesem Schritt)
- **Der Rest des Full-Builds**: Xensonar-Familie (Resonanzwerk, Zone, Archiv-Seitenzweig als Standalone-Apps, +~0,74 MB Base64-Nutzlast), Arcade-Spiele **Melodic Quest / Resonanzwanderer** (Nutzlast `melodieQuest`, +~0,14 MB; mit Interpretationsbrücke zu Xensonar/Forge), **Xenpolar 3** und **Irrlicht Arena** (Microto-/Arena-Quellen, ~1,9 MB TypeScript, eigene Engines). Alle liegen in der ZIP bzw. in `reference/ts-400.2` und lassen sich in derselben Weise als lazy Chunks einbinden; das ist eine Größenentscheidung (zusammen etwa +1 MB bis +3 MB `index.html`) und gehört dem Nutzer.
- Zusammenspiel mit der Art Installation (gemeinsame Canvas, `sharedFieldController`) ist verdrahtet, aber nicht getestet.
- Platzhalter `S2` bleibt für `MAIN`/`GAME`.

## Tests
`tests/variante_port.test.cjs` (Chunk = Generator-Ausgabe, wertet kalt aus, Verdrahtung), `tests/e2e/variante_room.cjs` (Knopf → Raum, Klang, kein zweiter Kontext, still nach Verlassen, Rückwege).
