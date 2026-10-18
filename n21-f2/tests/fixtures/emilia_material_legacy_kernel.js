/* Serializable factory. The exact same DSP runs offline and inside AudioWorklet. */
function createNodalSynthesisKernel() {
  const TWO_PI = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function hash(text, seed) { let h = seed >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0 || 1; }
  // Original coupled-modal synthesis from Emilia 1/2; a bounded offline lease
  // is the only opt-in extension needed by the Carrier renderer.
  function voice(plan, options = {}, sampleRate = 48000) {
    if (plan?.schema !== 'xensonar.nodal-plan' || plan.kernelVersion !== 'coupled-modal-v1') throw new Error('Invalid Nodal plan');
    if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid sample rate');
    const frequency = options.frequency ?? 220;
    if (!Number.isFinite(frequency) || frequency < 5 || frequency > 12000) throw new Error('Invalid note frequency');
    const velocity = options.velocity ?? .7;
    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) throw new Error('Invalid velocity');
    if (options.durationSec != null && (!Number.isFinite(options.durationSec) || options.durationSec < .02 || options.durationSec > 30)) throw new Error('Invalid note duration');
    if (options.gain != null && (!Number.isFinite(options.gain) || options.gain < 0 || options.gain > 1)) throw new Error('Invalid note gain');
    for (const key of ['attackSec', 'releaseSec']) if (options[key] != null && (!Number.isFinite(options[key]) || options[key] < 0 || options[key] > 3)) throw new Error('Invalid note fade');
    const n = plan.nodes.length, size = n * 3, oversampling = plan.nonlinearNodes.length ? 2 : 1, sr = sampleRate * oversampling;
    const real = new Float64Array(size), imag = new Float64Array(size), deltas = new Float64Array(n), sources = new Float64Array(n);
    const cos = new Float64Array(size), sin = new Float64Array(size), mask = new Float64Array(size), damping = new Float64Array(size);
    const timbreEnv=new Float64Array(n),timbreStep=new Float64Array(n);
    const harmonicMasks=new Float64Array(n*6),modeOscR=new Float64Array(size),modeOscI=new Float64Array(size);
    const phase = new Float64Array(n), noise = new Uint32Array(n), noiseLow = new Float64Array(n), phaseCos = new Float64Array(n), phaseSin = new Float64Array(n);
    const oscReal = new Float64Array(n), oscImag = new Float64Array(n);
    let root = frequency, targetRoot = frequency, age = 0, released = false, releaseAge = 0, releaseLevel = 1, ended = plan.silent;
    let lastEnvelope = 0, dcX = 0, dcY = 0, lp1 = 0, lp2 = 0, controlCounter = 0, faults = 0;
    const held = options.held === true, duration = clamp(options.durationSec ?? plan.articulation.durationSec, .02, 30);
    const gain = clamp(options.gain ?? .7, 0, 1), attack = Math.max(1, Math.round(clamp(options.attackSec ?? plan.articulation.attackSec, .001, 2) * sr));
    const volumeCurve = options.volumeCurve ?? plan.articulation.volumeCurve, pitchCurve = options.pitchCurve ?? plan.articulation.pitchCurve;
    for (const curve of [volumeCurve, pitchCurve]) if (curve && (!Array.isArray(curve) || curve.length > 512 || !curve.every(Number.isFinite))) throw new Error('Invalid note contour');
    const release = Math.max(1, Math.round(clamp(options.releaseSec ?? plan.articulation.releaseSec, .001, 3) * sr));
    // Optional bounded offline lease for hybrid Emilia; legacy live callers retain the 30 s watchdog.
    const offlineLease = Number.isFinite(options.offlineDurationSec) && options.offlineDurationSec > 0 && options.offlineDurationSec <= 601
      ? options.offlineDurationSec : null;
    const gateFrames = Math.round(duration * sr), watchdogFrames = Math.round((offlineLease ?? 30) * sr);
    // Two cascaded one-pole filters at the oversampled rate precede decimation.
    const lp = 1 - Math.exp(-TWO_PI * sampleRate * .34 / sr);
    for(let k=0;k<size;k++){modeOscR[k]=Math.cos(k*2.3999632297);modeOscI[k]=Math.sin(k*2.3999632297);}
    for (let i = 0; i < n; i++) {
      noise[i] = hash(plan.nodes[i].id, (options.seed ?? plan.seed) >>> 0);
      phase[i] = (noise[i] % 4096) / 4096 * TWO_PI;
      oscReal[i] = Math.cos(phase[i]); oscImag[i] = Math.sin(phase[i]);
      timbreEnv[i]=1;
      const profile=plan.emiliaExcitation?.[i];
      timbreStep[i]=profile?.transientSec ? Math.exp(-1/(sr*profile.transientSec)) : 1;

    }
    for (let band = 0; band < 3; band++) for (let j = 0; j < n; j++) damping[band * n + j] = Math.exp(-plan.bands[band].decayRates[j] / sr);
    function coefficients() {
      const pitchedRoot = root * Math.pow(2, curveAt(pitchCurve, Math.min(1, age / Math.max(1, gateFrames)), 0) / 12);
      for (let band = 0; band < 3; band++) for (let i = 0; i < n; i++) {
        const k = band * n + i, pitchedHz = pitchedRoot * plan.bands[band].frequencies[i];
        const fixed=plan.emiliaFixedModes?.[band]?.[i];
        const hz=fixed&&fixed.mix>0?Math.exp(Math.log(pitchedHz)*(1-fixed.mix)+Math.log(fixed.hz)*fixed.mix):pitchedHz;
        const a = TWO_PI * hz / sr; cos[k] = Math.cos(a); sin[k] = Math.sin(a);
        mask[k] = clamp((sampleRate * .47 - hz) / (sampleRate * .08), 0, 1);
      }
      for (let i = 0; i < n; i++) { const baseHz=pitchedRoot * plan.nodes[i].ratio * plan.nodes[i].partials[0]; const a=TWO_PI*baseHz/sr; phaseCos[i]=Math.cos(a); phaseSin[i]=Math.sin(a);
        if(plan.emiliaExcitation?.[i])for(let harmonic=1;harmonic<=6;harmonic++){
          harmonicMasks[i*6+harmonic-1]=clamp((sr*.45-baseHz*harmonic)/(sr*.09),0,1);
        }
      }
    }
    function curveAt(curve, position, fallback) {
      if (!curve?.length) return fallback;
      const point = clamp(position, 0, 1) * (curve.length - 1), index = Math.floor(point), next = Math.min(index + 1, curve.length - 1);
      return curve[index] + (curve[next] - curve[index]) * (point - index);
    }
    coefficients();
    function noteOff() { if (!released) { released = true; releaseAge = 0; releaseLevel = lastEnvelope; } }
    function setFrequency(hz) { if (!Number.isFinite(hz) || hz < 5 || hz > 12000) return false; targetRoot = hz; return true; }
    function sample() {
      if (ended) return 0;
      if (!released && (age >= watchdogFrames || (!held && age >= gateFrames))) noteOff();
      if ((controlCounter++ & 15) === 0 && (pitchCurve || Math.abs(targetRoot - root) > 1e-8)) {
        if (Math.abs(targetRoot - root) > 1e-8) root *= Math.pow(targetRoot / root, 1 - Math.exp(-16 / (sr * .006))); coefficients();
      }
      let envelope = Math.min(1, age / attack);
      if (released) { envelope = releaseLevel * Math.max(0, 1 - releaseAge / release); if (releaseAge++ >= release) { ended = true; return 0; } }
      lastEnvelope = envelope;
      const driven = !released && (plan.excitation.kind !== 'impulse' || age < sr * .004);
      if (driven) for (let i = 0; i < n; i++) {
        const program = plan.nodes[i]; let source = 0;
        if (plan.excitation.kind === 'tone') {
          const r = oscReal[i], q = oscImag[i]; oscReal[i] = r * phaseCos[i] - q * phaseSin[i]; oscImag[i] = r * phaseSin[i] + q * phaseCos[i];
          // Emilia-only material excitation. Relationship-shaped harmonic drive
          // feeds the SAME modal eigenmodes as the original source, rather than
          // piling a parallel oscillator/effect on the output.
          const color = plan.emiliaExcitation?.[i];
          if (color?.partials) {
            // Six bandlimited Chebyshev partials excite the existing modal
            // body. Their strengths come from geometry, not the played pitch.
            const c=oscReal[i],partials=color.partials;
            let prev=1,now=c,excited=partials[0]*c*harmonicMasks[i*6];
            for(let h=2;h<=partials.length;h++){
              const next=2*c*now-prev;prev=now;now=next;
              excited+=partials[h-1]*next*harmonicMasks[i*6+h-1];
            }
            const sustain=color.sustain+(1-color.sustain)*timbreEnv[i];
            timbreEnv[i]*=timbreStep[i];
            source=excited*color.scale*sustain*.0018*48000/sr;
          } else if (color) {
            const c1=oscReal[i],c2=2*c1*c1-1,c3=(4*c1*c1-3)*c1;
            source = (c1+color.second*c2+color.third*c3)*color.scale*.0018*48000/sr;
          } else source = oscReal[i] * .0018 * 48000 / sr;
          if (age < sr * .002) source += Math.cos(phase[i]) * .04 * 48000 / sr * Math.exp(-age / (sr * .0006));
        } else {
          let z = noise[i]; z ^= z << 13; z ^= z >>> 17; z ^= z << 5; noise[i] = z >>> 0;
          const rnd = noise[i] / 2147483648 - 1;
          noiseLow[i] += (.03 + program.brightness * .25) * (rnd - noiseLow[i]);
          source = plan.excitation.kind === 'breath' ? noiseLow[i] * .008 * 48000 / sr : noiseLow[i] * .24 * 48000 / sr * Math.exp(-age / (sr * .001));
        }
        sources[i] = source * program.excitation * plan.excitation.level * velocity;
      }
      let out = 0;
      for (let band = 0; band < 3; band++) {
        const basis = plan.bands[band].vectors, offset = band * n, level = band === 0 ? 1 : band === 1 ? .22 : .08;
        for (let j = 0; j < n; j++) {
          let input = 0;
          if (driven) for (let i = 0; i < n; i++) input += basis[i * n + j] * sources[i] * level;
          const k = offset + j;
          if (plan.emiliaModeDrive?.[band]?.[j]) {
            // Excite the graph's *collective* eigenmode directly; this is still
            // the same physical modal body, not an added post-FX oscillator.
            const r=modeOscR[k],im=modeOscI[k];
            modeOscR[k]=r*cos[k]-im*sin[k];modeOscI[k]=r*sin[k]+im*cos[k];
            if(driven)input+=modeOscR[k]*plan.emiliaModeDrive[band][j]*.0018*48000/sr;
          }
          const r = real[k] * damping[k] + input, q = imag[k] * damping[k];
          real[k] = (r * cos[k] - q * sin[k]) * mask[k]; imag[k] = (r * sin[k] + q * cos[k]) * mask[k];
        }
        // Only nonlinear organs need a local projection. All read the same step state.
        for (const i of plan.nonlinearNodes) {
          let local = 0; for (let j = 0; j < n; j++) local += basis[i * n + j] * real[offset + j];
          const program = plan.nodes[i], drive = 1 + program.strength * 18;
          const shaped = program.role === 'fold' ? Math.sin(local * drive) / drive : Math.tanh(local * drive) / drive;
          deltas[i] = .8 * (shaped - local);
        }
        for (let j = 0; j < n; j++) {
          let correction = 0; for (const i of plan.nonlinearNodes) correction += basis[i * n + j] * deltas[i];
          real[offset + j] += correction;
          out += real[offset + j] * plan.bands[band].pickup[j];
        }
      }
      out *= gain * envelope * curveAt(volumeCurve, Math.min(1, age / Math.max(1, gateFrames)), 1) * 1.8 / Math.max(1, Math.sqrt(n));
      if (!Number.isFinite(out)) { faults++; ended = true; return 0; }
      // Fixed bounded output, DC blocker, anti-alias filtering. No adaptive loudness pumping.
      if(plan.emiliaInputDrive!=null)out *= plan.emiliaInputDrive;
      out = Math.tanh(out);
      const dc = out - dcX + .9995 * dcY; dcX = out; dcY = dc;
      lp1 += lp * (dc - lp1); lp2 += lp * (lp1 - lp2);
      age++;
      return lp2;
    }
    function process(left, right, start = 0, frames = left.length - start, accumulate = false) {
      for (let i = start; i < start + frames; i++) {
        let value = sample(); if (oversampling === 2) value = sample();
        if (accumulate) { left[i] += value; if (right && right !== left) right[i] += value; }
        else { left[i] = value; if (right && right !== left) right[i] = value; }
      }
      return !ended;
    }
    return {process, noteOff, setFrequency, get ended() { return ended; }, snapshot: () => ({ageFrames: Math.floor(age / oversampling), frequency: root, targetFrequency: targetRoot, released, ended, faults})};
  }
  function render(plan, options = {}, sampleRate = 48000) {
    const duration = options.durationSec ?? plan.articulation.durationSec;
    if (!Number.isFinite(duration) || duration < .02 || duration > 30 || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('Invalid Nodal render bounds');
    const frames = Math.ceil((duration + clamp(options.releaseSec ?? plan.articulation.releaseSec, .001, 3) + .01) * sampleRate);
    if (frames > sampleRate * 34) throw new Error('Nodal render duration exceeds limit');
    const left = new Float32Array(frames), v = voice(plan, {...options, held: false}, sampleRate);
    v.process(left); return {pcm: left, sampleRate, snapshot: v.snapshot()};
  }
  return {voice, render};
}
const __XenNodalDSP = createNodalSynthesisKernel();
