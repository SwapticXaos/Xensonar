export type ResonanceFieldMotionClockState = {
  lastFrameMs: number | null;
  lastRawFrameMs: number;
  droppedFrameHint: boolean;
};

export type ResonanceFieldMotionFrame = {
  frameScale: number;
  waveScale: number;
  particleScale: number;
  rawFrameMs: number;
  rawFrameScale: number;
  reset: boolean;
  droppedFrameHint: boolean;
};

/**
 * Shared visual-field motion contract for the Hauptraum.
 *
 * Wellenstarter-Wellen and Partikel live in the same visible field. They must
 * therefore read the same field-frame contract. This contract is deliberately
 * no-catch-up: render-frame jitter must not make the visible field speed up
 * after a late frame. If the main thread is late, the field may draw late, but
 * it does not accelerate waves or particles to compensate. Audio admission,
 * quantized scheduling and burst prevention remain separate contracts.
 */
export const RESONANCE_FIELD_MOTION_CLOCK_CONTRACT = {
  nominalFrameMs: 1000 / 60,
  droppedFrameHintMs: 1000 / 42,
  hardResetGapMs: 150,
  noCatchupScale: 1,
} as const;

const finiteOr = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;

export function createResonanceFieldMotionClockState(): ResonanceFieldMotionClockState {
  return {
    lastFrameMs: null,
    lastRawFrameMs: RESONANCE_FIELD_MOTION_CLOCK_CONTRACT.nominalFrameMs,
    droppedFrameHint: false,
  };
}

export function resolveResonanceFieldMotionFrame(
  state: ResonanceFieldMotionClockState,
  nowMs: number,
): ResonanceFieldMotionFrame {
  const contract = RESONANCE_FIELD_MOTION_CLOCK_CONTRACT;
  const lastFrameMs = state.lastFrameMs;
  const safeNowMs = finiteOr(nowMs, lastFrameMs ?? 0);
  state.lastFrameMs = safeNowMs;

  if (lastFrameMs === null || !Number.isFinite(lastFrameMs)) {
    state.lastRawFrameMs = contract.nominalFrameMs;
    state.droppedFrameHint = false;
    return {
      frameScale: contract.noCatchupScale,
      waveScale: contract.noCatchupScale,
      particleScale: contract.noCatchupScale,
      rawFrameMs: contract.nominalFrameMs,
      rawFrameScale: 1,
      reset: true,
      droppedFrameHint: false,
    };
  }

  const rawFrameMs = Math.max(0, safeNowMs - lastFrameMs);
  const reset = rawFrameMs >= contract.hardResetGapMs;
  const droppedFrameHint = rawFrameMs >= contract.droppedFrameHintMs && !reset;
  state.lastRawFrameMs = rawFrameMs;
  state.droppedFrameHint = droppedFrameHint;

  return {
    frameScale: contract.noCatchupScale,
    waveScale: contract.noCatchupScale,
    particleScale: contract.noCatchupScale,
    rawFrameMs,
    rawFrameScale: rawFrameMs / contract.nominalFrameMs,
    reset,
    droppedFrameHint,
  };
}
