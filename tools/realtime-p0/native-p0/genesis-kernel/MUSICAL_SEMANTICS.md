# Musical semantics status

**PARITY_NOT_ESTABLISHED.** No reference Xensonar implementation, recording,
analysis or specification was available while this kernel was written. Every
sound-shaping decision below was invented to give the substrate a realistic
workload. None of it is evidence about Xensonar.

The architecture is designed so all of it can be replaced without touching the
execution substrate.

---

## EXPERIMENTAL_PLACEHOLDER — invented, replaceable

| area | what was invented | where |
|---|---|---|
| grain geometry | Hann window, linear-interpolated mono read, ±6 % duration jitter | `src/programs/xen_prog_granular.c`, `src/core/xen_voice.c` |
| density law | `floor(d)` grains per step plus one more with probability `frac(d)` | `generator_experimental_v1` |
| source offset | uniform random position scaled by a `jitter` parameter | same |
| detune | ±0.4 % per grain | same |
| grain gain | `gain * (0.6 + 0.4·rand)` | same |
| pan law | equal power, `rand·0.8` spread | same |
| attack body | 3 partials at 1 : 2.01 : 3.02, exponential 0.5 s decay, soft clip | `xen_voice.c` |
| sustain body | 2 partials, 20 ms rise, 120 ms release | `xen_voice.c` |
| Forge stage | soft clip drive → 2-pass Chamberlin SVF → cross-coupled stereo delay, wet mix | `xen_engine.c: render_chunk` |
| master | gain → rational-tanh limiter | same |
| test material | 9 partials + filtered noise + slow AM | `tests/xen_fixture.h` |
| asset handling | multi-channel material is mixed to mono on publish | `xen_asset.c` |

## REFERENCE_UNKNOWN — needs real evidence before it means anything

* **the 11-limit ladder** `1/1 12/11 11/10 6/5 11/9 4/3 11/8 3/2 8/5 18/11 11/6 2/1`.
  Xensonar is xenharmonic, so *some* ladder is right; this specific one is a guess.
* **`window = 120 ms`, `step = 8 ms`, `microdensity = 1.85`.** These numbers were
  given as a historically important dense operating point. This kernel treats
  them as: a 120 ms grain window, a scheduling tick every 8 ms, and a mean of
  1.85 grains per tick (≈ 231 grains/s, ≈ 28 concurrent voices). Whether that
  is what those words mean in Xensonar is **unknown**.
* **Root Follow** as a musical behaviour. What is implemented is "a granular
  program whose grain pitch is derived from a latest-wins root frequency". The
  real thing may follow the root differently, may glide, may quantise, may have
  memory. Unknown.
* **WaveStarter** attack character, and whether an attack is one voice or a
  structure of voices.
* **Forge** as a musical transformation. A drive/filter/delay chain is a
  stand-in for "some realtime transform stage", nothing more.
* **Pitch mapping/body semantics.** The generic test path still supports a root-relative ratio, but the Xensonar implant adapter now prefers already-resolved Hz so Native does not invent Kammerton/grid/tuning semantics.
* **Voice-stealing musicality.** The kernel steals the oldest texture voice
  when an interactive attack needs one. That is an execution policy chosen for
  predictability, not a musical decision, and it is counted, never silent.

## What is *not* placeholder

These are architecture and are covered by executable tests:

* the frame clock and sub-block dispatch;
* the Gesture / State / Program / Asset model;
* lateness, priority and overload semantics;
* epoch/session terminality;
* asset reference and retirement rules;
* program lifecycle and the activation-resets-schedule rule;
* voice pool bounds and the birth-ordered mix;
* master and recorder identity;
* determinism and partition invariance;
* the backend seam.

## How to install real semantics later

1. Use the existing Xensonar implementation as the reference organism and capture
   Golden/trace evidence: assets, program definitions, seeds, timestamped gestures,
   a state timeline, and the rendered result.
2. Implement a `xen_grain_generator_fn` that reproduces the canonical grain
   event stream and install it with `xen_engine_set_grain_generator()`.
   The substrate does not change.
3. Where a voice *body* differs (attack partials, envelope shapes), replace the
   relevant branch in `xen_voice.c`. These are ~30 lines each and isolated.
4. Re-run `tests/run_all.sh`. Every architectural test must still pass; if one
   breaks, the new semantics violated an invariant and that is worth knowing.


## Resolved tone-plan execution (OP2)

`xen_tone_plan_submit()` is execution infrastructure, not musical policy. It
receives already-resolved oscillator/filter tone descriptors from an adapter.
The Xensonar OP2 adapter uses the existing `wave-starter-synth-preset-v1`
manifest for the **classic synth preset core palette only**. This establishes
parameter-plan parity for that bounded subset, not full WaveStarter render
parity. Gradient modulation, body exciter, extra overtone layer, swell
reinforcement, samples, Entrophon and Hold/Worklet-special paths remain outside
this claim.
