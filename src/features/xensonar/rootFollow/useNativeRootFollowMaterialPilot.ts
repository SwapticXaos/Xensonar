import { useCallback, useEffect, useRef } from 'react';
import { nativeAudioAssetUrl, nativeAudioRequested, setNativeAudioRequested, XENSONAR_NATIVE_AUDIO_BASE_URL } from '../layout/nativeAudioRuntime';
import {
  registerNativeRootFollowMaterialBridge,
  type NativeRootFollowMaterialWindowRequest,
  type NativeRootFollowMaterialWindowResult,
} from './nativeRootFollowMaterialBridge';

type NativeGrain = { startTimeMs: number; sourceStartFrame: number; playbackRate: number; durationSec: number };
type NativeWindowPayload = {
  assetSlot: number;
  generation: number;
  outputGain: number;
  grains: NativeGrain[];
  deadlineTimeMs: number;
  sequence: number;
  routingFlags?: number;
};
type NativeControl = {
  connect(options?: { clockSamples?: number; settleMs?: number }): Promise<{ physicalAudio: boolean; sampleRate: number; deviceQuantumFrames: number }>;
  rootFollowMaterialRegisterAsset(args: { pcm: Float32Array; hashHex: string; frames: number; channels: number; sampleRate: number }): Promise<any>;
  rootFollowMaterialPrepareWindow(args: { assetSlot: number; generation: number; outputGain: number; grains: NativeGrain[]; deadlineTimeMs: number; routingFlags?: number }): Promise<any>;
  rootFollowMaterialCommitWindow(args: { preparedId: number }): Promise<any>;
  rootFollowMaterialSubmitWindow(args: NativeWindowPayload): Promise<any>;
  rootFollowMaterialSubmitBatch(args: { windows: NativeWindowPayload[] }): Promise<any>;
  rootFollowMaterialStop(args: { generation: number }): Promise<any>;
  heartbeat(): Promise<any>;
  syncClock(options?: { samples?: number; settleMs?: number }): Promise<any>;
  status(): Promise<Record<string, unknown>>;
  panic(): Promise<any>;
  shutdown(): Promise<any>;
};
type NativeControlCtor = new (options?: { baseUrl?: string }) => NativeControl;
declare global { interface Window { XensonarNativeControl?: NativeControlCtor; XensonarNativeProtocol?: unknown; } }

const PROTOCOL_SCRIPT = '/xensonar-native-protocol.js';
const ADAPTER_SCRIPT = '/xensonar-native-control.js';
let scriptsPromise: Promise<void> | null = null;
function enabled() { return nativeAudioRequested(); }
function allowNull() { try { return new URLSearchParams(window.location.search).get('nativeRflMaterialAllowNull') === '1'; } catch { return false; } }
function loadScript(src: string) {
  const resolvedSrc = nativeAudioAssetUrl(src); return new Promise<void>((resolve, reject) => { const e = document.querySelector<HTMLScriptElement>(`script[data-xensonar-native-src="${resolvedSrc}"]`); if (e?.dataset.loaded === 'true') { resolve(); return; } if (e) { e.addEventListener('load', () => resolve(), { once: true }); e.addEventListener('error', () => reject(new Error(`failed ${src}`)), { once: true }); return; } const s = document.createElement('script'); s.src = resolvedSrc; s.async = false; s.dataset.xensonarNativeSrc = resolvedSrc; s.addEventListener('load', () => { s.dataset.loaded = 'true'; resolve(); }, { once: true }); s.addEventListener('error', () => reject(new Error(`failed ${src}`)), { once: true }); document.head.appendChild(s); }); }
function ensureScripts() { if (window.XensonarNativeControl && window.XensonarNativeProtocol) return Promise.resolve(); if (!scriptsPromise) scriptsPromise = (async () => { await loadScript(PROTOCOL_SCRIPT); await loadScript(ADAPTER_SCRIPT); if (!window.XensonarNativeControl) throw new Error('native control adapter unavailable'); })(); return scriptsPromise; }
async function materialPcm(buffer: AudioBuffer) { const channels = buffer.numberOfChannels; if (channels < 1 || channels > 2) throw new Error('material channels must be mono/stereo'); const frames = buffer.length; const pcm = new Float32Array(frames * channels); for (let ch = 0; ch < channels; ch++) { const src = buffer.getChannelData(ch); for (let i = 0; i < frames; i++) pcm[i * channels + ch] = src[i]; } const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', pcm.buffer)); let hash = ''; for (let i = 0; i < 8; i++) hash += digest[i].toString(16).padStart(2, '0'); return { pcm, hash, frames, channels, sampleRate: buffer.sampleRate }; }

export type NativeRflMaterialSnapshot = { enabled: boolean; state: string; physicalAudio: boolean; warmAssets: number; nativeWindows: number; nativeBatches: number; nativeDrops: number; legacyFallbacks: number; submitRejects: number; lastReason: string | null; lastError: string | null; nativeGrains: number; nativeNonzero: number };
export function useNativeRootFollowMaterialPilot() {
  const isEnabled = useRef(enabled()).current;
  const controlRef = useRef<NativeControl | null>(null);
  const readyRef = useRef(false);
  const terminalRef = useRef(false);
  const warmRef = useRef(new WeakMap<AudioBuffer, { slot: number; hash: string }>());
  const pendingRef = useRef(new WeakMap<AudioBuffer, Promise<void>>());
  const activeBufferRef = useRef<AudioBuffer | null>(null);
  const generationRef = useRef(1);
  const ownershipLatchedRef = useRef(false);
  const submitSequenceRef = useRef(1);
  const timersRef = useRef<number[]>([]);
  // Native-RFL telemetry is operational metadata, not UI state. Keeping these
  // high-frequency counters in React state caused App-level re-renders while
  // material windows were flowing even though no current UI consumes this snapshot.
  // Keep the live snapshot in a ref and let explicit diagnostics query the host.
  const snapshotRef = useRef<NativeRflMaterialSnapshot>({ enabled: isEnabled, state: isEnabled ? 'connecting' : 'disabled', physicalAudio: false, warmAssets: 0, nativeWindows: 0, nativeBatches: 0, nativeDrops: 0, legacyFallbacks: 0, submitRejects: 0, lastReason: null, lastError: null, nativeGrains: 0, nativeNonzero: 0 });
  const patch = useCallback((v: Partial<NativeRflMaterialSnapshot>) => {
    snapshotRef.current = { ...snapshotRef.current, ...v };
  }, []);
  const updateSnapshot = useCallback((updater: (previous: NativeRflMaterialSnapshot) => NativeRflMaterialSnapshot) => {
    snapshotRef.current = updater(snapshotRef.current);
  }, []);
  const stopGeneration = useCallback(() => { const c = controlRef.current; if (c && readyRef.current) { const g = generationRef.current; void c.rootFollowMaterialStop({ generation: g }).catch(() => {}); generationRef.current = g >= 0x7ffffffe ? 1 : g + 1; } ownershipLatchedRef.current = false; activeBufferRef.current = null; }, []);

  useEffect(() => {
    if (!isEnabled) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureScripts();
        if (cancelled) return;
        const C = window.XensonarNativeControl;
        if (!C) throw new Error('native control missing');
        const c = new C({ baseUrl: XENSONAR_NATIVE_AUDIO_BASE_URL });
        const sess = await c.connect({ clockSamples: 6, settleMs: 4 });
        if (cancelled) return;
        if ((!sess.physicalAudio && !allowNull()) || !(sess.sampleRate > 0)) throw new Error('native sidecar not physical-ready');
        controlRef.current = c;
        readyRef.current = true;
        patch({ state: 'ready', physicalAudio: !!sess.physicalAudio, lastError: null });

        const beginAssetPublish = (buffer: AudioBuffer) => {
          if (pendingRef.current.get(buffer)) return;
          const job = (async () => {
            try {
              const asset = await materialPcm(buffer);
              const result = await c.rootFollowMaterialRegisterAsset({ pcm: asset.pcm, hashHex: asset.hash, frames: asset.frames, channels: asset.channels, sampleRate: asset.sampleRate });
              warmRef.current.set(buffer, { slot: Number(result.assetSlot), hash: asset.hash });
              updateSnapshot(p => ({ ...p, warmAssets: p.warmAssets + 1, lastReason: 'asset-warm' }));
            } catch (e) {
              patch({ lastError: e instanceof Error ? e.message : String(e), lastReason: 'asset-publish-failed' });
            } finally {
              pendingRef.current.delete(buffer);
            }
          })();
          pendingRef.current.set(buffer, job);
        };

        const handleBatch = async (requests: NativeRootFollowMaterialWindowRequest[]): Promise<NativeRootFollowMaterialWindowResult[]> => {
          if (requests.length === 0) return [];
          if (!readyRef.current || terminalRef.current || controlRef.current !== c) return requests.map(() => ({ owned: false, reason: 'native-not-ready' }));
          if (requests.length > 8) throw new Error('native material batch exceeds 8 windows');
          const buffer = requests[0].buffer;
          if (requests.some(req => req.buffer !== buffer)) return requests.map(() => ({ owned: false, reason: 'mixed-buffer-batch' }));
          const warm = warmRef.current.get(buffer);
          if (!warm) {
            beginAssetPublish(buffer);
            updateSnapshot(p => ({ ...p, legacyFallbacks: p.legacyFallbacks + requests.length, lastReason: 'asset-publishing' }));
            return requests.map(() => ({ owned: false, reason: 'asset-publishing' }));
          }
          if (activeBufferRef.current !== buffer) {
            if (activeBufferRef.current) {
              try { await c.rootFollowMaterialStop({ generation: generationRef.current }); } catch {}
              generationRef.current = generationRef.current >= 0x7ffffffe ? 1 : generationRef.current + 1;
            }
            ownershipLatchedRef.current = false;
            activeBufferRef.current = buffer;
          }

          const results: NativeRootFollowMaterialWindowResult[] = requests.map(() => ({ owned: false, reason: 'not-submitted' }));
          const payloads: NativeWindowPayload[] = [];
          const payloadIndexes: number[] = [];
          for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const grains = req.plan.slices.flatMap(slice => slice.elastic.grains.map(grain => ({
              startTimeMs: req.requestedAtMs + (grain.when - req.audioNowSec) * 1000,
              sourceStartFrame: grain.srcStart * req.buffer.sampleRate,
              playbackRate: slice.elastic.safeRate,
              durationSec: grain.actualGrainOut,
            })));
            if (grains.length < 1 || grains.length > 64) { results[i] = { owned: false, reason: 'grain-bound' }; continue; }
            const earliest = Math.min(...grains.map(g => g.startTimeMs));
            if (earliest - req.requestedAtMs < 18) { results[i] = { owned: false, reason: 'lead-too-short' }; continue; }
            const staleMs = Math.max(1, Number(req.plan.crisis.staleWindowMs) || 1);
            const deadlineTimeMs = req.requestedAtMs + ((req.plan.windowStartSec + staleMs / 1000) - req.audioNowSec) * 1000;
            const v = Math.max(0.0001, Math.min(1, req.volume));
            const outputGain = v * Math.max(0.0001, Math.min(0.22, v * 0.92)) * 0.72;
            payloadIndexes.push(i);
            payloads.push({ assetSlot: warm.slot, generation: generationRef.current, outputGain, grains, deadlineTimeMs, sequence: submitSequenceRef.current++, routingFlags: 3 });
          }
          const invalidCount = requests.length - payloads.length;
          if (invalidCount > 0 && !ownershipLatchedRef.current) {
            updateSnapshot(p => ({ ...p, legacyFallbacks: p.legacyFallbacks + requests.length, lastReason: 'batch-not-armable' }));
            return requests.map(() => ({ owned: false, reason: 'batch-not-armable' }));
          }
          if (invalidCount > 0) {
            let dropped = 0;
            for (let i = 0; i < results.length; i++) {
              if (results[i].reason !== 'not-submitted') {
                results[i] = { owned: true, reason: `native-owned-drop-${results[i].reason}` };
                dropped++;
              }
            }
            if (dropped > 0) updateSnapshot(p => ({ ...p, nativeDrops: p.nativeDrops + dropped, lastReason: 'native-owned-filter-drop' }));
          }
          if (payloads.length === 0) return results;

          const lastSequence = payloads[payloads.length - 1].sequence;
          try {
            if (payloads.length === 1) await c.rootFollowMaterialSubmitWindow(payloads[0]);
            else await c.rootFollowMaterialSubmitBatch({ windows: payloads });
            ownershipLatchedRef.current = true;
            for (const index of payloadIndexes) results[index] = { owned: true, reason: payloads.length > 1 ? 'native-owned-batch' : 'native-owned-direct-submit' };
            updateSnapshot(p => ({ ...p, nativeWindows: p.nativeWindows + payloads.length, nativeBatches: p.nativeBatches + (payloads.length > 1 ? 1 : 0), lastReason: payloads.length > 1 ? 'native-owned-batch' : 'native-owned-direct-submit' }));
            return results;
          } catch (e) {
            try {
              const st = await c.status();
              if (Number(st.rflMaterialLastCommittedId || 0) === lastSequence) {
                ownershipLatchedRef.current = true;
                for (const index of payloadIndexes) results[index] = { owned: true, reason: 'native-owned-batch-recovered' };
                updateSnapshot(p => ({ ...p, nativeWindows: p.nativeWindows + payloads.length, nativeBatches: p.nativeBatches + (payloads.length > 1 ? 1 : 0), lastReason: 'native-owned-batch-recovered' }));
                return results;
              }
            } catch {}
            if (ownershipLatchedRef.current) {
              for (const index of payloadIndexes) results[index] = { owned: true, reason: 'native-owned-drop-submit-reject' };
              updateSnapshot(p => ({ ...p, nativeDrops: p.nativeDrops + payloads.length, submitRejects: p.submitRejects + payloads.length, lastReason: 'native-owned-drop-submit-reject', lastError: e instanceof Error ? e.message : String(e) }));
            } else {
              for (const index of payloadIndexes) results[index] = { owned: false, reason: 'batch-submit-reject' };
              updateSnapshot(p => ({ ...p, legacyFallbacks: p.legacyFallbacks + payloads.length, submitRejects: p.submitRejects + payloads.length, lastReason: e instanceof Error ? e.message : 'batch-submit-reject', lastError: e instanceof Error ? e.message : String(e) }));
            }
            return results;
          }
        };

        registerNativeRootFollowMaterialBridge(async req => (await handleBatch([req]))[0], stopGeneration, handleBatch);
        const hb = window.setInterval(() => { if (readyRef.current && !terminalRef.current) void c.heartbeat().catch(() => {}); }, 1500);
        const clk = window.setInterval(() => { if (readyRef.current && !terminalRef.current) void c.syncClock({ samples: 3, settleMs: 2 }).catch(() => {}); }, 4500);
        const stat = window.setInterval(() => { if (readyRef.current && !terminalRef.current && !document.hidden) void c.status().then(st => patch({ nativeGrains: Number(st.rflMaterialGrainsStarted || 0), nativeNonzero: Number(st.rflMaterialNonzeroCallbacks || 0) })).catch(() => {}); }, 2400);
        timersRef.current = [hb, clk, stat];
      } catch (e) {
        if (!cancelled) patch({ state: 'unavailable', lastError: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => { cancelled = true; registerNativeRootFollowMaterialBridge(null, null, null); timersRef.current.forEach(t => clearInterval(t)); timersRef.current = []; };
  }, [isEnabled, patch, stopGeneration]);
  const endPilot = useCallback(async () => {
    if (terminalRef.current || snapshotRef.current.state === 'ended') return;
    terminalRef.current = true;
    patch({ state: 'ending', lastReason: 'diagnostic-finalizing', lastError: null });
    stopGeneration();
    const c = controlRef.current;
    let shutdownOk = false;
    if (c) {
      try { await c.panic(); } catch {}
      for (let attempt = 0; attempt < 3 && !shutdownOk; attempt++) {
        try { await c.shutdown(); shutdownOk = true; } catch { if (attempt < 2) await new Promise(resolve => window.setTimeout(resolve, 180 * (attempt + 1))); }
      }
    }
    readyRef.current = false;
    if (shutdownOk || !c) { setNativeAudioRequested(false); patch({ state: 'ended', lastReason: 'diagnostic-session-ended' }); }
    else { terminalRef.current = false; patch({ state: 'ready', lastReason: 'diagnostic-shutdown-failed', lastError: 'Native host konnte nicht beendet werden; Diagnose-ZIP noch nicht bestätigt.' }); }
  }, [patch, stopGeneration]);
  return { snapshot: snapshotRef.current, endPilot };
}
