/**
 * Canonical render plan for the existing WaveStarter hold/worklet pulse body.
 * This module does not invent new sound semantics: its constants mirror the
 * already-shipped AudioWorklet processor path so Native can execute the same
 * plan without copying magic numbers into another renderer.
 */
export const WAVE_STARTER_HOLD_RENDER_PLAN_VERSION = 1 as const;
export const WAVE_STARTER_HOLD_WAVEFORM = 'triangle' as const;
export const WAVE_STARTER_HOLD_GAIN_MIN = 0.004;
export const WAVE_STARTER_HOLD_GAIN_MAX = 0.20;
export const WAVE_STARTER_HOLD_GAIN_FALLBACK = 0.032;
export const WAVE_STARTER_HOLD_NORMAL_DURATION_RATIO = 0.72;
export const WAVE_STARTER_HOLD_NORMAL_DURATION_MIN_SEC = 0.045;
export const WAVE_STARTER_HOLD_NORMAL_DURATION_MAX_SEC = 0.24;
export const WAVE_STARTER_HOLD_EXTEND_DURATION_RATIO = 1.15;
export const WAVE_STARTER_HOLD_EXTEND_DURATION_MIN_SEC = 0.09;
export const WAVE_STARTER_HOLD_EXTEND_DURATION_MAX_SEC = 0.42;
export const WAVE_STARTER_HOLD_NORMAL_PROMINENCE = 0.96;
export const WAVE_STARTER_HOLD_EXTEND_PROMINENCE = 1.08;

export type WaveStarterHoldRenderPlan = {
  version: 1;
  waveform: typeof WAVE_STARTER_HOLD_WAVEFORM;
  frequencyHz: number;
  gain: number;
  durationSec: number;
  prominence: number;
  forceSustainExtend: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function resolveWaveStarterHoldRenderPlan(args: {
  intervalFrames: number;
  sampleRate: number;
  pitchHz: number;
  gain?: number;
  forceSustainExtend?: boolean;
}): WaveStarterHoldRenderPlan {
  const sampleRate = Math.max(1, Number.isFinite(args.sampleRate) ? args.sampleRate : 48000);
  const intervalFrames = Math.max(8, Number.isFinite(args.intervalFrames) ? args.intervalFrames : 256);
  const forceSustainExtend = args.forceSustainExtend === true;
  const durationSec = forceSustainExtend
    ? clamp(intervalFrames / sampleRate * WAVE_STARTER_HOLD_EXTEND_DURATION_RATIO, WAVE_STARTER_HOLD_EXTEND_DURATION_MIN_SEC, WAVE_STARTER_HOLD_EXTEND_DURATION_MAX_SEC)
    : clamp(intervalFrames / sampleRate * WAVE_STARTER_HOLD_NORMAL_DURATION_RATIO, WAVE_STARTER_HOLD_NORMAL_DURATION_MIN_SEC, WAVE_STARTER_HOLD_NORMAL_DURATION_MAX_SEC);
  const rawGain = Number.isFinite(args.gain ?? NaN) ? Number(args.gain) : WAVE_STARTER_HOLD_GAIN_FALLBACK;
  return {
    version: WAVE_STARTER_HOLD_RENDER_PLAN_VERSION,
    waveform: WAVE_STARTER_HOLD_WAVEFORM,
    frequencyHz: Math.max(1, Number.isFinite(args.pitchHz) ? args.pitchHz : 440),
    gain: clamp(rawGain, WAVE_STARTER_HOLD_GAIN_MIN, WAVE_STARTER_HOLD_GAIN_MAX),
    durationSec,
    prominence: forceSustainExtend ? WAVE_STARTER_HOLD_EXTEND_PROMINENCE : WAVE_STARTER_HOLD_NORMAL_PROMINENCE,
    forceSustainExtend,
  };
}
