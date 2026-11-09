import { POST_MASTER_PCM_PROCESSOR_NAME, POST_MASTER_PCM_WORKLET_SOURCE } from './postMasterPcmWorkletSource';
import { POST_MASTER_PCM_WORKER_SOURCE } from './postMasterPcmWorkerSource';
import type { OutputStopProof } from './postMasterOutputSession';

const moduleLoads = new WeakMap<AudioContext, Promise<void>>();
const moduleUrl = (source: string) => URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
function loadTap(ctx: AudioContext): Promise<void> {
  let loading = moduleLoads.get(ctx);
  if (!loading) {
    const url = moduleUrl(POST_MASTER_PCM_WORKLET_SOURCE);
    loading = ctx.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    moduleLoads.set(ctx, loading);
    void loading.catch(() => moduleLoads.delete(ctx));
  }
  return loading;
}

type Message = Record<string, unknown>;
type Waiter = { resolve(message: Message): void; reject(error: Error): void };
export function createPostMasterPcmTransport(args: {
  context: AudioContext;
  master: GainNode;
  baseUrl: string;
  onProgress(message: Message): void;
  onFault(message: string): void;
}) {
  let worker: Worker | null = null;
  let tap: AudioWorkletNode | null = null;
  let keepalive: GainNode | null = null;
  let workerUrl: string | null = null;
  let control: Int32Array | null = null;
  let disposed = false;
  let generation = 0;
  let stopPromise: Promise<OutputStopProof> | null = null;
  const waiters = new Map<string, Waiter>();
  const wait = (type: string, timeoutMs: number, signal?: AbortSignal) => new Promise<Message>((resolve, reject) => {
    const finish = (error: Error | null, value: Message = {}) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      waiters.delete(type);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(new Error('output-session-cancelled'));
    const timer = setTimeout(() => finish(new Error(type.toLowerCase() + '-timeout')), timeoutMs);
    waiters.set(type, { resolve: m => finish(null, m), reject: e => finish(e) });
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
  return {
    async prepare(signal: AbortSignal) {
      if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw new Error('cross-origin-isolation-required');
      if (!args.context.audioWorklet) throw new Error('audio-worklet-required');
      // A stalled module load must not keep a cancelled React lifecycle alive.
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new Error('output-session-cancelled')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); reject(new Error('tap-load-timeout')); }, 4000);
        if (signal.aborted) { abort(); return; }
        signal.addEventListener('abort', abort, { once: true });
        loadTap(args.context).then(resolve, reject).finally(() => {
          clearTimeout(timer); signal.removeEventListener('abort', abort);
        });
      });
      if (signal.aborted || disposed) throw new Error('output-session-cancelled');
      const audioSab = new SharedArrayBuffer(8 + (32768 * 2 + 1) * 4);
      const controlSab = new SharedArrayBuffer(16 * 4);
      control = new Int32Array(controlSab);
      tap = new AudioWorkletNode(args.context, POST_MASTER_PCM_PROCESSOR_NAME, {
        numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
        channelCount: 2, channelCountMode: 'explicit', processorOptions: { audioSab, controlSab },
      });
      tap.port.onmessage = ({ data }: MessageEvent<Message>) => {
        if (!disposed && data.type === 'TAP_FENCED') waiters.get('TAP_FENCED')?.resolve(data);
      };
      tap.onprocessorerror = () => args.onFault('post-master-tap-error');
      keepalive = args.context.createGain();
      keepalive.gain.value = 0;
      args.master.connect(tap);
      tap.connect(keepalive);
      keepalive.connect(args.context.destination);
      workerUrl = moduleUrl(POST_MASTER_PCM_WORKER_SOURCE);
      worker = new Worker(workerUrl, { name: 'xensonar-master-output' });
      worker.onmessage = ({ data }: MessageEvent<Message>) => {
        if (disposed) return;
        const type = String(data.type || '');
        if (type === 'ARMED') generation = Number(data.generation);
        if (data.generation && generation && Number(data.generation) !== generation) return;
        if (type === 'FAULT') {
          const error = String(data.error || 'post-master-worker-fault');
          waiters.get('PREFILLED')?.reject(new Error(error));
          waiters.get('COMMITTED')?.reject(new Error(error));
          args.onFault(error);
        } else if (type === 'PROGRESS' || type === 'ARMED') {
          args.onProgress({ ...data, droppedFrames: control ? Atomics.load(control, 3) : 0 });
        }
        waiters.get(type)?.resolve(data);
      };
      worker.onerror = event => {
        const error = event.message || 'post-master-worker-error';
        for (const waiter of [...waiters.values()]) waiter.reject(new Error(error));
        args.onFault(error);
      };
      const ready = wait('PREFILLED', 5000, signal);
      worker.postMessage({ type: 'INIT', audioSab, controlSab, sampleRate: args.context.sampleRate,
        blockFrames: 1024, prefillFrames: 2048, baseUrl: args.baseUrl });
      await ready;
    },
    async settleBrowserMaster(signal: AbortSignal) {
      if (!tap || signal.aborted) throw new Error('output-session-cancelled');
      const fenced = wait('TAP_FENCED', 1500, signal);
      tap.port.postMessage({ type: 'FENCE' });
      await fenced;
    },
    async commit(signal: AbortSignal) {
      if (!worker || signal.aborted) throw new Error('output-session-cancelled');
      const committed = wait('COMMITTED', 1500, signal);
      worker.postMessage({ type: 'COMMIT', generation });
      await committed;
    },
    stop(): Promise<OutputStopProof> {
      return stopPromise ??= (async () => {
        if (!worker) return { confirmed: true }; // No native command could be sent.
        try {
          const stopped = wait('STOPPED', 4500);
          worker.postMessage({ type: 'STOP' });
          const result = await stopped;
          return { confirmed: result.confirmed === true, reason: String(result.error || 'native-stop-unconfirmed') };
        } catch (error) { return { confirmed: false, reason: String(error) }; }
      })();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const waiter of [...waiters.values()]) waiter.reject(new Error('output-transport-disposed'));
      if (control) Atomics.store(control, 7, 1);
      try { if (tap) args.master.disconnect(tap); } catch { /* Context may have closed. */ }
      try { tap?.disconnect(); } catch { /* Already disconnected. */ }
      try { tap?.port.close(); } catch { /* Already closed. */ }
      try { keepalive?.disconnect(); } catch { /* Already disconnected. */ }
      worker?.terminate();
      if (workerUrl) URL.revokeObjectURL(workerUrl);
      tap = null; keepalive = null; worker = null;
    },
  };
}
