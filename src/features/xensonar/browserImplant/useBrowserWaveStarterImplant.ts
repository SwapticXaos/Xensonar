import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveMasterBusRuntimeRefs } from '../audio/liveMasterBusRuntimeBoundary';
import { getLiveMasterBusRuntime } from '../audio/liveMasterBusRuntimeBoundary';
import { buildResolvedWaveStarterNativeCorePlan } from '../nativeImplant/waveStarterNativeCorePlan';
import { encodeResolvedWaveStarterCoreForKernel } from './waveStarterTonePlanTransport';
import { TonePlanRecordEncoder } from './protocol/tonePlanRecord';
import { getWaveStarterPresetRenderDemand } from '../audio/waveStarterPresetTonePlan';
import { XensonarBrowserC11Host } from './worklet/browserC11Host';
import { decodeXensonarC11Wasm } from './generated/xensonarC11WasmEmbedded';
import { XENSONAR_C11_WORKLET_SOURCE } from './generated/xensonarC11WorkletSource';
import {
  downloadBrowserImplantRuntimeDiagnostic,
  installBrowserImplantDiagnosticHooks,
  recordBrowserImplantDiagnostic,
  environmentSnapshot,
} from './runtimeDiagnostics';

export type BrowserWaveStarterImplantState =
  | 'disabled'
  | 'waiting-audio-context'
  | 'initializing'
  | 'ready'
  | 'unavailable'
  | 'owned-failed'
  | 'panicked';

export type BrowserWaveStarterImplantSnapshot = {
  enabled: boolean;
  state: BrowserWaveStarterImplantState;
  ownsLane: boolean;
  sampleRate: number;
  transport: string | null;
  submittedAttacks: number;
  failedSubmissions: number;
  legacyBypasses: number;
  lastBypassReason: string | null;
  lastSoundId: string | null;
  lastError: string | null;
};

export type BrowserWaveStarterAttack = {
  frequencyHz: number;
  volume: number;
  isSector: boolean;
  requestedAtMs?: number;
  soundId?: string;
};

const registeredContexts = new WeakSet<AudioContext>();
const workletRegistrationPromises = new WeakMap<AudioContext, Promise<void>>();
let compiledKernelModulePromise: Promise<{ module: WebAssembly.Module; bytes: ArrayBuffer }> | null = null;
const LIVE_ATTACK_TELEMETRY_FLUSH_MS = 900;

function enabledFromLocation(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const explicit = new URLSearchParams(window.location.search).get('browserWaveStarter');
    if (explicit === '1') return true;
    if (explicit === '0') return false;
    // An explicitly requested Native WaveStarter session owns this lane unless
    // Browser ownership was explicitly requested above.
    if (new URLSearchParams(window.location.search).get('nativeWaveStarter') === '1') return false;
  } catch { /* build-time default below */ }
  return import.meta.env.VITE_XENSONAR_BROWSER_IMPLANT_DEFAULT === '1';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function isLocalFileRuntime(): boolean {
  return typeof window !== 'undefined' && window.location?.protocol === 'file:';
}

function createInlineWorkletDataUrl(source: string): string {
  // Chromium-family browsers can reject blob:file:///... for AudioWorklet modules
  // even though AudioWorklet itself is exposed on a local file page.  A data:
  // module is self-contained and needs no network/file fetch.  The processor
  // bundle deliberately contains no imports, so its opaque data: origin is fine.
  return `data:application/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

export async function ensureBrowserC11WorkletRegistered(ctx: AudioContext): Promise<void> {
  if (registeredContexts.has(ctx)) {
    recordBrowserImplantDiagnostic('worklet-loader', 'already-registered', { state: ctx.state, sampleRate: ctx.sampleRate });
    return;
  }
  const inFlight = workletRegistrationPromises.get(ctx);
  if (inFlight) {
    recordBrowserImplantDiagnostic('worklet-loader', 'registration-join', { state: ctx.state, sampleRate: ctx.sampleRate });
    return inFlight;
  }

  const registration = registerBrowserC11Worklet(ctx);
  workletRegistrationPromises.set(ctx, registration);
  try {
    await registration;
  } catch (error) {
    workletRegistrationPromises.delete(ctx);
    throw error;
  }
}

async function registerBrowserC11Worklet(ctx: AudioContext): Promise<void> {
  recordBrowserImplantDiagnostic('worklet-loader', 'register-start', {
    contextState: ctx.state,
    sampleRate: ctx.sampleRate,
    sourceChars: XENSONAR_C11_WORKLET_SOURCE.length,
    environment: environmentSnapshot(ctx),
  });
  if (!ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function') {
    recordBrowserImplantDiagnostic('worklet-loader', 'audio-worklet-unavailable', {});
    throw new Error('AudioWorklet unavailable in this AudioContext');
  }

  const errors: string[] = [];

  if (isLocalFileRuntime()) {
    try {
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-attempt', { protocol: window.location.protocol });
      await ctx.audioWorklet.addModule(createInlineWorkletDataUrl(XENSONAR_C11_WORKLET_SOURCE));
      registeredContexts.add(ctx);
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-loaded', {});
      return;
    } catch (error) {
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-failed', { error });
      errors.push(`data:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([XENSONAR_C11_WORKLET_SOURCE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      recordBrowserImplantDiagnostic('worklet-loader', 'blob-module-attempt', { urlPrefix: url.slice(0, 48) });
      await ctx.audioWorklet.addModule(url);
      registeredContexts.add(ctx);
      recordBrowserImplantDiagnostic('worklet-loader', 'blob-module-loaded', {});
      return;
    } catch (error) {
      recordBrowserImplantDiagnostic('worklet-loader', 'blob-module-failed', { error });
      errors.push(`blob:${error instanceof Error ? error.message : String(error)}`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (!isLocalFileRuntime()) {
    try {
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-fallback-attempt', { protocol: window.location.protocol });
      await ctx.audioWorklet.addModule(createInlineWorkletDataUrl(XENSONAR_C11_WORKLET_SOURCE));
      registeredContexts.add(ctx);
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-fallback-loaded', {});
      return;
    } catch (error) {
      recordBrowserImplantDiagnostic('worklet-loader', 'data-module-fallback-failed', { error });
      errors.push(`data:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  recordBrowserImplantDiagnostic('worklet-loader', 'register-failed', { errors });
  throw new Error(`Unable to load C11 AudioWorklet module (${errors.join(' | ') || 'no supported inline module path'})`);
}

export async function compileBrowserC11KernelModule(): Promise<{ module: WebAssembly.Module; bytes: ArrayBuffer }> {
  if (!compiledKernelModulePromise) {
    compiledKernelModulePromise = (async () => {
      const bytes = decodeXensonarC11Wasm();
      recordBrowserImplantDiagnostic('wasm-main', 'decode-done', { bytes: bytes.byteLength });
      try {
        const module = await WebAssembly.compile(bytes);
        recordBrowserImplantDiagnostic('wasm-main', 'compile-done', {
          bytes: bytes.byteLength,
          imports: WebAssembly.Module.imports(module),
          exports: WebAssembly.Module.exports(module),
        });
        return { module, bytes };
      } catch (error) {
        recordBrowserImplantDiagnostic('wasm-main', 'compile-failed', { error, bytes: bytes.byteLength });
        throw error;
      }
    })();
  } else {
    recordBrowserImplantDiagnostic('wasm-main', 'compile-cache-hit', {});
  }
  return compiledKernelModulePromise;
}

export function useBrowserWaveStarterImplant(args: {
  audioCtx: AudioContext | null;
  liveMasterBusRuntimeRefs: LiveMasterBusRuntimeRefs;
}) {
  installBrowserImplantDiagnosticHooks();
  const enabled = useRef(enabledFromLocation()).current;
  const hostRef = useRef<XensonarBrowserC11Host | null>(null);
  const tonePlanEncoderRef = useRef<TonePlanRecordEncoder | null>(null);
  const readyRef = useRef(false);
  const laneOwnedRef = useRef(false);
  const terminalRef = useRef(false);
  const tokenRef = useRef(1);
  // Live Wellenstarter attacks must not allocate diagnostic records or schedule
  // a React update per gesture. Keep primitive counters on the hot path and
  // publish them at a bounded observability cadence instead.
  const liveAttackTelemetryRef = useRef({
    submittedAttacks: 0,
    submittedSinceFlush: 0,
    failedSubmissions: 0,
    failedSinceFlush: 0,
    legacyBypasses: 0,
    bypassesSinceFlush: 0,
    lastBypassReason: null as string | null,
    lastSoundId: null as string | null,
    lastSubmissionOutcome: null as 'submitted' | 'ingress-full' | null,
    dirty: false,
  });
  const [snapshot, setSnapshot] = useState<BrowserWaveStarterImplantSnapshot>({
    enabled,
    state: enabled ? 'waiting-audio-context' : 'disabled',
    ownsLane: false,
    sampleRate: 0,
    transport: null,
    submittedAttacks: 0,
    failedSubmissions: 0,
    legacyBypasses: 0,
    lastBypassReason: null,
    lastSoundId: null,
    lastError: null,
  });

  const update = useCallback((patch: Partial<BrowserWaveStarterImplantSnapshot>) => {
    setSnapshot(prev => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const telemetry = liveAttackTelemetryRef.current;
      if (!telemetry.dirty) return;

      const submittedSinceFlush = telemetry.submittedSinceFlush;
      const failedSinceFlush = telemetry.failedSinceFlush;
      const bypassesSinceFlush = telemetry.bypassesSinceFlush;
      const lastSubmissionOutcome = telemetry.lastSubmissionOutcome;
      telemetry.submittedSinceFlush = 0;
      telemetry.failedSinceFlush = 0;
      telemetry.bypassesSinceFlush = 0;
      telemetry.lastSubmissionOutcome = null;
      telemetry.dirty = false;

      setSnapshot(prev => ({
        ...prev,
        submittedAttacks: telemetry.submittedAttacks,
        failedSubmissions: telemetry.failedSubmissions,
        legacyBypasses: telemetry.legacyBypasses,
        lastBypassReason: telemetry.lastBypassReason ?? prev.lastBypassReason,
        lastSoundId: telemetry.lastSoundId ?? prev.lastSoundId,
        ...(lastSubmissionOutcome === 'submitted' ? { lastError: null } : {}),
        ...(lastSubmissionOutcome === 'ingress-full' ? { lastError: 'browser implant ingress full' } : {}),
      }));
      recordBrowserImplantDiagnostic('implant', 'attack-telemetry-flush', {
        submittedAttacks: telemetry.submittedAttacks,
        submittedSinceFlush,
        failedSubmissions: telemetry.failedSubmissions,
        failedSinceFlush,
        legacyBypasses: telemetry.legacyBypasses,
        bypassesSinceFlush,
        lastBypassReason: telemetry.lastBypassReason,
        lastSoundId: telemetry.lastSoundId,
        lastSubmissionOutcome,
      });
    }, LIVE_ATTACK_TELEMETRY_FLUSH_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const failOwned = useCallback((error: unknown) => {
    readyRef.current = false;
    laneOwnedRef.current = true;
    update({
      state: 'owned-failed',
      ownsLane: true,
      failedSubmissions: liveAttackTelemetryRef.current.failedSubmissions,
      lastSoundId: liveAttackTelemetryRef.current.lastSoundId,
      lastError: error instanceof Error ? error.message : String(error),
    });
  }, [update]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = args.audioCtx;
    if (!ctx) {
      laneOwnedRef.current = false;
      update({ state: 'waiting-audio-context', ownsLane: false });
      return;
    }

    let cancelled = false;
    laneOwnedRef.current = false;
    update({ state: 'initializing', ownsLane: false, lastError: null });
    recordBrowserImplantDiagnostic('implant', 'initialization-effect-start', { enabled, environment: environmentSnapshot(ctx) });
    void (async () => {
      let host: XensonarBrowserC11Host | null = null;
      try {
        recordBrowserImplantDiagnostic('implant', 'ensure-worklet-begin', {});
        await ensureBrowserC11WorkletRegistered(ctx);
        recordBrowserImplantDiagnostic('implant', 'ensure-worklet-done', {});
        if (cancelled) return;
        const { bytes } = await compileBrowserC11KernelModule();
        if (cancelled) return;
        recordBrowserImplantDiagnostic('implant', 'kernel-module-ready-main', { bytes: bytes.byteLength });
        const destination = getLiveMasterBusRuntime(ctx, args.liveMasterBusRuntimeRefs, 'main');
        recordBrowserImplantDiagnostic('implant', 'master-destination-resolved', { destination: destination.constructor?.name ?? 'AudioNode' });
        host = new XensonarBrowserC11Host(ctx, destination);
        host.onFault = (reason) => {
          if (!cancelled) failOwned(new Error(reason));
        };
        recordBrowserImplantDiagnostic('implant', 'host-create-node-begin', host.diagnosticSnapshot());
        const ready = await host.createNode({ wasmBytes: bytes });
        recordBrowserImplantDiagnostic('implant', 'host-create-node-result', { ready, host: host.diagnosticSnapshot() });
        if (cancelled) {
          host.destroy();
          return;
        }
        if (!ready) throw new Error('C11/WASM AudioWorklet did not become READY');
        hostRef.current = host;
        tonePlanEncoderRef.current = new TonePlanRecordEncoder();
        readyRef.current = true;
        laneOwnedRef.current = true;
        terminalRef.current = false;
        host.unmute();
        recordBrowserImplantDiagnostic('implant', 'ownership-cutover-ready', host.diagnosticSnapshot());
        update({
          state: 'ready',
          ownsLane: true,
          sampleRate: ctx.sampleRate,
          transport: host.transportKind,
          lastError: null,
        });
      } catch (error) {
        recordBrowserImplantDiagnostic('implant', 'initialization-failed', { error, host: host?.diagnosticSnapshot() ?? null });
        host?.destroy();
        if (cancelled) return;
        // Bootstrap failure happens before any migrated gesture can be admitted,
        // therefore Legacy may safely retain/recover ownership.
        hostRef.current = null;
        tonePlanEncoderRef.current = null;
        readyRef.current = false;
        laneOwnedRef.current = false;
        update({
          state: 'unavailable',
          ownsLane: false,
          lastError: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
      const host = hostRef.current;
      if (host) host.destroy();
      hostRef.current = null;
      tonePlanEncoderRef.current = null;
      readyRef.current = false;
    };
  }, [args.audioCtx, args.liveMasterBusRuntimeRefs, enabled, failOwned, update]);

  const tryAttack = useCallback((attack: BrowserWaveStarterAttack): boolean => {
    if (!enabled) return false;
    if (terminalRef.current || (laneOwnedRef.current && !readyRef.current)) return laneOwnedRef.current;
    const host = hostRef.current;
    const encoder = tonePlanEncoderRef.current;
    const ctx = args.audioCtx;
    if (!readyRef.current || !host || !ctx) return false;
    if (!encoder) {
      failOwned(new Error('browser implant tone-plan encoder missing after ownership'));
      return true;
    }
    if (!attack.soundId) return false;

    const nowMs = performance.now();
    const requestedAtMs = Number.isFinite(attack.requestedAtMs) ? Number(attack.requestedAtMs) : nowMs;
    host.observeInputAge(nowMs - requestedAtMs);
    const leadFrames = 256;
    const ageOffsetFrames = Math.round((requestedAtMs - nowMs) * ctx.sampleRate / 1000);
    const targetFrame = host.currentContextFrame() + leadFrames + ageOffsetFrames;
    const demand = getWaveStarterPresetRenderDemand(attack.soundId);
    const token = tokenRef.current++ >>> 0 || (tokenRef.current = 1);
    if (!demand || !host.tryReserveAttack(token, targetFrame, demand.units, demand.voices)) {
      const telemetry = liveAttackTelemetryRef.current;
      telemetry.failedSubmissions += 1;
      telemetry.failedSinceFlush += 1;
      telemetry.lastSoundId = attack.soundId;
      telemetry.lastSubmissionOutcome = 'ingress-full';
      telemetry.dirty = true;
      return true;
    }
    try {
      const peak = clamp(attack.volume * 0.35, 0.025, 0.12);
      const plan = buildResolvedWaveStarterNativeCorePlan({
        presetId: attack.soundId as Parameters<typeof buildResolvedWaveStarterNativeCorePlan>[0]['presetId'],
        playbackFreqHz: attack.frequencyHz,
        peak,
        isSector: attack.isSector,
      });
      const record = encodeResolvedWaveStarterCoreForKernel({
        plan,
        sampleRate: ctx.sampleRate,
        epoch: host.epoch,
        frame: targetFrame,
        token,
        encoder,
      });
      const sent = host.trySubmitTonePlan(record);
      if (!sent) {
        const telemetry = liveAttackTelemetryRef.current;
        telemetry.failedSubmissions += 1;
        telemetry.failedSinceFlush += 1;
        telemetry.lastSoundId = attack.soundId;
        telemetry.lastSubmissionOutcome = 'ingress-full';
        telemetry.dirty = true;
        // The lane is already owned by the implant. Do not duplicate this gesture in Legacy.
        return true;
      }
      const telemetry = liveAttackTelemetryRef.current;
      telemetry.submittedAttacks += 1;
      telemetry.submittedSinceFlush += 1;
      telemetry.lastSoundId = attack.soundId;
      telemetry.lastSubmissionOutcome = 'submitted';
      telemetry.dirty = true;
      return true;
    } catch (error) {
      host.cancelUnsubmitted(token);
      recordBrowserImplantDiagnostic('implant', 'attack-submit-exception', { error, soundId: attack.soundId });
      const telemetry = liveAttackTelemetryRef.current;
      telemetry.failedSubmissions += 1;
      telemetry.lastSoundId = attack.soundId;
      telemetry.lastSubmissionOutcome = null;
      failOwned(error);
      return true;
    }
  }, [args.audioCtx, enabled, failOwned]);


  const noteLegacyBypass = useCallback((reason: string, soundId?: string | null) => {
    if (!enabled) return;
    const telemetry = liveAttackTelemetryRef.current;
    telemetry.legacyBypasses += 1;
    telemetry.bypassesSinceFlush += 1;
    telemetry.lastBypassReason = reason;
    if (soundId) telemetry.lastSoundId = soundId;
    telemetry.dirty = true;
  }, [enabled]);

  const testTone = useCallback((): boolean => {
    recordBrowserImplantDiagnostic('implant', 'test-tone-clicked', {
      ready: readyRef.current,
      laneOwned: laneOwnedRef.current,
      state: snapshot.state,
    });
    return tryAttack({
      frequencyHz: 440,
      volume: 0.8,
      isSector: false,
      requestedAtMs: performance.now(),
      soundId: 'glass_ping',
    });
  }, [snapshot.state, tryAttack]);

  const panic = useCallback(() => {
    if (!enabled || terminalRef.current) return;
    const host = hostRef.current;
    if (!host) return;
    recordBrowserImplantDiagnostic('implant', 'panic-requested', host.diagnosticSnapshot());
    host.panic();
    terminalRef.current = true;
    readyRef.current = false;
    laneOwnedRef.current = true;
    update({ state: 'panicked', ownsLane: true });
  }, [enabled, update]);

  const blocksLegacy = useCallback(() => enabled && laneOwnedRef.current, [enabled]);

  const downloadRuntimeDiagnostic = useCallback(() => {
    const host = hostRef.current;
    const liveTelemetry = liveAttackTelemetryRef.current;
    return downloadBrowserImplantRuntimeDiagnostic({
      snapshot: {
        ...snapshot,
        submittedAttacks: liveTelemetry.submittedAttacks,
        failedSubmissions: liveTelemetry.failedSubmissions,
        legacyBypasses: liveTelemetry.legacyBypasses,
        lastBypassReason: liveTelemetry.lastBypassReason ?? snapshot.lastBypassReason,
        lastSoundId: liveTelemetry.lastSoundId ?? snapshot.lastSoundId,
      },
      audioCtx: args.audioCtx,
      host: host?.diagnosticSnapshot() ?? null,
      extra: {
        enabled,
        ready: readyRef.current,
        laneOwned: laneOwnedRef.current,
        terminal: terminalRef.current,
        liveAttackTelemetry: { ...liveTelemetry },
      },
    });
  }, [args.audioCtx, enabled, snapshot]);

  return { snapshot, tryAttack, noteLegacyBypass, testTone, blocksLegacy, panic, downloadRuntimeDiagnostic } as const;
}
