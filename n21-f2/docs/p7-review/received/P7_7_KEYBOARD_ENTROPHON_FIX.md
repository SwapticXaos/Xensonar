# P7.7 — Keyboard Entrophon restored independently of Wave Starter enabled

## Reproduced regression
On P7.6, selecting `Keyboard sound = Entrophon` while `Wave Starter enabled = OFF` produces **zero actual wave/Entrophon render-dispatch calls** from a physical Keyboard key. This is independent of the keyboard selector, which correctly records its choice.

There were **two distinct early gates** in `src/app/forge/01_room_shell.js`:

1. `zo` (live voice ingress) discarded all notes whenever `fa.current.enabled` was false, including explicitly marked Keyboard gestures. This was the primary silent return.
2. `_h` (renderer entry) inherited the Wave Starter runtime `enabled` flag, so opening only the first gate could still result in silence.

## Minimal fix

Both guards now recognize a Keyboard gesture by one of: `keyboardGestureSource=keyboard-direct`, `keyboard-glissando`, or `waveStarterGestureLoopLane=klaviatur`.

- In `zo`, only non-Keyboard Wave Starter gestures are subject to `fa.current.enabled`.
- In `_h`, a Keyboard gesture uses an **ephemeral copy** of the runtime with `enabled:true` and the existing independent `keyboardMixVolume`, but never changes `fa.current`.
- The Entrophon definition, C11 worklet, transient admission, output bus, root-follow, Beat/Bass and Apostrophe remain unchanged.

## RED/GREEN evidence

`tests/p7_7_keyboard_source_gate.cjs` evaluates the **actual source expressions** from both admission gates. Before fix: failed; after fix: passed.

`tests/p7_7_keyboard_entrophon_wave_disabled_browser.py` instruments the real renderer (`nq`) in a *test-only* HTML copy and operates actual Chromium UI and physical keyboard event. On P7.6: **fails** because no renderer call occurred. On P7.7: **passes** for Entrophon and Legacy Keyboard without turning the Wave Starter back on.

Run:
```
node tests/p7_7_keyboard_source_gate.cjs
XEN_TEST_HTML=/path/to/P7_7.html python tests/p7_7_keyboard_entrophon_wave_disabled_browser.py
```

## Preserved checks
Existing Entrophon body/active-gate tests, P3B1 keyboard directness, C11 timing, P7.6 expression mode, 17 derived-grid / Space tests, P7.4 pointer test (with explicit current root directory), P7.3+P7.5 Forge, RFL boundaries/preparation, fresh source-index and `node build.cjs --verify` passed in the working tree.

## Known test-harness limitation
`tests/p3b2-keyboard-entrophon.cjs` is an old isolated UI fixture that throws a `ReferenceError` for the P7-added `__XenBassGridRuntime` component. It cannot be counted as passing in the unchanged fixture; use the P7.7 browser test instead. `tests/p7_4_repeat_pointer.cjs` assumes a stale hard-coded local path if called without an argument; pass the current root explicitly. These are testing-infrastructure issues, not evidence of audio failure.

## Remaining acceptance
Real Opera audio playback with Wave Starter OFF, switching Entrophon/Legacy on Keyboard, and Wave Starter on separately. Observe whether the user's original silent scenario is resolved; additional cases may exist (e.g. C11 host readiness or a specific saved Entrophon definition).
