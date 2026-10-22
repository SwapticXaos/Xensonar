# Concrete bounded implementation sequence for lead decision

Stage 1 durability is implemented and native-browser verified separately. This is the next-stage plan, not a claim that direct Nodal artifact playback exists.

## One artifact and narrow interface

Add `src/nodal/14_melodic_snapshot.js` (or logically named snapshot owner) exposing:

- `capture({composer,bpm,trackIds}) -> Promise<artifact>`: normalize and deep-copy the chosen section, close all source dependencies, hash canonical semantic payload.
- `validate(artifact) -> immutable artifact`: reject unsupported/missing dependency schemas with source ID/hash and stage.
- `prepare({artifact,context,owner,destination}) -> prepared adapter`: precompute plans/pitch tiles, decode owned samples, no live library reads.
- `schedule(event)`, `retune(ratio)`, `stop()`, `dispose()` on the prepared adapter.
- `renderCache(artifact)` only when an audio-only consumer requests it. Never defines the artifact.

Material-library row owns exactly one `artifact` plus optional `audioCache`. Root Follow bank stores artifact row identity and expected semantic hash only; project has no link back to exported object. No extra copy of definitions in bank settings.

Canonical object fields:

```
{schema:'xensonar.melodic-snapshot', schemaVersion:1,
 contentHash:'sha256:...',
 score:{bpm,bars,beatsPerBar,stepsPerBar,segmentCount,
        loopStartBeat,loopEndBeat,rootHz,
        tuning:{id,repetitionModel,repetitionRatio,pitchLines,pitchSteps},
        selectedTrackIds,markers,tracks,notes},
 sources:{[contentHash]:{kind,schemaVersion,kernelVersion,definition}},
 bindings:{[sourcePresetAtExport]:contentHash},
 dependencies:{[hash]:{kind,mimeType,bytes,blob}},
 provenance:{exportedAt,sourceProjectId?,producerVersion}}
```

Hash semantic score/sources/bindings/dependency hashes, exclude names/export timestamps/cache/object URLs. Persist exact normalized note block including local/instrument fields, sample slice/tempo/anchor options, overrides, fades and carrier field, not only L9e's reduced pattern. `lineHz`/ratios/repetition interval are data, not reconstructed from degree count. Track/source labels are display metadata and must not substitute DSP content.

Nodal source captures `nodalFindInstrument(preset, composer)` now, then normalizes/serializes exact schema/kernel. Ordinary synth source captures the actual `dL` resolved voice descriptor, not built-in preset ID. Samples capture the existing stored Blob plus source pitch/envelope metadata. Entrophon/custom require their exact existing owned definition resolver and adapter; unsupported resolved sources must fail visibly before any publication, never silently use current presets or substitute generic synth/audio. A hybrid artifact must succeed only once every audible constituent is owned.

## Callsite sequence and scope

1. **Artifact capture and persistence**: snapshot owner + manifest. Extend package validator `n0e` with versioned artifact variant; extend `a0e`/`UT`/`u0e` to accept artifact-only records and generate Blob URLs only for optional caches. Durable helper verifies artifact hash/dependency closure instead of requiring >44-byte WAV. Existing v1 WAV packages unchanged; no database version bump needed because current store is schema-less.
2. **B9e export adapter**: capture selected tracks consistently with P9e active/enabled rule, persist artifact without calling VR for pure synthetic/Nodal RFL. Material Track/standalone preview can request cache lazily through one resolver. Existing WAV export remains supported. User-visible status identifies stage/hash on failures. All published rows are durable.
3. **RFL config identity**: extend `tg` and normalizers with small artifact-reference variant. Legacy synth/material variants remain byte-behavior compatible. Bank localStorage never owns source definitions. On hydrate, resolve row/hash then prepare; missing artifact is explicit error. Do not migrate legacy Nodal material into invented recipes.
4. **Direct scheduler adapter**: `03_rfl_transport_legacy.js` lifecycle/preparation gate, event dispatch in `lSe`, stop owner in `__f49StopRFL`. Use existing Jye timing/drop and global priority. Prepared synth descriptor goes to `nSe` through explicit resolved-source argument; Nodal uses pinned player and stored articulation, frequency ratio from immutable note. Returned Nodal setFrequency is connected to shared active-voice retune owner, worker frequency requests coalesced, token checks before publish/playback. No DSP compile per tick/block.
5. **Audio-only consumers**: replace `$fe` Material Track `entry.blob.arrayBuffer`, RFL legacy material decode, and `Vse` standalone preview decode with `resolveArtifactAudio(entry)` (legacy blob fast path, optional cache or offline deterministic rebuild). Never let no-cache artifact reach raw Blob dereference. Render-on-demand for these consumers is compatible because direct RFL itself never requires that cache.
6. **Spectral Forge and file package**: D9e currently exports carrier figures through existing transfer semantics. Its transfer must include the artifact/source closure when it purports to preserve sound; do not label a carrier-only import as full sound snapshot. Package exporter `r0e` must emit artifact manifest/dependency files even when there is no WAV. Current `r0e` assumes `audio.kind` and needs a discriminated branch.

Expected touched production owners: new snapshot owner; `01_voice_and_rfl_ownership.js` (~validators/row hydration/Material Track resolver); `04_render_cache_and_stems.js` (B9e); `03_rfl_transport_legacy.js` (prepare/dispatch/retune); `02_rfl_worklet.js` (prepare/stop boundary); preview owner `11_recording_and_granular_controls.js`; manifest + package/transfer adapter when located. New tests ~3 files native storage/dependency lifetime, direct audio, bounded performance. No whole RFL rewrite, no per-quantum allocations or old-blob deletion.

## Gate between steps

Before enabling B9e artifact-only export, all raw `.blob` consumers and validators above must have an adapter. Before enabling direct source dispatch, source-closure fixture matrix must include ordinary synth, Nodal v1/v2, track pan, note overrides, microtonal ratio/BP, samples and the repository's Entrophon/custom source types. If exact Entrophon/custom preparation cannot be reused within this bound, stop expansion and retain a clearly reported unsupported-source error; do not claim hybrid acceptance or silently force all tracks through WAV.

First acceptance can be durability + immutable snapshot schema retained alongside optional WAV only, explicitly labeled staged (direct route still incomplete). Product acceptance requires subsequent no-cache direct playback and project/source deletion tests. Lead should decide whether current startup-focused work includes that multi-owner feature, or deliver its evidence/plan as the next implementation card.
