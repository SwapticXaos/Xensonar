# LIVEZONE-02: Rückfrage vor dem Wechsel, Live-Kontext schläft in der Forge

Baut auf LIVEZONE-01 auf (`docs/PATCH_LIVEZONE-01.md`).

| | |
|---|---|
| Basis | LIVEZONE-01, `index.html` 8 562 192 Bytes, SHA-256 `3fbf955c10d0367881bb1860b81cb7d0793eb826f89f6cfee70ae372761611bb` (Ursprung: `livepath-02`, `aec64584…5961`) |
| Ergebnis | `index.html` 8 563 535 Bytes, SHA-256 `089349a9b460c1c2761b58e576fe968bd18f268373ea32c610d8fd45f90959cd` |
| Größenzuwachs | +1 343 Bytes gegenüber LIVEZONE-01, +2 918 Bytes gegenüber `livepath-02` |
| Zone | Grenze WARM/KALT (Raumwechsel) und AudioContext-Lebenszyklus. Kein Knotengraph, keine Parameter, kein Scheduler verändert. |
| Daten-Owner | Raum: `Yde()` (`setRoom` mit Leave-Guard), Shell `REe`. Live-Kontext: `ensureAudioReady` bleibt Owner und weckt selbst auf. Aufnahme nur gelesen. Keine Persistenz berührt. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). **Nicht:** Gerätetest, Abhören, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Änderungen

1. **Rückfrage vor dem Wechsel.** `Yde()` gibt jetzt einen `setRoom` zurück, der zuerst einen Leave-Guard fragt (`roomLeaveGuardRef`; funktionale Updates gehen am Guard vorbei). Die Shell setzt den Guard: Wechsel vom Live-Bereich in einen kalten Raum, Live oder Myzel an, Aufnahme läuft → `confirm`. **OK** wechselt und schaltet aus, **Cancel bleibt im Raum**, alles läuft weiter.
2. **Live-Kontext schläft in der Forge.** Nach dem Wechsel in einen kalten Raum (auch wenn schon alles aus war) wird der Live-AudioContext nach **1,5 s** angehalten (Ausklänge enden vorher), sofern er läuft und nichts aufnimmt. Beim Wechsel zurück in den Live-Bereich wird er sofort wieder gestartet, nur wenn dieser Patch ihn angehalten hat. Startet in der Forge eine Aufnahme, weckt `ensureAudioReady` den Kontext wie bisher selbst auf.
   - Begründung: In der Forge nutzt niemand den Live-Kontext. Vorhören (Melodic Loop, Drums) und Wave Editor laufen in eigenen Kontexten, die sich selbst anhalten (`__xenAuditionScheduleIdle`, Wave Editor `suspend()` beim Stopp). Das Vorhören von Materialspuren nutzt ein `Audio`-Element. Die Forge-Props enthalten keinen Live-Kontext.

Quellen: `src/rhythm/02_bass_and_rack.js` (`Yde`), `src/app/forge/01_room_shell.js` (Destrukturierung `roomLeaveGuardRef`, Block `LIVEZONE-01/02` vor dem `return` von `REe`). 32 Scripts / 77 Styles, nur Script-Block 12 geändert; Syntax wie Basis.

## Prüfungen (`node tools/probes/livezone_probe.js`, echtes Layout)

| Schritt | Raum | Kontext | Pegel | Ticks/s |
|---|---|---|---|---|
| 1 Live, Power an | Live | running | 0,14 | 42 |
| 2 → Nodal (Live-Bereich) | Nodal | running | 0,14 | 41 |
| 3 → Live | Live | running | 0,07 | 41 |
| 4 → Forge | Forge | **suspended** | 0 | 0 |
| 5 → Live (bleibt aus) | Live | **running** | 0 | 0 |
| 6 Art Installation, Myzel an | Nodal | running | 0,11 | 0 |
| 7 → Forge | Forge | **suspended** | 0 | 0 |
| 7b Myzel-Schalter nach Rückkehr | | | „Mycelium · OFF“ | |
| 8–10 alles aus: Live → Forge → Live | | running → **suspended** → running | 0 | 0 |
| 11 Power an nach Rückkehr | Live | running | **0,31 hörbar** | 42 |
| 12 Rec läuft → Forge, **Cancel** | **bleibt Live** | running | 0,13 | 43 |
| 13 Rec läuft → Forge, **OK** | Forge | **running** (Aufnahme → kein Anhalten) | 0 | 0 |

Keine Seitenfehler; zwei Rückfragen genau bei 12 und 13.

## Offene Risiken

- In der Forge fordert die Steuer-Uhr `EY` weiter 60 Frames/s an, führt aber bei angehaltenem Kontext keine Aufgaben aus (`shouldRun`). Kosten vernachlässigbar; nicht geändert.
- Code, der den Live-Kontext in der Forge ohne `ensureAudioReady` benutzt, bliebe stumm, bis man zurückwechselt. Im Code nicht gefunden; Hinweise darauf beim Abhören bitte melden.
- Nach dem Wiederaufwecken: Latenz des ersten Tons und Firefox/Safari nicht geprüft.
- Ältere Spielräume (`XENPOLAR`, `GAME`, `COMMONS`) sind nicht kalt; unverändert.

## Rückweg

LIVEZONE-01 (`3fbf955c…11bb`) oder `livepath-02` (`aec64584…5961`). Im Quellbaum: `Yde` auf `return{room:e,setRoom:t,…}` mit `[e,t]=P.useState("RESONANCE")` zurücksetzen, die Destrukturierung `roomLeaveGuardRef` und den Block `LIVEZONE-01/02` in `REe` entfernen bzw. auf den Stand von LIVEZONE-01 zurücksetzen, dann `python3 tools/build.py`.
