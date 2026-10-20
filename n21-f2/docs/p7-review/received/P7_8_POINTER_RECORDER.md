# P7.8 – Cursor/Grid readability + independent recorder actions

## Stage 16: Main-grid visual only
- The played grid step no longer becomes unusually dark immediately after release; visual afterglow returns toward baseline.
- Wave Starter ball becomes almost black with a light outline for distinction from the white cursor.
- Existing wave audio, scheduling, grid snapping, pointer event mapping and stroke geometry unchanged.
- Confirmed source-level visual contract using `test_p78.cjs`; actual Opera rendering still to audition.

## Stage 17: Recorder control semantics
- **Rec** starts recording.
- **Enough! + running time** finishes the take via the existing normal stop path, including original scroll to Master Recording.
- **×** while recording discards everything and stays in the current view. The `MediaRecorder` onstop/ondataavailable callbacks are detached before stopping, and the captured async decode path also checks a `WeakSet` cancellation fence both before and after decoding to prevent a discarded take from resurfacing.
- Far right **⛶** toggles native browser fullscreen with browser Esc and `fullscreenchange` synchronization.
- Stop and Discard must never call each other's path. No changes to normal decoding, saving or master audio recording bus outside discard fences.

## Tests
- `node Handoff/tests/p7_8_visual_recorder_contract.cjs /path/to/n21-f2`: exact current module contracts (source).
- `node Handoff/tests/p7_8_recorder_async_cancel.cjs /path/to/n21-f2`: exercise real historical async decode callback before and after cancellation (incl. cancellation while awaiting `decodeAudioData`).
- `node build.cjs --verify`: reconstruct HTML precisely.
- The original keyboard/Entrophon P7.7 HTML remains unchanged in the archive history.

## Remaining real-device acceptance
- During recording, verify `Enough!` stops and scrolls, while `×` stops, produces no take and never scrolls; rapidly restart after discard; verify fullscreen+Escape.
- In Opera, confirm main-grid step changes do not hide visual feedback and the black Wave Starter ball is clearly distinguishable from cursor.
- Known historical merge-preservation hash test remains outside scope; P7.8 does not change Nodal or RFL synthesis.
