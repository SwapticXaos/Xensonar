/* TS-MOD-08: Cross-room handoff bus.
   Rooms are lazily compiled and mounted, so a fire-and-forget window CustomEvent sent
   to a room that is still loading is simply lost. Senders therefore polled (e.g. 180 x 80 ms
   re-dispatch loops) until a mounted receiver claimed the request.
   This bus gives such handoffs one explicit contract:
     publish/subscribe  — synchronous fan-out to currently mounted listeners (no memory);
     deliver/consume    — single-delivery mailbox: a handoff waits (bounded, with TTL) until
                          exactly one consumer accepts it, also across a lazy room mount.
   Built by tools/ts_module.cjs into __XenTs_roomBus. Zone: KALT (UI routing only). */

export type RoomBusHandler<T = unknown> = (detail: T) => void;
/** Return `false` to decline a delivery (it stays queued for another consumer). */
export type RoomBusConsumer<T = unknown> = (detail: T) => boolean | void;

export interface RoomBusDeliverOptions {
  /** Maximum time a handoff waits for a consumer. Default 15000 ms. */
  readonly ttlMs?: number;
  /** Withdraws a still-queued handoff (resolves false). Has no effect once consumed. */
  readonly signal?: AbortSignal;
}

export type RoomBusEventKind = 'publish' | 'deliver' | 'consume' | 'expire' | 'drop' | 'error';

export interface RoomBusEvent {
  readonly kind: RoomBusEventKind;
  readonly topic: string;
  readonly atMs: number;
  readonly receivers: number;
}

export interface RoomBus {
  publish<T>(topic: string, detail: T): number;
  subscribe<T>(topic: string, handler: RoomBusHandler<T>): () => void;
  deliver<T>(topic: string, detail: T, options?: RoomBusDeliverOptions): Promise<boolean>;
  consume<T>(topic: string, consumer: RoomBusConsumer<T>): () => void;
  pending(topic?: string): number;
  history(): readonly RoomBusEvent[];
}

export interface RoomBusOptions {
  readonly now?: () => number;
  readonly setTimer?: (fn: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
  readonly historySize?: number;
  readonly maxPendingPerTopic?: number;
  readonly onError?: (error: unknown, topic: string) => void;
}

interface PendingHandoff {
  readonly detail: unknown;
  readonly settle: (accepted: boolean) => void;
  timer: unknown;
}

const TOPIC = /^[a-z0-9][a-z0-9:._-]{0,95}$/;
export const DEFAULT_TTL_MS = 15000;
export const MAX_TTL_MS = 120000;

export function isValidTopic(topic: unknown): topic is string {
  return typeof topic === 'string' && TOPIC.test(topic);
}

export function clampTtl(ttlMs: unknown): number {
  const n = typeof ttlMs === 'number' && Number.isFinite(ttlMs) ? ttlMs : DEFAULT_TTL_MS;
  return Math.min(MAX_TTL_MS, Math.max(0, Math.round(n)));
}

export function createRoomBus(options: RoomBusOptions = {}): RoomBus {
  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const historySize = Math.max(1, Math.min(512, options.historySize ?? 64));
  const maxPending = Math.max(1, Math.min(64, options.maxPendingPerTopic ?? 8));
  const onError = options.onError ?? (() => undefined);

  const subscribers = new Map<string, Set<RoomBusHandler>>();
  const consumers = new Map<string, Set<RoomBusConsumer>>();
  const mailbox = new Map<string, PendingHandoff[]>();
  const ring: RoomBusEvent[] = [];

  const assertTopic = (topic: unknown): string => {
    if (!isValidTopic(topic)) throw new TypeError('Invalid room-bus topic: ' + String(topic));
    return topic;
  };
  const record = (kind: RoomBusEventKind, topic: string, receivers: number): void => {
    ring.push(Object.freeze({ kind, topic, atMs: now(), receivers }));
    if (ring.length > historySize) ring.splice(0, ring.length - historySize);
  };
  const register = <F>(map: Map<string, Set<F>>, topic: string, fn: F): (() => void) => {
    let set = map.get(topic);
    if (!set) { set = new Set(); map.set(topic, set); }
    set.add(fn);
    return () => {
      const current = map.get(topic);
      if (!current) return;
      current.delete(fn);
      if (!current.size) map.delete(topic);
    };
  };
  /** Offers one handoff to the current consumers; true when one accepted it. */
  const offer = (topic: string, detail: unknown): boolean => {
    const set = consumers.get(topic);
    if (!set) return false;
    for (const consumer of [...set]) {
      try {
        if (consumer(detail) !== false) return true;
      } catch (error) {
        record('error', topic, set.size);
        onError(error, topic);
      }
    }
    return false;
  };
  const removePending = (topic: string, entry: PendingHandoff): void => {
    const queue = mailbox.get(topic);
    if (!queue) return;
    const index = queue.indexOf(entry);
    if (index >= 0) queue.splice(index, 1);
    if (!queue.length) mailbox.delete(topic);
  };

  function publish<T>(topic: string, detail: T): number {
    assertTopic(topic);
    const set = subscribers.get(topic);
    const handlers = set ? [...set] : [];
    for (const handler of handlers) {
      try { handler(detail); } catch (error) { record('error', topic, handlers.length); onError(error, topic); }
    }
    record('publish', topic, handlers.length);
    return handlers.length;
  }

  function subscribe<T>(topic: string, handler: RoomBusHandler<T>): () => void {
    assertTopic(topic);
    if (typeof handler !== 'function') throw new TypeError('Room-bus handler must be a function');
    return register(subscribers, topic, handler as RoomBusHandler);
  }

  function deliver<T>(topic: string, detail: T, deliverOptions: RoomBusDeliverOptions = {}): Promise<boolean> {
    assertTopic(topic);
    if (offer(topic, detail)) { record('consume', topic, 1); return Promise.resolve(true); }
    const ttl = clampTtl(deliverOptions.ttlMs);
    const signal = deliverOptions.signal;
    if (signal?.aborted) { record('drop', topic, 0); return Promise.resolve(false); }
    if (ttl === 0) { record('expire', topic, 0); return Promise.resolve(false); }
    return new Promise<boolean>(resolve => {
      let queue = mailbox.get(topic);
      if (!queue) { queue = []; mailbox.set(topic, queue); }
      if (queue.length >= maxPending) {
        const oldest = queue.shift();
        if (oldest) { clearTimer(oldest.timer); record('drop', topic, 0); oldest.settle(false); }
      }
      let settled = false;
      const abort = (): void => { clearTimer(entry.timer); removePending(topic, entry); record('drop', topic, 0); entry.settle(false); };
      const entry: PendingHandoff = {
        detail,
        settle: accepted => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', abort);
          resolve(accepted);
        },
        timer: null
      };
      signal?.addEventListener('abort', abort, { once: true });
      entry.timer = setTimer(() => { removePending(topic, entry); record('expire', topic, 0); entry.settle(false); }, ttl);
      queue.push(entry);
      record('deliver', topic, 0);
    });
  }

  function consume<T>(topic: string, consumer: RoomBusConsumer<T>): () => void {
    assertTopic(topic);
    if (typeof consumer !== 'function') throw new TypeError('Room-bus consumer must be a function');
    const off = register(consumers, topic, consumer as RoomBusConsumer);
    // Drain handoffs that arrived before this consumer mounted (FIFO, one consumer each).
    const queue = mailbox.get(topic);
    if (queue) {
      for (const entry of [...queue]) {
        let accepted = false;
        try { accepted = (consumer as RoomBusConsumer)(entry.detail) !== false; }
        catch (error) { record('error', topic, 1); onError(error, topic); }
        if (!accepted) continue;
        clearTimer(entry.timer);
        removePending(topic, entry);
        record('consume', topic, 1);
        entry.settle(true);
      }
    }
    return off;
  }

  function pending(topic?: string): number {
    if (topic !== undefined) return mailbox.get(assertTopic(topic))?.length ?? 0;
    let total = 0;
    for (const queue of mailbox.values()) total += queue.length;
    return total;
  }

  function history(): readonly RoomBusEvent[] {
    return Object.freeze(ring.slice());
  }

  return Object.freeze({ publish, subscribe, deliver, consume, pending, history });
}
