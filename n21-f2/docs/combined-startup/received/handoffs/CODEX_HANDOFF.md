# XenSonar Codex technical handoff — Nodal/Melodic Snapshot, Root Follow, Starter Grid (22 Oct 2026)

## Scope and provenance
The exact Codex ancestor is `XenSonar_P7_38_Sessions_Reviewed_Quellen.zip` (not an approximate P7.38 build). After P7.38.11 Starter Sessions, TWO independent patches each adopted the name P7.38.12: (A) `Nodal_Snapshot_Persistence`, and (B) `Starter_Grid_Consistency`. They are siblings, not consecutive releases. This deliverable creates a **new composite review candidate** by a conflict-free three-way merge on P7.38.11. See manifest for verified hashes. Do not call this a final accepted fix.

## Product contract: separate working project from exported snapshot
1. A Melodic Loop *Project* is an editable WIP state with multiple patterns, instrument choices and note editing. Editing/deleting it must not alter previously exported snapshots.
2. Export to Material Track / Root Follow / Spectral Forge creates an **independent, immutable snapshot** of the chosen musical section: notes, track events, tuning, loop lengths, sound definitions and required dependencies.
3. Pure synthetic or hybrid synth loops must remain directly playable and continuously pitch-modulatable in Root Follow **without compulsory WAV or granular conversion**. Hybrid means adapt per constituent source; only sample-dependent components need samples.
4. Nodal live instruments need the same direct route; instrument presets may evolve without retroactively changing an exported loop. Avoid runtime allocations/catch-up bursts and protect the priority of Beat, Bass, Material Track.
5. A WAV cache/fallback is optional for compatibility, not the sole definition of a synthetic snapshot; cache eviction/rebuild must not silently lose a musical artifact.
6. No 12-EDO assumptions for JI/Bohlen–Pierce/other microtonal pathways.

## Observations from the current source
- Ordinary synthetic Root Follow loop playback exists (synth event route); Nodal-containing Melodic Loop exports were routed to `sourceKind:'material', renderMode:'flowing'` through `__mlNodalRflConfig` rather than a direct Nodal event renderer.
- The Melodic Loop `Send to Root Follow Loop` path rendered/stored an audio blob and previously could expose/register a bank entry before persistence finished. Failures could appear as console warnings only.
- In P7.38.12 Nodal review branch, a promise fence delays publish/confirmation until the asynchronous persistence call returns and surfaces failures; narrowly scoped fallback can rescue some legacy Nodal event recipes when their WAV exists. This does **not** prove an IndexedDB transaction's final commit/close behavior or rescue a missing blob.
- Historic report: user played a Nodal melody, exported it to RFL, initially heard it, later found the entry silent. Root cause for that particular persisted object is NOT yet proven: investigate actual bank config, reference IDs, hydrated material package, failure handling, preset references and version migrations. No user's original browser store was examined here.

## Codex priority A — forensic checks before redesign
1. Reproduce in a disposable profile: generate Nodal instruments, compose a melody, send to RFL, verify immediate playback; reload, reopen, switch spaces and repeat. Repeat with a normal synth and hybrid configuration. Preserve test states and log bank item IDs, sourceKind/renderMode, notes, Nodal definition hashes, material blob availability, DB commits and structured errors.
2. Verify `Send to RFL` snapshots independently from Melodic *Projects*: save, edit, delete projects and Nodal source presets; ensure previously exported snapshot is identical and still playable.
3. Inspect IndexedDB durability: `request.onsuccess` vs `transaction.oncomplete`, quota exceeded, blocked/versionchange, mid-reload race, timeout, object URL revocation, hydrate/update timing, delete/reorder races. Register/advertise only on acknowledged durable state. Test a failure and verify it does not publish a ghost item.
4. Trace `__mlNodalRflConfig`, `B9e`, material registration/hydration (`bu`, `KT`, DB helpers), Root Follow config normalization, bank hydration, fallback and the Nodal runtime renderer (`__XenNodalDSP.render`, `nodalScheduleOffline`). Check true semantics rather than relying on symbol names after minification.

## Codex priority B — architecture decision
Evaluate a schema-versioned, immutable **Melodic Snapshot** with: serialized note/event timeline and pattern selection; exact per-track Nodal/preset DSP definition (or content-addressed immutable dependency); root/tuning/repetition interval mapping; BPM, bars, loop boundaries, gains/pans, envelope/attack/release; semantic content hash; optional audio cache/fallback. Maintain a migration path for legacy material loops and synth loops.
Design Root Follow event scheduling where synth timbre stays in its existing synthetic path and Nodal uses precomputed voice plans/tiles but responds to continuous root pitch; preserve note durations and attacks and support microtonal pitch maps. Hybrid voices must keep per-track source type. Avoid forcing a note renderer to constantly produce full WAV snapshots to get continuous pitch modulation.
Gate acceptance on audible modulations, hard reload persistence, project independence, stable performance under particles/wave starters, and automated browser+audio tests. **Do not rewrite Root Follow or delete old blobs merely to make tests pass.**

## Parallel Starter Grid consistency patch (P7.38.12 sibling)
P7.38.11 had correct labels but WRONG effective muted degrees, notably chromatic play despite Aeolian/BP labels and JI metadata reading CHR. The new branch defines native `harmonic_minor`, explicit mute masks for five profiles (12-EDO Aeolian, JI Harmonic Minor, BP Moll, 19-EDO Phrygian, 31-EDO Dorian), adjusts the `Custom` indicator, recalculates masks when changing the mode and narrowly migrates only unmodified built-in profile IDs from P7.38.11.

**Preserve the distinction:** user-changed masks/offsets/modes and renamed/custom instances must never be overwritten. Test both Meta Session storage and Quickrack storage; run idempotence checks. Old sessions and custom presets must be preserved. The migration must not touch audio routing. See original `handoffs/ORIGINAL_STARTER_GRID_HANDOFF.md` for ratio/mask matrices.

## Known limits and test results
- Merged HTML is a new review artifact and not user-auditioned.
- Both P7.38.12 siblings were cleanly merged against their exact common P7.38.11 ancestor; no conflict hunks.
- 64 files (source, template, style, manifest) differ from exact P7.38 Codex baseline. Complete patch applies cleanly; source produces **byte-identical** standalone HTML.
- All inline scripts parse; grid mask/boot migrations test and Nodal persistence promise test pass; the direct Nodal synthetic route, real IndexedDB completion and live browser audio remain UNVERIFIED.
- Some older isolated regression tests source snippets but miss new first-boot globals; repair test fixture context separately, without weakening runtime first-boot guards. Run full suite once fixture issues are resolved.

## Integration rule
Apply ONE cumulative SOURCE patch to P7.38; do not apply P7.38.12 sibling deltas as if they were successive patches. If Codex has progressed beyond P7.38, compare against that live tree and cherry-pick surgically instead of overwriting newer work. Keep archive and patch hashes in the manifest for traceability.
