# Xensonar Material Adapter v1

This document defines the lowest-friction adapter contract for external "material forge" tools.

## Goal

A foreign sound design tool should not need to imitate Spectral Forge internally.
It only needs to export a material package that Xensonar can understand.

## Canonical package

Schema version: `xensonar-material-v1`

Required fields:
- `id`
- `name`
- `role`
- `audio.blob`
- `timing.bpm`
- `timing.bars`
- `timing.loopStartSec`
- `timing.loopEndSec`
- `timing.intendedLoopDurationSec`

Current useful roles:
- `loop`
- `waveMaterial`
- `particleExciter`
- `droneTexture`

## First safe integration target

External tools should start by exporting `role: "loop"`.
This is the least invasive path, because it does not touch Xensonar's attack-critical note triggering.

## BPM semantics

`bpm` must speak the same tempo language as Xensonar's main transport.
Do **not** encode "16th-notes per minute" here.

## Guide semantics

Guide markers are metadata only.
They must not be baked into the audio unless the user explicitly wants audible metronome content rendered.

## Audio expectations

For v1, a rendered WAV blob is enough.
No live streaming is required.
No internal app state from the foreign forge is required.

## Integration rule

The external forge should output:

`foreign tool -> adapter -> XensonarMaterialPackageV1 -> registerExternalMaterialPackage(pkg)`

That lets Xensonar keep its current wiring while opening the door for multiple material producers.


## Forge Bridge layer

The material package remains the outer contract, but inside III.2 there is now an explicit bridge layer:

`producer -> forge bridge adapter -> XensonarMaterialPackageV1 -> registerExternalMaterialPackage(pkg)`

This allows:
- Legacy Spectral Forge to keep its current internal logic
- a future canonical/synesthetic forge to plug in at the same point
- third-party or external forges to register their own bridge adapters without touching Room V wiring
