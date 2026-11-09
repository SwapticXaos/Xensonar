export const SAFE_AUDIO_SCHEDULE_PADDING_SEC = 0.005;
export const SAFE_AUDIO_MIN_GAIN = 0.0001;
export const SAFE_AUDIO_MIN_RAMP_SEC = 0.0035;

export type SafeAudioStartResult = {
  isValid: boolean;
  intendedStartTime: number;
  safeStartTime: number;
  latenessSec: number;
};

export type SafeEnvelopeResult = SafeAudioStartResult & {
  actualPeakTime: number;
  attackDurationSec: number;
  usedCatchUpRamp: boolean;
};

function finiteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function clampAudioParamValue(value: number, fallback = SAFE_AUDIO_MIN_GAIN) {
  const next = finiteNumber(value, fallback);
  return Math.max(SAFE_AUDIO_MIN_GAIN, next);
}

export function isAudioEventValid(
  audioCtx: BaseAudioContext,
  intendedStartTime: number,
  maxLatenessSec: number,
): boolean {
  const intended = finiteNumber(intendedStartTime, audioCtx.currentTime);
  const maxLate = Math.max(0, finiteNumber(maxLatenessSec, 0));
  return audioCtx.currentTime <= intended + maxLate;
}

export function resolveSafeAudioStartTime(args: {
  audioCtx: BaseAudioContext;
  intendedStartTime: number;
  minLeadSec?: number;
  maxLatenessSec?: number;
}): SafeAudioStartResult {
  const { audioCtx } = args;
  const intendedStartTime = finiteNumber(args.intendedStartTime, audioCtx.currentTime);
  const minLeadSec = Math.max(0.001, finiteNumber(args.minLeadSec ?? SAFE_AUDIO_SCHEDULE_PADDING_SEC, SAFE_AUDIO_SCHEDULE_PADDING_SEC));
  const now = audioCtx.currentTime;
  const safeStartTime = Math.max(intendedStartTime, now + minLeadSec);
  const latenessSec = Math.max(0, now - intendedStartTime);
  const maxLatenessSec = args.maxLatenessSec;
  const isValid = maxLatenessSec === undefined || isAudioEventValid(audioCtx, intendedStartTime, maxLatenessSec);
  return {
    isValid,
    intendedStartTime,
    safeStartTime,
    latenessSec,
  };
}

export function safeApplyAttack(args: {
  param: AudioParam;
  audioCtx: BaseAudioContext;
  intendedStartTime: number;
  attackDurationSec: number;
  peakValue: number;
  baseValue?: number;
  minLeadSec?: number;
  minCatchUpRampSec?: number;
}): SafeEnvelopeResult {
  const {
    param,
    audioCtx,
    intendedStartTime,
    peakValue,
  } = args;
  const baseValue = clampAudioParamValue(args.baseValue ?? SAFE_AUDIO_MIN_GAIN);
  const attackDurationSec = Math.max(0.001, finiteNumber(args.attackDurationSec, SAFE_AUDIO_MIN_RAMP_SEC));
  const minCatchUpRampSec = Math.max(0.0015, finiteNumber(args.minCatchUpRampSec ?? SAFE_AUDIO_MIN_RAMP_SEC, SAFE_AUDIO_MIN_RAMP_SEC));
  const start = resolveSafeAudioStartTime({ audioCtx, intendedStartTime, minLeadSec: args.minLeadSec });
  const intendedPeakTime = finiteNumber(intendedStartTime, audioCtx.currentTime) + attackDurationSec;
  const usedCatchUpRamp = start.safeStartTime >= intendedPeakTime;
  const actualPeakTime = usedCatchUpRamp
    ? start.safeStartTime + minCatchUpRampSec
    : intendedPeakTime;

  try {
    param.cancelScheduledValues(start.safeStartTime);
  } catch {}
  param.setValueAtTime(baseValue, start.safeStartTime);
  param.linearRampToValueAtTime(clampAudioParamValue(peakValue), actualPeakTime);

  return {
    ...start,
    actualPeakTime,
    attackDurationSec,
    usedCatchUpRamp,
  };
}

export function safeApplyExponentialRelease(args: {
  param: AudioParam;
  audioCtx: BaseAudioContext;
  releaseStartTime: number;
  releaseDurationSec: number;
  startValue?: number;
  baseValue?: number;
  minLeadSec?: number;
}): number {
  const {
    param,
    audioCtx,
  } = args;
  const baseValue = clampAudioParamValue(args.baseValue ?? SAFE_AUDIO_MIN_GAIN);
  const startValue = clampAudioParamValue(args.startValue ?? baseValue);
  const releaseDurationSec = Math.max(0.004, finiteNumber(args.releaseDurationSec, 0.02));
  const releaseStart = Math.max(
    finiteNumber(args.releaseStartTime, audioCtx.currentTime),
    audioCtx.currentTime + Math.max(0.001, finiteNumber(args.minLeadSec ?? 0.001, 0.001)),
  );
  const releaseEnd = releaseStart + releaseDurationSec;
  param.setValueAtTime(startValue, releaseStart);
  param.exponentialRampToValueAtTime(baseValue, releaseEnd);
  return releaseEnd;
}
