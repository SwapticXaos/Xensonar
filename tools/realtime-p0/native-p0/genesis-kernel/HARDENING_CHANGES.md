# Hardening changes from the Arena double-shot candidate

This tree is no longer a verbatim Arena output. It was independently reviewed,
modified and revalidated against the current Xensonar integration boundary.

## Execution-boundary fixes

- Panic removed from the ordinary SPSC command ring.
- Added dedicated atomic `panic_epoch` terminal fence.
- New-epoch work submitted immediately after Panic is preserved.
- Removed control/producer-side `xen_ring_pop()` from the full-ring Panic path.
- Added concurrent fence re-check during and after command drain.

## Realtime scheduler fix

- Replaced sorted-array scheduler insertion with a fixed-capacity deterministic
  min-heap ordered by `(effective_frame, submission_seq)`.
- Adversarial 4096 reverse-time command admission changed from the previously
  reviewed O(N^2) pattern to O(log N) insertion.

## Concurrency hardening

- Added concurrent control/render test with varying quantum, gestures, state,
  program updates and multiple epoch fences.
- ThreadSanitizer found a Program publication race in a telemetry/render loop.
- Fixed by using acquire ordering when consuming the released Program state.
- Full TSan suite then passed.

## Build/test reproducibility

- Recording test no longer depends on `build/test_record.wav` relative to the
  current working directory.
- Clean Make acceptance: 12/12 gates pass (including tool-level cross-check).
- Clean out-of-tree CMake/CTest: 11/11 executable tests pass.
- ASan+UBSan: 11/11 pass.
- TSan: 11/11 pass after the publication fix.

## Xensonar implant-boundary correction

- Xensonar adapter no longer invents a scale-degree ladder for Wave-style
  gestures.
- Added explicit gesture pitch mode; `XEN_PITCH_HZ` accepts already-resolved
  product pitch.
- `xen_wave_voice_spec` uses `resolved_hz`, velocity and pan as the current
  provisional seam.
- Root Follow / Forge sound semantics remain explicitly placeholder/unknown.
- Added `IMPLANT_BOUNDARY.md` mapping the target cut against the current 387
  Xensonar source and explicitly rejecting the per-window RFL migration bridge
  as the long-term ABI.

## Still intentionally unresolved

- PipeWire source exists but cannot be compiled in this container because the
  development package is unavailable.
- No physical PipeWire device validation has been performed.
- Canonical Root Follow, WaveStarter and Forge sound semantics have not yet
  been transplanted; the existing bodies remain workloads only.
