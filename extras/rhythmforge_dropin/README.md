# RhythmForge Drop-in

A compact bassline + drum-pattern generator for Xensonar-style branches.

## What it does

`RhythmForge` is a small Web Audio groove engine that turns higher-order swarm descriptors into:

- basslines with just-intonation flavored ratios
- kick, snare, hat patterns
- tempo/swing motion that can react to pressure, fracture, orbitality, and recurrence

## Main files

- `src/types.ts` — public types and params
- `src/patterns.ts` — pattern generation from descriptor vectors
- `src/audio.ts` — Web Audio bass + drum voices
- `src/sequencer.ts` — bar scheduler and pattern refresh logic
- `src/bridges.ts` — adapter from Schwarmdeuter-like states
- `src/exampleIntegration.ts` — drop-in example with a Schwarmdeuter state source

## Quick use

```ts
import { RhythmForge, grooveStateFromSchwarm } from "./index";

const forge = new RhythmForge(audioCtx, {
  params: { tempo: 108, rootHz: 55 }
});
forge.connect(audioCtx.destination);
forge.start();

function tick(schwarmState: any) {
  forge.updateGrooveState(grooveStateFromSchwarm(schwarmState));
  forge.tick();
  requestAnimationFrame(() => tick(schwarmState));
}
```

## Design notes

- cohesion/crystallization stabilize the bass vocabulary
- pressure increases density and low-end insistence
- fracture adds syncopation and rougher fills
- orbitality increases swing and braided hat motion
- recurrence keeps the engine from becoming random soup
