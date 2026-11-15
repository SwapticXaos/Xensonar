# LIVE-LANE-01 · Loop-Rec records what is played live, whatever synth plays it (Psy Lab was missing)

Base: HWKB-02 (`f077d65`), `index.html` 8 153 032 B. Now 8 152 274 B (**−758 B**: the Psy Lab special paths are gone).
Zone: WARM/HOT · wiring. The audio graph of a Psy Lab lane changes once when its engine is built (no per-note or per-block change). Loop-Rec, stems: COLD until started.
Data owner: unchanged. No storage, no new field.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). **Not listened to**, not USER_ACCEPTED.

## Report (user, 14.11.)
Loop-Rec does not pick up the new Psy Lab sounds. Suspected: a structural weakness, because every new synth has to be added to Loop-Rec individually. As defined, Loop-Rec records what is **played live**: Wave Starter, Keyboard, particles, Root Follow Loop. Drums and bass (the rhythmic foundation) and material tracks (already loops) may play but are not recorded.

## Finding
- **Confirmed** (red test on the parent: Keyboard classic peak 0.48, Keyboard Psy Lab **0.00**).
- Cause: Loop-Rec had **no fixed entry point**. Every synth had to call `__XenLoopRec.route(...)` itself in order to be heard (classic sounds via the pan module, Entrophon, Nodal and the Forge shell each in their own place). Psy Lab connected straight to the master input and built its own instrument-EQ route next to it. Loop-Rec never heard it; the stem recorder had a Psy Lab special path of its own for the same reason (`__XenPsyLab.outputs/watch`).
- Your suspicion is right: the weak spot was the entry point, not Loop-Rec itself. There is **no performance reason** for a per-synth tap: Loop-Rec taps the lanes anyway (one gain node per lane), and the synth is irrelevant to it.
- **Second bug, found along the way (existed before):** with the Nodal factory sound (`troodle`) on the Keyboard, **no Loop-Rec take started at all** ("Invalid song instrument source"). When a take starts, the instruments in use are saved; only Entrophon factory sounds were exempt, the Nodal factory sound (id without a revision) aborted the start.

## Change
1. **One lane input for the Live Room** (`__XenLiveLane.input(ctx, lane, destination, family)`, internally `__XenLoopRec.route`). That is where the lane's instrument EQ and the Loop-Rec tap sit. Whatever connects there gets the lane's EQ, is recorded by Loop-Rec and appears in the stems. Loop-Rec only knows lanes (`wave`, `keyboard`, `particle`, `rootFollow`), never the synth. `family` is optional and only names the synth, so that "stems by instrument" can give it its own track.
2. **Psy Lab uses the lane input** (`family:'psylab'`) instead of its own EQ route to the master. Same EQ key as before, own EQ device for this synth family as before; the signal path is out → EQ → (unity gain) → master, the same chain as before.
3. **Special paths removed:** the stem recorder no longer has a Psy Lab path and puts lane taps with `family:'psylab'` on the Psy Lab track. The Psy Lab watchers in the catalogue and in the chunk are gone.
4. **Factory sounds** (`nodal:factory:…`, `entrophon:factory:…`) are skipped when the song instruments are saved (they ship with XenSonar). An unknown id without a revision is still refused.

Room V (Psy Lab pad) is deliberately not a lane: it is not live playing in the Live Room and goes directly to the master as before.

## For future synths (rule)
A new synth that is played in the Live Room on the Wave Starter or the Keyboard connects its output to `__XenLiveLane.input(ctx, lane, master input, 'family name')`, **not** to the master input. With that it is in Loop-Rec, gets the lane's instrument EQ and appears in the stems; Loop-Rec needs no change.

## Verification
- **Browser, generic** `tests/e2e/looprec_live_lanes.cjs`: reads the **rubrics of the sound menu** (currently Classic, Nodal, Entrophon, Psy Lab; any rubric added later is included automatically), plays one sound of each family on the Keyboard and checks that the stored take carries it. Additionally Psy Lab on the Wave Starter. Result: Classic 0.142, Nodal 0.106, Entrophon 1.381, Psy Lab 0.533, Wave Starter Psy Lab 0.509. A take **without playing** (drums, bass and material loops running) is exactly silent (peak 0).
- **Unit** `tests/live_lane_01.test.cjs` (now 125 green): factory sounds skipped, own Nodal sound still stored, unknown id refused; one lane input per lane and family, family in the lane tap, every tap feeds the master; Psy Lab uses the lane input, no special path left.
- **Stems:** `stems_instruments` null test as before (5.8·10⁻⁸), Psy Lab track 0.326 (before 0.326); `stems_record`, `stems_setup`, `stems_with_take` green. Two tests read old internals (Psy Lab's own tap); they now read the lane input.
- **Psy Lab:** `room5_live_psylab`, `psylab_sustain_expression_eq` (lane EQ acts on both lanes), `psylab_octave_sector` green.
- Full browser suite: see the commit message.

## Limits / open
- **Not listened to.** The Psy Lab chain is the same as before (+1 unity gain); the Psy Lab track in the stems has the same level within run-to-run variation (0.3259 / 0.3263), but it was **not compared bit for bit**.
- **No per-lane switch in Loop-Rec yet.** You described "if you don't want something, switch it off". Loop-Rec has no such switch today (Root Follow follows only whether the Root Follow Loop is running). Note: in today's signal path the lanes are not cleanly separated for all classic engines. The Enter Wave Starter with a classic sound plays through the particle engine (lane `particle`), and Entrophon voices of the Keyboard go into the `wave` lane. A switch "Keyboard off" would therefore not hold Entrophon back, and "particles off" would also silence the Wave Starter. Clean switches need the voices to be sorted by their origin (Wave Starter / Keyboard / particles) rather than by engine. That changes the voice path of classic sounds and Entrophon and needs a PCM before/after comparison; proposed as a separate step.
- Loop-Rec takes material that is played *live*. Drums, bass and material tracks are deliberately not included (silent take checked); that is unchanged.

Rollback: commit `f077d65` (HWKB-02).
