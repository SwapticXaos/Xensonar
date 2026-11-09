/** Cold control plane. No note, PCM block or render quantum passes through here. */
export type OutputPhase = 'idle' | 'preparing' | 'armed' | 'activating' |
  'native-owned' | 'stopping' | 'stopped' | 'fault' | 'owner-unknown';

export type OutputStopProof = { confirmed: boolean; reason?: string };
export type MasterOutputPorts = {
  prepare(signal: AbortSignal): Promise<void>;
  commit(signal: AbortSignal): Promise<void>;
  stop(): Promise<OutputStopProof>;
  disconnectBrowserMaster(): void;
  settleBrowserMaster(signal: AbortSignal): Promise<void>;
  reconnectBrowserMaster(): void;
  dispose(): void;
  publish(phase: OutputPhase, error: string | null): void;
};

/** A session is single-use. Cancellation cannot release its output lease early. */
export class PostMasterOutputSession {
  private readonly abort = new AbortController();
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private disconnected = false;
  private stopRequested = false;
  private error: string | null = null;
  phase: OutputPhase = 'idle';

  constructor(private readonly ports: MasterOutputPorts) {}

  private publish(phase: OutputPhase) {
    this.phase = phase;
    this.ports.publish(phase, this.error);
  }

  start(): Promise<void> {
    // Install the latch before invoking even the first asynchronous dependency.
    return this.startPromise ??= Promise.resolve().then(async () => {
      if (this.stopRequested) return;
      try {
        this.publish('preparing');
        await this.ports.prepare(this.abort.signal);
        if (this.stopRequested) return;
        this.publish('armed');
        this.ports.disconnectBrowserMaster();
        this.disconnected = true;
        this.publish('activating');
        await this.ports.settleBrowserMaster(this.abort.signal);
        if (this.stopRequested) return;
        await this.ports.commit(this.abort.signal);
        if (!this.stopRequested) this.publish('native-owned');
      } catch (error) {
        if (!this.stopRequested) {
          this.error = error instanceof Error ? error.message : String(error);
          this.stopRequested = true;
          this.abort.abort();
        }
      }
    }).then(async () => {
      if (this.stopRequested) await this.finish();
    });
  }

  stop(error?: string): Promise<void> {
    if (error && !this.error) this.error = error;
    this.stopRequested = true;
    this.abort.abort();
    // prepare/commit must settle before resources can be disposed. Their
    // cancellation does not mean the remote operation was undone: stop proves it.
    return this.startPromise ? this.startPromise.then(() => this.finish()) : this.finish();
  }

  private finish(): Promise<void> {
    return this.stopPromise ??= Promise.resolve().then(async () => {
      this.publish('stopping');
      let proof: OutputStopProof;
      try { proof = await this.ports.stop(); }
      catch (error) { proof = { confirmed: false, reason: String(error) }; }
      if (this.disconnected && !proof.confirmed) {
        this.error = [this.error, proof.reason || 'native-stop-unconfirmed'].filter(Boolean).join('; ');
        this.ports.dispose();
        this.publish('owner-unknown');
        return;
      }
      try {
        if (this.disconnected) this.ports.reconnectBrowserMaster();
        this.disconnected = false;
        this.ports.dispose();
        this.publish(this.error ? 'fault' : 'stopped');
      } catch (error) {
        this.error = [this.error, String(error)].filter(Boolean).join('; ');
        this.ports.dispose();
        this.publish('owner-unknown');
      }
    });
  }
}

// Includes React cleanup/remount: a successor waits for its predecessor's
// confirmed stop. Unknown ownership intentionally keeps this context reserved.
const leases = new WeakMap<object, Promise<void>>();
export function enqueueMasterOutput(context: object, create: () => PostMasterOutputSession) {
  const previous = leases.get(context);
  let session: PostMasterOutputSession | null = null;
  let cancelled = false;
  let resolveDone!: () => void;
  const done = new Promise<void>(resolve => { resolveDone = resolve; });
  leases.set(context, done);
  const ready = (async () => {
    if (previous) await previous;
    if (cancelled) { resolveDone(); return; }
    session = create();
    await session.start();
    if (session.phase === 'fault' || session.phase === 'stopped') resolveDone();
  })();
  return async () => {
    cancelled = true;
    await ready;
    if (session) await session.stop();
    if (session?.phase !== 'owner-unknown') resolveDone();
  };
}
