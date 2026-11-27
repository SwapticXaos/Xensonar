/* DJ-MATH-01: Pure math & XenSonar Time-Truth / Polymetric calculations for the Mixing Desk.
 * Decoupled from React/DOM so it is unit-tested via node:test and loaded directly in index.html.
 */
const __XenDjMixMath = (() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
      const r = x % y;
      x = y;
      y = r;
    }
    return x || 1;
  }

  function lcm(a, b, cap = 4096) {
    const x = Math.max(1, Math.round(Math.abs(a)));
    const y = Math.max(1, Math.round(Math.abs(b)));
    const res = (x / gcd(x, y)) * y;
    return res > cap ? cap : res;
  }

  /**
   * Convert a positive bar span (integer or fractional/polymetric like 4.5 or 5 + 2/7)
   * into an exact rational representation { whole, remNum, den, totalNum, value }.
   */
  function toRationalBars(rawBars, maxDenom = 64) {
    const val = Math.max(1 / 64, Number.isFinite(Number(rawBars)) && Number(rawBars) > 0 ? Number(rawBars) : 1);
    if (Math.abs(val - Math.round(val)) < 1e-7) {
      const w = Math.max(1, Math.round(val));
      return { whole: w, remNum: 0, den: 1, totalNum: w, value: w };
    }
    let bestNum = Math.round(val);
    let bestDen = 1;
    let bestErr = Math.abs(val - bestNum);
    for (let den = 2; den <= maxDenom; den++) {
      const num = Math.max(1, Math.round(val * den));
      const err = Math.abs(val - num / den);
      if (err < bestErr - 1e-9) {
        bestErr = err;
        bestNum = num;
        bestDen = den;
        if (err < 1e-7) break;
      }
    }
    const g = gcd(bestNum, bestDen);
    const totalNum = bestNum / g;
    const den = bestDen / g;
    const whole = Math.floor(totalNum / den);
    const remNum = totalNum - whole * den;
    return { whole, remNum, den, totalNum, value: totalNum / den };
  }

  /**
   * Resolve effective Room-Bar length of a material track given its own bars & timeMode.
   */
  function effectiveCycleBars(bars, timeMode = 'normal') {
    const factor = timeMode === 'double' ? 0.5 : timeMode === 'half' ? 2 : 1;
    const base = Number.isFinite(Number(bars)) && Number(bars) > 0 ? Number(bars) : 1;
    return Math.max(1 / 64, base * factor);
  }

  /**
   * Format XenSonar Time-Truth metric badge for a loop, preserving segment-native fractions:
   * e.g. 4.5 bars with 4 seg/bar -> "4+2/4B · 4/B", 5+2/7 bars with 7 seg/bar -> "5+2/7B · 7/B".
   */
  function formatMetricSpec({ bars = 1, segmentsPerBar = 4, timeMode = 'normal' } = {}) {
    const eff = effectiveCycleBars(bars, timeMode);
    const segs = Math.max(1, Math.round(Number(segmentsPerBar) || 4));
    const rat = toRationalBars(eff, 64);
    let barText = '';
    if (rat.remNum === 0) {
      barText = rat.whole + 'B';
    } else {
      // If loop's segment subdivision is a clean multiple of the fraction denominator,
      // display remainder in native segment units (e.g. 4 + 2/4 instead of 4 + 1/2).
      const scale = segs % rat.den === 0 ? segs / rat.den : 1;
      const dispNum = rat.remNum * scale;
      const dispDen = rat.den * scale;
      barText = (rat.whole > 0 ? rat.whole + '+' : '') + dispNum + '/' + dispDen + 'B';
    }
    return {
      effectiveBars: rat.value,
      rational: rat,
      segmentsPerBar: segs,
      barText,
      label: barText + ' · ' + segs + '/B',
      isFractional: rat.remNum !== 0
    };
  }

  /**
   * Compute exact polymetric convergence (LCM in shared Room Bars) across active decks.
   * All decks share ONE Room-Bar Time Truth while owning independent bar lengths & segments.
   * LCM(n1/d1, n2/d2) = lcm(n1, n2) / gcd(d1, d2).
   */
  function computePolymetricCycle(barLengths = []) {
    const clean = (Array.isArray(barLengths) ? barLengths : [])
      .map(v => toRationalBars(v, 64))
      .filter(r => r.value > 0);
    if (!clean.length) {
      return { isPolymetric: false, isEqualCycle: true, convergenceBars: 1, convergenceText: '1B', cyclesPerDeck: [] };
    }
    let lcmNum = clean[0].totalNum;
    let gcdDen = clean[0].den;
    let hasFractional = clean[0].remNum !== 0;
    for (let i = 1; i < clean.length; i++) {
      lcmNum = lcm(lcmNum, clean[i].totalNum, 16384);
      gcdDen = gcd(gcdDen, clean[i].den);
      if (clean[i].remNum !== 0) hasFractional = true;
    }
    const g = gcd(lcmNum, gcdDen);
    const convNum = lcmNum / g;
    const convDen = gcdDen / g;
    const convVal = convNum / convDen;
    const allEqual = clean.every(r => Math.abs(r.value - clean[0].value) < 1e-6);
    const maxVal = Math.max(...clean.map(r => r.value));
    const isSimpleMultiple = !hasFractional && clean.every(r => Math.abs((maxVal / r.value) - Math.round(maxVal / r.value)) < 1e-6);
    const isPolymetric = hasFractional || (!allEqual && !isSimpleMultiple);
    const cyclesPerDeck = clean.map(r => Math.max(1, Math.round(convVal / r.value)));
    const convRat = toRationalBars(convVal, 64);
    const convergenceText = convRat.remNum === 0
      ? convRat.whole + 'B'
      : (convRat.whole > 0 ? convRat.whole + '+' : '') + convRat.remNum + '/' + convRat.den + 'B';
    return {
      isPolymetric,
      isEqualCycle: allEqual,
      convergenceBars: convVal,
      convergenceText,
      cyclesPerDeck
    };
  }

  /**
   * Compute a deck's live cyclic phase on the shared Room Bar Clock.
   * attBeats is the per-voice cyclic onset shift in beats (4 beats = 1 Room Bar).
   */
  function cyclePhaseAtBar(globalBar, effectiveBars, segmentsPerBar = 4, attBeats = 0) {
    const span = Math.max(1 / 64, Number(effectiveBars) || 1);
    const segs = Math.max(1, Math.round(Number(segmentsPerBar) || 4));
    const shifted = (Number(globalBar) || 0) - (Number(attBeats) || 0) / 4;
    const pos = ((shifted % span) + span) % span;
    const progress01 = clamp(pos / span, 0, 1);
    const barIndex = Math.floor(pos + 1e-9);
    const barFrac = pos - barIndex;
    const segmentIndex = Math.min(segs - 1, Math.floor(barFrac * segs));
    return { cyclePosBars: pos, progress01, barIndex, barFrac, segmentIndex };
  }

  /**
   * Milliseconds remaining until the next integer Room-Bar boundary.
   */
  function nextRoomBarDelayMs(globalBar, bpm = 120) {
    const safeBpm = clamp(Number(bpm) || 120, 30, 300);
    const barMs = (60000 / safeBpm) * 4;
    const frac = ((Number(globalBar) || 0) % 1 + 1) % 1;
    const remainBars = frac < 1e-4 ? 1 : (1 - frac);
    return Math.round(remainBars * barMs);
  }

  /**
   * Equal-power / Linear / Sharp-Cut DJ crossfader gain law.
   * pos in [0..1]: 0 = full Bus A, 0.5 = center, 1 = full Bus B.
   */
  function crossfadeGains(pos, curve = 'smooth') {
    const x = clamp(Number(pos), 0, 1);
    if (curve === 'linear') {
      return {
        A: clamp(1 - x, 0, 1),
        B: clamp(x, 0, 1)
      };
    }
    if (curve === 'cut') {
      return {
        A: x >= 0.9 ? clamp((1 - x) / 0.1, 0, 1) : 1,
        B: x <= 0.1 ? clamp(x / 0.1, 0, 1) : 1
      };
    }
    // 'smooth': smooth equal-power contour preserving unity at center (0.5 -> 1.0/1.0)
    const a = x <= 0.5 ? 1 : Math.cos(((x - 0.5) / 0.5) * (Math.PI / 2));
    const b = x >= 0.5 ? 1 : Math.sin((x / 0.5) * (Math.PI / 2));
    return {
      A: clamp(a, 0, 1),
      B: clamp(b, 0, 1)
    };
  }

  /**
   * Musical bar-synced transition duration (supports fractional bars too, e.g. 4.5 or 5+2/7).
   */
  function barsToMs(bars, bpm = 120, beatsPerBar = 4) {
    const safeBpm = clamp(Number(bpm) || 120, 30, 300);
    const safeBars = clamp(Number(bars) || 1, 0.25, 64);
    const safeBeats = clamp(Number(beatsPerBar) || 4, 1, 16);
    return Math.round(safeBars * safeBeats * (60000 / safeBpm));
  }

  /**
   * Synthesize a smooth 360-point XenSonar EQ curve (log-spaced 20 Hz .. 20 kHz)
   * from continuous 3-band isolator values + kill switches.
   */
  function synthesize3BandCurve({ low = 0, mid = 0, high = 0, killLow = false, killMid = false, killHigh = false } = {}) {
    const lv = killLow ? -1 : clamp(low, -1, 0.5);
    const mv = killMid ? -1 : clamp(mid, -1, 0.5);
    const hv = killHigh ? -1 : clamp(high, -1, 0.5);
    const out = new Array(360);
    const x1 = 131; // ~250 Hz
    const x2 = 257; // ~2.8 kHz
    const w = 22;   // crossover transition half-width (smooth S-blend)
    const smoothstep = (edge0, edge1, x) => {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    };
    for (let i = 0; i < 360; i++) {
      const wLow = 1 - smoothstep(x1 - w, x1 + w, i);
      const wHigh = smoothstep(x2 - w, x2 + w, i);
      const wMid = Math.max(0, 1 - wLow - wHigh);
      out[i] = clamp(wLow * lv + wMid * mv + wHigh * hv, -1, 1);
    }
    return out;
  }

  function bandPresetValues(preset) {
    switch (preset) {
      case 'low':
        return { low: 0.14, mid: -0.78, high: -0.95, killLow: false, killMid: false, killHigh: false };
      case 'mid':
        return { low: -0.92, mid: 0.16, high: -0.82, killLow: false, killMid: false, killHigh: false };
      case 'air':
        return { low: -0.95, mid: -0.68, high: 0.2, killLow: false, killMid: false, killHigh: false };
      case 'scoop':
        return { low: 0.12, mid: -0.64, high: 0.14, killLow: false, killMid: false, killHigh: false };
      case 'full':
      default:
        return { low: 0, mid: 0, high: 0, killLow: false, killMid: false, killHigh: false };
    }
  }

  function autoCarvePockets(deckIds) {
    const ids = Array.isArray(deckIds) ? deckIds : [];
    const n = ids.length;
    const plan = {};
    if (n === 0) return plan;
    if (n === 1) {
      plan[ids[0]] = bandPresetValues('full');
      return plan;
    }
    const templates = {
      2: ['low', 'air'],
      3: ['low', 'mid', 'air'],
      4: ['low', 'mid', 'air', 'scoop'],
      5: ['low', 'mid', 'air', 'scoop', 'mid'],
      6: ['low', 'mid', 'air', 'scoop', 'low', 'air']
    };
    const seq = templates[Math.min(6, n)] || templates[6];
    ids.forEach((id, idx) => {
      const base = bandPresetValues(seq[idx % seq.length]);
      if (idx === 4) { base.low = -0.55; base.mid = 0.08; base.high = -0.35; }
      if (idx === 5) { base.low = -0.95; base.mid = -0.35; base.high = 0.24; }
      plan[id] = base;
    });
    return plan;
  }

  function effectiveDeckMultiplier({ bus = 'THRU', muted = false, soloId = null, id = '', crossfade = 0.5, curve = 'smooth' } = {}) {
    if (muted) return 0;
    if (soloId && soloId !== id) return 0;
    if (bus === 'A' || bus === 'B') {
      const g = crossfadeGains(crossfade, curve);
      return g[bus];
    }
    return 1;
  }

  function compactTrackLabel(raw) {
    const full = String(raw || '').trim();
    if (!full) return { primary: 'Untitled', group: '' };
    const sep = full.includes('·') ? '·' : full.includes('—') ? '—' : null;
    if (sep) {
      const parts = full.split(sep).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { primary: parts[parts.length - 1], group: parts.slice(0, -1).join(' · ') };
      }
    }
    return { primary: full, group: '' };
  }

  /**
   * Exact WebAudio loop phase in [0..1) matching XenSonar's __xenMaterialLoopPhaseSec.
   * elapsedSec is __XenLiveTempo.warpElapsed(ctx.currentTime, originSec, bpm).
   * attBeats uses XenSonar's exact sign convention: positive att shifts onset later (reads earlier in loop).
   */
  function computeAudioPhase01({ elapsedSec = 0, durationSec = 1, attBeats = 0, bpm = 120 } = {}) {
    const dur = Math.max(1e-4, Number(durationSec) || 1);
    const safeBpm = Math.max(40, Number.isFinite(Number(bpm)) && Number(bpm) > 0 ? Number(bpm) : 120);
    const shiftSec = -(Number.isFinite(Number(attBeats)) ? Number(attBeats) : 0) * (60 / safeBpm);
    const raw = (Number(elapsedSec) || 0) + shiftSec;
    const pos = ((raw % dur) + dur) % dur;
    return clamp(pos / dur, 0, 1);
  }

  /**
   * Compute bar & segment ruler geometry for a loop's progress bar.
   * Supports whole bars (e.g. 4B), sub-bar fractions (e.g. 1/2B), and polymetric
   * fractional bars (e.g. 4+2/4B or 5+2/7B) with delicate segment subdivisions.
   */
  function buildBarRulerGeometry({ effectiveBars = 1, segmentsPerBar = 4 } = {}) {
    const span = Math.max(1 / 64, Number(effectiveBars) || 1);
    const segs = Math.max(1, Math.min(32, Math.round(Number(segmentsPerBar) || 4)));
    const rat = toRationalBars(span, segs);
    const wholeBars = rat.whole;
    const fracBars = rat.remNum > 0 ? (rat.remNum / rat.den) : 0;
    const totalBars = wholeBars + fracBars;
    const wholeRatio = totalBars > 0 ? clamp(wholeBars / totalBars, 0, 1) : 1;
    const fracRatio = clamp(1 - wholeRatio, 0, 1);
    // Show subtle hair-thin segment ticks inside bars when visually legible
    const displayBars = Math.min(16, wholeBars);
    const showWholeSegTicks = segs > 1 && wholeBars > 0 && wholeBars <= 8 && (wholeBars * segs) <= 48;
    const fracSegTicks = fracBars > 0 ? Math.max(1, Math.min(16, Math.round(fracBars * segs))) : 0;
    return {
      wholeBars,
      displayBars,
      fracBars,
      fracRatio,
      wholeRatio,
      segmentsPerBar: segs,
      showWholeSegTicks,
      fracSegTicks,
      isSubBar: wholeBars === 0 && fracBars > 0
    };
  }

  /**
   * Smoothly interpolate two 360-point XenSonar EQ curves for Mix Scene recalls.
   */
  function lerpEqCurves(fromCurve, toCurve, t) {
    const k = clamp(Number(t) || 0, 0, 1);
    const len = 360;
    const out = new Array(len);
    for (let i = 0; i < len; i++) {
      const a = Number(fromCurve?.[i]) || 0;
      const b = Number(toCurve?.[i]) || 0;
      out[i] = clamp(a + (b - a) * k, -1, 1);
    }
    return out;
  }

  /* DJ-SEEK-01: transport maths for bar jumps and segment steps on a cyclic loop.
   * att is XenSonar's per-voice cyclic onset shift in beats: playhead = elapsed − att·beat.
   * Positive "ahead" (= −att) means the loop plays further into itself than the room grid.
   * Every result is normalised to the shortest cyclic offset in (−L/2, L/2]. */
  function wrapCyclic(v, L) {
    const x = Number(v) || 0;
    if (!(L > 0)) return x;
    let r = ((x % L) + L) % L;
    if (r > L / 2 + 1e-9) r -= L;
    return Math.abs(r) < 1e-9 ? 0 : r;
  }

  function loopGrid({ loopBeats, effectiveBars, segmentsPerBar } = {}) {
    const eff = Number(effectiveBars) > 0 ? Number(effectiveBars) : 1;
    const L = Number(loopBeats) > 0 ? Number(loopBeats) : eff * 4;
    const barBeats = L / eff;
    const segs = Math.max(1, Math.round(Number(segmentsPerBar) || 4));
    return { L, eff, barBeats, segsPerBar: segs, segBeats: barBeats / segs, barCount: Math.max(1, Math.ceil(eff - 1e-6)) };
  }

  /** Index of the bar cell under ratio 0…1 of the loop ruler (the fractional tail is its own cell). */
  function barAtRatio(ratio, effectiveBars) {
    const eff = Number(effectiveBars) > 0 ? Number(effectiveBars) : 1;
    const count = Math.max(1, Math.ceil(eff - 1e-6));
    return Math.max(0, Math.min(count - 1, Math.floor(clamp(Number(ratio), 0, 1) * eff + 1e-9)));
  }

  /** Jump into bar `targetBar` and keep the position inside the bar: the loop stays on the room grid. */
  function planBarJump({ att = 0, progress01 = 0, targetBar = 0, ...grid } = {}) {
    const g = loopGrid(grid);
    const pos = clamp(Number(progress01), 0, 1) * g.L;
    const fromBar = Math.min(g.barCount - 1, Math.floor(pos / g.barBeats + 1e-9));
    let inBar = Math.max(0, pos - fromBar * g.barBeats);
    const toBar = Math.max(0, Math.min(g.barCount - 1, Math.round(Number(targetBar) || 0)));
    const room = g.L - toBar * g.barBeats; // a fractional last bar is shorter
    if (inBar >= room - 1e-9) inBar = room > 1e-9 ? inBar % room : 0;
    const deltaBeats = toBar * g.barBeats + inBar - pos;
    return { att: wrapCyclic((Number(att) || 0) - deltaBeats, g.L), fromBar, toBar, deltaBeats };
  }

  /** One segment forward (direction > 0, plays ahead) or back (direction < 0). */
  function planSegmentStep({ att = 0, direction = 1, ...grid } = {}) {
    const g = loopGrid(grid);
    const step = (Number(direction) < 0 ? -1 : 1) * g.segBeats;
    return { att: wrapCyclic((Number(att) || 0) - step, g.L), stepBeats: step };
  }

  /** Human label of a phase offset: "0", "+1B", "−2S", "+1B 2S", "+0.37S" (B = bar, S = segment). */
  function formatPhaseOffset(att, grid = {}) {
    const g = loopGrid(grid);
    const ahead = -(Number(att) || 0);
    if (Math.abs(ahead) < 1e-4) return '0';
    const sign = ahead > 0 ? '+' : '−';
    const segs = Math.abs(ahead) / g.segBeats;
    const whole = Math.round(segs);
    if (Math.abs(segs - whole) > 0.005) return sign + segs.toFixed(2) + 'S';
    const bars = Math.floor(whole / g.segsPerBar);
    const rest = whole - bars * g.segsPerBar;
    return sign + (bars ? bars + 'B' : '') + (bars && rest ? ' ' : '') + (rest ? rest + 'S' : '');
  }

  return Object.freeze({
    wrapCyclic,
    loopGrid,
    barAtRatio,
    planBarJump,
    planSegmentStep,
    formatPhaseOffset,
    clamp,
    lerp,
    easeInOutSine,
    gcd,
    lcm,
    toRationalBars,
    effectiveCycleBars,
    formatMetricSpec,
    computePolymetricCycle,
    cyclePhaseAtBar,
    nextRoomBarDelayMs,
    computeAudioPhase01,
    buildBarRulerGeometry,
    lerpEqCurves,
    crossfadeGains,
    barsToMs,
    synthesize3BandCurve,
    bandPresetValues,
    autoCarvePockets,
    effectiveDeckMultiplier,
    compactTrackLabel
  });
})();
