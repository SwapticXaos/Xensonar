export type XensonarBlobWorkletSmokeStatus = 'unstarted' | 'unsupported' | 'loaded' | 'failed';

export type XensonarBlobWorkletSmokeSnapshot = {
  status: XensonarBlobWorkletSmokeStatus;
  requestedAtMs: number | null;
  completedAtMs: number | null;
  processorName: string;
  detail: string | null;
  errorMessage: string | null;
};

const PROCESSOR_NAME = 'xensonar-blob-worklet-smoke-probe';
const BLOB_WORKLET_SMOKE_CODE = `
class XensonarBlobWorkletSmokeProbe extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'silentGate', defaultValue: 0, minValue: 0, maxValue: 0, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.port.postMessage({ type: 'xensonar-blob-worklet-smoke-ready' });
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (output) {
      for (let channel = 0; channel < output.length; channel += 1) {
        output[channel].fill(0);
      }
    }
    return true;
  }
}

registerProcessor('${PROCESSOR_NAME}', XensonarBlobWorkletSmokeProbe);
`;

let lastSnapshot: XensonarBlobWorkletSmokeSnapshot = {
  status: 'unstarted',
  requestedAtMs: null,
  completedAtMs: null,
  processorName: PROCESSOR_NAME,
  detail: null,
  errorMessage: null,
};

const smokePromises = new WeakMap<BaseAudioContext, Promise<XensonarBlobWorkletSmokeSnapshot>>();

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function publishSnapshot(patch: Partial<XensonarBlobWorkletSmokeSnapshot>) {
  lastSnapshot = {
    ...lastSnapshot,
    ...patch,
    processorName: PROCESSOR_NAME,
  };

  if (typeof window !== 'undefined') {
    const debugWindow = window as typeof window & {
      __XENSONAR_BLOB_WORKLET_SMOKE__?: XensonarBlobWorkletSmokeSnapshot;
    };
    debugWindow.__XENSONAR_BLOB_WORKLET_SMOKE__ = { ...lastSnapshot };
  }

  return lastSnapshot;
}


function isLocalFileOriginContext() {
  if (typeof window === 'undefined') return false;
  try {
    return window.location?.protocol === 'file:';
  } catch {
    return false;
  }
}

function unsupported(detail: string, requestedAtMs: number) {
  return publishSnapshot({
    status: 'unsupported',
    requestedAtMs,
    completedAtMs: nowMs(),
    detail,
    errorMessage: null,
  });
}

function cleanupProbe(node: AudioWorkletNode | null, zeroGain: GainNode | null) {
  try {
    node?.port.close();
  } catch {}
  try {
    node?.disconnect();
  } catch {}
  try {
    zeroGain?.disconnect();
  } catch {}
}

async function runBlobWorkletSmokeTest(ctx: BaseAudioContext): Promise<XensonarBlobWorkletSmokeSnapshot> {
  const requestedAtMs = nowMs();
  publishSnapshot({
    status: 'unstarted',
    requestedAtMs,
    completedAtMs: null,
    detail: 'blob-worklet-smoke-test-requested',
    errorMessage: null,
  });

  if (isLocalFileOriginContext()) {
    return unsupported('file-origin-blocks-blob-worklet', requestedAtMs);
  }

  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return unsupported('blob-url-unavailable', requestedAtMs);
  }

  if (!('audioWorklet' in ctx) || !ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function') {
    return unsupported('audio-worklet-unavailable', requestedAtMs);
  }

  if (typeof AudioWorkletNode === 'undefined') {
    return unsupported('audio-worklet-node-unavailable', requestedAtMs);
  }

  let url: string | null = null;
  let node: AudioWorkletNode | null = null;
  let zeroGain: GainNode | null = null;

  try {
    const blob = new Blob([BLOB_WORKLET_SMOKE_CODE], { type: 'application/javascript' });
    url = URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);

    node = new AudioWorkletNode(ctx, PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      parameterData: { silentGate: 0 },
    });

    zeroGain = ctx.createGain();
    zeroGain.gain.value = 0;
    node.connect(zeroGain);
    zeroGain.connect(ctx.destination);

    const snapshot = publishSnapshot({
      status: 'loaded',
      requestedAtMs,
      completedAtMs: nowMs(),
      detail: 'blob-url-module-loaded-and-silent-node-instantiated',
      errorMessage: null,
    });

    window.setTimeout(() => cleanupProbe(node, zeroGain), 90);
    return snapshot;
  } catch (error) {
    cleanupProbe(node, zeroGain);
    return publishSnapshot({
      status: 'failed',
      requestedAtMs,
      completedAtMs: nowMs(),
      detail: 'blob-worklet-smoke-test-failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }
}

export function ensureXensonarBlobWorkletSmokeTest(
  ctx: BaseAudioContext,
): Promise<XensonarBlobWorkletSmokeSnapshot> {
  const existing = smokePromises.get(ctx);
  if (existing) return existing;
  const promise = runBlobWorkletSmokeTest(ctx);
  smokePromises.set(ctx, promise);
  return promise;
}

export function getXensonarBlobWorkletSmokeSnapshot(): XensonarBlobWorkletSmokeSnapshot {
  return { ...lastSnapshot };
}

export const XENSONAR_BLOB_WORKLET_SMOKE_PROCESSOR_NAME = PROCESSOR_NAME;
