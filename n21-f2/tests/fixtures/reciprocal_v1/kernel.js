/* Serializable factory. The exact same DSP runs offline and inside AudioWorklet. */
function createNodalSynthesisKernel() {
/* Embedded in the serializable Nodal factory at build time. Emilia owns this
   opt-in kernel; the original Nodal V1 branch remains byte-for-byte unchanged. */
function createEmiliaMaterialVoice(plan, options = {}, sampleRate = 48000) {
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), PI2=Math.PI*2;
  const frequency=options.frequency??220, velocity=options.velocity??.7, gain=options.gain??.7;
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid sample rate');
  if(!Number.isFinite(frequency)||frequency<5||frequency>12000)throw Error('Invalid note frequency');
  if(!Number.isFinite(velocity)||velocity<0||velocity>1||!Number.isFinite(gain)||gain<0||gain>1)throw Error('Invalid note level');
  const duration=options.durationSec??plan.articulation.durationSec;
  if(!Number.isFinite(duration)||duration<.02||duration>30)throw Error('Invalid note duration');
  for(const k of ['attackSec','releaseSec'])if(options[k]!=null&&(!Number.isFinite(options[k])||options[k]<0||options[k]>3))throw Error('Invalid note fade');
  for(const c of [options.volumeCurve,options.pitchCurve])if(c&&(!Array.isArray(c)||c.length>512||!c.every(Number.isFinite)))throw Error('Invalid note contour');
  const n=plan.nodes.length, bands=plan.bands.length, modes=n*bands, sr=sampleRate*2, partials=12;
  const real=new Float64Array(modes),imag=new Float64Array(modes),cos=new Float64Array(modes),sin=new Float64Array(modes),damp=new Float64Array(modes),mask=new Float64Array(modes);
  const modalR=new Float64Array(modes),modalI=new Float64Array(modes);
  const oscR=new Float64Array(n),oscI=new Float64Array(n),stepR=new Float64Array(n),stepI=new Float64Array(n),harmonicMask=new Float64Array(n*partials);
  const harmonic=new Float64Array(n),impulse=new Float64Array(n),friction=new Float64Array(n),excitation=new Float64Array(n),contact=new Float64Array(n);
  const random=new Uint32Array(n),noiseLow=new Float64Array(n),noiseSlow=new Float64Array(n),transient=new Float64Array(n);
  const memory=new Float64Array(n),highMemory=new Float64Array(n),load=new Float64Array(n),loadHigh=new Float64Array(n);
  const feedback=new Float64Array(n),textureStep=new Float64Array(n),transientStep=new Float64Array(n);
  const material=plan.emiliaMaterial, held=options.held===true;
  const attack=Math.max(1,Math.round((options.attackSec??.004)*sr)),release=Math.max(1,Math.round((options.releaseSec??.12)*sr));
  const gateFrames=Math.round(duration*sr),lease=options.offlineDurationSec;
  const watchdog=Math.round((Number.isFinite(lease)&&lease>0&&lease<=601?lease:30)*sr);
  const contour=options.volumeCurve??plan.articulation.volumeCurve,pitch=options.pitchCurve??plan.articulation.pitchCurve;
  let root=frequency,target=frequency,age=0,ended=plan.silent,released=false,releaseAge=0,releaseLevel=1,envelope=0,faults=0;
  let expression=clamp(options.expression??velocity,0,1),expressionTarget=expression,dcX=0,dcY=0,lp1=0,lp2=0,peakState=0;
  const smooth=1-Math.exp(-1/(sr*.006)),memorySmooth=1-Math.exp(-16/(sr*.012));
  const lp=1-Math.exp(-PI2*sampleRate*.30/sr),dcPole=Math.exp(-PI2*8/sr),slowStep=1-Math.exp(-PI2*75/sr);
  function curveAt(c,pos,fallback){if(!c?.length)return fallback;const p=clamp(pos,0,1)*(c.length-1),a=Math.floor(p);return c[a]+(c[Math.min(a+1,c.length-1)]-c[a])*(p-a);}
  for(let i=0;i<n;i++){
    let h=(options.seed??plan.seed)>>>0;
    for(let j=0;j<plan.nodes[i].id.length;j++){h^=plan.nodes[i].id.charCodeAt(j);h=Math.imul(h,16777619);}
    textureStep[i]=1-Math.exp(-PI2*material.sources[i].textureHz/sr);
    transientStep[i]=Math.exp(-1/(sr*material.sources[i].transientSec));
    random[i]=h>>>0||1;const phase=(random[i]%4096)/4096*PI2;
    oscR[i]=Math.cos(phase);oscI[i]=Math.sin(phase);transient[i]=1;
  }
  for(let k=0;k<modes;k++){modalR[k]=Math.cos(k*2.3999632297);modalI[k]=Math.sin(k*2.3999632297);damp[k]=Math.exp(-plan.bands[Math.floor(k/n)].decayRates[k%n]/sr);}
  function coefficients(){
    const hzRoot=root*Math.pow(2,curveAt(pitch,age/Math.max(1,gateFrames),0)/12);
    for(let b=0;b<bands;b++)for(let j=0;j<n;j++){
      const k=b*n+j,hz=hzRoot*plan.bands[b].frequencies[j],a=PI2*hz/sr;
      cos[k]=Math.cos(a);sin[k]=Math.sin(a);mask[k]=clamp((sampleRate*.46-hz)/(sampleRate*.08),0,1);
    }
    for(let i=0;i<n;i++){
      const hz=hzRoot*plan.nodes[i].ratio*plan.nodes[i].partials[0],a=PI2*hz/sr;
      stepR[i]=Math.cos(a);stepI[i]=Math.sin(a);
      for(let h=1;h<=partials;h++)harmonicMask[i*partials+h-1]=clamp((sampleRate*.46-hz*h)/(sampleRate*.08),0,1);
    }
  }
  coefficients();
  function noteOff(){if(!released){released=true;releaseAge=0;releaseLevel=envelope;}}
  function setFrequency(hz){if(!Number.isFinite(hz)||hz<5||hz>12000)return false;target=hz;return true;}
  function setExcitation(value){if(!Number.isFinite(value)||value<0||value>1)return false;expressionTarget=value;return true;}
  const bounded=x=>x/(1+Math.abs(x));
  function sample(){
    if(ended)return 0;
    if(!released&&(age>=watchdog||(!held&&age>=gateFrames)))noteOff();
    expression+=(expressionTarget-expression)*smooth;
    if((age&15)===0){
      if(pitch||Math.abs(root-target)>1e-8){root*=Math.pow(target/root,1-Math.exp(-16/(sr*.006)));coefficients();}
      // Delayed, bounded material load. It modulates supplied excitation only;
      // it never injects a raw feedback signal or a second musical oscillator.
      for(let i=0;i<n;i++){
        memory[i]+=(bounded(load[i]*8)-memory[i])*memorySmooth;
        highMemory[i]+=(bounded(loadHigh[i]*8)-highMemory[i])*memorySmooth;
        feedback[i]=material.feedback*clamp((highMemory[i]/(memory[i]+.05)-.45)*1.8+memory[i]*.55,-1,1);
      }
    }
    envelope=Math.min(1,age/attack);
    if(released){envelope=releaseLevel*Math.max(0,1-releaseAge/release);if(releaseAge++>=release){ended=true;return 0;}}
    const driven=!released;
    if(driven)for(let i=0;i<n;i++){
      const p=material.sources[i],r=oscR[i],q=oscI[i];
      oscR[i]=r*stepR[i]-q*stepI[i];oscI[i]=r*stepI[i]+q*stepR[i];
      let prev=1,now=oscR[i],sum=0;
      const response=feedback[i],force=.72+.56*expression;
      for(let h=1;h<=partials;h++){
        if(h>1){const next=2*oscR[i]*now-prev;prev=now;now=next;}
        // State changes spectral distribution without changing Carrier pitch.
        const shaped=p.partials[h-1]*(1+response*(h/partials-.35))*(1+p.hardness*(expression-.5)*(h/partials));
        sum+=now*shaped*harmonicMask[i*partials+h-1];
      }
      let z=random[i];z^=z<<13;z^=z>>>17;z^=z<<5;random[i]=z>>>0;
      const rnd=random[i]/2147483648-1;
      noiseLow[i]+=textureStep[i]*(rnd-noiseLow[i]);
      noiseSlow[i]+=slowStep*(noiseLow[i]-noiseSlow[i]);
      const noise=noiseLow[i]-noiseSlow[i];
      transient[i]*=transientStep[i];
      const level=plan.nodes[i].excitation*plan.excitation.level*velocity;
      const sustained=p.sustain+(1-p.sustain)*transient[i];
      harmonic[i]=sum*p.harmonic*force*sustained*level;
      impulse[i]=noise*p.impulse*transient[i]*(.55+expression)*level;
      // Bow/slip resistance follows the modal load; no free-running pulse clock.
      const slip=clamp(1-memory[i]*p.resistance+response*.45,.25,1.35);
      friction[i]=noise*p.friction*slip*(.3+expression*.8)*level;
      excitation[i]=level*force*sustained*p.harmonic;
      // Coherent rubbing feeds collective motion as well as broadband texture.
      // Without this transfer, narrow modes reduce every source to tonal sustain.
      contact[i]=p.friction*slip*(.3+expression*.8)*level*(1+noiseSlow[i]*.5);
    }
    const measure=(age&15)===0;
    let out=0;if(measure){load.fill(0);loadHigh.fill(0);}
    for(let b=0;b<bands;b++){
      const body=plan.bands[b],ports=material.ports[b];
      for(let j=0;j<n;j++){
        const k=b*n+j;let input=0,feed=0;
        if(driven)for(let i=0;i<n;i++){
          const ij=i*n+j;
          input+=ports.harmonic[ij]*harmonic[i]+ports.impulse[ij]*impulse[i]+ports.friction[ij]*friction[i];
          const intensity=1+material.sources[i].hardness*(expression-.5)*(b*.42-.4);
          feed+=ports.sustain[ij]*excitation[i]*(1+feedback[i]*ports.response[ij])*intensity;
          feed+=ports.friction[ij]*contact[i]*(b===0?.005:.065)*(1-feedback[i]*.5);
        }
        const r=modalR[k],q=modalI[k];modalR[k]=r*cos[k]-q*sin[k];modalI[k]=r*sin[k]+q*cos[k];
        // Collective modal sustain is fed by the source/body transfer matrix.
        // It shares the mode state and stops as soon as Carrier excitation stops.
        input=(input*.0032+modalR[k]*feed*.0014)*48000/sr;
        const a=real[k]*damp[k]+input,c=imag[k]*damp[k];
        real[k]=(a*cos[k]-c*sin[k])*mask[k];imag[k]=(a*sin[k]+c*cos[k])*mask[k];
        out+=real[k]*body.pickup[j];
      }
      if(measure)for(let i=0;i<n;i++){
        let r=0,q=0;for(let j=0;j<n;j++){const v=body.vectors[i*n+j];r+=v*real[b*n+j];q+=v*imag[b*n+j];}
        const energy=Math.sqrt(r*r+q*q);
        load[i]+=energy/bands;if(b>=2)loadHigh[i]+=energy/(bands-2);
      }
    }
    out*=gain*envelope*curveAt(contour,age/Math.max(1,gateFrames),1)*.16/Math.max(1,Math.sqrt(n));
    if(!Number.isFinite(out)){faults++;ended=true;return 0;}
    peakState=Math.max(peakState,Math.abs(out));
    // Safety affects only outliers, leaving ordinary timbre unsaturated.
    if(Math.abs(out)>.8)out=Math.sign(out)*(.8+.16*Math.tanh((Math.abs(out)-.8)/.16));
    const dc=out-dcX+dcPole*dcY;dcX=out;dcY=dc;
    lp1+=lp*(dc-lp1);lp2+=lp*(lp1-lp2);age++;
    // DC removal can transiently overshoot the preceding guard. This last
    // bounded knee is dormant at the calibrated operating level.
    return Math.abs(lp2)<=.9?lp2:Math.sign(lp2)*(.9+.08*Math.tanh((Math.abs(lp2)-.9)/.08));
  }
  function process(left,right,start=0,frames=left.length-start,accumulate=false){
    for(let i=start;i<start+frames;i++){sample();const value=sample();if(accumulate){left[i]+=value;if(right&&right!==left)right[i]+=value;}else{left[i]=value;if(right&&right!==left)right[i]=value;}}
    return !ended;
  }
  return {process,noteOff,setFrequency,setExcitation,get ended(){return ended;},snapshot:()=>({ageFrames:Math.floor(age/2),frequency:root,targetFrequency:target,released,ended,faults,peakInternal:peakState,materialLoad:Array.from(memory),expression})};
}

  const TWO_PI = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function hash(text, seed) { let h = seed >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0 || 1; }
  // Original coupled-modal synthesis from Emilia 1/2; a bounded offline lease
  // is the only opt-in extension needed by the Carrier renderer.
  function voice(plan, options = {}, sampleRate = 48000) {
    if (plan?.emiliaMaterial?.version === 1) return createEmiliaMaterialVoice(plan, options, sampleRate);
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
