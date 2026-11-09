import { FixedHistogram, INPUT_AGE_BOUNDS_MS } from '../browserImplant/protocol/admissionDiagnostics';
import { registerBrowserImplantSnapshotProvider } from '../browserImplant/runtimeDiagnostics';
import { createWaveStarterLaneState, type WaveStarterLaneState } from './waveStarterLaneGuard';
import type { WaveStarterEmitOptions } from './waveStarterLaneRuntimeBridge';

export type WaveStarterDirectSafeLaneDeps = {
  readonly diagnosticName?: string;
  readonly getPressureBias: () => number;
  readonly getActiveScheduledToneCount: () => number;
  readonly getAudioFrame?: () => number;
  readonly emitDirectAttack: (baseFreq: number, isSector: boolean, options?: WaveStarterEmitOptions) => void;
  readonly nowMs?: () => number;
  readonly setTimeoutFn?: (handler: () => void, delayMs: number) => number;
  readonly clearTimeoutFn?: (id: number) => void;
};
export type WaveStarterDirectSafeLane = {
  readonly state: WaveStarterLaneState;
  diagnosticSnapshot: () => unknown;
  request: (baseFreq: number, isSector?: boolean, options?: WaveStarterEmitOptions) => void;
  flush: () => void;
  dispose: () => void;
};
const INITIAL_REQUEST_STALE_MS = 20;
const MAX_ATTACKS_PER_AUDIO_QUANTUM = 8;

/** Discrete attacks are either handled now or discarded. A latest-value slot is
 * suitable for a continuous controller, not a chord. This bounds control-side
 * construction; the C11 host independently reserves the full render lifetime.
 */
export function createWaveStarterDirectSafeLane(deps: WaveStarterDirectSafeLaneDeps): WaveStarterDirectSafeLane {
  const state = createWaveStarterLaneState();
  let disposed = false, quantum = -1, starts = 0;
  const nowMs = () => deps.nowMs?.() ?? performance.now();
  const inputAge = new FixedHistogram(INPUT_AGE_BOUNDS_MS);
  let requests = 0, admitted = 0, invalid = 0, inactive = 0, stale = 0, cap = 0, afterDispose = 0;
  const diagnosticSnapshot = () => ({requests, admitted, invalid, inactive, stale, quantumCap: cap, afterDispose,
    inputAgeMs: inputAge.snapshot(), staleBoundMs: INITIAL_REQUEST_STALE_MS});
  const unregister = deps.diagnosticName ? registerBrowserImplantSnapshotProvider(deps.diagnosticName, diagnosticSnapshot) : null;
  return {
    state, diagnosticSnapshot,
    request(baseFreq, isSector = false, options) {
      requests++;
      if(disposed){afterDispose++;return;}
      if(!Number.isFinite(baseFreq) || baseFreq<=0){invalid++;return;}
      const now=nowMs();
      const requestedAtMs=Number.isFinite(options?.requestedAtMs) ? Number(options?.requestedAtMs) : now;
      const frame=deps.getAudioFrame?.() ?? now * 48;
      inputAge.observe(now-requestedAtMs);
      if(!Number.isFinite(frame)){inactive++;return;}
      if(now-requestedAtMs>INITIAL_REQUEST_STALE_MS){stale++;return;}
      const currentQuantum=Math.floor(frame/128);
      if(currentQuantum!==quantum){quantum=currentQuantum;starts=0;}
      if(starts>=MAX_ATTACKS_PER_AUDIO_QUANTUM){
        cap++;state.lastDroppedAtMs=now;return;
      }
      starts++;admitted++;state.lastAdmittedAtMs=now;
      deps.emitDirectAttack(baseFreq,isSector,{...options,requestedAtMs});
    },
    flush() { /* No retained attacks and no replay. Kept for existing callers. */ },
    dispose() { disposed=true;unregister?.(); },
  };
}
