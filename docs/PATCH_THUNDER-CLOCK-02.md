# THUNDER-CLOCK-02 · Exact Thunder robust like Nodal: no lost pulses during main-thread stalls, cancel on release, one synth registry

Base: THUNDER-CLOCK-01 (`27cfbe0`), `index.html` 8 162 010 B. Now 8 164 076 B (**+2 066 B**, main bundle, hot path).
Zone: **HOT** (Thunder planner, pulse delivery). Per pulse one small record of its tones on the gesture (pruned as they start); no React, no storage.
Data owner: unchanged (`thunderTiming` in the Live Room parameters). The synth registry is code, not data.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless, measured on Loop-Rec takes, simulated stalls). **Not listened to**, not USER_ACCEPTED.

## Report (user, 15.11.)
"Nodal still has the more precise timing; Entrophon now has a massive gap. That is not yet the mechanism of the Nodal Thunder Mode." Also: a new synth at the place of the Wave Starter / Keyboard must be recorded by Loop-Rec at once and play Thunder at once, with Nodal's precision or the legacy mechanism.

## Finding
- In headless Chromium there was no gap: the main thread is idle there. On a real device the Live Room draws, React renders and the GC runs.
- **Simulated** (main thread blocked for 90 ms every 400 ms): THUNDER-CLOCK-01 handed a pulse over only 35 ms ahead and **dropped** one that was more than 25 ms late. Bell lost 3 of 22 pulses (19). Loose plays them late; Nodal is not affected (its clock runs in the worklet).
- So my first version was not Nodal's mechanism: exact only when the main thread keeps up, worse than before when it does not.

## Change
1. **Lead 150 ms** (instead of 35 ms): a stall of that length costs no pulse; every pulse still starts at its exact audio time.
2. **A late pulse is never silently dropped**: up to half an interval late it plays as soon as possible (`thunderAt = max(now + 3 ms, grid)`).
3. **Cancel on release, generic**: whatever a pulse added to the shared list of live tones (`activeScheduledTonesRef`) is remembered on its gesture. Key release (`k1`), a pattern / sound / pitch change or leaving exact mode cut every tone of that gesture that has not started yet. No synth-specific code: every synth that lists its tones there is covered (classic oscillators, scheduled tones, C11 held tones with `cut` / `release`).
4. **One synth registry** `__XenThunderSynths` (by the prefix of the sound id) says how a synth takes part in Thunder:
   - `own-clock`: Nodal (its own audio clock), samples (their own 550 ms lookahead);
   - `starts-at`: Classic and Entrophon (start at `options.thunderAtSec`). In Exact mode the central clock plans them;
   - `due-time`: Psy Lab and **every new synth by default**. It gets the pulses when they are due (the legacy precision) and is never started early.
   A new synth therefore plays Thunder without any change. `__XenThunderSynths.register('prefix','starts-at')` makes it exact once it honours `thunderAtSec`. Loop-Rec picks it up through the lane input (LIVE-LANE-01).

## Verification
- **Browser** `tests/e2e/thunder_exact_timing.cjs` (extended):
  | Case | Pulses | Max deviation | After release |
  |---|---|---|---|
  | Bell, exact, 90 ms stalls every 400 ms | 16 (all) | 0.8 ms | 0 |
  | Entrophon marimba, exact, 90 ms stalls | 16 (all) | 0.8 ms | 0 |
  | Bell, released 60 ms before a due pulse | | | 0 |
  | Entrophon marimba, released 60 ms before a due pulse | | | 0 |
  | Bell + slot volumes, loose (old timing) | | 282 ms | |
  The earlier cases (Bell / Entrophon, with and without slot volumes, no stalls) are unchanged: max 0.8 ms.
- **Negative check**: with the cancel switched off, the Bell release case leaks one pulse after the release, so the check is sensitive. (The Entrophon marimba runs on the resident worklet path here, which stops itself on release.)
- Probe `tools/probes/thunder_gap_probe.cjs` (not shipped): pulses and gaps per sound and mode with the default pattern.
- **Unit** `tests/thunder_clock_01.test.cjs` (5 tests): registry (modes per prefix, new synth = due-time, register makes it exact, bogus modes ignored), cancel (only pulses not yet started, `cut()` preferred), lead ≥ 100 ms, anchor, wiring.
- `run_tests.sh` 126 green; full browser suite 55 scripts green (Chromium headless).

## Limits / open
- **Not listened to**: whether the gap you heard is gone has to be heard on your device. The cause I could reproduce (pulses dropped during main-thread stalls) is fixed; other causes on your system (for example the browser running the audio thread late, or a different sound) would need your device report.
- A stall **longer than 150 ms** still delays pulses (they play as soon as possible), unlike Nodal's worklet clock. Fully stall-proof is only a clock in the audio thread itself; for Classic / Entrophon voices that is the resident worklet path, which accepts at most 8 voice components (unchanged).
- Psy Lab still has no Thunder (the lane switch says so). With the registry it would play legacy Thunder at once; making it exact needs its worklet to start notes at a given frame (a next step, see below).
- The overtone arpeggio and the Room III body exciter follow by timer (no start time).

## Next step proposed (not done)
Psy Lab as the first "new synth" through this contract: Thunder on (pulses as short gated notes), its worklet takes `on` with a start frame, and `register('psylab','starts-at')`. That shows end to end that a new synth needs no Thunder-specific code.

Rollback: commit `27cfbe0` (THUNDER-CLOCK-01) or `009984e` (before both).
