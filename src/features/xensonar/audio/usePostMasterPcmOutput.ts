import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { PostMasterOutputSession, enqueueMasterOutput, type OutputPhase } from './postMasterOutputSession';
import { createPostMasterPcmTransport } from './postMasterPcmTransport';
import { connectAudioGraphNode, markAudioGraphDestinationReleased } from './audioGraphConnectionRegistry';
import { nativeAudioRequested, XENSONAR_NATIVE_AUDIO_BASE_URL } from '../layout/nativeAudioRuntime';

export type PostMasterPcmOutputState = OutputPhase | 'disabled' | 'waiting-audio';
export type PostMasterPcmOutputSnapshot = {
  enabled: boolean; state: PostMasterPcmOutputState; crossOriginIsolated: boolean;
  generation: number; nativeFillFrames: number; browserRingFrames: number;
  droppedFrames: number; lastError: string | null;
};
function requestedFromLocation(): boolean {
  try { return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('postMasterPcm') === '1'; }
  catch { return false; }
}
function baseUrl(): string {
  // The dedicated launcher serves the HTML from its own ephemeral loopback port.
  return location.protocol === 'http:' && location.hostname === '127.0.0.1'
    ? location.origin : XENSONAR_NATIVE_AUDIO_BASE_URL;
}
function ensureStatusBadge(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  const id = 'xensonar-post-master-pcm-status';
  const existing = document.getElementById(id);
  if (existing instanceof HTMLDivElement) return existing;
  const badge = document.createElement('div');
  badge.id = id;
  Object.assign(badge.style, {
    position: 'fixed', right: '12px', top: '12px', zIndex: '2147483647',
    padding: '7px 10px', borderRadius: '8px', font: '600 11px/1.2 monospace',
    background: 'rgba(5,8,12,.88)', color: '#b8c7d9', border: '1px solid rgba(184,199,217,.35)',
    pointerEvents: 'none', whiteSpace: 'pre-line',
  });
  badge.textContent = 'MASTER OUTPUT · STARTING';
  document.body.appendChild(badge);
  return badge;
}

function updateBadge(badge: HTMLDivElement | null, snapshot: PostMasterPcmOutputSnapshot): void {
  if (!badge) return;
  const good = snapshot.state === 'native-owned';
  const bad = snapshot.state === 'fault' || snapshot.state === 'owner-unknown';
  badge.style.color = good ? '#93f7ba' : bad ? '#ff9c9c' : '#f7d993';
  badge.style.borderColor = good ? 'rgba(147,247,186,.5)' : bad ? 'rgba(255,156,156,.5)' : 'rgba(247,217,147,.45)';
  badge.textContent = good
    ? `MASTER OUTPUT · NATIVE OWNER\nN ${snapshot.nativeFillFrames}f · B ${snapshot.browserRingFrames}f`
    : bad
      ? `MASTER OUTPUT · FAULT\n${snapshot.lastError ?? 'unknown'}`
      : `MASTER OUTPUT · ${snapshot.state.toUpperCase()}`;
}

export function usePostMasterPcmOutput(args: {
  audioCtx: AudioContext | null;
  finalOutputTrimRef: MutableRefObject<GainNode | null>;
}): PostMasterPcmOutputSnapshot {
  const enabled = useRef(requestedFromLocation()).current;
  const [snapshot, setSnapshot] = useState<PostMasterPcmOutputSnapshot>({
    enabled, state: enabled ? 'waiting-audio' : 'disabled',
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    generation: 0, nativeFillFrames: 0, browserRingFrames: 0, droppedFrames: 0, lastError: null,
  });
  useEffect(() => {
    if (!enabled) return;
    updateBadge(ensureStatusBadge(), snapshot);
  }, [enabled, snapshot]);
  useEffect(() => {
    const ctx = args.audioCtx;
    if (!enabled || !ctx) return;
    let cancelled = false;
    let release: (() => Promise<void>) | null = null;
    const patch = (next: Partial<PostMasterPcmOutputSnapshot>) => {
      if (!cancelled) setSnapshot(previous => ({ ...previous, ...next }));
    };
    const attempt = () => {
      const master = args.finalOutputTrimRef.current;
      if (cancelled || release || !master) return;
      // A master copy cannot contain sources delegated to a separate native renderer.
      if (nativeAudioRequested() || new URLSearchParams(location.search).get('nativeWaveStarter') === '1') {
        patch({ state: 'fault', lastError: 'post-master-requires-browser-source-ownership' });
        clearInterval(timer);
        return;
      }
      release = enqueueMasterOutput(ctx, () => {
        let session: PostMasterOutputSession;
        const transport = createPostMasterPcmTransport({
          context: ctx, master, baseUrl: baseUrl(),
          onProgress: message => patch({ generation: Number(message.generation || 0),
            nativeFillFrames: Number(message.nativeFillFrames || 0), browserRingFrames: Number(message.browserRingFrames || 0),
            droppedFrames: Number(message.droppedFrames || 0) }),
          onFault: message => { void session.stop(message); },
        });
        session = new PostMasterOutputSession({
          ...transport,
          // Only this edge carries the recorder's full master to the browser.
          // Leave recorder/analyser taps and independent preview routes intact.
          disconnectBrowserMaster: () => {
            master.disconnect(ctx.destination);
            markAudioGraphDestinationReleased(master, ctx.destination, 'native-master-output');
          },
          reconnectBrowserMaster: () => {
            if (ctx.state !== 'closed') connectAudioGraphNode(master, ctx.destination,
              { label: 'master:output-trim->destination', subsystem: 'master' });
          },
          publish: (state, lastError) => patch({ state, lastError }),
        });
        return session;
      });
      clearInterval(timer);
    };
    const timer = window.setInterval(attempt, 100);
    attempt();
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (release) void release();
    };
  }, [args.audioCtx, args.finalOutputTrimRef, enabled]);
  return snapshot;
}
