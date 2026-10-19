const qRe=`/*
 * XRG — Xensonar Realtime Governor · AudioWorkletProcessor
 * ---------------------------------------------------------------------------
 * Socket B' : four-role ingress junction (main / drone / rhythm / space)
 *             + resident fixed-size player voice core (class B)
 *             + secondary lane (class C, first to be refused / stolen).
 *
 * Contract inside process():
 *   - no allocation, no closures, no strings/JSON, no logging
 *   - no postMessage — sole exceptions: one READY after the first quantum and
 *     one FAULT if the processor had to fall back to bed-only pass-through
 *   - every loop is bounded (ring drain, spawn, steal scan, voice render)
 *   - the block length is read from the output buffer; 128 is never assumed
 *   - bed stems are copied sample-exact (engage == 1): never delayed, never
 *     ducked, never gated by player load, never touched by panic
 *
 * \`XRG\` (ABI constants) is prepended by buildXrgWorkletSource() in xrgAbi.ts.
 */

const ABI = XRG.ABI | 0;
const ROLES = XRG.ROLES | 0;
const CAP = XRG.RING_CAPACITY | 0;
const MASK = CAP - 1;
const RW = XRG.RECORD_WORDS | 0;
const CTRL_WORDS = XRG.CTRL_WORDS | 0;

const R_META = XRG.R_META | 0, R_TOKEN = XRG.R_TOKEN | 0, R_EPOCH = XRG.R_EPOCH | 0, R_WALL = XRG.R_WALL | 0;
const R_FREQ = XRG.R_FREQ | 0, R_PEAK = XRG.R_PEAK | 0, R_PAN = XRG.R_PAN | 0, R_FLAGS = XRG.R_FLAGS | 0;
const OP_PLAYER = XRG.OP_PLAYER | 0, OP_SECONDARY = XRG.OP_SECONDARY | 0, OP_RELEASE = XRG.OP_RELEASE | 0;

const C_WRITE = XRG.C_WRITE | 0, C_READ = XRG.C_READ | 0, C_PANIC_EPOCH = XRG.C_PANIC_EPOCH | 0;
const C_ABI = XRG.C_ABI | 0, C_READY = XRG.C_READY | 0;
const T_QUANTA = XRG.T_QUANTA | 0, T_QUANTUM_FRAMES = XRG.T_QUANTUM_FRAMES | 0;
const T_SOUNDING = XRG.T_SOUNDING | 0, T_SOUNDING_PLAYER = XRG.T_SOUNDING_PLAYER | 0;
const T_SOUNDING_SECONDARY = XRG.T_SOUNDING_SECONDARY | 0, T_FADING = XRG.T_FADING | 0;
const T_FIRST_COUNTER = XRG.T_FIRST_COUNTER | 0, T_LAST_COUNTER = XRG.T_LAST_COUNTER | 0;
const T_ADMITTED = XRG.T_ADMITTED | 0, T_REJ_POOL = XRG.T_REJ_POOL | 0, T_REJ_STALE = XRG.T_REJ_STALE | 0;
const T_REJ_EPOCH = XRG.T_REJ_EPOCH | 0, T_REJ_BAD = XRG.T_REJ_BAD | 0, T_REJ_INACTIVE = XRG.T_REJ_INACTIVE | 0;
const T_SEC_ADMITTED = XRG.T_SEC_ADMITTED | 0, T_SEC_REJ = XRG.T_SEC_REJ | 0;
const T_TONES_ADMITTED = XRG.T_TONES_ADMITTED | 0, T_TONES_DETAIL_DROPPED = XRG.T_TONES_DETAIL_DROPPED | 0;
const T_STEAL_SECONDARY = XRG.T_STEAL_SECONDARY | 0, T_STEAL_TAIL = XRG.T_STEAL_TAIL | 0;
const T_STEAL_PARTIAL = XRG.T_STEAL_PARTIAL | 0, T_SPREAD_DEFERRALS = XRG.T_SPREAD_DEFERRALS | 0;
const T_AGE_MAX_MS = XRG.T_AGE_MAX_MS | 0, T_AGE_SUM_MS = XRG.T_AGE_SUM_MS | 0, T_AGE_COUNT = XRG.T_AGE_COUNT | 0;
const T_BED_SANITIZED = XRG.T_BED_SANITIZED | 0, T_PLAYER_SANITIZED = XRG.T_PLAYER_SANITIZED | 0;
const T_CTX_GAPS = XRG.T_CTX_GAPS | 0, T_WALL_GAP_MAX_MS = XRG.T_WALL_GAP_MAX_MS | 0, T_WALL_STALLS = XRG.T_WALL_STALLS | 0;
const T_RING_HIGH_WATER = XRG.T_RING_HIGH_WATER | 0, T_RELEASES = XRG.T_RELEASES | 0, T_PANICS = XRG.T_PANICS | 0;
const T_VOICES_FREED = XRG.T_VOICES_FREED | 0, T_PORT_REJECTS = XRG.T_PORT_REJECTS | 0;
const T_SOUNDING_MAX = XRG.T_SOUNDING_MAX | 0, T_FADING_MAX = XRG.T_FADING_MAX | 0;
const T_BED_PEAK_Q = XRG.T_BED_PEAK_Q | 0, T_PLAYER_PEAK_Q = XRG.T_PLAYER_PEAK_Q | 0, T_HEADROOM_Q = XRG.T_HEADROOM_Q | 0;
const T_REJ_SHED = XRG.T_REJ_SHED | 0;
const T_ENGAGE_Q = XRG.T_ENGAGE_Q | 0, T_EPOCH = XRG.T_EPOCH | 0, T_FAULTED = XRG.T_FAULTED | 0, T_LAST_AGE_MS = XRG.T_LAST_AGE_MS | 0;

const POOL = XRG.POOL_SIZE | 0;
const CAP_SOUNDING = XRG.CAP_SOUNDING | 0;
const MAX_ACTIONS = XRG.MAX_ACTIONS_PER_QUANTUM | 0;
const MAX_TONES_Q = XRG.MAX_TONES_PER_QUANTUM | 0;
const MAX_DRAIN = XRG.MAX_DRAIN_PER_QUANTUM | 0;
const SECONDARY_ADMIT = XRG.SECONDARY_ADMIT_SOUNDING | 0;
const SHED_AGE_MS = +XRG.SHED_AGE_MS;
const TAIL_ENV = +XRG.TAIL_STEAL_ENV;
const HOLD_MAX_S = +XRG.HOLD_MAX_S;
const SUSTAIN_TAU_S = +XRG.SUSTAIN_TAU_S;
const HR_W0 = +XRG.HEADROOM_W0, HR_ATK = +XRG.HEADROOM_ATTACK_S, HR_REL = +XRG.HEADROOM_RELEASE_S;
const BED_LIM = +XRG.BED_SANITY_LIMIT, PLAYER_LIM = +XRG.PLAYER_SANITY_LIMIT;
const WALL_STALL_MS = XRG.WALL_STALL_MS | 0;
const SCRATCH = XRG.SCRATCH_FRAMES | 0;

const MAX_TONES = XRG.MAX_TONES | 0, TONE_STRIDE = XRG.TONE_STRIDE | 0;
const P_FREQ_MUL = XRG.P_FREQ_MUL | 0, P_GAIN_MUL = XRG.P_GAIN_MUL | 0, P_CUTOFF = XRG.P_CUTOFF | 0, P_Q = XRG.P_Q | 0;
const P_DELAY = XRG.P_DELAY | 0, P_DUR = XRG.P_DUR | 0, P_WAVE = XRG.P_WAVE | 0, P_ATTACK = XRG.P_ATTACK | 0;
const P_SUSTAIN = XRG.P_SUSTAIN | 0, P_RELEASE = XRG.P_RELEASE | 0, P_PAN_SPREAD = XRG.P_PAN_SPREAD | 0;

const S_FREE = 0, S_WAIT = 1, S_RUN = 2, S_REL = 3, S_FADE = 4;
const ADMITTED = 1, REJECTED = 0, DEFER = -1;
const ENV_FLOOR = 1e-4; // -80 dB: a percussive voice below this is finished
const DENORM = 1e-15;

// Resident sine table (module evaluation = cold path, once per AudioWorkletGlobalScope).
const SINE_SIZE = 4096;
const SINE = new Float32Array(SINE_SIZE + 1);
for (let i = 0; i <= SINE_SIZE; i++) SINE[i] = Math.sin((2 * Math.PI * i) / SINE_SIZE);

class XrgGovernorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'engage', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'a-rate' }];
  }

  constructor(options) {
    super(options);
    const o = (options && options.processorOptions) || {};
    this.sr = o.sampleRate > 0 ? +o.sampleRate : typeof sampleRate === 'number' ? sampleRate : 48000;
    // Harness-only injection point; structured clone never carries functions in production.
    this.clock = typeof o.clock === 'function' ? o.clock : Date.now;
    this.q = 0;
    this.faulted = 0;
    this.faultReason = '';
    this.faultSent = false;
    this.readySent = false;
    this.testFaultAtQuantum = typeof o.testFaultAtQuantum === 'number' ? o.testFaultAtQuantum | 0 : -1;

    // ---- transport: SharedArrayBuffer ring (preferred) or local ring fed by the port
    this.shared = !!(o.controlBuffer && o.ringBuffer);
    this.ctrl = this.shared ? new Int32Array(o.controlBuffer) : new Int32Array(CTRL_WORDS);
    const ring = this.shared ? o.ringBuffer : new ArrayBuffer(CAP * RW * 4);
    this.ringI32 = new Int32Array(ring);
    this.ringF32 = new Float32Array(ring);
    if (!this.shared) this.ctrl[C_PANIC_EPOCH] = o.initialEpoch | 0 || 1;
    this.epoch = this.ld(C_PANIC_EPOCH) | 0;
    this.ctrl[C_ABI] = ABI;
    this.ctrl[T_EPOCH] = this.epoch;
    this.maxAgeMs = o.maxActionAgeMs > 0 ? +o.maxActionAgeMs : +XRG.MAX_ACTION_AGE_MS;

    // ---- resident preset table (already flattened + importance-sorted on the main thread)
    this.table = o.presetTable instanceof Float32Array ? o.presetTable : new Float32Array(TONE_STRIDE * MAX_TONES);
    this.toneCounts = o.toneCounts instanceof Int32Array ? o.toneCounts : new Int32Array(1);
    this.presetCount = Math.max(
      0,
      Math.min(o.presetCount | 0, this.toneCounts.length, (this.table.length / (TONE_STRIDE * MAX_TONES)) | 0),
    );
    if ((o.abi | 0) !== ABI) {
      this.faulted = 1;
      this.faultReason = 'abi-mismatch';
      this.ctrl[T_FAULTED] = 1;
    }

    this.stealFadeFrames = Math.max(8, Math.round((XRG.STEAL_FADE_MS * this.sr) / 1000));
    this.panicFadeFrames = Math.max(8, Math.round((XRG.PANIC_FADE_MS * this.sr) / 1000));

    // ---- voice pool, struct-of-arrays, allocated exactly once
    const P = POOL;
    this.vState = new Int8Array(P);
    this.vCls = new Int8Array(P);
    this.vRank = new Int8Array(P);
    this.vWave = new Int8Array(P);
    this.vAtk = new Int8Array(P);
    this.vToken = new Int32Array(P);
    this.vEpoch = new Int32Array(P);
    this.vDelay = new Int32Array(P);
    this.vAge = new Int32Array(P);
    this.vDur = new Int32Array(P);
    this.vRelFr = new Int32Array(P);
    this.vPhase = new Float64Array(P);
    this.vInc = new Float64Array(P);
    this.vEnv = new Float64Array(P);
    this.vAtkInc = new Float64Array(P);
    this.vDecMul = new Float64Array(P);
    this.vSus = new Float64Array(P);
    this.vRelDec = new Float64Array(P);
    this.vGain = new Float64Array(P);
    this.vPanL = new Float64Array(P);
    this.vPanR = new Float64Array(P);
    this.vA1 = new Float64Array(P);
    this.vA2 = new Float64Array(P);
    this.vA3 = new Float64Array(P);
    this.vIc1 = new Float64Array(P);
    this.vIc2 = new Float64Array(P);
    this.freeStack = new Int32Array(P);
    this.freeTop = 0;
    for (let v = P - 1; v >= 0; v--) this.freeStack[this.freeTop++] = v;
    this.sounding = 0;
    this.soundingPlayer = 0;
    this.soundingSecondary = 0;
    this.fading = 0;
    this.toneBudget = 0;

    this.vFilt = new Int8Array(P);
    this.osc = new Float32Array(SCRATCH);
    this.mixL = new Float32Array(SCRATCH);
    this.mixR = new Float32Array(SCRATCH);
    this.secL = new Float32Array(SCRATCH);
    this.secR = new Float32Array(SCRATCH);
    this.hg = 1;
    this.coefN = 0;
    this.atkC = 0;
    this.relC = 0;
    this.lastWall = 0;
    this.expectFrame = -1;
    this.bedPeak = 0;
    this.playerPeak = 0;

    // Cold control plane. Runs on the render thread *between* quanta, never inside process().
    this.port.onmessage = (e) => this.onPortMessage(e.data);
  }

  ld(i) {
    return this.shared ? Atomics.load(this.ctrl, i) : this.ctrl[i];
  }

  // ------------------------------------------------------------------ control plane
  onPortMessage(d) {
    if (d instanceof Int32Array) {
      // MessagePort fallback transport: copy records into the local bounded ring.
      const count = (d.length / RW) | 0;
      const ctrl = this.ctrl;
      for (let k = 0; k < count; k++) {
        const w = ctrl[C_WRITE] | 0;
        const r = ctrl[C_READ] | 0;
        if (((w - r) | 0) >= CAP) {
          ctrl[T_PORT_REJECTS]++;
          continue;
        }
        const off = (w & MASK) * RW;
        for (let j = 0; j < RW; j++) this.ringI32[off + j] = d[k * RW + j];
        ctrl[C_WRITE] = (w + 1) | 0;
      }
      return;
    }
    if (!d || typeof d !== 'object') return;
    if (d.type === 'PANIC') {
      if (!this.shared) this.ctrl[C_PANIC_EPOCH] = d.epoch | 0;
    } else if (d.type === 'SNAP') {
      this.port.postMessage({ type: 'SNAP', id: d.id | 0, tel: this.ctrl.slice(0, CTRL_WORDS) });
    } else if (d.type === 'RESET_STATS') {
      for (let i = T_FIRST_COUNTER; i <= T_LAST_COUNTER; i++) this.ctrl[i] = 0;
    }
  }

  // ------------------------------------------------------------------ render entry
  process(inputs, outputs, parameters) {
    if (this.faulted) {
      this.passthrough(inputs, outputs, parameters);
      this.reportFaultOnce();
      return true;
    }
    try {
      if (this.testFaultAtQuantum >= 0 && this.q === this.testFaultAtQuantum) throw new Error('xrg-test-fault');
      this.run(inputs, outputs, parameters);
    } catch (err) {
      // Fail-safe for the bed, fail-closed for the player lane.
      this.faulted = 1;
      this.ctrl[T_FAULTED] = 1;
      this.faultReason = err && err.message ? String(err.message) : 'unknown';
      this.passthrough(inputs, outputs, parameters);
      this.reportFaultOnce();
    }
    return true;
  }

  reportFaultOnce() {
    if (this.faultSent) return;
    this.faultSent = true;
    this.port.postMessage({ type: 'FAULT', reason: this.faultReason || 'fault' });
  }

  run(inputs, outputs, parameters) {
    const out0 = outputs[0];
    if (!out0 || out0.length === 0) return;
    const n = out0[0].length | 0;
    const ctrl = this.ctrl;
    this.q = (this.q + 1) | 0;
    ctrl[T_QUANTA] = this.q;
    ctrl[T_QUANTUM_FRAMES] = n;
    if (!this.readySent) {
      this.readySent = true;
      ctrl[C_READY] = 1;
      this.port.postMessage({ type: 'READY', frames: n, abi: ABI, shared: this.shared });
    }

    // Render-thread stall probe: wall-clock gap between consecutive callbacks.
    const now = this.clock();
    if (this.lastWall !== 0) {
      const gap = (now - this.lastWall) | 0;
      if (gap > ctrl[T_WALL_GAP_MAX_MS]) ctrl[T_WALL_GAP_MAX_MS] = gap;
      if (gap >= WALL_STALL_MS) ctrl[T_WALL_STALLS]++;
    }
    this.lastWall = now;
    if (typeof currentFrame === 'number') {
      if (this.expectFrame >= 0 && currentFrame !== this.expectFrame) ctrl[T_CTX_GAPS]++;
      this.expectFrame = currentFrame + n;
    }

    this.checkPanic();
    const eng = parameters.engage;
    const engConst = eng.length === 1;
    const e0 = eng[0];
    ctrl[T_ENGAGE_Q] = (e0 * 10000) | 0;
    this.drain(!(engConst && e0 <= 0), now);
    this.passthrough(inputs, outputs, parameters);
    if (this.sounding + this.fading > 0) this.renderVoices(outputs, n, eng, engConst, e0);
    else {
      this.hg = 1;
      this.playerPeak *= 0.995;
    }

    ctrl[T_SOUNDING] = this.sounding;
    ctrl[T_SOUNDING_PLAYER] = this.soundingPlayer;
    ctrl[T_SOUNDING_SECONDARY] = this.soundingSecondary;
    ctrl[T_FADING] = this.fading;
    if (this.sounding > ctrl[T_SOUNDING_MAX]) ctrl[T_SOUNDING_MAX] = this.sounding;
    if (this.fading > ctrl[T_FADING_MAX]) ctrl[T_FADING_MAX] = this.fading;
    ctrl[T_BED_PEAK_Q] = (this.bedPeak * 100000) | 0;
    ctrl[T_PLAYER_PEAK_Q] = (this.playerPeak * 100000) | 0;
    ctrl[T_HEADROOM_Q] = (this.hg * 10000) | 0;
  }

  // ------------------------------------------------------------------ ingress
  checkPanic() {
    const pe = this.ld(C_PANIC_EPOCH) | 0;
    if (pe === this.epoch) return;
    this.epoch = pe;
    for (let v = 0; v < POOL; v++) {
      const st = this.vState[v];
      if (st >= S_WAIT && st <= S_REL && this.vEpoch[v] !== pe) this.beginFade(v, this.panicFadeFrames);
    }
    this.ctrl[T_PANICS]++;
    this.ctrl[T_EPOCH] = pe;
  }

  drain(active, now) {
    const ctrl = this.ctrl;
    const I = this.ringI32;
    let r = this.ld(C_READ) | 0;
    const w = this.ld(C_WRITE) | 0;
    const depth = (w - r) | 0;
    if (depth <= 0) return;
    if (depth > ctrl[T_RING_HIGH_WATER]) ctrl[T_RING_HIGH_WATER] = depth;
    const now31 = now & 0x7fffffff;
    let examined = 0;
    let actions = 0;
    let deferred = false;
    this.toneBudget = MAX_TONES_Q;
    while (r !== w && examined < MAX_DRAIN) {
      const off = (r & MASK) * RW;
      examined++;
      const op = I[off + R_META] & 0xff;
      const recEpoch = I[off + R_EPOCH] | 0;
      if (recEpoch !== this.epoch) this.checkPanic(); // panic word may have landed after our first look
      if (recEpoch !== this.epoch) {
        ctrl[T_REJ_EPOCH]++;
        r = (r + 1) | 0;
        continue;
      }
      if (op === OP_RELEASE) {
        this.releaseToken(I[off + R_TOKEN] | 0);
        r = (r + 1) | 0;
        continue;
      }
      if (op !== OP_PLAYER && op !== OP_SECONDARY) {
        ctrl[T_REJ_BAD]++;
        r = (r + 1) | 0;
        continue;
      }
      let age = (now31 - (I[off + R_WALL] & 0x7fffffff)) | 0;
      if (age < 0) age = age > -2000 ? 0 : age & 0x7fffffff;
      if (age > this.maxAgeMs) {
        // "Now or never": a late gesture is dropped, never replayed.
        ctrl[op === OP_PLAYER ? T_REJ_STALE : T_SEC_REJ]++;
        r = (r + 1) | 0;
        continue;
      }
      if (!active) {
        ctrl[T_REJ_INACTIVE]++;
        r = (r + 1) | 0;
        continue;
      }
      // Newest-first under overload: if more is pending than this quantum can admit,
      // an already-late record yields to fresher ones instead of being served in FIFO order.
      if (age > SHED_AGE_MS && ((w - r) | 0) > MAX_ACTIONS - actions) {
        ctrl[op === OP_PLAYER ? T_REJ_SHED : T_SEC_REJ]++;
        r = (r + 1) | 0;
        continue;
      }
      if (actions >= MAX_ACTIONS) {
        deferred = true; // micro-spread: next quantum, still bounded by the age check
        break;
      }
      const res = this.spawn(op, off, actions);
      if (res === DEFER) {
        deferred = true;
        break;
      }
      if (res === ADMITTED && op === OP_PLAYER) {
        if (age > ctrl[T_AGE_MAX_MS]) ctrl[T_AGE_MAX_MS] = age;
        ctrl[T_AGE_SUM_MS] += age;
        ctrl[T_AGE_COUNT]++;
        ctrl[T_LAST_AGE_MS] = age;
      }
      actions++;
      r = (r + 1) | 0;
    }
    if (this.shared) Atomics.store(ctrl, C_READ, r);
    else ctrl[C_READ] = r;
    if (deferred) ctrl[T_SPREAD_DEFERRALS]++;
  }

  spawn(op, off, actionsSoFar) {
    const ctrl = this.ctrl;
    const I = this.ringI32;
    const F = this.ringF32;
    const cls = op === OP_PLAYER ? 1 : 2;
    const preset = (I[off + R_META] >>> 16) & 0xffff;
    const freq = F[off + R_FREQ];
    const peak = F[off + R_PEAK];
    let pan = F[off + R_PAN];
    const flags = I[off + R_FLAGS] | 0;
    if (preset >= this.presetCount || !(freq >= 10 && freq <= 20000) || !(peak > 0 && peak <= 2)) {
      ctrl[T_REJ_BAD]++;
      return REJECTED;
    }
    if (!(pan >= -1 && pan <= 1)) pan = 0;
    let want = this.toneCounts[preset] | 0;
    const maxTones = (flags >>> 8) & 0xff;
    if (maxTones > 0 && maxTones < want) want = maxTones;
    if (want <= 0) {
      ctrl[T_REJ_BAD]++;
      return REJECTED;
    }
    if (cls === 2 && this.sounding >= SECONDARY_ADMIT) {
      ctrl[T_SEC_REJ]++;
      return REJECTED;
    }
    if (this.toneBudget < want && actionsSoFar > 0) return DEFER;
    const hold = (flags >>> 16) & 1;
    const token = I[off + R_TOKEN] | 0;
    let admitted = 0;
    // Tones are importance-ordered: under pressure the least important partials go first.
    for (let j = 0; j < want && this.toneBudget > 0; j++) {
      const slot = this.allocSlot(cls, j);
      if (slot < 0) break;
      this.initVoice(slot, cls, preset, j, token, freq, peak, pan, hold);
      admitted++;
      this.toneBudget--;
    }
    if (admitted === 0) {
      ctrl[cls === 1 ? T_REJ_POOL : T_SEC_REJ]++;
      return REJECTED;
    }
    ctrl[T_TONES_ADMITTED] += admitted;
    if (admitted < want) ctrl[T_TONES_DETAIL_DROPPED] += want - admitted;
    ctrl[cls === 1 ? T_ADMITTED : T_SEC_ADMITTED]++;
    return ADMITTED;
  }

  /**
   * Explicit steal rule (same or lower priority only):
   *   secondary (any)  >  quiet/releasing player tail (env < -12 dB)  >
   *   older player partial (rank > 0) — only for a new fundamental.
   * Fundamentals of sounding player actions are never stolen by new actions.
   */
  allocSlot(cls, rank) {
    if (this.sounding < CAP_SOUNDING) return this.freeTop > 0 ? this.freeStack[--this.freeTop] : -1;
    let best = -1;
    let bestScore = -1;
    const sr = this.sr;
    for (let v = 0; v < POOL; v++) {
      const st = this.vState[v];
      if (st === S_FREE || st === S_FADE) continue;
      const env = this.vEnv[v];
      let score;
      if (this.vCls[v] === 2) score = 3000 + (1 - env) * 100;
      else {
        if (cls === 2) continue;
        if (st === S_REL || st === S_WAIT || env < TAIL_ENV) score = 2000 + (1 - env) * 100;
        else if (rank === 0 && this.vRank[v] > 0) {
          const ageS = this.vAge[v] / sr;
          score = 1000 + this.vRank[v] * 10 + (ageS < 4 ? ageS : 4) * 5;
        } else continue;
      }
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    if (best < 0 || this.freeTop === 0) return -1;
    if (bestScore >= 3000) this.ctrl[T_STEAL_SECONDARY]++;
    else if (bestScore >= 2000) this.ctrl[T_STEAL_TAIL]++;
    else this.ctrl[T_STEAL_PARTIAL]++;
    this.beginFade(best, this.stealFadeFrames);
    return this.freeStack[--this.freeTop];
  }

  initVoice(v, cls, preset, rank, token, freq, peak, pan, hold) {
    const T = this.table;
    const b = (preset * MAX_TONES + rank) * TONE_STRIDE;
    const sr = this.sr;
    const nyq = sr * 0.45;
    let f = freq * T[b + P_FREQ_MUL];
    if (f > nyq) f = nyq;
    if (f < 5) f = 5;
    let cutoff = T[b + P_CUTOFF];
    if (!(cutoff > 20)) cutoff = 20;
    if (cutoff > nyq) cutoff = nyq;
    const q = T[b + P_Q] > 0.3 ? T[b + P_Q] : 0.3;
    const sus = T[b + P_SUSTAIN] > 0 ? T[b + P_SUSTAIN] : 0;
    const atkFr = Math.max(1, Math.round(T[b + P_ATTACK] * sr));
    const relFr = Math.max(16, Math.round(T[b + P_RELEASE] * sr));
    let durFr = Math.max(atkFr + relFr + 1, Math.round(T[b + P_DUR] * sr));
    if (hold && sus > 0) durFr = Math.max(durFr, Math.round(HOLD_MAX_S * sr));
    const delayFr = Math.max(0, Math.round(T[b + P_DELAY] * sr));
    const decMul =
      sus > 0 ? Math.exp(-1 / (sr * SUSTAIN_TAU_S)) : Math.exp(Math.log(0.001) / Math.max(1, durFr - atkFr));
    // TPT state-variable low-pass, coefficients fixed per voice (computed once, here).
    const g = Math.tan((Math.PI * cutoff) / sr);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const wave = T[b + P_WAVE] | 0;
    // Filter bypass where the low-pass is provably inaudible: pure sine far below a
    // non-resonant cutoff (|H| > -0.07 dB), or cutoff at the top of the band.
    const filtered = !((wave === 0 && q <= 1 && f < cutoff * 0.35) || cutoff >= nyq * 0.98);
    let p = pan;
    if (rank > 0) p += (rank & 1 ? 1 : -1) * T[b + P_PAN_SPREAD];
    if (p < -1) p = -1;
    else if (p > 1) p = 1;
    const ang = (p + 1) * 0.25 * Math.PI;

    this.vState[v] = delayFr > 0 ? S_WAIT : S_RUN;
    this.vCls[v] = cls;
    this.vRank[v] = rank;
    this.vWave[v] = wave;
    this.vFilt[v] = filtered ? 1 : 0;
    this.vAtk[v] = 1;
    this.vToken[v] = token;
    this.vEpoch[v] = this.epoch;
    this.vDelay[v] = delayFr;
    this.vAge[v] = 0;
    this.vDur[v] = durFr;
    this.vRelFr[v] = relFr;
    this.vPhase[v] = 0;
    this.vInc[v] = f / sr;
    this.vEnv[v] = 0;
    this.vAtkInc[v] = 1 / atkFr;
    this.vDecMul[v] = decMul;
    this.vSus[v] = sus;
    this.vRelDec[v] = 0;
    this.vGain[v] = peak * T[b + P_GAIN_MUL];
    this.vPanL[v] = Math.cos(ang);
    this.vPanR[v] = Math.sin(ang);
    this.vA1[v] = a1;
    this.vA2[v] = g * a1;
    this.vA3[v] = g * g * a1;
    this.vIc1[v] = 0;
    this.vIc2[v] = 0;
    this.sounding++;
    if (cls === 1) this.soundingPlayer++;
    else this.soundingSecondary++;
  }

  beginFade(v, frames) {
    const st = this.vState[v];
    if (st === S_FREE || st === S_FADE) return;
    this.sounding--;
    if (this.vCls[v] === 1) this.soundingPlayer--;
    else this.soundingSecondary--;
    if (st === S_WAIT || this.vEnv[v] <= 0) {
      this.vState[v] = S_FREE;
      this.freeStack[this.freeTop++] = v;
      this.ctrl[T_VOICES_FREED]++;
      return;
    }
    this.vState[v] = S_FADE;
    this.vRelDec[v] = this.vEnv[v] / frames;
    this.fading++;
  }

  endVoice(v, st) {
    if (st === S_FADE) this.fading--;
    else {
      this.sounding--;
      if (this.vCls[v] === 1) this.soundingPlayer--;
      else this.soundingSecondary--;
    }
    this.vState[v] = S_FREE;
    this.freeStack[this.freeTop++] = v;
    this.ctrl[T_VOICES_FREED]++;
  }

  releaseToken(token) {
    let hit = 0;
    for (let v = 0; v < POOL; v++) {
      if (this.vToken[v] !== token || this.vSus[v] <= 0) continue;
      const st = this.vState[v];
      if (st === S_WAIT) {
        this.endVoice(v, S_WAIT);
        hit++;
      } else if (st === S_RUN) {
        this.vState[v] = S_REL;
        this.vRelDec[v] = this.vEnv[v] / this.vRelFr[v];
        hit++;
      }
    }
    if (hit) this.ctrl[T_RELEASES]++;
  }

  // ------------------------------------------------------------------ bed junction
  passthrough(inputs, outputs, parameters) {
    const eng = parameters.engage;
    const engConst = eng.length === 1;
    const e0 = eng[0];
    let peak = this.bedPeak * 0.995;
    let bad = 0;
    for (let r = 0; r < ROLES; r++) {
      const out = outputs[r];
      if (!out || out.length === 0) continue;
      const inp = inputs[r];
      const silent = !inp || inp.length === 0 || (engConst && e0 <= 0);
      for (let c = 0; c < out.length && c < 2; c++) {
        const o = out[c];
        const n = o.length;
        if (silent) {
          o.fill(0);
          continue;
        }
        const x = c < inp.length ? inp[c] : inp[0];
        if (engConst && e0 >= 1) {
          for (let i = 0; i < n; i++) {
            const s = x[i];
            if (s === s && s <= BED_LIM && s >= -BED_LIM) {
              o[i] = s;
              const a = s < 0 ? -s : s;
              if (a > peak) peak = a;
            } else {
              o[i] = 0;
              bad++;
            }
          }
        } else {
          for (let i = 0; i < n; i++) {
            const s = x[i];
            if (s === s && s <= BED_LIM && s >= -BED_LIM) {
              const y = s * (engConst ? e0 : eng[i]);
              o[i] = y;
              const a = y < 0 ? -y : y;
              if (a > peak) peak = a;
            } else {
              o[i] = 0;
              bad++;
            }
          }
        }
      }
    }
    this.bedPeak = peak;
    if (bad) this.ctrl[T_BED_SANITIZED] += bad;
  }

  // ------------------------------------------------------------------ voice core
  renderVoices(outputs, n, eng, engConst, e0) {
    const out0 = outputs[0];
    const out3 = outputs[3] && outputs[3].length ? outputs[3] : out0;
    const pL = out0[0];
    const pR = out0.length > 1 ? out0[1] : null;
    const sL = out3[0];
    const sR = out3.length > 1 ? out3[1] : null;
    const mixL = this.mixL, mixR = this.mixR, secL = this.secL, secR = this.secR;
    let peak = this.playerPeak * 0.995;
    let bad = 0;
    let off = 0;
    while (off < n) {
      const cn = n - off < SCRATCH ? n - off : SCRATCH;
      mixL.fill(0, 0, cn);
      mixR.fill(0, 0, cn);
      secL.fill(0, 0, cn);
      secR.fill(0, 0, cn);
      let w = 0;
      for (let v = 0; v < POOL; v++) if (this.vState[v] >= S_RUN) w += this.vGain[v] * this.vEnv[v];
      for (let v = 0; v < POOL; v++) if (this.vState[v] !== S_FREE) this.renderVoice(v, cn);

      // Density-aware headroom: many simultaneous voices get quieter-denser instead of
      // slamming the master limiter (which would duck the protected bed).
      if (cn !== this.coefN) {
        this.coefN = cn;
        this.atkC = 1 - Math.exp(-cn / (this.sr * HR_ATK));
        this.relC = 1 - Math.exp(-cn / (this.sr * HR_REL));
      }
      const target = w > HR_W0 ? Math.sqrt(HR_W0 / w) : 1;
      const g0 = this.hg;
      const g1 = g0 + (target - g0) * (target < g0 ? this.atkC : this.relC);
      this.hg = g1;
      const dg = (g1 - g0) / cn;
      let g = g0;
      for (let i = 0; i < cn; i++) {
        g += dg;
        const ge = g * (engConst ? e0 : eng[off + i]);
        let l = mixL[i] * ge;
        let rr = mixR[i] * ge;
        const zl = secL[i] * ge;
        const zr = secR[i] * ge;
        if (!(l === l && l <= PLAYER_LIM && l >= -PLAYER_LIM)) { l = 0; bad++; }
        if (!(rr === rr && rr <= PLAYER_LIM && rr >= -PLAYER_LIM)) { rr = 0; bad++; }
        pL[off + i] += l;
        if (pR) pR[off + i] += rr;
        if (zl === zl && zr === zr) {
          sL[off + i] += zl;
          if (sR) sR[off + i] += zr;
        }
        const a = l < 0 ? -l : l;
        if (a > peak) peak = a;
      }
      off += cn;
    }
    this.playerPeak = peak;
    if (bad) this.ctrl[T_PLAYER_SANITIZED] += bad;
  }

  renderVoice(v, cn) {
    let st = this.vState[v];
    let i0 = 0;
    if (st === S_WAIT) {
      const d = this.vDelay[v];
      if (d >= cn) {
        this.vDelay[v] = d - cn;
        return;
      }
      i0 = d;
      this.vDelay[v] = 0;
      st = S_RUN;
    }
    // ---- pass 1: oscillator, one branch-free loop per waveform (PolyBLEP for edges)
    const osc = this.osc;
    const inc = this.vInc[v];
    let phase = this.vPhase[v];
    const wave = this.vWave[v];
    if (wave === 0) {
      for (let i = i0; i < cn; i++) {
        const x = phase * SINE_SIZE;
        const k = x | 0;
        osc[i] = SINE[k] + (SINE[k + 1] - SINE[k]) * (x - k);
        phase += inc;
        if (phase >= 1) phase -= 1;
      }
    } else if (wave === 2) {
      for (let i = i0; i < cn; i++) {
        let s = 2 * phase - 1;
        if (phase < inc) {
          const t = phase / inc;
          s -= t + t - t * t - 1;
        } else if (phase > 1 - inc) {
          const t = (phase - 1) / inc;
          s -= t * t + t + t + 1;
        }
        osc[i] = s;
        phase += inc;
        if (phase >= 1) phase -= 1;
      }
    } else if (wave === 3) {
      for (let i = i0; i < cn; i++) {
        let s = phase < 0.5 ? 1 : -1;
        if (phase < inc) {
          const t = phase / inc;
          s += t + t - t * t - 1;
        } else if (phase > 1 - inc) {
          const t = (phase - 1) / inc;
          s += t * t + t + t + 1;
        }
        let p2 = phase + 0.5;
        if (p2 >= 1) p2 -= 1;
        if (p2 < inc) {
          const t = p2 / inc;
          s -= t + t - t * t - 1;
        } else if (p2 > 1 - inc) {
          const t = (p2 - 1) / inc;
          s -= t * t + t + t + 1;
        }
        osc[i] = s;
        phase += inc;
        if (phase >= 1) phase -= 1;
      }
    } else {
      for (let i = i0; i < cn; i++) {
        osc[i] = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
        phase += inc;
        if (phase >= 1) phase -= 1;
      }
    }
    // ---- pass 2: envelope (+ TPT-SVF low-pass unless bypassed) + constant-power pan mix
    const L = this.vCls[v] === 1 ? this.mixL : this.secL;
    const R = this.vCls[v] === 1 ? this.mixR : this.secR;
    let env = this.vEnv[v];
    let atk = this.vAtk[v];
    const atkInc = this.vAtkInc[v];
    const decMul = this.vDecMul[v];
    const sus = this.vSus[v];
    let relDec = this.vRelDec[v];
    let age = this.vAge[v];
    const relFr = this.vRelFr[v];
    const relStart = this.vDur[v] - relFr;
    const gl = this.vPanL[v] * this.vGain[v];
    const gr = this.vPanR[v] * this.vGain[v];
    let ended = false;
    let i = i0;
    if (this.vFilt[v] === 1) {
      const a1 = this.vA1[v], a2 = this.vA2[v], a3 = this.vA3[v];
      let ic1 = this.vIc1[v], ic2 = this.vIc2[v];
      for (; i < cn; i++) {
        if (st === S_RUN) {
          if (atk === 1) {
            env += atkInc;
            if (env >= 1) { env = 1; atk = 0; }
          } else {
            env = sus + (env - sus) * decMul;
            if (sus === 0 && env < ENV_FLOOR) { ended = true; break; }
          }
          if (age >= relStart) { st = S_REL; relDec = env / relFr; }
        } else {
          env -= relDec;
          if (env <= 0) { env = 0; ended = true; break; }
        }
        age++;
        const v3 = osc[i] - ic2;
        const v1 = a1 * ic1 + a2 * v3;
        const v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2 * v1 - ic1;
        ic2 = 2 * v2 - ic2;
        const y = v2 * env;
        L[i] += y * gl;
        R[i] += y * gr;
      }
      if (ic1 < DENORM && ic1 > -DENORM) ic1 = 0;
      if (ic2 < DENORM && ic2 > -DENORM) ic2 = 0;
      this.vIc1[v] = ic1;
      this.vIc2[v] = ic2;
    } else {
      for (; i < cn; i++) {
        if (st === S_RUN) {
          if (atk === 1) {
            env += atkInc;
            if (env >= 1) { env = 1; atk = 0; }
          } else {
            env = sus + (env - sus) * decMul;
            if (sus === 0 && env < ENV_FLOOR) { ended = true; break; }
          }
          if (age >= relStart) { st = S_REL; relDec = env / relFr; }
        } else {
          env -= relDec;
          if (env <= 0) { env = 0; ended = true; break; }
        }
        age++;
        const y = osc[i] * env;
        L[i] += y * gl;
        R[i] += y * gr;
      }
    }
    if (ended) {
      this.endVoice(v, st);
      return;
    }
    this.vState[v] = st;
    this.vPhase[v] = phase;
    this.vEnv[v] = env;
    this.vAtk[v] = atk;
    this.vRelDec[v] = relDec;
    this.vAge[v] = age;
  }
}

registerProcessor(XRG.PROCESSOR_NAME, XrgGovernorProcessor);
`,yd=["main","drone","rhythm","space"],$e={ABI:1,PROCESSOR_NAME:"xrg-governor-v1",ROLES:4,RING_CAPACITY:128,RECORD_WORDS:8,R_META:0,R_TOKEN:1,R_EPOCH:2,R_WALL:3,R_FREQ:4,R_PEAK:5,R_PAN:6,R_FLAGS:7,OP_PLAYER:1,OP_SECONDARY:2,OP_RELEASE:3,CTRL_WORDS:64,C_WRITE:0,C_READ:1,C_PANIC_EPOCH:2,C_ABI:3,C_READY:4,T_QUANTA:5,T_QUANTUM_FRAMES:6,T_SOUNDING:7,T_SOUNDING_PLAYER:8,T_SOUNDING_SECONDARY:9,T_FADING:10,T_FIRST_COUNTER:11,T_ADMITTED:11,T_REJ_POOL:12,T_REJ_STALE:13,T_REJ_EPOCH:14,T_REJ_BAD:15,T_REJ_INACTIVE:16,T_SEC_ADMITTED:17,T_SEC_REJ:18,T_TONES_ADMITTED:19,T_TONES_DETAIL_DROPPED:20,T_STEAL_SECONDARY:21,T_STEAL_TAIL:22,T_STEAL_PARTIAL:23,T_SPREAD_DEFERRALS:24,T_AGE_MAX_MS:25,T_AGE_SUM_MS:26,T_AGE_COUNT:27,T_BED_SANITIZED:28,T_PLAYER_SANITIZED:29,T_CTX_GAPS:30,T_WALL_GAP_MAX_MS:31,T_WALL_STALLS:32,T_RING_HIGH_WATER:33,T_RELEASES:34,T_PANICS:35,T_VOICES_FREED:36,T_PORT_REJECTS:37,T_SOUNDING_MAX:38,T_FADING_MAX:39,T_REJ_SHED:40,T_LAST_COUNTER:40,T_BED_PEAK_Q:48,T_PLAYER_PEAK_Q:49,T_HEADROOM_Q:50,T_ENGAGE_Q:51,T_EPOCH:52,T_FAULTED:53,T_LAST_AGE_MS:54,CAP_SOUNDING:64,FADE_RESERVE:24,POOL_SIZE:88,MAX_ACTIONS_PER_QUANTUM:8,MAX_TONES_PER_QUANTUM:48,MAX_DRAIN_PER_QUANTUM:64,MAX_ACTION_AGE_MS:40,SHED_AGE_MS:8,SECONDARY_ADMIT_SOUNDING:40,TAIL_STEAL_ENV:.25,STEAL_FADE_MS:4,PANIC_FADE_MS:12,HOLD_MAX_S:8,SUSTAIN_TAU_S:.08,HEADROOM_W0:2,HEADROOM_ATTACK_S:.008,HEADROOM_RELEASE_S:.2,BED_SANITY_LIMIT:16,PLAYER_SANITY_LIMIT:8,WALL_STALL_MS:20,SCRATCH_FRAMES:1024,MAX_PRESETS:64,MAX_TONES:8,TONE_STRIDE:12,P_FREQ_MUL:0,P_GAIN_MUL:1,P_CUTOFF:2,P_Q:3,P_DELAY:4,P_DUR:5,P_WAVE:6,P_ATTACK:7,P_SUSTAIN:8,P_RELEASE:9,P_RANK:10,P_PAN_SPREAD:11},Q8=.06,U8=.012,QRe=250,Ul={STATE:-1,STALE:-2,FULL:-3,BAD:-4},rE={DIRECT:1,GLISS:2};function URe(){return`const XRG = Object.freeze(${JSON.stringify($e)});
`}function KRe(e){return`${URe()}
${e}`}function $Re(){return typeof SharedArrayBuffer<"u"&&globalThis.crossOriginIsolated===!0}function XRe(e){const t=$e.CTRL_WORDS*4,n=$e.RING_CAPACITY*$e.RECORD_WORDS*4;return{shared:!0,control:new SharedArrayBuffer(t),ring:new SharedArrayBuffer(n)}}function YRe(e,t){return e&255|(t&65535)<<16|0}function JRe(e,t,n){return e&255|(t&255)<<8|(n?65536:0)|0}function ZRe(e){return Math.floor(e)&2147483647}function P9(e,t,n,r){e[n+$e.R_META]=YRe(r.op,r.preset),e[n+$e.R_TOKEN]=r.token|0,e[n+$e.R_EPOCH]=r.epoch|0,e[n+$e.R_WALL]=ZRe(r.wallMs),t[n+$e.R_FREQ]=r.freq,t[n+$e.R_PEAK]=r.peak,t[n+$e.R_PAN]=r.pan,e[n+$e.R_FLAGS]=r.flags|0}class eCe{ctrl;i32;f32;shared;highWater=0;constructor(t){this.shared=t.shared,this.ctrl=new Int32Array(t.control),this.i32=new Int32Array(t.ring),this.f32=new Float32Array(t.ring)}load(t){return this.shared?Atomics.load(this.ctrl,t):this.ctrl[t]}depth(){return this.load($e.C_WRITE)-this.load($e.C_READ)|0}write(t){const n=this.load($e.C_WRITE)|0,r=this.load($e.C_READ)|0,a=n-r|0;return a>=$e.RING_CAPACITY?!1:(P9(this.i32,this.f32,(n&$e.RING_CAPACITY-1)*$e.RECORD_WORDS,t),this.shared?Atomics.store(this.ctrl,$e.C_WRITE,n+1|0):this.ctrl[$e.C_WRITE]=n+1|0,a+1>this.highWater&&(this.highWater=a+1),!0)}setPanicEpoch(t){this.shared?Atomics.store(this.ctrl,$e.C_PANIC_EPOCH,t|0):this.ctrl[$e.C_PANIC_EPOCH]=t|0}}function tCe(e){const t=e[$e.T_AGE_COUNT];return{ready:e[$e.C_READY]===1,quanta:e[$e.T_QUANTA],quantumFrames:e[$e.T_QUANTUM_FRAMES],sounding:e[$e.T_SOUNDING],soundingPlayer:e[$e.T_SOUNDING_PLAYER],soundingSecondary:e[$e.T_SOUNDING_SECONDARY],fading:e[$e.T_FADING],soundingMax:e[$e.T_SOUNDING_MAX],fadingMax:e[$e.T_FADING_MAX],admitted:e[$e.T_ADMITTED],rejPool:e[$e.T_REJ_POOL],rejStale:e[$e.T_REJ_STALE],rejShed:e[$e.T_REJ_SHED],rejEpoch:e[$e.T_REJ_EPOCH],rejBad:e[$e.T_REJ_BAD],rejInactive:e[$e.T_REJ_INACTIVE],secAdmitted:e[$e.T_SEC_ADMITTED],secRejected:e[$e.T_SEC_REJ],tonesAdmitted:e[$e.T_TONES_ADMITTED],tonesDetailDropped:e[$e.T_TONES_DETAIL_DROPPED],stealSecondary:e[$e.T_STEAL_SECONDARY],stealTail:e[$e.T_STEAL_TAIL],stealPartial:e[$e.T_STEAL_PARTIAL],spreadDeferrals:e[$e.T_SPREAD_DEFERRALS],ageMaxMs:e[$e.T_AGE_MAX_MS],ageAvgMs:t?e[$e.T_AGE_SUM_MS]/t:0,lastAgeMs:e[$e.T_LAST_AGE_MS],bedSanitized:e[$e.T_BED_SANITIZED],playerSanitized:e[$e.T_PLAYER_SANITIZED],ctxGaps:e[$e.T_CTX_GAPS],wallGapMaxMs:e[$e.T_WALL_GAP_MAX_MS],wallStalls:e[$e.T_WALL_STALLS],ringHighWater:e[$e.T_RING_HIGH_WATER],releases:e[$e.T_RELEASES],panics:e[$e.T_PANICS],portRejects:e[$e.T_PORT_REJECTS],bedPeak:e[$e.T_BED_PEAK_Q]/1e5,playerPeak:e[$e.T_PLAYER_PEAK_Q]/1e5,headroom:e[$e.T_HEADROOM_Q]/1e4,engage:e[$e.T_ENGAGE_Q]/1e4,epoch:e[$e.T_EPOCH],faulted:e[$e.T_FAULTED]===1}}const dk=new WeakMap,Bf=new WeakMap;function nCe(e){let t=dk.get(e);return t||(t=(async()=>{if(!e.audioWorklet)throw new Error("audio-worklet-required");const n=KRe(qRe),r=[],a=typeof location<"u"&&location.protocol==="file:";if(a)try{await e.audioWorklet.addModule(`data:application/javascript;charset=utf-8,${encodeURIComponent(n)}`);return}catch(o){r.push(`data:${o instanceof Error?o.message:String(o)}`)}if(typeof Blob<"u"&&typeof URL<"u"&&typeof URL.createObjectURL=="function"){const o=URL.createObjectURL(new Blob([n],{type:"text/javascript"}));try{await e.audioWorklet.addModule(o);return}catch(i){r.push(`blob:${i instanceof Error?i.message:String(i)}`)}finally{URL.revokeObjectURL(o)}}if(!a)try{await e.audioWorklet.addModule(`data:application/javascript;charset=utf-8,${encodeURIComponent(n)}`);return}catch(o){r.push(`data:${o instanceof Error?o.message:String(o)}`)}throw new Error(`xrg-worklet-load-failed (${r.join(" | ")||"no-supported-module-path"})`)})(),dk.set(e,t),t.catch(()=>dk.delete(e))),t}function rCe(e,t,n){return new AudioWorkletNode(e,$e.PROCESSOR_NAME,{numberOfInputs:$e.ROLES,numberOfOutputs:$e.ROLES,outputChannelCount:[2,2,2,2],channelCount:2,channelCountMode:"explicit",channelInterpretation:"speakers",parameterData:{engage:0},processorOptions:{abi:$e.ABI,sampleRate:e.sampleRate,controlBuffer:n.buffers?.control,ringBuffer:n.buffers?.ring,presetTable:t.table,toneCounts:t.toneCounts,presetCount:t.count,maxActionAgeMs:n.maxActionAgeMs,initialEpoch:n.initialEpoch}})}function Df(e,t,n){e.cancelScheduledValues(0),e.setValueAtTime(t,n.currentTime)}function K8(e,t,n){return new Promise(r=>{const a=()=>{if(!n()||e.state==="closed")return r(!1);if(e.currentTime>=t)return r(!0);setTimeout(a,15)};a()})}class RL{static async create(t,n){const r=Bf.get(t);if(r&&r.state!=="disposed")throw new Error("xrg-owner-exists");if(await nCe(t),n.signal?.aborted)throw new Error("xrg-create-aborted");const a=Bf.get(t);if(a&&a.state!=="disposed")throw new Error("xrg-owner-exists");const o=new RL(t,n);return Bf.set(t,o),o}static current(t){const n=Bf.get(t);return n&&n.state!=="disposed"?n:null}ctx;node;transport;presets;maxActionAgeMs;state="idle";generation=0;epoch=1;faultReason=null;quantumFrames=0;lastIngressAgeMs=0;externalLoad=0;ingress={accepted:0,rejectedState:0,rejectedStale:0,rejectedFull:0,rejectedBad:0};secondaryGate={admitted:0,refused:0};onStateChange=null;buffers;writer;ctrlView;tel=new Int32Array($e.CTRL_WORDS);junction=null;chain=Promise.resolve();tokenSeq=0;readySeen=!1;readyWaiters=[];lastSnapAt=0;snapSeq=0;constructor(t,n){this.ctx=t,this.presets=n.presets,this.maxActionAgeMs=n.maxActionAgeMs??$e.MAX_ACTION_AGE_MS;const r=$Re();if(n.transport==="sab"&&!r)throw new Error("xrg-sab-requires-cross-origin-isolation");this.transport=n.transport==="port"||!r?"port":"sab",this.buffers=this.transport==="sab"?XRe():null,this.ctrlView=this.buffers?new Int32Array(this.buffers.control):null,this.ctrlView&&(this.ctrlView[$e.C_PANIC_EPOCH]=this.epoch),this.writer=this.buffers?new eCe(this.buffers):null,this.node=rCe(t,n.presets,{buffers:this.buffers,maxActionAgeMs:this.maxActionAgeMs,initialEpoch:this.epoch}),this.node.port.onmessage=a=>this.onMessage(a.data),this.node.onprocessorerror=()=>this.emergencyBypass("processorerror")}playerAction(t){return this.push($e.OP_PLAYER,t)}secondaryAction(t){return this.push($e.OP_SECONDARY,t)}release(t){t<=0||this.state!=="engaged"||this.send({op:$e.OP_RELEASE,preset:0,token:t,epoch:this.epoch,wallMs:Date.now(),freq:0,peak:0,pan:0,flags:0})}push(t,n){if(this.state!=="engaged")return this.ingress.rejectedState++,Ul.STATE;if(!(n.preset>=0&&n.preset<this.presets.count)||!(n.frequencyHz>0)||!(n.peak>0))return this.ingress.rejectedBad++,Ul.BAD;const r=n.eventTimeStamp!==void 0?Math.max(0,performance.now()-n.eventTimeStamp):0;if(r>this.maxActionAgeMs)return this.ingress.rejectedStale++,Ul.STALE;const a=this.tokenSeq=this.tokenSeq%2147483646+1;return this.send({op:t,preset:n.preset,token:a,epoch:this.epoch,wallMs:Date.now()-r,freq:n.frequencyHz,peak:Math.min(2,n.peak),pan:Math.max(-1,Math.min(1,n.pan??0)),flags:JRe(n.gesture??rE.DIRECT,n.maxTones??0,!!n.hold)})?(this.ingress.accepted++,this.lastIngressAgeMs=r,a):(this.ingress.rejectedFull++,Ul.FULL)}send(t){if(this.writer)return this.writer.write(t);const n=new Int32Array($e.RECORD_WORDS);return P9(n,new Float32Array(n.buffer),0,t),this.node.port.postMessage(n,[n.buffer]),!0}panic(){return this.epoch=this.epoch%2147483646+1,this.writer?this.writer.setPanicEpoch(this.epoch):this.node.port.postMessage({type:"PANIC",epoch:this.epoch}),this.epoch}pressure(){const t=this.ctrlView?Atomics.load(this.ctrlView,$e.T_SOUNDING):this.tel[$e.T_SOUNDING],n=Math.min(1,Math.max(0,(t/$e.CAP_SOUNDING-.5)/.4));return Math.max(n,Math.min(1,Math.max(0,this.externalLoad)))}admitSecondary(t=.5){const n=t>this.pressure();return n?this.secondaryGate.admitted++:this.secondaryGate.refused++,n}telemetry(){if(this.ctrlView)for(let t=0;t<$e.CTRL_WORDS;t++)this.tel[t]=Atomics.load(this.ctrlView,t);else{const t=performance.now();t-this.lastSnapAt>=QRe&&(this.lastSnapAt=t,this.node.port.postMessage({type:"SNAP",id:++this.snapSeq}))}return tCe(this.tel)}resetStats(){this.node.port.postMessage({type:"RESET_STATS"}),Object.assign(this.ingress,{accepted:0,rejectedState:0,rejectedStale:0,rejectedFull:0,rejectedBad:0}),Object.assign(this.secondaryGate,{admitted:0,refused:0}),this.writer&&(this.writer.highWater=0)}serial(t){const n=this.chain.then(t,t);return this.chain=n.catch(()=>{}),n}setState(t,n){this.state=t,this.onStateChange?.(t,n)}engageParam(){const t=this.node.parameters.get("engage");if(!t)throw new Error("xrg-engage-param-missing");return t}waitReady(t,n){const r=()=>!!this.ctrlView&&Atomics.load(this.ctrlView,$e.C_READY)===1;return this.readySeen||r()?Promise.resolve(!0):new Promise(a=>{let o=!1;const i=c=>{o||(o=!0,clearTimeout(s),clearInterval(l),a(c&&n===this.generation))},s=setTimeout(()=>i(!1),t),l=setInterval(()=>{r()?i(!0):n!==this.generation&&i(!1)},20);this.readyWaiters.push(()=>i(!0))})}engage(t){return this.serial(async()=>{if(this.state!=="idle")throw new Error(`xrg-engage-from-${this.state}`);const n=++this.generation;this.junction=t,this.setState("engaging",null);const r=this.engageParam();Df(r,0,this.ctx),yd.forEach((l,c)=>{t.inputs[l].connect(this.node,0,c),this.node.connect(t.analyzers[l],c,0)});const a=await this.waitReady(2500,n);if(n!==this.generation)return;if(!a)throw this.unwire(t),this.junction=null,this.setState("idle","ready-timeout"),new Error("xrg-ready-timeout");const o=this.ctx.currentTime+Q8,i=o+U8;r.cancelScheduledValues(0),r.setValueAtTime(0,o),r.linearRampToValueAtTime(1,i);for(const l of yd){const c=t.splices[l].gain;c.cancelScheduledValues(0),c.setValueAtTime(1,o),c.linearRampToValueAtTime(0,i)}if(!(!await K8(this.ctx,i+.03,()=>n===this.generation)||n!==this.generation)){for(const l of yd){try{t.inputs[l].disconnect(t.splices[l])}catch{}Df(t.splices[l].gain,0,this.ctx)}Df(r,1,this.ctx),this.setState("engaged",null)}})}disengage(){return this.serial(async()=>{if(this.state!=="engaged"&&this.state!=="fault-passthrough")return;const t=this.junction;if(!t)return;const n=++this.generation;this.setState("disengaging",this.faultReason);for(const s of yd)t.inputs[s].connect(t.splices[s]);const r=this.engageParam(),a=this.ctx.currentTime+Q8,o=a+U8;r.cancelScheduledValues(0),r.setValueAtTime(1,a),r.linearRampToValueAtTime(0,o);for(const s of yd){const l=t.splices[s].gain;l.cancelScheduledValues(0),l.setValueAtTime(0,a),l.linearRampToValueAtTime(1,o)}if(!(!await K8(this.ctx,o+.03,()=>n===this.generation)||n!==this.generation)){this.unwire(t);for(const s of yd)Df(t.splices[s].gain,1,this.ctx);Df(r,0,this.ctx),this.junction=null,this.setState(this.faultReason?"bypassed":"idle",this.faultReason)}})}unwire(t){yd.forEach(n=>{try{t.inputs[n].disconnect(this.node)}catch{}try{this.node.disconnect(t.analyzers[n])}catch{}})}emergencyBypass(t){this.faultReason=t,this.generation++;const n=this.junction;if(n){for(const r of yd)n.inputs[r].connect(n.splices[r]),Df(n.splices[r].gain,1,this.ctx);this.unwire(n),this.junction=null}this.state!=="disposed"&&this.setState("bypassed",t)}onMessage(t){if(!t||typeof t!="object")return;const n=t;n.type==="READY"?(this.readySeen=!0,this.quantumFrames=n.frames??0,this.readyWaiters.splice(0).forEach(r=>r())):n.type==="SNAP"&&n.tel instanceof Int32Array?this.tel.set(n.tel.subarray(0,$e.CTRL_WORDS)):n.type==="FAULT"&&(this.faultReason=String(n.reason??"fault"),(this.state==="engaged"||this.state==="engaging")&&(this.setState("fault-passthrough",this.faultReason),this.disengage().catch(()=>{})))}dispose(){if(this.state!=="disposed"){this.junction&&this.emergencyBypass("dispose"),this.generation++,this.node.port.onmessage=null,this.node.onprocessorerror=null;try{this.node.disconnect()}catch{}this.setState("disposed",null),Bf.get(this.ctx)===this&&Bf.delete(this.ctx)}}async shutdown(){try{await this.disengage()}catch{}this.dispose()}}const I9={sine:0,triangle:1,sawtooth:2,square:3},E9=["glass_ping","soft_pluck","bell_tone","clean_pluck","deep_sub","vibrato_glass","tape_halo","membrane_thump","reed_sigh","spark_chime","bowed_glass","kalimba_tine","gong_wash","chime_spray","dust_pulse"],aCe="x_resonance_halo",Ht=(e,t,n,r,a={})=>({waveform:e,freqMul:t,gainMul:n,duration:r,cutoffHz:a.cutoffHz??12e3,resonance:a.resonance??.707,delay:a.delay??0,...a});Ht("sine",1,.5,1.4),Ht("sine",2.76,.22,.8),Ht("sine",5.4,.1,.4),Ht("triangle",1,.5,.9,{cutoffHz:2400,resonance:1.2}),Ht("sawtooth",1,.12,.35,{cutoffHz:1800}),Ht("sine",1,.45,2.6),Ht("sine",2,.25,1.8),Ht("sine",3.01,.14,1.2),Ht("sine",4.2,.08,.8),Ht("sine",5.43,.05,.5),Ht("sawtooth",1,.35,.6,{cutoffHz:3200,resonance:2}),Ht("triangle",2,.12,.3),Ht("sine",.5,.55,1.6),Ht("triangle",1,.15,1,{cutoffHz:600}),Ht("sine",1,.35,1.8),Ht("sine",1.004,.3,1.8),Ht("sine",2.01,.1,1),Ht("triangle",1,.28,2.2,{cutoffHz:1800,attack:.06}),Ht("triangle",1.5,.12,2,{cutoffHz:1500,attack:.08,delay:.02}),Ht("sine",2,.1,1.6,{attack:.05}),Ht("sine",.5,.6,.35,{cutoffHz:400}),Ht("triangle",1,.2,.18,{cutoffHz:800,resonance:3}),Ht("square",1.5,.05,.08,{cutoffHz:900}),Ht("sawtooth",1,.22,1.8,{cutoffHz:1400,resonance:1.8,attack:.08,sustain:.7,release:.25}),Ht("square",2,.06,1.6,{cutoffHz:1600,attack:.1,sustain:.6,release:.25}),Ht("sine",2,.25,.6),Ht("sine",3,.18,.5,{delay:.03}),Ht("sine",4.5,.12,.4,{delay:.06}),Ht("sine",6,.08,.3,{delay:.09}),Ht("sine",1,.32,4,{attack:.25,sustain:.8,release:.6}),Ht("sine",2,.12,4,{attack:.3,sustain:.7,release:.6}),Ht("triangle",3,.05,3.5,{cutoffHz:4e3,attack:.35,sustain:.6,release:.5}),Ht("sine",1,.5,1.1),Ht("sine",5.9,.12,.15),Ht("triangle",1,.1,.5,{cutoffHz:2e3}),Ht("sine",.5,.3,4.5),Ht("sine",1.13,.22,3.8),Ht("sine",1.6,.16,3.2,{delay:.01}),Ht("sine",2.31,.12,2.6,{delay:.02}),Ht("triangle",3.2,.06,2,{cutoffHz:3e3,delay:.03}),Ht("sine",4.7,.05,1.5,{delay:.04}),Ht("sine",6.1,.04,1.2,{delay:.05}),Ht("sine",7.9,.03,1,{delay:.06}),Ht("sine",2,.16,.5),Ht("sine",2.5,.14,.5,{delay:.015}),Ht("sine",3,.12,.5,{delay:.03}),Ht("sine",3.75,.1,.5,{delay:.045}),Ht("sine",4.5,.08,.5,{delay:.06}),Ht("sine",5.25,.07,.5,{delay:.075}),Ht("sine",6,.06,.5,{delay:.09}),Ht("square",1,.12,.12,{cutoffHz:900,resonance:4}),Ht("square",1.5,.08,.12,{cutoffHz:1200,resonance:4,delay:.06}),Ht("square",2,.06,.12,{cutoffHz:1500,resonance:4,delay:.12}),aCe+"",Ht("sine",1,.2,2.2,{attack:.04,panSpread:.4}),Ht("sine",2.005,.1,1.8,{attack:.06,panSpread:.4});function oCe(e,t){if(!(e.waveform in I9))throw new Error(`xrg-preset:${t}: unknown waveform ${String(e.waveform)}`);const n=Math.max(.02,Number(e.duration)||.5);return{freqMul:Number(e.freqMul)||1,gainMul:Math.max(0,Number(e.gainMul)||0),cutoffHz:Math.max(20,Number(e.cutoffHz)||12e3),resonance:Math.max(.3,Number(e.resonance)||.707),delay:Math.max(0,Number(e.delay)||0),duration:n,waveform:e.waveform,attack:Math.max(5e-4,e.attack??Math.min(.004,n*.1)),sustain:Math.min(1,Math.max(0,e.sustain??0)),release:Math.max(.002,e.release??.012),panSpread:Math.min(1,Math.max(0,e.panSpread??.12))}}function iCe(e,t){const n=[...t??Object.keys(e.presets)];if(n.length>$e.MAX_PRESETS)throw new Error("xrg-preset: too many presets");const r=new Float32Array($e.MAX_PRESETS*$e.MAX_TONES*$e.TONE_STRIDE),a=new Int32Array($e.MAX_PRESETS),o=[],i=new Map;return n.forEach((s,l)=>{const c=e.presets[s];if(!c||c.length===0)throw new Error(`xrg-preset:${s}: missing`);const d=c.map(p=>oCe(p,s)).sort((p,f)=>f.gainMul-p.gainMul||p.freqMul-f.freqMul).slice(0,$e.MAX_TONES).map((p,f)=>({...p,rank:f}));o.push(d),a[l]=d.length,i.set(s,l),d.forEach((p,f)=>{const b=(l*$e.MAX_TONES+f)*$e.TONE_STRIDE;r[b+$e.P_FREQ_MUL]=p.freqMul,r[b+$e.P_GAIN_MUL]=p.gainMul,r[b+$e.P_CUTOFF]=p.cutoffHz,r[b+$e.P_Q]=p.resonance,r[b+$e.P_DELAY]=p.delay,r[b+$e.P_DUR]=p.duration,r[b+$e.P_WAVE]=I9[p.waveform],r[b+$e.P_ATTACK]=p.attack,r[b+$e.P_SUSTAIN]=p.sustain,r[b+$e.P_RELEASE]=p.release,r[b+$e.P_RANK]=f,r[b+$e.P_PAN_SPREAD]=p.panSpread})}),{ids:n,count:n.length,table:r,toneCounts:a,tones:o,index:s=>i.get(s)??-1}}function sCe(){if(typeof window>"u")return!1;try{return new URLSearchParams(window.location.search).get("xrg")!=="0"}catch{return!0}}const lCe=iCe(YW,E9);function cCe(e){const n=P.useRef(sCe()).current&&e.enabled!==!1,r=P.useRef(null),[a,o]=P.useState("idle");return P.useEffect(()=>{const i=e.audioCtx;if(!n||!i)return;const s=new AbortController;let l=!1,c=null;const d=()=>{c!==null&&(window.clearInterval(c),c=null)},p=async()=>{let f=null;const b=e.liveMasteringRef.current;if(!(!b||l||s.signal.aborted||!["main","drone","rhythm","space"].every(y=>b.inputs[y]&&b.splices[y]&&b.analyzers[y]))){l=!0;try{const y=await RL.create(i,{presets:lCe,signal:s.signal});if(f=y,s.signal.aborted){y.dispose();return}r.current=y,y.onStateChange=A=>o(A);const x={inputs:b.inputs,splices:b.splices,analyzers:b.analyzers};await y.engage(x),o(y.state),d(),typeof window<"u"&&(window.__XENSONAR_XRG__=y)}catch(y){console.warn("[xrg] not engaged; 400.3 path stays active",y),r.current=null,f&&(f.onStateChange=null),f?.dispose(),o("idle"),l=!1}}};return c=window.setInterval(()=>{p()},100),p(),()=>{s.abort(),d();const f=r.current;r.current=null,f&&(f.onStateChange=null),o("idle"),typeof window<"u"&&delete window.__XENSONAR_XRG__,f&&f.shutdown()}},[e.audioCtx,e.liveMasteringRef,n]),{governorRef:r,state:n?a:"disabled"}}const F9=192,uCe=2,dCe=826560088;function mCe(e){if(e.byteLength!==F9)throw new Error("xnc-diag-length");const t=new DataView(e);if(t.getUint32(0,!0)!==dCe||t.getUint32(8,!0)!==uCe)throw new Error("xnc-diag-version");const n=o=>{const i=t.getBigUint64(o,!0);if(i>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("xnc-diag-counter-overflow");return Number(i)},r=t.getBigUint64(16,!0),a=t.getUint32(12,!0);return{id:t.getUint32(4,!0),nativeMonoMs:Number(r/1000000n)+Number(r%1000000n)/1e6,sidecar:(a&1)!==0,pipewire:(a&2)!==0,rflOwned:(a&4)!==0,pwClockComparable:(a&8)!==0,foundationAsset:(a&16)!==0,foundationTone:(a&32)!==0,deviceConnected:(a&64)!==0,foundationReady:(a&128)!==0,callbackCount:n(24),framesMixed:n(32),callbackWallMaxMs:n(40)/1e6,pwSkippedCycles:n(48),pwLateIntervals:n(56),pwOverBudget:n(64),playerFramesMissing:n(72),playerBlocksPublished:n(80),playerLaneSkips:n(88),playerCommandsEnqueued:n(96),playerCommandsRejected:n(104),secondaryFramesMissing:n(112),ctlRejectedFull:n(120),epoch:t.getUint32(128,!0),quantumFrames:t.getUint32(132,!0),daemonBootId:t.getBigUint64(136,!0).toString(),pwTimelineResets:n(144),pwInvalidPositions:n(152),pwNoBuffer:n(160),ctlAccepted:n(168),pubBusy:n(176),staleRejected:n(184)}}const pCe=4,hCe=5,fCe=6,gCe=512,$8=256,bCe=1073741824;function yCe(e,t){const n=e%1073741822+1;return{seq:n,token:t?(n|bCe)>>>0:n}}const nu=32,mk=nu*8,X8=nu*12;function Y8(e,t=performance.now(),n=performance.timeOrigin){if(e===void 0)return 0;if(!Number.isFinite(e)||e<0)return null;const r=e>1e12?e-n:e,a=t-r;return!Number.isFinite(a)||a<-5?null:Math.max(0,a)}function SCe(){if(typeof window>"u")return"ws://127.0.0.1:47812";try{const e=new URLSearchParams(window.location.search),n=e.get("xncHost")||(window.location.protocol.startsWith("http")?window.location.hostname:"127.0.0.1"),r=e.get("xncWsPort")||"47812";return`ws://${n}:${r}`}catch{return"ws://127.0.0.1:47812"}}class CL{constructor(t){this.ws=t}static connect(t=SCe(),n=1500){return new Promise((r,a)=>{const o=new WebSocket(t);o.binaryType="arraybuffer";const i=new CL(o);let s=!1;const l=d=>{s||(s=!0,clearTimeout(c),a(d))},c=setTimeout(()=>{l(new Error("xnc-connect-timeout")),i.state="closed",o.close()},n);o.onopen=()=>{if(s){o.close();return}s=!0,clearTimeout(c),i.state="open",r(i)},o.onerror=()=>{l(new Error("xnc-connect-failed")),o.close()},o.onclose=()=>{clearTimeout(c),l(new Error("xnc-bridge-closed"));const d=i.state==="open";i.state="closed",i.failPending(new Error("xnc-bridge-closed")),d&&i.onClose?.()},o.onmessage=d=>i.receiveDiagnostic(d.data)})}state="connecting";onClose=null;counters={sent:0,rejectedState:0,rejectedStale:0,rejectedFull:0,rejectedBad:0,releaseDropped:0};lastDiagnostic=null;token=0;activeHeldTokens=new Set;diagId=0;lastDiagAt=-1/0;pending=null;failTransport(){if(this.state!=="closed"){this.state="closed",this.failPending(new Error("xnc-bridge-closed"));try{this.ws.close()}catch{}queueMicrotask(()=>this.onClose?.())}}encode(t,n){const r=new ArrayBuffer(nu),a=new DataView(r);return a.setUint32(0,(t&255|(n.birthWallMs!==void 0?$8:0)|(n.preset&65535)<<16)>>>0,!0),a.setUint32(4,n.token>>>0,!0),a.setUint32(8,n.birthWallMs===void 0?0:Math.floor(n.birthWallMs)>>>0,!0),a.setUint32(12,Math.min(65535,Math.max(0,Math.round(n.ageMs))),!0),a.setFloat32(16,n.freq,!0),a.setFloat32(20,n.peak,!0),a.setFloat32(24,n.pan,!0),a.setUint32(28,n.flags>>>0,!0),r}push(t,n){if(this.state!=="open"||this.ws.readyState!==WebSocket.OPEN)return this.failTransport(),this.counters.rejectedState++,Ul.STATE;if(!Number.isInteger(n.preset)||n.preset<0||n.preset>=$e.MAX_PRESETS||!Number.isFinite(n.frequencyHz)||n.frequencyHz<10||n.frequencyHz>2e4||!Number.isFinite(n.peak)||n.peak<=0||n.peak>2||n.pan!==void 0&&(!Number.isFinite(n.pan)||n.pan<-1||n.pan>1))return this.counters.rejectedBad++,Ul.BAD;const r=Y8(n.eventTimeStamp);if(r===null)return this.counters.rejectedBad++,Ul.BAD;if(r>$e.MAX_ACTION_AGE_MS)return this.counters.rejectedStale++,Ul.STALE;if(this.ws.bufferedAmount+nu>mk)return this.counters.rejectedFull++,Ul.FULL;const a=yCe(this.token,t===$e.OP_SECONDARY);this.token=a.seq;const o=a.token;try{this.ws.send(this.encode(t,{preset:n.preset,token:o,ageMs:r,birthWallMs:Date.now()-r,freq:n.frequencyHz,peak:n.peak,pan:n.pan??0,flags:(n.gesture??1)&255|((n.maxTones??0)&255)<<8|(n.hold?65536:0)}))}catch{return this.failTransport(),this.counters.rejectedState++,Ul.STATE}if(this.counters.sent++,n.hold){if(this.activeHeldTokens.size>=256){const i=this.activeHeldTokens.values().next().value;i!==void 0&&this.activeHeldTokens.delete(i)}this.activeHeldTokens.add(o)}return o}playerAction(t){return this.push($e.OP_PLAYER,t)}secondaryAction(t){return this.push($e.OP_SECONDARY,t)}rflControl(t){if(this.state!=="open"||this.ws.readyState!==WebSocket.OPEN)return this.failTransport(),!1;const n=Y8(t.eventTimeStamp);if(n===null||n>$e.MAX_ACTION_AGE_MS||!Number.isFinite(t.playbackRate)||t.playbackRate<.125||t.playbackRate>8||!Number.isFinite(t.gain)||t.gain<0||t.gain>1.5||!Number.isFinite(t.leadSec)||t.leadSec<0||t.leadSec>.5||!Number.isInteger(t.sourceFrame)||t.sourceFrame<0||this.ws.bufferedAmount+nu>mk)return!1;const r=new ArrayBuffer(nu),a=new DataView(r),o=(fCe|$8|(t.gate?gCe:0))>>>0;a.setUint32(0,o,!0),a.setUint32(4,t.generation>>>0,!0),a.setUint32(8,Math.floor(Date.now()-n)>>>0,!0),a.setUint32(12,Math.min(65535,Math.max(0,Math.round(n))),!0),a.setFloat32(16,t.playbackRate,!0),a.setFloat32(20,t.gain,!0),a.setFloat32(24,t.leadSec,!0),a.setUint32(28,t.sourceFrame>>>0,!0);try{return this.ws.send(r),!0}catch{return this.failTransport(),!1}}release(t){if(!(this.state!=="open"||t<=0)){if(this.ws.readyState!==WebSocket.OPEN){this.failTransport();return}if(this.ws.bufferedAmount+nu>X8){this.counters.releaseDropped++;return}try{this.ws.send(this.encode($e.OP_RELEASE,{preset:0,token:t,ageMs:0,freq:0,peak:0,pan:0,flags:0})),this.activeHeldTokens.delete(t)}catch{this.failTransport()}}}panic(){if(this.state==="open"){if(this.ws.readyState!==WebSocket.OPEN){this.failTransport();return}if(this.ws.bufferedAmount+nu>X8){this.failTransport();return}try{this.ws.send(this.encode(pCe,{preset:0,token:0,ageMs:0,freq:0,peak:0,pan:0,flags:0})),this.activeHeldTokens.clear()}catch{this.failTransport()}}}requestDiagnostic(t=900){if(this.state!=="open"||this.ws.readyState!==WebSocket.OPEN)return this.failTransport(),Promise.reject(new Error("xnc-bridge-closed"));if(this.pending)return Promise.reject(new Error("xnc-diag-in-flight"));if(performance.now()-this.lastDiagAt<300)return Promise.reject(new Error("xnc-diag-rate-limit"));if(this.ws.bufferedAmount+nu>mk)return Promise.reject(new Error("xnc-diag-socket-backpressure"));this.lastDiagAt=performance.now();const n=this.diagId=this.diagId+1>>>0,r=this.encode(hCe,{preset:0,token:n,ageMs:0,freq:0,peak:0,pan:0,flags:0});return new Promise((a,o)=>{const i=window.setTimeout(()=>this.failPending(new Error("xnc-daemon-no-diag-reply")),t);this.pending={id:n,resolve:a,reject:o,timer:i};try{this.ws.send(r)}catch{this.failPending(new Error("xnc-diag-send-failed"))}})}receiveDiagnostic(t){if(!(!(t instanceof ArrayBuffer)||t.byteLength!==F9||!this.pending))try{const n=mCe(t);if(n.id!==this.pending.id)return;window.clearTimeout(this.pending.timer);const r=this.pending.resolve;this.pending=null,this.lastDiagnostic=n,r(n)}catch(n){this.failPending(n instanceof Error?n:new Error("xnc-diag-decode"))}}failPending(t){if(!this.pending)return;window.clearTimeout(this.pending.timer);const n=this.pending.reject;this.pending=null,n(t)}close(){this.activeHeldTokens.clear(),this.ws.close()}}function vCe(){if(typeof window>"u")return!1;try{return new URLSearchParams(window.location.search).get("xnc")!=="0"}catch{return!0}}function ACe(){const e=P.useRef(vCe()).current,t=P.useRef(null),[n,r]=P.useState(e?"closed":"disabled");return P.useEffect(()=>{if(!e)return;let a=!1,o=!1,i=0,s=0;const l=p=>{if(typeof window>"u")return;const f=window;p?f.__XENSONAR_XNC__=p:delete f.__XENSONAR_XNC__},c=(p=1e3)=>{a||(window.clearTimeout(i),window.clearInterval(s),i=window.setTimeout(()=>{d()},p))},d=async()=>{if(!(a||o||t.current?.state==="open")){o=!0,r("connecting");try{const p=await CL.connect(void 0,900);if(a){p.close();return}if(await p.requestDiagnostic(900),a){p.close();return}t.current=p,l(p),r("open"),s=window.setInterval(()=>{a||t.current!==p||p.state!=="open"||p.requestDiagnostic(700).catch(()=>{})},1e3),p.onClose=()=>{window.clearInterval(s),s=0,t.current===p&&(t.current=null),l(null),a||(r("closed"),c(750))}}catch{a||(r("closed"),c(1250))}finally{o=!1}}};return d(),()=>{a=!0,window.clearTimeout(i),window.clearInterval(s);const p=t.current;t.current=null,l(null),p?.close()}},[e]),{ownerRef:t,state:n}}function xCe(){if(typeof window>"u")return!1;try{return new URLSearchParams(window.location.search).get("xncFullOwner")==="1"}catch{return!1}}function MCe(){if(typeof document>"u")return null;const e="xensonar-xnc-full-owner-status",t=document.getElementById(e);if(t instanceof HTMLDivElement)return t;const n=document.createElement("div");return n.id=e,Object.assign(n.style,{position:"fixed",right:"12px",top:"54px",zIndex:"2147483647",padding:"6px 9px",borderRadius:"8px",font:"600 11px/1.2 monospace",background:"rgba(5,8,12,.88)",color:"#f7d993",border:"1px solid rgba(247,217,147,.45)",pointerEvents:"none"}),document.body.appendChild(n),n}function Sd(e,t=!1){const n=MCe();n&&(n.textContent=e,n.style.color=t?"#93f7ba":"#f7d993")}function wCe(e){const t=P.useRef(xCe()).current;P.useEffect(()=>{if(!t)return;const n=e.audioCtx;let r=null,a=0,o=!1;const i=()=>{if(r&&n&&n.state!=="closed")try{La(r,n.destination,{label:"master:output-trim->destination",subsystem:"master"})}catch{}r=null},s=()=>{if(o||!n)return;const l=e.ownerRef.current,c=l?.lastDiagnostic;if(!(e.ownerState==="open"&&!!l&&!!c&&c.foundationReady&&c.rflOwned&&c.deviceConnected&&c.callbackCount>=4)){r&&i(),e.ownerState!=="open"||!l||!c?Sd("NATIVE FULL OWNER · wartet auf AudioHost"):!c.foundationReady||!c.rflOwned?Sd("NATIVE FULL OWNER · loading Foundation/RFL"):(!c.deviceConnected||c.callbackCount<4)&&Sd("NATIVE FULL OWNER · waiting for audio device");return}if(r){Sd("NATIVE FULL OWNER · AKTIV",!0);return}const p=e.finalOutputTrimRef.current;if(!p){Sd("NATIVE FULL OWNER · wartet auf Masterbus");return}try{p.disconnect(n.destination),wj(p,n.destination,"xnc-full-owner-audition"),r=p;const f=ih.existing(n)?.report();if(f&&f.audibleEdges>0){i(),Sd(`NATIVE FULL OWNER · Browser-Nebenpfad ${f.audibleEdges}`);return}Sd("NATIVE FULL OWNER · AKTIV",!0)}catch{i(),Sd("NATIVE FULL OWNER · Umschaltung fehlgeschlagen")}};return a=window.setInterval(s,100),s(),()=>{o=!0,window.clearInterval(a),i(),document.getElementById("xensonar-xnc-full-owner-status")?.remove()}},[e.audioCtx,e.finalOutputTrimRef,e.ownerRef,e.ownerState,t])}function RCe(e){const{options:t}=e;if(t?.legacy9061DirectGate!==!0)return"fallthrough";const{selection:n}=e;if(n.kind==="sample")return e.browserImplant.enabled&&e.browserImplant.noteLegacyBypass("sample-preset",n.sampleId),"fallthrough";if(n.kind!=="preset"||e.entrophonActive)return"fallthrough";const r=Txe(t),{resolved:a}=e,o=e.executor;if(o==="legacy")return"fallthrough";if(o==="browser-c11"){if(!e.c11Allowed&&__wave39Owned(e.ctx))return"fallthrough";const l=!!e.c11CorePlan||!!e.c11CorePlanInput&&(e.c11CoreToneCount??0)>0;return!e.c11Allowed||!l?(e.browserImplant.noteLegacyBypass(e.c11BypassReason||"semantic-parity",n.presetId),"fallthrough"):(e.browserImplant.tryAttack({frequencyHz:a.playbackFreq,volume:a.volume,isSector:e.isSector,requestedAtMs:t.requestedAtMs,keyboardDirect:t.keyboardGestureSource==="keyboard-direct",soundId:n.presetId,corePlan:e.c11CorePlan??void 0,corePlanInput:e.c11CorePlanInput??void 0,coreToneCount:e.c11CoreToneCount??void 0,auxTargets:e.c11AuxTargets,prepareAuxTargets:e.c11PrepareAuxTargets??void 0,acquireVoice:e.transientRuntime?count=>__wave39CompoundLease(e.transientRuntime,count,a.volume):void 0}),"owned")}if(!r||!e.coreOwnerAllowed)return"fallthrough";if(o==="native-pilot")return e.nativePilot.tryAttack({frequencyHz:a.playbackFreq,volume:a.volume,isSector:e.isSector,requestedAtMs:t.requestedAtMs,forceSustainExtend:t.forceSustainExtend,soundId:n.presetId,rootFollowActive:e.rootFollowActive}),"owned";const i=E9.indexOf(n.presetId),s={preset:i,frequencyHz:a.playbackFreq,peak:a.volume,gesture:t.keyboardGestureSource==="keyboard-glissando"?rE.GLISS:rE.DIRECT,eventTimeStamp:t.requestedAtMs};return o==="native-owner"?(e.nativeOwner&&i>=0&&e.nativeOwner.playerAction(s),"owned"):o==="xrg"?(e.xrgOwner&&e.xrgOwner.playerAction({...s,preset:e.xrgOwner.presets.index(n.presetId)}),"owned"):"fallthrough"}function CCe(){if(typeof window>"u")return"browser-c11";try{const e=new URLSearchParams(window.location.search),t=e.get("waveDirectOwner");if(t==="legacy")return"legacy";if(t==="xnc")return"native-owner";if(t==="xrg")return"xrg";if(t==="native-pilot")return"native-pilot";if(t==="c11")return"browser-c11";if(e.get("nativeWaveStarter")==="1")return"native-pilot";if(e.get("browserWaveStarter")==="0")return"legacy"}catch{}return"browser-c11"}function kCe(e){switch(e.preferred){case"native-owner":return e.nativeOwnerState==="open"?"native-owner":"legacy";case"xrg":return e.xrgState==="engaged"?"xrg":"legacy";case"browser-c11":return e.browserEnabled&&(e.browserState==="ready"||e.browserOwnsLane)?"browser-c11":"legacy";case"native-pilot":return e.nativePilotEnabled&&(e.nativePilotState==="ready"||e.nativePilotOwnsLane)?"native-pilot":"legacy";case"legacy":default:return"legacy"}}function PCe(e){if(e.heldLong||e.forceSustainExtend)return{c11Allowed:!1,coreOwnerAllowed:!1,c11BypassReason:"hold-release-lifecycle",coreOwnerBypassReason:"hold-release-lifecycle"};if(e.bodyExciterExpected)return{c11Allowed:!1,coreOwnerAllowed:!1,c11BypassReason:"body-exciter-lifecycle",coreOwnerBypassReason:"body-exciter-lifecycle"};const t=e.c11CorePlanReady,n=t?null:e.c11CorePlanReason||"c11-core-plan";let r=null;return e.activeWaveAux?r="wave-aux-routing":e.waveGradientAmount>1e-4?r="gradient-modulation":e.overtonesEnabled?r="extra-overtone-layer":e.swellBlend>.02&&(r="swell-reinforcement"),{c11Allowed:t,coreOwnerAllowed:r===null,c11BypassReason:n,coreOwnerBypassReason:r}}function ICe(e){fSe({audioCtx:e.audioCtx,nexusActive:e.nexusActive,rootFollowLoopActive:e.rootFollowLoopActive,selectedRootFollowLoop:e.selectedRootFollowLoop,selectedRootFollowLoopConfig:e.selectedRootFollowLoopConfig,quantizeBpm:e.quantizeBpm,rootFollowLoopTimeMode:e.rootFollowLoopTimeMode,rootFollowLoopVolume:e.rootFollowLoopVolume,rootFollowLoopGranulationMode:e.rootFollowLoopGranulationMode,rootFollowGranularSettings:e.rootFollowGranularSettings,rootFollowImpulsRasterEvery:e.rootFollowImpulsRasterEvery,rootFollowImpulsRasterCycleDiv:e.rootFollowImpulsRasterCycleDiv,rootFollowImpulsRasterClockMode:e.rootFollowImpulsRasterClockMode,rootFollowImpulsRasterPattern:e.rootFollowImpulsRasterPattern,rootFollowImpulsRasterMuted:e.rootFollowImpulsRasterMuted,refs:e.refs,trafficRef:e.trafficRef,getRhythmBus:e.getRhythmBus,ensureMyzelPostFxRouter:e.ensureMyzelPostFxRouter,getForgeSend:e.getForgeSend,rootFollowPreviewActive:e.rootFollowPreviewActive,rootFollowPlayfieldInside:e.rootFollowPlayfieldInside,playfieldCursorInside:e.rootFollowPreviewActive||e.rootFollowPlayfieldInside,getCurrentRootHz:e.getCurrentRootHz,getAudioPressureBias:e.getAudioPressureBias,rootFollowPolicy:e.rootFollowPolicy}),P.useEffect(()=>{const t=e.voiceEngineMode;!(t==="worklet-stable-lane-pilot"||t==="worklet-stable-lane-primary-audition"||t==="worklet-granular-pilot"||t==="worklet-granular-primary-candidate"||t==="worklet-direct-pilot"||t==="worklet-shadow"||t==="worklet-granular-shadow"||t==="worklet-buffer-shadow")||!e.audioCtx||uye({ctx:e.audioCtx,trafficRef:e.trafficRef,reason:"root-follow-worklet-liveness-prime"})},[e.audioCtx,e.voiceEngineMode,e.trafficRef])}function ECe(e=typeof location<"u"?location.search:""){try{return new URLSearchParams(e).get("bluefield")==="1"}catch{return!1}}const FCe=ECe(),TCe="/xensonar-native-protocol.js",LCe="/xensonar-native-control.js";let pk=null;function BCe(){try{if(new URLSearchParams(window.location.search).get("xncRfl")==="1")return!1}catch{}return zF()}function DCe(){try{return new URLSearchParams(window.location.search).get("nativeRflMaterialAllowNull")==="1"}catch{return!1}}function J8(e){const t=W0(e);return new Promise((n,r)=>{const a=document.querySelector(`script[data-xensonar-native-src="${t}"]`);if(a?.dataset.loaded==="true"){n();return}if(a){a.addEventListener("load",()=>n(),{once:!0}),a.addEventListener("error",()=>r(new Error(`failed ${e}`)),{once:!0});return}const o=document.createElement("script");o.src=t,o.async=!1,o.dataset.xensonarNativeSrc=t,o.addEventListener("load",()=>{o.dataset.loaded="true",n()},{once:!0}),o.addEventListener("error",()=>r(new Error(`failed ${e}`)),{once:!0}),document.head.appendChild(o)})}function NCe(){return window.XensonarNativeControl&&window.XensonarNativeProtocol?Promise.resolve():(pk||(pk=(async()=>{if(await J8(TCe),await J8(LCe),!window.XensonarNativeControl)throw new Error("native control adapter unavailable")})()),pk)}async function OCe(e){const t=e.numberOfChannels;if(t<1||t>2)throw new Error("material channels must be mono/stereo");const n=e.length,r=new Float32Array(n*t);for(let i=0;i<t;i++){const s=e.getChannelData(i);for(let l=0;l<n;l++)r[l*t+i]=s[l]}const a=new Uint8Array(await crypto.subtle.digest("SHA-256",r.buffer));let o="";for(let i=0;i<8;i++)o+=a[i].toString(16).padStart(2,"0");return{pcm:r,hash:o,frames:n,channels:t,sampleRate:e.sampleRate}}function _Ce(){const e=P.useRef(BCe()).current,t=P.useRef(null),n=P.useRef(!1),r=P.useRef(!1),a=P.useRef(new WeakMap),o=P.useRef(new WeakMap),i=P.useRef(null),s=P.useRef(1),l=P.useRef(!1),c=P.useRef(1),d=P.useRef([]),p=P.useRef({enabled:e,state:e?"connecting":"disabled",physicalAudio:!1,warmAssets:0,nativeWindows:0,nativeBatches:0,nativeDrops:0,legacyFallbacks:0,submitRejects:0,lastReason:null,lastError:null,nativeGrains:0,nativeNonzero:0}),f=P.useCallback(x=>{p.current={...p.current,...x}},[]),b=P.useCallback(x=>{p.current=x(p.current)},[]),g=P.useCallback(()=>{const x=t.current;if(x&&n.current){const A=s.current;x.rootFollowMaterialStop({generation:A}).catch(()=>{}),s.current=A>=2147483646?1:A+1}l.current=!1,i.current=null},[]);P.useEffect(()=>{if(!e)return;let x=!1;return(async()=>{try{if(await NCe(),x)return;const A=window.XensonarNativeControl;if(!A)throw new Error("native control missing");const M=new A({baseUrl:_F}),v=await M.connect({clockSamples:6,settleMs:4});if(x)return;if(!v.physicalAudio&&!DCe()||!(v.sampleRate>0))throw new Error("native sidecar not physical-ready");t.current=M,n.current=!0,f({state:"ready",physicalAudio:!!v.physicalAudio,lastError:null});const w=F=>{if(o.current.get(F))return;const L=(async()=>{try{const B=await OCe(F),O=await M.rootFollowMaterialRegisterAsset({pcm:B.pcm,hashHex:B.hash,frames:B.frames,channels:B.channels,sampleRate:B.sampleRate});a.current.set(F,{slot:Number(O.assetSlot),hash:B.hash}),b(T=>({...T,warmAssets:T.warmAssets+1,lastReason:"asset-warm"}))}catch(B){f({lastError:B instanceof Error?B.message:String(B),lastReason:"asset-publish-failed"})}finally{o.current.delete(F)}})();o.current.set(F,L)},R=async F=>{if(F.length===0)return[];if(!n.current||r.current||t.current!==M)return F.map(()=>({owned:!1,reason:"native-not-ready"}));if(F.length>8)throw new Error("native material batch exceeds 8 windows");const L=F[0].buffer;if(F.some(N=>N.buffer!==L))return F.map(()=>({owned:!1,reason:"mixed-buffer-batch"}));const B=a.current.get(L);if(!B)return w(L),b(N=>({...N,legacyFallbacks:N.legacyFallbacks+F.length,lastReason:"asset-publishing"})),F.map(()=>({owned:!1,reason:"asset-publishing"}));if(i.current!==L){if(i.current){try{await M.rootFollowMaterialStop({generation:s.current})}catch{}s.current=s.current>=2147483646?1:s.current+1}l.current=!1,i.current=L}const O=F.map(()=>({owned:!1,reason:"not-submitted"})),T=[],_=[];for(let N=0;N<F.length;N++){const W=F[N],V=W.plan.slices.flatMap(J=>J.elastic.grains.map(Z=>({startTimeMs:W.requestedAtMs+(Z.when-W.audioNowSec)*1e3,sourceStartFrame:Z.srcStart*W.buffer.sampleRate,playbackRate:J.elastic.safeRate,durationSec:Z.actualGrainOut})));if(V.length<1||V.length>64){O[N]={owned:!1,reason:"grain-bound"};continue}if(Math.min(...V.map(J=>J.startTimeMs))-W.requestedAtMs<18){O[N]={owned:!1,reason:"lead-too-short"};continue}const H=Math.max(1,Number(W.plan.crisis.staleWindowMs)||1),q=W.requestedAtMs+(W.plan.windowStartSec+H/1e3-W.audioNowSec)*1e3,K=Math.max(1e-4,Math.min(1,W.volume)),Y=K*Math.max(1e-4,Math.min(.22,K*.92))*.72;_.push(N),T.push({assetSlot:B.slot,generation:s.current,outputGain:Y,grains:V,deadlineTimeMs:q,sequence:c.current++,routingFlags:3})}const G=F.length-T.length;if(G>0&&!l.current)return b(N=>({...N,legacyFallbacks:N.legacyFallbacks+F.length,lastReason:"batch-not-armable"})),F.map(()=>({owned:!1,reason:"batch-not-armable"}));if(G>0){let N=0;for(let W=0;W<O.length;W++)O[W].reason!=="not-submitted"&&(O[W]={owned:!0,reason:`native-owned-drop-${O[W].reason}`},N++);N>0&&b(W=>({...W,nativeDrops:W.nativeDrops+N,lastReason:"native-owned-filter-drop"}))}if(T.length===0)return O;const j=T[T.length-1].sequence;try{T.length===1?await M.rootFollowMaterialSubmitWindow(T[0]):await M.rootFollowMaterialSubmitBatch({windows:T}),l.current=!0;for(const N of _)O[N]={owned:!0,reason:T.length>1?"native-owned-batch":"native-owned-direct-submit"};return b(N=>({...N,nativeWindows:N.nativeWindows+T.length,nativeBatches:N.nativeBatches+(T.length>1?1:0),lastReason:T.length>1?"native-owned-batch":"native-owned-direct-submit"})),O}catch(N){try{const W=await M.status();if(Number(W.rflMaterialLastCommittedId||0)===j){l.current=!0;for(const V of _)O[V]={owned:!0,reason:"native-owned-batch-recovered"};return b(V=>({...V,nativeWindows:V.nativeWindows+T.length,nativeBatches:V.nativeBatches+(T.length>1?1:0),lastReason:"native-owned-batch-recovered"})),O}}catch{}if(l.current){for(const W of _)O[W]={owned:!0,reason:"native-owned-drop-submit-reject"};b(W=>({...W,nativeDrops:W.nativeDrops+T.length,submitRejects:W.submitRejects+T.length,lastReason:"native-owned-drop-submit-reject",lastError:N instanceof Error?N.message:String(N)}))}else{for(const W of _)O[W]={owned:!1,reason:"batch-submit-reject"};b(W=>({...W,legacyFallbacks:W.legacyFallbacks+T.length,submitRejects:W.submitRejects+T.length,lastReason:N instanceof Error?N.message:"batch-submit-reject",lastError:N instanceof Error?N.message:String(N)}))}return O}};A3(async F=>(await R([F]))[0],g,R);const k=window.setInterval(()=>{n.current&&!r.current&&M.heartbeat().catch(()=>{})},1500),I=window.setInterval(()=>{n.current&&!r.current&&M.syncClock({samples:3,settleMs:2}).catch(()=>{})},4500),E=window.setInterval(()=>{n.current&&!r.current&&!document.hidden&&M.status().then(F=>f({nativeGrains:Number(F.rflMaterialGrainsStarted||0),nativeNonzero:Number(F.rflMaterialNonzeroCallbacks||0)})).catch(()=>{})},2400);d.current=[k,I,E]}catch(A){x||f({state:"unavailable",lastError:A instanceof Error?A.message:String(A)})}})(),()=>{x=!0,A3(null,null,null),d.current.forEach(A=>clearInterval(A)),d.current=[]}},[e,f,g]);const y=P.useCallback(async()=>{if(r.current||p.current.state==="ended")return;r.current=!0,f({state:"ending",lastReason:"diagnostic-finalizing",lastError:null}),g();const x=t.current;let A=!1;if(x){try{await x.panic()}catch{}for(let M=0;M<3&&!A;M++)try{await x.shutdown(),A=!0}catch{M<2&&await new Promise(v=>window.setTimeout(v,180*(M+1)))}}n.current=!1,A||!x?(FA(!1),f({state:"ended",lastReason:"diagnostic-session-ended"})):(r.current=!1,f({state:"ready",lastReason:"diagnostic-shutdown-failed",lastError:"Native host could not be stopped; diagnostic ZIP not yet confirmed."}))},[f,g]);return{snapshot:p.current,endPilot:y}}const Z8=new WeakMap,G1=new WeakMap;function Cy(e,t,n){return Math.max(t,Math.min(n,e))}function T9(e,t){const n=Cy(Number(t.loopStartSec)||0,0,Math.max(0,e.duration-.01)),r=Cy(Number(t.loopEndSec)||e.duration,n+.01,e.duration),a=Math.max(.001,Number(t.desiredLoopDurationSec)||r-n);return`${n.toFixed(6)}:${r.toFixed(6)}:${a.toFixed(6)}`}function L9(e,t){const n=Cy(Number(t.loopStartSec)||0,0,Math.max(0,e.duration-.01)),r=Cy(Number(t.loopEndSec)||e.duration,n+.01,e.duration),a=Math.max(.01,r-n),o=Math.max(.001,Number(t.desiredLoopDurationSec)||a),i=Cy(a/o,1/32,32);return{loopStartSec:n,loopEndSec:r,sourceDurationSec:a,desiredLoopDurationSec:o,transportRate:i}}async function zCe(e,t){const n=L9(e,t),r=Math.max(1,Math.round(n.sourceDurationSec*48e3)),a=new OfflineAudioContext(Math.min(2,Math.max(1,e.numberOfChannels)),r,48e3),o=a.createBufferSource();return o.buffer=e,o.connect(a.destination),o.start(0,n.loopStartSec,n.sourceDurationSec),a.startRendering()}function jCe(e){const t=e.length,n=new ArrayBuffer(44+t*2*4),r=new DataView(n),a=(l,c)=>{for(let d=0;d<c.length;d++)r.setUint8(l+d,c.charCodeAt(d))};a(0,"RIFF"),r.setUint32(4,36+t*8,!0),a(8,"WAVE"),a(12,"fmt "),r.setUint32(16,16,!0),r.setUint16(20,3,!0),r.setUint16(22,2,!0),r.setUint32(24,48e3,!0),r.setUint32(28,48e3*8,!0),r.setUint16(32,8,!0),r.setUint16(34,32,!0),a(36,"data"),r.setUint32(40,t*8,!0);const o=e.getChannelData(0),i=e.numberOfChannels>1?e.getChannelData(1):o;let s=44;for(let l=0;l<t;l++)r.setFloat32(s,o[l]||0,!0),r.setFloat32(s+4,i[l]||0,!0),s+=8;return n}async function GCe(e,t){const n=T9(e,t);if(Z8.get(e)===n)return!0;const r=G1.get(e);if(r?.key===n)return r.promise;const a=(async()=>{try{const o=L9(e,t),i=await zCe(e,o),s=jCe(i),l=await fetch("/xnc/rfl-asset",{method:"POST",headers:{"Content-Type":"audio/wav","X-Xensonar-Original-Rate":String(e.sampleRate),"X-Xensonar-Original-Duration":String(e.duration),"X-Xensonar-Rfl-Loop-Start-Sec":String(o.loopStartSec),"X-Xensonar-Rfl-Loop-End-Sec":String(o.loopEndSec),"X-Xensonar-Rfl-Source-Duration-Sec":String(o.sourceDurationSec),"X-Xensonar-Rfl-Desired-Duration-Sec":String(o.desiredLoopDurationSec),"X-Xensonar-Rfl-Transport-Rate":String(o.transportRate)},body:s});return l.ok&&(await l.json().catch(()=>null))?.ok?(Z8.set(e,n),!0):!1}catch{return!1}finally{G1.get(e)?.key===n&&G1.delete(e)}})();return G1.set(e,{key:n,promise:a}),a}function HCe(){if(typeof window>"u")return!1;try{return new URLSearchParams(window.location.search).get("xncRfl")==="1"}catch{return!1}}function VCe(e){const t=P.useRef(HCe()).current,n=P.useRef(1),r=P.useRef(null),a=P.useRef(null),o=P.useRef(null),i=P.useRef(null),s=P.useRef(0);return P.useEffect(()=>{if(!t)return;const l=async d=>{const p=e.current;if(!p||p.state!=="open")return{owned:!1,reason:"xnc-rfl-owner-not-open"};const f={loopStartSec:d.loopStartSec,loopEndSec:d.loopEndSec,desiredLoopDurationSec:d.desiredLoopDurationSec},b=T9(d.buffer,f),g=r.current!==null&&(r.current!==d.buffer||a.current!==b);if(g&&(p.rflControl({generation:n.current,sourceFrame:s.current,playbackRate:1,gain:0,leadSec:0,gate:!1}),r.current=null,a.current=null,o.current=null),o.current!==b)return i.current!==b&&(i.current=b,p.lastDiagnostic=null,GCe(d.buffer,f).then(R=>{i.current===b&&(i.current=null,R&&(o.current=b))})),{owned:!1,reason:g?"xnc-rfl-asset-reload-pending":"xnc-rfl-asset-handoff-pending"};if(!p.lastDiagnostic?.rflOwned)return{owned:!1,reason:"xnc-rfl-owner-confirmation-pending"};(r.current!==d.buffer||a.current!==b)&&(r.current=d.buffer,a.current=b,n.current=n.current>=1073741822?1:n.current+1);const y=Math.max(.01,d.loopEndSec-d.loopStartSec),x=((d.sourceOffsetSec-d.loopStartSec)%y+y)%y,A=Math.max(1,Math.round(y*48e3)),M=Math.max(0,Math.min(A-1,Math.round(x*48e3))),v=Math.max(0,Math.min(.18,d.volume*.075));return p.rflControl({generation:n.current,sourceFrame:M,playbackRate:Math.max(.125,Math.min(8,d.playbackRate)),gain:v,leadSec:Math.max(0,Math.min(.5,d.leadSec)),gate:!0,eventTimeStamp:d.requestedAtMs})?(s.current=M,{owned:!0,reason:"xnc-resident-rfl-owned-direct-state"}):{owned:!1,reason:"xnc-rfl-control-not-admitted"}},c=()=>{const d=e.current;!d||d.state!=="open"||!d.lastDiagnostic?.rflOwned||d.rflControl({generation:n.current,sourceFrame:s.current,playbackRate:1,gain:0,leadSec:0,gate:!1})};return x3(l,c),()=>{c(),x3(null,null),r.current=null,a.current=null,o.current=null,i.current=null}},[t,e]),{enabled:t}}function WCe(){const e=P.useRef([]),t=P.useRef(null),n=P.useRef(!1),r=P.useRef(null),a=P.useRef({ready:!1,pending:!1});return{activeScheduledTonesRef:e,audioCtxRef:t,audioWarmupDoneRef:n,audioWarmupPromiseRef:r,keyboardPitchAudioReadyLatchRef:a}}function qCe(e,t,n,r){return{x:Me(e,0,n),y:Me(t,0,r)}}function QCe(e,t,n,r,a,o){const i=Me(e,0,t),s=o(i),l=a-r>48;return{clampedY:i,nextHz:s,shouldUpdate:l}}function UCe(e,t,n,r){const a=Me(e,0,t);return n.lockCursorToGrid?r(a,n.gridBase,n.gridTuning,n.manualGridMutedSteps,n.manualGridStepOffsets):a}function KCe(e,t,n,r,a="auto"){Number.isFinite(e)&&(t.current=Me(e,0,r),n.current=a)}function $Ce(e){const{y:t,gameHeight:n,cursorHudHzRef:r,cursorHudLastUpdateRef:a,setCursorHudHz:o,freqFromY:i,nowMs:s}=e,{nextHz:l,shouldUpdate:c}=QCe(t,n,r.current,a.current,s,i);r.current=l,c&&(a.current=s,o(l))}function XCe(e,t,n,r,a,o,i="mouse"){return n.current=qCe(e,t,a,o),r.current=i,n.current}function YCe(e,t,n,r){return UCe(e,n,t,r)}const eO=["kick","snare","hatClosed","hatOpen","clap","perc"],JCe={pressure:.54,turbulence:.44,fracture:.34,crystallization:.5,orbitality:.46,cohesion:.52,recurrence:.5};function eR(e){return e==="forge_rooted"||e==="forge_braided"||e==="forge_fractured"}function ZCe(e){return e==="forge_braided"?"braided":e==="forge_fractured"?"fractured":"rooted"}function kL(e,t,n=16,r){const a=Math.max(1,Math.round(t)),o=No(n),i=a*o;return{pattern:e,bars:a,segmentsPerBar:o,segmentMarkers:sl(r,o),stepCount:i,laneOrder:[...eO],laneSteps:Object.fromEntries(eO.map(s=>[s,Array.from({length:i},()=>0)])),sourceKind:eR(e)?"rhythmforge":"static"}}function B9(e,t,n){const r=e.laneSteps[n.laneId]??[];r[t]=Math.max(r[t]??0,n.intensity),e.laneSteps[n.laneId]=r}const Zn=(e,t,n="exact",r=1)=>({laneId:e,intensity:t,timing:n,levelMultiplier:r});function PL(e,t){return e==="trip_hop"?[...t===0||t===10?[Zn("kick",1,"exact",1)]:[],...t===4||t===12?[Zn("snare",.92,"exact",.96)]:[],...t%2===0?[Zn("hatClosed",.62,"exact",.26)]:[],...t===7||t===15?[Zn("hatOpen",.72,"late",.3)]:[],...t===3||t===11?[Zn("perc",.72,"early",.18)]:[]]:e==="four_on_floor"?[...t%4===0?[Zn("kick",1,"exact",1)]:[],...t===4||t===12?[Zn("snare",.8,"exact",.62)]:[],...t%2===0?[Zn("hatClosed",.66,"late",.3)]:[],...t===7||t===15?[Zn("hatOpen",.6,"late",.28)]:[]]:e==="breakbeat"?[...[0,5,8,13].includes(t)?[Zn("kick",t===13?.86:1,t===5?"early":"exact",t===13?.82:1)]:[],...t===4||t===12?[Zn("snare",.96,"exact",1)]:[],...t===11?[Zn("clap",.72,"late",.26)]:[],...t%2!==0?[Zn("hatClosed",.6,"late",.28)]:[],...t===15?[Zn("hatOpen",.58,"late",.22)]:[]]:e==="idm"?[...[0,7,9,14].includes(t)?[Zn("kick",t===9?.84:1,"exact",t===9?.86:1)]:[],...t===4||t===11?[Zn("snare",.9,"exact",.9)]:[],Zn(t%3===0?"hatClosed":"perc",t%3===0?.62:.48,"late",.28),...t===6||t===15?[Zn("clap",.66,"late",.18)]:[]]:e==="minimal_techno"?[...t%2===0?[Zn("hatClosed",.64,"late",.32)]:[],...t===7||t===15?[Zn("hatOpen",.56,"late",.18)]:[]]:e==="duststep"?[...[0,7,10].includes(t)?[Zn("kick",t===10?.84:1,t===7?"early":"exact",t===10?.88:1)]:[],...t===4||t===12?[Zn("snare",.94,"exact",.92)]:[],...[2,6,8,11,14].includes(t)?[Zn("hatClosed",.68,"late",.36)]:[],...t===15?[Zn("hatOpen",.58,"late",.22)]:[],...t===3||t===9?[Zn("perc",.68,"early",.22)]:[]]:e==="broken_lilt"?[...[0,6,11,14].includes(t)?[Zn("kick",t===14?.76:1,t===6?"early":"exact",t===14?.72:1)]:[],...t===4||t===13?[Zn("snare",.88,t===13?"late":"exact",.86)]:[],...[1,3,7,9,12,15].includes(t)?[Zn("hatClosed",.66,"late",.34)]:[],...t===8?[Zn("clap",.68,"late",.24)]:[],...t===10?[Zn("perc",.7,"early",.24)]:[]]:[]}function e2e(e,t,n=16,r){const a=kL(e,t,n,r);a.sourceKind="static";for(let o=0;o<a.bars;o+=1){const i=o*a.segmentsPerBar;for(let s=0;s<16;s+=1){const l=PL(e,s),c=WA(s,a.segmentsPerBar);l.forEach(d=>B9(a,i+c,d))}}return a}function Nf(e,t,n){B9(e,t,n)}function t2e(e){const{pattern:t,bars:n}=e,r=kL(t,n,e.segmentsPerBar??16,e.segmentMarkers);r.sourceKind="rhythmforge";const a=Math.max(1,Math.round(n)),o=Number.isFinite(e.seed)?Math.floor(e.seed):74123,i=Number.isFinite(e.rootHz)?e.rootHz:55,s=Number.isFinite(e.baseSwing)?e.baseSwing:.38,l=e.descriptors??JCe,c=ZCe(t);for(let d=0;d<a;d+=1){const p=gT({barIndex:d,seed:o,rootHz:i,baseSwing:s,descriptors:l,flavor:c}),f=d*r.segmentsPerBar;p.kick.forEach((b,g)=>{if(!b.active)return;const y=WA(g,r.segmentsPerBar);Nf(r,f+y,{laneId:"kick",intensity:Math.max(.54,Math.min(1,b.accent||.8))})}),p.snare.forEach((b,g)=>{if(!b.active)return;const y=Math.max(.42,Math.min(1,b.accent||.74)),x=WA(g,r.segmentsPerBar);Nf(r,f+x,{laneId:"snare",intensity:y}),y>.78&&(g===12||g===15)&&Nf(r,f+x,{laneId:"clap",intensity:Math.max(.34,y*.74)})}),p.hat.forEach((b,g)=>{if(!b.active)return;const y=Math.max(.22,Math.min(1,b.accent||.5)),x=WA(g,r.segmentsPerBar);Nf(r,f+x,{laneId:"hatClosed",intensity:Math.max(.32,y)}),y>.7&&(g%8===7||g===15)&&Nf(r,f+x,{laneId:"hatOpen",intensity:Math.max(.28,y*.82)}),y>.6&&g%4===3&&Nf(r,f+x,{laneId:"perc",intensity:Math.max(.24,y*.68)})})}return r}function IL(e){return eR(e.pattern)?t2e(e):e2e(e.pattern,e.bars,e.segmentsPerBar??16,e.segmentMarkers??_S(e.segmentsPerBar??16))}const Kn={edge:.46,softness:.58,air:.5,snap:.48,swing:.38,pan:0,decayScale:1,chokeGroup:"none"},Ql=(e,t,n)=>Math.min(n,Math.max(t,e)),Pn=(e,t,n)=>e+(t-e)*n,Gb={dusty_tape:{kickPitchStart:128,kickPitchEnd:38,kickDecay:.18,kickDrive:1.7,kickOsc:"sine",kickClickHz:1580,snareToneHz:180,snareNoiseHz:2400,snareOsc:"triangle",hatHz:7600,hatDecay:.075,hatOscA:"square",hatOscB:"triangle",hatMetalMix:1,hatNoiseMix:1,noiseColor:.85,clapBursts:3,clapSpacing:.012,percRatio:1.33,percOsc:"sine",percDecay:.1},membrane_box:{kickPitchStart:112,kickPitchEnd:30,kickDecay:.22,kickDrive:1.4,kickOsc:"sine",kickClickHz:1440,snareToneHz:208,snareNoiseHz:2100,snareOsc:"sine",hatHz:6900,hatDecay:.09,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.86,hatNoiseMix:1.04,noiseColor:.72,clapBursts:3,clapSpacing:.013,percRatio:1.18,percOsc:"sine",percDecay:.11},glass_metal:{kickPitchStart:142,kickPitchEnd:48,kickDecay:.14,kickDrive:2.1,kickOsc:"triangle",kickClickHz:1920,snareToneHz:250,snareNoiseHz:3600,snareOsc:"triangle",hatHz:9800,hatDecay:.055,hatOscA:"triangle",hatOscB:"triangle",hatMetalMix:1.18,hatNoiseMix:.86,noiseColor:1,clapBursts:3,clapSpacing:.011,percRatio:1.72,percOsc:"triangle",percDecay:.085},asphalt_punch:{kickPitchStart:154,kickPitchEnd:41,kickDecay:.16,kickDrive:2.45,kickOsc:"sine",kickClickHz:1980,snareToneHz:196,snareNoiseHz:2820,snareOsc:"triangle",hatHz:8400,hatDecay:.06,hatOscA:"square",hatOscB:"sawtooth",hatMetalMix:1.2,hatNoiseMix:.82,noiseColor:.78,clapBursts:4,clapSpacing:.009,percRatio:1.26,percOsc:"triangle",percDecay:.08},velvet_breaks:{kickPitchStart:102,kickPitchEnd:28,kickDecay:.24,kickDrive:1.18,kickOsc:"sine",kickClickHz:1260,snareToneHz:164,snareNoiseHz:1820,snareOsc:"sine",hatHz:6e3,hatDecay:.11,hatOscA:"triangle",hatOscB:"sine",hatMetalMix:.52,hatNoiseMix:1.08,noiseColor:.6,clapBursts:3,clapSpacing:.014,percRatio:1.08,percOsc:"sine",percDecay:.14},neon_arc:{kickPitchStart:136,kickPitchEnd:52,kickDecay:.13,kickDrive:1.95,kickOsc:"triangle",kickClickHz:2380,snareToneHz:282,snareNoiseHz:4220,snareOsc:"square",hatHz:11e3,hatDecay:.05,hatOscA:"sawtooth",hatOscB:"triangle",hatMetalMix:1.42,hatNoiseMix:.74,noiseColor:1.05,clapBursts:5,clapSpacing:.007,percRatio:1.88,percOsc:"triangle",percDecay:.068},bronze_static:{kickPitchStart:118,kickPitchEnd:34,kickDecay:.21,kickDrive:1.62,kickOsc:"triangle",kickClickHz:1710,snareToneHz:228,snareNoiseHz:3040,snareOsc:"triangle",hatHz:8800,hatDecay:.08,hatOscA:"triangle",hatOscB:"square",hatMetalMix:1.26,hatNoiseMix:.92,noiseColor:.92,clapBursts:4,clapSpacing:.011,percRatio:1.62,percOsc:"triangle",percDecay:.11},resin_tom:{kickPitchStart:96,kickPitchEnd:26,kickDecay:.26,kickDrive:1.34,kickOsc:"sine",kickClickHz:1180,snareToneHz:146,snareNoiseHz:1620,snareOsc:"sine",hatHz:5200,hatDecay:.12,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.4,hatNoiseMix:1.16,noiseColor:.56,clapBursts:2,clapSpacing:.016,percRatio:.94,percOsc:"sine",percDecay:.16},paper_spark:{kickPitchStart:126,kickPitchEnd:44,kickDecay:.15,kickDrive:1.52,kickOsc:"triangle",kickClickHz:2120,snareToneHz:214,snareNoiseHz:3380,snareOsc:"square",hatHz:9700,hatDecay:.045,hatOscA:"square",hatOscB:"triangle",hatMetalMix:.98,hatNoiseMix:1.22,noiseColor:1,clapBursts:4,clapSpacing:.008,percRatio:1.44,percOsc:"triangle",percDecay:.072}},n2e=new ML(64,e=>{const n=new Float32Array(1024);for(let r=0;r<1024;r+=1){const a=r/1023*2-1;n[r]=Math.tanh(a*e)}return n});function hk(e){return n2e.get(Ql(e,.5,8))}function r2e(e){const t=e.sampleRate,n=e.createBuffer(1,t,e.sampleRate),r=n.getChannelData(0);for(let a=0;a<t;a+=1){const o=Math.random()*2-1;r[a]=o*(.6+Math.random()*.4)}return n}const fk=(e,t,n,r,a)=>{const o=Math.max(2e-4,n);e.gain.cancelScheduledValues(t),e.gain.setValueAtTime(1e-4,t),e.gain.linearRampToValueAtTime(o,t+Math.max(.0012,r)),e.gain.setTargetAtTime(1e-4,t+Math.max(.0012,r),Math.max(.004,a))},tO=e=>({edge:Ql(e?.edge??Kn.edge,0,1),softness:Ql(e?.softness??Kn.softness,0,1),air:Ql(e?.air??Kn.air,0,1),snap:Ql(e?.snap??Kn.snap,0,1),swing:Ql(e?.swing??Kn.swing,0,1),pan:Ql(e?.pan??Kn.pan,-1,1),decayScale:Ql(e?.decayScale??Kn.decayScale,.25,2),chokeGroup:e?.chokeGroup==="hat"?"hat":"none"});function __drumLegacySynth(e,t,sharedNoise,primeFilters=false){const n=sharedNoise??r2e(e);const initFilter=(param,value,time)=>{if(primeFilters)param.value=value;param.setValueAtTime(value,time)};let r=null;const a=(g,y,x)=>{if(typeof e.createStereoPanner=="function"){const A=e.createStereoPanner();return A.pan.setValueAtTime(Ql(y,-1,1),x),g.connect(A),A.connect(t),A}return g.connect(t),null},o=(g,y,x=.012)=>{g&&(g.gain.cancelScheduledValues(y),g.gain.setTargetAtTime(1e-4,y,Math.max(.002,x)))},i=()=>{const g=e.createBufferSource();return g.buffer=n,g},s=(g,y,x,A)=>{const M=Gb[x],v=e.createOscillator(),w=e.createGain(),R=i(),k=e.createBiquadFilter(),I=e.createGain(),E=e.createGain(),F=e.createWaveShaper(),L=e.createBiquadFilter();v.type=M.kickOsc,v.connect(w),w.connect(E),R.connect(k),k.connect(I),I.connect(E),E.connect(F),F.connect(L),a(L,A.pan,g);const B=M.kickDrive*Pn(.78,1.22,A.edge),O=M.kickDecay*A.decayScale*Pn(1.18,.84,A.snap)*Pn(1.16,.9,1-A.softness);F.curve=hk(B),L.type="lowpass",initFilter(L.frequency,M.kickPitchStart*Pn(5.4,6.8,A.air),g),L.frequency.exponentialRampToValueAtTime(Math.max(140,M.kickPitchEnd*Pn(6.2,7.6,A.air)),g+O),v.frequency.setValueAtTime(M.kickPitchStart,g),v.frequency.exponentialRampToValueAtTime(M.kickPitchEnd,g+O),w.gain.setValueAtTime(Math.max(1e-4,y),g),w.gain.exponentialRampToValueAtTime(1e-4,g+O),k.type="highpass",initFilter(k.frequency,M.kickClickHz+B*180+A.air*720,g),I.gain.setValueAtTime(y*Pn(.08,.22,A.snap),g),I.gain.exponentialRampToValueAtTime(1e-4,g+Pn(.024,.012,A.snap)),v.start(g),v.stop(g+O+.02),R.start(g),R.stop(g+.02)},l=(g,y,x,A)=>{const M=Gb[x],v=e.createOscillator(),w=e.createGain(),R=i(),k=e.createBiquadFilter(),I=e.createBiquadFilter(),E=e.createGain(),F=e.createWaveShaper(),L=e.createGain();v.type=M.snareOsc,v.connect(w),w.connect(F),R.connect(k),k.connect(I),I.connect(E),E.connect(F),F.connect(L),a(L,A.pan,g),F.curve=hk(Pn(1.05,2.1,(A.edge+A.snap)*.5)),v.frequency.setValueAtTime(M.snareToneHz*Pn(.92,1.12,A.snap),g),v.frequency.exponentialRampToValueAtTime(M.snareToneHz*Pn(.5,.72,A.softness),g+Pn(.08,.13,A.softness)*A.decayScale),w.gain.setValueAtTime(y*Pn(.18,.34,A.snap),g),w.gain.exponentialRampToValueAtTime(1e-4,g+Pn(.08,.14,A.softness)*A.decayScale),k.type="bandpass",initFilter(k.frequency,M.snareNoiseHz*Pn(.82,1.18,A.air),g),initFilter(k.Q,.7+M.noiseColor*.75+A.snap*.3,g),I.type="highpass",initFilter(I.frequency,1100+M.noiseColor*700+A.air*1200,g),E.gain.setValueAtTime(y*Pn(.42,.78,A.edge),g),E.gain.exponentialRampToValueAtTime(1e-4,g+Pn(.21,.12,A.snap)*A.decayScale),L.gain.setValueAtTime(1,g),L.gain.exponentialRampToValueAtTime(1e-4,g+Pn(.28,.18,A.snap)*A.decayScale),v.start(g),v.stop(g+.16),R.start(g),R.stop(g+.2)},c=(g,y,x,A,M=!1)=>{const v=Gb[x],w=i(),R=e.createBiquadFilter(),k=e.createBiquadFilter(),I=e.createBiquadFilter(),E=e.createOscillator(),F=e.createOscillator(),L=e.createGain(),B=e.createGain(),O=e.createGain(),T=e.createWaveShaper(),_=e.createGain();w.connect(R),R.connect(k),k.connect(I),I.connect(B),B.connect(O),E.type=v.hatOscA,F.type=v.hatOscB,E.connect(L),F.connect(L),L.connect(O),O.connect(T),T.connect(_),a(_,A.pan,g);const G=v.hatHz*Pn(.78,1.14,A.air)*(M?.92:.84);R.type="highpass",initFilter(R.frequency,G*Pn(.5,.7,A.air),g),k.type="bandpass",initFilter(k.frequency,G,g),initFilter(k.Q,Pn(.55,.95,A.edge)*(M?.9:1),g),I.type="lowpass",initFilter(I.frequency,Math.min(12e3,G*Pn(.95,1.32,A.air)*(M?1.12:1)),g),initFilter(I.Q,.25+A.edge*.12,g),B.gain.setValueAtTime(v.hatNoiseMix,g),E.frequency.setValueAtTime(G*.43,g),F.frequency.setValueAtTime(G*.57,g),fk(L,g,y*Pn(.04,.12,A.edge)*v.hatMetalMix,Pn(.0032,.0012,A.snap),(M?Pn(.042,.02,A.snap):Pn(.026,.012,A.snap))*A.decayScale),T.curve=hk(Pn(.72,1.8,A.edge)),fk(_,g,y*(M?.2:.15)*Pn(.85,1.12,A.air),Pn(.0034,.0012,1-A.softness),(M?v.hatDecay*Pn(1.18,.76,A.snap):v.hatDecay*Pn(.92,.55,A.snap))*A.decayScale),!M&&A.chokeGroup==="hat"&&o(r,g,.01),M&&A.chokeGroup==="hat"&&(r=_),w.start(g),w.stop(g+(M?.14:.065)),E.start(g),F.start(g),E.stop(g+(M?.14:.065)),F.stop(g+(M?.14:.065));return _},d=(g,y,x,A)=>{const M=Gb[x];Array.from({length:M.clapBursts},(v,w)=>w).forEach(v=>{const w=v*M.clapSpacing,R=i(),k=e.createBiquadFilter(),I=e.createGain();R.connect(k),k.connect(I),a(I,A.pan,g),k.type="highpass",initFilter(k.frequency,M.snareNoiseHz*.75+v*120+A.air*300,g+w),fk(I,g+w,y*Math.max(.04,.12-v*.024)*Pn(.9,1.15,A.snap),Pn(.0022,.0012,A.snap),Pn(.034,.018,A.snap)*A.decayScale),R.start(g+w),R.stop(g+w+.08)})},p=(g,y,x,A)=>{const M=Gb[x],v=e.createOscillator(),w=e.createBiquadFilter(),R=e.createGain();v.type=M.percOsc,v.connect(w),w.connect(R),a(R,A.pan,g),w.type="bandpass",initFilter(w.frequency,520*M.percRatio*Pn(.88,1.2,A.air),g),initFilter(w.Q,3.8+A.edge*1.4,g),v.frequency.setValueAtTime(280*M.percRatio,g),v.frequency.exponentialRampToValueAtTime(180*M.percRatio,g+Pn(M.percDecay,M.percDecay*.7,A.snap)*A.decayScale),R.gain.setValueAtTime(y*Pn(.18,.28,A.snap),g),R.gain.exponentialRampToValueAtTime(1e-4,g+Pn(M.percDecay*1.2,M.percDecay*.82,A.snap)*A.decayScale),v.start(g),v.stop(g+M.percDecay*A.decayScale+.02)},f=(g,y,x,A,M)=>{const v=tO(M),w=Ql(x,0,1.5);if(!(w<=1e-4))switch(g){case"kick":s(y,w,A,v);break;case"snare":l(y,w,A,v);break;case"hat_closed":return c(y,w,A,v,!1);case"hat_open":return c(y,w,A,v,!0);case"clap":d(y,w,A,v);break;case"perc":p(y,w,A,v);break}};return{trigger:f,schedulePattern:(g,y,x,A,M,v,w)=>{const R=tO(v),k=.004+R.swing*.018,I=x+k,E=Math.max(0,x-k*.45),F=PL(g,y);F.length&&F.forEach(L=>{const B=L.timing==="late"?I:L.timing==="early"?E:x,O=L.laneId==="hatClosed"?"hat_closed":L.laneId==="hatOpen"?"hat_open":L.laneId;f(O,B,A*(L.levelMultiplier??1),C0({laneId:L.laneId,globalKit:M,overrides:w}),R)})}}}