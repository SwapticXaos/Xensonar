import { useEffect, type RefObject } from 'react';
import {
  readXensonarSharedAudioOutputBridgeGeneration,
  registerXensonarExternalAudioCapture,
  registerXensonarExternalAudioPcmCapture,
  type XensonarExternalAudioPcmCaptureHandle,
} from '../../audio/globalRecordingCaptureBridge';

const CHANNEL = '__xensonar_standalone_iframe_audio_capture__';
const PCM_MAX_ABS = 4;

export type StandaloneIframeAudioCaptureMessage = {
  channel?: string;
  type?: string;
  key?: string;
  label?: string;
  stream?: MediaStream;
  left?: ArrayBuffer;
  right?: ArrayBuffer;
  frames?: number;
  sampleRate?: number;
};

declare global {
  interface Window {
    __xensonarStandaloneIframeAudioCaptureBridgeVersion?: string;
    __xensonarStandaloneIframeAudioCaptureStreams?: Array<{ key: string; label: string; stream: MediaStream }>;
    __xensonarStandaloneIframeAudioCaptureProbe?: Record<string, unknown>;
  }
}

function escapeScriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function injectStandaloneIframeAudioCaptureBridge(html: string, key: string, label: string): string {
  if (!html || html.includes('__xensonarStandaloneIframeAudioCaptureBridgeVersion')) return html;
  const safeKey = escapeScriptString(key);
  const safeLabel = escapeScriptString(label);
  const script = `<script>
(() => {
  const CHANNEL = '${CHANNEL}';
  const KEY = ${safeKey};
  const LABEL = ${safeLabel};
  if (window.__xensonarStandaloneIframeAudioCaptureBridgeVersion) return;
  window.__xensonarStandaloneIframeAudioCaptureBridgeVersion = '3.2.91.7.5.97-pcm-resilient';
  window.__xensonarStandaloneIframeAudioCaptureProbe = { key: KEY, label: LABEL, streamsPosted: 0, pcmBlocksPosted: 0, destinationMirrors: 0, pcmMirrors: 0, lastError: null };
  const captureByContext = new WeakMap();
  const pcmTapByContext = new WeakMap();
  const connectedNodes = new WeakMap();
  const pcmConnectedNodes = new WeakMap();
  let internalPcmSinkConnecting = false;

  const postCaptureStream = (stream) => {
    try { window.__xensonarStandaloneIframeAudioCaptureStreams = [{ key: KEY, label: LABEL, stream }]; } catch {}
    try {
      window.parent?.postMessage({ channel: CHANNEL, type: 'stream-ready', key: KEY, label: LABEL, stream }, '*');
    } catch (error) {
      try { if (window.__xensonarStandaloneIframeAudioCaptureProbe) window.__xensonarStandaloneIframeAudioCaptureProbe.lastError = String(error); console.warn('[xensonar] standalone iframe audio capture bridge post failed', error); } catch {}
    }
  };

  const postPcmBlock = (payload, transfers) => {
    try {
      if (window.__xensonarStandaloneIframeAudioCaptureProbe) window.__xensonarStandaloneIframeAudioCaptureProbe.pcmBlocksPosted = (window.__xensonarStandaloneIframeAudioCaptureProbe.pcmBlocksPosted || 0) + 1;
      window.parent?.postMessage({ channel: CHANNEL, type: 'pcm', key: KEY, label: LABEL, ...payload }, '*', transfers);
    } catch (error) {
      try { if (window.__xensonarStandaloneIframeAudioCaptureProbe) window.__xensonarStandaloneIframeAudioCaptureProbe.lastError = String(error); console.warn('[xensonar] standalone iframe audio pcm bridge post failed', error); } catch {}
    }
  };

  const ensureCaptureForContext = (ctx) => {
    if (!ctx || typeof ctx.createMediaStreamDestination !== 'function') return null;
    let entry = captureByContext.get(ctx);
    if (entry) return entry.destination;
    try {
      const destination = ctx.createMediaStreamDestination();
      entry = { destination, stream: destination.stream, lastPostAt: 0 };
      captureByContext.set(ctx, entry);
      postCaptureStream(destination.stream);
      return destination;
    } catch (error) {
      try { console.warn('[xensonar] standalone iframe audio capture bridge init failed', error); } catch {}
      return null;
    }
  };

  const ensurePcmTapForContext = (ctx) => {
    if (!ctx || typeof ctx.createScriptProcessor !== 'function') return null;
    let entry = pcmTapByContext.get(ctx);
    if (entry) return entry.processor;
    try {
      const processor = ctx.createScriptProcessor(1024, 2, 2);
      const silentSink = ctx.createGain();
      // Non-zero but inaudible: some browsers stop pulling ScriptProcessor branches behind exact-zero gain.
      silentSink.gain.value = 0.000001;
      processor.onaudioprocess = (event) => {
        try {
          const input = event.inputBuffer;
          const frames = input.length || 0;
          if (!frames) return;
          const left = new Float32Array(frames);
          const right = new Float32Array(frames);
          input.copyFromChannel(left, 0);
          input.copyFromChannel(right, input.numberOfChannels > 1 ? 1 : 0);
          postPcmBlock({ left: left.buffer, right: right.buffer, frames, sampleRate: ctx.sampleRate }, [left.buffer, right.buffer]);
        } catch (error) {
          try { console.warn('[xensonar] standalone iframe audio pcm bridge process failed', error); } catch {}
        }
      };
      processor.connect(silentSink);
      internalPcmSinkConnecting = true;
      try {
        silentSink.connect(ctx.destination);
      } finally {
        internalPcmSinkConnecting = false;
      }
      entry = { processor, silentSink };
      pcmTapByContext.set(ctx, entry);
      return processor;
    } catch (error) {
      try { console.warn('[xensonar] standalone iframe audio pcm bridge init failed', error); } catch {}
      return null;
    }
  };

  const patchAudioContextCtor = (name) => {
    const NativeCtor = window[name];
    if (typeof NativeCtor !== 'function' || NativeCtor.__xensonarCapturePatched) return;
    const PatchedCtor = function XensonarCaptureAudioContext(...args) {
      const ctx = new NativeCtor(...args);
      ensureCaptureForContext(ctx);
      ensurePcmTapForContext(ctx);
      return ctx;
    };
    Object.setPrototypeOf(PatchedCtor, NativeCtor);
    PatchedCtor.prototype = NativeCtor.prototype;
    Object.defineProperty(PatchedCtor, 'name', { value: NativeCtor.name, configurable: true });
    Object.defineProperty(PatchedCtor, '__xensonarCapturePatched', { value: true });
    window[name] = PatchedCtor;
  };

  const connectToPcmTap = (node, ctx) => {
    const pcmTap = ensurePcmTapForContext(ctx);
    if (!pcmTap || node === pcmTap) return;
    let targetSet = pcmConnectedNodes.get(node);
    if (!targetSet) {
      targetSet = new WeakSet();
      pcmConnectedNodes.set(node, targetSet);
    }
    if (!targetSet.has(pcmTap)) {
      node.connect(pcmTap);
      targetSet.add(pcmTap);
      try { if (window.__xensonarStandaloneIframeAudioCaptureProbe) window.__xensonarStandaloneIframeAudioCaptureProbe.pcmMirrors = (window.__xensonarStandaloneIframeAudioCaptureProbe.pcmMirrors || 0) + 1; } catch {}
    }
  };

  const patchConnect = () => {
    const proto = window.AudioNode && window.AudioNode.prototype;
    if (!proto || proto.__xensonarCaptureConnectPatched) return;
    const nativeConnect = proto.connect;
    Object.defineProperty(proto, '__xensonarCaptureConnectPatched', { value: true });
    proto.connect = function patchedConnect(destination, ...rest) {
      try {
        const ctx = this.context;
        if (!internalPcmSinkConnecting && ctx && destination === ctx.destination) {
          const captureDestination = ensureCaptureForContext(ctx);
          if (captureDestination && this !== captureDestination) {
            let targetSet = connectedNodes.get(this);
            if (!targetSet) {
              targetSet = new WeakSet();
              connectedNodes.set(this, targetSet);
            }
            if (!targetSet.has(captureDestination)) {
              nativeConnect.call(this, captureDestination);
              targetSet.add(captureDestination);
              if (window.__xensonarStandaloneIframeAudioCaptureProbe) window.__xensonarStandaloneIframeAudioCaptureProbe.destinationMirrors = (window.__xensonarStandaloneIframeAudioCaptureProbe.destinationMirrors || 0) + 1;
            }
          }
          connectToPcmTap(this, ctx);
        }
      } catch (error) {
        try { console.warn('[xensonar] standalone iframe audio capture bridge connect mirror failed', error); } catch {}
      }
      return nativeConnect.call(this, destination, ...rest);
    };
  };

  patchAudioContextCtor('AudioContext');
  patchAudioContextCtor('webkitAudioContext');
  patchConnect();
})();
</script>`;
  if (/<head(\s[^>]*)?>/i.test(html)) return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${script}`);
  if (/<html(\s[^>]*)?>/i.test(html)) return html.replace(/<html(\s[^>]*)?>/i, (match) => `${match}<head>${script}</head>`);
  return `${script}${html}`;
}

function clampPcmBlock(block: Float32Array): Float32Array {
  for (let index = 0; index < block.length; index += 1) {
    const value = block[index];
    if (!Number.isFinite(value)) block[index] = 0;
    else if (value > PCM_MAX_ABS) block[index] = PCM_MAX_ABS;
    else if (value < -PCM_MAX_ABS) block[index] = -PCM_MAX_ABS;
  }
  return block;
}

export function useStandaloneIframeAudioCapture(
  key: string,
  label: string,
  iframeRef?: RefObject<HTMLIFrameElement | null>,
): void {
  useEffect(() => {
    const cleanupByStream = new WeakMap<MediaStream, () => void>();
    const activeCleanups = new Set<() => void>();
    const pcmHandles = new Map<string, { generation: number; handle: XensonarExternalAudioPcmCaptureHandle }>();
    const registerStream = (stream: MediaStream, streamLabel = label) => {
      const previous = cleanupByStream.get(stream);
      if (previous) {
        previous();
        activeCleanups.delete(previous);
      }
      const cleanup = registerXensonarExternalAudioCapture({ key, label: streamLabel, stream });
      cleanupByStream.set(stream, cleanup);
      activeCleanups.add(cleanup);
    };
    const pushPcmBlock = (data: StandaloneIframeAudioCaptureMessage) => {
      if (!data.left || !data.frames || !data.sampleRate) return;
      const left = clampPcmBlock(new Float32Array(data.left));
      const right = data.right ? clampPcmBlock(new Float32Array(data.right)) : left;
      const handleKey = data.key ?? key;
      const generation = readXensonarSharedAudioOutputBridgeGeneration();
      let entry = pcmHandles.get(handleKey);
      if (!entry || entry.generation !== generation) {
        entry?.handle.dispose();
        entry = {
          generation,
          handle: registerXensonarExternalAudioPcmCapture({ key: handleKey, label: data.label ?? label, sampleRate: data.sampleRate }),
        };
        pcmHandles.set(handleKey, entry);
      }
      entry.handle.pushBlock({ left, right, frames: data.frames, sampleRate: data.sampleRate });
    };
    const handleMessage = (event: MessageEvent<StandaloneIframeAudioCaptureMessage>) => {
      const data = event.data;
      if (!data || data.channel !== CHANNEL) return;
      if (data.key !== key) return;
      if (data.type === 'stream-ready' && data.stream) {
        registerStream(data.stream, data.label ?? label);
        return;
      }
      if (data.type === 'pcm') pushPcmBlock(data);
    };
    const pollIframeStreams = () => {
      const contentWindow = iframeRef?.current?.contentWindow as (Window & {
        __xensonarStandaloneIframeAudioCaptureStreams?: Array<{ key: string; label: string; stream: MediaStream }>;
      }) | null | undefined;
      const streams = contentWindow?.__xensonarStandaloneIframeAudioCaptureStreams;
      if (!streams?.length) return;
      streams.forEach((entry) => {
        if (entry.key === key && entry.stream) registerStream(entry.stream, entry.label ?? label);
      });
    };
    window.addEventListener('message', handleMessage);
    const interval = window.setInterval(pollIframeStreams, 650);
    pollIframeStreams();
    return () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(interval);
      activeCleanups.forEach((cleanup) => cleanup());
      activeCleanups.clear();
      pcmHandles.forEach((entry) => entry.handle.dispose());
      pcmHandles.clear();
    };
  }, [key, label, iframeRef]);
}
