import { RingBuffer } from "../vendor/ringbuf.js/ringbuf";
import { TONE_PLAN_WORDS } from "../protocol/tonePlanRecord";
import { FixedRecordReader, FixedRecordWriter } from "./fixedRecordQueue";
import type { TonePlanWriter } from "./tonePlanTransport";

export function allocateTonePlanRing(recordCapacity = 256): SharedArrayBuffer {
  if (!Number.isInteger(recordCapacity) || recordCapacity < 1) throw new RangeError("recordCapacity");
  return RingBuffer.getStorageForCapacity(recordCapacity * TONE_PLAN_WORDS, Uint32Array);
}

export class RingbufTonePlanWriter implements TonePlanWriter {
  readonly kind = "ringbuf-sab" as const;
  private readonly writer: FixedRecordWriter;
  constructor(sab: SharedArrayBuffer) {
    this.writer = new FixedRecordWriter(new RingBuffer(sab, Uint32Array), TONE_PLAN_WORDS);
  }
  trySend(record: Uint32Array): boolean { return this.writer.tryPush(record); }
  get availableRecords(): number { return this.writer.availableRecords; }
  destroy(): void {}
}

export class RingbufTonePlanReader {
  private readonly reader: FixedRecordReader;
  readonly scratch = new Uint32Array(TONE_PLAN_WORDS);
  constructor(sab: SharedArrayBuffer) {
    this.reader = new FixedRecordReader(new RingBuffer(sab, Uint32Array), TONE_PLAN_WORDS);
  }
  tryPop(): Uint32Array | null { return this.reader.tryPop(this.scratch) ? this.scratch : null; }
}
