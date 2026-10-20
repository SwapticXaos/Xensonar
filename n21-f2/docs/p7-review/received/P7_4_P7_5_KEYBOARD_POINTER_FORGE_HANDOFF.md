# P7.4/P7.5 – Late stabilization addendum (20 October 2026)

Base: stage 11 from previously verified P7.3 handoff. Original Codex ZIP unchanged.

## Stage 12: Keyboard momentary expression + pointer hold-repeat conflict

- B and **left Alt** now perform momentary keyboard expression gestures: ramp toward bounded swell/damp targets while pressed, smoothly return to neutral after release; keyboard volume slider remains untouched.
- The old OS repeated-key contract remains observable but **same held pitch repeat is a no-op for cursor and pointer ownership** (`keyboardHoldRepeat`). No duplicate attacks, no pointer queue cancellation on repeats.
- A genuinely different pitch and explicit keyboard glissando still go through immediate root/attack routing.
- Do not claim this fixes an actual operating-system cursor freeze. Chromium DOM pointer events stayed deliverable with held keys. Opera/Linux live latency and mouse interaction during keyboard playing remain an explicit acceptance gate.
- No RFL engine, Bass Grid, or audio-master topology modifications.

## Stage 13: Spectral Forge sample-selection handles in magnified main painting

- Main canvas shows two **1px violet vertical lines**, each with a small violet down-pointing triangle (one for start, one for end). No selection fill and no additional marker band.
- The hit zone is visually invisible (14px wide), cursor `ew-resize`. The handle uses the SAME `__ForgeNavigatorSample` selection as the small Navigator mask, not a new state store.
- Dragging start or end uses the existing safe `__f333NavigatorSampleResize()` and edits only its respective boundary; the Navigator mask moves in lockstep.
- The zoom/pan map uses `offsetX` + main canvas `zoomX` and accounts for canvas element bitmap-vs-CSS width. If an edge is offscreen, its grip is not falsely snapped onto the viewport edge.
- Main canvas gestures outside the two hit zones retain their previous behavior. No new audio work, interval, timer, or per-frame loop.
- Only one existing Forge module and metadata index are touched by stage 13.

## Evidence

* RED/GREEN `node tests/p7_4_keyboard_contract.cjs .` – momentary B/Alt and release fade.
* GREEN `node tests/p7_4_repeat_pointer.cjs .` – no-op OS repeats while preserving the historical keyboard directness contract.
* RED/GREEN `node tests/p7_5_forge_main_handles.cjs .` – coordinate mapping and shared state owner, no artificial edge snapping.
* Chromium end-to-end test using the real P7.5 HTML: create purple 27–67% navigator selection; move start with upper marker -> ~30.5%; move end -> ~63%; other endpoint unchanged; no console exceptions.
* Existing retained suites: 10/10 (including keyboard-directness); original Forge Navigator, source-index freshness, grid/Space tests, RFL stability tests to be retained.
* Source HTML SHA: stage 11 `efe4338e4459d356f9684949ee85b62f015681cbbcc4950d3bc2f74054d17e84`, stage 12 `63c330c3d683a77af86c7ce600ae76d8a5a462dac4ef243c302f896e18f7d888`, stage 13 `05b2fb522db77a5995769815c294f266901b9c81d7d1b498fbbbc2d02a0b5ccc`; all assembled from modular sources. Final HTML UTF-8 bytes: `5682538`.
* Preservation-hash suite `npm run test:merge` is still historically red on intentional base-bridge Nodal changes. Do not alter expected hashes casually.

## Explicit remaining risk / next Work audit

A Windows/Linux desktop's physical mouse pointer cannot be shown to be unaffected by XenSonar's scheduling with a synthetic Chromium DOM test. Investigate real Opera UI event latency if cursor still appears locked with held keys. A per-keystroke main-thread stall may be distinct from the eliminated repeated cursor-owner update.

B/Alt influence the keyboard expression applied to newly triggered notes; they do not yet introduce a post-attack VCA for sustaining tones. That remains an explicitly scoped future feature, not silently implemented here.
