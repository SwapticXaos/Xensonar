# Xensonar implant boundary

Status: **TARGET BOUNDARY FOR INTEGRATION**. This file describes where the
hardened Native kernel should attach to the current Xensonar product. It does
not claim sound parity and it does not require the current migration bridges to
survive.

## Canonical cut

Xensonar remains authoritative for **musical meaning**. Native becomes
authoritative when that meaning turns into realtime audio execution.

```text
XENSONAR PRODUCT / WORLD
UI, rooms, persistence, material library
keyboard / cursor / gesture interpretation
Kammerton / grid / tuning / root relationships
patterns / loop semantics
Forge musical policy
        |
        |  semantic adapter — translates meaning, produces no audio
        v
==================== IMPLANT BOUNDARY ====================
        |
        v
NATIVE AUDIO
absolute audio-frame time
Programs / voices / grains / envelopes
realtime DSP and routing
Master / Recorder / device backend
```

**Adapter purity rule:** an adapter may publish Assets, Gestures/VoiceSpecs,
State, Programs, FX State, Master controls, Recording controls and lifecycle.
It must not create AudioNodes, schedule Browser grains, own physical voices or
mix audio.

## What stays in the old Xensonar body

Keep product semantics unless deliberately migrated later:

- React/UI/world/rooms and interaction logic;
- Kammerton, grid, tuning, microtonal relationships and resolved pitch logic;
- keyboard-window, mirror, glissando and cursor semantics;
- Material library/workspaces/roles/bars/drag-and-drop;
- pattern and polyrhythm semantics;
- Forge/Myzel parameter policy and musical mapping;
- session/persistence/games;
- Golden/reference behaviour used by XenOracle.

## What the Native implant owns

- authoritative audio-frame clock;
- event execution and late-event policy;
- autonomous Program micro-scheduling;
- voice/grain lifetime;
- oscillator/sample/envelope bodies once migrated;
- realtime effects and routing once migrated;
- Master;
- Recorder;
- PipeWire/device output.

## Current 387 cut map

The current browser source already exposes useful seams, but some migration
seams are intentionally *below* the desired long-term boundary.

### WaveStarter

Useful old-side semantic path:

```text
resonanceKeyboardPitchCommandAssemblyBoundary
        -> resolveWaveStarterEmitState / preset tone plans
        -> WaveStarterVoiceSpec              [desired cut]
        -> waveStarterEmitAttackBoundary
        -> scheduledTonePlaybackBoundary
        -> createOscillator/createGain/...   [amputate in Native mode]
```

The Native adapter must receive already-resolved musical pitch. The current
`xen_wave_voice_spec.resolved_hz` seam exists for this reason. Native must not
invent Xensonar's tuning from a generic scale degree.

Canonical WaveStarter parity may require a richer bounded VoiceSpec than the
current three fields. Extend the typed spec when reference evidence requires
it; do not fall back to an opaque property map.

### Root Follow / Material

The present migration path is deliberately *not* the target seam:

```text
Browser Root Follow
 -> rootFollowMaterialRenderPlan
 -> per-window / per-grain plans
 -> nativeRootFollowMaterialBridge
 -> batch/ACK
 -> Native rhythm + Browser Forge/Aux
```

This remains a useful reference/migration organism, but the desired target is:

```text
Material Asset + Root/Harmonic State + RootFollow Program semantics
        -> RootFollow adapter
        -> persistent Native Program
        -> native microscopic scheduling
```

Do not design the long-term ABI around `RootFollowMaterialWindow` batches,
HTTP acknowledgements, Browser scheduling lead, Crisis policy or batch-8
transport.

The important transplant donor is the **musical generator semantics** hidden in
and around:

- `rootFollowMaterialRenderPlan.ts`
- `canonicalPreviewMaterialElastic.ts`
- `materialElasticGrainLattice.ts`
- `rootFollowMicroCutSafety.ts`
- `rootFollowGranularSettings.ts`

Extract/capture these as reference semantics or event traces. Do not transplant
Browser scheduling mechanics. The kernel's `xen_engine_set_grain_generator()`
seam exists so a canonical generator can replace the current placeholder
without replacing the substrate.

### Particles

A useful existing boundary is close to:

```text
particle world / collision / preset semantics
 -> particleSynthTonePlan / planning boundary
 -> particleToneRuntimeCallbackBoundary       [cut near here]
 -> scheduled WebAudio execution              [amputate]
```

The world remains product State/Gesture authority; Native owns sound execution.

### Forge / Myzel

Split the current `myzelPostFxRouter` conceptually into:

```text
focus/depth/parallel/activity/colour/wet policy   [keep]
        -> resolved ForgeFxSpec / State            [adapter]
        -> createBiquadFilter/createDelay/...      [amputate]
```

Do not copy AudioNode topology into the ABI.

### Rhythm / Drum / Bass

Keep pattern, tempo, phase and polyrhythm semantics. Do not transplant Browser
prefill horizons, pressure-dependent scheduling or stale-step recovery as
musical architecture. Long term these become persistent Native rhythm Programs.

### Master / Recording

The browser keeps UI controls and take/edit/export workflows. Native owns the
authoritative Master and Recorder. Once a lane is migrated, it must not remain
as a second independent physical Browser stream.

## Current adapter status

`include/xen/xen_xensonar.h` is intentionally small and provisional.

- WaveStarter-style interaction accepts **resolved Hz**, not a fabricated
  Xensonar scale degree.
- Root-Follow-named granular parameters remain
  `EXPERIMENTAL_PLACEHOLDER / PARITY_NOT_ESTABLISHED` and are only a workload.
- Forge parameters are placeholder execution values, not proven Myzel parity.

This adapter is a temporary semantic membrane, not a mandate to reproduce the
current 387 migration bridges.

## Rule for future integration

For each musical organ:

1. locate the last point where the old Xensonar still expresses musical intent;
2. capture that intent in a bounded typed spec/state/program;
3. compare old behaviour through XenOracle/Golden traces;
4. move everything below the cut into Native;
5. after acceptance, disable the equivalent Browser audio execution for that
   render class.

**Do not preserve accidental complexity. Do preserve the instrument.**
