# XenSonar P7.38.12 — Starter Grid Consistency Repair

Base: `XenSonar_P7_38_11_Starter_Sessions_Test.html`  
Deliverable: `XenSonar_P7_38_12_Starter_Grid_Consistency_Test.html`  
Diff: `XenSonar_P7_38_11_to_P7_38_12_Starter_Grid_Consistency.patch.gz`

## Defect report
The first starter session showed contradictory labels and played a chromatic field:
- Quickrack: `12 EDO · Aeolian`, `Just Intonation · Harmonic Minor`, `Bohlen–Pierce · BP Moll`.
- Quickrack badges / tooltips: Aeolian, CHR / Chromatic, BP Moll.
- Performance header: `Custom` although no custom tuning was saved.
- Fretboard/keyboard grid: unmuted degree rows; mismatch against the chosen modes.

## Root causes
1. P7.38.11 starter records set `gridProfile.modeId` but created `mainMutedDegrees=[]` for Aeolian and BP Moll. Unlike some mode-aware paths, the low-level playable grid generation (`Fx` / `uw` / `wF`) takes explicit `manualGridMutedSteps` and offsets, **not** `gridMode`; an empty mask produces a chromatic grid.
2. The JI starter set `modeId='chromatic'` and an arbitrary manual mask. Thus CHR/Chromatic was not a display glitch: this was the actual metadata saved by the installer.
3. The performance-strip `Kue` labeled anything `Custom` when the manual mask differed from `xF(gridMode,tuning)`, even if it merely omitted redundant exclusions already provided by the mode. This was a misleading status predicate.
4. Editing a saved Grid Profile's mode did not recalculate its explicit grid degree mute mask, creating the same inconsistency for newly edited profiles.

## Implementation
- Added regular `harmonic_minor` mode to the existing native scale definition `yF` (degree set 0,2,3,5,7,8,11; label `Harmonic Minor`). Uses existing projection onto native JI intervals; no new synth or 12-EDO pitch substitution.
- P7.38.11's starter record generator now sets exact explicit manual masks for **all five** starter tunings, including the secondary session's 19-EDO Phrygian and 31-EDO Dorian.
- Grid profile editing uses existing `xF(mode, tuning)` mask derivation when switching mode, unless the caller is explicitly supplying a manual mask in the same patch.
- `Kue` labels `Custom` only when manual mutes introduce *additional* degrees beyond mode-projected excludes, or custom offsets exist. A normal Aeolian/Harmonic Minor/BP Moll mask is no longer mislabeled as Custom.
- Narrow idempotent migration corrects P7.38.11-only built-in session IDs/instance IDs. It runs separately for the Meta Session storage and the Quickrack storage. It does not alter user-modified mutes, changed modes, offsets, distinct artist instances, unrelated sessions, colors, demo material references, or audio logic. New installs get corrected seeds directly.

## Verified interval sets
- **12-EDO Aeolian:** 0, 2, 3, 5, 7, 8, 10 (mutes 1, 4, 6, 9, 11).
- **JI Harmonic Minor:** JI pool indices 0, 1, 2, 4, 6, 7, 11; ratios 1/1, 9/8, 6/5, 4/3, 3/2, 8/5, 15/8 (mutes 3, 5, 8, 9, 10).
- **Bohlen–Pierce BP Moll:** 0, 1, 3, 5, 6, 8, 9, 11, 12 (mutes 2, 4, 7, 10).
- **19-EDO Phrygian:** 0, 2, 5, 8, 11, 13, 16.
- **31-EDO Dorian:** 0, 5, 8, 13, 18, 23, 26.

## Gates
- Syntax checked all inline JavaScript using Node.
- Asserted built-in mode and all five projected playable-degree masks.
- Executed the **actual** `applyGridProfile` function in an isolated environment with the source's expected tuner contract. All five profiles update `gridMode`, `gridTuning`, and `manualGridMutedSteps` consistently.
- Executed the **actual** Meta Session migration method in a simulated store: original presets repaired; user customizations and unrelated sessions untouched; second migration is a no-op.
- No interactive browser or audible check was possible in this runtime. A clean and a P7.38.11-upgraded browser still require real GUI test: click all three Quickrack Grid tiles, confirm the header/tuner dropdown, visual stage line count, keyboard pitches, BP tritave behavior, save/load, and that manual tweaks remain independent.

## Merge safety
Only layer this increment on P7.38.11, or manually port the grid fixes into a later merged branch. Do not overwrite new audio, hotkey, UI, or persistence work. No dedicated second save is required for built-in Grid Profiles: their configuration is embedded in the saved Session/Quickrack entry.
