# DJ-SEEK-01 · DJ-OWN-01 · UI-LIQUID-02 — Mixing Desk: Takte spulen, Nudge, Pegel-Eigentum, Auto-Andocken

Basis: `main` 31ae86e (MIX-DESK-01, UI-LIQUID-01, SONG-PART-TAGS-02).

## Verhalten
- **Takte spulen** (Loop-Balken jeder Spur *und* die Schienen im Monitor „Takt & Phase“):
  Klick in einen Takt → die laufende Spur springt sofort in diesen Takt und **behält ihre Position im Takt**
  (Verschiebung um ganze Takte = bleibt im Raum-Raster und im Tempo). Der überfahrene Takt leuchtet auf.
  Tastatur: Balken fokussieren, `←`/`→` = ein Takt. Läuft die Spur nicht, startet sie im gewählten Takt.
- **Nudge** (unten in jeder Spur):
  - `«` / `»`: genau **ein Segment** zurück/vor (Takt ÷ Segmente des Loops, z. B. 1/4 oder 1/7 Takt), als Sprung.
  - Mitte ziehen: **schubsen (→) / bremsen (←)** über die eigene Nudge-Physik der Spur (Granular/Vinyl · Soft/Hard),
    wie im Quick Rack; voller Ausschlag = ± ½ Segment, der Regler federt zurück, der Versatz bleibt.
    Die Fläche zeigt live, ob gerade geschoben (gold) oder gebremst (türkis) wird. `←`/`→` = ⅛ Segment.
  - Anzeige `Φ +1T 2S` = Versatz zum Raum-Raster (T Takt, S Segment). Doppelklick = zurück aufs Raster.
- **Quick Rack Nudge** bearbeitet nur noch den Feinanteil (±2 Beats) um den ganzen Takt-Versatz herum,
  den das Desk gesetzt hat – kein Kleben am Rand, kein Zurückgleiten über Takte beim Anfassen.
- **Pegel-Eigentum (DJ-OWN-01):** ändert jemand außerhalb des Desks den Pegel einer Spur (Quick Rack, Song-Abruf),
  übernimmt das Desk ihn als neue Fader-Stellung, statt ihn beim nächsten Crossfade/Mute zurückzuschreiben.
- **Spielfläche (UI-LIQUID-02):** Öffnen des Mixing Desks dockt die Spielfläche sofort daneben; die
  „Raster“-Miniatur entfällt. `↑` / Platzhalter oben holen sie für diese Sitzung zurück nach oben.
- Die Loop-Nadel zeigt die **hörbare** Phase (folgt einem laufenden Soft-Nudge), nicht nur das Ziel.

## Technik
- Worklet `xen-material-phase-v1` (`src/mix/03_quick_menu__before_eq-core.js`): neue Interaktion `jump` —
  ein diskreter PCM-Sprung mit 12 ms De-Click-Crossfade, bricht laufende Gleitbewegung ab, kein Tempo-/Tonhöhen-Ausschlag.
  Interaktive Zielgrenze ±2 → ±64 Beats (Sprünge über ganze Takte).
- `__XenDjMixMath`: `wrapCyclic`, `loopGrid`, `barAtRatio`, `planBarJump`, `planSegmentStep`, `formatPhaseOffset`.
- `__xenNudgeCoarse(att)`: ganzer Takt-Anteil (4 Beats) des Versatzes für den Quick-Rack-Regler und seine Bewegungsanzeige.
- `__XenMaterialLivePhase.read` liefert zusätzlich `loopBeats`.
- Desk: `adoptExternalVolumes` + `lastWritten` (DJ-OWN-01); `Number(params.drumVolume)`-NaN im Bus-Streifen behoben.

## Tests
- neu: `tests/dj_seek_jump.test.cjs` (Worklet-Sprung in allen 4 Modi, De-Click, Abbruch einer Gleitbewegung),
  `tests/e2e/dj_seek_nudge.cjs` (echte App: Balken, Schienen, Tasten, Segment, Jog, Reset, Pegel-Übernahme, Andocken),
  `tests/dj_mix_math.test.cjs` (+3).
- angepasst: `tests/e2e/stage_split_liquid.cjs` (Auto-Andocken), `tests/hard_vinyl_settlement.test.cjs`
  (wieder lauffähig mit der VoiceMix-Factory; Grenze ±64).
- grün: `live_tempo_material`, `lane_follow`, `mixing_desk_smoke`, `eq_no_page_drag`, `song_part_tags_send`, `build.py --check`.
- Bekannte Altlast (vorher schon rot, nicht DJ-bezogen): `song_performance_p0/p1`, `session_bass_drone_p2`,
  `working_session`, `expressive_burst_contract` extrahieren Quelltext nach alten Mustern.
