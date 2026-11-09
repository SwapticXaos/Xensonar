/**
 * Browser transport record for the REAL OP2 xen_tone_plan ABI.
 * Fixed 64 x u32 = 256 bytes, so a whole compound timbre is published atomically.
 * This is transport encoding only; it does not define musical semantics.
 */
export const TONE_PLAN_PROTOCOL_VERSION = 1;
export const TONE_PLAN_KIND = 1;
export const TONE_PLAN_WORDS = 64;
export const TONE_PLAN_BYTES = TONE_PLAN_WORDS * 4;
export const TONE_PLAN_MAX_TONES = 8;

export const TP = {
  META: 0,
  TOKEN: 1,
  EPOCH: 2,
  FRAME_LO: 3,
  FRAME_HI: 4,
  TONE_COUNT: 5,
  EVENT_ID: 6,
  RESERVED: 7,
  TONES: 8,
} as const;

export const TONE_WORDS = 7;
export const TD = {
  FREQ_HZ: 0,
  GAIN: 1,
  CUTOFF_HZ: 2,
  RESONANCE: 3,
  DELAY_FRAMES: 4,
  DURATION_FRAMES: 5,
  WAVEFORM: 6,
} as const;

export type ResolvedTone = {
  frequencyHz: number;
  gain: number;
  cutoffHz: number;
  resonance: number;
  delayFrames: number;
  durationFrames: number;
  waveform: number;
};

export type TonePlanTransportValue = {
  token: number;
  epoch: number;
  frame: bigint | number;
  eventId?: number;
  tones: readonly ResolvedTone[];
};

export function makeTonePlanMeta(flags = 0): number {
  return ((TONE_PLAN_KIND & 0xff) |
    ((TONE_PLAN_PROTOCOL_VERSION & 0xff) << 8) |
    ((flags & 0xffff) << 16)) >>> 0;
}

export function splitU64(value: bigint | number): [number, number] {
  const v = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  if (v < 0n || v > 0xffffffffffffffffn) throw new RangeError("u64 out of range");
  return [Number(v & 0xffffffffn) >>> 0, Number((v >> 32n) & 0xffffffffn) >>> 0];
}

export function joinU64(lo: number, hi: number): bigint {
  return (BigInt(hi >>> 0) << 32n) | BigInt(lo >>> 0);
}

export class TonePlanRecordEncoder {
  readonly buffer = new ArrayBuffer(TONE_PLAN_BYTES);
  readonly u32 = new Uint32Array(this.buffer);
  readonly f32 = new Float32Array(this.buffer);

  encode(plan: TonePlanTransportValue): Uint32Array {
    if (!plan.tones.length || plan.tones.length > TONE_PLAN_MAX_TONES) {
      throw new RangeError(`tone count must be 1..${TONE_PLAN_MAX_TONES}`);
    }
    const [lo, hi] = splitU64(plan.frame);
    const u = this.u32;
    const f = this.f32;
    u.fill(0);
    u[TP.META] = makeTonePlanMeta();
    u[TP.TOKEN] = plan.token >>> 0;
    u[TP.EPOCH] = plan.epoch >>> 0;
    u[TP.FRAME_LO] = lo;
    u[TP.FRAME_HI] = hi;
    u[TP.TONE_COUNT] = plan.tones.length >>> 0;
    u[TP.EVENT_ID] = (plan.eventId ?? plan.token) >>> 0;

    for (let i = 0; i < plan.tones.length; i++) {
      const t = plan.tones[i];
      const b = TP.TONES + i * TONE_WORDS;
      f[b + TD.FREQ_HZ] = t.frequencyHz;
      f[b + TD.GAIN] = t.gain;
      f[b + TD.CUTOFF_HZ] = t.cutoffHz;
      f[b + TD.RESONANCE] = t.resonance;
      u[b + TD.DELAY_FRAMES] = t.delayFrames >>> 0;
      u[b + TD.DURATION_FRAMES] = t.durationFrames >>> 0;
      u[b + TD.WAVEFORM] = t.waveform >>> 0;
    }
    return u;
  }
}

export function validateTonePlanRecord(words: Uint32Array): boolean {
  if (words.length !== TONE_PLAN_WORDS) return false;
  const meta = words[TP.META] >>> 0;
  if ((meta & 0xff) !== TONE_PLAN_KIND) return false;
  if (((meta >>> 8) & 0xff) !== TONE_PLAN_PROTOCOL_VERSION) return false;
  const n = words[TP.TONE_COUNT] >>> 0;
  return n >= 1 && n <= TONE_PLAN_MAX_TONES;
}
