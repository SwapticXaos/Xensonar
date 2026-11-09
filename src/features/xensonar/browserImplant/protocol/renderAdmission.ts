import { TP, TD, TONE_WORDS } from './tonePlanRecord';
import { EP } from './entrophonVoiceRecord';

// Operator-work budgets, separate from transport capacity and kernel voice pools.
// A Direct partial costs oscillator + filter; an Entrophon body additionally
// owns two filters, drive, coefficient interpolation, and an optional delay.
// The two fixed class budgets leave the rest of the graph outside their claims.
export const DIRECT_RENDER_UNITS = 128;
export const ENTROPHON_RENDER_UNITS = 256;
export const ENTROPHON_MAX_UNITS_PER_BODY = 28;
export const RESERVATION_CAPACITY = 64;
export const MAX_RECORDS_PER_QUANTUM = 16;
export const LIVE_TRANSPORT_LEAD_FRAMES = 256;

export function renderUnitLimit(profile: number, sampleRate: number): number {
  return Math.max(1, Math.floor((profile === 1 ? ENTROPHON_RENDER_UNITS : DIRECT_RENDER_UNITS) * 48000 / sampleRate));
}
export function recordRenderUnits(words: Uint32Array): number {
  if ((words[0] & 255) === 1) return words[TP.TONE_COUNT] * 2;
  return 6 + 2 * (words[EP.BASE_COUNT] + words[EP.COLOR_COUNT]) + (words[EP.DELAY_FRAMES] ? 4 : 0);
}
export function recordVoiceCount(words: Uint32Array): number {
  return (words[0] & 255) === 1 ? words[TP.TONE_COUNT] : 1;
}
export function recordDuration(words: Uint32Array): number {
  if ((words[0] & 255) === 2) return words[EP.STOP_AFTER_FRAMES];
  let end = 0;
  for (let i = 0; i < words[TP.TONE_COUNT]; i++) {
    const base = TP.TONES + i * TONE_WORDS;
    end = Math.max(end, words[base + TD.DELAY_FRAMES] + words[base + TD.DURATION_FRAMES]);
  }
  return end;
}

/** Fixed reservation table: no timer-based expiry, allocation, or voice stealing.
 * Producer: release on rejection/end/fence from the consumer, never on wall time.
 * Consumer: release after the renderer has actually traversed the full lifetime.
 */
export class RenderReservations {
  readonly tokens = new Uint32Array(RESERVATION_CAPACITY);
  readonly units = new Uint32Array(RESERVATION_CAPACITY);
  readonly voices = new Uint32Array(RESERVATION_CAPACITY);
  readonly frames = new Float64Array(RESERVATION_CAPACITY);
  readonly ends = new Float64Array(RESERVATION_CAPACITY);
  readonly states = new Uint8Array(RESERVATION_CAPACITY);
  usedUnits = 0;
  usedVoices = 0;
  count = 0;
  constructor(readonly unitLimit: number, readonly voiceLimit: number) {}
  find(token: number): number {
    for (let i=0;i<RESERVATION_CAPACITY;i++) if(this.states[i] && this.tokens[i] === token) return i;
    return -1;
  }
  fits(units: number, voices: number): boolean {
    return Number.isInteger(units) && units > 0 && Number.isInteger(voices) && voices > 0 &&
      this.count < RESERVATION_CAPACITY && this.usedUnits + units <= this.unitLimit && this.usedVoices + voices <= this.voiceLimit;
  }
  reserve(token: number, units: number, voices: number, frame: number, end = Infinity): number {
    if (!token || this.find(token) >= 0 || !this.fits(units,voices)) return -1;
    for(let i=0;i<RESERVATION_CAPACITY;i++) if(!this.states[i]) {
      this.states[i]=1;this.tokens[i]=token;this.units[i]=units;this.voices[i]=voices;
      this.frames[i]=frame;this.ends[i]=end;this.usedUnits+=units;this.usedVoices+=voices;this.count++;
      return i;
    }
    return -1;
  }
  reduce(slot: number, units: number, voices: number): boolean {
    if(!this.states[slot] || units>this.units[slot] || voices>this.voices[slot])return false;
    this.usedUnits-=this.units[slot]-units;this.usedVoices-=this.voices[slot]-voices;
    this.units[slot]=units;this.voices[slot]=voices;return true;
  }
  release(slot: number): void {
    if(slot<0 || !this.states[slot])return;
    this.usedUnits-=this.units[slot];this.usedVoices-=this.voices[slot];this.count--;this.states[slot]=0;
  }
  clear(): void { this.states.fill(0);this.usedUnits=0;this.usedVoices=0;this.count=0; }
}
