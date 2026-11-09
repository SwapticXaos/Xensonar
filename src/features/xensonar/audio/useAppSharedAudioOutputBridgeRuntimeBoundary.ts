import { useEffect, type MutableRefObject } from "react";
import { reportXensonarPromiseFailure } from "../diagnostics/runtimeIssueReporter";
import { registerXensonarSharedAudioOutputBridge } from "./globalRecordingCaptureBridge";

type LiveMasterBusRole = "main" | "drone" | "rhythm" | "space";

type AppSharedAudioOutputBridgeRuntimeBoundaryDeps = {
  readonly audioCtxRef: MutableRefObject<AudioContext | null>;
  readonly ensureAudioReady: () => Promise<AudioContext>;
  readonly ensureExternalGameRecordingCaptureBus: (ctx: AudioContext) => GainNode;
  readonly getLiveMasterBus: (ctx: AudioContext, role?: LiveMasterBusRole) => GainNode;
};

export type AppSharedAudioOutputBridgeRuntimeBoundary = {
  readonly sharedAudioOutputBridgeExtractedFromAppTsx: true;
  readonly ownsExternalMediaStreamCaptureLifecycle: true;
  readonly ownsExternalPcmCaptureLifecycle: true;
  readonly noInstrumentSchedulingPolicyOwnedHere: true;
};

type ExternalPcmQueuedBlock = {
  left: Float32Array;
  right: Float32Array;
  readIndex: number;
};

type ExternalPcmCapture = {
  node: ScriptProcessorNode | null;
  queue: ExternalPcmQueuedBlock[];
  disposed: boolean;
};

const resamplePcmChannel = (input: Float32Array, sourceRate: number, targetRate: number) => {
  if (!Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || sourceRate <= 0 || targetRate <= 0 || Math.abs(sourceRate - targetRate) < 1) return input;
  const outputLength = Math.max(1, Math.round(input.length * (targetRate / sourceRate)));
  const output = new Float32Array(outputLength);
  const ratio = sourceRate / targetRate;
  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const low = Math.floor(sourceIndex);
    const high = Math.min(input.length - 1, low + 1);
    const frac = sourceIndex - low;
    output[index] = input[low] * (1 - frac) + input[high] * frac;
  }
  return output;
};

export function useAppSharedAudioOutputBridgeRuntimeBoundary(
  args: AppSharedAudioOutputBridgeRuntimeBoundaryDeps,
): AppSharedAudioOutputBridgeRuntimeBoundary {
  const {
    audioCtxRef,
    ensureAudioReady,
    ensureExternalGameRecordingCaptureBus,
    getLiveMasterBus,
  } = args;

  useEffect(() => {
    const externalCaptures = new Map<string, { source: MediaStreamAudioSourceNode; stream: MediaStream }>();
    const externalPcmCaptures = new Map<string, ExternalPcmCapture>();

    const ensureExternalPcmCapture = (key: string, ctx: AudioContext) => {
      let entry = externalPcmCaptures.get(key);
      if (!entry) {
        entry = { node: null, queue: [], disposed: false };
        externalPcmCaptures.set(key, entry);
      }
      if (entry.node || entry.disposed) return entry;

      const node = ctx.createScriptProcessor(1024, 0, 2);
      node.onaudioprocess = (event) => {
        const leftOut = event.outputBuffer.getChannelData(0);
        const rightOut = event.outputBuffer.getChannelData(event.outputBuffer.numberOfChannels > 1 ? 1 : 0);
        leftOut.fill(0);
        if (rightOut !== leftOut) rightOut.fill(0);
        let writeIndex = 0;
        while (writeIndex < leftOut.length && entry?.queue.length) {
          const block = entry.queue[0];
          const remaining = block.left.length - block.readIndex;
          const writable = Math.min(leftOut.length - writeIndex, remaining);
          leftOut.set(block.left.subarray(block.readIndex, block.readIndex + writable), writeIndex);
          rightOut.set(block.right.subarray(block.readIndex, block.readIndex + writable), writeIndex);
          block.readIndex += writable;
          writeIndex += writable;
          if (block.readIndex >= block.left.length) entry.queue.shift();
        }
      };
      node.connect(ensureExternalGameRecordingCaptureBus(ctx));
      entry.node = node;
      return entry;
    };

    registerXensonarSharedAudioOutputBridge({
      ensureAudioReady,
      resolveOutputBus: (ctx) => getLiveMasterBus(ctx, "space"),
      registerExternalAudioCapture: ({ key, stream }) => {
        let disposed = false;
        let activeKey = key;
        void ensureAudioReady()
          .then((ctx) => {
            if (disposed) return;
            const previous = externalCaptures.get(activeKey);
            if (previous) {
              try { previous.source.disconnect(); } catch {}
              externalCaptures.delete(activeKey);
            }
            const source = ctx.createMediaStreamSource(stream);
            source.connect(ensureExternalGameRecordingCaptureBus(ctx));
            externalCaptures.set(activeKey, { source, stream });
          })
          .catch((error) => reportXensonarPromiseFailure("runtime", "external-game-recording-capture", error));
        return () => {
          disposed = true;
          const current = externalCaptures.get(activeKey);
          if (!current || current.stream !== stream) return;
          try { current.source.disconnect(); } catch {}
          externalCaptures.delete(activeKey);
        };
      },
      registerExternalAudioPcmCapture: ({ key }) => {
        let disposed = false;
        let entry = externalPcmCaptures.get(key);
        if (!entry) {
          entry = { node: null, queue: [], disposed: false };
          externalPcmCaptures.set(key, entry);
        }
        void ensureAudioReady()
          .then((ctx) => {
            if (disposed) return;
            ensureExternalPcmCapture(key, ctx);
          })
          .catch((error) => reportXensonarPromiseFailure("runtime", "external-game-recording-pcm-capture", error));
        return {
          pushBlock: (block) => {
            if (disposed) return;
            const current = externalPcmCaptures.get(key) ?? entry;
            if (!current || current.disposed) return;
            const ctx = audioCtxRef.current;
            const targetRate = ctx?.sampleRate ?? block.sampleRate;
            const left = resamplePcmChannel(block.left, block.sampleRate, targetRate);
            const right = resamplePcmChannel(block.right ?? block.left, block.sampleRate, targetRate);
            const frames = Math.min(left.length, right.length);
            if (!frames) return;
            current.queue.push({ left: left.subarray(0, frames), right: right.subarray(0, frames), readIndex: 0 });
            while (current.queue.length > 96) current.queue.shift();
          },
          dispose: () => {
            disposed = true;
            const current = externalPcmCaptures.get(key);
            if (!current) return;
            current.disposed = true;
            current.queue = [];
            if (current.node) {
              try { current.node.disconnect(); } catch {}
              current.node.onaudioprocess = null;
            }
            externalPcmCaptures.delete(key);
          },
        };
      },
      label: "xensonar-live-master-space-bus",
    });

    return () => {
      externalCaptures.forEach(({ source }) => {
        try { source.disconnect(); } catch {}
      });
      externalCaptures.clear();
      externalPcmCaptures.forEach((entry) => {
        entry.disposed = true;
        entry.queue = [];
        if (entry.node) {
          try { entry.node.disconnect(); } catch {}
          entry.node.onaudioprocess = null;
        }
      });
      externalPcmCaptures.clear();
      registerXensonarSharedAudioOutputBridge(null);
    };
  }, [audioCtxRef, ensureAudioReady, ensureExternalGameRecordingCaptureBus, getLiveMasterBus]);

  return {
    sharedAudioOutputBridgeExtractedFromAppTsx: true,
    ownsExternalMediaStreamCaptureLifecycle: true,
    ownsExternalPcmCaptureLifecycle: true,
    noInstrumentSchedulingPolicyOwnedHere: true,
  };
}
