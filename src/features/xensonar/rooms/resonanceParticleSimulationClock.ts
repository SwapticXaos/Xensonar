export type ResonanceParticleSimulationClockState = {
  lastTickMs: number | null;
  smoothedFrameMs: number;
  droppedFrameHint: boolean;
};

export type ResonanceParticleSimulationFrame = {
  particleTimeScale: number;
  rawFrameMs: number;
  smoothedFrameMs: number;
  reset: boolean;
  droppedFrameHint: boolean;
};

/**
 * Clear-time contract for visible Resonanzraum Partikel.
 *
 * The particles are a moving instrument field, not a render-frame counter. Their
 * velocity values remain authored in the old "60 fps frame units", but the step
 * is now derived from monotonic wall-clock time. The scale is deliberately
 * bounded and smoothed: particles may keep a stable real-time pace when RAF is
 * uneven, but long main-thread stalls must not create large catch-up jumps or
 * audio bursts.
 */
export const RESONANCE_PARTICLE_SIMULATION_CLOCK_CONTRACT = {
  nominalFrameMs: 1000 / 60,
  droppedFrameHintMs: 1000 / 42,
  hardResetGapMs: 180,
  smoothing: 0.42,
  minParticleScale: 0.62,
  maxParticleScale: 1.55,
  resetParticleScale: 1,
} as const;

const finiteOr = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function createResonanceParticleSimulationClockState(): ResonanceParticleSimulationClockState {
  return {
    lastTickMs: null,
    smoothedFrameMs: RESONANCE_PARTICLE_SIMULATION_CLOCK_CONTRACT.nominalFrameMs,
    droppedFrameHint: false,
  };
}

export function resolveResonanceParticleSimulationFrame(
  state: ResonanceParticleSimulationClockState,
  nowMs: number,
): ResonanceParticleSimulationFrame {
  const contract = RESONANCE_PARTICLE_SIMULATION_CLOCK_CONTRACT;
  const lastTickMs = state.lastTickMs;
  const safeNowMs = finiteOr(nowMs, lastTickMs ?? 0);
  state.lastTickMs = safeNowMs;

  if (lastTickMs === null || !Number.isFinite(lastTickMs)) {
    state.smoothedFrameMs = contract.nominalFrameMs;
    state.droppedFrameHint = false;
    return {
      particleTimeScale: contract.resetParticleScale,
      rawFrameMs: contract.nominalFrameMs,
      smoothedFrameMs: contract.nominalFrameMs,
      reset: true,
      droppedFrameHint: false,
    };
  }

  const rawFrameMs = Math.max(0, safeNowMs - lastTickMs);
  const reset = rawFrameMs >= contract.hardResetGapMs;
  const droppedFrameHint = rawFrameMs >= contract.droppedFrameHintMs && !reset;

  if (reset) {
    state.smoothedFrameMs = contract.nominalFrameMs;
    state.droppedFrameHint = false;
    return {
      particleTimeScale: contract.resetParticleScale,
      rawFrameMs,
      smoothedFrameMs: contract.nominalFrameMs,
      reset: true,
      droppedFrameHint: false,
    };
  }

  state.smoothedFrameMs = state.smoothedFrameMs + (rawFrameMs - state.smoothedFrameMs) * contract.smoothing;
  state.droppedFrameHint = droppedFrameHint;

  const particleTimeScale = clamp(
    state.smoothedFrameMs / contract.nominalFrameMs,
    contract.minParticleScale,
    contract.maxParticleScale,
  );

  return {
    particleTimeScale,
    rawFrameMs,
    smoothedFrameMs: state.smoothedFrameMs,
    reset: false,
    droppedFrameHint,
  };
}
