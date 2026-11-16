# LOOPREC-BARS-01 · Loop-Rec: bars visible, loop edges draggable

Base: LIVE-LANE-01 (`24b207c`), `index.html` 8 152 274 B. Now 8 159 358 B (**+7 084 B**, main bundle: Live Room and the Loop Editor are always loaded).
Zone: WARM. Bar counter: one text update every 200 ms, written straight into the button and only while recording (no React render). Bar map: drawn on demand in the Loop Editor (cold until it is opened); dragging changes the same edit as before.
Data owner: unchanged: the bar edit of a loop is the Session intent of `__XenRackLiveBarEdits` (front / back in whole bars), as before with − / +. No new field.
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless). Not USER_ACCEPTED.

## Before
- While recording the button only showed "Enough!", with no indication of which bar the take was in.
- The Loop Editor (right-click on the take tile) had − / + per bar for the beginning and the end, but no picture: no waveform, no bar lines, nothing to drag.

## Now
- **Bar counter:** while recording the button shows "Enough! · bar 3" (the bar of the running take, counted from its start on the bar grid).
- **Bar map in the Loop Editor:** the waveform of the take over its bars, bar numbers of the take, beat lines when there is room. The loop that plays is framed in yellow; trimmed audio is dimmed, added silent bars are hatched.
- **Draggable edges:** two yellow handles (beginning, end). Dragging snaps to bar lines: **inwards trims bars, outwards adds silent bars.** Arrow keys on a handle: one bar. Impossible positions (not a single bar of the take left, more than 128 bars) are simply not taken. While dragging, the grid stays put under the pointer.
- One edit: handles and − / + are the same Session edit; live play and preview change at the next bar without restarting the beat clock (unchanged behaviour of the bar edit).

## Verification
- **Browser** `tests/e2e/looprec_bars.cjs` (real app, real take): counter "bar 1 → bar 2" during recording, none outside a recording; right-click on the take tile opens the editor with a bar map (waveform drawn); dragging the beginning one bar inwards = front −1 (LOOP LENGTH −1, − / + display −1); dragging the end two bars outwards = back +2; arrow left = one bar back; dragging the end past the beginning keeps at least one bar; "+" at the beginning undoes the trim, the handle follows.
- `build.py --check` OK, `run_tests.sh` 125 green, `run_e2e.sh` 54 scripts: 53 green, `grid_drag_selection` red once in the full run and green 6/6 on its own (old and new build alike, already flaky before; unrelated to this patch).

## Limits
- Edges move in **whole bars** (the bar edit has always been bar-based). Finer edges (beats, a free crossfade at the seam) are not in this patch.
- The counter counts bars of 4 beats (Loop-Rec has always measured its bars as 240/BPM); for odd metres it shows the Loop-Rec bars, not the metre of the Grid.
- Not tested on touch devices (the handles use pointer events and should work there; not checked).

Rollback: commit `24b207c` (LIVE-LANE-01).
