/** Fixed browser record for one already-resolved Wave Entrophon body.
 * Musical policy stays in scheduledTonePlaybackBoundary; this is execution data only.
 */
import { splitU64, TONE_PLAN_BYTES, TONE_PLAN_WORDS } from "./tonePlanRecord";

export const ENTROPHON_PLAN_PROTOCOL_VERSION = 1;
export const ENTROPHON_PLAN_KIND = 2;
export const ENTROPHON_PLAN_WORDS = TONE_PLAN_WORDS;
export const ENTROPHON_PLAN_BYTES = TONE_PLAN_BYTES;
export const ENTROPHON_BASE_MAX = 6;
export const ENTROPHON_COLOR_MAX = 3;
export const ENTROPHON_AUX_MAX = 6;
export const ENTROPHON_DELAY_MAX_FRAMES = 16384;

export const EP = {
  META: 0, TOKEN: 1, EPOCH: 2, FRAME_LO: 3, FRAME_HI: 4,
  BASE_COUNT: 5, COLOR_COUNT: 6, FLAGS: 7,
  BASE_FREQS: 8, COLOR_FREQS: 14, COLOR_GAINS: 17,
  PEAK_GAIN: 20, SUSTAIN_GAIN: 21,
  ATTACK_FRAMES: 22, DECAY_FRAMES: 23, RELEASE_START_FRAMES: 24,
  RELEASE_FRAMES: 25, STOP_AFTER_FRAMES: 26,
  PITCH_BEND_MUL: 27, PITCH_BEND_FRAMES: 28,
  FILTER_START_HZ: 29, FILTER_PEAK_HZ: 30, FILTER_END_HZ: 31,
  FILTER_ATTACK_FRAMES: 32, FILTER_DECAY_FRAMES: 33, FILTER_Q: 34,
  PRE_DRIVE_GAIN: 35, DRIVE_AMOUNT: 36,
  BODY_FREQ_HZ: 37, BODY_Q: 38, BODY_GAIN: 39,
  DELAY_FRAMES: 40, DELAY_WET_GAIN: 41, DELAY_FEEDBACK: 42,
  NORMALIZATION_GAIN: 43, AUX_ROUTE_MASK: 44, EVENT_ID: 45,
} as const;

export type EntrophonPlanTransportValue = {
  token: number;
  epoch: number;
  frame: bigint | number;
  eventId?: number;
  waveform: number;
  filterType: number;
  baseFreqs: readonly number[];
  colorFreqs: readonly number[];
  colorGains: readonly number[];
  peakGain: number;
  sustainGain: number;
  attackFrames: number;
  decayFrames: number;
  releaseStartFrames: number;
  releaseFrames: number;
  stopAfterFrames: number;
  pitchBendMul: number;
  pitchBendFrames: number;
  filterStartHz: number;
  filterPeakHz: number;
  filterEndHz: number;
  filterAttackFrames: number;
  filterDecayFrames: number;
  filterQ: number;
  preDriveGain: number;
  driveAmount: number;
  bodyFreqHz: number;
  bodyQ: number;
  bodyGain: number;
  delayFrames: number;
  delayWetGain: number;
  delayFeedback: number;
  normalizationGain: number;
  auxRouteMask: number;
};

function u32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError(label);
  return value >>> 0;
}
function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(label);
  return value;
}
function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(label);
  return value;
}

export class EntrophonPlanRecordEncoder {
  readonly buffer = new ArrayBuffer(ENTROPHON_PLAN_BYTES);
  readonly u32 = new Uint32Array(this.buffer);
  readonly f32 = new Float32Array(this.buffer);

  encode(plan: EntrophonPlanTransportValue): Uint32Array {
    if (plan.baseFreqs.length < 1 || plan.baseFreqs.length > ENTROPHON_BASE_MAX) throw new RangeError("baseFreqs");
    if (plan.colorFreqs.length > ENTROPHON_COLOR_MAX || plan.colorGains.length < plan.colorFreqs.length) throw new RangeError("colorFreqs");
    if (!Number.isInteger(plan.waveform) || plan.waveform < 0 || plan.waveform > 3) throw new RangeError("waveform");
    if (!Number.isInteger(plan.filterType) || plan.filterType < 0 || plan.filterType > 3) throw new RangeError("filterType");
    const auxMask = u32(plan.auxRouteMask, "auxRouteMask");
    if (auxMask & ~0x3f) throw new RangeError("auxRouteMask");
    if (plan.delayFrames < 0 || plan.delayFrames >= ENTROPHON_DELAY_MAX_FRAMES) throw new RangeError("delayFrames");

    this.u32.fill(0);
    this.u32[EP.META] = ((ENTROPHON_PLAN_KIND & 0xff) | ((ENTROPHON_PLAN_PROTOCOL_VERSION & 0xff) << 8)) >>> 0;
    this.u32[EP.TOKEN] = u32(plan.token, "token");
    this.u32[EP.EPOCH] = u32(plan.epoch, "epoch");
    const [lo, hi] = splitU64(plan.frame); this.u32[EP.FRAME_LO] = lo; this.u32[EP.FRAME_HI] = hi;
    this.u32[EP.BASE_COUNT] = plan.baseFreqs.length;
    this.u32[EP.COLOR_COUNT] = plan.colorFreqs.length;
    this.u32[EP.FLAGS] = ((plan.waveform & 0xff) | ((plan.filterType & 0xff) << 8)) >>> 0;
    for (let i=0;i<plan.baseFreqs.length;i++) this.f32[EP.BASE_FREQS+i] = positive(plan.baseFreqs[i], `baseFreqs[${i}]`);
    for (let i=0;i<plan.colorFreqs.length;i++) {
      this.f32[EP.COLOR_FREQS+i] = positive(plan.colorFreqs[i], `colorFreqs[${i}]`);
      this.f32[EP.COLOR_GAINS+i] = finite(plan.colorGains[i], `colorGains[${i}]`);
    }
    this.f32[EP.PEAK_GAIN] = positive(plan.peakGain, "peakGain");
    this.f32[EP.SUSTAIN_GAIN] = finite(plan.sustainGain, "sustainGain");
    this.u32[EP.ATTACK_FRAMES] = u32(plan.attackFrames, "attackFrames");
    this.u32[EP.DECAY_FRAMES] = u32(plan.decayFrames, "decayFrames");
    this.u32[EP.RELEASE_START_FRAMES] = u32(plan.releaseStartFrames, "releaseStartFrames");
    this.u32[EP.RELEASE_FRAMES] = u32(plan.releaseFrames, "releaseFrames");
    this.u32[EP.STOP_AFTER_FRAMES] = u32(plan.stopAfterFrames, "stopAfterFrames");
    this.f32[EP.PITCH_BEND_MUL] = positive(plan.pitchBendMul, "pitchBendMul");
    this.u32[EP.PITCH_BEND_FRAMES] = u32(plan.pitchBendFrames, "pitchBendFrames");
    this.f32[EP.FILTER_START_HZ] = positive(plan.filterStartHz, "filterStartHz");
    this.f32[EP.FILTER_PEAK_HZ] = positive(plan.filterPeakHz, "filterPeakHz");
    this.f32[EP.FILTER_END_HZ] = positive(plan.filterEndHz, "filterEndHz");
    this.u32[EP.FILTER_ATTACK_FRAMES] = u32(plan.filterAttackFrames, "filterAttackFrames");
    this.u32[EP.FILTER_DECAY_FRAMES] = u32(plan.filterDecayFrames, "filterDecayFrames");
    this.f32[EP.FILTER_Q] = positive(plan.filterQ, "filterQ");
    this.f32[EP.PRE_DRIVE_GAIN] = finite(plan.preDriveGain, "preDriveGain");
    this.f32[EP.DRIVE_AMOUNT] = finite(plan.driveAmount, "driveAmount");
    this.f32[EP.BODY_FREQ_HZ] = positive(plan.bodyFreqHz, "bodyFreqHz");
    this.f32[EP.BODY_Q] = positive(plan.bodyQ, "bodyQ");
    this.f32[EP.BODY_GAIN] = finite(plan.bodyGain, "bodyGain");
    this.u32[EP.DELAY_FRAMES] = u32(plan.delayFrames, "delayFrames");
    this.f32[EP.DELAY_WET_GAIN] = finite(plan.delayWetGain, "delayWetGain");
    this.f32[EP.DELAY_FEEDBACK] = finite(plan.delayFeedback, "delayFeedback");
    this.f32[EP.NORMALIZATION_GAIN] = positive(plan.normalizationGain, "normalizationGain");
    this.u32[EP.AUX_ROUTE_MASK] = auxMask;
    this.u32[EP.EVENT_ID] = u32(plan.eventId ?? 0, "eventId");
    return this.u32;
  }
}

export function validateEntrophonPlanRecord(words: Uint32Array): boolean {
  if (words.length !== ENTROPHON_PLAN_WORDS) return false;
  const meta = words[EP.META] >>> 0;
  if ((meta & 0xff) !== ENTROPHON_PLAN_KIND || ((meta >>> 8) & 0xff) !== ENTROPHON_PLAN_PROTOCOL_VERSION) return false;
  const baseCount = words[EP.BASE_COUNT] >>> 0, colorCount = words[EP.COLOR_COUNT] >>> 0;
  if (baseCount < 1 || baseCount > ENTROPHON_BASE_MAX || colorCount > ENTROPHON_COLOR_MAX) return false;
  const flags = words[EP.FLAGS] >>> 0;
  if ((flags & 0xff) > 3 || ((flags >>> 8) & 0xff) > 3 || (words[EP.AUX_ROUTE_MASK] & ~0x3f) !== 0) return false;
  const f32 = new Float32Array(words.buffer, words.byteOffset, words.length);
  for (let i=0;i<baseCount;i++) if (!Number.isFinite(f32[EP.BASE_FREQS+i]) || f32[EP.BASE_FREQS+i] <= 0) return false;
  for (let i=0;i<colorCount;i++) if (!Number.isFinite(f32[EP.COLOR_FREQS+i]) || f32[EP.COLOR_FREQS+i] <= 0 || !Number.isFinite(f32[EP.COLOR_GAINS+i])) return false;
  const requiredFinite = [EP.PEAK_GAIN,EP.SUSTAIN_GAIN,EP.PITCH_BEND_MUL,EP.FILTER_START_HZ,EP.FILTER_PEAK_HZ,EP.FILTER_END_HZ,EP.FILTER_Q,EP.PRE_DRIVE_GAIN,EP.DRIVE_AMOUNT,EP.BODY_FREQ_HZ,EP.BODY_Q,EP.BODY_GAIN,EP.DELAY_WET_GAIN,EP.DELAY_FEEDBACK,EP.NORMALIZATION_GAIN];
  if (requiredFinite.some(i => !Number.isFinite(f32[i]))) return false;
  if (f32[EP.PEAK_GAIN] <= 0 || f32[EP.PITCH_BEND_MUL] <= 0 || f32[EP.FILTER_START_HZ] <= 0 || f32[EP.FILTER_Q] <= 0 || f32[EP.BODY_FREQ_HZ] <= 0 || f32[EP.BODY_Q] <= 0 || f32[EP.NORMALIZATION_GAIN] <= 0) return false;
  if ((words[EP.ATTACK_FRAMES] >>> 0) < 1 || (words[EP.RELEASE_FRAMES] >>> 0) < 1 || (words[EP.STOP_AFTER_FRAMES] >>> 0) < 2) return false;
  if ((words[EP.RELEASE_START_FRAMES] >>> 0) >= (words[EP.STOP_AFTER_FRAMES] >>> 0)) return false;
  if ((words[EP.DELAY_FRAMES] >>> 0) >= ENTROPHON_DELAY_MAX_FRAMES) return false;
  return true;
}
