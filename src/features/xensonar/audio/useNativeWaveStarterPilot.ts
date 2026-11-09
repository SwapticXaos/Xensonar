import { useCallback, useEffect, useRef, useState } from 'react';
import { buildResolvedWaveStarterNativeCorePlan } from '../nativeImplant/waveStarterNativeCorePlan';

export type NativeWaveStarterPilotState =
  | 'disabled'
  | 'connecting'
  | 'ready'
  | 'unavailable'
  | 'owned-failed'
  | 'panicked'
  | 'ended';

export type NativeWaveStarterPilotSnapshot = {
  enabled: boolean;
  state: NativeWaveStarterPilotState;
  ownsLane: boolean;
  physicalAudio: boolean;
  sampleRate: number;
  deviceQuantumFrames: number;
  nativePeak: number;
  nativeVoicesStarted: number;
  acceptedAttacks: number;
  failedAttacks: number;
  rflAcceptedAttacks: number;
  rflFailedAttacks: number;
  lastSoundId: string | null;
  lastError: string | null;
};

type NativeControl = {
  connect(options?: { clockSamples?: number; settleMs?: number }): Promise<{
    physicalAudio: boolean;
    sampleRate: number;
    deviceQuantumFrames: number;
  }>;
  attack(args: {
    slot: number;
    generation: number;
    frequencyHz: number;
    peak: number;
    gestureTimeMs: number;
  }): Promise<unknown>;
  waveStarterAttack(args: {
    presetId: string;
    frequencyHz: number;
    peak: number;
    gestureTimeMs: number;
  }): Promise<unknown>;
  waveStarterResolvedAttack(args: {
    tones: ReadonlyArray<{
      frequencyHz: number; gain: number; delaySec: number; durationSec: number;
      waveform: OscillatorType; resonance: number; cutoffHz: number;
    }>;
    gestureTimeMs: number;
  }): Promise<unknown>;
  release(args: { slot: number; generation: number }): Promise<unknown>;
  heartbeat(): Promise<unknown>;
  status(): Promise<Record<string, unknown>>;
  syncClock(options?: { samples?: number; settleMs?: number }): Promise<unknown>;
  panic(): Promise<unknown>;
  shutdown(): Promise<unknown>;
  readonly sessionInvalid: boolean;
};

type NativeControlCtor = new (options?: { baseUrl?: string }) => NativeControl;

declare global {
  interface Window {
    XensonarNativeControl?: NativeControlCtor;
    XensonarNativeProtocol?: unknown;
  }
}

const PROTOCOL_SCRIPT = '/xensonar-native-protocol.js';
const ADAPTER_SCRIPT = '/xensonar-native-control.js';
const MAX_NATIVE_SLOTS = 96;

let scriptsPromise: Promise<void> | null = null;

function pilotEnabledFromLocation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('nativeWaveStarter') === '1';
  } catch {
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-xensonar-native-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.xensonarNativeSrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function ensureNativeControlScripts(): Promise<void> {
  if (window.XensonarNativeControl && window.XensonarNativeProtocol) return Promise.resolve();
  if (!scriptsPromise) {
    scriptsPromise = (async () => {
      await loadScript(PROTOCOL_SCRIPT);
      await loadScript(ADAPTER_SCRIPT);
      if (!window.XensonarNativeControl) throw new Error('native control adapter did not register');
    })();
  }
  return scriptsPromise;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export type NativeWaveStarterAttack = {
  frequencyHz: number;
  volume: number;
  isSector: boolean;
  requestedAtMs?: number;
  forceSustainExtend?: boolean;
  soundId?: string;
  rootFollowActive?: boolean;
};

export function useNativeWaveStarterPilot() {
  const enabled = useRef(pilotEnabledFromLocation()).current;
  const controlRef = useRef<NativeControl | null>(null);
  const laneOwnedRef = useRef(enabled);
  const readyRef = useRef(false);
  const terminalRef = useRef(false);
  const generationsRef = useRef(new Uint32Array(MAX_NATIVE_SLOTS));
  const heartbeatTimerRef = useRef<number | null>(null);
  const clockTimerRef = useRef<number | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<NativeWaveStarterPilotSnapshot>({
    enabled,
    state: enabled ? 'connecting' : 'disabled',
    ownsLane: enabled,
    physicalAudio: false,
    sampleRate: 0,
    deviceQuantumFrames: 0,
    nativePeak: 0,
    nativeVoicesStarted: 0,
    acceptedAttacks: 0,
    failedAttacks: 0,
    rflAcceptedAttacks: 0,
    rflFailedAttacks: 0,
    lastSoundId: null,
    lastError: null,
  });

  const update = useCallback((patch: Partial<NativeWaveStarterPilotSnapshot>) => {
    setSnapshot(prev => ({ ...prev, ...patch }));
  }, []);

  const clearControlTimers = useCallback(() => {
    if (heartbeatTimerRef.current !== null) window.clearInterval(heartbeatTimerRef.current);
    if (clockTimerRef.current !== null) window.clearInterval(clockTimerRef.current);
    if (statusTimerRef.current !== null) window.clearInterval(statusTimerRef.current);
    heartbeatTimerRef.current = null;
    clockTimerRef.current = null;
    statusTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureNativeControlScripts();
        if (cancelled) return;
        const Ctor = window.XensonarNativeControl;
        if (!Ctor) throw new Error('native control adapter unavailable');
        const control = new Ctor({ baseUrl: '' });
        const session = await control.connect({ clockSamples: 6, settleMs: 4 });
        if (cancelled) return;
        if (!session.physicalAudio || !(session.sampleRate > 0) || !(session.deviceQuantumFrames > 0)) {
          throw new Error('native sidecar is not a physical audio owner');
        }
        controlRef.current = control;
        readyRef.current = true;
        laneOwnedRef.current = true;
        update({
          state: 'ready',
          ownsLane: true,
          physicalAudio: true,
          sampleRate: session.sampleRate,
          deviceQuantumFrames: session.deviceQuantumFrames,
          lastError: null,
        });
        heartbeatTimerRef.current = window.setInterval(() => {
          if (!readyRef.current || terminalRef.current) return;
          void control.heartbeat().catch(error => {
            readyRef.current = false;
            laneOwnedRef.current = true;
            clearControlTimers();
            update({ state: 'owned-failed', ownsLane: true, lastError: error instanceof Error ? error.message : String(error) });
            setSnapshot(prev => ({ ...prev, failedAttacks: prev.failedAttacks + 1 }));
          });
        }, 1500);
        clockTimerRef.current = window.setInterval(() => {
          if (!readyRef.current || terminalRef.current) return;
          void control.syncClock({ samples: 3, settleMs: 2 }).catch(error => {
            readyRef.current = false;
            laneOwnedRef.current = true;
            clearControlTimers();
            update({ state: 'owned-failed', ownsLane: true, lastError: error instanceof Error ? error.message : String(error) });
          });
        }, 4500);
        statusTimerRef.current = window.setInterval(() => {
          if (!readyRef.current || terminalRef.current) return;
          void control.status().then(status => {
            const peakMicros = Number(status.waveStarterPeakMaxMicros ?? status.renderPeakMaxMicros ?? 0);
            const voicesStarted = Number(status.waveStarterAttacksStarted ?? status.externalVoicesStarted ?? 0);
            update({
              nativePeak: Number.isFinite(peakMicros) ? peakMicros / 1_000_000 : 0,
              nativeVoicesStarted: Number.isFinite(voicesStarted) ? voicesStarted : 0,
            });
          }).catch(() => { /* status is observability only; do not own musical failure */ });
        }, 900);
      } catch (error) {
        if (cancelled) return;
        // No Native attack can have been admitted before ready. It is therefore safe
        // to give ownership back to Legacy if bootstrap itself fails.
        readyRef.current = false;
        laneOwnedRef.current = false;
        controlRef.current = null;
        update({
          state: 'unavailable',
          ownsLane: false,
          lastError: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return () => { cancelled = true; clearControlTimers(); };
  }, [clearControlTimers, enabled, update]);

  const failOwned = useCallback((error: unknown) => {
    // Once Native has owned an audible gesture, automatic same-session fallback to
    // Legacy is forbidden: the request may already have crossed the admission boundary.
    readyRef.current = false;
    laneOwnedRef.current = true;
    clearControlTimers();
    update({
      state: 'owned-failed',
      ownsLane: true,
      lastError: error instanceof Error ? error.message : String(error),
    });
    setSnapshot(prev => ({ ...prev, failedAttacks: prev.failedAttacks + 1 }));
  }, [clearControlTimers, update]);

  const tryAttack = useCallback((attack: NativeWaveStarterAttack): boolean => {
    if (!enabled) return false;
    if (terminalRef.current || laneOwnedRef.current && !readyRef.current) return laneOwnedRef.current;
    if (!readyRef.current || !controlRef.current) return false;
    if (!attack.soundId) return false;

    // 367: the temporary P0 sine is no longer the product renderer. Resolve loudness
    // from the existing Xensonar gesture, then send preset identity to the dedicated
    // bounded Native Wellenstarter synth renderer.
    const peak = clamp(attack.volume * 0.35, 0.025, 0.12);
    const gestureTimeMs = Number.isFinite(attack.requestedAtMs)
      ? Number(attack.requestedAtMs)
      : performance.now();
    const control = controlRef.current;

    const corePlan = buildResolvedWaveStarterNativeCorePlan({
      presetId: attack.soundId as Parameters<typeof buildResolvedWaveStarterNativeCorePlan>[0]["presetId"],
      playbackFreqHz: attack.frequencyHz,
      peak,
      isSector: attack.isSector,
    });
    void control.waveStarterResolvedAttack({
      tones: corePlan.tones,
      gestureTimeMs,
    }).then(() => {
      setSnapshot(prev => ({
        ...prev,
        acceptedAttacks: prev.acceptedAttacks + 1,
        rflAcceptedAttacks: prev.rflAcceptedAttacks + (attack.rootFollowActive ? 1 : 0),
        lastSoundId: attack.soundId ?? prev.lastSoundId,
      }));
    }).catch(error => {
      if (attack.rootFollowActive) {
        setSnapshot(prev => ({ ...prev, rflFailedAttacks: prev.rflFailedAttacks + 1, lastSoundId: attack.soundId ?? prev.lastSoundId }));
      }
      failOwned(error);
    });
    return true;
  }, [enabled, failOwned]);


  const testTone = useCallback((): boolean => {
    if (!enabled || !readyRef.current || !controlRef.current || terminalRef.current) return false;
    const control = controlRef.current;
    const slot = MAX_NATIVE_SLOTS - 1;
    const generation = (generationsRef.current[slot] += 1);
    const gestureTimeMs = performance.now();
    void control.attack({ slot, generation, frequencyHz: 440, peak: 0.08, gestureTimeMs })
      .then(() => {
        window.setTimeout(() => {
          if (!terminalRef.current) void control.release({ slot, generation }).catch(failOwned);
        }, 500);
      })
      .catch(failOwned);
    return true;
  }, [enabled, failOwned]);


  const blocksLegacy = useCallback((): boolean => enabled && laneOwnedRef.current, [enabled]);

  const panic = useCallback(async () => {
    if (!enabled || !controlRef.current || terminalRef.current) return;
    try {
      await controlRef.current.panic();
      terminalRef.current = true;
      readyRef.current = false;
      laneOwnedRef.current = true;
      clearControlTimers();
      update({ state: 'panicked', ownsLane: true });
    } catch (error) {
      failOwned(error);
    }
  }, [clearControlTimers, enabled, failOwned, update]);

  const endPilot = useCallback(async () => {
    if (!enabled) return;
    clearControlTimers();
    const freshShutdownControl = async (): Promise<NativeControl> => {
      const Ctor = window.XensonarNativeControl;
      if (!Ctor) throw new Error('native control adapter unavailable for shutdown recovery');
      const fresh = new Ctor({ baseUrl: '' });
      await fresh.connect({ clockSamples: 1, settleMs: 0 });
      return fresh;
    };
    try {
      let control = controlRef.current;
      if (!control || control.sessionInvalid) control = await freshShutdownControl();
      try {
        if (!terminalRef.current) {
          try { await control.panic(); } catch { /* shutdown attempt decides whether recovery is needed */ }
        }
        await control.shutdown();
      } catch {
        // A server-side expiry may only become visible on this request. Recovery is
        // allowed for terminal safety only; never replay musical attacks/state.
        control = await freshShutdownControl();
        try { await control.panic(); } catch { /* shutdown still terminates the sidecar */ }
        await control.shutdown();
      }
      terminalRef.current = true;
      readyRef.current = false;
      laneOwnedRef.current = true;
      update({ state: 'ended', ownsLane: true, lastError: null });
    } catch (error) {
      failOwned(error);
    }
  }, [clearControlTimers, enabled, failOwned, update]);

  return { snapshot, tryAttack, testTone, blocksLegacy, panic, endPilot } as const;
}
