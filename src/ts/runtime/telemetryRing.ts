/* TS-MOD-07: Runtime audio traffic ring buffer, Root-Follow / Wave-Overtone-Arp telemetry state,
   burst recorder state transitions, and resident oscillator-ball coupling helpers — brought back from
   src/runtime/instrument/04_performance_and_output_profiles.js into strict TypeScript.
   Built by tools/ts_module.cjs into __XenTs_telemetryRing.
   Zone: WARM (diagnostic traffic ring & resident-ball gain math). No audio-thread work. */

export interface AudioBurstRecorderState {
  readonly isRecording: boolean;
  readonly startedAtIso: string | null;
  readonly entries: unknown[];
  readonly markerCount: number;
}

export interface StableLaneHealthInput {
  readonly primaryCandidateCanMuteLegacy?: boolean;
  readonly stableLanePrimaryAuditionReady?: boolean;
  readonly stableLaneEnabled?: boolean;
  readonly stableLaneReliefReady?: boolean;
  readonly stableLaneProven?: boolean;
  readonly stableLaneWarmupReason?: unknown;
  readonly fallbackReason?: unknown;
}

export type StableLaneHealthLabel =
  | 'granular-primary-health'
  | 'stable-lane-primary-audition'
  | 'stable-lane-sustained-relief'
  | 'stable-lane-warmup'
  | 'stable-lane-fallback'
  | 'no-relief';

export interface RootFollowTrafficState {
  activeRequested: boolean;
  gateOpen: boolean;
  selectedLoopId: string | null;
  selectedLoopName: string | null;
  sourceKind: string | null;
  renderMode: string | null;
  granulationMode: string | null;
  volume: number;
  currentRootHz: number | null;
  timerActive: boolean;
  gainConnected: boolean;
  activeNodes: number;
  activeSynthVoices: number;
  cacheSize: number;
  token: number;
  lastStage: string | null;
}

export interface WaveOvertoneArpTrafficState {
  enabled: boolean;
  mode: string | null;
  timerActive: boolean;
  queueLength: number;
  maxQueueLength: number;
  enqueuedTotal: number;
  playedTotal: number;
  failedTotal: number;
  trimmedTotal: number;
  lastFlushDue: number;
  lastFlushPlayed: number;
  lastFlushFailed: number;
  lastFlushAtAudioSec: number | null;
  lastEnqueueAtAudioSec: number | null;
  lastStepSec: number | null;
  lastPattern: string | null;
  lastRate: string | number | null;
  lastSteps: number | null;
  lastStage: string | null;
}

export interface RuntimeTrafficEvent {
  readonly kind: string;
  readonly subsystem: string;
  readonly audioNowSec?: number;
  readonly perfNowMs: number;
  readonly detail?: unknown;
}

export interface RuntimeTrafficEventInput {
  readonly kind: string;
  readonly subsystem: string;
  readonly audioNowSec?: number;
  readonly perfNowMs?: number;
  readonly detail?: unknown;
}

export interface RuntimeTrafficSnapshot {
  createdAtIso: string;
  recentEvents: RuntimeTrafficEvent[];
  rootFollow: RootFollowTrafficState;
  waveOvertoneArp: WaveOvertoneArpTrafficState;
}

export interface ResidentCouplingSettings {
  readonly residentsEnabled?: boolean;
  readonly residentBallCoupling: { readonly oscillatorBall?: boolean };
  readonly residentVolume: number;
}

export const RESIDENT_DEFAULT_VOLUME = 0.32;
export const RESIDENT_OUTPUT_GAIN_SCALE = 0.72;

export const INITIAL_ROOT_FOLLOW_TRAFFIC: Readonly<RootFollowTrafficState> = {
  activeRequested: false,
  gateOpen: false,
  selectedLoopId: null,
  selectedLoopName: null,
  sourceKind: null,
  renderMode: null,
  granulationMode: null,
  volume: 0,
  currentRootHz: null,
  timerActive: false,
  gainConnected: false,
  activeNodes: 0,
  activeSynthVoices: 0,
  cacheSize: 0,
  token: 0,
  lastStage: null,
};

export const INITIAL_WAVE_OVERTONE_ARP_TRAFFIC: Readonly<WaveOvertoneArpTrafficState> = {
  enabled: false,
  mode: null,
  timerActive: false,
  queueLength: 0,
  maxQueueLength: 0,
  enqueuedTotal: 0,
  playedTotal: 0,
  failedTotal: 0,
  trimmedTotal: 0,
  lastFlushDue: 0,
  lastFlushPlayed: 0,
  lastFlushFailed: 0,
  lastFlushAtAudioSec: null,
  lastEnqueueAtAudioSec: null,
  lastStepSec: null,
  lastPattern: null,
  lastRate: null,
  lastSteps: null,
  lastStage: null,
};

export function createBurstRecorderState(): AudioBurstRecorderState {
  return { isRecording: false, startedAtIso: null, entries: [], markerCount: 0 };
}

export function classifyStableLaneHealth(input: StableLaneHealthInput): StableLaneHealthLabel {
  if (input.primaryCandidateCanMuteLegacy) return 'granular-primary-health';
  if (input.stableLanePrimaryAuditionReady) return 'stable-lane-primary-audition';
  if (!input.stableLaneEnabled) return 'no-relief';
  if (input.stableLaneReliefReady) return 'stable-lane-sustained-relief';
  if (input.stableLaneProven || input.stableLaneWarmupReason) return 'stable-lane-warmup';
  if (input.fallbackReason) return 'stable-lane-fallback';
  return 'no-relief';
}

const telemetryNowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export function createRuntimeTrafficSnapshot(): RuntimeTrafficSnapshot {
  return {
    createdAtIso: new Date().toISOString(),
    recentEvents: [],
    rootFollow: { ...INITIAL_ROOT_FOLLOW_TRAFFIC },
    waveOvertoneArp: { ...INITIAL_WAVE_OVERTONE_ARP_TRAFFIC },
  };
}

export function patchRootFollowTraffic(
  traffic: RuntimeTrafficSnapshot,
  patch: Partial<RootFollowTrafficState>,
): void {
  traffic.rootFollow = { ...traffic.rootFollow, ...patch };
}

export function patchWaveOvertoneArpTraffic(
  traffic: RuntimeTrafficSnapshot | null | undefined,
  patch: Partial<WaveOvertoneArpTrafficState>,
): void {
  if (!traffic) return;
  const qLen = patch.queueLength ?? traffic.waveOvertoneArp.queueLength;
  const maxQueueLength = Math.max(
    traffic.waveOvertoneArp.maxQueueLength,
    Number.isFinite(qLen) ? qLen : 0,
    patch.maxQueueLength ?? 0,
  );
  traffic.waveOvertoneArp = { ...traffic.waveOvertoneArp, ...patch, maxQueueLength };
}

export function pushRuntimeTrafficEvent(
  traffic: RuntimeTrafficSnapshot | null | undefined,
  event: RuntimeTrafficEventInput,
  maxEvents = 720,
): void {
  if (!traffic) return;
  const perfNowMs = event.perfNowMs ?? telemetryNowMs();
  traffic.recentEvents.push({
    kind: event.kind,
    subsystem: event.subsystem,
    audioNowSec: event.audioNowSec,
    perfNowMs,
    detail: event.detail,
  });
  const trimThreshold = maxEvents + Math.min(128, Math.max(32, Math.floor(maxEvents * 0.125)));
  if (traffic.recentEvents.length > trimThreshold) {
    traffic.recentEvents.splice(0, traffic.recentEvents.length - maxEvents);
  }
}

export function resetRuntimeTrafficRef(ref: { current: RuntimeTrafficSnapshot }): void {
  ref.current = createRuntimeTrafficSnapshot();
}

export function startBurstRecorder(
  refs: {
    recorderRef: { current: AudioBurstRecorderState };
    trafficRef: { current: RuntimeTrafficSnapshot };
  },
  sink: { setRecorder: (state: AudioBurstRecorderState) => void },
): void {
  const next: AudioBurstRecorderState = {
    isRecording: true,
    startedAtIso: new Date().toISOString(),
    entries: [],
    markerCount: 0,
  };
  refs.recorderRef.current = next;
  resetRuntimeTrafficRef(refs.trafficRef);
  sink.setRecorder(next);
}

export function stopBurstRecorder(
  refs: { recorderRef: { current: AudioBurstRecorderState } },
  sink: { setRecorder: (state: AudioBurstRecorderState) => void },
): void {
  const next: AudioBurstRecorderState = { ...refs.recorderRef.current, isRecording: false };
  refs.recorderRef.current = next;
  sink.setRecorder(next);
}

export function clearBurstRecorder(
  refs: {
    recorderRef: { current: AudioBurstRecorderState };
    trafficRef: { current: RuntimeTrafficSnapshot };
  },
  sink: { setRecorder: (state: AudioBurstRecorderState) => void },
): void {
  const next = createBurstRecorderState();
  refs.recorderRef.current = next;
  resetRuntimeTrafficRef(refs.trafficRef);
  sink.setRecorder(next);
}

export function scaleResidentOutputGain(gain: number): number {
  return gain * RESIDENT_OUTPUT_GAIN_SCALE;
}

export function isOscillatorBallResidentCoupled<T>(
  active: T,
  settings: Pick<ResidentCouplingSettings, 'residentsEnabled' | 'residentBallCoupling'>,
): T | boolean | undefined {
  return active && settings.residentsEnabled && settings.residentBallCoupling.oscillatorBall;
}

export function computeResidentHitGain(
  settings: Pick<ResidentCouplingSettings, 'residentVolume'>,
  velocity: number,
  weight: number,
): number {
  return scaleResidentOutputGain(velocity * weight * settings.residentVolume);
}
