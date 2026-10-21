# P7.24 saved Entrophon admission verification

## Proven cause and correction

Saved definitions resolve correctly in the reproduced failure. The live voice backend encoded the selected saved definition but reserved its C11 render units using `$ie()` against the mutable Wave `Current` configuration. Rich saved A needs 28 units (6 base oscillators, 3 color oscillators and delay); cheap/disabled Current reserved 8. The C11 host correctly rejected that record as `underestimated`, producing zero PCM.

The correction is limited to two modules:

- `src/runtime/instrument/10_entrophon_and_voice_control.js`: `$ie(forceEnabled, definitionConfig)` accepts the selected immutable definition; the omitted/null default continues to read Current with the existing formula.
- `src/audio/entrophon/02_worklet_and_voice_backend.js`: admission passes `t.options.entrophonDefinition.config` to that estimator.

The existing definition resolver, library revision policy, cache invalidation, persisted schema, DSP/WASM, pressure policy and realtime deadlines are unchanged. No missing saved definition becomes Current. No logging, allocations or sound-plan calculation were added to the production audio hot path.

## Controlled before/after evidence

`results/p7-24-song-projects/regression-output/p7-24-integration/entrophon-before.json` reproduces the old estimator call using the same browser harness and 60 ms future scheduling as the corrected run: reservation **8**, encoded demand **28**, `underestimated: 1`, `targetPast: 0`, PCM peak and energy **0**. The baseline HTML was a temporary composition of the same source files with only the saved-config estimator argument removed.

`results/p7-24-song-projects/focused-entrophon-saved-live.json` records the corrected run in `/usr/bin/chromium`: real production Wave `Exe` and Keyboard `Ixe` dispatch through `VW`/`twe`, the real C11 host/encoder, and native WASM AudioWorklet PCM. Both actual sound menus are selected before rendering their IDs; after reload both saved definitions are again selected from those menus.

| Case | Reserved/encoded units per voice | Kernel accepts | Measured PCM peak |
| --- | --- | --- | --- |
| Saved A, Wave; Current cheap/disabled | 28 / 28 | 3 | 0.51932 |
| Saved A, Keyboard; Current cheap/disabled | 28 / 28 | 3 | 0.51932 |
| Wave A and Keyboard C, one simultaneous host | A 28 / 28; C 8 / 8 | 6 | 0.49183 |
| Cheap saved C, rich Current | 8 / 8 | 3 | 0.24179 |
| Explicit Current | 28 / 28 | 3 | 0.64915 |
| Stale A ID after same-ID revision 2 | 16 / 16 | 3 | 0.36391 |
| Revision 2 after reload | 16 / 16 | 3 | 0.36391 |
| Saved C after reload | 8 / 8 | 3 | 0.24179 |

All these rows have zero kernel rejects; missing saved IDs resolve to null, dispatch no voices and produce zero PCM. Revision assertions preserve the established contract: live old references follow a newer revision of the same library ID, exact unpinned lookup of the removed old revision returns null, and a project-pinned old snapshot remains Saved A.

## Sound identity and limits

Same-lane OfflineAudioContext renders compare **exactly equal production voice plans** before and after Current changes. Native WebAudio floating-point output is compared with peak error below 0.1% of signal peak and relative RMS error below 0.1%; bit identity is not claimed for browser node processing. Same-state repeat controls already show peak errors around `1.48e-5`–`1.53e-5`, relative RMS `2.70e-5`–`2.77e-5`. Across changed Current, A gives peak errors `1.53e-5`, relative RMS `3.08e-5` (Wave) / `3.15e-5` (Keyboard); C gives peak error `9.09e-8`, relative RMS `7.64e-8`. Explicit Current, restored to the same parameters after editing the saved library, retains exactly equal production plans, peak error `5.37e-5`, relative RMS `7.57e-5`. The tolerance accommodates measured browser render variation; exact plan equality is the stronger control against Current leaking into saved sound parameters. No reverb/random parameter changes are introduced between either repeat or mutation comparison.

The native live PCM probes schedule attacks 60 ms ahead at the existing `playScheduledTone` boundary to isolate admission from headless main-thread stalls. Immediate probes also encountered unrelated `targetPast` deadline rejects despite correct 28-unit reservations; those are distinct from the reproduced `underestimated` failure. Production immediate deadlines remain untouched. This verifies nonzero finite digital PCM and source identity, not human audibility, audio-device output, realtime hardware latency, or a universal explanation for every possible silent sound.

## Focused checks

Passed:

- `node tests/p7-24-entrophon-reservation.cjs` — 36 saved surface/unison/color/delay configurations against production encoded-record demand, each with cheap and rich Current; Current default contract retained.
- `node tests/p7-24-entrophon-saved-live-browser.cjs --html /tmp/xensonar-entrophon-fixed.html --results results/p7-24-integration` — native Chromium matrix above, same-state controls and no page errors.
- Same browser test with `--html /tmp/xensonar-entrophon-before.html --expect-underestimated` — controlled old-call failure reproduced.
- `node tests/p3b2-keyboard-entrophon.cjs` and `node tests/p3b2-entrophon-body.cjs` — direct keyboard ownership/body with Wave Current disabled.
- `node tests/p4a-entrophon-definition.cjs` — 108 legacy plans unchanged, immutable definitions and validation.
- `node tests/p4b-entrophon-library.cjs` and `node tests/test_entrophon_live_revision.cjs` — namespace, snapshots, revisions, missing definitions.
- `node tests/p4c2-n3-entrophon-static.cjs` — 864 body comparisons, 12 byte-identical C11 records, 479640 exact channel samples; production WASM rendered in worker threads.
- `node tests/f447-entrophon-cost.cjs` — unchanged reservation scan behavior.

The temporary HTML composition did not update the shared release build or manifest. Final release assembly and the broader integration matrix are owned by release integration; rerun the focused browser test against the manifest entry after that build.

## Unrelated Nodal browser timing gate during release integration

The initial full browser matrix failed the unchanged `nodal-ball-grid-browser.cjs` native probe: `hit.hz` was 0 instead of 542.5035924672305. Its failure remains preserved as `results/p7-24-song-projects/nodal-browser-initial-failure.json`. The unchanged focused harness subsequently passed. Read-only diagnosis confirms the Nodal bridge, grid controller and DSP hashes exactly match baseline commit `5e82993`.

The probe awaited a fixed 45 ms of wall time although the production bridge accepts updates only after 30 ms of **AudioContext time**, and the crossing controller deliberately establishes a new baseline after audio-clock gaps over 250 ms. Native trace experiments pass on baseline and current with valid frame advances; deliberately removing only the first wait reproduces the same zero-frequency/zero-gate observation on **both** versions while each native worklet is ready and the audio clock has not advanced. The initial failure did not record its clocks, so its precise short-clock versus long-stall cause cannot be established retrospectively.

With release integration's agreement, only the browser test was corrected: bounded polling waits for the existing audio-clock control gate; a stale gap or changed grid re-establishes the crossing baseline; stationary decay waits on actual published gate state. No production audio code changed. The corrected targeted test passes, measuring a 34.83 ms audio-clock crossing interval, frequency 542.5035924672305, gate 1, subsequent stationary/zero/muted gate 0, 14 unchanged nodes and 4 unchanged sources. Full diagnostic traces, baseline/current source hashes and final native result are in `results/p7-24-song-projects/nodal-browser-diagnosis.json`; the focused log is `nodal-browser-state-wait.log` in the same directory.

The final manifest-entry Entrophon run is retained in `results/p7-24-song-projects/regression-output/p7-24-integration/entrophon-saved-live.json` and the full browser validation log. Historical result paths were restored after capture.
