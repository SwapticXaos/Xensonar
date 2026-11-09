import { TONE_PLAN_BYTES, TONE_PLAN_WORDS } from "../protocol/tonePlanRecord";
import type { TonePlanWriter } from "./tonePlanTransport";

/**
 * Non-SAB default path for current Xensonar. A fixed transferable-buffer pool
 * bounds outstanding hot messages. Returned buffers are recycled; no ACK carries
 * musical semantics and no event is replayed automatically.
 */
export class MessagePortTonePlanPool implements TonePlanWriter {
  readonly kind = "message-port-pool" as const;
  private readonly free: ArrayBuffer[] = [];
  private live = true;

  constructor(private readonly port: MessagePort, capacity = 32) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity");
    for (let i = 0; i < capacity; i++) this.free.push(new ArrayBuffer(TONE_PLAN_BYTES));
  }

  /** Call from the host's MessagePort handler for HOT_BUFFER_RETURN. */
  reclaim(buffer: ArrayBuffer): void {
    if (!this.live || buffer.byteLength !== TONE_PLAN_BYTES) return;
    this.free.push(buffer);
  }

  trySend(record: Uint32Array): boolean {
    if (!this.live || record.length !== TONE_PLAN_WORDS) return false;
    const buffer = this.free.pop();
    if (!buffer) return false;
    new Uint32Array(buffer).set(record);
    this.port.postMessage({ type: "HOT_TONE_PLAN", buffer }, [buffer]);
    return true;
  }

  get availableBuffers(): number { return this.free.length; }
  get availableRecords(): number { return this.live ? this.free.length : 0; }
  destroy(): void { this.live = false; this.free.length = 0; }
}
