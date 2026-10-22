# Startup resource investigation

Frozen input: commit 18fc033, exact built standalone copied to `results/combined-startup/startup/baseline.html` before integrating the newer CombinedNodalStarterGrid source.

Measurement scope: host Chromium; managed browser rejects `file://` with `ERR_BLOCKED_BY_ADMINISTRATOR`, so the exact standalone HTML is served by a loopback HTTP server. No external resource imports are added. These measurements neither reproduce Opera/Firefox crashes nor establish their cause.

## Baseline evidence

`tools/combined_startup_profile.cjs` records CPU sampling profiles, CDP metrics, long tasks, storage operations, audio contexts, workers, decodes, navigation timing and browser errors. Three cold and three populated trials are archived in `baseline.json` and matching `.cpuprofile` files. The populated fixture contains 8 saved Material Intake workspaces, each referencing a distinct 12-second 48kHz stereo donor with a mono analysis copy (52.73MiB total PCM).

Every populated startup reads all 8 assets into the module's permanent `preloadCache`; cold startup reads none. Each asset also opens/closes another IndexedDB connection. No worker, AudioContext or audio decode starts during the no-action startup window. This rules out an eager audio-worker fan-out in the measured path; it does not rule out other crash causes.

CPU time/long-task/heap measurements vary substantially across host trials. Deterministic unnecessary asset reads and retained PCM are the primary proposed resource lever. Avoid treating small timing deltas as wins.

## Existing ownership

* `src/storage/04_sample_donor_bridge.js` executes a top-level `await __ForgeF33.preloadAllMaterialIntakeStates()` on every open.
* `module_bundle/22_materialIntakePersistence.js` lists every workspace, serially resolves every asset reference and retains every fully hydrated workspace in a Map.
* `E6e(key)` in `forge/ui/02_donor_routing_and_hearing.js` reads either the local ZK cache or the preloaded persistent cache synchronously.
* `lGe` initializes React state synchronously from E6e, then an effect immediately schedules autosave. Removing the preload alone would cause a false empty initial state and could overwrite a saved donor.
* The second preload caller runs explicitly after a Donor Library package import; it is a refresh operation and must retain its semantics.
* `nue` mounts the nominally lazy Forge room even while hidden, with `packageStationKeepAlive`. WWe then mounts canonical Forge so the global package station owner Qte exists. A naive lazy-mount change would let Ute time out and use Hte's empty default-composer fallback for exports. This dependency must be addressed before a separate room-demand initialization change.

## Proposed first seam

Expose one `ensureMaterialIntakeState(key, {signal})` operation at the persistence module. It performs no list or asset read until that workspace is requested. Per-key and per-asset in-flight requests join; asset reads have a bounded queue. A cancelled waiter does not cancel another owner's shared read. Failed requests leave no fulfilled empty cache and can be retried.

Place an async hydration owner immediately outside CGe, before lGe mounts. It shows loading or retry state and retains incoming upload/selection props while waiting. Only after the real saved state is available does the existing lGe owner mount; consequently its initial autosave sees restored state. Key changes/unmounts invalidate the old view's completion. Existing render, audition and transfer actions remain in the hydrated owner, so they cannot observe a saved source as falsely empty.

Do not add a delay, external chunk, alternate DSP path or parallel prewarm. Keep preloadAll only for explicit package refresh. A separate demand-mount change can follow after measuring this seam and explicitly moving package-station registration/readiness ownership.

## First stage implemented and verified

The persisted module now exports `ensureMaterialIntakeState`, joins concurrent workspace/asset reads and bounds asset reads to one. Demand can promote a queued shared asset ahead of an explicit all-workspace refresh. Aborting one waiter cancels its view without rejecting another waiter's shared request. A failed read is evicted and can be retried; a missing referenced asset produces a recoverable error, never a ready source marker. Each hydrated workspace receives its own cloned PCM, preserving previous mutable/transferable ownership even when the IDB read joined another workspace's read.

CGe is a keyed hydration owner; the former editing owner is `__CGeHydrated` and mounts only after the requested saved state resolves. A loading/error/retry state contains no upload/editor or autosave owner. Incoming external File props stay available until the real owner consumes them. Changing workspace keys aborts the old view's completion. Explicit donor-package import retains its awaited all-workspace refresh.

Focused tests:

* `node tests/combined-startup-intake.cjs`: no module-evaluation I/O, per-key and per-asset join, cancellation isolation, unloaded versus known absence, retry, missing PCM, bounded reader. Two workspaces share one stored asset: mutation and transfer/detachment of one workspace's PCM leave the other intact.
* `node tests/combined-startup-owner.cjs`: editing owner cannot mount early; key change ignores late old-key completion; retry preserves pending external File intent.
* `node tests/combined-startup-intake-browser.cjs`: holds the actual IDB PCM receipt after opening SpectralForge; editor/upload owner remains unmounted and pending autosave remains empty. Releases the receipt, verifies exact saved donor PCM and fine selection, flushes autosave and verifies browser reload.

## Native first-use and cancellation

Starter preparation now belongs to explicit material demand. Native Material/RFL managers, direct selection, direct letter hotkeys, loop toggles and native RFL Preview wait for the same shared durable preparation before looking up playable entries. Letter hotkeys retain their synchronous handled/unhandled return value; an initially empty catalog no longer drops the first letter. Ordinary libraries without a pending Starter handoff retain their synchronous selection path.

Each native scope owns a generation counter. Stop, manager close, a later selection, hotkey-bank mode changes and unmount invalidate the waiting consumer while the shared preparation can finish for another consumer. Native RFL Preview creates its cancellable ownership snapshot before preparing missing material; neither its AudioContext nor playback starts after a cancelled wait. Starter registration notifications update the real catalog without selecting or activating a track. An explicit missing known Starter ID can retry preparation, while broad manager demand preserves deliberate deletion after completion.

`node tests/combined-starter-native.cjs` executes the production K0e/cge/bge controller functions and uPe/cPe hotkey seams with controlled asynchronous receipts. It covers first-letter handling, fresh Material/RFL lookup, manager opening/closing, Stop/toggle/selection/mode cancellation, native Preview readiness, no pre-ready AudioContext, silent preparation registration, explicit missing-ID repair and ordinary-library/deletion preservation. The fixture reads current source files and has no frozen result-snapshot dependency.

## Three-stage resource attribution

Every stage has three cold and three populated trials. See `retained-summary.json` and raw `*-retained.json`. MiB below are binary MiB.

| Exact standalone stage | Empty retained backing storage | Populated retained backing storage | Unused asset reads / cached workspaces |
| --- | ---: | ---: | ---: |
| Original 18fc033 | 47.31MiB | 100.05MiB | 8 / 8 |
| Exact CombinedNodalStarterGrid candidate 572971… | 47.35–48.87MiB | 100.07–100.08MiB | 8 / 8 |
| Candidate plus isolated workspace-demand change | 47.34–48.87MiB | 48.87–49.63MiB | 0 / 0 |

The 52.734MiB persisted PCM fixture is no longer fetched or retained before a workspace requests it. Empty-workspace memory is essentially unchanged; the patch makes no empty-workspace speed/memory improvement claim. Populated active-renderer RSS in candidate trials was 248.6–253.4MiB versus 212.7–213.3MiB after the demand change. RSS includes additional browser/native memory and should not be equated with retained PCM bytes.

Every stage creates one React root and two canvas elements, with total backing area 970,760 pixels (1100×580 and 1180×282). No main-room canvas/DSP behavior was changed. Original no-action startup creates no Worker, AudioContext, OfflineAudioContext or decode call. The candidate adds 1–2 OfflineAudioContexts through its new native default-seed attempt (`VR → P9e → j$ → __mlRenderCached → z$`); this was reported to the Starter integration owner for a separate actual-demand gate. It is not an effect of the workspace persistence patch.

Timing caveat: a concurrent source-review diff process occupied a CPU during the first repeated batch, and one diagnostic parse trace overlapped a behavioral browser. These runs remain as evidence, but no CPU percentage or startup speedup is claimed from them. The final serial checks below use the combined gated source and a corrected module-readiness barrier. The large single HTML still has its initial parse/compile cost; this patch does not split or remove code.

## Final serial comparison on the frozen build

The final profiler waits for the actual single React root and two animation frames before its two-second no-action observation. Browser `load` alone can precede completion of a module's top-level await; this correction prevents a partially initialized archived candidate from being measured as a finished startup. All 12 final trials reached that barrier. The prior raw batches above remain preliminary evidence.

Inputs and raw evidence:

* Original: 5,859,506 bytes, SHA-256 `64f5bda8b01595dc265f2945397b83443b123b3f3babdf7eda511f8635eaed01`; `startup/baseline.html`, `final-original.json` and four CPU profiles.
* Supplied CombinedNodalStarterGrid candidate: 5,884,717 bytes, SHA-256 `572971dd9c06fd4aee243625e1b3d377933e35477304ec619a7b918509c56370`; `source-review/combined-candidate.html`, `final-candidate.json` and four CPU profiles.
* Final active standalone: `Xensonar_P7_39_Combined_Startup_Test.html`, 5,906,819 bytes, SHA-256 `602dc8199d85cf49cd259aad14e3f13de6a071d2e1e53f0105af7babd86b504c`; `final-combined.json` and four CPU profiles. `final-summary.json` contains each trial's counts, backing-storage bytes, JS bytes and active-renderer RSS.

Two fresh-browser trials per condition, binary MiB; memory is measured after explicit garbage collection. Populated means the same eight saved workspaces with 55,296,000 bytes (52.734MiB) of persisted PCM.

| Stage / condition | Retained backing storage | Active-renderer RSS | Unused asset reads / cached workspaces | OfflineAudioContexts |
| --- | ---: | ---: | ---: | ---: |
| Original / empty | 47.31MiB | 194.20–194.25MiB | 0 / 0 | 0 |
| Original / populated | 100.05MiB | 245.56–245.72MiB | 8 / 8 | 0 |
| Supplied candidate / empty | 48.87–51.15MiB | 210.43–215.29MiB | 0 / 0 | 3 |
| Supplied candidate / populated | 101.60MiB | 261.55–261.58MiB | 8 / 8 | 2 |
| Final / empty | 47.35MiB | 196.45–199.38MiB | 0 / 0 | 0 |
| Final / populated | 47.35MiB | 198.42–201.54MiB | 0 / 0 | 0 |

All final no-action trials create **zero Workers, AudioContexts, OfflineAudioContexts and decode calls**. No unused saved asset is fetched, and zero fixture PCM bytes are retained in the workspace cache before Forge demand. Every original/candidate/final trial retains one React root and two canvases (970,760 total backing pixels), and records no page errors. The candidate's two populated OfflineAudioContexts follow its preliminary fixture-initialization visit, which may have prepared part of its eager defaults already; the raw operation stream is retained.

The populated workspace memory reduction is repeatable. Empty final memory is close to the original; no empty-start memory improvement or broad startup-speed improvement is claimed. Timing varies strongly even in this serial host batch. The approximately 5.9MB standalone still pays its eager parse/compile and existing module-initialization cost. Forge demand mounting and package-station ownership remain a separate future change.

The actual held-asset browser regression also selects Donor hearing mode, draws a nonempty figure and clicks the parent Forge Play control while CGe's saved source receipt is held. It stays `donor-pending`, gray, uncached and stopped, with a clear missing-source message; zero offline renders, live source starts or media-play calls occur. Independent carrier controls remain available. Releasing the receipt retains the exact saved donor/selection and the normal autosave/reload round trip.

These are host Chromium resource observations, not physical Opera/Firefox crash reproduction or a universal no-crash claim. The managed host blocks `file://`; exact standalone bytes were served from loopback without adding external resources.
