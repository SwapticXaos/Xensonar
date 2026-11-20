# LOOPREC-SEAM-01 · Loop-Rec: weiche Nähte beim Zuschneiden eines Loops

Parent: `7f795ec` (`index.html` 8 331 254 B). Jetzt 8 331 657 B (**+403 B**). Zone: KALT/WARM (einmal pro Bar-Edit, nicht im Audio-Thread, nicht pro Regler-Tick).
Daten-Owner: unverändert `__XenRackLiveBarEdits` (Absicht = front/back in ganzen Takten). Es wird nichts gespeichert; die Fades entstehen beim Rendern der bearbeiteten PCM.
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium, synthetische Loops, Messung an den PCM-Samples). **Nicht gehört.** Nicht USER_ACCEPTED.

## Befund
`__xenRackRenderBarEdit` (Loop Editor, Rechtsklick auf die Take-Kachel) kopierte den gewählten Taktbereich hart in den neuen Loop-Puffer. Dadurch lag an
- Anfang und Ende eines **gekürzten** Loops (Takte weggeschnitten) ein Schnitt mitten im Signal; beim Wrap des Loops sprang der Pegel (Knackser),
- jeder Naht zwischen Audio und **angefügten stillen Takten** ein Sprung (Audio → 0 bzw. 0 → Audio).
Dieselbe PCM spielt im Live Room, in der Editor-Vorschau und wird beim „Copy to Root Follow“ als Datei geschrieben; die Knackser waren überall hörbar.

## Fix
Neue Funktion `__xenRackSeamFade` (`src/mix/03_quick_menu__after_eq-core__after_eq-ui.js`): nach dem Kopieren wird der übernommene Audiobereich am Anfang und am Ende mit einem **Raised-Cosine-Fade von 5 ms** versehen (erstes und letztes Sample exakt 0; Länge auf die Hälfte des Bereichs begrenzt, falls dieser sehr kurz ist).
- Gilt für jeden bearbeiteten Loop (front ≠ 0 oder back ≠ 0), also gekürzt, verlängert oder beides; die Nähte zu angefügter Stille sind eingeschlossen, ebenso der Wrap.
- Ein unveränderter Loop (front = back = 0) bleibt byte-genau wie aufgenommen.
- Ein Ort für alles: Live-Wiedergabe, Vorschau, Session-Restore und „Copy to Root Follow“ lesen dieselbe gerenderte PCM.
- Bereits vorhandene Fades beim Umschalten der Vorschau (12 ms, `fadeOut`/`replace`) bleiben unverändert.

## Test
`tests/e2e/looprec_seam.cjs` (auf Parent rot: „audio starts at exactly 0“, mit Fix grün). Konstantpegel-Loop (0,5 über 4 Takte, schlimmster Fall für einen harten Schnitt) in sieben Varianten (unbearbeitet, vorn/hinten gekürzt, beides, hinten/vorn verlängert, kombiniert): Audio beginnt und endet bei exakt 0, Wrap stetig, Mitte unberührt, größter Sprung zwischen Nachbarsamples 0,0033 (hart wäre 0,5). Unbearbeitet: unverändert 0,5.
Außerdem grün: `looprec_bars`, `looprec_live_lanes`, `loop_trim_and_more_choices`.

## Grenzen
- Der Fade ist ein kurzes Aus-/Einblenden (kein Crossfade zwischen Loop-Ende und Loop-Anfang): am Wrap entsteht ein ~10 ms kurzer Pegeleinbruch. Bei einem Schlag genau auf der Taktgrenze wird dessen Attack in den ersten 5 ms leicht angehoben (weich statt hart). Länge ist eine Konstante: `__XEN_LOOP_SEAM_SEC`.
- Nicht berührt: Aufnahmeende von Loop-Rec selbst und unbearbeitete Loops.

Rollback: `7f795ec`.
