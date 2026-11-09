import {
  STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME,
  STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION,
} from "./stationaryRhythmWorkletLaneContracts";
import { createAudioWorkletBlobModuleUrl } from "./audioWorkletBlobModule";

export const STATIONARY_RHYTHM_WORKLET_PROCESSOR_SOURCE = `
class XensonarStationaryRhythmWorkletLaneProbe extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'probeGain', defaultValue: 0.035, minValue: 0, maxValue: 0.16, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.schemaVersion = ${STATIONARY_RHYTHM_WORKLET_SCHEMA_VERSION};
    this.processorName = '${STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME}';
    this.processorGeneration = 1;
    this.generation = 0;
    this.running = false;
    this.audibleProbe = false;
    this.audibleMinimalVoices = false;
    this.bpm = 108;
    this.beatsPerBar = 4;
    this.stepsPerBar = 16;
    this.framesPerStep = this.resolveFramesPerStep();
    this.nextStepFrame = currentFrame + 128;
    this.stepIndex = 0;
    this.currentBar = 0;
    this.patternVersion = 0;
    this.pendingPatternVersion = 0;
    this.pendingPattern = null;
    this.patternHitsByStep = [];
    this.patternBars = 1;
    this.patternStepCount = 16;
    this.patternHitCount = 0;
    this.patternAppliedCount = 0;
    this.patternDeferredCount = 0;
    this.duplicateStepGuardCount = 0;
    this.lastRenderedPatternStepKey = '';
    this.processQuantumCount = 0;
    this.renderedFrameCount = 0;
    this.frameContinuityGapCount = 0;
    this.lateStepCount = 0;
    this.missedStepWindowCount = 0;
    this.maxStepLatenessFrames = 0;
    this.heartbeatJitterFrames = 0;
    this.lastHeartbeatFrame = currentFrame;
    this.lastBlockStartFrame = null;
    this.lastBlockSize = 0;
    this.heartbeatEveryFrames = Math.max(2048, Math.floor(sampleRate * 0.25));
    this.nextHeartbeatFrame = currentFrame + this.heartbeatEveryFrames;
    this.peakAbs = 0;
    this.processorState = 'idle';
    this.maxStepsPerQuantum = 32;
    this.maxProbeVoices = 6;
    this.maxPatternVoices = 24;
    this.probeVoices = [];
    this.patternVoices = [];
    for (let i = 0; i < this.maxProbeVoices; i += 1) {
      this.probeVoices.push({ active: false, phase: 0, freq: 660, env: 0, decay: 0.992, ageFrames: 0, delayFrames: 0, kind: 'probe' });
    }
    for (let i = 0; i < this.maxPatternVoices; i += 1) {
      this.patternVoices.push({ active: false, phase: 0, freq: 80, env: 0, decay: 0.992, ageFrames: 0, delayFrames: 0, kind: 'kick', velocity: 0 });
    }
    this.port.onmessage = (event) => this.handleMessage(event.data || {});
    this.postReady();
  }

  resolveFramesPerStep() {
    const safeBpm = Math.max(12, Math.min(360, Number(this.bpm) || 108));
    const safeBeats = Math.max(1, Math.min(16, Number(this.beatsPerBar) || 4));
    const safeSteps = Math.max(1, Math.min(128, Number(this.stepsPerBar) || 16));
    return Math.max(1, sampleRate * 60 * safeBeats / (safeBpm * safeSteps));
  }

  sanitizeNumber(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  getWorkletFrame() { return typeof currentFrame === 'number' ? currentFrame : 0; }

  postReady() {
    this.port.postMessage({
      type: 'stationary-rhythm-ready', schemaVersion: this.schemaVersion,
      processorName: this.processorName, processorGeneration: this.processorGeneration,
      workletFrame: this.getWorkletFrame(), sampleRate
    });
  }

  postAck(acceptedType) {
    this.port.postMessage({
      type: 'stationary-rhythm-ack', schemaVersion: this.schemaVersion,
      generation: this.generation, acceptedType, workletFrame: this.getWorkletFrame(),
      running: this.running, patternVersion: this.patternVersion, pendingPatternVersion: this.pendingPatternVersion
    });
  }

  postReject(rejectedType, reason, generation) {
    this.port.postMessage({
      type: 'stationary-rhythm-reject', schemaVersion: this.schemaVersion,
      generation: Number.isFinite(Number(generation)) ? Number(generation) : this.generation,
      rejectedType: String(rejectedType || 'unknown'), reason, workletFrame: this.getWorkletFrame()
    });
  }

  applyClockFields(data) {
    if (typeof data.bpm === 'number') this.bpm = this.sanitizeNumber(data.bpm, this.bpm, 12, 360);
    if (typeof data.beatsPerBar === 'number') this.beatsPerBar = Math.round(this.sanitizeNumber(data.beatsPerBar, this.beatsPerBar, 1, 16));
    if (typeof data.stepsPerBar === 'number') this.stepsPerBar = Math.round(this.sanitizeNumber(data.stepsPerBar, this.stepsPerBar, 1, 128));
    this.framesPerStep = this.resolveFramesPerStep();
  }

  normalizePattern(data) {
    const safeStepsPerBar = Math.max(1, Math.min(128, Math.round(Number(data.stepsPerBar) || this.stepsPerBar || 16)));
    const safeBars = Math.max(1, Math.min(8, Math.round(Number(data.bars) || 1)));
    const patternStepCount = safeBars * safeStepsPerBar;
    const hitBuckets = [];
    for (let i = 0; i < patternStepCount; i += 1) hitBuckets.push([]);
    const hits = Array.isArray(data.hits) ? data.hits : [];
    let accepted = 0;
    const maxHits = 512;
    for (let i = 0; i < hits.length && accepted < maxHits; i += 1) {
      const hit = hits[i] || {};
      const rawStep = Math.floor(Number(hit.step) || 0);
      const step = ((rawStep % patternStepCount) + patternStepCount) % patternStepCount;
      const lane = hit.lane === 'kick' || hit.lane === 'snare' || hit.lane === 'hat' || hit.lane === 'bass' ? hit.lane : 'probe';
      const velocity = this.sanitizeNumber(hit.velocity, 0, 0, 1.5);
      if (velocity <= 0.001) continue;
      hitBuckets[step].push({
        lane,
        velocity,
        accent: this.sanitizeNumber(hit.accent, velocity, 0, 1.5),
        lengthSteps: this.sanitizeNumber(hit.lengthSteps, lane === 'bass' ? 1.4 : 0.45, 0.05, 32),
        pitchHz: this.sanitizeNumber(hit.pitchHz, lane === 'bass' ? 55 : 440, 16, 8000)
      });
      accepted += 1;
    }
    return {
      patternVersion: Math.max(1, Math.round(Number(data.patternVersion) || 1)),
      generation: Math.max(this.generation, Math.round(Number(data.generation) || this.generation)),
      bpm: this.sanitizeNumber(data.bpm, this.bpm, 12, 360),
      beatsPerBar: Math.round(this.sanitizeNumber(data.beatsPerBar, this.beatsPerBar, 1, 16)),
      stepsPerBar: safeStepsPerBar,
      bars: safeBars,
      patternStepCount,
      effectiveAtBar: Number.isFinite(Number(data.effectiveAtBar)) ? Math.max(0, Math.round(Number(data.effectiveAtBar))) : null,
      effectiveAtFrame: Number.isFinite(Number(data.effectiveAtFrame)) ? Math.max(0, Number(data.effectiveAtFrame)) : null,
      transportPolicy: data.transportPolicy === 'hard-resync' || data.transportPolicy === 'hold-current-bar' ? data.transportPolicy : 'switch-next-bar',
      hitsByStep: hitBuckets,
      hitCount: accepted,
      audibleMinimalVoices: data.audibleMinimalVoices !== false,
      shadowOnly: data.shadowOnly !== false
    };
  }

  applyPattern(pattern, allowResync) {
    const oldFramesPerStep = this.framesPerStep;
    this.bpm = pattern.bpm;
    this.beatsPerBar = pattern.beatsPerBar;
    this.stepsPerBar = pattern.stepsPerBar;
    this.framesPerStep = this.resolveFramesPerStep();
    if (oldFramesPerStep > 0 && this.running && !allowResync) {
      const nowFrame = this.getWorkletFrame();
      const remaining = Math.max(0, this.nextStepFrame - nowFrame);
      this.nextStepFrame = nowFrame + remaining * (this.framesPerStep / oldFramesPerStep);
    }
    if (allowResync) {
      this.stepIndex = 0;
      this.currentBar = Math.max(0, pattern.effectiveAtBar || this.currentBar);
      this.nextStepFrame = this.getWorkletFrame() + Math.max(32, Math.min(2048, Math.floor(this.framesPerStep * 0.25)));
    }
    this.generation = pattern.generation;
    this.patternVersion = pattern.patternVersion;
    this.patternBars = pattern.bars || 1;
    this.patternStepCount = pattern.patternStepCount || pattern.stepsPerBar || this.stepsPerBar;
    this.patternHitsByStep = pattern.hitsByStep;
    this.patternHitCount = pattern.hitCount;
    this.audibleMinimalVoices = pattern.audibleMinimalVoices;
    this.pendingPattern = null;
    this.pendingPatternVersion = 0;
    this.patternAppliedCount += 1;
  }

  maybeCommitPendingPattern(blockStartFrame) {
    const pending = this.pendingPattern;
    if (!pending) return;
    if (pending.transportPolicy === 'hard-resync') {
      this.applyPattern(pending, true);
      return;
    }
    if (pending.effectiveAtFrame !== null && blockStartFrame >= pending.effectiveAtFrame) {
      const lateBy = blockStartFrame - pending.effectiveAtFrame;
      if (lateBy > this.framesPerStep && pending.transportPolicy === 'switch-next-bar') {
        pending.effectiveAtFrame = null;
        this.patternDeferredCount += 1;
      } else {
        this.applyPattern(pending, false);
      }
      return;
    }
    const targetBar = pending.effectiveAtBar;
    if (targetBar !== null && this.currentBar >= targetBar && this.stepIndex === 0) {
      this.applyPattern(pending, false);
      return;
    }
    if (targetBar === null && pending.effectiveAtFrame === null && this.stepIndex === 0) {
      this.applyPattern(pending, false);
    }
  }

  handleMessage(data) {
    if (data.schemaVersion !== this.schemaVersion) { this.postReject(data.type, 'schema-version-mismatch', data.generation); return; }
    if (data.scope === 'wave-starter' || data.extendPolicy || data.apostropheSafeExtend) { this.postReject(data.type, 'wave-starter-extend-scope-ignored', data.generation); return; }
    if (data.type === 'stationary-rhythm-start') {
      this.generation = Math.max(this.generation + 1, Math.round(Number(data.generation) || 1));
      this.applyClockFields(data);
      this.audibleProbe = data.audibleProbe !== false;
      this.running = true;
      this.stepIndex = 0;
      this.currentBar = 0;
      this.nextStepFrame = this.getWorkletFrame() + Math.max(32, Math.min(2048, Math.floor(this.framesPerStep * 0.25)));
      this.processorState = 'clear';
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stationary-rhythm-stop') {
      this.generation = Math.max(this.generation, Math.round(Number(data.generation) || this.generation));
      this.running = false;
      this.audibleProbe = false;
      this.audibleMinimalVoices = false;
      this.processorState = 'idle';
      this.releaseAllVoices();
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stationary-rhythm-update') {
      this.generation = Math.max(this.generation, Math.round(Number(data.generation) || this.generation));
      const oldFramesPerStep = this.framesPerStep;
      this.applyClockFields(data);
      if (oldFramesPerStep > 0 && this.running) {
        const nowFrame = this.getWorkletFrame();
        const remaining = Math.max(0, this.nextStepFrame - nowFrame);
        this.nextStepFrame = nowFrame + remaining * (this.framesPerStep / oldFramesPerStep);
      }
      if (typeof data.audibleProbe === 'boolean') this.audibleProbe = data.audibleProbe;
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stationary-rhythm-pattern-snapshot') {
      const incomingPatternVersion = Math.max(1, Math.round(Number(data.patternVersion) || 1));
      const isHardResync = data.transportPolicy === 'hard-resync';
      const staleCommitted = this.running && !isHardResync && incomingPatternVersion < this.patternVersion;
      const stalePending = this.running && !isHardResync && this.pendingPatternVersion > 0 && incomingPatternVersion < this.pendingPatternVersion;
      if (staleCommitted || stalePending) {
        this.postReject(data.type, 'stale-pattern-version', data.generation);
        return;
      }
      const pattern = this.normalizePattern(data);
      this.pendingPattern = pattern;
      this.pendingPatternVersion = pattern.patternVersion;
      if (!this.running || pattern.transportPolicy === 'hard-resync') this.applyPattern(pattern, !this.running || pattern.transportPolicy === 'hard-resync');
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stationary-rhythm-request-snapshot') {
      this.postHeartbeat(true, this.getWorkletFrame(), this.lastBlockSize || 0);
      this.postAck(data.type);
      return;
    }
    this.postReject(data.type, 'unknown-message-type', data.generation);
  }


  voicePriority(kind) {
    return kind === 'kick' ? 4 : kind === 'bass' ? 3 : kind === 'snare' ? 2 : kind === 'probe' ? 1 : 0;
  }

  selectReusableVoice(pool, incomingKind) {
    for (let i = 0; i < pool.length; i += 1) {
      if (!pool[i].active) return pool[i];
    }
    const incomingPriority = this.voicePriority(incomingKind);
    let selected = pool[0];
    let selectedScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pool.length; i += 1) {
      const voice = pool[i];
      const voicePriority = this.voicePriority(voice.kind);
      const protectsHigherPriority = voicePriority > incomingPriority ? 1000000 : 0;
      const score = protectsHigherPriority + voicePriority * 10000 + voice.env * 1000 - voice.ageFrames * 0.001;
      if (score < selectedScore) {
        selected = voice;
        selectedScore = score;
      }
    }
    return selected;
  }

  releaseAllVoices() {
    for (let i = 0; i < this.probeVoices.length; i += 1) this.probeVoices[i].active = false;
    for (let i = 0; i < this.patternVoices.length; i += 1) this.patternVoices[i].active = false;
  }

  spawnProbeVoice(isBarStart, latenessFrames, offsetFrames) {
    const voice = this.selectReusableVoice(this.probeVoices, 'probe');
    voice.active = true; voice.phase = 0; voice.freq = isBarStart ? 520 : 1040; voice.env = isBarStart ? 1.0 : 0.55; voice.decay = isBarStart ? 0.994 : 0.989; voice.ageFrames = 0; voice.delayFrames = Math.max(0, Math.floor(Number(offsetFrames) || 0)); voice.kind = 'probe';
    if (latenessFrames > 0) { this.lateStepCount += 1; this.maxStepLatenessFrames = Math.max(this.maxStepLatenessFrames, latenessFrames); }
  }

  spawnPatternVoice(hit, offsetFrames) {
    const lane = hit.lane;
    const voice = this.selectReusableVoice(this.patternVoices, lane);
    voice.active = true;
    voice.phase = 0;
    voice.kind = lane;
    voice.velocity = hit.velocity;
    voice.freq = lane === 'kick' ? 58 : lane === 'snare' ? 220 : lane === 'hat' ? 5200 : Math.max(22, hit.pitchHz || 55);
    voice.env = lane === 'hat' ? 0.42 * hit.velocity : lane === 'snare' ? 0.64 * hit.velocity : 0.9 * hit.velocity;
    voice.decay = lane === 'hat' ? 0.965 : lane === 'snare' ? 0.982 : lane === 'kick' ? 0.992 : 0.9982;
    voice.ageFrames = 0;
    voice.delayFrames = Math.max(0, Math.floor(Number(offsetFrames) || 0));
  }

  renderVoicePool(pool, left, right, frames, gainScale) {
    let activeCount = 0;
    let peak = 0;
    for (let i = 0; i < pool.length; i += 1) {
      const voice = pool[i];
      if (!voice.active) continue;
      activeCount += 1;
      let phaseInc = 2 * Math.PI * voice.freq / sampleRate;
      for (let frame = 0; frame < frames; frame += 1) {
        if (voice.delayFrames > 0) { voice.delayFrames -= 1; continue; }
        if (voice.env <= 0.00008) break;
        let sample = 0;
        if (voice.kind === 'hat') {
          sample = (Math.sin(voice.phase) + Math.sin(voice.phase * 1.414)) * 0.33 * voice.env * gainScale;
        } else if (voice.kind === 'snare') {
          sample = (Math.sin(voice.phase) * 0.72 + Math.sin(voice.phase * 2.01) * 0.18) * voice.env * gainScale;
        } else if (voice.kind === 'kick') {
          sample = Math.sin(voice.phase) * voice.env * gainScale;
          phaseInc *= 0.9996;
        } else {
          sample = Math.sin(voice.phase) * voice.env * gainScale;
        }
        left[frame] += sample;
        right[frame] += sample;
        const abs = Math.abs(sample);
        if (abs > peak) peak = abs;
        voice.phase += phaseInc;
        if (voice.phase > Math.PI * 2) voice.phase -= Math.PI * 2;
        voice.env *= voice.decay;
        voice.ageFrames += 1;
      }
      const maxAge = voice.kind === 'bass' ? Math.floor(sampleRate * 0.42) : Math.floor(sampleRate * 0.16);
      if (voice.env <= 0.00008 || voice.ageFrames > maxAge) { voice.active = false; voice.env = 0; }
    }
    this.peakAbs = Math.max(this.peakAbs * 0.92, peak);
    return activeCount;
  }

  maybeScheduleSteps(blockStartFrame, blockEndFrame) {
    if (!this.running) return;
    let scheduled = 0;
    while (this.nextStepFrame < blockEndFrame && scheduled < this.maxStepsPerQuantum) {
      const latenessFrames = Math.max(0, blockStartFrame - this.nextStepFrame);
      const isBarStart = this.stepIndex === 0;
      const offsetFrames = Math.max(0, Math.floor(this.nextStepFrame - blockStartFrame));
      if (this.audibleProbe) this.spawnProbeVoice(isBarStart, latenessFrames, offsetFrames);
      if (this.audibleMinimalVoices && this.patternHitsByStep.length > 0) {
        const patternStep = (((this.currentBar % Math.max(1, this.patternBars)) * this.stepsPerBar + this.stepIndex) % Math.max(1, this.patternStepCount));
        const stepHits = this.patternHitsByStep[patternStep] || [];
        const key = this.currentBar + ':' + this.stepIndex + ':' + this.patternVersion;
        if (key === this.lastRenderedPatternStepKey) {
          this.duplicateStepGuardCount += 1;
        } else {
          this.lastRenderedPatternStepKey = key;
          for (let i = 0; i < stepHits.length; i += 1) this.spawnPatternVoice(stepHits[i], offsetFrames);
        }
      }
      if (latenessFrames > 0) { this.lateStepCount += 1; this.maxStepLatenessFrames = Math.max(this.maxStepLatenessFrames, latenessFrames); }
      this.nextStepFrame += this.framesPerStep;
      this.stepIndex += 1;
      if (this.stepIndex >= this.stepsPerBar) { this.stepIndex = 0; this.currentBar += 1; this.maybeCommitPendingPattern(blockStartFrame); }
      scheduled += 1;
    }
    if (scheduled >= this.maxStepsPerQuantum && this.nextStepFrame < blockEndFrame) {
      this.missedStepWindowCount += 1;
      this.nextStepFrame = blockEndFrame + this.framesPerStep;
      this.processorState = 'watch';
    } else if (this.lateStepCount > 0 || this.frameContinuityGapCount > 0) this.processorState = 'watch';
    else this.processorState = 'clear';
  }

  postHeartbeat(force, blockStartFrame, frames) {
    if (!force && blockStartFrame < this.nextHeartbeatFrame) return;
    const expectedDelta = this.heartbeatEveryFrames;
    const actualDelta = Math.max(0, blockStartFrame - this.lastHeartbeatFrame);
    this.heartbeatJitterFrames = Math.max(0, Math.abs(actualDelta - expectedDelta));
    this.lastHeartbeatFrame = blockStartFrame;
    this.nextHeartbeatFrame = blockStartFrame + this.heartbeatEveryFrames;
    let activeProbeVoiceCount = 0;
    for (let i = 0; i < this.probeVoices.length; i += 1) if (this.probeVoices[i].active) activeProbeVoiceCount += 1;
    let activePatternVoiceCount = 0;
    for (let i = 0; i < this.patternVoices.length; i += 1) if (this.patternVoices[i].active) activePatternVoiceCount += 1;
    this.port.postMessage({
      type: 'stationary-rhythm-heartbeat', schemaVersion: this.schemaVersion,
      generation: this.generation, processorGeneration: this.processorGeneration,
      running: this.running, audibleProbe: this.audibleProbe, audibleMinimalVoices: this.audibleMinimalVoices,
      bpm: this.bpm, beatsPerBar: this.beatsPerBar, stepsPerBar: this.stepsPerBar,
      currentBar: this.currentBar, stepIndex: this.stepIndex, nextStepFrame: this.nextStepFrame,
      currentFrame: blockStartFrame, renderQuantumSize: frames,
      processQuantumCount: this.processQuantumCount, renderedFrameCount: this.renderedFrameCount,
      frameContinuityGapCount: this.frameContinuityGapCount, lateStepCount: this.lateStepCount,
      missedStepWindowCount: this.missedStepWindowCount, maxStepLatenessFrames: this.maxStepLatenessFrames,
      heartbeatJitterFrames: this.heartbeatJitterFrames,
      activeProbeVoiceCount, activePatternVoiceCount,
      patternVersion: this.patternVersion, pendingPatternVersion: this.pendingPatternVersion,
      patternHitCount: this.patternHitCount, patternAppliedCount: this.patternAppliedCount,
      patternDeferredCount: this.patternDeferredCount, duplicateStepGuardCount: this.duplicateStepGuardCount,
      processorState: this.processorState, peakAbs: this.peakAbs,
      postedAtWorkletTimeSec: typeof currentTime === 'number' ? currentTime : 0
    });
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const left = output[0];
    const right = output[1] || output[0];
    const frames = left.length;
    const blockStartFrame = this.getWorkletFrame();
    const blockEndFrame = blockStartFrame + frames;
    if (this.lastBlockStartFrame !== null && this.lastBlockStartFrame + this.lastBlockSize !== blockStartFrame) { this.frameContinuityGapCount += 1; this.processorState = 'watch'; }
    this.lastBlockStartFrame = blockStartFrame;
    this.lastBlockSize = frames;
    this.processQuantumCount += 1;
    this.renderedFrameCount += frames;
    this.maybeCommitPendingPattern(blockStartFrame);
    this.maybeScheduleSteps(blockStartFrame, blockEndFrame);
    const probeGainParam = parameters.probeGain;
    const probeGain = probeGainParam && probeGainParam.length ? probeGainParam[0] : 0.035;
    const safeProbeGain = Math.max(0, Math.min(0.16, Number(probeGain) || 0));
    this.renderVoicePool(this.probeVoices, left, right, frames, safeProbeGain);
    this.renderVoicePool(this.patternVoices, left, right, frames, 0.028);
    this.postHeartbeat(false, blockStartFrame, frames);
    return true;
  }
}
registerProcessor('${STATIONARY_RHYTHM_WORKLET_PROCESSOR_NAME}', XensonarStationaryRhythmWorkletLaneProbe);
`;

export const createStationaryRhythmWorkletProcessorBlobUrl = () =>
  createAudioWorkletBlobModuleUrl(STATIONARY_RHYTHM_WORKLET_PROCESSOR_SOURCE);
