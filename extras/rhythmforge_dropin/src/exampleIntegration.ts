import { grooveStateFromSchwarm } from "./bridges";
import { RhythmForge } from "./sequencer";

interface SchwarmLikeState {
  time: number;
  raw?: { spectralCentroidHz?: number };
  descriptors: {
    cohesion: number;
    turbulence: number;
    crystallization: number;
    pressure: number;
    fracture: number;
    orbitality: number;
    recurrence: number;
  };
}

export function installRhythmForgeExample(args: {
  audioCtx: AudioContext;
  downstream: AudioNode;
  getSchwarmState: () => SchwarmLikeState | null;
  rootHz?: number;
  tempo?: number;
}) {
  const forge = new RhythmForge(args.audioCtx, {
    params: {
      rootHz: args.rootHz ?? 55,
      tempo: args.tempo ?? 108,
      bassAmount: 0.84,
      drumsAmount: 0.92,
      barsUntilRefresh: 2,
      swing: 0.1,
    },
  });

  forge.connect(args.downstream);
  forge.start();

  let raf = 0;
  const tick = () => {
    const state = args.getSchwarmState();
    if (state) {
      forge.updateGrooveState(grooveStateFromSchwarm(state));
      const pressureTempoLift = state.descriptors.pressure * 14 - state.descriptors.recurrence * 4;
      const fractureSwingLift = state.descriptors.fracture * 0.04;
      forge.setParams({
        tempo: Math.max(78, Math.min(148, (args.tempo ?? 108) + pressureTempoLift)),
        swing: Math.max(0, Math.min(0.18, 0.08 + state.descriptors.orbitality * 0.05 + fractureSwingLift)),
        rootHz: Math.max(36, Math.min(82, (args.rootHz ?? 55) * (state.descriptors.crystallization > 0.55 ? 1 : 0.75))),
      });
    }

    forge.tick();
    raf = window.requestAnimationFrame(tick);
  };

  raf = window.requestAnimationFrame(tick);

  return {
    forge,
    dispose() {
      window.cancelAnimationFrame(raf);
      forge.dispose();
    },
  };
}
