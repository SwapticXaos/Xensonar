import { RingBuffer } from "../vendor/ringbuf.js/ringbuf";

/** Whole-record-or-no-record wrapper around upstream ringbuf.js. */
export class FixedRecordWriter {
  constructor(private readonly ring: RingBuffer, readonly wordsPerRecord: number) {
    if (ring.type() !== "Uint32Array") throw new TypeError("Uint32Array ring required");
  }
  tryPush(record: Uint32Array): boolean {
    if (record.length !== this.wordsPerRecord) throw new RangeError("wrong record size");
    if (this.ring.availableWrite() < this.wordsPerRecord) return false;
    return this.ring.push(record, this.wordsPerRecord) === this.wordsPerRecord;
  }
  get availableRecords(): number { return Math.floor(this.ring.availableWrite() / this.wordsPerRecord); }
}

export class FixedRecordReader {
  constructor(private readonly ring: RingBuffer, readonly wordsPerRecord: number) {
    if (ring.type() !== "Uint32Array") throw new TypeError("Uint32Array ring required");
  }
  tryPop(target: Uint32Array): boolean {
    if (target.length < this.wordsPerRecord) throw new RangeError("target too small");
    if (this.ring.availableRead() < this.wordsPerRecord) return false;
    return this.ring.pop(target, this.wordsPerRecord) === this.wordsPerRecord;
  }
}
