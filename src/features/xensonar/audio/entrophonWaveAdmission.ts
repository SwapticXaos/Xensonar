/** Context-owned pressure history and oscillator selection; never creates AudioNodes.
 * The established thresholds and direct-hit/no-replay contract stay unchanged.
 */
import type { resolveXensonarMicrotonalVoice } from "../../../core/audio/xensonarMicrotonalSoundEngine";

// Context-local ownership: preview/recreated contexts must never inherit live pressure.
type EntrophonRuntimeState = {
  activeEntrophonWaveVoiceCost: number;
  recentEntrophonWaveStarts: RecentEntrophonWaveStart[];
};
const entrophonRuntimeByContext = new WeakMap<BaseAudioContext, EntrophonRuntimeState>();
export function getEntrophonRuntime(ctx: BaseAudioContext): EntrophonRuntimeState {
  let state = entrophonRuntimeByContext.get(ctx);
  if (!state) {
    state = { activeEntrophonWaveVoiceCost: 0, recentEntrophonWaveStarts: [] };
    entrophonRuntimeByContext.set(ctx, state);
  }
  return state;
}

type RecentEntrophonWaveStart = { atMs: number; cost: number };

const ENTROPHON_WAVE_ACTIVE_COST_DENOMINATOR = 22;
const ENTROPHON_WAVE_RECENT_COST_DENOMINATOR = 18;
const ENTROPHON_WAVE_RECENT_START_DENOMINATOR = 4;
const ENTROPHON_WAVE_RECENT_WINDOW_MS = 58;
const ENTROPHON_WAVE_CHORD_WINDOW_MS = 22;

const clampNumber = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
export const readRuntimeNowMs = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();

function pruneRecentEntrophonWaveStarts(state: EntrophonRuntimeState, nowMs: number): void {
  const recentEntrophonWaveStarts = state.recentEntrophonWaveStarts;
  const oldest = nowMs - ENTROPHON_WAVE_RECENT_WINDOW_MS;
  let expired = 0;
  while (expired < recentEntrophonWaveStarts.length && recentEntrophonWaveStarts[expired].atMs < oldest) expired++;
  if (expired) recentEntrophonWaveStarts.splice(0, expired);
}

function sumRecentEntrophonWaveCost(state: EntrophonRuntimeState, nowMs: number, windowMs: number): number {
  const cutoff = nowMs - windowMs;
  return state.recentEntrophonWaveStarts.reduce((sum, entry) => (entry.atMs >= cutoff ? sum + entry.cost : sum), 0);
}

function countRecentEntrophonWaveStarts(state: EntrophonRuntimeState, nowMs: number, windowMs: number): number {
  const cutoff = nowMs - windowMs;
  return state.recentEntrophonWaveStarts.reduce((sum, entry) => (entry.atMs >= cutoff ? sum + 1 : sum), 0);
}

export function resolveEntrophonWaveRuntimePressure(state: EntrophonRuntimeState, nowMs: number): number {
  pruneRecentEntrophonWaveStarts(state, nowMs);
  const activePressure = state.activeEntrophonWaveVoiceCost / ENTROPHON_WAVE_ACTIVE_COST_DENOMINATOR;
  const recentCostPressure =
    sumRecentEntrophonWaveCost(state, nowMs, ENTROPHON_WAVE_RECENT_WINDOW_MS) / ENTROPHON_WAVE_RECENT_COST_DENOMINATOR;
  const recentStartPressure =
    countRecentEntrophonWaveStarts(state, nowMs, ENTROPHON_WAVE_CHORD_WINDOW_MS) /
    ENTROPHON_WAVE_RECENT_START_DENOMINATOR;
  return clampNumber(Math.max(activePressure, recentCostPressure, recentStartPressure), 0, 1.75);
}

export function rememberEntrophonWaveStart(args: { state: EntrophonRuntimeState; cost: number; nowMs?: number }): void {
  const atMs = args.nowMs ?? readRuntimeNowMs();
  pruneRecentEntrophonWaveStarts(args.state, atMs);
  args.state.recentEntrophonWaveStarts.push({
    atMs,
    cost: Math.max(0, args.cost),
  });
}

export function shouldRejectEntrophonWaveForChordBurst(args: {
  state: EntrophonRuntimeState;
  pressure: number;
  prominence: number;
  offsetSec: number;
  nowMs: number;
}): boolean {
  const chordStarts = countRecentEntrophonWaveStarts(args.state, args.nowMs, ENTROPHON_WAVE_CHORD_WINDOW_MS);
  if (args.pressure >= 1.08 && args.prominence < 0.92) return true;
  if (args.pressure >= 0.82 && args.prominence < 0.62) return true;
  if (chordStarts >= 2 && args.offsetSec > 0.002 && args.prominence < 0.78) return true;
  if (chordStarts >= 4 && args.offsetSec > 0 && args.prominence < 0.96) return true;
  return false;
}

export function resolveEntrophonWavePressureGainScale(pressure: number): number {
  if (pressure >= 0.82) return 0.46;
  if (pressure >= 0.58) return 0.58;
  if (pressure >= 0.36) return 0.72;
  if (pressure >= 0.18) return 0.86;
  return 1;
}

export function chooseEntrophonOscillatorFrequencies(
  microVoice: ReturnType<typeof resolveXensonarMicrotonalVoice>,
  pressure: number,
): {
  baseFreqs: number[];
  colorFreqs: number[];
  delayScale: number;
  pressure: number;
} {
  const baseLimit =
    pressure >= 0.5
      ? 1
      : pressure >= 0.32
        ? 2
        : pressure >= 0.18
          ? Math.min(3, microVoice.oscillatorFreqs.length)
          : microVoice.oscillatorFreqs.length;
  const colorLimit = pressure >= 0.22 ? 0 : pressure >= 0.1 ? 1 : microVoice.colorFreqs.length;
  const delayScale = pressure >= 0.2 ? 0 : pressure >= 0.12 ? 0.25 : pressure >= 0.06 ? 0.62 : 1;
  return {
    // Preserve pitch centre under reduction; the former prefix selected only flat voices.
    baseFreqs:
      baseLimit >= microVoice.oscillatorFreqs.length
        ? microVoice.oscillatorFreqs
        : baseLimit === 1
          ? [microVoice.tunedFreq]
          : Array.from({ length: baseLimit }, (_, i) => {
              const low = microVoice.oscillatorFreqs[0];
              const high = microVoice.oscillatorFreqs[microVoice.oscillatorFreqs.length - 1];
              return low * Math.pow(high / low, i / (baseLimit - 1));
            }),
    colorFreqs: microVoice.colorFreqs.slice(0, Math.max(0, colorLimit)),
    delayScale,
    pressure,
  };
}

export function estimateEntrophonWaveRuntimeCost(args: { oscillatorCount: number; delayActive: boolean }): number {
  return args.oscillatorCount + (args.delayActive ? 1.35 : 0);
}
