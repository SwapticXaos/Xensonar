export type ResonanceFieldStepClockState = {
  lastFrameMs: number | null;
  accumulatorMs: number;
  lastRawFrameMs: number;
  droppedFrameHint: boolean;
};

export type ResonanceFieldStep = {
  nowMs: number;
  stepMs: number;
  motionScale: number;
};

export type ResonanceFieldStepFrame = {
  steps: ResonanceFieldStep[];
  rawFrameMs: number;
  renderAlpha: number;
  reset: boolean;
  droppedFrameHint: boolean;
  spiralGuarded: boolean;
  stepMs: number;
  motionScale: number;
};

/**
 * Shared fixed-field clock for Hauptraum ring waves and particles.
 *
 * This is the third time form between the old frame-bound field and the hard
 * elapsed-time catch-up field: RAF may arrive unevenly, but the field consumes
 * time in small bounded substeps. Ring waves, particles and their collisions
 * therefore see the same field phase. The guard deliberately refuses an
 * unbounded catch-up spiral; if Electron/Devserver stalls badly, the field
 * resynchronises softly instead of dumping a burst of physics/audio work into a
 * single render frame.
 */
export const RESONANCE_FIELD_STEP_CLOCK_CONTRACT = {
  nominalFrameMs: 1000 / 60,
  fixedStepMs: 1000 / 120,
  droppedFrameHintMs: 1000 / 42,
  hardResetGapMs: 180,
  maxFrameContributionMs: 96,
  maxSubstepsPerFrame: 8,
  maxResidualMs: 1000 / 120,
} as const;

const finiteOr = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function createResonanceFieldStepClockState(): ResonanceFieldStepClockState {
  return {
    lastFrameMs: null,
    accumulatorMs: 0,
    lastRawFrameMs: RESONANCE_FIELD_STEP_CLOCK_CONTRACT.nominalFrameMs,
    droppedFrameHint: false,
  };
}

export function resolveResonanceFieldStepFrame(
  state: ResonanceFieldStepClockState,
  nowMs: number,
): ResonanceFieldStepFrame {
  const contract = RESONANCE_FIELD_STEP_CLOCK_CONTRACT;
  const lastFrameMs = state.lastFrameMs;
  const safeNowMs = finiteOr(nowMs, lastFrameMs ?? 0);
  state.lastFrameMs = safeNowMs;

  const motionScale = contract.fixedStepMs / contract.nominalFrameMs;

  if (lastFrameMs === null || !Number.isFinite(lastFrameMs)) {
    state.accumulatorMs = 0;
    state.lastRawFrameMs = contract.nominalFrameMs;
    state.droppedFrameHint = false;
    return {
      steps: [{ nowMs: safeNowMs, stepMs: contract.fixedStepMs, motionScale }],
      rawFrameMs: contract.nominalFrameMs,
      renderAlpha: 1,
      reset: true,
      droppedFrameHint: false,
      spiralGuarded: false,
      stepMs: contract.fixedStepMs,
      motionScale,
    };
  }

  const rawFrameMs = Math.max(0, safeNowMs - lastFrameMs);
  const reset = rawFrameMs >= contract.hardResetGapMs;
  const droppedFrameHint = rawFrameMs >= contract.droppedFrameHintMs && !reset;

  if (reset) {
    state.accumulatorMs = 0;
    state.lastRawFrameMs = rawFrameMs;
    state.droppedFrameHint = false;
    return {
      steps: [{ nowMs: safeNowMs, stepMs: contract.fixedStepMs, motionScale }],
      rawFrameMs,
      renderAlpha: 1,
      reset: true,
      droppedFrameHint: false,
      spiralGuarded: true,
      stepMs: contract.fixedStepMs,
      motionScale,
    };
  }

  const contributedMs = clamp(rawFrameMs, 0, contract.maxFrameContributionMs);
  state.accumulatorMs += contributedMs;

  const desiredSteps = Math.floor(state.accumulatorMs / contract.fixedStepMs);
  const stepCount = Math.min(desiredSteps, contract.maxSubstepsPerFrame);
  const spiralGuarded = desiredSteps > contract.maxSubstepsPerFrame || rawFrameMs > contract.maxFrameContributionMs;
  const steps: ResonanceFieldStep[] = [];

  for (let i = 0; i < stepCount; i += 1) {
    const stepNowMs = safeNowMs - (stepCount - i - 1) * contract.fixedStepMs;
    steps.push({ nowMs: stepNowMs, stepMs: contract.fixedStepMs, motionScale });
  }

  state.accumulatorMs -= stepCount * contract.fixedStepMs;
  if (spiralGuarded) {
    state.accumulatorMs = Math.min(state.accumulatorMs, contract.maxResidualMs);
  }

  state.lastRawFrameMs = rawFrameMs;
  state.droppedFrameHint = droppedFrameHint;

  return {
    steps,
    rawFrameMs,
    renderAlpha: clamp(state.accumulatorMs / contract.fixedStepMs, 0, 1),
    reset: false,
    droppedFrameHint,
    spiralGuarded,
    stepMs: contract.fixedStepMs,
    motionScale,
  };
}
