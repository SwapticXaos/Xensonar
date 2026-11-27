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

---

# DJ-CLOCK-01 — Auto-Fades und Szenen auf der Audio-Uhr (kein Ruckeln, kein ungenauer Start)

## Vorher
Crossfade-Automatik und Szenen-Morph schrieben jeden Bildschirm-Frame (rAF) die Pegel in die Stores; React-Effekte
setzten daraus mit 30 ms Glättung den Gain. „Takt-Start" wartete per `setTimeout`. Folge: Ruckeln unter Last,
Start mit Frame- und Timer-Jitter, Stillstand im Hintergrund-Tab, React-Neuaufbau pro Frame (Primärspur via Param-Update).

## Jetzt
- Der gesamte Pegelverlauf jeder Spur wird beim Auslösen **vorab als 64 lineare Rampen** auf den Level-Gain der Stimme
  geplant (abbrechbar, Firefox-sicher), Start mit „Takt-Start" **exakt auf der nächsten Raum-Taktlinie der AudioContext-Zeit**
  (über die Tempo-Karte, auch während eines Tempo-Gleitens); Länge in Takten = musikalische Länge (`timeAt(beatAt(t0)+beats)`).
- Die Stores bekommen sofort den End-Pegel, der Mix-Target-Cache ist vorbelegt → kein React-Effekt überschreibt die Rampe.
- Der Bildschirm (Crossfader-Kappe, Sync-EQ-Morph, Szenen-EQ) folgt nur noch der Audio-Uhr.
- Anfassen (Crossfader, Fader, Mute, Bus …) mitten im Fade übernimmt ab dem **hörbaren** Pegel, ohne Sprung.
- Szenen-Morph: gleiche Technik, von hörbarem Pegel zu Szenen-Pegel (kein Sprung bei Bus-Wechsel), mit „Takt-Start" auf dem Taktstrich.
- Ohne laufende Stimme (nichts hörbar): bisheriger Frame-Weg als Fallback.

## Technik
`__XenMaterialLivePhase.handle(id)` / `headroom()`; Desk: `startClockMorph`, `planMorphWindow`, `interruptClockMorph`,
`writeDeckLevel`, `deckEffective`, `applyLinkedEqMorph`; `__XenDjStage.roomBpm()`.

## Test
`tests/e2e/dj_clock_fade.cjs`: Start auf der Taktlinie (Messung des Gain auf der Audio-Uhr), 600 ms blockierter Haupt-Thread
ohne Stocken, monoton, nach genau 2 Takten still, Übernahme ohne Sprung, Szenen-Morph auf der Audio-Uhr.

---

# DJ-PERSIST-01 — Desk-Zustand und Mix-Szenen bleiben erhalten

- Routing (A/THRU/B), Crossfader, Kurve, Fade-Einheit, „Takt-Start", „Sync EQ Morph", Fader-Basen, Mute/Solo und die
  vier **Mix Scenes** (inkl. 24-Band-EQ-Schnappschüssen) überstehen ein Neuladen (`xensonar.djStage.desk.v1`, entprellt,
  plus `pagehide`), ebenso die Ansicht (Tab, Monitor, Crate).
- Ein gespeicherter **Song** trägt den Desk-Mix (`songPerformance.desk`): erfasst nur für die Materialien des Songs,
  beim Laden geprüft (IDs, Wertebereiche, EQ-Kurven 360 Punkte) und angewendet; ältere Songs ohne Desk lassen das Desk unverändert.
- Wiederhergestellte Fader-Basen treffen auf andere Live-Pegel (z. B. Song ohne Desk) → das Desk übernimmt die Live-Pegel
  (DJ-OWN-01), statt sie beim ersten Handgriff zu überschreiben.
- **Fehler behoben:** Song-Speichern scheiterte mit mehr als 3 Spuren im Desk („Invalid song performance snapshot"),
  weil die Prüfung nur 2 Zusatzspuren erlaubte; jetzt bis 5 (= 6 Spuren).
- Test: `tests/e2e/dj_persist.cjs` (Reload, Song-Erfassung über `__xenSongPerformanceCapture`, Prüfung, Wiederherstellung, 6-Spur-Song).

---

# DJ-CUE-01 — Hot-Cues und Loop-Roll

- Unter dem Takt-Balken jeder Spur: **Cue 1–4** und **Roll ⟲1S · ⟲2S · ⟲1T**.
- **Cue:** leer → merkt die hörbare Stelle (aufs Segment gerundet); gesetzt → springt sofort dorthin und behält die Phase
  innerhalb des Segments (Versatz in ganzen Segmenten = bleibt im Raster). Shift-/Alt-/Rechtsklick löscht.
  Läuft die Spur nicht, startet sie an der Cue-Stelle. Cues werden mit dem Desk gespeichert (Neuladen, Song).
- **Loop-Roll (halten):** der Phasen-Worklet der Spur wiederholt die aktuelle Zelle (1 Segment, 2 Segmente, 1 Takt)
  **sample-genau** mit 3 ms De-Click je Wiederholung; darunter läuft die Spur unsichtbar weiter („Slip"). Loslassen
  → weiter genau dort, wo sie ohne Roll wäre (synchron zum Raum). Tastatur: Enter/Leertaste halten.
- Technik: Worklet-Nachrichten `roll-begin` {lenBeats, backBeats, at} / `roll-end`, `advance()` im Playhead;
  `__XenMaterialVoiceMix.transport(id, msg)` → Player `transport()`. Ein Sprung während eines Rolls verschiebt Zelle und Slip mit.
- Tests: `tests/dj_seek_jump.test.cjs` (+2: Zelle wiederholt, Slip, Rückkehr; zu langer Roll ignoriert),
  `tests/e2e/dj_seek_nudge.cjs` (+Cue setzen/springen/löschen, Roll halten/loslassen), `tests/e2e/dj_persist.cjs` (+Cue nach Reload).

---

# DJ-BUS-01 — Bass / Root Follow: Timing-Nudge wie bei den Spuren

- Das alte „− Att +" (0,1-Schritte, ohne musikalischen Bezug) im Tab „Root · Bass · Drums" ist ersetzt durch dieselbe
  Bedienung wie der Spur-Nudge, auf dem 1/16-Raster der Pattern: `«` / `»` = genau 1/16 früher / später, Mitte = federnder
  Jog (fein, ± 1/32), `←`/`→` = 1/64, Doppelklick = zurück aufs Raster. Anzeige `Att +1/16` (+ = früher).
- Wert und Speicherung unverändert (`__XenAttackLanes`, ±2 Beats, im Song).
- Test: `tests/e2e/dj_seek_nudge.cjs` (+ Bass « », Jog, Reset).
