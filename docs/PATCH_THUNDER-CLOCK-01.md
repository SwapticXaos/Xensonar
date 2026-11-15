# THUNDER-CLOCK-01 · Thunder Mode on the audio clock for every synth (as Nodal); the old timing selectable

Base: LOOPREC-BARS-01 (`009984e`), `index.html` 8 159 358 B. Now 8 162 010 B (**+2 652 B**, main bundle: the Thunder planner is hot code).
Zone: **HOT** (Thunder planner and voice start). Per pulse no allocation beyond the pulse record that already existed, no React, no storage. A new setting is one parameter in the Live Room state.
Data owner: Live Room parameters (`thunderTiming: 'exact' | 'loose'`, saved with the room settings of a session like the Q switch). Missing (all existing sessions) = `exact`.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless, measured on Loop-Rec takes). **Not listened to**, not USER_ACCEPTED.

## User decision (15.11.)
"Modern Thunder Mode from Nodal" = **timing** (A): every pulse sample-accurate on the audio clock. The old timing stays as a selectable "feature bug".

## Finding
- **Nodal** plays a held Thunder gesture on its own audio clock (start + k × interval), slot volumes and microtiming included.
- **All other synths** (Classic, Entrophon) got every pulse from the main thread at the moment it was due (animation frame; with slot volumes / microtiming by timer). Measured (Loop-Rec take, 108 BPM, 8 pulses per bar, ideal 277.8 ms): Entrophon marimba deviation 4.5 to 18 ms on average, up to 48 ms; classic Bell even **loses pulses** (gaps up to 294 ms).
- There was a worklet path for exact Thunder playback of classic voices (resident hold), but it accepts at most 8 voice components per note (both in the main thread and in the worklet). Bell and Entrophon have more, so it never engaged (`fires: 0`). That path stays untouched.

## Change
- **Planner** (`Nie`): in exact mode every lane except Nodal (own clock), samples (own 550 ms lookahead) and Psy Lab (no Thunder) uses the existing lookahead branch: every pulse is placed on the gesture's grid (microtiming, slot volumes, Hold Pattern Plan included) and handed over **at most ~35 ms early** (so a key release leaves no pulse behind).
- **Pulse time**: the gesture's audio anchor is taken once (audio time of the key-down), every pulse = anchor + its distance on the grid (`__xenThunderAtSec`), like Nodal's clock.
- **Voice start**: the tones of a voice (classic oscillator path, scheduled-tone path, Entrophon C11) start at that audio time (`thunderAtSec`; both start checks accept a future time). The overtone arpeggio and the Room III body exciter have no start time; for an exact pulse they follow by timer at the same moment.
- **Switch** in the Thunder header next to Q: **Exact** (default) / **Loose**. Loose: the planner gets no exact lanes and works exactly as before.

## Verification
- **Browser** `tests/e2e/thunder_exact_timing.cjs`: switch Exact by default, Loose / Exact by click, tooltip explains it; measured on the Loop-Rec take (deviation of every pulse interval from 277.8 ms, 1 ms resolution, the first two intervals after key-down excluded, see Limits):
  | | max | mean |
  |---|---|---|
  | Bell, exact | 0.8 ms | 0.35 ms |
  | Bell + slot volumes, exact | 0.8 ms | 0.31 ms |
  | Entrophon marimba, exact | 0.8 ms | 0.35 ms |
  | Entrophon marimba + slot volumes, exact | 0.8 ms | 0.35 ms |
  | Bell + slot volumes, **loose** | 279 ms (lost pulse) | 29 ms |
  After a key release at most the pulse already handed over follows.
- Hand-over lead measured: 12 to 39 ms, never negative (no pulse arrives late in the test).
- **Unit** `tests/thunder_clock_01.test.cjs` (now 126 green): which lanes are exact (default, Nodal, sample, Psy Lab, loose), one anchor per gesture and context, exact grid distance independent of the hand-over moment, wiring.
- Probe `tools/probes/thunder_timing_probe.cjs` (not shipped): measures pulse timing per sound family and mode.
- Full browser suite: 55 scripts green (Chromium headless), including the existing Thunder tests (Q button, Hold Pattern Plan, cards, lane split, independent switches).

## Limits
- **Not listened to.** Measured are onsets in the take; how the exact grid feels against the drums is for the ear. Phase reference: the grid starts at the key-down (as before), not at the drum transport (unchanged; Q still quantizes the attack).
- The **first attack** at key-down keeps its existing response time (Entrophon marimba about 10 ms after the key-down, so the first interval is that much shorter). From the first pulse on everything is on the grid.
- If the main thread is busy for longer than ~35 + 25 ms, a pulse arrives late and plays as soon as possible (like the loose path); if it is later than 25 ms after its time it is skipped (as the lookahead branch always did).
- Overtone arpeggio and Room III body exciter follow by timer (a few ms of main-thread wavering for these parts only).
- The resident worklet path (≤ 8 components) is unchanged; where it engages, it plays exactly by itself.
- Loose is the old code path; its timing is non-deterministic by nature, so it was not compared bit for bit (no PCM equality possible), only by function (the existing Thunder tests).
- Firefox / Safari: not checked (the start checks use plain AudioParam / start times).

Rollback: commit `009984e` (LOOPREC-BARS-01).
