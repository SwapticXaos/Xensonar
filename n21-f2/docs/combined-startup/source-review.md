# Combined source review and Starter Grid integration

Baseline: branch `codex/granular-sample-hold`, commit `18fc0331a58fd7528d9f7c071418ebe590bd0b68`. Every one of the 64 changed source files was byte-equal to its `HEAD:n21-f2/...` blob before applying the cumulative SOURCE patch; `results/combined-startup/source-review/baseline-blobs.json` records Git blob IDs, SHA-256, byte counts. Working source, styles, template and manifest were clean; startup evidence was the only untracked work.

## Provenance and reproduction

- Received handoff ZIP SHA-256: `0ca611d038f5b3983986c4ab1b1d248fbf418451e6fb5a7879104e140925bab9`.
- Handoff-declared original baseline ZIP: `52aebccb22cd7312f2749e1b8de45032319fdfe7a82e9906eeb07d2049e2be31`. Historical active HTML was independently verified here: `64f5bda8b01595dc265f2945397b83443b123b3f3babdf7eda511f8635eaed01`.
- Exactly one cumulative SOURCE patch applied, SHA-256 `4c4978bc1a013076fe3c48c13304706094fe3845d3b6fa12100aec75c68271eb`. The HTML patch was not applied. P7.38.12 Nodal and Starter Grid deltas are siblings from P7.38.11 and were not layered sequentially.
- Initial source build used a temporary manifest entry and reproduced the original combined review candidate exactly: SHA-256 `572971dd9c06fd4aee243625e1b3d377933e35477304ec619a7b918509c56370`, 5,884,717 bytes. `node build.cjs --verify` passed at this stage. All three supplied handoff tests passed; those tests are simulated/static evidence, not an audio/durability proof.
- Frozen candidate: `results/combined-startup/source-review/combined-candidate.html`. A startup build accidentally overwrote this temporary candidate path; the startup variant was copied to its separate `startup/after-initial.html`, then the exact candidate was restored from a clean baseline Git archive + the same single SOURCE patch. Its SHA-256 was reverified as `572971...`; historical HTML and all original results were preserved. No candidate performance comparison should use the overwritten interval.
- The candidate was not accepted unchanged. The source ledger below records adoption/correction decisions. Final P7_39 reviewed entry/build hash belongs to the release stage and is distinct from the handoff candidate.

## Starter Grid findings and corrections

Candidate browser reproduction identified migration defects in both Meta and Quickrack: known built-in IDs with renamed tiles and offsets of `0.001` still qualified as untouched; renamed built-in saved sessions also migrated. The original `>.02` offset predicate and missing name checks caused the overwrite. Changed masks, changed modes and distinct instance IDs were already protected.

The shared legacy-profile matcher now requires exact built-in tuning ID, instance ID, tile name, original P7.38.11 mode and mask, all offsets exactly zero, and disabled per-profile Bass Grid. Meta saved/current/active-palette migration requires the exact built-in session ID/name and no imported `legacyOrigin`; dirty drafts remain untouched. Quickrack skips a renamed active built-in session as well. This deliberately permits a missed migration when provenance is uncertain; users can explicitly reapply a corrected standard profile. It never changes user colors, offsets, audio routing or non-starter rows. Both paths use the same matcher to avoid drift. It also repairs a legacy active palette even if its saved row was previously repaired.

Five expected playable native degree sets:

| Tuning / mode | Degrees | Special contract |
| --- | --- | --- |
| 12-EDO Aeolian | 0,2,3,5,7,8,10 | explicit mutes 1,4,6,9,11 |
| JI Harmonic Minor | 0,1,2,4,6,7,11 | actual ratios 1/1,9/8,6/5,4/3,3/2,8/5,15/8; native JI pool |
| BP Moll | 0,1,3,5,6,8,9,11,12 | native tritave, period ratio 3 |
| 19-EDO Phrygian | 0,2,5,8,11,13,16 | projected native 19-step pool |
| 31-EDO Dorian | 0,5,8,13,18,23,26 | projected native 31-step pool |

The `Custom` indicator intentionally denotes extra manual exclusions or meaningful offsets beyond a selected mode. Omitting redundant mode excludes does not label a tuning Custom. This display predicate does not apply the mode to low-level `Fx`/`uw`/`wF`; saved profiles must still contain complete explicit masks. Profile-mode editing recalculates masks unless the same patch explicitly supplies a manual mask. No 12-EDO pitch substitution was introduced.

## Protected behavior

The broad cumulative patch was reviewed beyond Grid/Nodal: immediate decoupling reconnect, performance header geometry, global session colors, import/Meta headings and English hover/error text are included. Source syntax-shape comparison (normalizing literal text and comments) identified 13 JavaScript files with structural changes; all others retain identifiers, numeric constants and AST structure. Literal text review is still necessary because control-flow may compare labels (for example Stop preview); those changes were inspected in context.

No changes were made to RFL native preview power-OFF contract, three Session Play paths, Saved Entrophon definitions, live DSP worklet kernels, admission limits or underlying Drum/Bass/tuning libraries as part of Starter Grid repair. Nodal persistence/direct snapshot changes and measured demand hydration are separately owned and gated. Direct synthetic and microtonal paths remain required; a passing mocked fence test does not establish native transaction durability or a direct Nodal event renderer.

## Evidence and limitations

`tests/combined-starter-grid-browser.cjs` runs on native Chromium HTTPS origin in isolated contexts. It seeds legacy profile variants before application initialization, checks both persisted stores after reload, preserves custom colors and dirty drafts, and uses mounted native profile activation and OfflineAudioContext buffers for the five pitch sets. Candidate red evidence is in `results/combined-startup/starter-grid/candidate-red.json`; initial runs also revealed test-harness synchronization assumptions (React setter and asynchronous preview preparation), corrected by waiting at the real owner seams. Final focused green evidence is `results/combined-startup/starter-grid/migration-green-final.json`: all ten migration/preservation variants and the five native playable/rendered pitch sets pass. The audio fixture derives its expected preview frequencies from the actual live `gridBase`; its independent low-level 110 Hz degree-set checks remain unchanged. There is no human listening/device-latency claim.

The historical silent-after-reload Nodal object was not available and its individual root cause remains unknown. Opera/Firefox startup crashes, OOM/multi-tab and long live-load behavior require environment-specific validation. Early timing traces taken while a stray review Python diff process was running (approximately 13:19–13:28 UTC) are contaminated; the process was stopped and startup owner notified to rerun timing comparisons. Exact retained-PCM byte/object evidence is unaffected.


## Starter material demand and owner initialization

The combined candidate's automatic one-time render timer is removed. First boot still installs both ordinary v2 session records, colors and real mute profiles immediately. It does not advertise the six Material/RFL demo references until their three real native rendered packages have committed to IndexedDB. No-action cold boot creates zero OfflineAudioContexts.

`__XenStarterMaterial.ensure(scopeOrKnownID)` accepts `material`, `rootFollow`, a reserved demo ID or its typed reference. Eligible requests join one sequential native `VR` job. The job hydrates persisted materials first, verifies durable existing demo packages, renders missing demos with the existing composer/presets and publishes only after `__registerDurableMaterial` commits. A failure remains visible and Retry preserves the actual failed scope/ID. Completed loaded resources have an I/O-free fast path. Broad library demand is eligible only while the original one-time pending marker exists, so opening a manager after deliberate deletion cannot regenerate deleted material. An explicit known missing demo reference can request repair.

Actual demand seams cover Material/RFL Meta tabs and original managers, deferred Quick UI activation (the established synchronous `activate()` boolean API is preserved), Engage and the native controllers/hotkeys. Pending standalone Material and Meta/native RFL previews establish their cancellation owner before preparing. Stop, mode changes, later selections and closing the relevant owner invalidate delayed continuations; the shared rendering job can finish without replaying stale intent. Starter registration notifications update the real bank without activating a lane or powering the instrument.

Fresh Main Room profile initialization now waits for both the actual bridge and Grid adapter, then uses one animation frame to read current committed owner values. Only the untouched native 12-EDO Ionian fingerprint (including its explicit mask and zero offsets) with both loop lanes inactive receives the starter Aeolian profile. A user's intervening Grid/play choice wins. Two mount-time setter calls were found to overwrite each other through stale owner state; initialization uses one profile update and no delayed muting write.

Focused host evidence: `tests/combined-starter-demand.cjs` covers single-flight, failure/retry, ready reuse, broad deletion preservation, deferred selection cancellation, Material/RFL Stop and pristine-only initialization. `tests/combined-starter-native.cjs` covers native empty-library direct hotkeys, fresh lookups and Stop/selection/mode ownership. `tests/p738-session-integrity.cjs` remains green for profile switching, editor/live isolation, settings Undo and Engage rollback.

Native Chromium evidence: `results/combined-startup/starter-demand/browser.json` proves cold metadata/mutes with zero OfflineAudioContexts, explicit Meta Material demand, a real injected IndexedDB quota failure with no published fake row, successful retry of three durable demo blobs, non-silent native-rendered PCM and no live preview/lane activation. Repeated ready demand causes no additional renderer or IndexedDB work. Deliberate deletion and an isolated pre-existing authored profile are preserved. This focused evidence is tied to the recorded source snapshot; release reruns target the final active entry and record its final hash.

## All 64 cumulative source decisions

| Path | Disposition | Reviewed change |
| --- | --- | --- |
| `template/head.html` | Adopt | First-boot freshness snapshot occurs before initializers; storage-read failure blocks installation. |
| `src/handoff/00_chat_feature_addons.js` | Adopt | Decoupling release clears held/pending state immediately; paired synchronous reconnect changes preserve active synth voices. |
| `src/mix/03_quick_menu.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/mix/03_meta_menu.js` | Correct | Adds two first-boot ordinary v2 sessions, per-profile masks, both-store migration, Main Room muted initialization, global colors, headings/import placement and English UI. Correct migration fingerprint and renamed-session protection; preserve customized colors. |
| `src/mix/04_melodic_spatial.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/nodal/04_audio_runtime.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/nodal/07_sound_designer.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/editor/09_workflow_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/nodal/13_installation_ball_grid.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/01_app_runtime.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/workbench/01_preset_catalog.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/module_bundle/21_experimentStatePersistence.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/storage/01_donor_library.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/storage/02_donor_packages.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/storage/03_forge_packages.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/storage/04_sample_donor_bridge.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/01_instrument_state.js` | Adopt | Native harmonic_minor mode [0,2,3,5,7,8,11], reusing existing tuning projection. |
| `src/runtime/instrument/01_voice_gradients_and_effects.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/03_selection_and_recording_tools.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/04_performance_and_output_profiles.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/05_timing_and_admission.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/07_interpreters_and_installation.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/08_library_and_tuning_editor.js` | Adopt | Native performance-strip Grid Workbench title reflects current tuning/mode; hover text improvements. |
| `src/runtime/instrument/09_monitoring_and_manual_patterns.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/11_recording_and_granular_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/runtime/instrument/12_rhythm_and_bass_editor.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/rhythm/01_compact_drum_grid.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/rhythm/02_bass_and_rack.js` | Adopt | Custom indicator uses additional manual exclusions beyond native mode, retaining offset threshold semantics; this is display-only, not a low-level playable-grid mask substitute. |
| `src/audio/01_voice_and_rfl_ownership.js` | Correct / Nodal review | Persistence fence + error propagation; fast reconnect hook retunes existing synth AudioParams. Nodal owner validates transaction completion and immutable snapshot separately. |
| `src/audio/02_rfl_worklet.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/audio/03_rfl_transport_legacy.js` | Adopt / Nodal review | 6ms keyboard/release reconnect for active direct synth voices; ordinary pointer glide retains 26ms. Legacy Nodal material fallback scoped to Nodal only, audio owner reviews durability. |
| `src/audio/03_flac_encoder.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/audio/03_recorder.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/audio/entrophon/03_native_bridge.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/audio/07_governor_and_drums.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/rhythm/04_workspace_and_transport.js` | Adopt | Decoupling setter releases held root then calls synchronous reconnect; no quantized catch-up or rhythm scheduler rewrite. |
| `src/app/forge/01_room_shell.js` | Adopt | Keyboard pitch and Space-release root ref reconnect share current cursor pitch; accepted keyboard gesture only; pointer arbitration retained. |
| `src/app/forge/02_boot_and_workspace_tools.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/app/forge/03_spectral_grid_and_archives.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/app/forge/04_profiles_and_body_models.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/app/forge/07_preview_cache_and_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/editor/02_tools_and_audio_inputs.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/editor/06_output_routing.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/editor/07_composition_and_preview_ui.js` | Adopt | Action-button module forwards an explicit title to native button; English hover/status text. |
| `src/forge/ui/03_microphone_intake.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/analysis/04_audio_to_carrier.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/analysis/05_carrier_pitch_space.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/ui/04_audio_to_carrier_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/ui/02_donor_routing_and_hearing.js` | Adopt / startup correction | Extract Timbre buttons get hover descriptions. Later startup owner changes demand hydration separately, outside candidate attribution. |
| `src/forge/ui/03_method_selection.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/01_donor_selection_and_edits.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/03_timeline_and_transport_ui.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/04_render_cache_and_stems.js` | Correct / Nodal review | Send to RFL promise fence defers publish until async persistence; renderer and target semantics reviewed by Nodal owner, mocked handoff test alone insufficient. |
| `src/forge_and_melodic/05_preview_and_sample_intake.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/06_note_editor_and_material_tools.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/08_editor_actions.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge_and_melodic/11_analysis_canvas_and_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/hybrid/03_render_pipeline.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/ui/04_cecilia_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/forge/ui/05_workbench_controls.js` | Adopt | English UI/hover/error/diagnostic text only; AST structure, identifiers and numeric constants unchanged (literal values reviewed as wording). |
| `src/06_workbench_dialog.js` | Correct / startup review | English UI plus serialized resumable starter demo render/hydration. New no-action OfflineAudioContext work traced by startup owner; demand scheduling under review, preserve initial Main Room grid/mute metadata. |
| `styles/24_quick_menu.css` | Adopt | Fixed performance header grid slots and actual-strip container queries replace state-dependent Flex wrapping; no playback or data changes. |
| `styles/27_meta_menu.css` | Adopt | Global session color-editor layout/styles and accessibility sizing; existing per-entry annotation ownership retained. |
| `source-manifest.json` | Replace entry metadata | Source list retained. Exact combined candidate SHA first reproduced, then new reviewed P7_39 entry and final SHA owned by release agent; never rewrite historical P7.38 HTML. |
