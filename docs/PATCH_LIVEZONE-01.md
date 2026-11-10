# LIVEZONE-01: Live-Bereich schläft in der Material Forge

| | |
|---|---|
| Basis | `main` = `livepath-02`, `index.html` 8 560 617 Bytes, SHA-256 `aec64584fb7a98e70b1c2e80286007b8f7f509db410c53d914e2d0ffeb5f5961` |
| Ergebnis | `index.html` 8 562 192 Bytes, SHA-256 `3fbf955c10d0367881bb1860b81cb7d0793eb826f89f6cfee70ae372761611bb` |
| Größenzuwachs | **+1 575 Bytes** (nichts Neues zu laden, daher kein Lazy-Bedarf) |
| Zone | Grenze WARM/KALT (Raumwechsel). Der heiße Pfad wird nicht verändert: Es werden nur die vorhandenen Ausschalt-Owner aufgerufen, einmal pro Raumwechsel. |
| Daten-Owner | Raum: `REe` (`room`/`setRoom`). Power: `__f447TogglePower` (Ausschalt-Zweig). Myzel: `setMyzelEnabled` + `setInstallationSoundEnabled` (derselbe Pfad wie `xensonar:mycelium-session-engaged` bzw. der Myzel-Schalter). Aufnahme: `Ea.recordingActive`, `__XenLoopRec` (nur gelesen). Keine Persistenz berührt. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). **Nicht:** Gerätetest, Abhören, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Verhalten

- **Live-Bereich** = Live Room + Nodal Center. Wechsel zwischen den beiden ändert nichts.
- **Wechsel in die Material Forge** (`L3LAB`): Live-Power aus (derselbe Pfad wie der Power-Knopf, inklusive „Echo aus“) und Myzel/Installationsklang aus.
- **Die Knotenformation bleibt erhalten** und wird nicht angefasst.
- **Kein automatisches Wiederanlaufen** bei der Rückkehr.
- **Laufende Aufnahme** (Rec oder Loop-Rec): Rückfrage. OK schaltet aus (die Aufnahme nimmt danach Stille auf), Cancel lässt den Live-Bereich weiterlaufen (bisheriges Verhalten).
- Das Vorhören in der Forge (Melodic Loop mit Drums) ist unberührt, weil es über einen eigenen AudioContext läuft.

## Quelländerungen

- `src/app/forge/01_room_shell.js`: Effekt `LIVEZONE-01` direkt vor dem `return` von `REe`. Er reagiert nur auf den Übergang vom Live-Bereich in einen kalten Raum.
- `src/forge/editor/07_view_lifecycle.js`: `__xenIsColdRoom(room)` (heute nur `L3LAB`; Raum IV kommt später hier dazu).
- Diff gegen die Basis: genau diese zwei Einfügungen. Restliches HTML bytegleich; 32 Scripts / 77 Styles; nur Script-Block 12 geändert.

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `python3 tools/build.py --check` | OK |
| Syntax aller ausführbaren Scripts | wie Basis (einziger Fehler: das `type="module"`-Script mit Top-Level-`await`, das schon in der Basis auftritt und zum Prüfverfahren gehört) |
| `node tools/probes/livezone_probe.js` (echtes Layout, echte Knöpfe) | Live an → Nodal: hörbar (RMS 0,14), Scheduler läuft. → Live: hörbar. → **Forge: still, 0 Ticks, 0 Starts, 60 rAF/s.** → Live: bleibt aus. Myzel an → Forge: **still**; zurück: Schalter zeigt „Mycelium · OFF“. Rec läuft → Forge: Rückfrage erscheint; Cancel: Live läuft weiter (RMS 0,30); OK: still. Keine Seitenfehler. |
| Formation | Myzel an → Forge → zurück → Myzel an: alle Knoten (Ratios und Positionen) identisch; nur Ball und Linien bewegen sich wie live üblich. |
| `node tools/probes/room_activity_probe.js` | Forge mit zuvor eingeschalteter Power: **Basis 42 Ticks/s, 6 Starts/s, 3 rAF-Schleifen, hörbar → jetzt 0 / 0 / 1, still**; Hauptthread 2–3 % wie zuvor. (Phasen E–G der Probe sind auf das alte Verhalten beschriftet: dort schaltet der Power-Klick nun ein statt aus.) |
| Negativtest | Wechsel Live ↔ Nodal mit Power an: kein Ausschalten (Schritte 2–3). Cancel bei laufender Aufnahme: kein Ausschalten (Schritt 8). |

## Offene Risiken

- Die Rückfrage erscheint, nachdem der Raum schon gewechselt hat. Bei Cancel ist man trotzdem in der Forge, nur der Live-Bereich läuft weiter.
- Der AudioContext bleibt nach dem Ausschalten `running` (Kandidat K2, eigener Patch nach dem Vorbild `__xenAuditionScheduleIdle`).
- Ältere Spielräume (`XENPOLAR`, `GAME`, `COMMONS` u. a.) gelten nicht als kalt; Verhalten dort unverändert.
- Nicht auf Geräten, Firefox oder Safari geprüft; nicht abgehört.

## Rückweg

Zweig `version/livepath-02` bzw. Basis-`index.html` mit SHA `aec64584…5961`. Im Quellbaum: die beiden `LIVEZONE-01`-Einfügungen entfernen und `python3 tools/build.py` ausführen.
