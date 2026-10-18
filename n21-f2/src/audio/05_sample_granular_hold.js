// Manual Sample Hold is a scheduler client of the existing RFL grain planner
// (i6/_ne) and native renderer (c6). It never owns the RFL transport or settings.
const __XenSampleHolds = new WeakMap();
function __xenSampleHoldState(ctx) {
  let state = __XenSampleHolds.get(ctx);
  if (!state) {
    state = {ctx, held:false, voices:new Set(), active:new Set(), timer:null};
    __XenSampleHolds.set(ctx,state);
  }
  return state;
}
function __xenSetSampleHold(ctx, held) {
  if (!ctx) return;
  const state = __xenSampleHoldState(ctx);
  if (state.held === held) return;
  state.held = held;
  for (const voice of state.voices) {
    try { held ? voice.extend() : voice.releaseHold(); }
    catch { voice.cut(); }
  }
}
function __xenSampleHoldTick(state) {
  state.timer = null;
  if (!state.held || state.active.size === 0) return;
  if (state.ctx.state === 'closed') {
    for (const voice of state.active) voice.dispose();
    return;
  }
  // Native WebAudio renders the grains. No JS/allocation was added to process().
  // A stalled UI skips old grains instead of replaying a catch-up burst.
  if (state.ctx.state !== 'suspended') {
    let budget = 64;
    for (const voice of state.active) {
      if (budget <= 0) break;
      try { budget -= voice.schedule(Math.min(4,budget)); }
      catch { voice.cut(); }
    }
  }
  if (state.held && state.active.size) state.timer = setTimeout(()=>__xenSampleHoldTick(state),25);
}
function __xenSampleEnvelope(voice,time) {
  const age = Math.max(0,time-voice.start);
  if (age < .005) return 1e-4+(voice.peak-1e-4)*age/.005;
  const tail = voice.duration-voice.release;
  if (age <= tail) return voice.peak;
  return voice.peak*Math.pow(1e-4/voice.peak,Math.min(1,(age-tail)/voice.release));
}
function __xenAttachSampleHold(options) {
  const {ctx,source,dry,master,input,buffer,rate,start,duration,peak,release,cleanup} = options;
  const state = __xenSampleHoldState(ctx), grains = new Map();
  let stopped = false, disposed = false, extended = false, sourceEnded = false, plan = null;
  let nextIndex = 0, holdStart = 0, sourceAnchor = 0, tau = 1.25, previousGrain = null;
  const tone = {
    liveLengthOwner:'wave', sampleHold:true, osc:source, gain:master,
    start,duration,peak,release,
    extend() {
      if (stopped || disposed || extended || sourceEnded || ctx.currentTime >= start+duration) return;
      extended = true;
      tone.holdOwner = 'wave-sustain';
      holdStart = Math.max(start,ctx.currentTime+.006);
      // Same flowing-window policy and Hann overlap as RFL. Grain pitch is the
      // original vg() rate; only the source-position function decelerates.
      plan = i6({bufferDuration:buffer.duration,noteStart:holdStart,noteDuration:.5,
        safeOffsetSec:0,sliceDurationSec:buffer.duration,basePlaybackRate:rate,
        pitchCurves:[],quality:'base',mode:'flowing',
        tuning:{grainWindowScale:.82,jitterScale:0,maxGrains:4},
        sourcePositionAt:time=>tone.sourcePositionAt(time)});
      plan.noteDuration = Infinity;
      // Very short sources use their full available window, never an out-of-
      // bounds read or a hard micro-loop. Near the tail, reuse at most one grain.
      plan.grainDurOut = Math.min(plan.grainDurOut,buffer.duration/rate);
      plan.scheduleSpacing = plan.grainDurOut/2;
      if (plan.grainDurOut < .003) { extended=false; return; }
      const elapsed = Math.max(0,holdStart-start), raw = elapsed*rate;
      const position = options.loop ? raw%buffer.duration : Math.min(buffer.duration,raw);
      const end = Math.max(0,buffer.duration-plan.grainDurOut*rate);
      sourceAnchor = Math.min(position,end);
      // Smooth positive source velocity, with a finite asymptote inside the
      // source. This also approaches a stationary region continuously at EOF.
      const travel = Math.max(0,end-sourceAnchor);
      tau = Math.min(1.25,travel/Math.max(1e-6,rate));
      const now = ctx.currentTime, value = __xenSampleEnvelope(tone,now);
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(value,now);
      master.gain.linearRampToValueAtTime(peak,Math.max(start+.005,now+.025));
      // Complement of the first half of the shared Hann window: original
      // source and incoming grain have unity envelope through the handover.
      const fade = new Float32Array(81);
      for (let i=0;i<fade.length;i++) fade[i]=.5+.5*Math.cos(Math.PI*i/(fade.length-1));
      dry.gain.setValueCurveAtTime(fade,holdStart,plan.grainDurOut/2);
      state.active.add(tone);
      tone.schedule(4);
      if (state.timer === null) state.timer=setTimeout(()=>__xenSampleHoldTick(state),25);
    },
    sourcePositionAt(time) {
      const age = Math.max(0,time-holdStart);
      return sourceAnchor+(tau>1e-8 ? rate*tau*(-Math.expm1(-age/tau)) : 0);
    },
    schedule(budget) {
      if (!extended || stopped || disposed || !state.held || !plan) return 0;
      const now=ctx.currentTime, hop=plan.scheduleSpacing;
      nextIndex=Math.max(nextIndex,Math.ceil((now+.004-holdStart)/hop));
      const pending=[];
      while (pending.length<budget) {
        const when=holdStart+nextIndex*hop;
        if (when>now+.12) break;
        const grain={};
        if (!_ne(plan,nextIndex++,grain,null)) break;
        // Align overlapping waveform phases around the moving source cursor.
        // Without alignment, even a fixed sine acquires grain-rate sidebands.
        // Correlation is bounded and runs here on the control thread only.
        if (previousGrain && grain.when-previousGrain.when < plan.grainDurOut) {
          grain.srcStart=__xenAlignGrainSource(buffer,grain.srcStart,
            previousGrain.srcStart+(grain.when-previousGrain.when)*rate,
            Math.max(0,buffer.duration-grain.actualGrainOut*rate),grain.actualGrainOut*rate);
        }
        previousGrain=grain;
        pending.push(grain);
      }
      if (!pending.length) return 0;
      c6({ctx,destination:input,buffer,plan:{safeRate:rate,grains:pending},
        noteEnd:Infinity,pressureSource:'manual-sample-hold',
        registerGrain({source:grain,auxiliaries}) {
          grains.set(grain,auxiliaries);
          grain.onended=()=>{
            grains.delete(grain);
            grain.disconnect();
            for (const node of auxiliaries) node.disconnect();
            if (stopped && sourceEnded && !grains.size) tone.dispose();
          };
        }});
      return pending.length;
    },
    releaseHold() { if (extended) tone.cut(); },
    cut() {
      if (stopped || disposed) return;
      stopped=true;
      state.active.delete(tone);
      if (!state.active.size && state.timer !== null) {clearTimeout(state.timer);state.timer=null;}
      const now=ctx.currentTime,end=now+.020;
      const gain=master.gain;
      if (typeof gain.cancelAndHoldAtTime==='function') gain.cancelAndHoldAtTime(now);
      else {gain.cancelScheduledValues(now);gain.setValueAtTime(extended?peak:__xenSampleEnvelope(tone,now),now);}
      gain.linearRampToValueAtTime(0,end);
      try {source.stop(end+.001);} catch {}
      for (const grain of grains.keys()) try {grain.stop(end+.001);} catch {}
      if (sourceEnded && !grains.size) tone.dispose();
    },
    dispose() {
      if (disposed) return;
      disposed=true;
      state.voices.delete(tone);state.active.delete(tone);
      if (!state.active.size && state.timer !== null) {clearTimeout(state.timer);state.timer=null;}
      try {source.stop();} catch {}
      for (const [grain,auxiliaries] of grains) {
        try {grain.stop();} catch {}
        try {grain.disconnect();} catch {}
        for (const node of auxiliaries) try {node.disconnect();} catch {}
      }
      grains.clear();
      cleanup();
    }
  };
  source.onended=()=>{
    sourceEnded=true;
    if (!extended || stopped && !grains.size) tone.dispose();
  };
  state.voices.add(tone);
  // heldLong covers a hold pressed before the AudioContext was created.
  if (options.heldLong && !state.held) state.held=true;
  if (state.held) {
    try {tone.extend();}
    catch (error) {tone.dispose();throw error;}
  }
  return tone;
}
